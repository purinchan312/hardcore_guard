/**
 * @file terminal.js
 * @description OP専用端末（hc_guard:op_terminal）の自動配布・回収・インベントリロック・2段階起動・UserBusyリトライ制御
 */

import {
  world,
  system,
  ItemStack,
  ItemLockMode,
  EquipmentSlot,
} from "@minecraft/server";
import { FormCancelationReason } from "@minecraft/server-ui";
import { OP_TERMINAL_ITEM_ID } from "./config.js";
import { isOp } from "./permissions.js";
import { openMainMenu } from "./ui/main_menu.js";
import { openEmergencyKickMenu } from "./ui/emergency_kick.js";

/**
 * プレイヤーごとの端末起動デバウンスマップ（10 Tick）
 * @type {Map<string, number>}
 */
const terminalUseDebounce = new Map();

/**
 * FormCancelationReason.UserBusy 発生時に 5 Tick 間隔で最大 10 回自動リトライしてフォームを表示する
 * @template {import("@minecraft/server-ui").ActionFormData | import("@minecraft/server-ui").ModalFormData | import("@minecraft/server-ui").MessageFormData} T
 * @param {import("@minecraft/server").Player} player
 * @param {T} form
 * @param {number} [maxRetries=10]
 * @returns {Promise<Awaited<ReturnType<T["show"]>> | null>}
 */
export function showFormWithRetry(player, form, maxRetries = 10) {
  return new Promise((resolve) => {
    let attempts = 0;

    const attemptShow = () => {
      if (!player || !player.isValid()) {
        resolve(null);
        return;
      }

      form
        .show(player)
        .then((response) => {
          if (
            response.canceled &&
            response.cancelationReason === FormCancelationReason.UserBusy &&
            attempts < maxRetries
          ) {
            attempts++;
            system.runTimeout(attemptShow, 5);
            return;
          }
          resolve(/** @type {any} */ (response));
        })
        .catch(() => {
          resolve(null);
        });
    };

    attemptShow();
  });
}

/**
 * ロック属性付きの OP専用端末 ItemStack を生成する（3.2節準拠）
 * @returns {ItemStack}
 */
function createLockedTerminalItem() {
  const item = new ItemStack(OP_TERMINAL_ITEM_ID, 1);
  item.lockMode = ItemLockMode.inventory;
  item.keepOnDeath = true;
  return item;
}

/**
 * 単一プレイヤーに対して OP 権限に応じた OP専用端末の配布または回収を実行する
 * @param {import("@minecraft/server").Player} player
 */
export function syncPlayerOpTerminal(player) {
  try {
    if (!player || !player.isValid()) return;

    const inv = player.getComponent("minecraft:inventory")?.container;
    if (!inv) return;

    const equip = player.getComponent("minecraft:equippable");
    const playerHasOp = isOp(player);

    // オフハンドに万一入っている場合は除去
    if (equip) {
      const offhandItem = equip.getEquipment(EquipmentSlot.Offhand);
      if (offhandItem && offhandItem.typeId === OP_TERMINAL_ITEM_ID) {
        equip.setEquipment(EquipmentSlot.Offhand, undefined);
      }
    }

    const size = inv.size;
    let foundIndex = -1;

    for (let i = 0; i < size; i++) {
      const item = inv.getItem(i);
      if (item && item.typeId === OP_TERMINAL_ITEM_ID) {
        if (!playerHasOp) {
          // 非OP（解任後等）からは自動回収
          inv.setItem(i, undefined);
        } else if (foundIndex === -1) {
          foundIndex = i;
          // ロックまたは keepOnDeath が外れていた場合は再設定
          if (item.lockMode !== ItemLockMode.inventory || !item.keepOnDeath || item.amount > 1) {
            const locked = createLockedTerminalItem();
            inv.setItem(i, locked);
          }
        } else {
          // 2個目以降の重複分は削除
          inv.setItem(i, undefined);
        }
      }
    }

    // OPであり、インベントリ内に端末が存在せず空きスロットがある場合は自動配布
    if (playerHasOp && foundIndex === -1 && inv.emptySlotsCount > 0) {
      const locked = createLockedTerminalItem();
      inv.addItem(locked);
    }
  } catch {
    // ignore
  }
}

/**
 * 40 Tick 周期で全オンラインプレイヤーの OP 端末所持状態を同期する
 */
export function syncAllPlayersOpTerminals() {
  try {
    for (const player of world.getAllPlayers()) {
      syncPlayerOpTerminal(player);
    }
  } catch {
    // ignore
  }
}

/**
 * OP端末の使用をハンドリングする（10 Tick デバウンス + スニーク判定による2段階起動）
 * @param {import("@minecraft/server").Player} player
 */
function handleTerminalUse(player) {
  if (!player) return;
  const pid = player.id;
  const nowTick = system.currentTick;
  const lastTick = terminalUseDebounce.get(pid);
  if (lastTick !== undefined && nowTick - lastTick < 10) {
    return;
  }
  terminalUseDebounce.set(pid, nowTick);

  const sneaking = Boolean(player.isSneaking);

  system.run(() => {
    if (!player || !player.isValid()) return;
    if (!isOp(player)) {
      syncPlayerOpTerminal(player);
      try {
        player.sendMessage("§c[荒らし対策] 管理者権限がないため管理端末は回収されました。");
      } catch {
        // ignore
      }
      return;
    }

    if (sneaking) {
      // スニーク使用：メインメニューをスキップし最速で「緊急一括Kick画面」を直接開く
      openEmergencyKickMenu(player);
    } else {
      // 通常使用：「OPメインメニュー」を開く
      openMainMenu(player);
    }
  });
}

/**
 * OP専用端末の使用イベント（itemUse / playerInteractWithBlock）を登録する
 */
export function registerTerminalEvents() {
  world.beforeEvents.itemUse.subscribe((event) => {
    const item = event.itemStack;
    if (!item || item.typeId !== OP_TERMINAL_ITEM_ID) return;
    const player = event.source;
    if (!player || player.typeId !== "minecraft:player") return;
    handleTerminalUse(/** @type {import("@minecraft/server").Player} */ (player));
  });

  world.beforeEvents.playerInteractWithBlock.subscribe((event) => {
    const item = event.itemStack;
    if (!item || item.typeId !== OP_TERMINAL_ITEM_ID) return;
    // 対象ブロック操作の誤作動を抑止
    event.cancel = true;
    if (!event.isFirstEvent) return;
    handleTerminalUse(event.player);
  });
}
