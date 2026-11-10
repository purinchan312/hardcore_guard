/**
 * @file ui/ban_manage.js
 * @description 追放済み一覧・永久追放解除・ワールド跨ぎ追放リストのコピペ入出力画面
 */

import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
import { getBans, saveBans } from "../storage.js";
import { isOp, isPrimaryOp, isProtectedFromKick } from "../permissions.js";
import { checkOnlinePlayersForPermanentBans } from "../ban_death.js";
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
 * 追放済みリストをセミコロン区切り文字列 (名前:識別番号;名前:識別番号) にシリアライズする
 * @param {import("../storage.js").BanRecord[]} bans
 * @returns {string}
 */
export function buildBanExportString(bans) {
  if (!Array.isArray(bans) || bans.length === 0) {
    return "";
  }
  return bans
    .map((b) => {
      const idPart = b.playerId || b.legacyId || "未確定";
      return `${b.gamertag}:${idPart}`;
    })
    .join(";");
}

/**
 * 貼り付けられた追放リスト文字列をパースし、未登録の名前を永久追放としてマージする
 * @param {string} rawInput
 * @param {string} operatorName
 * @returns {number} 新規または永久追放へ昇格された人数
 */
export function importBanListFromText(rawInput, operatorName) {
  if (typeof rawInput !== "string" || rawInput.trim().length === 0) {
    return 0;
  }

  const bans = getBans();
  const tokens = rawInput
    .split(/[;,\r\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  let mergedCount = 0;

  for (const token of tokens) {
    const colonIdx = token.lastIndexOf(":");
    let gamertag = "";
    /** @type {string | null} */
    let parsedLegacyId = null;

    if (colonIdx > 0) {
      gamertag = token.slice(0, colonIdx).trim();
      const rawId = token.slice(colonIdx + 1).trim();
      parsedLegacyId = rawId && rawId !== "NONE" && rawId !== "未確定" ? rawId : null;
    } else {
      gamertag = token.trim();
    }

    if (!gamertag) continue;

    // 最高管理者の識別番号と一致する場合は引き継ぎ除外
    if (parsedLegacyId && isProtectedFromKick(parsedLegacyId)) {
      continue;
    }

    const lowerTag = gamertag.toLowerCase();
    const existing = bans.find((b) => b.gamertag.toLowerCase() === lowerTag);

    if (existing) {
      if (!existing.permanent) {
        existing.permanent = true;
        existing.by = operatorName || existing.by;
        existing.ts = Date.now();
        mergedCount++;
      }
      if (!existing.legacyId && parsedLegacyId) {
        existing.legacyId = parsedLegacyId;
      }
    } else {
      bans.push({
        gamertag,
        playerId: null,
        legacyId: parsedLegacyId,
        permanent: true,
        by: operatorName || "引き継ぎ登録",
        ts: Date.now(),
      });
      mergedCount++;
    }
  }

  if (mergedCount > 0) {
    saveBans(bans);
    // 現在オンラインの該当者がいれば即座に識別番号紐付け + 追放を実行
    checkOnlinePlayersForPermanentBans();
  }

  return mergedCount;
}

/**
 * 追放済み一覧・永久追放引き継ぎメイン画面を表示する
 * @param {import("@minecraft/server").Player} opPlayer
 */
export async function openBanManageMenu(opPlayer) {
  if (!opPlayer || !opPlayer.isValid() || !isOp(opPlayer)) return;

  const bans = getBans();
  const primary = isPrimaryOp(opPlayer);
  const permCount = bans.filter((b) => b.permanent).length;

  const form = new ActionFormData()
    .title("§b§l追放済み一覧・永久追放引き継ぎ")
    .body(
      `§7記録総数: §e${bans.length}名 §7(うち永久追放: §c${permCount}名§7)\n` +
        `${
          primary
            ? "§f対象を選択すると永久追放の切替や解除（削除）が行えます。"
            : "§7※永久追放の解除およびリスト取り込みは最高管理者のみ操作可能です。"
        }`
    );

  // ボタン 0: コピー出力＆貼り付け取り込み画面
  form.button(
    "§b[リストのコピー出力 / 貼り付け取り込み]",
    "textures/items/book_normal"
  );

  // 新しい順に表示するためインデックス付きで逆順化
  const indexedBans = bans.map((record, index) => ({ record, index })).reverse();

  for (const { record } of indexedBans) {
    const statusBadge = record.permanent ? "§c[永久追放]" : "§e[単発追放]";
    const idText = record.playerId
      ? `識別番号:${record.playerId}`
      : `旧番号:${record.legacyId || "なし"} (未紐付)`;
    const label =
      `${statusBadge} §f${record.gamertag} §7(${idText})\n` +
      `§7実行者:${record.by} | ${formatDateTime(record.ts)}`;
    form.button(label, record.permanent ? "textures/blocks/barrier" : "textures/items/flint_and_steel");
  }

  form.button("§7≪ メインメニューへ戻る");

  const res = await showFormWithRetry(opPlayer, form);
  if (!res || res.canceled || res.selection === undefined) return;

  if (res.selection === 0) {
    await openBanCopyImportModal(opPlayer);
    return;
  }

  if (res.selection === indexedBans.length + 1) {
    await openMainMenu(opPlayer);
    return;
  }

  const chosenItem = indexedBans[res.selection - 1];
  if (!chosenItem) return;

  if (!primary) {
    opPlayer.sendMessage("§c[荒らし対策] 永久追放の編集・解除は最高管理者のみ実行可能です。");
    await openBanManageMenu(opPlayer);
    return;
  }

  await openBanRecordEditMenu(opPlayer, chosenItem.index);
}

/**
 * コピー出力＆貼り付け取り込み画面（ModalFormData）を表示する（6.2.4節準拠）
 * @param {import("@minecraft/server").Player} opPlayer
 */
async function openBanCopyImportModal(opPlayer) {
  if (!opPlayer || !opPlayer.isValid() || !isOp(opPlayer)) return;

  const bans = getBans();
  const exportStr = buildBanExportString(bans);
  const primary = isPrimaryOp(opPlayer);

  const modal = new ModalFormData().title("§b§l追放リスト コピー出力＆取り込み");

  // 要素 0: コピー用 textField（初期値に出力文字列をセット）
  modal.textField(
    "追放済みリスト出力（全選択してコピーしてください）",
    "プレイヤー名:識別番号;プレイヤー名:識別番号",
    exportStr
  );

  // 要素 1: 取り込み用 textField（最高管理者のみ有効）
  modal.textField(
    primary
      ? "追放リスト貼り付け取り込み（貼り付けて送信）"
      : "追放リスト貼り付け取り込み（※最高管理者のみ有効）",
    "プレイヤー名:識別番号;プレイヤー名:識別番号",
    ""
  );

  const res = await showFormWithRetry(opPlayer, modal);
  if (!res || res.canceled || !Array.isArray(res.formValues)) {
    await openBanManageMenu(opPlayer);
    return;
  }

  const importText = String(res.formValues[1] || "").trim();
  if (importText.length > 0) {
    if (!primary) {
      opPlayer.sendMessage("§c[荒らし対策] 追放リストの取り込みは最高管理者のみ実行可能です。");
    } else {
      const added = importBanListFromText(importText, opPlayer.name);
      opPlayer.sendMessage(
        `§a[荒らし対策] 追放リストの取り込みが完了しました（新規/更新: §b${added}名§a）。`
      );
    }
  }

  await openBanManageMenu(opPlayer);
}

/**
 * 個別追放レコードの編集・解除画面（※最高管理者限定）
 * @param {import("@minecraft/server").Player} opPlayer
 * @param {number} recordIndex
 */
async function openBanRecordEditMenu(opPlayer, recordIndex) {
  if (!opPlayer || !opPlayer.isValid() || !isPrimaryOp(opPlayer)) return;

  const bans = getBans();
  const record = bans[recordIndex];
  if (!record) {
    await openBanManageMenu(opPlayer);
    return;
  }

  const form = new ActionFormData()
    .title(`§6追放設定編集: ${record.gamertag}`)
    .body(
      `§f対象プレイヤー名: §b${record.gamertag}\n` +
        `§f現ワールド識別番号: §e${record.playerId || "未確定 (次回接続時に自動紐付け)"}\n` +
        `§f旧ワールド識別番号: §7${record.legacyId || "なし"}\n` +
        `§f現在の状態: ${record.permanent ? "§c§l永久追放 (再接続時自動追放)" : "§e単発追放履歴 (再接続可能)"}\n` +
        `§f実行者: §7${record.by} (${formatDateTime(record.ts)})`
    )
    .button(
      record.permanent
        ? "§e永久追放を解除し「単発追放履歴」へ変更"
        : "§c「永久追放」へ変更（再接続時に自動追放）"
    )
    .button("§cリストから完全削除（追放解除）")
    .button("§7≪ 一覧へ戻る");

  const res = await showFormWithRetry(opPlayer, form);
  if (!res || res.canceled || res.selection === undefined) return;

  if (res.selection === 0) {
    record.permanent = !record.permanent;
    saveBans(bans);
    if (record.permanent) {
      checkOnlinePlayersForPermanentBans();
    }
    opPlayer.sendMessage(
      `§a[荒らし対策] §b${record.gamertag} §fの状態を ${
        record.permanent ? "§c永久追放" : "§e単発追放履歴"
      } §fに切り替えました。`
    );
    await openBanRecordEditMenu(opPlayer, recordIndex);
    return;
  }

  if (res.selection === 1) {
    const removedName = record.gamertag;
    bans.splice(recordIndex, 1);
    saveBans(bans);
    opPlayer.sendMessage(
      `§a[荒らし対策] §b${removedName} §aをリストから完全削除（追放解除）しました。`
    );
    await openBanManageMenu(opPlayer);
    return;
  }

  await openBanManageMenu(opPlayer);
}
