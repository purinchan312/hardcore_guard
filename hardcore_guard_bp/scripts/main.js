/**
 * @file main.js
 * @description Hardcore Guard BP エントリポイント・イベント購読・定期Tickスケジューラ
 */

import { world, system } from "@minecraft/server";
import { ensurePrimaryOpOnJoin } from "./permissions.js";
import { syncSidebar } from "./sidebar.js";
import {
  initPlayerMonitorSnapshot,
  cleanupPlayerMonitorState,
  runInventoryDiffScan,
  tickContainerSessions,
  registerMonitorEvents,
} from "./monitor.js";
import {
  enforcePermanentBanOnPlayer,
  checkOnlinePlayersForPermanentBans,
  registerDeathEvents,
} from "./ban_death.js";
import {
  syncPlayerOpTerminal,
  syncAllPlayersOpTerminals,
  registerTerminalEvents,
} from "./terminal.js";

/**
 * アドオン全体の初期化およびイベント・定期タスク登録
 */
function initializeHardcoreGuard() {
  // 1. ワールド初期化完了時にサイドバーを初期構築
  world.afterEvents.worldInitialize.subscribe(() => {
    system.run(() => {
      syncSidebar(undefined, true);
    });
  });

  // 2. プレイヤー入室・スポーン時の処理
  world.afterEvents.playerSpawn.subscribe((event) => {
    const player = event.player;
    if (!player || !player.isValid()) return;

    // ワールド初回入室者を最高管理者として自動登録（以降は不変）
    ensurePrimaryOpOnJoin(player);

    if (event.initialSpawn) {
      // 永続BAN対象者の照合（新ワールド player.id 自動紐付け + 即時Kick）
      if (enforcePermanentBanOnPlayer(player)) {
        return;
      }
      // 初回スキャン時の誤通知を防ぐため初期所持スナップショットを記録
      initPlayerMonitorSnapshot(player);
    }

    // OP（最高管理者・副OP）への管理端末自動配布（非OPからは回収）
    syncPlayerOpTerminal(player);
  });

  // 3. プレイヤー切断時のクリーンアップ
  world.afterEvents.playerLeave.subscribe((event) => {
    cleanupPlayerMonitorState(event.playerId);
    system.run(() => {
      runInventoryDiffScan();
    });
  });

  // 4. 監視・死亡・OP端末の各イベントリスナー登録
  registerMonitorEvents();
  registerDeathEvents();
  registerTerminalEvents();

  // 5. 定期Tickスケジューラ
  // 10 Tick (0.5秒) 周期: インベントリ差分走査・サイドバー更新・コンテナ開閉差分追跡
  system.runInterval(() => {
    runInventoryDiffScan();
    tickContainerSessions();
  }, 10);

  // 20 Tick (1.0秒) 周期: 永続BAN対象者のオンライン監視・再追放
  system.runInterval(() => {
    checkOnlinePlayersForPermanentBans();
  }, 20);

  // 40 Tick (2.0秒) 周期: OP専用端末の自動配布・ロック維持・解任者回収チェック
  system.runInterval(() => {
    syncAllPlayersOpTerminals();
  }, 40);
}

initializeHardcoreGuard();
