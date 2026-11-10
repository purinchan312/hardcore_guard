/**
 * @file sidebar.js
 * @description 右上サイドバー常時表示（ドクロ累計死者数ヘッダ + Tier1危険物合計所持数）制御
 */

import {
  world,
  DisplaySlotId,
  ObjectiveSortOrder,
} from "@minecraft/server";
import {
  SCOREBOARD_OBJECTIVE_ID,
  GLYPHS,
  SIDEBAR_ROWS,
} from "./config.js";
import { getActiveDeathCount } from "./storage.js";

/** 前回反映した有効死者数（初期値 -1 で初回必ず生成） */
let lastDeathCount = -1;

/**
 * 前回反映した各 Tier 1 アイテム合計スコア
 * @type {Record<string, number>}
 */
const lastItemScores = {};

/**
 * サイドバー Objective を取得または再生成し、死者数ヘッダと各行スコアを最新化する
 * @param {Record<string, number>} [tier1Totals] オンライン生存プレイヤーの Tier 1 合計所持数マップ
 * @param {boolean} [forceRecreate=false] 強制的に Objective を再生成するか
 */
export function syncSidebar(tier1Totals, forceRecreate = false) {
  try {
    const scoreboard = world.scoreboard;
    if (!scoreboard) return;

    const currentDeathCount = getActiveDeathCount();
    const expectedHeader = `${GLYPHS.SKULL} 死者 : ${currentDeathCount}`;

    let objective = scoreboard.getObjective(SCOREBOARD_OBJECTIVE_ID);
    const deathCountChanged = currentDeathCount !== lastDeathCount;

    let recreated = false;
    if (!objective || deathCountChanged || forceRecreate) {
      if (objective) {
        try {
          scoreboard.removeObjective(SCOREBOARD_OBJECTIVE_ID);
        } catch {
          // ignore
        }
      }
      objective = scoreboard.addObjective(SCOREBOARD_OBJECTIVE_ID, expectedHeader);
      scoreboard.setObjectiveAtDisplaySlot(DisplaySlotId.Sidebar, {
        objective,
        sortOrder: ObjectiveSortOrder.Descending,
      });
      lastDeathCount = currentDeathCount;
      recreated = true;
    }

    // 最新の Tier 1 合計値が渡された場合はキャッシュを更新
    if (tier1Totals) {
      for (const row of SIDEBAR_ROWS) {
        const nextVal = Number(tier1Totals[row.typeId]) || 0;
        const prevVal = lastItemScores[row.typeId];
        if (recreated || prevVal !== nextVal) {
          objective.setScore(row.label, nextVal);
          lastItemScores[row.typeId] = nextVal;
        }
      }
    } else if (recreated) {
      // 死者数のみ更新された場合はキャッシュ済みのアイテム数を再セット
      for (const row of SIDEBAR_ROWS) {
        const val = Number(lastItemScores[row.typeId]) || 0;
        objective.setScore(row.label, val);
      }
    }
  } catch {
    // ワールド初期化完了前などの例外を安全に無視
  }
}

/**
 * 死亡発生時や戦没者除外切替時にドクロ死者数ヘッダを即時更新する
 */
export function refreshSidebarDeathHeader() {
  syncSidebar(undefined, false);
}
