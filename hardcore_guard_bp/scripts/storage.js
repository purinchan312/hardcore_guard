/**
 * @file storage.js
 * @description DynamicProperties 永続化・分割保存（28,000 UTF-8 バイト境界制御）・15スロット循環監査ログ管理
 */

import { world } from "@minecraft/server";
import { STORAGE_KEYS, MAX_SLOT_BYTES, getDimShortName } from "./config.js";
import { utf8ByteLength, splitJsonArrayByByteLimit } from "./utf8.js";

/**
 * DynamicProperty から文字列を安全に取得する
 * @param {string} key
 * @returns {string | null}
 */
function getRawProperty(key) {
  try {
    const val = world.getDynamicProperty(key);
    return typeof val === "string" ? val : null;
  } catch {
    return null;
  }
}

/**
 * DynamicProperty へ文字列を安全に保存する（28,000バイト超過ガード付き）
 * @param {string} key
 * @param {string | undefined} value
 */
function setRawProperty(key, value) {
  try {
    if (value === undefined || value === null) {
      world.setDynamicProperty(key, undefined);
      return;
    }
    if (utf8ByteLength(value) > 32767) {
      return;
    }
    world.setDynamicProperty(key, value);
  } catch {
    // 初期化前や制限モード中の例外を握りつぶしてクラッシュを防止
  }
}

/**
 * JSON文字列を安全にパースする
 * @template T
 * @param {string | null} raw
 * @param {T} fallback
 * @returns {T}
 */
function safeJsonParse(raw, fallback) {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return parsed !== null && parsed !== undefined ? parsed : fallback;
  } catch {
    return fallback;
  }
}

// ============================================================================
// 1. 最高管理者 (hc:primary_op) & 副OP (hc:sub_ops)
// ============================================================================

/** @type {string | null} */
let cachedPrimaryOp = null;
/** @type {Array<{ id: string, gamertag: string, addedAt: number }> | null} */
let cachedSubOps = null;

/**
 * 最高管理者の player.id を取得する
 * @returns {string | null}
 */
export function getPrimaryOpId() {
  if (cachedPrimaryOp !== null) {
    return cachedPrimaryOp;
  }
  const raw = getRawProperty(STORAGE_KEYS.PRIMARY_OP);
  if (raw && raw.length > 0) {
    cachedPrimaryOp = raw;
    return raw;
  }
  return null;
}

/**
 * 最高管理者が未登録の場合のみ登録する（一度登録されたら変更不可）
 * @param {string} playerId
 * @returns {boolean} 新規登録された場合 true
 */
export function registerPrimaryOpIfUnset(playerId) {
  if (!playerId) return false;
  const current = getPrimaryOpId();
  if (current) {
    return false;
  }
  cachedPrimaryOp = playerId;
  setRawProperty(STORAGE_KEYS.PRIMARY_OP, playerId);
  return true;
}

/**
 * 副OPリストを取得する
 * @returns {Array<{ id: string, gamertag: string, addedAt: number }>}
 */
export function getSubOps() {
  if (cachedSubOps !== null) {
    return cachedSubOps;
  }
  const raw = getRawProperty(STORAGE_KEYS.SUB_OPS);
  const parsed = safeJsonParse(raw, []);
  cachedSubOps = Array.isArray(parsed) ? parsed : [];
  return cachedSubOps;
}

/**
 * 副OPリストを保存する
 * @param {Array<{ id: string, gamertag: string, addedAt: number }>} list
 */
export function saveSubOps(list) {
  const safeList = Array.isArray(list) ? list : [];
  const chunks = splitJsonArrayByByteLimit(safeList, MAX_SLOT_BYTES);
  const json = chunks[0] || "[]";
  cachedSubOps = safeJsonParse(json, []);
  setRawProperty(STORAGE_KEYS.SUB_OPS, json);
}

// ============================================================================
// 2. 戦没者リスト (hc:deaths / hc:deaths_0..3)
// ============================================================================

/**
 * @typedef {Object} DeathRecord
 * @property {string} playerId
 * @property {string} gamertag
 * @property {string} dim
 * @property {number} x
 * @property {number} y
 * @property {number} z
 * @property {string} cause
 * @property {boolean} excluded
 * @property {number} ts
 */

/** @type {DeathRecord[] | null} */
let cachedDeaths = null;

/**
 * 戦没者リストを全スロットから読み込む
 * @returns {DeathRecord[]}
 */
export function getDeaths() {
  if (cachedDeaths !== null) {
    return cachedDeaths;
  }

  /** @type {DeathRecord[]} */
  const combined = [];
  /** @type {Set<string>} */
  const seenIds = new Set();

  // メインキー hc:deaths を確認
  const mainRaw = getRawProperty(STORAGE_KEYS.DEATHS);
  const mainList = safeJsonParse(mainRaw, []);
  if (Array.isArray(mainList)) {
    for (const item of mainList) {
      if (item && typeof item.playerId === "string" && !seenIds.has(item.playerId)) {
        seenIds.add(item.playerId);
        combined.push(item);
      }
    }
  }

  // 分割スロット hc:deaths_0 .. hc:deaths_3 を確認
  for (let i = 0; i < STORAGE_KEYS.DEATH_SLOT_COUNT; i++) {
    const slotRaw = getRawProperty(`${STORAGE_KEYS.DEATHS_PREFIX}${i}`);
    const slotList = safeJsonParse(slotRaw, []);
    if (Array.isArray(slotList)) {
      for (const item of slotList) {
        if (item && typeof item.playerId === "string" && !seenIds.has(item.playerId)) {
          seenIds.add(item.playerId);
          combined.push(item);
        }
      }
    }
  }

  cachedDeaths = combined;
  return cachedDeaths;
}

/**
 * 戦没者リストを保存する（28,000 UTF-8 バイト超過時は hc:deaths_0..3 へ分割）
 * @param {DeathRecord[]} deaths
 */
export function saveDeaths(deaths) {
  const uniqueList = [];
  const seenIds = new Set();
  for (const d of deaths) {
    if (d && typeof d.playerId === "string" && !seenIds.has(d.playerId)) {
      seenIds.add(d.playerId);
      uniqueList.push(d);
    }
  }

  const chunks = splitJsonArrayByByteLimit(uniqueList, MAX_SLOT_BYTES);
  if (chunks.length <= 1) {
    // 1スロットに収まる場合は hc:deaths に保存し、分割スロットをクリア
    setRawProperty(STORAGE_KEYS.DEATHS, chunks[0] || "[]");
    for (let i = 0; i < STORAGE_KEYS.DEATH_SLOT_COUNT; i++) {
      setRawProperty(`${STORAGE_KEYS.DEATHS_PREFIX}${i}`, undefined);
    }
  } else {
    // 複数スロットに跨る場合は hc:deaths を空配列にし、hc:deaths_0..3 に分割保存
    setRawProperty(STORAGE_KEYS.DEATHS, "[]");
    for (let i = 0; i < STORAGE_KEYS.DEATH_SLOT_COUNT; i++) {
      if (i < chunks.length) {
        setRawProperty(`${STORAGE_KEYS.DEATHS_PREFIX}${i}`, chunks[i]);
      } else {
        setRawProperty(`${STORAGE_KEYS.DEATHS_PREFIX}${i}`, undefined);
      }
    }
  }

  cachedDeaths = uniqueList;
}

/**
 * 死亡記録を追加する（同一 playerId は重複加算しない）
 * @param {Omit<DeathRecord, "excluded" | "ts"> & { excluded?: boolean, ts?: number }} record
 * @returns {boolean} 新規記録された場合 true（既に記録済みの場合は false）
 */
export function addDeathRecord(record) {
  const deaths = getDeaths();
  const existing = deaths.find((d) => d.playerId === record.playerId);
  if (existing) {
    // 既存の記録がある場合は最新 Gamertag のみ更新し重複追加しない
    existing.gamertag = record.gamertag;
    saveDeaths(deaths);
    return false;
  }

  /** @type {DeathRecord} */
  const newEntry = {
    playerId: String(record.playerId),
    gamertag: String(record.gamertag),
    dim: getDimShortName(record.dim),
    x: Math.floor(Number(record.x) || 0),
    y: Math.floor(Number(record.y) || 0),
    z: Math.floor(Number(record.z) || 0),
    cause: String(record.cause || "unknown"),
    excluded: Boolean(record.excluded),
    ts: record.ts || Date.now(),
  };

  deaths.push(newEntry);
  saveDeaths(deaths);
  return true;
}

/**
 * 除外されていない有効な戦没者数（ドクロ死者数）を返す
 * @returns {number}
 */
export function getActiveDeathCount() {
  const deaths = getDeaths();
  let count = 0;
  for (const d of deaths) {
    if (!d.excluded) {
      count++;
    }
  }
  return count;
}

/**
 * 指定 playerId の戦没者レコードの excluded（カウント除外）フラグを反転する
 * @param {string} playerId
 * @returns {DeathRecord | null} 更新後のレコード
 */
export function toggleDeathExclusion(playerId) {
  const deaths = getDeaths();
  const target = deaths.find((d) => d.playerId === playerId);
  if (!target) return null;
  target.excluded = !target.excluded;
  saveDeaths(deaths);
  return target;
}

// ============================================================================
// 3. Kick済み・永続BANリスト (hc:bans_meta / hc:bans_0..4)
// ============================================================================

/**
 * @typedef {Object} BanRecord
 * @property {string} gamertag
 * @property {string | null} playerId
 * @property {string | null} legacyId
 * @property {boolean} permanent
 * @property {string} by
 * @property {number} ts
 */

/** @type {BanRecord[] | null} */
let cachedBans = null;

/**
 * Kick済みおよび永続BANリストを全スロットから取得する
 * @returns {BanRecord[]}
 */
export function getBans() {
  if (cachedBans !== null) {
    return cachedBans;
  }

  /** @type {BanRecord[]} */
  const list = [];
  for (let i = 0; i < STORAGE_KEYS.BAN_SLOT_COUNT; i++) {
    const raw = getRawProperty(`${STORAGE_KEYS.BANS_PREFIX}${i}`);
    const parsed = safeJsonParse(raw, []);
    if (Array.isArray(parsed)) {
      for (const item of parsed) {
        if (item && typeof item.gamertag === "string") {
          list.push({
            gamertag: item.gamertag,
            playerId: item.playerId !== undefined ? item.playerId : null,
            legacyId: item.legacyId !== undefined ? item.legacyId : null,
            permanent: Boolean(item.permanent),
            by: String(item.by || "管理者"),
            ts: Number(item.ts) || Date.now(),
          });
        }
      }
    }
  }

  cachedBans = list;
  return cachedBans;
}

/**
 * Kick済みおよび永続BANリストを hc:bans_0..4 に分割保存する
 * @param {BanRecord[]} bans
 */
export function saveBans(bans) {
  let targetList = Array.isArray(bans) ? [...bans] : [];

  // 万一5スロットを超える場合は、古い単発Kick履歴（permanent === false）から優先削減して永続BANを守る
  let chunks = splitJsonArrayByByteLimit(targetList, MAX_SLOT_BYTES);
  while (chunks.length > STORAGE_KEYS.BAN_SLOT_COUNT && targetList.length > 1) {
    const nonPermIdx = targetList.findIndex((b) => !b.permanent);
    if (nonPermIdx !== -1) {
      targetList.splice(nonPermIdx, 1);
    } else {
      targetList.shift();
    }
    chunks = splitJsonArrayByByteLimit(targetList, MAX_SLOT_BYTES);
  }

  const usedSlots = Math.min(chunks.length, STORAGE_KEYS.BAN_SLOT_COUNT);
  for (let i = 0; i < STORAGE_KEYS.BAN_SLOT_COUNT; i++) {
    if (i < usedSlots) {
      setRawProperty(`${STORAGE_KEYS.BANS_PREFIX}${i}`, chunks[i]);
    } else {
      setRawProperty(`${STORAGE_KEYS.BANS_PREFIX}${i}`, undefined);
    }
  }

  setRawProperty(
    STORAGE_KEYS.BANS_META,
    JSON.stringify({ slotCount: usedSlots, total: targetList.length, updatedAt: Date.now() })
  );
  cachedBans = targetList;
}

/**
 * Kick / BAN レコードを追加または更新する
 * @param {{ gamertag: string, playerId: string | null, legacyId?: string | null, permanent: boolean, by: string }} entry
 */
export function upsertBanRecord(entry) {
  const bans = getBans();
  const lowerName = entry.gamertag.toLowerCase();

  // playerId 一致、または Gamertag 一致の既存レコードを検索
  const existing = bans.find(
    (b) =>
      (entry.playerId !== null && b.playerId === entry.playerId) ||
      b.gamertag.toLowerCase() === lowerName
  );

  if (existing) {
    existing.gamertag = entry.gamertag;
    if (entry.playerId !== null) {
      existing.playerId = entry.playerId;
    }
    if (entry.legacyId !== undefined && entry.legacyId !== null) {
      existing.legacyId = entry.legacyId;
    }
    // 単発追放（permanent: false）または永久追放（permanent: true）の指定通りに更新する
    existing.permanent = Boolean(entry.permanent);
    existing.by = entry.by || existing.by;
    existing.ts = Date.now();
  } else {
    bans.push({
      gamertag: entry.gamertag,
      playerId: entry.playerId !== undefined ? entry.playerId : null,
      legacyId: entry.legacyId !== undefined ? entry.legacyId : null,
      permanent: Boolean(entry.permanent),
      by: entry.by || "管理者",
      ts: Date.now(),
    });
  }

  saveBans(bans);
}

// ============================================================================
// 4. 循環監査ログ (hc:audit_meta / hc:audit_0..14)
// ============================================================================

/**
 * @typedef {"OBTAIN" | "USE" | "PLACE" | "DISP_OPEN" | "CONT_DIFF" | "DEATH" | "KICK"} AuditCategory
 */

/**
 * @typedef {Object} AuditLogEntry
 * @property {number} seq
 * @property {number} ts
 * @property {AuditCategory} cat
 * @property {string} pName
 * @property {string} pId
 * @property {string} dim
 * @property {number} x
 * @property {number} y
 * @property {number} z
 * @property {string} detail
 */

/**
 * 監査ログメタデータを取得する
 * @returns {{ activeSlot: number, seq: number }}
 */
function getAuditMeta() {
  const raw = getRawProperty(STORAGE_KEYS.AUDIT_META);
  const parsed = safeJsonParse(raw, { activeSlot: 0, seq: 0 });
  const activeSlot =
    typeof parsed.activeSlot === "number" &&
    parsed.activeSlot >= 0 &&
    parsed.activeSlot < STORAGE_KEYS.AUDIT_SLOT_COUNT
      ? parsed.activeSlot
      : 0;
  const seq = typeof parsed.seq === "number" && parsed.seq >= 0 ? parsed.seq : 0;
  return { activeSlot, seq };
}

/**
 * 監査ログを1件追記する（28,000 UTF-8 バイト境界で15スロットを循環上書き）
 * @param {{
 *   cat: AuditCategory,
 *   pName: string,
 *   pId: string,
 *   dim: string,
 *   x: number,
 *   y: number,
 *   z: number,
 *   detail: string
 * }} params
 * @returns {AuditLogEntry}
 */
export function appendAuditLog(params) {
  const meta = getAuditMeta();
  const nextSeq = meta.seq + 1;
  let activeSlot = meta.activeSlot;

  /** @type {AuditLogEntry} */
  const entry = {
    seq: nextSeq,
    ts: Date.now(),
    cat: params.cat,
    pName: String(params.pName || "Unknown"),
    pId: String(params.pId || "0"),
    dim: getDimShortName(params.dim),
    x: Math.floor(Number(params.x) || 0),
    y: Math.floor(Number(params.y) || 0),
    z: Math.floor(Number(params.z) || 0),
    detail: String(params.detail || ""),
  };

  const slotKey = `${STORAGE_KEYS.AUDIT_PREFIX}${activeSlot}`;
  const currentRaw = getRawProperty(slotKey);
  const currentArr = safeJsonParse(currentRaw, []);
  const slotList = Array.isArray(currentArr) ? currentArr : [];

  slotList.push(entry);
  const candidateJson = JSON.stringify(slotList);

  if (utf8ByteLength(candidateJson) > MAX_SLOT_BYTES) {
    // 現在のスロットが 28,000 バイトを超える場合、次のスロットを初期化して切り替え
    activeSlot = (activeSlot + 1) % STORAGE_KEYS.AUDIT_SLOT_COUNT;
    const nextSlotKey = `${STORAGE_KEYS.AUDIT_PREFIX}${activeSlot}`;
    const freshJson = JSON.stringify([entry]);
    setRawProperty(nextSlotKey, freshJson);
  } else {
    setRawProperty(slotKey, candidateJson);
  }

  setRawProperty(STORAGE_KEYS.AUDIT_META, JSON.stringify({ activeSlot, seq: nextSeq }));
  return entry;
}

/**
 * 全15スロットから監査ログを取得し、新しい順（seq 降順）で返す
 * @returns {AuditLogEntry[]}
 */
export function getAllAuditLogs() {
  /** @type {AuditLogEntry[]} */
  const all = [];
  for (let i = 0; i < STORAGE_KEYS.AUDIT_SLOT_COUNT; i++) {
    const raw = getRawProperty(`${STORAGE_KEYS.AUDIT_PREFIX}${i}`);
    if (!raw) continue;
    const arr = safeJsonParse(raw, []);
    if (Array.isArray(arr)) {
      for (const item of arr) {
        if (item && typeof item.seq === "number") {
          all.push(item);
        }
      }
    }
  }
  all.sort((a, b) => b.seq - a.seq);
  return all;
}
