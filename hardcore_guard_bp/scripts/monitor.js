/**
 * @file monitor.js
 * @description 危険物所持差分走査（10 Tick）・使用/設置イベント検知（5 Tick デバウンス）・ディスペンサー開閉/コンテナ差分追跡
 */

import {
  world,
  system,
  EquipmentSlot,
  GameMode,
} from "@minecraft/server";
import {
  GLYPHS,
  OP_TERMINAL_ITEM_ID,
  TIER1_ITEMS,
  TIER1_SET,
  TIER2_SET,
  getItemJaName,
  getDimShortName,
} from "./config.js";
import { translateEntityToJa } from "./ja_dict.js";
import { appendAuditLog } from "./storage.js";
import { syncSidebar } from "./sidebar.js";

/**
 * プレイヤーごとの前回 Tier 1 所持数スナップショット
 * @type {Map<string, Record<string, number>>}
 */
const playerTier1Snapshots = new Map();

/**
 * 使用・設置イベント重複通知防止用デバウンスマップ
 * key: `${playerId}:${typeId}` -> value: lastTick
 * @type {Map<string, number>}
 */
const actionDebounceMap = new Map();

/**
 * @typedef {Object} ContainerSession
 * @property {string} playerId
 * @property {string} pName
 * @property {string} dimId
 * @property {number} x
 * @property {number} y
 * @property {number} z
 * @property {string} blockTypeId
 * @property {Record<string, number>} beforeMap
 * @property {Record<string, number>} lastMap
 * @property {number} openTick
 */

/**
 * プレイヤーごとのコンテナ開閉追跡セッション
 * key: playerId
 * @type {Map<string, ContainerSession>}
 */
const activeContainerSessions = new Map();

/** Placeable ブロック系の判定セット（設置として扱う対象） */
const PLACEABLE_HAZARD_SET = new Set([
  "minecraft:tnt",
  "minecraft:respawn_anchor",
  "minecraft:dispenser",
  "minecraft:wither_skeleton_skull",
]);

/**
 * プレイヤーが現在生存中（非スペクテイターかつHP>0）か判定する
 * @param {import("@minecraft/server").Player} player
 * @returns {boolean}
 */
export function isPlayerSurviving(player) {
  try {
    if (!player || !player.isValid()) return false;
    const gm = player.getGameMode();
    if (gm === GameMode.spectator || gm === "spectator") {
      return false;
    }
    const health = player.getComponent("minecraft:health");
    if (health && typeof health.currentValue === "number" && health.currentValue <= 0) {
      return false;
    }
    return true;
  } catch {
    return true;
  }
}

/**
 * プレイヤーのインベントリ（36枠）およびオフハンド内の Tier 1 アイテム数を集計する
 * @param {import("@minecraft/server").Player} player
 * @returns {{ totalTier1: number, counts: Record<string, number> }}
 */
export function getPlayerTier1Summary(player) {
  /** @type {Record<string, number>} */
  const counts = {};
  for (const id of TIER1_ITEMS) {
    counts[id] = 0;
  }
  let totalTier1 = 0;

  try {
    // 1. 通常インベントリ（36枠）
    const inv = player.getComponent("minecraft:inventory")?.container;
    if (inv) {
      const size = inv.size;
      for (let i = 0; i < size; i++) {
        const item = inv.getItem(i);
        if (item && TIER1_SET.has(item.typeId)) {
          counts[item.typeId] = (counts[item.typeId] || 0) + item.amount;
          totalTier1 += item.amount;
        }
      }
    }

    // 2. オフハンド
    const equip = player.getComponent("minecraft:equippable");
    if (equip) {
      const offhand = equip.getEquipment(EquipmentSlot.Offhand);
      if (offhand && TIER1_SET.has(offhand.typeId)) {
        counts[offhand.typeId] = (counts[offhand.typeId] || 0) + offhand.amount;
        totalTier1 += offhand.amount;
      }
    }
  } catch {
    // ignore
  }

  return { totalTier1, counts };
}

/**
 * プレイヤーのオフハンド + インベントリ36枠の全所持品を集約し、Tier 1 / Tier 2 優先順で返す（検査UI用）
 * @param {import("@minecraft/server").Player} player
 * @returns {Array<{ typeId: string, amount: number, tier: number }>}
 */
export function getPlayerInspectedItems(player) {
  /** @type {Map<string, number>} */
  const itemCounts = new Map();

  try {
    const equip = player.getComponent("minecraft:equippable");
    if (equip) {
      const offhand = equip.getEquipment(EquipmentSlot.Offhand);
      if (offhand && offhand.typeId) {
        itemCounts.set(offhand.typeId, (itemCounts.get(offhand.typeId) || 0) + offhand.amount);
      }
    }

    const inv = player.getComponent("minecraft:inventory")?.container;
    if (inv) {
      const size = inv.size;
      for (let i = 0; i < size; i++) {
        const item = inv.getItem(i);
        if (item && item.typeId) {
          itemCounts.set(item.typeId, (itemCounts.get(item.typeId) || 0) + item.amount);
        }
      }
    }
  } catch {
    // ignore
  }

  /** @type {Array<{ typeId: string, amount: number, tier: number }>} */
  const list = [];
  for (const [typeId, amount] of itemCounts.entries()) {
    const tier = TIER1_SET.has(typeId) ? 1 : TIER2_SET.has(typeId) ? 2 : 3;
    list.push({ typeId, amount, tier });
  }

  // Tier 1 -> Tier 2 -> その他（個数降順）でソート
  list.sort((a, b) => {
    if (a.tier !== b.tier) return a.tier - b.tier;
    return b.amount - a.amount;
  });

  return list;
}

/**
 * 現在オンラインで Tier 1 危険物を1個以上所持しているプレイヤー人数を返す
 * @returns {number}
 */
export function getOnlineDangerHolderCount() {
  let holderCount = 0;
  try {
    for (const player of world.getAllPlayers()) {
      const { totalTier1 } = getPlayerTier1Summary(player);
      if (totalTier1 > 0) {
        holderCount++;
      }
    }
  } catch {
    // ignore
  }
  return holderCount;
}

/**
 * 監視警告チャット通知と警告音を全体へ送信する（5.3節フォーマット準拠）
 * @param {{
 *   dimId: string,
 *   x: number,
 *   y: number,
 *   z: number,
 *   gamertag: string,
 *   playerId: string,
 *   typeId: string,
 *   actionJa: string,
 *   isUseOrPlace: boolean
 * }} params
 */
function broadcastMonitorAlert(params) {
  const dimShort = getDimShortName(params.dimId);
  const ix = Math.floor(params.x);
  const iy = Math.floor(params.y);
  const iz = Math.floor(params.z);
  const itemJaName = getItemJaName(params.typeId);

  const msg =
    `${GLYPHS.WARNING} §c[監視警告] §e${dimShort} (${ix}, ${iy}, ${iz}) §fで ` +
    `§b${params.gamertag} §7(${params.playerId}) §fが ` +
    `§6${itemJaName} §fを §c${params.actionJa} §fしました`;

  try {
    world.sendMessage(msg);
    const soundId = params.isUseOrPlace ? "random.anvil_land" : "note.pling";
    const soundOpts = params.isUseOrPlace
      ? { pitch: 0.9, volume: 1.0 }
      : { pitch: 0.6, volume: 1.0 };

    for (const p of world.getAllPlayers()) {
      try {
        p.playSound(soundId, soundOpts);
      } catch {
        // ignore individual sound failure
      }
    }
  } catch {
    // ignore
  }
}

/**
 * 入室時に既存所持分が誤通知されないよう初期スナップショットを記録する
 * @param {import("@minecraft/server").Player} player
 */
export function initPlayerMonitorSnapshot(player) {
  try {
    if (!player || !player.isValid()) return;
    const { counts } = getPlayerTier1Summary(player);
    playerTier1Snapshots.set(player.id, counts);
  } catch {
    // ignore
  }
}

/**
 * プレイヤー切断時のスナップショット破棄および未完了コンテナセッションの確定処理
 * @param {string} playerId
 */
export function cleanupPlayerMonitorState(playerId) {
  if (!playerId) return;
  playerTier1Snapshots.delete(playerId);
  const session = activeContainerSessions.get(playerId);
  if (session) {
    finalizeContainerSession(session);
    activeContainerSessions.delete(playerId);
  }
}

/**
 * 10 Tick (0.5秒) 周期のインベントリ差分走査 + サイドバー更新
 */
export function runInventoryDiffScan() {
  /** @type {Record<string, number>} */
  const tier1Totals = {};
  for (const id of TIER1_ITEMS) {
    tier1Totals[id] = 0;
  }

  try {
    const players = world.getAllPlayers();
    /** @type {Set<string>} */
    const onlineIds = new Set();

    for (const player of players) {
      if (!player || !player.isValid()) continue;
      const pid = player.id;
      onlineIds.add(pid);

      const { counts } = getPlayerTier1Summary(player);

      // 生存プレイヤーの所持分をサイドバー合計に加算
      if (isPlayerSurviving(player)) {
        for (const id of TIER1_ITEMS) {
          tier1Totals[id] += counts[id] || 0;
        }
      }

      const prevCounts = playerTier1Snapshots.get(pid);
      if (!prevCounts) {
        // 初回スナップショット登録のみ行い誤通知を防止
        playerTier1Snapshots.set(pid, counts);
        continue;
      }

      // 前回値より増加した Tier 1 アイテムを検知
      for (const id of TIER1_ITEMS) {
        const currentVal = counts[id] || 0;
        const prevVal = prevCounts[id] || 0;
        if (currentVal > prevVal) {
          const diff = currentVal - prevVal;
          const loc = player.location;
          const dimId = player.dimension?.id || "overworld";

          broadcastMonitorAlert({
            dimId,
            x: loc.x,
            y: loc.y,
            z: loc.z,
            gamertag: player.name,
            playerId: pid,
            typeId: id,
            actionJa: `入手 (+${diff})`,
            isUseOrPlace: false,
          });

          appendAuditLog({
            cat: "OBTAIN",
            pName: player.name,
            pId: pid,
            dim: dimId,
            x: loc.x,
            y: loc.y,
            z: loc.z,
            detail: `${getItemJaName(id)} (+${diff})`,
          });
        }
      }

      playerTier1Snapshots.set(pid, counts);
    }

    // 切断済みプレイヤーのキャッシュ掃除
    for (const cachedId of playerTier1Snapshots.keys()) {
      if (!onlineIds.has(cachedId)) {
        playerTier1Snapshots.delete(cachedId);
      }
    }

    // サイドバーの数値を同期
    syncSidebar(tier1Totals, false);
  } catch {
    // ignore
  }
}

/**
 * 5 Tick デバウンス付きで使用・設置を通知および監査ログ記録する
 * @param {{
 *   playerId: string,
 *   gamertag: string,
 *   dimId: string,
 *   x: number,
 *   y: number,
 *   z: number,
 *   typeId: string,
 *   cat: "USE" | "PLACE",
 *   actionJa: string,
 *   detail: string
 * }} info
 */
function recordHazardUseOrPlace(info) {
  const nowTick = system.currentTick;
  const debounceKey = `${info.playerId}:${info.typeId}`;
  const lastTick = actionDebounceMap.get(debounceKey);
  if (lastTick !== undefined && nowTick - lastTick <= 5) {
    return;
  }
  actionDebounceMap.set(debounceKey, nowTick);

  // 古いデバウンス履歴の肥大化防止
  if (actionDebounceMap.size > 200) {
    for (const [k, t] of actionDebounceMap.entries()) {
      if (nowTick - t > 100) {
        actionDebounceMap.delete(k);
      }
    }
  }

  broadcastMonitorAlert({
    dimId: info.dimId,
    x: info.x,
    y: info.y,
    z: info.z,
    gamertag: info.gamertag,
    playerId: info.playerId,
    typeId: info.typeId,
    actionJa: info.actionJa,
    isUseOrPlace: true,
  });

  appendAuditLog({
    cat: info.cat,
    pName: info.gamertag,
    pId: info.playerId,
    dim: info.dimId,
    x: info.x,
    y: info.y,
    z: info.z,
    detail: info.detail,
  });
}

// ============================================================================
// コンテナ開閉・ディスペンサー監視ロジック
// ============================================================================

/**
 * 指定座標のブロックコンテナの中身を集計マップとして取得する
 * @param {string} dimId
 * @param {number} x
 * @param {number} y
 * @param {number} z
 * @returns {Record<string, number> | null}
 */
function readBlockContainerMap(dimId, x, y, z) {
  try {
    const dim = world.getDimension(dimId);
    if (!dim) return null;
    const block = dim.getBlock({ x, y, z });
    if (!block) return null;
    const invComp = block.getComponent("minecraft:inventory");
    const container = invComp?.container;
    if (!container) return null;

    /** @type {Record<string, number>} */
    const map = {};
    const size = container.size;
    for (let i = 0; i < size; i++) {
      const item = container.getItem(i);
      if (item && item.typeId) {
        map[item.typeId] = (map[item.typeId] || 0) + item.amount;
      }
    }
    return map;
  } catch {
    return null;
  }
}

/**
 * 2つのアイテム集計マップが同一かどうかを比較する
 * @param {Record<string, number>} a
 * @param {Record<string, number>} b
 * @returns {boolean}
 */
function areItemMapsEqual(a, b) {
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const k of keysA) {
    if ((a[k] || 0) !== (b[k] || 0)) return false;
  }
  return true;
}

/**
 * コンテナセッション終了時に beforeMap と afterMap の差分を計算し CONT_DIFF を記録する
 * @param {ContainerSession} session
 */
function finalizeContainerSession(session) {
  const latestMap =
    readBlockContainerMap(session.dimId, session.x, session.y, session.z) || session.lastMap;
  if (!latestMap) return;

  /** @type {Set<string>} */
  const allKeys = new Set([
    ...Object.keys(session.beforeMap),
    ...Object.keys(latestMap),
  ]);

  /** @type {string[]} */
  const diffs = [];
  for (const key of allKeys) {
    const beforeCount = session.beforeMap[key] || 0;
    const afterCount = latestMap[key] || 0;
    const delta = afterCount - beforeCount;
    if (delta !== 0) {
      const sign = delta > 0 ? `+${delta}` : `${delta}`;
      diffs.push(`${getItemJaName(key)} (${sign})`);
    }
  }

  if (diffs.length > 0) {
    appendAuditLog({
      cat: "CONT_DIFF",
      pName: session.pName,
      pId: session.playerId,
      dim: session.dimId,
      x: session.x,
      y: session.y,
      z: session.z,
      detail: diffs.join(", "),
    });
  }
}

/**
 * 10 Tick 周期でアクティブなコンテナ開閉セッションを監視し、離脱・静止時に差分を確定する
 */
export function tickContainerSessions() {
  if (activeContainerSessions.size === 0) return;

  const nowTick = system.currentTick;
  const playersById = new Map();
  try {
    for (const p of world.getAllPlayers()) {
      if (p && p.isValid()) {
        playersById.set(p.id, p);
      }
    }
  } catch {
    // ignore
  }

  for (const [playerId, session] of activeContainerSessions.entries()) {
    const player = playersById.get(playerId);
    const currentMap = readBlockContainerMap(session.dimId, session.x, session.y, session.z);

    if (currentMap) {
      // 最新スナップショットを保持（破壊・チャンクアンロード前対策）
      const unchangedSinceLastCheck = areItemMapsEqual(currentMap, session.lastMap);
      session.lastMap = currentMap;

      if (!player) {
        // 切断された場合
        finalizeContainerSession(session);
        activeContainerSessions.delete(playerId);
        continue;
      }

      // ディメンション移動または距離 8 ブロック以上離れたか判定
      const sameDim = player.dimension?.id === session.dimId;
      const dx = player.location.x - (session.x + 0.5);
      const dy = player.location.y - (session.y + 0.5);
      const dz = player.location.z - (session.z + 0.5);
      const distSq = dx * dx + dy * dy + dz * dz;

      const elapsed = nowTick - session.openTick;
      const settledAfter60Ticks =
        elapsed >= 60 &&
        unchangedSinceLastCheck &&
        !areItemMapsEqual(currentMap, session.beforeMap);
      const idleTimeout = elapsed >= 200 && unchangedSinceLastCheck;

      if (!sameDim || distSq >= 64 || settledAfter60Ticks || idleTimeout) {
        finalizeContainerSession(session);
        activeContainerSessions.delete(playerId);
      }
    } else {
      // 対象ブロックが破壊されたかチャンク外になった場合も即座に確定
      finalizeContainerSession(session);
      activeContainerSessions.delete(playerId);
    }
  }
}

/**
 * 監視関連のイベントリスナーを登録する
 */
export function registerMonitorEvents() {
  // 1. world.beforeEvents.playerInteractWithBlock
  world.beforeEvents.playerInteractWithBlock.subscribe((event) => {
    if (!event.isFirstEvent) return;

    const player = event.player;
    if (!player) return;

    const itemTypeId = event.itemStack?.typeId;
    if (itemTypeId === OP_TERMINAL_ITEM_ID) return;

    const block = event.block;
    const blockTypeId = block?.typeId;

    // 手持ちアイテムが Tier 1 / Tier 2 に該当する場合
    if (itemTypeId && (TIER1_SET.has(itemTypeId) || TIER2_SET.has(itemTypeId))) {
      const playerId = player.id;
      const gamertag = player.name;
      const dimId = block?.dimension?.id || player.dimension?.id || "overworld";
      const loc = block?.location || player.location;
      const isPlace = PLACEABLE_HAZARD_SET.has(itemTypeId);

      system.run(() => {
        recordHazardUseOrPlace({
          playerId,
          gamertag,
          dimId,
          x: loc.x,
          y: loc.y,
          z: loc.z,
          typeId: itemTypeId,
          cat: isPlace ? "PLACE" : "USE",
          actionJa: isPlace ? "設置" : "使用",
          detail: `${getItemJaName(itemTypeId)}（${isPlace ? "設置" : "使用"}）`,
        });
      });
      return;
    }

    // 対象ブロックがリスポーンアンカー（チャージ・起爆操作）の場合
    if (blockTypeId === "minecraft:respawn_anchor" && !player.isSneaking) {
      const playerId = player.id;
      const gamertag = player.name;
      const dimId = block.dimension?.id || player.dimension?.id || "overworld";
      const loc = block.location;
      const heldJa = itemTypeId ? getItemJaName(itemTypeId) : "素手";

      system.run(() => {
        recordHazardUseOrPlace({
          playerId,
          gamertag,
          dimId,
          x: loc.x,
          y: loc.y,
          z: loc.z,
          typeId: "minecraft:respawn_anchor",
          cat: "USE",
          actionJa: "操作・起爆",
          detail: `リスポーンアンカー（手持ち: ${heldJa}）`,
        });
      });
    }
  });

  // 2. world.afterEvents.playerPlaceBlock
  world.afterEvents.playerPlaceBlock.subscribe((event) => {
    const player = event.player;
    const block = event.block;
    if (!player || !block) return;

    const blockTypeId = block.typeId;
    if (TIER1_SET.has(blockTypeId) || TIER2_SET.has(blockTypeId)) {
      recordHazardUseOrPlace({
        playerId: player.id,
        gamertag: player.name,
        dimId: block.dimension?.id || player.dimension?.id || "overworld",
        x: block.location.x,
        y: block.location.y,
        z: block.location.z,
        typeId: blockTypeId,
        cat: "PLACE",
        actionJa: "設置",
        detail: `${getItemJaName(blockTypeId)}（設置）`,
      });
    }
  });

  // 3. world.beforeEvents.playerInteractWithEntity
  world.beforeEvents.playerInteractWithEntity.subscribe((event) => {
    const player = event.player;
    if (!player) return;

    const itemTypeId = event.itemStack?.typeId;
    if (!itemTypeId || itemTypeId === OP_TERMINAL_ITEM_ID) return;

    if (TIER1_SET.has(itemTypeId) || TIER2_SET.has(itemTypeId)) {
      const playerId = player.id;
      const gamertag = player.name;
      const targetEntity = event.target;
      const targetJa = translateEntityToJa(targetEntity?.typeId || "");
      const loc = targetEntity?.location || player.location;
      const dimId = player.dimension?.id || "overworld";

      system.run(() => {
        recordHazardUseOrPlace({
          playerId,
          gamertag,
          dimId,
          x: loc.x,
          y: loc.y,
          z: loc.z,
          typeId: itemTypeId,
          cat: "USE",
          actionJa: "着火・使用",
          detail: `${getItemJaName(itemTypeId)} → ${targetJa}`,
        });
      });
    }
  });

  // 4. world.afterEvents.playerInteractWithBlock（ディスペンサー開閉・コンテナ差分追跡）
  world.afterEvents.playerInteractWithBlock.subscribe((event) => {
    const player = event.player;
    const block = event.block;
    if (!player || !block) return;

    // スニーク設置時はコンテナを開かないため除外
    if (player.isSneaking && event.itemStack) return;

    try {
      const invComp = block.getComponent("minecraft:inventory");
      if (!invComp || !invComp.container) return;

      const dimId = block.dimension?.id || player.dimension?.id || "overworld";
      const bx = block.location.x;
      const by = block.location.y;
      const bz = block.location.z;

      // ディスペンサーを開いた場合は即座に DISP_OPEN を監査ログへ記録
      if (block.typeId === "minecraft:dispenser") {
        appendAuditLog({
          cat: "DISP_OPEN",
          pName: player.name,
          pId: player.id,
          dim: dimId,
          x: bx,
          y: by,
          z: bz,
          detail: "ディスペンサー（開操作）",
        });
      }

      // 既に別コンテナのセッションを開いていた場合は先に確定させる
      const prevSession = activeContainerSessions.get(player.id);
      if (
        prevSession &&
        (prevSession.dimId !== dimId ||
          prevSession.x !== bx ||
          prevSession.y !== by ||
          prevSession.z !== bz)
      ) {
        finalizeContainerSession(prevSession);
        activeContainerSessions.delete(player.id);
      }

      if (!activeContainerSessions.has(player.id)) {
        const beforeMap = readBlockContainerMap(dimId, bx, by, bz) || {};
        activeContainerSessions.set(player.id, {
          playerId: player.id,
          pName: player.name,
          dimId,
          x: bx,
          y: by,
          z: bz,
          blockTypeId: block.typeId,
          beforeMap,
          lastMap: { ...beforeMap },
          openTick: system.currentTick,
        });
      }
    } catch {
      // ignore
    }
  });
}
