/**
 * @file utf8.js
 * @description QuickJS 環境向け Pure JavaScript UTF-8 バイト長計算および JSON 配列分割ユーティリティ
 */

/**
 * 文字列の UTF-8 バイト長を純粋な文字コード演算で算出する（サロゲートペア対応）
 * @param {string} str
 * @returns {number} UTF-8 バイト長
 */
export function utf8ByteLength(str) {
  if (typeof str !== "string" || str.length === 0) {
    return 0;
  }
  let bytes = 0;
  const len = str.length;
  for (let i = 0; i < len; i++) {
    const code = str.charCodeAt(i);
    if (code <= 0x7f) {
      bytes += 1;
    } else if (code <= 0x7ff) {
      bytes += 2;
    } else if (code >= 0xd800 && code <= 0xdbff) {
      // High surrogate: check if next code unit is a valid low surrogate
      if (i + 1 < len) {
        const next = str.charCodeAt(i + 1);
        if (next >= 0xdc00 && next <= 0xdfff) {
          bytes += 4;
          i++; // Skip low surrogate
          continue;
        }
      }
      // Unpaired surrogate encodes as 3 bytes (replacement char U+FFFD)
      bytes += 3;
    } else {
      bytes += 3;
    }
  }
  return bytes;
}

/**
 * オブジェクト配列を JSON.stringify した際に各チャンクが maxBytes 以下になるよう安全に分割する
 * @template T
 * @param {T[]} items
 * @param {number} [maxBytes=28000]
 * @returns {string[]} 各スロットに保存する JSON 配列文字列のリスト
 */
export function splitJsonArrayByByteLimit(items, maxBytes = 28000) {
  if (!Array.isArray(items) || items.length === 0) {
    return ["[]"];
  }

  /** @type {string[]} */
  const chunks = [];
  /** @type {string[]} */
  let currentSerializedItems = [];
  let currentBytes = 2; // '[' and ']'

  for (let i = 0; i < items.length; i++) {
    const itemJson = JSON.stringify(items[i]);
    const itemBytes = utf8ByteLength(itemJson);
    const commaBytes = currentSerializedItems.length > 0 ? 1 : 0;

    // 1要素単体で maxBytes を超える異常データはスキップして破損を防ぐ
    if (itemBytes + 2 > maxBytes) {
      continue;
    }

    if (currentBytes + commaBytes + itemBytes > maxBytes && currentSerializedItems.length > 0) {
      chunks.push("[" + currentSerializedItems.join(",") + "]");
      currentSerializedItems = [itemJson];
      currentBytes = 2 + itemBytes;
    } else {
      currentSerializedItems.push(itemJson);
      currentBytes += commaBytes + itemBytes;
    }
  }

  if (currentSerializedItems.length > 0 || chunks.length === 0) {
    chunks.push("[" + currentSerializedItems.join(",") + "]");
  }

  return chunks;
}
