import type {
  BotDifficulty,
  CustomBotSlot,
  CustomPartyMode,
  LoadoutItemConfig,
  PlayerTeam,
  RoomMode,
  SixTuple,
  WeaponSlotId,
} from './types';
import { CHARACTERS } from './characters';

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
 * Fall Guys-style Kill Knockout Round Configuration.
 */
export interface KnockoutRoundInfo {
  round: number;
  quota: number;
  durationSec: number;
}

export function getKnockoutRoundInfo(round: number): KnockoutRoundInfo {
  const safeRound = Math.max(1, Math.floor(round));
  if (safeRound === 1) return { round: 1, quota: 1, durationSec: 45 };
  if (safeRound === 2) return { round: 2, quota: 2, durationSec: 35 };
  if (safeRound === 3) return { round: 3, quota: 3, durationSec: 30 };
  return { round: safeRound, quota: Math.min(5, safeRound), durationSec: 25 };
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
 * Determines whether a target should be treated as hostile (receives red enemy outline & takes damage).
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
