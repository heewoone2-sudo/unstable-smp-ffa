export type GameScreenState = 'title' | 'playing' | 'paused' | 'gameover';

export type GameModeId = 'online_world' | 'link_duel' | 'ffa' | 'multiplayer';

export type CameraViewMode = 'shiftlock' | 'firstperson' | 'free';

export type CharacterId =
  | 'wemmbu'
  | 'flamefrags'
  | 'parrotx2'
  | 'spokeishere'
  | 'manepear'
  | 'clownpierce'
  | 'princezam'
  | 'jumperwho'
  | 'minutetech';

export type WeaponSlotId =
  | 'sword'
  | 'fire_sword'
  | 'spear'
  | 'axe'
  | 'mace'
  | 'trident'
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

export interface LoadoutItemMeta {
  id: WeaponSlotId;
  name: string;
  role: string;
  cooldown: number;
  maxCharges?: number;
  startCharges?: number;
  useDelay?: number;
}

export type SixTuple<T> = [T, T, T, T, T, T];

export type AiPolicy = 'wind_diver' | 'sword_duelist' | 'pearl_flanker' | 'bruiser_charger';

export interface CharacterProfile {
  id: CharacterId;
  name: string;
  role: string;
  titleKr: string;
  summary: string;
  maxHp: number;
  speedMult: number;
  swordMult: number;
  maceMult: number;
  windCdMult: number;
  pearlCdMult: number;
  primaryColor: string;
  trimColor: string;
  skinColor: string;
  visorColor: string;
  headgear: 'crown' | 'hood' | 'visor' | 'headband' | 'horns';
  signatureLabel: string;
  loadout: SixTuple<LoadoutItemMeta>;
}

export interface ArenaBlock {
  id: string;
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  d: number;
  kind: 'deepslate' | 'obsidian' | 'gold' | 'amethyst' | 'stone' | 'turf' | 'player_block';
  isLandmark?: boolean;
  ownerId?: string;
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

export interface RoomPeerInfo {
  id: string;
  name: string;
  characterId: CharacterId;
  kills: number;
  deaths: number;
  hp: number;
  maxHp: number;
  isHost: boolean;
}

export interface MultiplayerHudState {
  status: 'idle' | 'connecting' | 'lobby' | 'playing';
  roomKind: 'global' | 'link_duel' | 'private';
  roomCode: string | null;
  selfId: string | null;
  isHost: boolean;
  playerName: string;
  includeBots: boolean;
  linkQueueing: boolean;
  peers: RoomPeerInfo[];
  error: string | null;
}

export interface HudSnapshot {
  screen: GameScreenState;
  mode: GameModeId;
  characterId: CharacterId;
  hp: number;
  maxHp: number;
  absorption: number;
  stamina: number;
  activeSlot: number;
  loadout: SixTuple<LoadoutItemMeta>;
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
  isBurning: boolean;
  isInWater: boolean;
  cameraMode: CameraViewMode;
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
  killFeed: Array<{ id: number; text: string; color: string }>;
  hitmarkerTimer: number;
  hitmarkerCrit: boolean;
  lastHitText: string;
  fallHeightReady: number;
  muted: boolean;
  multiplayer: MultiplayerHudState;
}

export interface FighterStats {
  hp: number;
  maxHp: number;
  absorption: number;
  isBlocking: boolean;
}
