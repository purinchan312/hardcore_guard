/**
 * @file ja_dict.js
 * @description 統合版 全アイテム・ブロック・ディメンション・死因・エンティティ・監査ログ完全日本語化辞書
 */

/** ディメンションの日本語変換表 */
const DIMENSION_JA_MAP = Object.freeze({
  "minecraft:overworld": "オーバーワールド",
  overworld: "オーバーワールド",
  "minecraft:nether": "ネザー",
  nether: "ネザー",
  "minecraft:the_end": "ジ・エンド",
  the_end: "ジ・エンド",
});

/** 監査ログ種別の日本語変換表 */
export const AUDIT_CATEGORY_JA_MAP = Object.freeze({
  OBTAIN: "危険物入手",
  USE: "危険物使用",
  PLACE: "危険物設置",
  DISP_OPEN: "ディスペンサー開",
  CONT_DIFF: "コンテナ差分",
  DEATH: "死亡",
  KICK: "追放履歴",
});

/** 死因（EntityDamageCause）の日本語変換表 */
const DEATH_CAUSE_JA_MAP = Object.freeze({
  anvil: "金床の落下",
  attack: "攻撃",
  blockExplosion: "ブロック爆発",
  block_explosion: "ブロック爆発",
  campfire: "焚き火",
  charging: "突進",
  contact: "ブロック接触",
  drowning: "溺死",
  entityAttack: "攻撃",
  entity_attack: "攻撃",
  entityExplosion: "爆発",
  entity_explosion: "爆発",
  fall: "落下",
  fallingBlock: "落下ブロック",
  falling_block: "落下ブロック",
  fire: "炎",
  fireTick: "火傷",
  fire_tick: "火傷",
  fireworks: "ロケット花火",
  flyIntoWall: "壁への激突",
  fly_into_wall: "壁への激突",
  freezing: "凍死",
  lava: "溶岩",
  lightning: "落雷",
  magic: "魔法",
  magma: "マグマブロック",
  none: "不明",
  override: "特殊ダメージ",
  piston: "ピストン",
  projectile: "飛び道具",
  ramAttack: "体当たり",
  ram_attack: "体当たり",
  selfDestruct: "自爆",
  self_destruct: "自爆",
  sonicBoom: "ウォーデンの衝撃波",
  sonic_boom: "ウォーデンの衝撃波",
  soulCampfire: "魂の焚き火",
  soul_campfire: "魂の焚き火",
  stalactite: "鍾乳石の落下",
  stalagmite: "石筍への落下",
  starve: "餓死",
  suffocation: "窒息",
  suicide: "自滅",
  temperature: "温度ダメージ",
  thorns: "棘の鎧",
  void: "奈落",
  wither: "衰弱",
  unknown: "不明",
});

/** モブ・エンティティの日本語変換表 */
const ENTITY_JA_MAP = Object.freeze({
  player: "プレイヤー",
  zombie: "ゾンビ",
  husk: "ハスク",
  drowned: "ドラウンド",
  zombie_villager: "村人ゾンビ",
  zombie_villager_v2: "村人ゾンビ",
  skeleton: "スケルトン",
  stray: "ストレイ",
  bogged: "ボグド",
  wither_skeleton: "ウィザースケルトン",
  creeper: "クリーパー",
  spider: "クモ",
  cave_spider: "洞窟グモ",
  enderman: "エンダーマン",
  endermite: "エンダーマイト",
  slime: "スライム",
  magma_cube: "マグマキューブ",
  phantom: "ファントム",
  witch: "ウィッチ",
  pillager: "ピリジャー",
  vindicator: "ヴィンディケーター",
  evocation_illager: "エヴォーカー",
  evoker: "エヴォーカー",
  ravager: "ラヴェジャー",
  vex: "ヴェックス",
  blaze: "ブレイズ",
  ghast: "ガスト",
  hoglin: "ホグリン",
  zoglin: "ゾグリン",
  piglin: "ピグリン",
  piglin_brute: "ピグリンブルート",
  zombified_piglin: "ゾンビ화ピグリン",
  zombie_pigman: "ゾンビピグリン",
  shulker: "シュルカー",
  silverfish: "シルバーフィッシュ",
  guardian: "ガーディアン",
  elder_guardian: "エルダーガーディアン",
  warden: "ウォーデン",
  breeze: "ブリーズ",
  creaking: "クリーキング",
  ender_dragon: "エンダードラゴン",
  wither: "ウィザー",
  iron_golem: "アイアンゴーレム",
  snow_golem: "スノーゴーレム",
  wolf: "オオカミ",
  bee: "ミツバチ",
  polar_bear: "シロクマ",
  llama: "ラマ",
  trader_llama: "行商人のラマ",
  goat: "ヤギ",
  panda: "パンダ",
  dolphin: "イルカ",
  pufferfish: "フグ",
  tnt: "着火されたTNT",
  tnt_minecart: "TNT付きトロッコ",
  ender_crystal: "エンドクリスタル",
  end_crystal: "エンドクリスタル",
  arrow: "矢",
  trident: "トライデント",
  fireball: "火の玉",
  small_fireball: "小さな火の玉",
  dragon_fireball: "ドラゴンの火の玉",
  wither_skull: "ウィザーの頭蓋骨",
  shulker_bullet: "シュルカーの弾",
  wind_charge_projectile: "ウィンドチャージ",
   splash_potion: "スプラッシュポーション",
  lingering_potion: "残留ポーション",
  falling_block: "落下中のブロック",
  lightning_bolt: "雷",
});

/** 直接一致のアイテム・ブロック日本語辞書 */
const ITEM_JA_DICT = Object.freeze({
  // 管理端末・監視対象（Tier 1 / Tier 2）
  "hc_guard:op_terminal": "管理端末",
  op_terminal: "管理端末",
  lava_bucket: "マグマバケツ",
  tnt: "火薬ブロック（TNT）",
  tnt_minecart: "TNT付きトロッコ",
  end_crystal: "エンドクリスタル",
  respawn_anchor: "リスポーンアンカー",
  dispenser: "ディスペンサー",
  flint_and_steel: "火打石と打ち金",
  fire_charge: "ファイヤーチャージ",
  powder_snow_bucket: "粉雪入りバケツ",
  wither_skeleton_skull: "ウィザースケルトンの頭蓋骨",

  // 基本ブロック・自然ブロック
  stone: "石",
  cobblestone: "丸石",
  mossy_cobblestone: "苔むした丸石",
  smooth_stone: "滑らかな石",
  stone_bricks: "石レンガ",
  mossy_stone_bricks: "苔むした石レンガ",
  cracked_stone_bricks: "ひび割れた石レンガ",
  chiseled_stone_bricks: "模様入りの石レンガ",
  stonebrick: "石レンガ",
  granite: "花崗岩",
  polished_granite: "磨かれた花崗岩",
  diorite: "閃緑岩",
  polished_diorite: "磨かれた閃緑岩",
  andesite: "安山岩",
  polished_andesite: "磨かれた安山岩",
  deepslate: "深層岩",
  cobbled_deepslate: "深層岩の丸石",
  polished_deepslate: "磨かれた深層岩",
  deepslate_bricks: "深層岩レンガ",
  cracked_deepslate_bricks: "ひび割れた深層岩レンガ",
  deepslate_tiles: "深層岩タイル",
  cracked_deepslate_tiles: "ひび割れた深層岩タイル",
  chiseled_deepslate: "模様入りの深層岩",
  reinforced_deepslate: "強化された深層岩",
  tuff: "凝灰岩",
  polished_tuff: "磨かれた凝灰岩",
  tuff_bricks: "凝灰岩レンガ",
  chiseled_tuff: "模様入りの凝灰岩",
  chiseled_tuff_bricks: "模様入りの凝灰岩レンガ",
  calcite: "方解石",
  dripstone_block: "鍾乳石ブロック",
  pointed_dripstone: "尖ったドリップストーン",
  dirt: "土",
  coarse_dirt: "粗い土",
  rooted_dirt: "根付いた土",
  grass_block: "草ブロック",
  grass: "草ブロック",
  short_grass: "草",
  tall_grass: "背の高い草",
  podzol: "ポドゾル",
  mycelium: "菌糸",
  dirt_path: "土の道",
  grass_path: "土の道",
  farmland: "耕地",
  mud: "泥",
  packed_mud: "固めた泥",
  mud_bricks: "泥レンガ",
  clay: "粘土ブロック",
  clay_ball: "粘土玉",
  gravel: "砂利",
  sand: "砂",
  red_sand: "赤い砂",
  sandstone: "砂岩",
  chiseled_sandstone: "模様入りの砂岩",
  cut_sandstone: "研がれた砂岩",
  smooth_sandstone: "滑らかな砂岩",
  red_sandstone: "赤い砂岩",
  chiseled_red_sandstone: "模様入りの赤い砂岩",
  cut_red_sandstone: "研がれた赤い砂岩",
  smooth_red_sandstone: "滑らかな赤い砂岩",
  ice: "氷",
  packed_ice: "氷塊",
  blue_ice: "青氷",
  snow: "雪ブロック",
  snow_layer: "雪",
  snowball: "雪玉",
  moss_block: "苔ブロック",
  moss_carpet: "苔のカーペット",
  obsidian: "黒曜石",
  crying_obsidian: "泣く黒曜石",
  bedrock: "岩盤",

  // ネザー・エンド関連ブロック
  netherrack: "ネザーラック",
  soul_sand: "ソウルサンド",
  soul_soil: "ソウルソイル",
  basalt: "玄武岩",
  smooth_basalt: "滑らかな玄武岩",
  polished_basalt: "磨かれた玄武岩",
  blackstone: "ブラックストーン",
  gilded_blackstone: "きらめくブラックストーン",
  polished_blackstone: "磨かれたブラックストーン",
  polished_blackstone_bricks: "磨かれたブラックストーンレンガ",
  cracked_polished_blackstone_bricks: "ひび割れたブラックストーンレンガ",
  chiseled_polished_blackstone: "模様入りのブラックストーン",
  glowstone: "グロウストーン",
  glowstone_dust: "グロウストーンダスト",
  magma: "マグマブロック",
  magma_block: "マグマブロック",
  nether_brick: "ネザーレンガ",
  nether_bricks: "ネザーレンガブロック",
  red_nether_brick: "赤いネザーレンガ",
  red_nether_bricks: "赤いネザーレンガ",
  cracked_nether_bricks: "ひび割れたネザーレンガ",
  chiseled_nether_bricks: "模様入りのネザーレンガ",
  nether_wart_block: "ネザーウォートブロック",
  warped_wart_block: "歪んだウォートブロック",
  shroomlight: "シュルームライト",
  crimson_nylium: "真紅のナイリウム",
  warped_nylium: "歪んだナイリウム",
  end_stone: "エンドストーン",
  end_bricks: "エンドストーンレンガ",
  end_stone_bricks: "エンドストーンレンガ",
  purpur_block: "プルプァブロック",
  purpur_pillar: "プルプァの柱",
  end_rod: "エンドロッド",
  chorus_plant: "コーラスプラント",
  chorus_flower: "コーラスフラワー",
  chorus_fruit: "コーラスフルーツ",
  popped_chorus_fruit: "焼いたコーラスフルーツ",
  dragon_egg: "ドラゴンの卵",
  dragon_breath: "ドラゴンブレス",
  dragon_head: "ドラゴンの頭",

  // 鉱石・鉱物・素材
  coal: "石炭",
  charcoal: "木炭",
  coal_block: "石炭ブロック",
  raw_iron: "鉄の原石",
  raw_iron_block: "鉄の原石ブロック",
  iron_ingot: "鉄インゴット",
  iron_nugget: "鉄塊",
  iron_block: "鉄ブロック",
  raw_copper: "銅の原石",
  raw_copper_block: "銅の原石ブロック",
  copper_ingot: "銅インゴット",
  copper_block: "銅ブロック",
  raw_gold: "金の原石",
  raw_gold_block: "金の原石ブロック",
  gold_ingot: "金インゴット",
  gold_nugget: "金塊",
  gold_block: "金ブロック",
  diamond: "ダイヤモンド",
  diamond_block: "ダイヤモンドブロック",
  emerald: "エメラルド",
  emerald_block: "エメラルドブロック",
  lapis_lazuli: "ラピスラズリ",
  lapis_block: "ラピスラズリブロック",
  redstone: "レッドストーンダスト",
  redstone_block: "レッドストーンブロック",
  quartz: "ネザークォーツ",
  quartz_block: "クォーツブロック",
  chiseled_quartz_block: "模様入りのクォーツブロック",
  quartz_pillar: "クォーツの柱",
   quartz_bricks: "クォーツレンガ",
  smooth_quartz: "滑らかなクォーツブロック",
  amethyst_shard: "アメジストの欠片",
  amethyst_block: "アメジストブロック",
  budding_amethyst: "芽生えたアメジスト",
  amethyst_cluster: "アメジストの塊",
  ancient_debris: "古代の残骸",
  netherite_scrap: "ネザライトの欠片",
  netherite_ingot: "ネザライトインゴット",
  netherite_block: "ネザライトブロック",
  flint: "火打石",
  stick: "棒",
  bone: "骨",
  bone_meal: "骨粉",
  bone_block: "骨ブロック",
  string: "糸",
  feather: "羽根",
  leather: "革",
  rabbit_hide: "ウサギの皮",
  rabbit_foot: "ウサギの足",
  scute: "カメのウロコ",
  turtle_scute: "カメのウロコ",
  armadillo_scute: "アルマジロのウロコ",
  slime_ball: "スライムボール",
  slime: "スライムブロック",
  slime_block: "スライムブロック",
  honey_bottle: "ハチミツ入りの瓶",
  honey_block: "ハチミツブロック",
  honeycomb: "ハニカム",
  honeycomb_block: "ハニカムブロック",
  gunpowder: "火薬",
  blaze_rod: "ブレイズロッド",
  blaze_powder: "ブレイズパウダー",
  ender_pearl: "エンダーパール",
  ender_eye: "エンダーアイ",
  ghast_tear: "ガストの涙",
  magma_cream: "マグマクリーム",
  nether_star: "ネザースター",
  shulker_shell: "シュルカーの殻",
  phantom_membrane: "ファントムの皮膜",
  nautilus_shell: "オウムガイの殻",
  heart_of_the_sea: "海洋の心",
  prismarine_shard: "プリズマリンの欠片",
  prismarine_crystals: "プリズマリンクリスタル",
  prismarine: "プリズマリン",
  prismarine_bricks: "プリズマリンレンガ",
  dark_prismarine: "ダークプリズマリン",
  sea_lantern: "シーランタン",
  sponge: "スポンジ",
  wet_sponge: "濡れたスポンジ",
  paper: "紙",
  book: "本",
  writable_book: "本と羽根ペン",
  written_book: "記入済みの本",
  enchanted_book: "エンチャントの本",
  bookshelf: "本棚",
  chiseled_bookshelf: "模様入りの本棚",
  lectern: "書見台",
  brick: "レンガ",
  brick_block: "レンガブロック",
  bricks: "レンガブロック",
  sugar_cane: "サトウキビ",
  reeds: "サトウキビ",
  sugar: "砂糖",
  bamboo: "竹",
  bamboo_block: "竹ブロック",
  stripped_bamboo_block: "表皮を剥いだ竹ブロック",
  bamboo_mosaic: "竹細工",
  scaffolding: "足場",
  kelp: "コンブ",
  dried_kelp: "乾燥したコンブ",
  dried_kelp_block: "乾燥したコンブブロック",
  waterlily: "スイレンの葉",
  lily_pad: "スイレンの葉",
  vine: "ツタ",
  weeping_vines: "しだれツタ",
  twisting_vines: "ねじれツタ",
  glow_lichen: "ヒカリゴケ",
  cactus: "サボテン",
  deadbush: "枯れ木",
  dead_bush: "枯れ木",
  fern: "シダ",
  large_fern: "大きなシダ",
  seagrass: "海草",
  sea_pickle: "シーピクルス",
  nether_wart: "ネザーウォート",
  warped_fungus: "歪んだキノコ",
  crimson_fungus: "真紅のキノコ",
  brown_mushroom: "茶色のキノコ",
  red_mushroom: "赤色のキノコ",
  brown_mushroom_block: "茶色のキノコブロック",
  red_mushroom_block: "赤色のキノコブロック",
  mushroom_stem: "キノコの柄",
  cobweb: "クモの巣",
  web: "クモの巣",

  // 照明・ユーティリティ・作業ブロック
  torch: "松明",
  soul_torch: "魂の松明",
  redstone_torch: "レッドストーントーチ",
  lantern: "ランタン",
  soul_lantern: "魂のランタン",
  campfire: "焚き火",
  soul_campfire: "魂の焚き火",
  crafting_table: "作業台",
  stonecutter: "石切台",
  stonecutter_block: "石切台",
  cartography_table: "製図台",
  fletching_table: "矢細工台",
  smithing_table: "鍛冶台",
  loom: "機織り機",
  grindstone: "砥石",
  anvil: "金床",
  chipped_anvil: "少し壊れた金床",
  damaged_anvil: "かなり壊れた金床",
  furnace: "かまど",
  lit_furnace: "燃焼中のかまど",
  blast_furnace: "溶鉱炉",
  smoker: "燻製器",
  brewing_stand: "調合台",
  cauldron: "大釜",
  enchanting_table: "エンチャントテーブル",
  beacon: "ビーコン",
  conduit: "コンジット",
  ender_chest: "エンダーチェスト",
  chest: "チェスト",
  trapped_chest: "トラップチェスト",
  barrel: "樽",
  undying_totem: "不死のトーテム",
  totem_of_undying: "不死のトーテム",
  jukebox: "ジュークボックス",
  noteblock: "音符ブロック",
  note_block: "音符ブロック",
  bell: "鐘",
  ladder: "はしご",
  chain: "鎖",
  iron_bars: "鉄格子",
  glass: "ガラス",
  glass_pane: "ガラス板",
  tinted_glass: "遮光ガラス",
  flower_pot: "植木鉢",
  armor_stand: "防具立て",
  item_frame: "額縁",
  glow_frame: "輝く額縁",
  glow_item_frame: "輝く額縁",
  painting: "絵画",
  composter: "コンポスター",
  beehive: "養蜂箱",
  bee_nest: "ミツバチの巣",
  lightning_rod: "避雷針",
  decorated_pot: "飾り壺",
  crafter: "自動作業台",
  vault: "宝物庫",
  trial_spawner: "トライアルスポナー",
  mob_spawner: "モンスタースポナー",
  spawner: "モンスタースポナー",
  lodestone: "ロードストーン",

  // レッドストーン・移動関連
  dropper: "ドロッパー",
  hopper: "ホッパー",
  piston: "ピストン",
  sticky_piston: "粘着ピストン",
  observer: "オブザーバー",
  repeater: "レッドストーン反復装置",
  unpowered_repeater: "レッドストーン反復装置",
  powered_repeater: "レッドストーン反復装置",
  comparator: "レッドストーン比較器",
  unpowered_comparator: "レッドストーン比較器",
  powered_comparator: "レッドストーン比較器",
  redstone_lamp: "レッドストーンランプ",
  lit_redstone_lamp: "レッドストーンランプ",
  target: "的ブロック",
  lever: "レバー",
  tripwire_hook: "トリップワイヤーフック",
  daylight_detector: "日照センサー",
  sculk_sensor: "スカルクセンサー",
  calibrated_sculk_sensor: "調律されたスカルクセンサー",
  sculk: "スカルク",
  sculk_catalyst: "スカルクカタリスト",
  sculk_shrieker: "スカルクシュリーカー",
  sculk_vein: "スカルクヴェイン",
  rail: "レール",
  golden_rail: "パワードレール",
  powered_rail: "パワードレール",
  detector_rail: "ディテクターレール",
  activator_rail: "アクティベーターレール",
  minecart: "トロッコ",
  chest_minecart: "チェスト付きトロッコ",
  hopper_minecart: "ホッパー付きトロッコ",
  command_block_minecart: "コマンドブロック付きトロッコ",
  saddle: "鞍（サドル）",
  carrot_on_a_stick: "ニンジン付きの棒",
  warped_fungus_on_a_stick: "歪んだキノコ付きの棒",
  elytra: "エリトラ",
  firework_rocket: "ロケット花火",
  firework_star: "花火の星",
  lead: "リード（首紐）",
  name_tag: "名札",

  // バケツ・容器類
  bucket: "バケツ",
  water_bucket: "水バケツ",
  milk_bucket: "ミルクバケツ",
  cod_bucket: "タラ入りバケツ",
  salmon_bucket: "サケ入りバケツ",
  tropical_fish_bucket: "熱帯魚入りバケツ",
  pufferfish_bucket: "フグ入りバケツ",
  axolotl_bucket: "ウーパールーパー入りバケツ",
  tadpole_bucket: "オタマジャクシ入りバケツ",
  glass_bottle: "ガラス瓶",
  potion: "ポーション",
  splash_potion: "スプラッシュポーション",
  lingering_potion: "残留ポーション",
  experience_bottle: "エンチャントの瓶",
  bowl: "ボウル",

  // 武器・特殊道具
  bow: "弓",
  crossbow: "クロスボウ",
  arrow: "矢",
  spectral_arrow: "光の矢",
  trident: "トライデント",
  mace: "メイス",
  wind_charge: "ウィンドチャージ",
  shield: "盾",
  shears: "ハサミ",
  fishing_rod: "釣竿",
  spyglass: "望遠鏡",
  brush: "ブラシ",
  compass: "コンパス",
  recovery_compass: "リカバリーコンパス",
  clock: "時計",
  empty_map: "白紙の地図",
  filled_map: "地図",
  map: "地図",
  goat_horn: "ヤギの角笛",
  turtle_helmet: "カメの甲羅",
  wolf_armor: "オオカミの鎧",
  trial_key: "トライアルキー",
  ominous_trial_key: "不吉なトライアルキー",
  ominous_bottle: "不吉な瓶",
  breeze_rod: "ブリーズロッド",
  heavy_core: "ヘビーコア",

  // 食料・農作物
  wheat_seeds: "小麦の種",
  wheat: "小麦",
  hay_block: "干草の俵",
  bread: "パン",
  apple: "リンゴ",
  golden_apple: "金のリンゴ",
  enchanted_golden_apple: "エンチャントされた金のリンゴ",
  appleenchanted: "エンチャントされた金のリンゴ",
  melon_slice: "スイカの薄切り",
  melon_block: "スイカ",
  melon: "スイカ",
  melon_seeds: "スイカの種",
  glistering_melon_slice: "きらめくスイカの薄切り",
  pumpkin: "カボチャ",
  carved_pumpkin: "くり抜かれたカボチャ",
  lit_pumpkin: "ジャック・オ・ランタン",
  jack_o_lantern: "ジャック・オ・ランタン",
  pumpkin_seeds: "カボチャの種",
  pumpkin_pie: "パンプキンパイ",
  carrot: "ニンジン",
  golden_carrot: "金のニンジン",
  potato: "ジャガイモ",
  baked_potato: "ベイクドポテト",
  poisonous_potato: "青くなったジャガイモ",
  beetroot: "ビートルート",
  beetroot_seeds: "ビートルートの種",
  beetroot_soup: "ビートルートスープ",
  mushroom_stew: "キノコシチュー",
  rabbit_stew: "ウサギシチュー",
  suspicious_stew: "怪しげなシチュー",
  sweet_berries: "スイートベリー",
  glow_berries: "グロウベリー",
  cocoa_beans: "カカオ豆",
  cookie: "クッキー",
  cake: "ケーキ",
  egg: "卵",
  beef: "生の牛肉",
  cooked_beef: "ステーキ",
  porkchop: "生の豚肉",
  cooked_porkchop: "焼き豚",
  mutton: "生の羊肉",
  cooked_mutton: "焼き羊肉",
  chicken: "生の鶏肉",
  cooked_chicken: "焼き鳥",
  rabbit: "生のウサギ肉",
  cooked_rabbit: "焼きウサギ肉",
  cod: "生ダラ",
  cooked_cod: "焼きダラ",
  salmon: "生연어（生ザケ）",
  cooked_salmon: "焼きザケ",
  tropical_fish: "熱帯魚",
  pufferfish: "フグ",
  rotten_flesh: "腐った肉",
  spider_eye: "クモの目",
  fermented_spider_eye: "発酵したクモの目",

  // 頭・トロフィー
  skull: "頭蓋骨",
  skeleton_skull: "スケルトンの頭蓋骨",
  zombie_head: "ゾンビの頭",
  player_head: "プレイヤーの頭",
  creeper_head: "クリーパーの頭",
  piglin_head: "ピグリンの頭",

  // 花・植物
  dandelion: "タンポポ",
  poppy: "ポピー",
  blue_orchid: "ヒスイラン",
  allium: "アリウム",
  azure_bluet: "ヒナソウ",
  red_tulip: "赤色のチューリップ",
  orange_tulip: "橙色のチューリップ",
  white_tulip: "白色のチューリップ",
  pink_tulip: "桃色のチューリップ",
  oxeye_daisy: "フランスギク",
  cornflower: "ヤグルマギク",
  lily_of_the_valley: "スズラン",
  wither_rose: "ウィザーローズ",
  torchflower: "トーチフラワー",
  torchflower_seeds: "トーチフラワーの種",
  pitcher_plant: "ウツボカズラ",
  pitcher_pod: "ウツボカズラのさや",
  sunflower: "ヒマワリ",
  lilac: "ライラック",
  rose_bush: "バラの低木",
  peony: "ボタン",
  pink_petals: "桜色の花びら",
  spore_blossom: "胞子の花",
  azalea: "ツツジ",
  flowering_azalea: "開花したツツジ",
  mangrove_propagule: "マングローブの芽",
  big_dripleaf: "大きなドリップリーフ",
  small_dripleaf: "小さなドリップリーフ",
  hanging_roots: "垂れ根",
});

/** 木材・菌類の接頭辞変換表 */
const WOOD_PREFIX_MAP = Object.freeze([
  ["dark_oak_", "ダークオーク"],
  ["pale_oak_", "ペールオーク"],
  ["mangrove_", "マングローブ"],
  ["crimson_", "真紅"],
  ["warped_", "歪んだ"],
  ["spruce_", "トウヒ"],
  ["jungle_", "ジャングル"],
  ["acacia_", "アカシア"],
  ["cherry_", "サクラ"],
  ["bamboo_", "竹"],
  ["birch_", "シラカバ"],
  ["oak_", "オーク"],
]);

/** 色名の接頭辞変換表 */
const COLOR_PREFIX_MAP = Object.freeze([
  ["light_blue_", "空色"],
  ["light_gray_", "薄灰色"],
  ["silver_", "薄灰色"],
  ["magenta_", "赤紫色"],
  ["orange_", "橙色"],
  ["yellow_", "黄色"],
  ["purple_", "紫色"],
  ["white_", "白色"],
  ["black_", "黒色"],
  ["brown_", "茶色"],
  ["green_", "緑色"],
  ["lime_", "黄緑色"],
  ["cyan_", "青緑色"],
  ["blue_", "青色"],
  ["pink_", "桃色"],
  ["gray_", "灰色"],
  ["red_", "赤色"],
]);

/** 石材・レンガ系の接頭辞変換表 */
const MATERIAL_PREFIX_MAP = Object.freeze([
  ["cracked_polished_blackstone_brick_", "ひび割れたブラックストーンレンガ"],
  ["polished_blackstone_brick_", "磨かれたブラックストーンレンガ"],
  ["polished_blackstone_", "磨かれたブラックストーン"],
  ["mossy_stone_brick_", "苔むした石レンガ"],
  ["mossy_cobblestone_", "苔むした丸石"],
  ["smooth_red_sandstone_", "滑らかな赤い砂岩"],
  ["cut_red_sandstone_", "研がれた赤い砂岩"],
  ["red_sandstone_", "赤い砂岩"],
  ["smooth_sandstone_", "滑らかな砂岩"],
  ["cut_sandstone_", "研がれた砂岩"],
  ["sandstone_", "砂岩"],
  ["cobbled_deepslate_", "深層岩の丸石"],
  ["polished_deepslate_", "磨かれた深層岩"],
  ["deepslate_brick_", "深層岩レンガ"],
  ["deepslate_tile_", "深層岩タイル"],
  ["deepslate_", "深層"],
  ["polished_granite_", "磨かれた花崗岩"],
  ["polished_diorite_", "磨かれた閃緑岩"],
  ["polished_andesite_", "磨かれた安山岩"],
  ["granite_", "花崗岩"],
  ["diorite_", "閃緑岩"],
  ["andesite_", "安山岩"],
  ["polished_tuff_", "磨かれた凝灰岩"],
  ["tuff_brick_", "凝灰岩レンガ"],
  ["tuff_", "凝灰岩"],
  ["stone_brick_", "石レンガ"],
  ["smooth_stone_", "滑らかな石"],
  ["cobblestone_", "丸石"],
  ["stone_", "石"],
  ["mud_brick_", "泥レンガ"],
  ["red_nether_brick_", "赤いネザーレンガ"],
  ["nether_brick_", "ネザーレンガ"],
  ["end_stone_brick_", "エンドストーンレンガ"],
  ["prismarine_brick_", "プリズマリンレンガ"],
  ["dark_prismarine_", "ダークプリズマリン"],
  ["prismarine_", "プリズマリン"],
  ["smooth_quartz_", "滑らかなクォーツ"],
  ["quartz_", "クォーツ"],
  ["purpur_", "プルプァ"],
  ["blackstone_", "ブラックストーン"],
  ["brick_", "レンガ"],
  ["cut_copper_", "切り込み入りの銅"],
  ["copper_", "銅"],
]);

/** 装備・ツール素材の接頭辞変換表 */
const TOOL_MATERIAL_MAP = Object.freeze([
  ["netherite_", "ネザライトの"],
  ["diamond_", "ダイヤモンドの"],
  ["golden_", "金の"],
  ["gold_", "金の"],
  ["chainmail_", "チェーンの"],
  ["iron_", "鉄の"],
  ["stone_", "石の"],
  ["wooden_", "木の"],
  ["leather_", "革の"],
  ["copper_", "銅の"],
]);

/** 装備・ツールの種類変換表 */
const TOOL_TYPE_MAP = Object.freeze({
  sword: "剣",
  pickaxe: "ツルハシ",
  axe: "斧",
  shovel: "シャベル",
  hoe: "クワ",
  helmet: "ヘルメット",
  cap: "帽子",
  chestplate: "チェストプレート",
  tunic: "上着",
  leggings: "レギンス",
  pants: "ズボン",
  boots: "ブーツ",
  horse_armor: "馬鎧",
});

/** ブロック形状の接尾辞変換表 */
const SHAPE_SUFFIX_MAP = Object.freeze([
  ["double_stone_slab", "二段重ねの石ハーフブロック"],
  ["hanging_sign", "の吊り看板"],
  ["wall_sign", "の壁掛け看板"],
  ["standing_sign", "の看板"],
  ["sign", "の看板"],
  ["pressure_plate", "の感圧板"],
  ["fence_gate", "のフェンスゲート"],
  ["fence", "のフェンス"],
  ["trapdoor", "のトラップドア"],
  ["wooden_door", "のドア"],
  ["door", "のドア"],
  ["stairs", "の階段"],
  ["double_slab", "の二段ハーフブロック"],
  ["slab", "のハーフブロック"],
  ["wall", "の塀"],
  ["button", "のボタン"],
  ["planks", "の板材"],
  ["wood", "の木"],
  ["log", "の原木"],
  ["stem", "の幹"],
  ["hyphae", "の菌糸体"],
  ["sapling", "の苗木"],
  ["leaves", "の葉"],
  ["chest_boat", "のチェスト付きボート"],
  ["boat", "のボート"],
  ["chest_raft", "のチェスト付きイカダ"],
  ["raft", "のイカダ"],
  ["glazed_terracotta", "の彩釉テラコッタ"],
  ["terracotta", "のテラコッタ"],
  ["stained_hardened_clay", "のテラコッタ"],
  ["concrete_powder", "のコンクリートパウダー"],
  ["concrete", "のコンクリート"],
  ["stained_glass_pane", "の色付きガラス板"],
  ["stained_glass", "の色付きガラス"],
  ["shulker_box", "のシュルカーボックス"],
  ["carpet", "のカーペット"],
  ["wool", "の羊毛"],
  ["bed", "のベッド"],
  ["banner", "の旗"],
  ["candle", "のろうそく"],
  ["bundle", "のバンドル"],
  ["dye", "の染料"],
  ["ore", "鉱石"],
  ["grate", "の格子"],
  ["bulb", "の電球"],
  ["chiseled", "模様入りの"],
]);

/** 未知IDフォールバック用の英単語→日本語トークン辞書 */
const TOKEN_FALLBACK_MAP = Object.freeze({
  waxed: "錆止めされた",
  exposed: "風化した",
  weathered: "錆びた",
  oxidized: "酸化した",
  stripped: "樹皮を剥いだ",
  polished: "磨かれた",
  smooth: "滑らかな",
  chiseled: "模様入りの",
  cracked: "ひび割れた",
  mossy: "苔むした",
  cut: "切り込み入りの",
  raw: "原石",
  block: "ブロック",
  bricks: "レンガ",
  brick: "レンガ",
  tiles: "タイル",
  tile: "タイル",
  pillar: "柱",
  ore: "鉱石",
  ingot: "インゴット",
  nugget: "塊",
  shard: "欠片",
  dust: "粉",
  seeds: "種",
  seed: "種",
  spawn: "スポーン",
  egg: "エッグ",
  music: "レコード",
  disc: "盤",
  pottery: "壺の",
  sherd: "欠片",
  smithing: "鍛冶型",
  template: "テンプレート",
  trim: "装飾",
  armor: "防具",
  upgrade: "強化",
  iron: "鉄",
  gold: "金",
  golden: "金",
  copper: "銅",
  diamond: "ダイヤ",
  emerald: "エメラルド",
  lapis: "ラピスラズリ",
  redstone: "レッドストーン",
  coal: "石炭",
  quartz: "クォーツ",
  netherite: "ネザライト",
  amethyst: "アメジスト",
  stone: "石",
  deepslate: "深層岩",
  blackstone: "ブラックストーン",
  tuff: "凝灰岩",
  sandstone: "砂岩",
  prismarine: "プリズマリン",
  nether: "ネザー",
  end: "エンド",
  oak: "オーク",
  spruce: "トウヒ",
  birch: "シラカバ",
  jungle: "ジャングル",
  acacia: "アカシア",
  cherry: "サクラ",
  mangrove: "マングローブ",
  bamboo: "竹",
  crimson: "真紅",
  warped: "歪んだ",
  water: "水",
  lava: "溶岩",
  fire: "炎",
  snow: "雪",
  ice: "氷",
  grass: "草",
  dirt: "土",
  sand: "砂",
  mud: "泥",
  clay: "粘土",
  glass: "ガラス",
  wool: "羊毛",
  carpet: "カーペット",
  bed: "ベッド",
  door: "ドア",
  trapdoor: "トラップドア",
  fence: "フェンス",
  gate: "ゲート",
  stairs: "階段",
  slab: "ハーフブロック",
  wall: "塀",
  button: "ボタン",
  plate: "感圧板",
  sign: "看板",
  chest: "チェスト",
  boat: "ボート",
  minecart: "トロッコ",
  rail: "レール",
  bucket: "バケツ",
  bottle: "瓶",
  potion: "ポーション",
  arrow: "矢",
  bow: "弓",
  sword: "剣",
  pickaxe: "ツルハシ",
  axe: "斧",
  shovel: "シャベル",
  hoe: "クワ",
  helmet: "ヘルメット",
  chestplate: "チェストプレート",
  leggings: "レギンス",
  boots: "ブーツ",
});

/**
 * アイテム・ブロックID（minecraft:xxx 等）を完全な日本語名称に変換する
 * @param {string} typeId
 * @returns {string}
 */
export function translateItemIdToJa(typeId) {
  if (!typeId || typeof typeId !== "string") return "不明なアイテム";
  if (ITEM_JA_DICT[typeId]) return ITEM_JA_DICT[typeId];

  const shortId = typeId.replace(/^minecraft:/, "").toLowerCase();
  if (ITEM_JA_DICT[shortId]) return ITEM_JA_DICT[shortId];

  // スポーンエッグ判定 (xxx_spawn_egg)
  if (shortId.endsWith("_spawn_egg")) {
    const mobKey = shortId.slice(0, -"_spawn_egg".length);
    const mobJa = ENTITY_JA_MAP[mobKey] || translateTokensToJa(mobKey);
    return `${mobJa}のスポーンエッグ`;
  }

  // レコード判定 (music_disc_xxx)
  if (shortId.startsWith("music_disc_")) {
    return "レコード";
  }

  // 壺の欠片判定 (xxx_pottery_sherd)
  if (shortId.endsWith("_pottery_sherd")) {
    return "壺の欠片";
  }

  // 鍛冶型判定 (xxx_armor_trim_smithing_template / netherite_upgrade_smithing_template)
  if (shortId.endsWith("_smithing_template")) {
    if (shortId.startsWith("netherite_upgrade")) {
      return "ネザライト強化の鍛冶型";
    }
    return "防具装飾の鍛冶型";
  }

  // ツール・防具判定 (iron_pickaxe, diamond_sword 等)
  for (const [matPrefix, matJa] of TOOL_MATERIAL_MAP) {
    if (shortId.startsWith(matPrefix)) {
      const rest = shortId.slice(matPrefix.length);
      if (TOOL_TYPE_MAP[rest]) {
        return `${matJa}${TOOL_TYPE_MAP[rest]}`;
      }
    }
  }

  // 銅の錆止め・酸化段階の接頭辞処理
  let workingId = shortId;
  let prefixJa = "";
  if (workingId.startsWith("waxed_")) {
    prefixJa += "錆止めされた";
    workingId = workingId.slice("waxed_".length);
  }
  if (workingId.startsWith("exposed_")) {
    prefixJa += "風化した";
    workingId = workingId.slice("exposed_".length);
  } else if (workingId.startsWith("weathered_")) {
    prefixJa += "錆びた";
    workingId = workingId.slice("weathered_".length);
  } else if (workingId.startsWith("oxidized_")) {
    prefixJa += "酸化した";
    workingId = workingId.slice("oxidized_".length);
  }

  // 樹皮を剥いだ原木・幹の処理 (stripped_xxx)
  if (workingId.startsWith("stripped_")) {
    prefixJa += "樹皮を剥いだ";
    workingId = workingId.slice("stripped_".length);
  }

  if (ITEM_JA_DICT[workingId]) {
    return prefixJa + ITEM_JA_DICT[workingId];
  }

  // 木材系 (oak_stairs, birch_planks 等)
  for (const [woodPrefix, woodJa] of WOOD_PREFIX_MAP) {
    if (workingId.startsWith(woodPrefix)) {
      const suffix = workingId.slice(woodPrefix.length);
      for (const [shapeKey, shapeJa] of SHAPE_SUFFIX_MAP) {
        if (suffix === shapeKey) {
          return `${prefixJa}${woodJa}${shapeJa}`;
        }
      }
    }
  }

  // 色系 (white_wool, red_bed, cyan_terracotta 等)
  for (const [colorPrefix, colorJa] of COLOR_PREFIX_MAP) {
    if (workingId.startsWith(colorPrefix)) {
      const suffix = workingId.slice(colorPrefix.length);
      for (const [shapeKey, shapeJa] of SHAPE_SUFFIX_MAP) {
        if (suffix === shapeKey) {
          return `${prefixJa}${colorJa}${shapeJa}`;
        }
      }
    }
  }

  // 石材・レンガ・鉱石系 (stone_brick_stairs, deepslate_coal_ore 等)
  for (const [matPrefix, matJa] of MATERIAL_PREFIX_MAP) {
    if (workingId.startsWith(matPrefix)) {
      const suffix = workingId.slice(matPrefix.length);
      if (ITEM_JA_DICT[suffix]) {
        return `${prefixJa}${matJa}の${ITEM_JA_DICT[suffix]}`;
      }
      for (const [shapeKey, shapeJa] of SHAPE_SUFFIX_MAP) {
        if (suffix === shapeKey) {
          return `${prefixJa}${matJa}${shapeJa}`;
        }
      }
      if (suffix.endsWith("_ore")) {
        const oreBase = suffix.slice(0, -"_ore".length);
        const oreJa = ITEM_JA_DICT[oreBase] || TOKEN_FALLBACK_MAP[oreBase] || translateTokensToJa(oreBase);
        return `${prefixJa}${matJa}${oreJa}鉱石`;
      }
    }
  }

  // 通常鉱石 (coal_ore, iron_ore 等)
  if (workingId.endsWith("_ore")) {
    const oreBase = workingId.slice(0, -"_ore".length);
    const oreJa = ITEM_JA_DICT[oreBase] || TOKEN_FALLBACK_MAP[oreBase] || translateTokensToJa(oreBase);
    return `${prefixJa}${oreJa}鉱石`;
  }

  // 汎用トークン変換（英語がそのまま残らないように日本語へ変換）
  return prefixJa + translateTokensToJa(workingId);
}

/**
 * アンダースコア区切りの英単語列を日本語へフォールバック変換する
 * @param {string} rawId
 * @returns {string}
 */
function translateTokensToJa(rawId) {
  const parts = rawId.split("_").filter((p) => p.length > 0);
  const translated = [];
  for (const part of parts) {
    if (ITEM_JA_DICT[part]) {
      translated.push(ITEM_JA_DICT[part]);
    } else if (TOKEN_FALLBACK_MAP[part]) {
      translated.push(TOKEN_FALLBACK_MAP[part]);
    } else if (ENTITY_JA_MAP[part]) {
      translated.push(ENTITY_JA_MAP[part]);
    }
  }
  if (translated.length > 0) {
    return translated.join("");
  }
  return "ブロック・アイテム";
}

/**
 * ディメンションIDを日本語表記に変換する
 * @param {string} dimId
 * @returns {string}
 */
export function translateDimensionToJa(dimId) {
  if (!dimId) return "オーバーワールド";
  const key = String(dimId).trim();
  if (DIMENSION_JA_MAP[key]) return DIMENSION_JA_MAP[key];
  const shortKey = key.replace(/^minecraft:/, "");
  return DIMENSION_JA_MAP[shortKey] || key;
}

/**
 * 監査ログ種別（OBTAIN 等）を日本語表記に変換する
 * @param {string} cat
 * @returns {string}
 */
export function translateAuditCategoryToJa(cat) {
  return AUDIT_CATEGORY_JA_MAP[cat] || "記録";
}

/**
 * エンティティ種別IDを日本語表記に変換する
 * @param {string} entityTypeId
 * @returns {string}
 */
export function translateEntityToJa(entityTypeId) {
  if (!entityTypeId) return "不明";
  const short = entityTypeId.replace(/^minecraft:/, "").toLowerCase();
  return ENTITY_JA_MAP[short] || translateItemIdToJa(short);
}

/**
 * 死因コード（EntityDamageCause）または既存の死因文字列を完全な日本語に変換する
 * @param {string} causeRaw
 * @returns {string}
 */
export function translateDeathCauseToJa(causeRaw) {
  if (!causeRaw) return "不明";
  const str = String(causeRaw).trim();
  if (DEATH_CAUSE_JA_MAP[str]) return DEATH_CAUSE_JA_MAP[str];

  // 既存データ "entityAttack (by zombie)" 等の変換
  const byMatch = str.match(/^([a-zA-Z_]+)\s*\(by\s+(.+)\)$/);
  if (byMatch) {
    const baseCause = DEATH_CAUSE_JA_MAP[byMatch[1]] || byMatch[1];
    const attackerRaw = byMatch[2].trim();
    const attackerJa = ENTITY_JA_MAP[attackerRaw] || attackerRaw;
    return `${baseCause}（相手: ${attackerJa}）`;
  }

  return str;
}

/**
 * 監査ログの detail 文字列（過去保存分を含む）を完全な日本語表記に変換する
 * @param {string} detail
 * @returns {string}
 */
export function formatAuditDetailToJa(detail) {
  if (!detail || typeof detail !== "string") return "";

  let s = detail;

  // 1. 過去の Kick 詳細変換: "SINGLE_KICK (by xxx)" / "PERMANENT_BAN (by xxx)"
  s = s.replace(/PERMANENT_BAN\s*\(by\s+([^)]+)\)/g, "永久追放（実行者: $1）");
  s = s.replace(/SINGLE_KICK\s*\(by\s+([^)]+)\)/g, "単発追放（実行者: $1）");

  // 2. 過去の死因詳細変換: "cause: xxx"
  if (s.startsWith("cause:")) {
    const rawCause = s.slice("cause:".length).trim();
    return `死因: ${translateDeathCauseToJa(rawCause)}`;
  }

  // 3. 過去のアクション補足英語を日本語化
  s = s.replace(/\(placed\)/g, "（設置）");
  s = s.replace(/\(place\)/g, "（設置）");
  s = s.replace(/\(use\)/g, "（使用）");
  s = s.replace(/\(opened\)/g, "（開操作）");
  s = s.replace(/\(held:\s*empty_hand\)/g, "（素手操作）");
  s = s.replace(/\(held:\s*([a-z0-9_:]+)\)/gi, (_, id) => `（手持ち: ${translateItemIdToJa(id)}）`);
  s = s.replace(/->\s*([a-z0-9_:]+)/gi, (_, id) => `→ ${translateEntityToJa(id)}`);

  // 4. "minecraft:xxx" 形式のアイテムIDをすべて日本語アイテム名に置換
  s = s.replace(/minecraft:[a-z0-9_]+/gi, (match) => translateItemIdToJa(match));

  return s;
}
