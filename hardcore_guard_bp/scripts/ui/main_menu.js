/**
 * @file ui/main_menu.js
 * @description 管理者メインメニューおよび最高管理者専用の副管理者（協力者）管理画面
 */

import { world } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import { GLYPHS } from "../config.js";
import { getSubOps, getActiveDeathCount, getBans } from "../storage.js";
import {
  isOp,
  isPrimaryOp,
  addSubOp,
  removeSubOp,
} from "../permissions.js";
import { getOnlineDangerHolderCount } from "../monitor.js";
import { showFormWithRetry, syncAllPlayersOpTerminals } from "../terminal.js";
import { openEmergencyKickMenu } from "./emergency_kick.js";
import { openPlayerInspectList } from "./player_inspect.js";
import { openBanManageMenu } from "./ban_manage.js";
import { openAuditSearchMenu } from "./audit_search.js";
import { openDeathListMenu } from "./death_list.js";

/**
 * 管理者メインメニューを表示する
 * @param {import("@minecraft/server").Player} player
 */
export async function openMainMenu(player) {
  if (!player || !player.isValid() || !isOp(player)) return;

  const dangerHolders = getOnlineDangerHolderCount();
  const activeDeaths = getActiveDeathCount();
  const bans = getBans();
  const permBanCount = bans.filter((b) => b.permanent).length;
  const primary = isPrimaryOp(player);

  const form = new ActionFormData()
    .title("§b§l管理者端末 メインメニュー")
    .body(
      `§7権限: ${primary ? "§6最高管理者" : "§b副管理者（協力者）"}\n` +
        `§f現在の危険物所持者: ${dangerHolders > 0 ? `§c§l${dangerHolders}名` : "§a0名"} §7| ` +
        `${GLYPHS.SKULL} 死者: §e${activeDeaths}名 §7| 永久追放: §c${permBanCount}名`
    )
    .button("§c§l緊急一括追放", "textures/items/flint_and_steel")
    .button(`参加者一覧・持ち物検査 (${dangerHolders}名)`, "textures/items/book_normal")
    .button("追放済み一覧・永久追放引き継ぎ", "textures/blocks/barrier")
    .button("監査ログ検索", "textures/items/compass_item")
    .button("戦没者一覧（ドクロ数管理）", "textures/items/skull_wither");

  if (primary) {
    form.button("副管理者（協力者）管理", "textures/items/op_terminal");
  }

  const res = await showFormWithRetry(player, form);
  if (!res || res.canceled || res.selection === undefined) return;

  switch (res.selection) {
    case 0:
      await openEmergencyKickMenu(player);
      break;
    case 1:
      await openPlayerInspectList(player);
      break;
    case 2:
      await openBanManageMenu(player);
      break;
    case 3:
      await openAuditSearchMenu(player);
      break;
    case 4:
      await openDeathListMenu(player);
      break;
    case 5:
      if (primary) {
        await openSubOpManageMenu(player);
      }
      break;
  }
}

/**
 * 副管理者（協力者）管理画面を表示する（※最高管理者限定）
 * @param {import("@minecraft/server").Player} player
 */
async function openSubOpManageMenu(player) {
  if (!player || !player.isValid() || !isPrimaryOp(player)) {
    return;
  }

  const subOps = getSubOps();
  const subOpIds = new Set(subOps.map((s) => s.id));

  // 現在オンラインで最高管理者でも副管理者でもないプレイヤー候補
  const onlineCandidates = [];
  for (const p of world.getAllPlayers()) {
    if (!p || !p.isValid()) continue;
    if (p.id === player.id || subOpIds.has(p.id)) continue;
    onlineCandidates.push(p);
  }

  const form = new ActionFormData()
    .title("§6§l副管理者（協力者）管理")
    .body(
      `§7現在の副管理者登録数: §e${subOps.length}名\n` +
        `§fオンラインの参加者を副管理者に任命すると 管理者端末 が自動配布されます。\n` +
        `解任するとインベントリから端末が自動回収されます。`
    );

  /** @type {Array<{ type: "add" | "remove" | "back", id?: string, name?: string }>} */
  const actions = [];

  for (const cand of onlineCandidates) {
    form.button(`§a[副管理者に任命] §f${cand.name}\n§7識別番号: ${cand.id}`);
    actions.push({ type: "add", id: cand.id, name: cand.name });
  }

  for (const sub of subOps) {
    form.button(`§c[副管理者を解任] §f${sub.gamertag}\n§7識別番号: ${sub.id}`);
    actions.push({ type: "remove", id: sub.id, name: sub.gamertag });
  }

  form.button("§7≪ メインメニューへ戻る");
  actions.push({ type: "back" });

  const res = await showFormWithRetry(player, form);
  if (!res || res.canceled || res.selection === undefined) return;

  const chosen = actions[res.selection];
  if (!chosen || chosen.type === "back") {
    await openMainMenu(player);
    return;
  }

  if (chosen.type === "add" && chosen.id && chosen.name) {
    addSubOp(chosen.id, chosen.name);
    syncAllPlayersOpTerminals();
    player.sendMessage(`§a[荒らし対策] §b${chosen.name} §aを副管理者に任命しました。`);
  } else if (chosen.type === "remove" && chosen.id) {
    removeSubOp(chosen.id);
    syncAllPlayersOpTerminals();
    player.sendMessage(`§e[荒らし対策] §b${chosen.name} §eの副管理者権限を解任しました。`);
  }

  await openSubOpManageMenu(player);
}
