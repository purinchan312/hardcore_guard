/**
 * @file ban_death.js
 * @description ハードコア死亡記録・手動追放実行・永久追放自動再追放・新ワールド識別番号自動紐付け
 */

import { world } from "@minecraft/server";
import { GLYPHS, getDimShortName } from "./config.js";
import { translateDeathCauseToJa, translateEntityToJa } from "./ja_dict.js";
import {
  addDeathRecord,
  appendAuditLog,
  getBans,
  saveBans,
  upsertBanRecord,
} from "./storage.js";
import { isProtectedFromKick } from "./permissions.js";
import { refreshSidebarDeathHeader } from "./sidebar.js";

/**
 * 死因情報（damageSource）から日本語の死因文字列を生成する
 * @param {import("@minecraft/server").EntityDamageSource | undefined} damageSource
 * @returns {string}
 */
function formatDeathCause(damageSource) {
  if (!damageSource) return "不明";
  const rawCause = String(damageSource.cause || "unknown");
  const causeJa = translateDeathCauseToJa(rawCause);
  const attacker = damageSource.damagingEntity;
  if (attacker) {
    try {
      const attackerName =
        attacker.typeId === "minecraft:player"
          ? attacker.name
          : attacker.nameTag || translateEntityToJa(attacker.typeId);
      return `${causeJa}（相手: ${attackerName}）`;
    } catch {
      return causeJa;
    }
  }
  return causeJa;
}

/**
 * 指定プレイヤーに対して kick コマンドを非同期実行する（5.5節構文準拠）
 * @param {import("@minecraft/server").Player} targetPlayer
 * @returns {Promise<boolean>}
 */
export async function runKickCommandOnPlayer(targetPlayer) {
  try {
    if (!targetPlayer || !targetPlayer.isValid()) return false;
    if (isProtectedFromKick(targetPlayer)) {
      return false;
    }
    const targetName = targetPlayer.name;
    const dim = targetPlayer.dimension || world.getDimension("overworld");
    const cmd = 'kick "' + targetName.replace(/"/g, '\\"') + '" 管理者により追放されました';
    await dim.runCommandAsync(cmd);
    return true;
  } catch {
    return false;
  }
}

/**
 * 管理者操作によるプレイヤー追放（単発追放 または 永久追放登録 + 追放）を実行し記録する
 * @param {import("@minecraft/server").Player} targetPlayer
 * @param {boolean} permanent 永久追放として登録するか
 * @param {string} operatorName 実行した管理者の名前
 * @returns {boolean} 追放処理を開始した場合 true
 */
export function executeOpKickPlayer(targetPlayer, permanent, operatorName) {
  if (!targetPlayer || !targetPlayer.isValid()) return false;
  if (isProtectedFromKick(targetPlayer)) {
    return false;
  }

  const targetName = targetPlayer.name;
  const targetId = targetPlayer.id;
  const dimId = targetPlayer.dimension?.id || "overworld";
  const loc = targetPlayer.location || { x: 0, y: 0, z: 0 };
  const opLabel = operatorName || "管理者";

  upsertBanRecord({
    gamertag: targetName,
    playerId: targetId,
    permanent: Boolean(permanent),
    by: opLabel,
  });

  appendAuditLog({
    cat: "KICK",
    pName: targetName,
    pId: targetId,
    dim: dimId,
    x: loc.x,
    y: loc.y,
    z: loc.z,
    detail: `${permanent ? "永久追放" : "単発追放"}（実行者: ${opLabel}）`,
  });

  runKickCommandOnPlayer(targetPlayer);
  return true;
}

/**
 * 単一プレイヤーを永久追放リストと照合し、該当すれば識別番号自動紐付け・名前更新の上で即時追放する
 * @param {import("@minecraft/server").Player} player
 * @returns {boolean} 永久追放対象として追放された場合 true
 */
export function enforcePermanentBanOnPlayer(player) {
  try {
    if (!player || !player.isValid()) return false;
    if (isProtectedFromKick(player)) return false;

    const bans = getBans();
    if (bans.length === 0) return false;

    const pid = player.id;
    const pName = player.name;
    const lowerName = pName.toLowerCase();

    let matchedRecord = null;
    let needsSave = false;

    for (const record of bans) {
      if (record.permanent !== true) continue;

      // 1. playerId 一致（同一ワールド内での名前変更逃げを含む）
      if (record.playerId !== null && record.playerId === pid) {
        if (record.gamertag !== pName) {
          record.gamertag = pName;
          needsSave = true;
        }
        matchedRecord = record;
        break;
      }

      // 2. コピペ引き継ぎされた永久追放対象者（playerId === null かつ 名前一致）
      if (record.playerId === null && record.gamertag.toLowerCase() === lowerName) {
        record.playerId = pid;
        record.gamertag = pName;
        needsSave = true;
        matchedRecord = record;
        break;
      }
    }

    if (needsSave) {
      saveBans(bans);
    }

    if (matchedRecord) {
      runKickCommandOnPlayer(player);
      return true;
    }
  } catch {
    // ignore
  }
  return false;
}

/**
 * 20 Tick 周期で全オンラインプレイヤーを永久追放リストと照合する
 */
export function checkOnlinePlayersForPermanentBans() {
  try {
    for (const player of world.getAllPlayers()) {
      enforcePermanentBanOnPlayer(player);
    }
  } catch {
    // ignore
  }
}

/**
 * 死亡検知イベント（entityDie）を登録する
 */
export function registerDeathEvents() {
  world.afterEvents.entityDie.subscribe((event) => {
    const dead = event.deadEntity;
    if (!dead || dead.typeId !== "minecraft:player") return;

    const player = /** @type {import("@minecraft/server").Player} */ (dead);
    const pid = player.id;
    const gamertag = player.name;
    const dimId = player.dimension?.id || "overworld";
    const dimJa = getDimShortName(dimId);
    const loc = player.location || { x: 0, y: 0, z: 0 };
    const ix = Math.floor(loc.x);
    const iy = Math.floor(loc.y);
    const iz = Math.floor(loc.z);
    const causeStr = formatDeathCause(event.damageSource);

    // 戦没者リストへ保存（ユニーク管理）
    addDeathRecord({
      playerId: pid,
      gamertag,
      dim: dimJa,
      x: ix,
      y: iy,
      z: iz,
      cause: causeStr,
      excluded: false,
      ts: Date.now(),
    });

    // 監査ログへ記録
    appendAuditLog({
      cat: "DEATH",
      pName: gamertag,
      pId: pid,
      dim: dimJa,
      x: ix,
      y: iy,
      z: iz,
      detail: `死因: ${causeStr}`,
    });

    // 右上サイドバーのドクロ死者数を即時更新
    refreshSidebarDeathHeader();

    // 全体チャットへ即時出力
    try {
      world.sendMessage(
        `${GLYPHS.SKULL} §4[戦没報告] §b${gamertag} §7(${pid}) §fが ` +
          `§e${dimJa} (${ix}, ${iy}, ${iz}) §fで死亡しました §7[死因: ${causeStr}]`
      );
    } catch {
      // ignore
    }
  });
}
