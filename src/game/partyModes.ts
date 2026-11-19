import type {
  ActiveArenaEventState,
  ActiveBuffState,
  ArenaBuffKind,
  ArenaEventKind,
  BossVariantId,
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
 * Fall Guys-style Kill Knockout Round Configuration (1 minute = 60s per round).
 */
export interface KnockoutRoundInfo {
  round: number;
  quota: number;
  durationSec: number;
}

export const MAX_KNOCKOUT_ROUNDS = 3;

export function getKnockoutRoundInfo(round: number): KnockoutRoundInfo {
  const safeRound = Math.max(1, Math.min(MAX_KNOCKOUT_ROUNDS, Math.floor(round)));
  if (safeRound === 1) return { round: 1, quota: 1, durationSec: 60 };
  if (safeRound === 2) return { round: 2, quota: 2, durationSec: 60 };
  return { round: 3, quota: 3, durationSec: 60 };
}

export function shouldEndMatchOnKillLimit(partyMode: CustomPartyMode, mode: GameModeId): boolean {
  if (mode === 'online_world' || mode === 'link_duel') return false;
  if (
    partyMode === 'knockout' ||
    partyMode === 'boss_raid' ||
    partyMode === 'spike_defuse' ||
    partyMode === 'battle_royale'
  ) {
    return false;
  }
  return true;
}

export interface KnockoutRoundCandidate {
  id: string;
  kills: number;
  hp: number;
}

export interface KnockoutFinalContender {
  id: string;
  kills: number;
  hp: number;
  isLocal?: boolean;
}

/**
 * Resolves the Round 3 Final Showdown so Knockout always crowns a single Champion
 * and never loops endlessly into Round 4+.
 */
export function resolveKnockoutFinalShowdown(
  contenders: ReadonlyArray<KnockoutFinalContender>
): { championId: string | null; eliminatedIds: Set<string> } {
  if (contenders.length === 0) {
    return { championId: null, eliminatedIds: new Set<string>() };
  }
  const sorted = contenders.slice().sort((a, b) => {
    if (b.kills !== a.kills) return b.kills - a.kills;
    if (b.hp !== a.hp) return b.hp - a.hp;
    return (b.isLocal ? 1 : 0) - (a.isLocal ? 1 : 0);
  });
  const championId = sorted[0]?.id ?? null;
  const eliminatedIds = new Set<string>();
  for (let i = 1; i < sorted.length; i++) {
    eliminatedIds.add(sorted[i].id);
  }
  return { championId, eliminatedIds };
}

/**
 * Resolves which AI rivals are eliminated at the end of a Knockout round.
 * Guarantees multi-round progression (R1 -> R2 -> R3+) when enough contenders remain
 * so matches never unexpectedly end in Round 1 due to every rival sitting at 0 kills.
 */
export function selectKnockoutRoundEliminations(
  round: number,
  quota: number,
  candidates: ReadonlyArray<KnockoutRoundCandidate>
): { eliminatedIds: Set<string>; survivorIds: Set<string> } {
  const safeRound = Math.max(1, Math.floor(round));
  const minSurvivingRivals =
    safeRound === 1
      ? Math.min(candidates.length, 3)
      : safeRound === 2
        ? Math.min(candidates.length, 2)
        : 0;

  const qualified = candidates.filter((c) => c.kills >= quota);
  const belowQuota = candidates
    .filter((c) => c.kills < quota)
    .slice()
    .sort((a, b) => (b.kills !== a.kills ? b.kills - a.kills : b.hp - a.hp));

  const wildcardNeed = Math.max(0, minSurvivingRivals - qualified.length);
  const survivorIds = new Set<string>(qualified.map((c) => c.id));
  const eliminatedIds = new Set<string>();

  belowQuota.forEach((c, idx) => {
    if (idx < wildcardNeed) {
      survivorIds.add(c.id);
    } else {
      eliminatedIds.add(c.id);
    }
  });

  return { eliminatedIds, survivorIds };
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
  isJackpot: boolean;
  label: string;
  feedColor: string;
  durationSec: number;
}

export const NORMAL_ELIM_POOL: KnockoutEliminationSpec[] = [
  {
    kind: 'trapdoor_abyss',
    isRare: false,
    isJackpot: false,
    label: '심연 트랩도어 추락',
    feedColor: '#f97316',
    durationSec: 2.0,
  },
  {
    kind: 'sky_launch_plunge',
    isRare: false,
    isJackpot: false,
    label: '초고공 덤블링 사출',
    feedColor: '#fb7185',
    durationSec: 2.1,
  },
  {
    kind: 'meteor_knockback',
    isRare: false,
    isJackpot: false,
    label: '메테오 장외 방출',
    feedColor: '#f59e0b',
    durationSec: 2.0,
  },
  {
    kind: 'giant_slime_bounce',
    isRare: false,
    isJackpot: false,
    label: '거대 슬라임 피스톤 장외 튕김',
    feedColor: '#10b981',
    durationSec: 2.05,
  },
  {
    kind: 'void_whirlpool_suck',
    isRare: false,
    isJackpot: false,
    label: '공허 소용돌이 블랙홀 직행',
    feedColor: '#a855f7',
    durationSec: 2.1,
  },
];

export const RARE_ELIM_POOL: KnockoutEliminationSpec[] = [
  {
    kind: 'ufo_abduction_drop',
    isRare: true,
    isJackpot: true,
    label: '[🎰 JACKPOT 희귀 연출] 외계 UFO 납치 후 대기권 낙하!',
    feedColor: '#22d3ee',
    durationSec: 2.45,
  },
  {
    kind: 'jackpot_slot_cannon',
    isRare: true,
    isJackpot: true,
    label: '[🎰 JACKPOT 777 대박 연출] 황금 슬롯머신 축포 장외 발사!',
    feedColor: '#fde047',
    durationSec: 2.5,
  },
  {
    kind: 'kraken_tentacle_drag',
    isRare: true,
    isJackpot: true,
    label: '[🎰 JACKPOT 희귀 연출] 심연의 크라켄 촉수 포획 수장!',
    feedColor: '#c084fc',
    durationSec: 2.45,
  },
  {
    kind: 'anvil_yeet_pancake',
    isRare: true,
    isJackpot: true,
    label: '[🎰 JACKPOT 희귀 연출] 100톤 황금 대모루 팬케이크 홈런!',
    feedColor: '#facc15',
    durationSec: 2.4,
  },
];

export function pickKnockoutEliminationAnim(rng: () => number = Math.random): KnockoutEliminationSpec {
  const roll = rng();
  if (roll < 0.22) {
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
  if (partyMode === 'spike_defuse') return 'team';
  if (partyMode === 'battle_royale') return 'ffa';
  return roomMode === 'team' ? 'team' : 'ffa';
}

export interface BossProfileDefinition {
  id: BossVariantId;
  name: string;
  subtitle: string;
  maxHp: number;
  speedMult: number;
  damageMult: number;
  accent: string;
  hex: number;
  bodyHex: string;
  armorHex: string;
  coreHex: number;
  hornHex: string;
  abilityKind: 'meteor_rain' | 'frost_nova' | 'chain_storm' | 'void_singularity';
  abilityCallout: string;
}

export const BOSS_VARIANT_ORDER: BossVariantId[] = [
  'molten_behemoth',
  'frost_leviathan',
  'storm_archon',
  'void_colossus',
];

export const BOSS_ROSTER: Record<BossVariantId, BossProfileDefinition> = {
  molten_behemoth: {
    id: 'molten_behemoth',
    name: '[BOSS] 흑요석 용암 베히모스',
    subtitle: '화염 마그마 대괴수 · 용암 운석 폭격 & 대지 분쇄',
    maxHp: 900,
    speedMult: 1.0,
    damageMult: 1.0,
    accent: '#f97316',
    hex: 0xf97316,
    bodyHex: '#1f1a29',
    armorHex: '#2e293a',
    coreHex: 0xf97316,
    hornHex: '#fbbf24',
    abilityKind: 'meteor_rain',
    abilityCallout: '🌋 베히모스가 마그마 운석 폭격과 용암 장판을 분출합니다!',
  },
  frost_leviathan: {
    id: 'frost_leviathan',
    name: '[BOSS] 심연의 서리 리바이어던',
    subtitle: '절대영도 빙하 거신 · 혹한의 블리자드 노바 & 빙결 감옥',
    maxHp: 950,
    speedMult: 1.06,
    damageMult: 0.96,
    accent: '#38bdf8',
    hex: 0x38bdf8,
    bodyHex: '#0c2340',
    armorHex: '#1e3a5f',
    coreHex: 0x38bdf8,
    hornHex: '#e0f2fe',
    abilityKind: 'frost_nova',
    abilityCallout: '❄️ 서리 리바이어던이 절대영도 블리자드와 빙결 거미줄을 전개합니다!',
  },
  storm_archon: {
    id: 'storm_archon',
    name: '[BOSS] 천공의 폭풍 아콘',
    subtitle: '초전도 뇌전 타이탄 · 연쇄 낙뢰 심판 & 반중력 태풍',
    maxHp: 880,
    speedMult: 1.16,
    damageMult: 1.08,
    accent: '#facc15',
    hex: 0xfacc15,
    bodyHex: '#1e1b4b',
    armorHex: '#312e81',
    coreHex: 0xfacc15,
    hornHex: '#fef08a',
    abilityKind: 'chain_storm',
    abilityCallout: '⚡ 폭풍 아콘이 연쇄 낙뢰와 반중력 폭풍 충격파를 방출합니다!',
  },
  void_colossus: {
    id: 'void_colossus',
    name: '[BOSS] 공허의 기계 콜로서스',
    subtitle: '차원 병기 메카닉 · 블랙홀 중력장 흡입 & 플라즈마 과부하',
    maxHp: 1020,
    speedMult: 0.96,
    damageMult: 1.12,
    accent: '#c084fc',
    hex: 0xc084fc,
    bodyHex: '#090d16',
    armorHex: '#1e293b',
    coreHex: 0xc084fc,
    hornHex: '#22d3ee',
    abilityKind: 'void_singularity',
    abilityCallout: '🌌 공허 콜로서스가 블랙홀 중력장으로 전원을 끌어당깁니다!',
  },
};

export function getBossProfile(variantOrIndex?: BossVariantId | number): BossProfileDefinition {
  if (typeof variantOrIndex === 'number') {
    const id = BOSS_VARIANT_ORDER[Math.abs(Math.floor(variantOrIndex)) % BOSS_VARIANT_ORDER.length];
    return BOSS_ROSTER[id];
  }
  if (variantOrIndex && BOSS_ROSTER[variantOrIndex]) {
    return BOSS_ROSTER[variantOrIndex];
  }
  return BOSS_ROSTER.molten_behemoth;
}

export interface BattleRoyalePhaseConfig {
  phase: number;
  label: string;
  startSec: number;
  endSec: number;
  startRadius: number;
  endRadius: number;
  dps: number;
}

export const BR_PHASES: BattleRoyalePhaseConfig[] = [
  { phase: 1, label: 'PHASE 1 · 1차 자기장 축소', startSec: 0, endSec: 28, startRadius: 82, endRadius: 54, dps: 4 },
  { phase: 2, label: 'PHASE 2 · 2차 자기장 축소', startSec: 28, endSec: 56, startRadius: 54, endRadius: 32, dps: 7 },
  { phase: 3, label: 'PHASE 3 · 3차 고압 자기장', startSec: 56, endSec: 84, startRadius: 32, endRadius: 15, dps: 12 },
  { phase: 4, label: 'FINAL · 최후의 결전 자기장', startSec: 84, endSec: 115, startRadius: 15, endRadius: 3.5, dps: 18 },
];

export function computeBattleRoyaleZoneState(
  elapsedSec: number,
  playerX: number,
  playerZ: number
): {
  phase: number;
  phaseLabel: string;
  currentRadius: number;
  targetRadius: number;
  timerSec: number;
  dps: number;
  isOutsideZone: boolean;
  distToSafeZone: number;
} {
  const safeT = Math.max(0, elapsedSec);
  let active = BR_PHASES[BR_PHASES.length - 1];
  for (const p of BR_PHASES) {
    if (safeT <= p.endSec) {
      active = p;
      break;
    }
  }
  const span = Math.max(1, active.endSec - active.startSec);
  const frac = Math.max(0, Math.min(1, (safeT - active.startSec) / span));
  const currentRadius = Number(
    (active.startRadius + (active.endRadius - active.startRadius) * frac).toFixed(1)
  );
  const timerSec = Math.max(0, Math.ceil(active.endSec - safeT));
  const distFromCenter = Math.hypot(playerX, playerZ);
  const isOutsideZone = distFromCenter > currentRadius;
  const distToSafeZone = isOutsideZone ? Math.ceil(distFromCenter - currentRadius) : 0;

  return {
    phase: active.phase,
    phaseLabel: active.label,
    currentRadius,
    targetRadius: active.endRadius,
    timerSec,
    dps: active.dps,
    isOutsideZone,
    distToSafeZone,
  };
}

export const SPIKE_PLANT_TIME_SEC = 3.2;
export const SPIKE_DEFUSE_TIME_SEC = 5.0;
export const SPIKE_DETONATION_SEC = 45;
export const SPIKE_ROUND_PREPLANT_SEC = 100;
export const SPIKE_SITE_RADIUS = 9.5;
export const SPIKE_DEFUSE_RADIUS = 4.6;
export const SPIKE_TARGET_ROUNDS = 5;

export interface SpikeSiteZone {
  id: 'A' | 'B';
  label: string;
  x: number;
  z: number;
  radius: number;
}

export function getSpikeSites(): { A: SpikeSiteZone; B: SpikeSiteZone } {
  return {
    A: { id: 'A', label: 'A SITE', x: -34, z: 0, radius: SPIKE_SITE_RADIUS },
    B: { id: 'B', label: 'B SITE', x: 34, z: 0, radius: SPIKE_SITE_RADIUS },
  };
}

export function detectSpikeSiteAtPosition(x: number, z: number): 'A' | 'B' | null {
  const sites = getSpikeSites();
  if (Math.hypot(x - sites.A.x, z - sites.A.z) <= sites.A.radius) return 'A';
  if (Math.hypot(x - sites.B.x, z - sites.B.z) <= sites.B.radius) return 'B';
  return null;
}

export function stepSpikePlantProgress(
  currentProgress: number,
  dt: number,
  isChanneling: boolean
): { progress: number; completed: boolean } {
  if (!isChanneling) {
    return { progress: 0, completed: false };
  }
  const next = Math.min(1, Math.max(0, currentProgress) + Math.max(0, dt) / SPIKE_PLANT_TIME_SEC);
  return {
    progress: next,
    completed: next >= 1,
  };
}

/**
 * Valorant-style Spike Defuse with 50% Half-Defuse Checkpoint:
 * Once progress reaches 0.5 (2.5s), releasing the defuse key locks progress at 0.5 instead of 0.
 */
export function stepSpikeDefuseProgress(
  currentProgress: number,
  dt: number,
  isChanneling: boolean,
  halfReached: boolean
): { progress: number; halfReached: boolean; completed: boolean } {
  const floorProgress = halfReached ? 0.5 : 0;
  if (!isChanneling) {
    return {
      progress: floorProgress,
      halfReached,
      completed: false,
    };
  }
  const start = Math.max(floorProgress, currentProgress);
  const next = Math.min(1, start + Math.max(0, dt) / SPIKE_DEFUSE_TIME_SEC);
  const nextHalfReached = halfReached || next >= 0.5;
  return {
    progress: next,
    halfReached: nextHalfReached,
    completed: next >= 1,
  };
}

export function computeSpikeBeepInterval(remainingSec: number): number {
  if (remainingSec > 20) return 1.0;
  if (remainingSec > 10) return 0.5;
  if (remainingSec > 5) return 0.25;
  return 0.12;
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

/**
 * Realistic player callsigns (Korean & global gamer handles) used for Humanized Challenger AI
 * so opponents in Quick Match, Ranked Duel, and Open World feel like real human players.
 */
export const HUMAN_LIKE_CALLSIGNS: readonly string[] = [
  '박치기공룡',
  '철퇴장인현우',
  '딸피킬러',
  '엔더진주장인',
  '뒤치기장인',
  '크리티컬중독',
  '김점프',
  '블록깎는노인',
  '민트초코단장',
  '한대만때리자',
  '풍압점프러',
  '무빙지리네',
  '서리검객',
  '단검술사지훈',
  '황금사과먹방',
  '석궁원툴',
  '번개삼지창',
  '용암밟았네',
  '쉐도우탭',
  '실드브레이커',
  '왕관내꺼야',
  '점프패드요정',
  '흑요석건축가',
  '폭탄광민수',
  '거미줄극혐',
  '아까비',
  '고인물',
  '뉴비입니다',
  '살려주세요',
  '오늘만산다',
  '치킨먹고싶다',
  '마우스고장남',
  '새벽반유저',
  '방패깨고감',
  '진주타고옴',
  '활맞고울음',
  '공중제비장인',
  '피방사장님',
  '배고프다',
  '닉네임뭐하지',
];

export function pickHumanizedChallengerNames(
  count: number,
  excludeName = '',
  seed = Date.now()
): string[] {
  const cleanExclude = excludeName.trim().toLowerCase();
  const pool = HUMAN_LIKE_CALLSIGNS.filter((n) => n.toLowerCase() !== cleanExclude);
  let s = (Math.floor(seed) ^ 0x9e3779b9) >>> 0;
  const nextRand = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(nextRand() * (i + 1));
    const tmp = pool[i];
    pool[i] = pool[j];
    pool[j] = tmp;
  }
  return pool.slice(0, Math.max(1, count));
}

export interface PlayerSkillEvaluationInput {
  elo?: number;
  wins?: number;
  losses?: number;
  kills?: number;
  deaths?: number;
  recentKd?: number;
  winStreak?: number;
  lossStreak?: number;
}

export interface SkillMatchmakingDecision {
  skillScore: number;
  recommendedDifficulty: BotDifficulty;
  frequentAiMatch: boolean;
  targetWaitSec: number;
  skillBracketLabel: string;
}

export type SkillEvaluationResult = SkillMatchmakingDecision;

/**
 * Continuously evaluates a player's live skill (ELO, overall K/D, recent K/D, and win/loss streaks)
 * to decide:
 * 1) Whether to frequently trigger early AI matches (for lower-tier / rookie / struggling players)
 *    or search up to the full 30-second window for real human opponents.
 * 2) Whether AI difficulty should be scaled up to 'hard' (어려움), 'medium' (보통), or 'easy' (쉬움).
 */
export function evaluatePlayerSkillForMatchmaking(
  input: PlayerSkillEvaluationInput,
  rng: () => number = Math.random
): SkillMatchmakingDecision {
  const elo = typeof input.elo === 'number' && Number.isFinite(input.elo) ? input.elo : 1000;
  const wins = Math.max(0, input.wins ?? 0);
  const losses = Math.max(0, input.losses ?? 0);
  const kills = Math.max(0, input.kills ?? 0);
  const deaths = Math.max(0, input.deaths ?? 0);
  const totalGames = wins + losses;
  const overallKd = deaths > 0 ? kills / deaths : kills > 0 ? kills : 1.0;
  const recentKd =
    typeof input.recentKd === 'number' && Number.isFinite(input.recentKd)
      ? input.recentKd
      : overallKd;
  const effectiveKd = recentKd * 0.65 + overallKd * 0.35;
  const winRate = totalGames > 0 ? wins / totalGames : 0.5;
  const winStreak = Math.max(0, input.winStreak ?? 0);
  const lossStreak = Math.max(0, input.lossStreak ?? 0);

  const skillScore = Math.round(
    elo +
      (effectiveKd - 1.0) * 190 +
      (winRate - 0.5) * 180 +
      winStreak * 75 -
      lossStreak * 85
  );

  let recommendedDifficulty: BotDifficulty = 'medium';
  if (
    skillScore >= 1220 ||
    elo >= 1250 ||
    effectiveKd >= 1.55 ||
    winStreak >= 3
  ) {
    recommendedDifficulty = 'hard';
  } else if (
    skillScore < 940 ||
    lossStreak >= 2 ||
    (deaths >= 3 && effectiveKd < 0.68)
  ) {
    recommendedDifficulty = 'easy';
  }

  // Low-tier / rookie / struggling players get frequent fast AI matches (7~13s),
  // whereas mid/high-skill players search longer for real humans up to the 30s cap.
  const isLowTierOrStruggling =
    elo < 1060 && skillScore < 1080 && winStreak < 2;
  const roll = Math.max(0, Math.min(0.999, rng()));

  if (isLowTierOrStruggling) {
    const frequentAiMatch = roll < 0.85 || lossStreak >= 1;
    const waitSec = frequentAiMatch ? Math.round(7 + roll * 6) : 30;
    return {
      skillScore,
      recommendedDifficulty,
      frequentAiMatch,
      targetWaitSec: Math.min(30, Math.max(6, waitSec)),
      skillBracketLabel:
        recommendedDifficulty === 'easy'
          ? '루키 구간 · 빠른 매칭'
          : '초중급 구간 · 빠른 매칭 우선',
    };
  }

  if (recommendedDifficulty === 'hard') {
    const earlyRoll = roll < 0.2;
    return {
      skillScore,
      recommendedDifficulty: 'hard',
      frequentAiMatch: earlyRoll,
      targetWaitSec: earlyRoll ? Math.round(18 + roll * 8) : 30,
      skillBracketLabel: '챌린저 구간 · 상위 매칭',
    };
  }

  const midEarly = roll < 0.45;
  return {
    skillScore,
    recommendedDifficulty,
    frequentAiMatch: midEarly,
    targetWaitSec: midEarly ? Math.round(12 + roll * 10) : 30,
    skillBracketLabel: '실력자 표준 구간 · 실시간 유저 & 밸런스 매칭',
  };
}


