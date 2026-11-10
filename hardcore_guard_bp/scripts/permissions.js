/**
 * @file permissions.js
 * @description 最高管理者（Primary OP）自動登録・副OP（Sub-OP）管理・権限判定モジュール
 */

import {
  getPrimaryOpId,
  registerPrimaryOpIfUnset,
  getSubOps,
  saveSubOps,
} from "./storage.js";

/**
 * ワールド初回入室者を最高管理者として自動登録する
 * @param {import("@minecraft/server").Player} player
 * @returns {boolean} 今回新たに最高管理者として登録された場合 true
 */
export function ensurePrimaryOpOnJoin(player) {
  if (!player || !player.id) return false;
  const registered = registerPrimaryOpIfUnset(player.id);
  if (registered) {
    try {
      player.sendMessage(
        "§b[荒らし対策] §aあなたをこのワールドの最高管理者として登録しました。"
      );
    } catch {
      // ignore
    }
  } else {
    // 副OPとして登録されている場合、Gamertag変更があれば最新名に同期
    const subOps = getSubOps();
    const entry = subOps.find((s) => s.id === player.id);
    if (entry && entry.gamertag !== player.name) {
      entry.gamertag = player.name;
      saveSubOps(subOps);
    }
  }
  return registered;
}

/**
 * 指定された playerId が最高管理者かどうかを判定する
 * @param {string | undefined | null} playerId
 * @returns {boolean}
 */
export function isPrimaryOpId(playerId) {
  if (!playerId) return false;
  const primaryId = getPrimaryOpId();
  return primaryId !== null && primaryId === playerId;
}

/**
 * 指定されたプレイヤーが最高管理者かどうかを判定する
 * @param {import("@minecraft/server").Player} player
 * @returns {boolean}
 */
export function isPrimaryOp(player) {
  if (!player) return false;
  return isPrimaryOpId(player.id);
}

/**
 * 指定された playerId が副OPかどうかを判定する
 * @param {string | undefined | null} playerId
 * @returns {boolean}
 */
export function isSubOpId(playerId) {
  if (!playerId) return false;
  const subOps = getSubOps();
  return subOps.some((s) => s.id === playerId);
}

/**
 * 指定されたプレイヤーが副OPかどうかを判定する
 * @param {import("@minecraft/server").Player} player
 * @returns {boolean}
 */
export function isSubOp(player) {
  if (!player) return false;
  return isSubOpId(player.id);
}

/**
 * 指定されたプレイヤーまたは playerId が OP（最高管理者 または 副OP）かどうかを判定する
 * @param {import("@minecraft/server").Player | string} playerOrId
 * @returns {boolean}
 */
export function isOp(playerOrId) {
  const id = typeof playerOrId === "string" ? playerOrId : playerOrId?.id;
  if (!id) return false;
  return isPrimaryOpId(id) || isSubOpId(id);
}

/**
 * 副OPを任命・追加する（最高管理者のみ実行可能）
 * @param {string} targetId
 * @param {string} targetGamertag
 * @returns {boolean} 追加に成功した場合 true
 */
export function addSubOp(targetId, targetGamertag) {
  if (!targetId || isPrimaryOpId(targetId)) return false;
  const subOps = getSubOps();
  const existing = subOps.find((s) => s.id === targetId);
  if (existing) {
    existing.gamertag = targetGamertag;
    saveSubOps(subOps);
    return true;
  }
  subOps.push({
    id: String(targetId),
    gamertag: String(targetGamertag || "副管理者"),
    addedAt: Date.now(),
  });
  saveSubOps(subOps);
  return true;
}

/**
 * 副OPを解任・削除する（最高管理者のみ実行可能）
 * @param {string} targetId
 * @returns {boolean} 削除に成功した場合 true
 */
export function removeSubOp(targetId) {
  if (!targetId) return false;
  const subOps = getSubOps();
  const next = subOps.filter((s) => s.id !== targetId);
  if (next.length === subOps.length) {
    return false;
  }
  saveSubOps(next);
  return true;
}

/**
 * 指定プレイヤーまたは playerId が Kick / BAN 対象から保護されているか判定する
 * （最高管理者はいかなる場合も保護される）
 * @param {import("@minecraft/server").Player | string | null | undefined} playerOrId
 * @returns {boolean}
 */
export function isProtectedFromKick(playerOrId) {
  const id = typeof playerOrId === "string" ? playerOrId : playerOrId?.id;
  if (!id) return false;
  return isPrimaryOpId(id);
}
