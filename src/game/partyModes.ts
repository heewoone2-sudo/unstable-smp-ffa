import type {
  ActiveArenaEventState,
  ActiveBuffState,
  ArenaBuffKind,
  ArenaEventKind,
  BotDifficulty,
  CustomBotSlot,
  CustomPartyMode,
  EliminationAnimKind,
  GameModeId,
  LoadoutItemConfig,
  PlayerTeam,
  RoomMode,
  SixTuple,
  WeaponSlotId,
} from './types';
import { CHARACTERS } from './characters';

export const ENEMY_OUTLINE_HEX = 0xff1744;

export interface BotDifficultyConfig {
  speedMult: number;
  attackCooldownMult: number;
  aimJitter: number;
  shieldBlockChance: number;
  telegraphTime: number;
  allowAerialMace: boolean;
  healThreshold: number;
  reactionDelay: number;
}

export function getBotDifficultyConfig(difficulty: BotDifficulty = 'medium'): BotDifficultyConfig {
  switch (difficulty) {
    case 'easy':
      return {
        speedMult: 0.82,
        attackCooldownMult: 1.45,
        aimJitter: 0.35,
        shieldBlockChance: 0.15,
        telegraphTime: 0.52,
        allowAerialMace: false,
        healThreshold: 0.25,
        reactionDelay: 0.35,
      };
    case 'hard':
      return {
        speedMult: 1.12,
        attackCooldownMult: 0.82,
        aimJitter: 0.03,
        shieldBlockChance: 0.65,
        telegraphTime: 0.22,
        allowAerialMace: true,
        healThreshold: 0.5,
        reactionDelay: 0.08,
      };
    case 'medium':
    default:
      return {
        speedMult: 1.0,
        attackCooldownMult: 1.0,
        aimJitter: 0.14,
        shieldBlockChance: 0.4,
        telegraphTime: 0.36,
        allowAerialMace: true,
        healThreshold: 0.4,
        reactionDelay: 0.18,
      };
  }
}

/**
 * When on fire and touching water: immediately extinguishes burn and heals HP.
 */
export function computeWaterBurnHealing(
  isBurning: boolean,
  isInWater: boolean,
  currentHp: number,
  maxHp: number,
  healAmount = 28
): { shouldHeal: boolean; nextHp: number; healDelta: number } {
  if (isBurning && isInWater) {
    const nextHp = Math.min(maxHp, currentHp + healAmount);
    return {
      shouldHeal: true,
      nextHp,
      healDelta: Math.max(0, nextHp - currentHp),
    };
  }
  return {
    shouldHeal: false,
    nextHp: currentHp,
    healDelta: 0,
  };
}

/**
 * Fall Guys-style Kill Knockout Round Configuration (3 minutes = 180s per round).
 */
export interface KnockoutRoundInfo {
  round: number;
  quota: number;
  durationSec: number;
}

export function getKnockoutRoundInfo(round: number): KnockoutRoundInfo {
  const safeRound = Math.max(1, Math.floor(round));
  if (safeRound === 1) return { round: 1, quota: 1, durationSec: 180 };
  if (safeRound === 2) return { round: 2, quota: 2, durationSec: 180 };
  if (safeRound === 3) return { round: 3, quota: 3, durationSec: 180 };
  return { round: safeRound, quota: Math.min(5, safeRound), durationSec: 180 };
}

export function shouldEndMatchOnKillLimit(partyMode: CustomPartyMode, mode: GameModeId): boolean {
  if (mode === 'online_world' || mode === 'link_duel') return false;
  if (partyMode === 'knockout' || partyMode === 'boss_raid') return false;
  return true;
}

export interface KnockoutMutatorConfig {
  id: 'opening_brawl' | 'sky_leap' | 'overdrive_clash' | 'final_rumble';
  title: string;
  shortDesc: string;
  accent: string;
  gravityMult: number;
  jumpMult: number;
  cooldownRateMult: number;
  damageMult: number;
}

export const KNOCKOUT_MUTATORS: KnockoutMutatorConfig[] = [
  {
    id: 'opening_brawl',
    title: '오프닝 난투',
    shortDesc: '기본 규칙 · 1킬 이상 달성 시 생존',
    accent: '#f59e0b',
    gravityMult: 1.0,
    jumpMult: 1.0,
    cooldownRateMult: 1.0,
    damageMult: 1.0,
  },
  {
    id: 'sky_leap',
    title: '스카이 점프 서지',
    shortDesc: '도약 +22% · 중력 18% 완화',
    accent: '#38bdf8',
    gravityMult: 0.82,
    jumpMult: 1.22,
    cooldownRateMult: 1.15,
    damageMult: 1.08,
  },
  {
    id: 'overdrive_clash',
    title: '쿨다운 오버드라이브',
    shortDesc: '전 스킬 쿨타임 1.65배 가속',
    accent: '#c084fc',
    gravityMult: 0.94,
    jumpMult: 1.08,
    cooldownRateMult: 1.65,
    damageMult: 1.12,
  },
  {
    id: 'final_rumble',
    title: '파이널 럼블 · 각성전',
    shortDesc: '화력 +22% · 쿨타임 1.8배 가속',
    accent: '#fb7185',
    gravityMult: 0.88,
    jumpMult: 1.16,
    cooldownRateMult: 1.8,
    damageMult: 1.22,
  },
];

export function pickKnockoutMutator(round: number): KnockoutMutatorConfig {
  const safeRound = Math.max(1, Math.floor(round));
  if (safeRound === 1) return KNOCKOUT_MUTATORS[0];
  if (safeRound === 2) return KNOCKOUT_MUTATORS[1];
  if (safeRound === 3) return KNOCKOUT_MUTATORS[2];
  return KNOCKOUT_MUTATORS[3];
}

export interface BountyCandidate {
  id: string;
  name: string;
  kills: number;
  alive: boolean;
  eliminated?: boolean;
  isLocal?: boolean;
}

export function pickBountyLeader(candidates: ReadonlyArray<BountyCandidate>): {
  id: string;
  name: string;
  kills: number;
} | null {
  let best: BountyCandidate | null = null;
  for (const c of candidates) {
    if (c.isLocal || !c.alive || c.eliminated || c.kills < 2) continue;
    if (!best || c.kills > best.kills) {
      best = c;
    }
  }
  return best ? { id: best.id, name: best.name, kills: best.kills } : null;
}

export interface KnockoutEliminationSpec {
  kind: EliminationAnimKind;
  isRare: boolean;
  label: string;
  feedColor: string;
  durationSec: number;
}

const NORMAL_ELIM_POOL: KnockoutEliminationSpec[] = [
  {
    kind: 'trapdoor_abyss',
    isRare: false,
    label: '심연 트랩도어 추락',
    feedColor: '#f97316',
    durationSec: 2.0,
  },
  {
    kind: 'sky_launch_plunge',
    isRare: false,
    label: '초고공 덤블링 사출',
    feedColor: '#fb7185',
    durationSec: 2.1,
  },
  {
    kind: 'meteor_knockback',
    isRare: false,
    label: '메테오 장외 방출',
    feedColor: '#f59e0b',
    durationSec: 2.0,
  },
];

const RARE_ELIM_POOL: KnockoutEliminationSpec[] = [
  {
    kind: 'ufo_abduction_drop',
    isRare: true,
    label: '[희귀 연출] 외계 UFO 납치 후 낙하!',
    feedColor: '#22d3ee',
    durationSec: 2.4,
  },
  {
    kind: 'anvil_yeet_pancake',
    isRare: true,
    label: '[희귀 연출] 대모루 압착 팬케이크 발사!',
    feedColor: '#facc15',
    durationSec: 2.35,
  },
];

export function pickKnockoutEliminationAnim(rng: () => number = Math.random): KnockoutEliminationSpec {
  const roll = rng();
  if (roll < 0.12) {
    const idx = Math.floor(rng() * RARE_ELIM_POOL.length) % RARE_ELIM_POOL.length;
    return RARE_ELIM_POOL[idx];
  }
  const idx = Math.floor(rng() * NORMAL_ELIM_POOL.length) % NORMAL_ELIM_POOL.length;
  return NORMAL_ELIM_POOL[idx];
}

export const MAX_ELYTRA_FLIGHT_SEC = 10;

export function stepElytraFlightLimit(
  isGliding: boolean,
  remainingSec: number,
  dt: number
): { stillGliding: boolean; nextRemainingSec: number; expired: boolean } {
  if (!isGliding) {
    return { stillGliding: false, nextRemainingSec: 0, expired: false };
  }
  const next = Math.max(0, remainingSec - Math.max(0, dt));
  if (next <= 0) {
    return { stillGliding: false, nextRemainingSec: 0, expired: true };
  }
  return { stillGliding: true, nextRemainingSec: next, expired: false };
}

/**
 * Random Arsenal Loadout: strictly 1 Offensive Weapon + 1 Healing Item + 1 Mobility Item (slots 4-6 empty).
 */
const ARSENAL_PRESETS: Array<{ name: string; weaponIds: [WeaponSlotId, WeaponSlotId, WeaponSlotId] }> = [
  {
    name: '천공 철퇴 세트',
    weaponIds: ['mace', 'gapple', 'wind_charge'],
  },
  {
    name: '정밀 저격 세트',
    weaponIds: ['bow', 'potion', 'ender_pearl'],
  },
  {
    name: '삼지창 기동 세트',
    weaponIds: ['trident', 'gapple', 'shadow_step'],
  },
  {
    name: '화염 돌풍 세트',
    weaponIds: ['fire_sword', 'potion', 'wind_charge'],
  },
  {
    name: '3연발 암살 세트',
    weaponIds: ['crossbow', 'gapple', 'ender_pearl'],
  },
  {
    name: '폭파 돌격 세트',
    weaponIds: ['tnt_charge', 'potion', 'wind_charge'],
  },
];

export function getRandomArsenalLoadout(cycleIdx: number): {
  name: string;
  loadout: SixTuple<LoadoutItemConfig | null>;
} {
  const preset = ARSENAL_PRESETS[Math.abs(cycleIdx) % ARSENAL_PRESETS.length];
  const wMap = new Map<WeaponSlotId, LoadoutItemConfig>();
  for (const prof of Object.values(CHARACTERS)) {
    for (const item of prof.loadout) {
      if (!wMap.has(item.id)) {
        wMap.set(item.id, item);
      }
    }
  }

  const fallback = CHARACTERS.wemmbu.loadout[0];
  const slot1 = { ...(wMap.get(preset.weaponIds[0]) ?? fallback), keyHint: '1' };
  const slot2 = { ...(wMap.get(preset.weaponIds[1]) ?? CHARACTERS.wemmbu.loadout[5]), keyHint: '2' };
  const slot3 = { ...(wMap.get(preset.weaponIds[2]) ?? CHARACTERS.wemmbu.loadout[2]), keyHint: '3' };
  return {
    name: preset.name,
    loadout: [slot1, slot2, slot3, null, null, null],
  };
}

/**
 * Resolves the effective room mode for team-damage & outline checks across all game modes.
 * Ensures that non-custom modes and FFA/Knockout party modes always treat opponents as FFA enemies.
 */
export function resolveEffectiveRoomMode(
  mode: GameModeId,
  roomMode: RoomMode,
  partyMode: CustomPartyMode = 'classic'
): RoomMode {
  if (mode !== 'multiplayer') return 'ffa';
  if (partyMode === 'knockout') return 'ffa';
  return roomMode === 'team' ? 'team' : 'ffa';
}

/**
 * Determines whether a target should be treated as hostile (receives bright enemy outline & takes damage).
 */
export function isHostileTarget(
  roomMode: RoomMode,
  viewerTeam: PlayerTeam,
  targetTeam: PlayerTeam
): boolean {
  if (roomMode !== 'team') return true;
  if (viewerTeam === 'ffa' || targetTeam === 'ffa') return true;
  return viewerTeam !== targetTeam;
}

/**
 * Normalizes drag-and-dropped custom bots so every bot has a valid team for the selected roomMode.
 */
export function normalizeCustomBots(bots: CustomBotSlot[], roomMode: RoomMode): CustomBotSlot[] {
  return bots.slice(0, 8).map((bot, idx) => ({
    ...bot,
    team:
      roomMode === 'team'
        ? bot.team === 'red' || bot.team === 'blue'
          ? bot.team
          : idx % 2 === 0
            ? 'red'
            : 'blue'
        : 'ffa',
  }));
}

/**
 * In One-Shot Instagib mode, any direct damage deals guaranteed lethal damage.
 */
export function computeOneShotDamage(rawDamage: number, isOneShotMode: boolean): number {
  if (isOneShotMode && rawDamage > 0) {
    return 350;
  }
  return rawDamage;
}

export interface ArenaBuffDefinition {
  kind: ArenaBuffKind;
  label: string;
  shortDesc: string;
  color: string;
  hex: number;
  durationSec: number;
}

export const ARENA_BUFF_DEFINITIONS: Record<ArenaBuffKind, ArenaBuffDefinition> = {
  berserk: {
    kind: 'berserk',
    label: '광폭화 코어',
    shortDesc: '공격력 +35%',
    color: '#ff2e54',
    hex: 0xff2e54,
    durationSec: 12,
  },
  haste: {
    kind: 'haste',
    label: '신속 질주 코어',
    shortDesc: '이속 +30% · 도약 강화',
    color: '#06b6d4',
    hex: 0x06b6d4,
    durationSec: 12,
  },
  aegis: {
    kind: 'aegis',
    label: '성역 보호막 코어',
    shortDesc: 'HP +35 · 보호막 +25',
    color: '#10b981',
    hex: 0x10b981,
    durationSec: 10,
  },
  overcharge: {
    kind: 'overcharge',
    label: '오버차지 코어',
    shortDesc: '쿨타임 초기화 · 가속 2배',
    color: '#a855f7',
    hex: 0xa855f7,
    durationSec: 9,
  },
};

export const ARENA_BUFF_ORDER: ArenaBuffKind[] = ['berserk', 'haste', 'aegis', 'overcharge'];

export interface CombatBuffMultipliers {
  damageMult: number;
  speedMult: number;
  jumpMult: number;
  cooldownRateMult: number;
}

export function computeBuffMultipliers(
  activeBuffs: ReadonlyArray<Pick<ActiveBuffState, 'kind' | 'remainingSec'>>
): CombatBuffMultipliers {
  let damageMult = 1.0;
  let speedMult = 1.0;
  let jumpMult = 1.0;
  let cooldownRateMult = 1.0;

  for (const b of activeBuffs) {
    if (b.remainingSec <= 0) continue;
    if (b.kind === 'berserk') {
      damageMult = Math.max(damageMult, 1.35);
    } else if (b.kind === 'haste') {
      speedMult = Math.max(speedMult, 1.3);
      jumpMult = Math.max(jumpMult, 1.18);
      cooldownRateMult = Math.max(cooldownRateMult, 1.35);
    } else if (b.kind === 'overcharge') {
      cooldownRateMult = Math.max(cooldownRateMult, 2.0);
      damageMult = Math.max(damageMult, 1.12);
    }
  }

  return { damageMult, speedMult, jumpMult, cooldownRateMult };
}

export interface ArenaSurgeEventConfig {
  kind: ArenaEventKind;
  title: string;
  subtitle: string;
  accent: string;
  durationSec: number;
  gravityMult: number;
  jumpMult: number;
  cooldownRateMult: number;
  critBonusMult: number;
  killHealBonus: number;
}

export const ARENA_SURGE_EVENTS: Record<ArenaEventKind, ArenaSurgeEventConfig> = {
  low_gravity: {
    kind: 'low_gravity',
    title: '저중력 스카이 서지',
    subtitle: '중력 42% 감소 · 공중 철퇴 강타 및 활공 기동 강화',
    accent: '#38bdf8',
    durationSec: 18,
    gravityMult: 0.58,
    jumpMult: 1.24,
    cooldownRateMult: 1.15,
    critBonusMult: 1.15,
    killHealBonus: 15,
  },
  hyper_cooldown: {
    kind: 'hyper_cooldown',
    title: '오버드라이브 난타전',
    subtitle: '모든 무기·이동기 쿨타임 회복 속도 2.2배 가속',
    accent: '#c084fc',
    durationSec: 18,
    gravityMult: 1.0,
    jumpMult: 1.05,
    cooldownRateMult: 2.2,
    critBonusMult: 1.0,
    killHealBonus: 20,
  },
  bounty_rush: {
    kind: 'bounty_rush',
    title: '황금 사냥 러시',
    subtitle: '치명타 피해 +25% · 적 처치 시 즉시 체력 +35 회복',
    accent: '#f59e0b',
    durationSec: 18,
    gravityMult: 1.0,
    jumpMult: 1.0,
    cooldownRateMult: 1.25,
    critBonusMult: 1.25,
    killHealBonus: 35,
  },
  berserk_frenzy: {
    kind: 'berserk_frenzy',
    title: '광폭 아레나 피버',
    subtitle: '화력 +25% · 쿨타임 1.45배 · 처치 시 +28 HP 회복',
    accent: '#f43f5e',
    durationSec: 18,
    gravityMult: 0.92,
    jumpMult: 1.1,
    cooldownRateMult: 1.45,
    critBonusMult: 1.25,
    killHealBonus: 28,
  },
};

export const ARENA_EVENT_ORDER: ArenaEventKind[] = [
  'low_gravity',
  'hyper_cooldown',
  'bounty_rush',
  'berserk_frenzy',
];

export function pickArenaSurgeEvent(cycleIdx: number): ArenaSurgeEventConfig {
  const kind = ARENA_EVENT_ORDER[Math.abs(Math.floor(cycleIdx)) % ARENA_EVENT_ORDER.length];
  return ARENA_SURGE_EVENTS[kind];
}

export function computeSurgeModifiers(
  activeEvent: Pick<ActiveArenaEventState, 'kind' | 'remainingSec'> | null | undefined
): {
  gravityMult: number;
  jumpMult: number;
  cooldownRateMult: number;
  critBonusMult: number;
  killHealBonus: number;
} {
  if (!activeEvent || activeEvent.remainingSec <= 0) {
    return {
      gravityMult: 1.0,
      jumpMult: 1.0,
      cooldownRateMult: 1.0,
      critBonusMult: 1.0,
      killHealBonus: 12,
    };
  }
  const cfg = ARENA_SURGE_EVENTS[activeEvent.kind];
  return {
    gravityMult: cfg.gravityMult,
    jumpMult: cfg.jumpMult,
    cooldownRateMult: cfg.cooldownRateMult,
    critBonusMult: cfg.critBonusMult,
    killHealBonus: cfg.killHealBonus,
  };
}

