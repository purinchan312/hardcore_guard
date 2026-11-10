/**
 * @file ui/audit_search.js
 * @description 監査ログ絞り込み検索画面（ModalFormData 検索フィルタ → ActionFormData 最大100項目結果表示）
 */

import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
import { getAllAuditLogs } from "../storage.js";
import { isOp } from "../permissions.js";
import {
  translateDimensionToJa,
  translateAuditCategoryToJa,
  formatAuditDetailToJa,
} from "../ja_dict.js";
import { showFormWithRetry } from "../terminal.js";
import { openMainMenu } from "./main_menu.js";

/** イベント種別フィルタ定義（完全日本語表記） */
const CATEGORY_FILTERS = Object.freeze([
  { label: "すべて", match: null },
  { label: "危険物入手", match: ["OBTAIN"] },
  { label: "危険物使用・設置", match: ["USE", "PLACE"] },
  { label: "ディスペンサー開操作", match: ["DISP_OPEN"] },
  { label: "コンテナ出し入れ差分", match: ["CONT_DIFF"] },
  { label: "死亡記録", match: ["DEATH"] },
  { label: "追放履歴", match: ["KICK"] },
]);

/**
 * タイムスタンプを MM/DD HH:mm:ss 形式に整形する
 * @param {number} ts
 * @returns {string}
 */
function formatShortTime(ts) {
  try {
    const d = new Date(Number(ts) || Date.now());
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    const ss = String(d.getSeconds()).padStart(2, "0");
    return `${mm}/${dd} ${hh}:${min}:${ss}`;
  } catch {
    return "--/-- --:--:--";
  }
}

/**
 * 監査ログ検索フィルタ入力画面（ModalFormData）を表示する
 * @param {import("@minecraft/server").Player} opPlayer
 */
export async function openAuditSearchMenu(opPlayer) {
  if (!opPlayer || !opPlayer.isValid() || !isOp(opPlayer)) return;

  const allLogs = getAllAuditLogs();

  // 記録内のユニークなプレイヤー一覧を抽出
  /** @type {string[]} */
  const playerOptions = ["全員（すべて）"];
  /** @type {Set<string>} */
  const seenPlayers = new Set();
  for (const log of allLogs) {
    if (log.pName && !seenPlayers.has(log.pName)) {
      seenPlayers.add(log.pName);
      playerOptions.push(log.pName);
    }
  }

  const categoryLabels = CATEGORY_FILTERS.map((c) => c.label);

  const loc = opPlayer.location || { x: 0, y: 0, z: 0 };
  const modal = new ModalFormData()
    .title("§b§l監査ログ絞り込み検索")
    .dropdown("対象プレイヤー選択", playerOptions, 0)
    .dropdown("イベント種別", categoryLabels, 0)
    .textField(
      `中心座標 東西位置（空欄時は全域 / 現在地: ${Math.floor(loc.x)}）`,
      "例: 120（空欄で全域）",
      ""
    )
    .textField(
      `中心座標 南北位置（空欄時は全域 / 現在地: ${Math.floor(loc.z)}）`,
      "例: -300（空欄で全域）",
      ""
    )
    .textField("検索半径ブロック数（空欄時は全域）", "例: 64（空欄で全域）", "");

  const res = await showFormWithRetry(opPlayer, modal);
  if (!res || res.canceled || !Array.isArray(res.formValues)) {
    await openMainMenu(opPlayer);
    return;
  }

  const playerIdx = Number(res.formValues[0]) || 0;
  const catIdx = Number(res.formValues[1]) || 0;
  const rawX = String(res.formValues[2] || "").trim();
  const rawZ = String(res.formValues[3] || "").trim();
  const rawR = String(res.formValues[4] || "").trim();

  const selectedPlayer = playerIdx > 0 ? playerOptions[playerIdx] : null;
  const selectedCatFilter = CATEGORY_FILTERS[catIdx]?.match || null;

  const hasCoordFilter = rawX !== "" && rawZ !== "" && rawR !== "";
  const centerX = hasCoordFilter ? Number(rawX) : 0;
  const centerZ = hasCoordFilter ? Number(rawZ) : 0;
  const radius = hasCoordFilter ? Number(rawR) : 0;
  const validCoordFilter =
    hasCoordFilter &&
    !Number.isNaN(centerX) &&
    !Number.isNaN(centerZ) &&
    !Number.isNaN(radius) &&
    radius >= 0;
  const radiusSq = validCoordFilter ? radius * radius : 0;

  // 条件でフィルタリング（allLogs は既に seq 降順）
  /** @type {import("../storage.js").AuditLogEntry[]} */
  const matched = [];
  for (const entry of allLogs) {
    if (selectedPlayer && entry.pName !== selectedPlayer) {
      continue;
    }
    if (selectedCatFilter && !selectedCatFilter.includes(entry.cat)) {
      continue;
    }
    if (validCoordFilter) {
      const dx = entry.x - centerX;
      const dz = entry.z - centerZ;
      if (dx * dx + dz * dz > radiusSq) {
        continue;
      }
    }
    matched.push(entry);
    if (matched.length >= 100) {
      break;
    }
  }

  await openAuditSearchResults(opPlayer, matched, allLogs.length, {
    playerLabel: selectedPlayer || "全員",
    catLabel: CATEGORY_FILTERS[catIdx]?.label || "すべて",
    coordLabel: validCoordFilter ? `(${centerX}, ${centerZ}) 半径${radius}ブロック` : "全域",
  });
}

/**
 * 監査ログ検索結果画面（ActionFormData - 新しい順最大100項目）を表示する
 * @param {import("@minecraft/server").Player} opPlayer
 * @param {import("../storage.js").AuditLogEntry[]} results
 * @param {number} totalStored
 * @param {{ playerLabel: string, catLabel: string, coordLabel: string }} filterSummary
 */
async function openAuditSearchResults(opPlayer, results, totalStored, filterSummary) {
  if (!opPlayer || !opPlayer.isValid() || !isOp(opPlayer)) return;

  const lines = results.map((r) => {
    const catColor =
      r.cat === "OBTAIN"
        ? "§6"
        : r.cat === "USE" || r.cat === "PLACE"
        ? "§c"
        : r.cat === "DISP_OPEN" || r.cat === "CONT_DIFF"
        ? "§d"
        : r.cat === "DEATH"
        ? "§4"
        : "§e";
    const catJa = translateAuditCategoryToJa(r.cat);
    const dimJa = translateDimensionToJa(r.dim);
    const detailJa = formatAuditDetailToJa(r.detail);
    return (
      `§7第${r.seq}番 [${formatShortTime(r.ts)}] ${catColor}[${catJa}] ` +
      `§b${r.pName}§7(${r.pId}) §e${dimJa}(${r.x},${r.y},${r.z}) §f${detailJa}`
    );
  });

  // 「件」のフォント重なり回避のため「検索フィルタ」「項目」を使用
  const bodyHeader =
    `§7検索フィルタ: 対象=${filterSummary.playerLabel} | 種別=${filterSummary.catLabel} | 範囲=${filterSummary.coordLabel}\n` +
    `§7表示結果: §e${results.length}項目 §7(最大100項目 / 保存総数:${totalStored}項目)\n` +
    `§8----------------------------------------\n`;

  const bodyContent =
    lines.length > 0 ? lines.join("\n") : "§7該当する監査ログはありませんでした。";

  const form = new ActionFormData()
    .title("§b§l監査ログ検索結果")
    .body(bodyHeader + bodyContent)
    .button("§b再検索（絞り込みを変更する）", "textures/items/compass_item")
    .button("§7≪ メインメニューへ戻る");

  const res = await showFormWithRetry(opPlayer, form);
  if (!res || res.canceled || res.selection === undefined) return;

  if (res.selection === 0) {
    await openAuditSearchMenu(opPlayer);
  } else {
    await openMainMenu(opPlayer);
  }
}
