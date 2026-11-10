/**
 * @file ui/emergency_kick.js
 * @description 緊急一括追放画面 (ModalFormData - スイッチ一括型)
 */

import { world } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { getDimShortName } from "../config.js";
import { isOp, isProtectedFromKick } from "../permissions.js";
import { getPlayerTier1Summary } from "../monitor.js";
import { executeOpKickPlayer } from "../ban_death.js";
import { showFormWithRetry } from "../terminal.js";

/**
 * 緊急一括追放画面を表示する（スニーク使用時はここへ直行）
 * @param {import("@minecraft/server").Player} opPlayer
 */
export async function openEmergencyKickMenu(opPlayer) {
  if (!opPlayer || !opPlayer.isValid() || !isOp(opPlayer)) return;

  /**
   * @type {Array<{
   *   player: import("@minecraft/server").Player,
   *   gamertag: string,
   *   playerId: string,
   *   dimJa: string,
   *   x: number,
   *   y: number,
   *   z: number,
   *   totalTier1: number
   * }>}
   */
  const targetEntries = [];

  for (const p of world.getAllPlayers()) {
    if (!p || !p.isValid()) continue;
    // 最高管理者は除外
    if (isProtectedFromKick(p)) continue;

    const { totalTier1 } = getPlayerTier1Summary(p);
    const loc = p.location || { x: 0, y: 0, z: 0 };
    targetEntries.push({
      player: p,
      gamertag: p.name,
      playerId: p.id,
      dimJa: getDimShortName(p.dimension?.id || "overworld"),
      x: Math.floor(loc.x),
      y: Math.floor(loc.y),
      z: Math.floor(loc.z),
      totalTier1,
    });
  }

  // 最優先危険物所持者を最上段へソート
  targetEntries.sort((a, b) => b.totalTier1 - a.totalTier1);

  const form = new ModalFormData().title("§c§l緊急一括追放");

  // 要素 0: 永久追放切替トグル
  form.toggle("§c永久追放として登録する（再接続時も自動追放）", false);

  if (targetEntries.length === 0) {
    form.toggle("§7現在追放対象のオンラインプレイヤーはいません", false);
  } else {
    // 要素 1 以降: 最高管理者を除く全オンラインプレイヤー
    for (const entry of targetEntries) {
      const prefix = entry.totalTier1 > 0 ? "§c[危険物所持] §f" : "";
      const label = `${prefix}${entry.gamertag} | 識別番号:${entry.playerId}\n${entry.dimJa} (${entry.x}, ${entry.y}, ${entry.z})`;
      form.toggle(label, false);
    }
  }

  const res = await showFormWithRetry(opPlayer, form);
  if (!res || res.canceled || !Array.isArray(res.formValues)) return;

  if (targetEntries.length === 0) {
    opPlayer.sendMessage("§e[荒らし対策] 追放対象のプレイヤーがいません。");
    return;
  }

  const isPermanent = Boolean(res.formValues[0]);
  let kickedCount = 0;

  for (let i = 0; i < targetEntries.length; i++) {
    const shouldKick = Boolean(res.formValues[i + 1]);
    if (!shouldKick) continue;

    const target = targetEntries[i];
    if (executeOpKickPlayer(target.player, isPermanent, opPlayer.name)) {
      kickedCount++;
    }
  }

  if (kickedCount > 0) {
    const modeLabel = isPermanent ? "§c永久追放" : "§e単発追放";
    opPlayer.sendMessage(
      `§a[荒らし対策] ${modeLabel} §fを §b${kickedCount}名 §fに対して実行しました。`
    );
  } else {
    opPlayer.sendMessage("§7[荒らし対策] 対象が選択されなかったため追放を中止しました。");
  }
}
