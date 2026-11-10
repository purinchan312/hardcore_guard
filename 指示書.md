# Minecraft 統合版 ハードコア荒らし対策アドオン（BP + RP）実装仕様書

本仕様書は、Minecraft Bedrock Edition（Windows クライアントホストおよび Realms）の純正ハードコア環境で稼働する監視・監査・高速追放アドオン（Behavior Pack + Resource Pack）を自動生成するための完全な設計定義である。

---

## 1. システム前提・技術制約（厳守事項）

### 1.1 稼働環境・運用前提
* **対象環境**: 統合版クライアント（ローカルマルチ）および Realms
* **ゲームモード**: 純正ハードコアモード固定（チート無効設定）
* **外部バックアップ**: Realms 標準のクラウド自動バックアップ（約30分周期）を運用側で併用する前提とし、アドオン内での空間復元（`StructureManager`）や所持品バックアップは実装しない。
* **透過（X-Ray）対策**: ワールド設定および Realms 設定にて「参加するにはリソースパックの同意が必要（Require players to accept resource packs to join）」を有効化し、本アドオンの RP を強制適用することで参加者側の任意リソースパックを無効化する。

### 1.2 実装言語・依存関係制約
* **ランタイム依存ゼロ**: サードパーティ製の npm パッケージやバンドラ（webpack / esbuild 等）は一切使用しないこと。統合版内蔵の QuickJS エンジンが直接解釈できる Pure ES2020 Modules（`.js` + JSDoc 型注釈）のみで実装する。
* **安定版（Stable）API 限定**:
  * `@minecraft/server`: 安定版バージョン（例: `"1.16.0"` 等、`-beta` を含まないクライアント対応の最新安定版）
  * `@minecraft/server-ui`: `"1.3.0"`（安定版）
  * ベータ API（実験的機能トグルを要するもの）、BDS 専用モジュール（`@minecraft/server-net`, `@minecraft/server-admin`）、およびスラッシュコマンド登録は一切使用しない。
* **JSON UI 改変の禁止**: 本体アップデート時の画面破損を防ぐため、`hud_screen.json` 等の既存 JSON UI 改変は行わない。常時表示は Scoreboard サイドバーとカスタムフォント（`glyph_E1.png`）で実装し、操作画面はすべて `@minecraft/server-ui` で構築する。
* **QuickJS 環境の注意点**: Node.js 固有の `Buffer` やブラウザ固有 API は存在しない。`TextEncoder` も環境差を避けるため使用せず、UTF-8 バイト長計算は純粋な JavaScript の文字コード計算関数を自作すること。

---

## 2. ディレクトリ構成

リポジトリルート配下に Behavior Pack（`hardcore_guard_bp`）、Resource Pack（`hardcore_guard_rp`）、およびアセット生成・パッケージング補助スクリプト（`tools`）を配置する。

```text
project_root/
├── HARDCORE_GUARD_SPEC.md
├── hardcore_guard_bp/
│   ├── manifest.json
│   ├── pack_icon.png                  # 64x64 RGBA PNG
│   ├── items/
│   │   └── op_terminal.json           # OP専用端末アイテム定義 (hc_guard:op_terminal)
│   └── scripts/
│       ├── main.js                    # エントリポイント・イベント購読・定期Tick制御
│       ├── config.js                  # 監視対象定義・定数・アイコンパス対応表
│       ├── utf8.js                    # QuickJS用 UTF-8 バイト長計算・文字列分割ユーティリティ
│       ├── storage.js                 # DynamicProperties 永続化・循環監査ログ管理
│       ├── permissions.js             # 最高管理者自動登録・副OP管理・権限判定
│       ├── sidebar.js                 # 右上サイドバー（ドクロ死者数・Tier1所持数）更新
│       ├── monitor.js                 # 所持数差分走査・使用設置検知・コンテナ差分追跡
│       ├── ban_death.js               # 死亡記録・手動Kick実行・永続BAN自動Kick・ID紐付け
│       ├── terminal.js                # OP端末の自動配布・ロック付与・起動制御・UserBusy再試行
│       └── ui/
│           ├── main_menu.js           # OPメインメニュー
│           ├── emergency_kick.js      # 緊急一括Kick画面 (ModalFormData)
│           ├── player_inspect.js      # 参加者一覧・インベントリ検査画面 (ActionFormData)
│           ├── ban_manage.js          # Kick済み一覧・永続BAN解除・コピペ入出力画面
│           ├── audit_search.js        # 監査ログ絞り込み検索画面
│           └── death_list.js          # 戦没者一覧・死者数カウント除外切替画面
├── hardcore_guard_rp/
│   ├── manifest.json
│   ├── pack_icon.png                  # 64x64 RGBA PNG
│   ├── font/
│   │   └── glyph_E1.png               # 256x256 RGBA PNG (16x16グリッドの独自アイコンフォント)
│   ├── textures/
│   │   ├── item_texture.json          # hc_op_terminal テクスチャマッピング
│   │   └── items/
│   │       └── op_terminal.png        # 16x16 RGBA PNG (OP専用端末アイコン)
│   └── texts/
│       ├── languages.json
│       ├── ja_JP.lang
│       └── en_US.lang
└── tools/
    └── build_mcaddon.ps1              # PNG検証および .mcaddon (ZIP) パッケージ生成用スクリプト
```

---

## 3. マニフェスト・アイテム・RPアセット仕様

### 3.1 `manifest.json`（BP / RP 共通要件）
* `format_version`: `2`
* `min_engine_version`: `[1, 21, 50]`
* 互いに固有の UUID v4 を生成し、BP の `dependencies` に RP の UUID を、RP の `dependencies` に BP の UUID を相互指定することでセット適用を強制する。
* BP の `modules` には `"type": "data"` と `"type": "script"`（`"language": "javascript"`, `"entry": "scripts/main.js"`）を定義し、`dependencies` に `"@minecraft/server"` と `"@minecraft/server-ui"` を記述する。

### 3.2 OP専用カスタムアイテム（`hardcore_guard_bp/items/op_terminal.json`）
* 識別子: `hc_guard:op_terminal`
* コンポーネント要件:
  * `minecraft:max_stack_size`: `1`
  * `minecraft:glint`: `true`
  * `minecraft:icon`: `"hc_op_terminal"`
  * `minecraft:display_name`: `{ "value": "item.hc_guard:op_terminal.name" }`（表示名: `§b§lOP管理端末§r`）
  * `minecraft:allow_off_hand`: `false`
* スクリプト側で生成・配布する際、必ず `itemStack.lockMode = ItemLockMode.inventory`（ドロップ・チェスト移動・クラフト不可）および `itemStack.keepOnDeath = true` を設定すること。

### 3.3 カスタムフォント（`hardcore_guard_rp/font/glyph_E1.png`）
* 画像仕様: `$256 \times 256$` ピクセル、RGBA 32bit PNG。`16` 行 `16` 列のグリッド（1セルあたり `$16 \times 16$` ピクセル）。余白ピクセルは必ず完全透過（Alpha = `0`）にすること（不透明だと白い四角が描画される）。
* グリフ割り当て（Unicode Private Use Area `U+E100` から配置）:
  * `\uE100` (Row 0, Col 0): ドクロアイコン（累計死者数）
  * `\uE101` (Row 0, Col 1): マグマバケツアイコン
  * `\uE102` (Row 0, Col 2): TNT アイコン
  * `\uE103` (Row 0, Col 3): TNT付きトロッコアイコン
  * `\uE104` (Row 0, Col 4): エンドクリスタルアイコン
  * `\uE105` (Row 0, Col 5): リスポーンアンカーアイコン
  * `\uE106` (Row 0, Col 6): 警告マークアイコン（チャット通知頭出し用）

### 3.4 インベントリ検査UI用 テクスチャパス対応表
統合版のバニラテクスチャパスはアイテムIDと一致しないものがあるため、`config.js` に以下の正確なRPパス定義を持たせること。未登録の一般アイテムは共通アイコン `"textures/items/book_normal"` にフォールバックする。

* `minecraft:lava_bucket` : `"textures/items/bucket_lava"`
* `minecraft:tnt` : `"textures/blocks/tnt_side"`
* `minecraft:tnt_minecart` : `"textures/items/minecart_tnt"`
* `minecraft:end_crystal` : `"textures/items/end_crystal"`
* `minecraft:respawn_anchor` : `"textures/blocks/respawn_anchor_top"`
* `minecraft:dispenser` : `"textures/blocks/dispenser_front_horizontal"`
* `minecraft:flint_and_steel` : `"textures/items/flint_and_steel"`
* `minecraft:fire_charge` : `"textures/items/fireball"`
* `minecraft:powder_snow_bucket` : `"textures/items/bucket_powder_snow"`
* `minecraft:wither_skeleton_skull` : `"textures/items/skull_wither"`
* `hc_guard:op_terminal` : `"textures/items/op_terminal"`

---

## 4. データ永続化設計（`DynamicProperties`）

統合版の `world.setDynamicProperty` は 1 キーあたり最大 `32,767` UTF-8 バイトの制限がある。安全マージンを取り、1 スロットあたり最大 `28,000` UTF-8 バイト以下で分割・循環保存する。

### 4.1 保存キー定義
1. `hc:primary_op` (`string`)
   * ワールド初回生成後、最初に入室（`playerSpawn`）したプレイヤーの `player.id` を自動登録し、以後変更不可とする。
2. `hc:sub_ops` (`string` - JSON配列)
   * 形式: `Array<{ id: string, gamertag: string, addedAt: number }>`
3. `hc:deaths` (`string` - JSON配列、容量超過時は `hc:deaths_0..3` へ分割)
   * 形式: `Array<{ playerId: string, gamertag: string, dim: string, x: number, y: number, z: number, cause: string, excluded: boolean, ts: number }>`
   * 同一 `playerId` はユニーク管理とし、重複加算しない。`excluded: true`（荒らしの自滅等をOPが除外指定したもの）はドクロ死者数から除外する。
4. `hc:bans_meta` および `hc:bans_0` .. `hc:bans_4` (`string` - JSON配列分割)
   * Kick画面から実行された履歴および永続BANリスト。
   * レコード形式:
     ```json
     {
       "gamertag": "GrieferName",
       "playerId": "-4294967295",
       "legacyId": "-1234567890",
       "permanent": true,
       "by": "AdminGamertag",
       "ts": 1762780000000
     }
     ```
   * コピペインポート直後のレコードは `"playerId": null`, `"legacyId": "<旧ワールドのplayer.id>"`, `"permanent": true` として保持する。
5. `hc:audit_meta` および `hc:audit_0` .. `hc:audit_14`（計15スロットのリングバッファ）
   * `hc:audit_meta`: `{ "activeSlot": 0, "seq": 1042 }`
   * 各スロット（`hc:audit_N`）は JSON 配列文字列で保持し、追記時に UTF-8 バイト長が `28,000` バイトを超える場合は `(activeSlot + 1) % 15` のスロットを空配列で初期化して切り替え、古いログを循環上書きする。
   * 監査ログ 1 件の構造（容量節約のため短縮キーを使用）:
     ```json
     {
       "seq": 1042,
       "ts": 1762780000000,
       "cat": "OBTAIN | USE | PLACE | DISP_OPEN | CONT_DIFF | DEATH | KICK",
       "pName": "PlayerName",
       "pId": "-4294967295",
       "dim": "overworld",
       "x": 120,
       "y": 64,
       "z": -300,
       "detail": "minecraft:lava_bucket (+1)"
     }
     ```

---

## 5. 機能詳細仕様

### 5.1 権限階層と保護ルール
* **最高管理者（Primary OP）**: 初回入室者。全機能を利用可能。いかなる場合も Kick / BAN 対象から除外される。
* **副OP（Sub-OP / 協力者）**: 最高管理者が UI から任命したプレイヤー。OP端末の所持、持ち物検査、監査ログ閲覧、緊急一括Kick（単発・永続BAN登録）を実行可能。
* **最高管理者限定操作**: 副OPの追加・解任、永続BANの解除、BANリストのテキストインポート、戦没者カウント除外設定は最高管理者のみ操作可能とする。

### 5.2 右上サイドバー常時表示（`sidebar.js`）
* スコアボード Objective ID: `"hc_status"` を `DisplaySlotId.Sidebar`（`ObjectiveSortOrder.Descending`）に表示する。
* **最上段固定（Objective `displayName`）**:
  * `"\uE100 死者 : " + activeDeathCount`（`excluded === false` のユニーク死亡者数）
  * 死者数が変動した際のみ Objective を再生成してヘッダ文字列を更新し、常にサイドバーの最上段中央にドクロと死者数を固定表示する。
* **一覧行（Fake Player Participant + Score）**:
  * オンライン生存プレイヤー全員のインベントリ（36枠）およびオフハンド（`EquipmentSlot.Offhand`）内の Tier 1 アイテム合計所持数を算出し、以下の5行のスコアとして更新する（数値が変化した時のみ更新すること）。
    1. `"\uE101 マグマ"` : `lava_bucket` 合計数
    2. `"\uE102 TNT"` : `tnt` 合計数
    3. `"\uE103 TNT車"` : `tnt_minecart` 合計数
    4. `"\uE104 結晶"` : `end_crystal` 合計数
    5. `"\uE105 錨"` : `respawn_anchor` 合計数

### 5.3 危険物・ディスペンサー監視と即時通知（`monitor.js`）
* **Tier 1（所持増加・使用・設置を監視）**:
  * `minecraft:lava_bucket`（マグマバケツ）
  * `minecraft:tnt`（TNT）
  * `minecraft:tnt_minecart`（TNT付きトロッコ）
  * `minecraft:end_crystal`（エンドクリスタル）
  * `minecraft:respawn_anchor`（リスポーンアンカー）
* **Tier 2（使用・設置を監視、ディスペンサーは開閉も記録）**:
  * `minecraft:dispenser`（ディスペンサー）
  * `minecraft:flint_and_steel`（火打石と打ち金）
  * `minecraft:fire_charge`（ファイヤーチャージ）
  * `minecraft:powder_snow_bucket`（粉雪入りバケツ）
  * `minecraft:wither_skeleton_skull`（ウィザースケルトンの頭蓋骨）
* **インベントリ差分走査（10 Tick = 0.5秒周期）**:
  * 全オンラインプレイヤーの 36枠 + オフハンドを集計し、前回集計値より Tier 1 の個数が増加した瞬間（`current > prev`）に「入手（`OBTAIN`）」として全体チャット通知＋監査ログ記録を実行し、サイドバー数値を更新する。減少・ログアウト時はサイドバー数値のデクリメント反映のみ行う。
  * 初回入室直後の1回目スキャンで既存所持分が誤通知されないよう、入室時に初期スナップショットを記録してから差分比較を開始すること。
* **使用・設置イベント検知（統合版イベント仕様への対応）**:
  * バケツ類・TNT付きトロッコ・エンドクリスタル・火打石・ファイヤーチャージは `playerPlaceBlock` が発火しないケースがあるため、以下の3つを併用する。
    1. `world.beforeEvents.playerInteractWithBlock`: `event.isFirstEvent === true` を必須条件とし、`event.itemStack?.typeId` が Tier 1 / Tier 2 に該当する場合、または対象ブロックが `minecraft:respawn_anchor`（チャージ・起爆操作）の場合に検知する（イベントのキャンセルは行わない）。
    2. `world.afterEvents.playerPlaceBlock`: 設置された `event.block.typeId` が Tier 1 / Tier 2 に該当する場合に検知する。
    3. `world.beforeEvents.playerInteractWithEntity`: 火打石・ファイヤーチャージを持ってクリーパーやTNTトロッコへ着火した操作を検知する。
  * **重複通知防止デバウンス**: 同一プレイヤー・同一アイテム種別で 5 Tick 以内に複数イベントが発火した場合は 1 回のみ通知・記録する。
* **ディスペンサー開操作・コンテナ出し入れ差分記録**:
  * 統合版には `containerClose` イベントが存在しないため、以下のセッション方式で実装する。
  * `world.afterEvents.playerInteractWithBlock` にて対象ブロックが `minecraft:inventory` コンポーネントを持つ場合（スニーク設置時を除く）：
    * 対象が `minecraft:dispenser` であれば即座に監査ログへ `DISP_OPEN` を記録する（自然生成ディスペンサー悪用対策）。
    * 対象コンテナ内の全アイテム集計マップ（`beforeMap`）と座標・プレイヤー情報をセッション登録する。
    * 10 Tick 周期でアクティブセッションを確認し、プレイヤーが対象ブロックから距離 `8` ブロック以上離れた・別コンテナを開いた・切断した・または開いてから 60 Tick 経過し内容変化が静止した時点で最新状態（`afterMap`）と比較し、増減差分（例: `minecraft:lava_bucket (-2), minecraft:cobblestone (+1)`）があれば `CONT_DIFF` として監査ログへ記録する。
* **チャット通知フォーマットと警告音**:
  * 出力形式:
    `"\uE106 §c[監視警告] §e" + dimShort + " (" + x + ", " + y + ", " + z + ") §fで §b" + gamertag + " §7(" + playerId + ") §fが §6" + itemJaName + " §fを §c" + actionJa + " §fしました"`
  * 通知と同時に全プレイヤー（またはOP全員＋周囲）へ `player.playSound("note.pling", { pitch: 0.6, volume: 1.0 })`（使用・設置時は `"random.anvil_land"` 等の識別しやすい警告音）を鳴らす。

### 5.4 ハードコア死亡処理（`ban_death.js`）
* `world.afterEvents.entityDie` にて `deadEntity.typeId === "minecraft:player"` を検知する。
* 死亡座標、ディメンション、死因（`damageSource.cause` および `damagingEntity` の名前・種別）、`gamertag`、`player.id` を全体チャットへ即時出力し、監査ログ（`DEATH`）および戦没者リスト（`hc:deaths`）へ保存して右上ドクロ数を更新する。
* 死亡後の観戦者（スペクテイター）に対する自動 Kick は行わない（問題行動がある場合のみ OP 画面から手動 Kick する）。

### 5.5 Kick 実行とワールド跨ぎ永続 BAN 処理（`ban_death.js`）
* **Kick コマンド実行仕様**:
  * 実行構文: `dimension.runCommandAsync('kick "' + targetName.replace(/"/g, '\\"') + '" 管理者により追放されました')`
  * ローカルホスト本人や最高管理者（`hc:primary_op`）は UI リストから除外し、コード上でも絶対ガードを入れて実行しない。
* **永続 BAN の自動再追放と新ワールド ID 自動紐付け**:
  * `world.afterEvents.playerSpawn`（`initialSpawn === true`）および 20 Tick 周期のオンラインチェックにて、`hc:bans` 内の `permanent === true` レコードと照合する。
  * **照合ロジック**:
    1. `record.playerId !== null && record.playerId === player.id` に一致した場合（同一ワールド内での名前変更逃げを含む）：`record.gamertag` を最新名に更新して即時 Kick する。
    2. `record.playerId === null && record.gamertag.toLowerCase() === player.name.toLowerCase()` に一致した場合（ワールドリセット後にコピペインポートされた BAN 対象者）：現ワールドの `player.id` を `record.playerId` に自動保存（紐付け確定）した上で即時 Kick する。

---

## 6. OP専用アイテムと管理UI仕様（`terminal.js` / `ui/*.js`）

### 6.1 自動配布と起動導線
* 最高管理者および副OPに対し、入室時および 40 Tick 周期チェックでインベントリ内に `hc_guard:op_terminal` が存在せず空きスロットがある場合は自動配布する。OP解任時はインベントリから自動回収する。
* **2段階の高速起動**:
  * `world.beforeEvents.itemUse` および `world.beforeEvents.playerInteractWithBlock`（対象ブロック操作は `event.cancel = true` で誤作動抑止）で `hc_guard:op_terminal` の使用を検知する（プレイヤーごとに 10 Tick のデバウンスを設ける）。
  * **通常使用（非スニーク時）**: 「OPメインメニュー」を開く。
  * **スニーク使用（`player.isSneaking === true`）**: メインメニューをスキップし、最速で **「緊急一括Kick画面」** を直接開く。
* **`UserBusy` リトライ制御**:
  * `form.show(player)` の結果が `response.canceled && response.cancelationReason === FormCancelationReason.UserBusy` の場合、5 Tick 待機して最大 10 回まで自動再表示を試行する。

### 6.2 各ウィンドウ詳細仕様

1. **OPメインメニュー（`ActionFormData`）**
   * ボタン一覧:
     * `§c§l緊急一括Kick`
     * `参加者一覧・持ち物検査`（現在の危険物所持者数を括弧表示）
     * `Kick済み一覧・BAN引き継ぎ`
     * `監査ログ検索`
     * `戦没者一覧（ドクロ数管理）`
     * `副OP（協力者）管理`（※最高管理者のみ表示）

2. **緊急一括Kick画面（`ModalFormData` - スイッチ一括型）**
   * 要素 0（`toggle`）: `§c永続BANとして登録する（再接続時も自動Kick）` — デフォルト値: `false`（単発Kick）
   * 要素 1 以降（`toggle`）: 最高管理者を除く全オンラインプレイヤーを列挙。
     * ラベル形式: `${gamertag} | ID:${playerId}\n${dimShort} (${x}, ${y}, ${z})`（Tier 1 所持者は先頭に `§c[危険物所持] §f` を付与）
     * デフォルト値: `false`
   * 送信時: ON にされた全対象者に対し一括で `kick` を実行し、`hc:bans`（Kick済みリスト）および監査ログ（`KICK`）に実行者名付きで保存する。

3. **参加者一覧・持ち物検査画面（`ActionFormData` 2階層）**
   * **一覧画面**: 全オンラインプレイヤーを表示。Tier 1 所持者を最上段にソートし `§c` 赤字で所持数を併記する。各ボタンに Gamertag・`player.id`・ディメンション・現在座標を表示する。
   * **個別詳細画面**: 選択したプレイヤーのオフハンド＋インベントリ 36 枠の所持アイテムを集約（またはスロット順）し、Tier 1 / Tier 2 アイテムを最上段に固定配置した上で、アイテムアイコン画像（3.4節の対応表参照）＋アイテム名＋個数をボタン一覧で表示する。
   * 詳細画面の最上段（または最下段）に `§e[このプレイヤーを単発Kick]` と `§c[このプレイヤーを永続BAN + Kick]` ボタン（最高管理者以外は対象外保護）を配置し、持ち物確認から1クリックで即追放できるようにする。

4. **Kick済み一覧・BAN引き継ぎ画面（`ActionFormData` + `ModalFormData`）**
   * Kick画面または詳細画面から Kick した対象者のみを一覧表示する（`gamertag`, `playerId` / `legacyId`, 永続BAN状態, 実行OP名, 日時）。
   * **コピー＆インポート画面（`ModalFormData`）**:
     * 統合版のラベル文字列はマウス選択コピーが不可能なため、必ず `textField` の初期値（`defaultValue`）に出力文字列を入れること。
     * **要素 0（コピー用 `textField`）**: ラベル `Kick済みリスト出力（Ctrl+A → Ctrl+C でコピー）`。初期値に `Gamertag:playerId;Gamertag:playerId` のセミコロン区切り文字列をセットする（`playerId` 未確定時は `legacyId` または `NONE` を出力）。
     * **要素 1（インポート用 `textField` - 最高管理者のみ有効）**: ラベル `BANリスト貼り付けインポート（Ctrl+V で貼り付けて送信）`。`Gamertag:playerId;...` 形式（または `Gamertag` のみのセミコロン・カンマ区切り）をパースし、未登録の `Gamertag` を `permanent: true, playerId: null, legacyId: parsedId` として永続BANリストへマージ登録する。
   * **個別編集（最高管理者のみ）**: 一覧から対象をクリックすると、「永続BANのON/OFF切替」「リストから完全削除（BAN解除）」を実行できる。

5. **監査ログ検索画面（`ModalFormData` → `ActionFormData`）**
   * 検索条件フォーム:
     * 対象プレイヤー選択（`dropdown`: 全員 + 記録内プレイヤー一覧）
     * イベント種別（`dropdown`: すべて / 危険物入手 / 危険物使用・設置 / ディスペンサー開 / コンテナ差分 / 死亡 / Kick履歴）
     * 中心座標 X, Z と検索半径 R（`textField`: 空欄時は全域）
   * 検索結果画面: 新しい順（`seq` 降順）で最大 100 件を整形表示する。

6. **戦没者一覧画面（`ActionFormData`）**
   * `hc:deaths` の全記録（日時・Gamertag・`player.id`・ディメンション・座標・死因・カウント状態）を一覧表示する。
   * 最高管理者が項目をクリックすると、その死亡記録の `excluded` フラグ（ドクロ死者数に含める／荒らし自滅等のため除外する）をトグル切り替えでき、即座に右上サイドバーのドクロ数へ反映する。

---

## 7. Antigravity 実装・検証手順（エージェント向け指示）

1. **アセットとマニフェストの生成**:
   * BP / RP 用の UUID v4 を重複なく生成し、両 `manifest.json` を作成する。
   * `pack_icon.png`（`$64 \times 64$`）、`op_terminal.png`（`$16 \times 16$`）、および `font/glyph_E1.png`（`$256 \times 256$`、背景 Alpha = `0`、`U+E100` から `U+E106` までの視認性の高いドット絵アイコン描画）を有効なバイナリ PNG として生成する（Python 標準ライブラリ `zlib` + `struct` 等の一時スクリプトで正確な RGBA PNG を出力してよいが、アドオン本体にはスクリプト以外の依存を残さないこと）。
2. **基盤モジュールの実装**:
   * `utf8.js`, `config.js`, `storage.js`, `permissions.js` を実装し、`DynamicProperties` の分割保存境界（28,000 UTF-8 バイト）で JSON 破損が起きないことを確認する。
3. **監視・サイドバー・Kick/死亡ロジックの実装**:
   * `sidebar.js`, `monitor.js`, `ban_death.js` を実装する。特に `beforeEvents.playerInteractWithBlock` の `isFirstEvent` 判定と 5 Tick デバウンス、および `playerSpawn` 時の新ワールド `player.id` 自動紐付けロジックを漏れなく実装する。
4. **OP端末・全UI画面の実装**:
   * `terminal.js` および `ui/*.js` を実装し、`ItemLockMode.inventory` 付与、スニーク時の緊急Kick直行、`UserBusy` リトライ、コピペ用 `textField` の入出力パースを結合する。
5. **パッケージングスクリプト作成と静的検証**:
   * `tools/build_mcaddon.ps1` を作成し、`hardcore_guard_bp` と `hardcore_guard_rp` をまとめて `hardcore_guard.mcaddon`（ZIPアーカイブ）へ出力できるようにする。
   * 全 `.js` ファイルの ES Module `import` パス（拡張子 `.js` 必須）および JSON 構文エラーがないことを最終検証する。