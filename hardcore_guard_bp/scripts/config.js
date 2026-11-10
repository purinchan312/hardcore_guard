/**
 * @file config.js
 * @description 監視対象アイテム定義・定数・カスタムフォントグリフ・アイコンテクスチャ対応表
 */

import { translateItemIdToJa, translateDimensionToJa } from "./ja_dict.js";

/** 管理者専用端末のカスタムアイテムID */
export const OP_TERMINAL_ITEM_ID = "hc_guard:op_terminal";

/** スコアボード Objective ID */
export const SCOREBOARD_OBJECTIVE_ID = "hc_status";

/** DynamicProperties 1スロットあたりの最大 UTF-8 バイト数（上限 32,767 に対する安全マージン） */
export const MAX_SLOT_BYTES = 28000;

/** DynamicProperties キー定義 */
export const STORAGE_KEYS = Object.freeze({
  PRIMARY_OP: "hc:primary_op",
  SUB_OPS: "hc:sub_ops",
  DEATHS: "hc:deaths",
  DEATHS_PREFIX: "hc:deaths_",
  DEATH_SLOT_COUNT: 4,
  BANS_META: "hc:bans_meta",
  BANS_PREFIX: "hc:bans_",
  BAN_SLOT_COUNT: 5,
  AUDIT_META: "hc:audit_meta",
  AUDIT_PREFIX: "hc:audit_",
  AUDIT_SLOT_COUNT: 15,
});

/** カスタムフォント glyph_E1.png (U+E100 - U+E106) 定義 */
export const GLYPHS = Object.freeze({
  SKULL: "\uE100",
  LAVA_BUCKET: "\uE101",
  TNT: "\uE102",
  TNT_MINECART: "\uE103",
  END_CRYSTAL: "\uE104",
  RESPAWN_ANCHOR: "\uE105",
  WARNING: "\uE106",
});

/** 最優先危険物 Tier 1（所持増加・使用・設置を監視、サイドバー常時集計対象） */
export const TIER1_ITEMS = Object.freeze([
  "minecraft:lava_bucket",
  "minecraft:tnt",
  "minecraft:tnt_minecart",
  "minecraft:end_crystal",
  "minecraft:respawn_anchor",
]);

/** Tier 1 高速判定用 Set */
export const TIER1_SET = new Set(TIER1_ITEMS);

/** 警戒物 Tier 2（使用・設置を監視、ディスペンサーは開閉も記録） */
export const TIER2_ITEMS = Object.freeze([
  "minecraft:dispenser",
  "minecraft:flint_and_steel",
  "minecraft:fire_charge",
  "minecraft:powder_snow_bucket",
  "minecraft:wither_skeleton_skull",
]);

/** Tier 2 高速判定用 Set */
export const TIER2_SET = new Set(TIER2_ITEMS);

/** サイドバー表示用の行定義（Fake Player 名と対象アイテムID） */
export const SIDEBAR_ROWS = Object.freeze([
  { typeId: "minecraft:lava_bucket", label: `${GLYPHS.LAVA_BUCKET} マグマ` },
  { typeId: "minecraft:tnt", label: `${GLYPHS.TNT} 火薬箱` },
  { typeId: "minecraft:tnt_minecart", label: `${GLYPHS.TNT_MINECART} 火薬車` },
  { typeId: "minecraft:end_crystal", label: `${GLYPHS.END_CRYSTAL} 結晶` },
  { typeId: "minecraft:respawn_anchor", label: `${GLYPHS.RESPAWN_ANCHOR} アンカー` },
]);

/** インベントリ検査UI用 テクスチャパス対応表（3.4節準拠） */
export const ITEM_ICON_MAP = Object.freeze({
  "minecraft:lava_bucket": "textures/items/bucket_lava",
  "minecraft:tnt": "textures/blocks/tnt_side",
  "minecraft:tnt_minecart": "textures/items/minecart_tnt",
  "minecraft:end_crystal": "textures/items/end_crystal",
  "minecraft:respawn_anchor": "textures/blocks/respawn_anchor_top",
  "minecraft:dispenser": "textures/blocks/dispenser_front_horizontal",
  "minecraft:flint_and_steel": "textures/items/flint_and_steel",
  "minecraft:fire_charge": "textures/items/fireball",
  "minecraft:powder_snow_bucket": "textures/items/bucket_powder_snow",
  "minecraft:wither_skeleton_skull": "textures/items/skull_wither",
  "hc_guard:op_terminal": "textures/items/op_terminal",
});

/** 未登録一般アイテムのフォールバックアイコンパス */
export const FALLBACK_ITEM_ICON = "textures/items/book_normal";

/**
 * アイテムIDに対応するUIアイコンのRPテクスチャパスを返す
 * @param {string} typeId
 * @returns {string}
 */
export function getItemIconPath(typeId) {
  return ITEM_ICON_MAP[typeId] || FALLBACK_ITEM_ICON;
}

/**
 * アイテムIDに対応する日本語名称を返す（全バニラアイテム完全日本語対応）
 * @param {string} typeId
 * @returns {string}
 */
export function getItemJaName(typeId) {
  return translateItemIdToJa(typeId);
}

/**
 * ディメンションIDを日本語表記（オーバーワールド / ネザー / ジ・エンド）に変換する
 * @param {string} dimensionId
 * @returns {string}
 */
export function getDimShortName(dimensionId) {
  return translateDimensionToJa(dimensionId);
}
