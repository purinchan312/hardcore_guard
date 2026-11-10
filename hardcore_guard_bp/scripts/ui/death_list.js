/**
 * @file ui/death_list.js
 * @description 戦没者一覧・ドクロ死者数カウント除外切替画面（ActionFormData）
 */

import { ActionFormData } from "@minecraft/server-ui";
import { GLYPHS } from "../config.js";
import {
  getDeaths,
  getActiveDeathCount,
  toggleDeathExclusion,
} from "../storage.js";
import { isOp, isPrimaryOp } from "../permissions.js";
import { translateDimensionToJa, translateDeathCauseToJa } from "../ja_dict.js";
import { refreshSidebarDeathHeader } from "../sidebar.js";
import { showFormWithRetry } from "../terminal.js";
import { openMainMenu } from "./main_menu.js";

/**
 * タイムスタンプを YYYY-MM-DD HH:mm 形式に整形する
 * @param {number} ts
 * @returns {string}
 */
function formatDateTime(ts) {
  try {
    const d = new Date(Number(ts) || Date.now());
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
  } catch {
    return "日時不明";
  }
}

/**
 * 戦没者一覧画面を表示する
 * @param {import("@minecraft/server").Player} opPlayer
 */
export async function openDeathListMenu(opPlayer) {
  if (!opPlayer || !opPlayer.isValid() || !isOp(opPlayer)) return;

  const deaths = getDeaths();
  const activeCount = getActiveDeathCount();
  const primary = isPrimaryOp(opPlayer);

  // 新しい順で一覧表示
  const orderedDeaths = [...deaths].reverse();

  const form = new ActionFormData()
    .title(`${GLYPHS.SKULL} §l戦没者一覧（ドクロ数管理）`)
    .body(
      `§f現在のドクロ死者数: §c§l${activeCount}名 §7(全記録: ${deaths.length}名)\n` +
        `${
          primary
            ? "§e項目を選択するとドクロ数への「カウント対象 / 除外」を即座に切り替えられます。"
            : "§7※カウント除外設定の変更は最高管理者のみ操作可能です。"
        }`
    );

  for (const d of orderedDeaths) {
    const statusBadge = d.excluded ? "§8[除外中]" : `§c[${GLYPHS.SKULL} カウント対象]`;
    const dimJa = translateDimensionToJa(d.dim);
    const causeJa = translateDeathCauseToJa(d.cause);
    const label =
      `${statusBadge} §f${d.gamertag} §7(識別番号:${d.playerId})\n` +
      `§e${dimJa} (${d.x}, ${d.y}, ${d.z}) §7| 死因:${causeJa} | ${formatDateTime(d.ts)}`;
    const icon = d.excluded
      ? "textures/items/book_normal"
      : "textures/items/skull_wither";
    form.button(label, icon);
  }

  form.button("§7≪ メインメニューへ戻る");

  const res = await showFormWithRetry(opPlayer, form);
  if (!res || res.canceled || res.selection === undefined) return;

  if (res.selection === orderedDeaths.length) {
    await openMainMenu(opPlayer);
    return;
  }

  const target = orderedDeaths[res.selection];
  if (!target) return;

  if (!primary) {
    opPlayer.sendMessage(
      "§c[荒らし対策] 戦没者カウント除外の切り替えは最高管理者のみ実行可能です。"
    );
    await openDeathListMenu(opPlayer);
    return;
  }

  const updated = toggleDeathExclusion(target.playerId);
  if (updated) {
    // 即座に右上サイドバーのドクロ数へ反映
    refreshSidebarDeathHeader();
    const stateStr = updated.excluded
      ? "§8除外（ドクロ数にカウントしない）"
      : "§aカウント対象（ドクロ数に含める）";
    opPlayer.sendMessage(
      `§a[荒らし対策] §b${updated.gamertag} §fの死亡記録を ${stateStr} §fに切り替えました。`
    );
  }

  await openDeathListMenu(opPlayer);
}
