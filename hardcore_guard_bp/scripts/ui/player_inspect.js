/**
 * @file ui/player_inspect.js
 * @description 参加者一覧・インベントリ持ち物検査画面（ActionFormData 2階層 + 1クリック即追放/永久追放）
 */

import { world } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import {
  getDimShortName,
  getItemIconPath,
  getItemJaName,
} from "../config.js";
import { isOp, isProtectedFromKick } from "../permissions.js";
import {
  getPlayerTier1Summary,
  getPlayerInspectedItems,
} from "../monitor.js";
import { executeOpKickPlayer } from "../ban_death.js";
import { showFormWithRetry } from "../terminal.js";
import { openMainMenu } from "./main_menu.js";

/**
 * 参加者一覧画面（第1階層）を表示する
 * @param {import("@minecraft/server").Player} opPlayer
 */
export async function openPlayerInspectList(opPlayer) {
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
  const entries = [];

  for (const p of world.getAllPlayers()) {
    if (!p || !p.isValid()) continue;
    const { totalTier1 } = getPlayerTier1Summary(p);
    const loc = p.location || { x: 0, y: 0, z: 0 };
    entries.push({
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

  // 危険物所持者を最上段にソート
  entries.sort((a, b) => b.totalTier1 - a.totalTier1);

  const form = new ActionFormData()
    .title("§b§l参加者一覧・持ち物検査")
    .body(`§7現在参加中の人数: §e${entries.length}名\n§f持ち物を検査するプレイヤーを選択してください。`);

  for (const e of entries) {
    const dangerTag = e.totalTier1 > 0 ? `§c[危険物:${e.totalTier1}個] ` : "§a[安全] ";
    const label = `${dangerTag}§f${e.gamertag} §7(識別番号:${e.playerId})\n§e${e.dimJa} (${e.x}, ${e.y}, ${e.z})`;
    const icon = e.totalTier1 > 0 ? "textures/items/bucket_lava" : "textures/items/book_normal";
    form.button(label, icon);
  }

  form.button("§7≪ メインメニューへ戻る");

  const res = await showFormWithRetry(opPlayer, form);
  if (!res || res.canceled || res.selection === undefined) return;

  if (res.selection === entries.length) {
    await openMainMenu(opPlayer);
    return;
  }

  const selected = entries[res.selection];
  if (selected) {
    await openPlayerDetailInspect(opPlayer, selected.playerId);
  }
}

/**
 * 個別プレイヤー持ち物検査・即追放画面（第2階層）を表示する
 * @param {import("@minecraft/server").Player} opPlayer
 * @param {string} targetPlayerId
 */
async function openPlayerDetailInspect(opPlayer, targetPlayerId) {
  if (!opPlayer || !opPlayer.isValid() || !isOp(opPlayer)) return;

  const targetPlayer = world.getAllPlayers().find((p) => p && p.isValid() && p.id === targetPlayerId);
  if (!targetPlayer) {
    opPlayer.sendMessage("§e[荒らし対策] 対象プレイヤーは既に退室しています。");
    await openPlayerInspectList(opPlayer);
    return;
  }

  const loc = targetPlayer.location || { x: 0, y: 0, z: 0 };
  const dimJa = getDimShortName(targetPlayer.dimension?.id || "overworld");
  const { totalTier1 } = getPlayerTier1Summary(targetPlayer);
  const items = getPlayerInspectedItems(targetPlayer);
  const protectedTarget = isProtectedFromKick(targetPlayer);

  const form = new ActionFormData()
    .title(`§b持ち物検査: ${targetPlayer.name}`)
    .body(
      `§f対象: §b${targetPlayer.name} §7(識別番号: ${targetPlayer.id})\n` +
        `§f座標: §e${dimJa} (${Math.floor(loc.x)}, ${Math.floor(loc.y)}, ${Math.floor(loc.z)})\n` +
        `§f危険物合計: ${totalTier1 > 0 ? `§c§l${totalTier1}個` : "§a0個"} §7| 所持アイテム種類: §e${items.length}種`
    );

  /** @type {Array<"single_kick" | "perm_ban" | "item" | "refresh" | "back">} */
  const buttonActions = [];

  // 最上段に1クリック追放ボタンを配置（最高管理者は保護のため除外）
  if (!protectedTarget) {
    form.button("§e[このプレイヤーを単発追放]", "textures/items/flint_and_steel");
    buttonActions.push("single_kick");

    form.button("§c[このプレイヤーを永久追放]", "textures/blocks/barrier");
    buttonActions.push("perm_ban");
  }

  // 所持アイテム一覧（すべて完全日本語名で表示）
  if (items.length === 0) {
    form.button("§7(所持品なし)", "textures/items/book_normal");
    buttonActions.push("item");
  } else {
    for (const entry of items) {
      const jaName = getItemJaName(entry.typeId);
      const tierPrefix =
        entry.tier === 1
          ? "§c[最優先危険物] §f"
          : entry.tier === 2
          ? "§6[警戒対象物] §f"
          : "§f";
      const subCategory =
        entry.tier === 1
          ? "§c所持・使用・設置を厳重監視中"
          : entry.tier === 2
          ? "§6使用・設置を監視中"
          : "§7通常アイテム";
      const label = `${tierPrefix}${jaName} §e×${entry.amount}\n${subCategory}`;
      const iconPath = getItemIconPath(entry.typeId);
      form.button(label, iconPath);
      buttonActions.push("item");
    }
  }

  form.button("§b[最新の所持状態に再読込]", "textures/items/compass_item");
  buttonActions.push("refresh");

  form.button("§7≪ 参加者一覧へ戻る");
  buttonActions.push("back");

  const res = await showFormWithRetry(opPlayer, form);
  if (!res || res.canceled || res.selection === undefined) return;

  const chosenAction = buttonActions[res.selection];
  if (chosenAction === "single_kick") {
    if (executeOpKickPlayer(targetPlayer, false, opPlayer.name)) {
      opPlayer.sendMessage(
        `§a[荒らし対策] §b${targetPlayer.name} §eに対して単発追放を実行しました。`
      );
    }
    return;
  }

  if (chosenAction === "perm_ban") {
    if (executeOpKickPlayer(targetPlayer, true, opPlayer.name)) {
      opPlayer.sendMessage(
        `§a[荒らし対策] §b${targetPlayer.name} §cを永久追放リストに登録し追放を実行しました。`
      );
    }
    return;
  }

  if (chosenAction === "back") {
    await openPlayerInspectList(opPlayer);
    return;
  }

  // アイテムボタン押下時または再読込時は詳細画面を再表示
  await openPlayerDetailInspect(opPlayer, targetPlayerId);
}
