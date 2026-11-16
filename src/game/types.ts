export type CharacterId =
  | 'wemmbu'
  | 'flamefrags'
  | 'parrotx2'
  | 'spokeishere'
  | 'manepear'
  | 'clownpierce'
  | 'princezam'
  | 'jumperwho'
  | 'minutetech'
  | 'kestrel'
  | 'vexor';

export type GameModeId = 'online_world' | 'ffa' | 'link_duel' | 'multiplayer';
export type RoomMode = 'ffa' | 'team';
export type PlayerTeam = 'red' | 'blue' | 'ffa';
export type MapId =
  | 'container_yard'
  | 'emerald_citadel'
  | 'sky_dock'
  | 'nether_foundry'
  | 'cyber_nexus'
  | 'frost_bastion'
  | 'ancient_temple'
  | 'orbital_reactor';
export type CameraMode = 'firstperson' | 'shiftlock' | 'free';
export type CameraViewMode = CameraMode;
export type GraphicsQuality = 'low' | 'medium' | 'high';
export type BotDifficulty = 'easy' | 'medium' | 'hard';
export type CustomPartyMode =
  | 'classic'
  | 'knockout'
  | 'boss_raid'
  | 'random_arsenal'
  | 'one_shot';
export type AiPolicy =
  | 'wind_diver'
  | 'sword_duelist'
  | 'pearl_flanker'
  | 'bruiser_charger'
  | 'ranged_kite';

export interface CustomBotSlot {
  id: string;
  name: string;
  characterId: CharacterId;
  team: PlayerTeam;
}

export type WeaponSlotId =
  | 'sword'
  | 'fire_sword'
  | 'spear'
  | 'axe'
  | 'mace'
  | 'trident'
  | 'bow'
  | 'crossbow'
  | 'wind_charge'
  | 'cobweb'
  | 'tnt_charge'
  | 'ender_pearl'
  | 'shadow_step'
  | 'gapple'
  | 'potion'
  | 'lava_bucket'
  | 'water_bucket'
  | 'build_block';

export interface LoadoutItemConfig {
  id: WeaponSlotId;
  name: string;
  shortName: string;
  role?: string;
  keyHint: string;
  cooldown: number;
  useDelay?: number;
  maxCharges?: number;
  startCharges?: number;
  description: string;
  accent: string;
  damage?: number;
  range?: number;
}

export interface CharacterProfile {
  id: CharacterId;
  name: string;
  titleKr: string;
  role: string;
  signatureLabel: string;
  summary: string;
  archetype:
    | 'mace_diver'
    | 'brawler'
    | 'spear_master'
    | 'trickster'
    | 'heavy_tank'
    | 'assassin'
    | 'pyromancer'
    | 'acrobat'
    | 'tactician'
    | 'ranged_sniper'
    | 'ranged_skirmisher';
  primaryColor: string;
  trimColor: string;
  visorColor: string;
  skinColor: string;
  headgear: 'crown' | 'hood' | 'visor' | 'headband' | 'horns';
  maxHp: number;
  speedMult: number;
  damageMult: number;
  loadout: [
    LoadoutItemConfig,
    LoadoutItemConfig,
    LoadoutItemConfig,
    LoadoutItemConfig,
    LoadoutItemConfig,
    LoadoutItemConfig
  ];
}

export interface GameSettings {
  cameraMode: CameraMode;
  fov: number;
  sensitivity: number;
  invertY: boolean;
  masterVolume: number;
  muted: boolean;
  graphicsQuality: GraphicsQuality;
  particlesEnabled: boolean;
  showFps: boolean;
  mobileAutoSprint: boolean;
}

export interface RoomPeerInfo {
  id: string;
  name: string;
  characterId: CharacterId;
  team: PlayerTeam;
  kills: number;
  deaths: number;
  hp: number;
  maxHp: number;
  isHost: boolean;
  votedMap?: MapId;
}

export interface MultiplayerHudState {
  status: 'idle' | 'connecting' | 'lobby' | 'playing';
  roomKind: 'global' | 'link_duel' | 'private';
  roomMode: RoomMode;
  roomCode: string | null;
  selfId: string | null;
  isHost: boolean;
  playerName: string;
  includeBots: boolean;
  customBots?: CustomBotSlot[];
  botDifficulty?: BotDifficulty;
  partyMode?: CustomPartyMode;
  linkQueueing: boolean;
  selectedMap: MapId;
  mapVotes: Record<MapId, number>;
  targetKills: number;
  mapStartedAt?: number;
  peers: RoomPeerInfo[];
  error: string | null;
}

export interface ChatEntry {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  team?: PlayerTeam;
}

export interface ScoreboardEntry {
  id: string;
  name: string;
  characterId: CharacterId;
  team: PlayerTeam;
  kills: number;
  deaths: number;
  hp: number;
  maxHp: number;
  isLocal: boolean;
  isBot: boolean;
}

export type ScreenState = 'title' | 'playing' | 'paused' | 'gameover';
export type GameScreenState = ScreenState;

export type SixTuple<T> = [T, T, T, T, T, T];

export interface KillFeedEntry {
  id: number;
  killerName: string;
  killerTeam?: PlayerTeam;
  victimName: string;
  victimTeam?: PlayerTeam;
  weaponId?: WeaponSlotId;
  text?: string;
  color: string;
}

export interface HudSnapshot {
  screen: ScreenState;
  mode: GameModeId;
  partyMode: CustomPartyMode;
  botDifficulty: BotDifficulty;
  isSpectating: boolean;
  spectatorTargetName?: string;
  spectatorTargetTeam?: PlayerTeam;
  spectatorTargetHp?: number;
  spectatorTargetMaxHp?: number;
  spectatorTargetKills?: number;
  spectatorViewMode: 'follow' | 'free';
  knockoutRound?: number;
  knockoutRemainingSec?: number;
  knockoutQuota?: number;
  knockoutAliveCount?: number;
  bossCurrentHp?: number;
  bossMaxHp?: number;
  bossName?: string;
  characterId: CharacterId;
  roomMode: RoomMode;
  playerTeam: PlayerTeam;
  currentMapId: MapId;
  mapTimeRemaining: number;
  hp: number;
  maxHp: number;
  absorption: number;
  stamina: number;
  activeSlot: number;
  loadout: SixTuple<LoadoutItemConfig | null>;
  slotCooldowns: SixTuple<number>;
  slotMaxCooldowns: SixTuple<number>;
  slotCharges: SixTuple<number>;
  slotMaxCharges: SixTuple<number>;
  elytraCooldown: number;
  elytraMaxCooldown: number;
  isGliding: boolean;
  isBlocking: boolean;
  isStealthed: boolean;
  isInCobweb: boolean;
  cobwebBreakProgress: number;
  isBurning: boolean;
  isInWater: boolean;
  cameraMode: CameraMode;
  shiftLock: boolean;
  pointerLocked: boolean;
  kills: number;
  deaths: number;
  targetKills: number;
  wave: number;
  aliveEnemies: number;
  comboStreak: number;
  maxSmashHeight: number;
  damageDealt: number;
  elapsedTime: number;
  outcome: 'victory' | 'defeat' | null;
  calloutText: string;
  calloutAccent: string;
  calloutTimer: number;
  multiKillStreak: number;
  multiKillText: string;
  multiKillTimer: number;
  ceremonyActive: boolean;
  ceremonyTitle: string;
  ceremonySubtitle: string;
  killFeed: KillFeedEntry[];
  chatMessages: ChatEntry[];
  scoreboard: ScoreboardEntry[];
  hitmarkerTimer: number;
  hitmarkerCrit: boolean;
  lastHitText: string;
  fallHeightReady: number;
  muted: boolean;
  fps: number;
  settings: GameSettings;
  multiplayer: MultiplayerHudState;
}

export type ArenaBlockKind =
  | 'deepslate'
  | 'obsidian'
  | 'gold'
  | 'amethyst'
  | 'stone'
  | 'turf'
  | 'player_block'
  | 'container_red'
  | 'container_blue'
  | 'container_amber'
  | 'container_teal'
  | 'asphalt'
  | 'wood_crate'
  | 'basalt'
  | 'crimson_brick'
  | 'cyber_panel'
  | 'ice_brick'
  | 'sandstone'
  | 'reactor_core';

export interface ArenaBlock {
  id: string;
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  d: number;
  kind: ArenaBlockKind;
  isDynamic?: boolean;
  isLandmark?: boolean;
  ownerId?: string;
  hp?: number;
}

export interface CobwebZone {
  x: number;
  y: number;
  z: number;
  radius: number;
  height: number;
}

export interface HazardPoolZone {
  id: string;
  kind: 'lava' | 'water';
  x: number;
  y: number;
  z: number;
  radius: number;
}

export interface JumpPadZone {
  id: string;
  x: number;
  y: number;
  z: number;
  radius: number;
  boostY: number;
  boostForward?: number;
  color: string;
}

export interface FighterStats {
  hp: number;
  maxHp: number;
  absorption: number;
  isBlocking: boolean;
}
