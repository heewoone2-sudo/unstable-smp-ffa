import type { ArenaBlock, CobwebZone, FighterStats, HazardPoolZone, WeaponSlotId } from './types';

export interface DamageResult {
  finalDamage: number;
  blocked: boolean;
  isMaceSmash: boolean;
  isCrit: boolean;
  absorptionUsed: number;
  hpDamage: number;
  remainingHp: number;
  remainingAbsorption: number;
}

/**
 * Computes Sword/Spear/Axe melee damage with Java-style falling critical hits.
 */
export function computeSwordDamage(
  baseDamage: number,
  characterMult: number,
  vy: number,
  onGround: boolean
): { damage: number; isCrit: boolean } {
  const isCrit = !onGround && vy < -0.6;
  const critMult = isCrit ? 1.5 : 1.0;
  return {
    damage: Math.round(baseDamage * characterMult * critMult),
    isCrit,
  };
}

/**
 * Computes Unstable SMP style Heavy Mace damage based on fall height.
 * Smash triggers when airborne/falling from >= 2.0m height.
 */
export function computeMaceDamage(
  baseDamage: number,
  characterMult: number,
  fallDistance: number,
  onGround: boolean
): { damage: number; isSmash: boolean; shockwaveRadius: number } {
  const effectiveFall = onGround ? 0 : Math.max(0, fallDistance);
  const isSmash = effectiveFall >= 2.0;
  if (!isSmash) {
    return {
      damage: Math.round(baseDamage * 1.55 * characterMult),
      isSmash: false,
      shockwaveRadius: 0,
    };
  }
  const bonus = Math.min(130, Math.pow(effectiveFall, 1.15) * 11.5);
  const damage = Math.round((baseDamage + bonus) * characterMult * 1.38);
  const shockwaveRadius = Math.min(7.5, 3.8 + effectiveFall * 0.28);
  return { damage, isSmash: true, shockwaveRadius };
}

export type MaceSmashTier = 'ground' | 'charging' | 'ready' | 'overdrive' | 'max';

export interface MaceSmashPreview {
  fallDistance: number;
  isAirborne: boolean;
  isSmashReady: boolean;
  groundDamage: number;
  potentialDamage: number;
  damageMultiplier: number;
  shockwaveRadius: number;
  progressPct: number;
  thresholdPct: number;
  tier: MaceSmashTier;
}

export const MACE_SMASH_THRESHOLD_METERS = 2.0;
export const MACE_SMASH_CAP_METERS = 8.3;

/**
 * Computes real-time Mace Smash flight telemetry (fall distance, potential damage,
 * multiplier vs grounded swing, shockwave radius, and threshold progress).
 */
export function computeMaceSmashPreview(
  baseDamage: number,
  characterMult: number,
  fallDistance: number,
  onGround: boolean
): MaceSmashPreview {
  const safeFall = onGround ? 0 : Math.floor(Math.max(0, fallDistance) * 10) / 10;
  const groundRes = computeMaceDamage(baseDamage, characterMult, 0, true);
  const currentRes = computeMaceDamage(baseDamage, characterMult, safeFall, onGround);
  const damageMultiplier = Number(
    (currentRes.damage / Math.max(1, groundRes.damage)).toFixed(1)
  );
  const progressPct = Math.min(
    100,
    Math.round((safeFall / MACE_SMASH_CAP_METERS) * 100)
  );
  const thresholdPct = Math.round(
    (MACE_SMASH_THRESHOLD_METERS / MACE_SMASH_CAP_METERS) * 100
  );
  const tier: MaceSmashTier = onGround
    ? 'ground'
    : !currentRes.isSmash
      ? 'charging'
      : safeFall >= 8.2
        ? 'max'
        : safeFall >= 5.5
          ? 'overdrive'
          : 'ready';

  return {
    fallDistance: safeFall,
    isAirborne: !onGround,
    isSmashReady: currentRes.isSmash,
    groundDamage: groundRes.damage,
    potentialDamage: currentRes.damage,
    damageMultiplier,
    shockwaveRadius: Number(currentRes.shockwaveRadius.toFixed(1)),
    progressPct,
    thresholdPct,
    tier,
  };
}

/**
 * Checks whether an actor's position overlaps any active Cobweb block zone.
 */
export function isInsideCobweb(
  x: number,
  y: number,
  z: number,
  webs: readonly CobwebZone[]
): boolean {
  for (let i = 0; i < webs.length; i++) {
    const w = webs[i];
    if (
      Math.abs(x - w.x) <= w.radius &&
      Math.abs(z - w.z) <= w.radius &&
      y >= w.y - 0.3 &&
      y <= w.y + w.height
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Checks whether an actor is touching a Lava or Water pool.
 */
export function isInsideHazardPool(
  x: number,
  y: number,
  z: number,
  pools: readonly HazardPoolZone[],
  kind: 'lava' | 'water'
): boolean {
  for (let i = 0; i < pools.length; i++) {
    const p = pools[i];
    if (p.kind !== kind) continue;
    const dx = x - p.x;
    const dz = z - p.z;
    if (dx * dx + dz * dz <= p.radius * p.radius && y >= p.y - 0.35 && y <= p.y + 1.4) {
      return true;
    }
  }
  return false;
}

/**
 * Computes a clean 1.5m-grid-snapped block placement position along a ray,
 * avoiding overlap with existing blocks or the player's own torso.
 */
export function computeBlockPlacement(
  eyeX: number,
  eyeY: number,
  eyeZ: number,
  dirX: number,
  dirY: number,
  dirZ: number,
  playerX: number,
  playerY: number,
  playerZ: number,
  blocks: readonly ArenaBlock[],
  arenaRadius: number
): { x: number; y: number; z: number } | null {
  const GRID = 1.5;
  const maxDist = 5.4;
  const step = 0.35;

  let prevX = eyeX + dirX * 1.4;
  let prevY = eyeY + dirY * 1.4;
  let prevZ = eyeZ + dirZ * 1.4;
  let chosen: { x: number; y: number; z: number } | null = null;

  for (let d = 1.4; d <= maxDist; d += step) {
    const sx = eyeX + dirX * d;
    const sy = eyeY + dirY * d;
    const sz = eyeZ + dirZ * d;

    if (sy <= 0.05) {
      chosen = { x: prevX, y: 0, z: prevZ };
      break;
    }

    let hitBlock = false;
    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i];
      if (
        Math.abs(sx - b.x) <= b.w * 0.5 &&
        Math.abs(sz - b.z) <= b.d * 0.5 &&
        sy >= b.y &&
        sy <= b.y + b.h
      ) {
        hitBlock = true;
        break;
      }
    }
    if (hitBlock) {
      chosen = { x: prevX, y: Math.max(0, prevY), z: prevZ };
      break;
    }

    prevX = sx;
    prevY = sy;
    prevZ = sz;
  }

  if (!chosen) {
    // Mid-air / bridging placement at ~3.2m in front of camera
    const d = 3.2;
    chosen = {
      x: eyeX + dirX * d,
      y: Math.max(0, eyeY + dirY * d - 0.5),
      z: eyeZ + dirZ * d,
    };
  }

  const gx = Math.round(chosen.x / GRID) * GRID;
  const gy = Math.max(0, Math.round(chosen.y / GRID) * GRID);
  const gz = Math.round(chosen.z / GRID) * GRID;

  if (gx * gx + gz * gz > (arenaRadius - 1.2) * (arenaRadius - 1.2) || gy > 28) {
    return null;
  }

  // Avoid placing inside an identical placed block
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    if (
      Math.abs(gx - b.x) < b.w * 0.48 &&
      Math.abs(gz - b.z) < b.d * 0.48 &&
      gy + GRID * 0.5 > b.y &&
      gy + GRID * 0.5 < b.y + b.h
    ) {
      return null;
    }
  }

  // Avoid suffocating own torso (allow placing right under feet when jumping/pillaring!)
  const insideHoriz = Math.abs(gx - playerX) < 0.95 && Math.abs(gz - playerZ) < 0.95;
  const overlapsTorso = insideHoriz && gy + GRID > playerY + 0.38 && gy < playerY + 1.65;
  if (overlapsTorso) {
    return null;
  }

  return { x: gx, y: gy, z: gz };
}

/**
 * Applies damage against a fighter considering blocking shield mitigation and absorption hearts.
 */
export function applyCombatDamage(
  target: FighterStats,
  rawDamage: number,
  canBreakShield: boolean
): DamageResult {
  const blocked = target.isBlocking && !canBreakShield;
  const finalDamage = Math.max(1, Math.round(blocked ? rawDamage * 0.35 : rawDamage));

  let remainingAbsorption = target.absorption;
  let absorptionUsed = 0;
  let hpDamage = 0;

  if (remainingAbsorption > 0) {
    absorptionUsed = Math.min(remainingAbsorption, finalDamage);
    remainingAbsorption -= absorptionUsed;
    hpDamage = finalDamage - absorptionUsed;
  } else {
    hpDamage = finalDamage;
  }

  const remainingHp = Math.max(0, target.hp - hpDamage);

  return {
    finalDamage,
    blocked,
    isMaceSmash: canBreakShield,
    isCrit: false,
    absorptionUsed,
    hpDamage,
    remainingHp,
    remainingAbsorption,
  };
}

/**
 * Returns the highest walkable surface Y at world (x, z) for a character at currentY.
 */
export function getSupportHeightAt(
  x: number,
  z: number,
  currentY: number,
  radius: number,
  blocks: readonly ArenaBlock[]
): number {
  let supportY = 0;
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    const halfW = b.w * 0.5 + radius * 0.85;
    const halfD = b.d * 0.5 + radius * 0.85;
    if (Math.abs(x - b.x) <= halfW && Math.abs(z - b.z) <= halfD) {
      const topY = b.y + b.h;
      if (topY <= currentY + 0.65 && topY > supportY) {
        supportY = topY;
      }
    }
  }
  return supportY;
}

/**
 * Resolves horizontal circle-vs-AABB pushout against arena blocks whose top exceeds step-up height.
 */
export function resolveHorizontalCollision(
  x: number,
  y: number,
  z: number,
  radius: number,
  height: number,
  blocks: readonly ArenaBlock[],
  arenaRadius: number
): { x: number; z: number } {
  let nx = x;
  let nz = z;

  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    const bottomY = b.y;
    const topY = b.y + b.h;
    if (y >= topY - 0.55 || y + height <= bottomY + 0.05) {
      continue;
    }

    const halfW = b.w * 0.5;
    const halfD = b.d * 0.5;
    const closestX = Math.max(b.x - halfW, Math.min(nx, b.x + halfW));
    const closestZ = Math.max(b.z - halfD, Math.min(nz, b.z + halfD));

    const dx = nx - closestX;
    const dz = nz - closestZ;
    const distSq = dx * dx + dz * dz;

    if (distSq < radius * radius) {
      if (distSq > 1e-6) {
        const dist = Math.sqrt(distSq);
        const push = radius - dist;
        nx += (dx / dist) * push;
        nz += (dz / dist) * push;
      } else {
        const penX = halfW + radius - Math.abs(nx - b.x);
        const penZ = halfD + radius - Math.abs(nz - b.z);
        if (penX < penZ) {
          nx += nx >= b.x ? penX : -penX;
        } else {
          nz += nz >= b.z ? penZ : -penZ;
        }
      }
    }
  }

  const rSq = nx * nx + nz * nz;
  if (rSq > arenaRadius * arenaRadius) {
    const r = Math.sqrt(rSq);
    nx = (nx / r) * arenaRadius;
    nz = (nz / r) * arenaRadius;
  }

  return { x: nx, z: nz };
}

export function createArenaBlocks(): ArenaBlock[] {
  return [
    // Central Northern Council Plaza (spawn landmark)
    { id: 'dais-n', x: 0, y: 0, z: -22, w: 12, h: 1.5, d: 8, kind: 'obsidian', isLandmark: true },
    { id: 'dais-n-top', x: 0, y: 1.5, z: -24, w: 7, h: 1.5, d: 5, kind: 'deepslate', isLandmark: true },
    { id: 'beacon-pillar-nw', x: -5, y: 0, z: -26, w: 2.6, h: 10.5, d: 2.6, kind: 'amethyst', isLandmark: true },
    { id: 'beacon-pillar-ne', x: 5, y: 0, z: -26, w: 2.6, h: 10.5, d: 2.6, kind: 'amethyst', isLandmark: true },
    { id: 'council-arch', x: 0, y: 9.5, z: -26, w: 13, h: 2.2, d: 2.8, kind: 'gold', isLandmark: true },

    { id: 'tower-nw-step', x: -16, y: 0, z: -14, w: 5.5, h: 2.5, d: 5.5, kind: 'deepslate' },
    { id: 'tower-nw', x: -18, y: 0, z: -16, w: 3.4, h: 7.5, d: 3.4, kind: 'obsidian' },
    { id: 'tower-ne-step', x: 16, y: 0, z: -14, w: 5.5, h: 2.5, d: 5.5, kind: 'deepslate' },
    { id: 'tower-ne', x: 18, y: 0, z: -16, w: 3.4, h: 7.5, d: 3.4, kind: 'obsidian' },
    { id: 'tower-sw-step', x: -16, y: 0, z: 16, w: 5.5, h: 2.5, d: 5.5, kind: 'deepslate' },
    { id: 'tower-sw', x: -18, y: 0, z: 18, w: 3.4, h: 6.5, d: 3.4, kind: 'amethyst' },
    { id: 'tower-se-step', x: 16, y: 0, z: 16, w: 5.5, h: 2.5, d: 5.5, kind: 'deepslate' },
    { id: 'tower-se', x: 18, y: 0, z: 18, w: 3.4, h: 6.5, d: 3.4, kind: 'amethyst' },

    { id: 'bridge-w1', x: -11, y: 0, z: 0, w: 4, h: 1.4, d: 7, kind: 'stone' },
    { id: 'bridge-w2', x: -15, y: 0, z: 0, w: 4, h: 3.0, d: 5, kind: 'deepslate' },
    { id: 'bridge-e1', x: 11, y: 0, z: 0, w: 4, h: 1.4, d: 7, kind: 'stone' },
    { id: 'bridge-e2', x: 15, y: 0, z: 0, w: 4, h: 3.0, d: 5, kind: 'deepslate' },

    { id: 'south-plat', x: 0, y: 0, z: 22, w: 10, h: 1.4, d: 6, kind: 'deepslate' },
    { id: 'south-p1', x: -4.2, y: 1.4, z: 23, w: 2.2, h: 5.2, d: 2.2, kind: 'stone' },
    { id: 'south-p2', x: 4.2, y: 1.4, z: 23, w: 2.2, h: 5.2, d: 2.2, kind: 'stone' },

    { id: 'sky-pad-1', x: -9, y: 6.0, z: -12, w: 3.6, h: 1.1, d: 3.6, kind: 'amethyst' },
    { id: 'sky-pad-2', x: 9, y: 6.0, z: -12, w: 3.6, h: 1.1, d: 3.6, kind: 'amethyst' },
    { id: 'sky-pad-3', x: 0, y: 8.5, z: -16, w: 4.2, h: 1.1, d: 4.2, kind: 'gold' },

    // North Biome: Obsidian Citadel & Nether Spire (z: -54 to -86)
    { id: 'north-keep-base', x: 0, y: 0, z: -64, w: 18, h: 2.2, d: 14, kind: 'obsidian', isLandmark: true },
    { id: 'north-keep-step', x: 0, y: 0, z: -55, w: 10, h: 1.1, d: 5, kind: 'deepslate' },
    { id: 'north-spire-l', x: -7.5, y: 2.2, z: -68, w: 3.2, h: 12.5, d: 3.2, kind: 'obsidian', isLandmark: true },
    { id: 'north-spire-r', x: 7.5, y: 2.2, z: -68, w: 3.2, h: 12.5, d: 3.2, kind: 'obsidian', isLandmark: true },
    { id: 'north-crown', x: 0, y: 14.0, z: -68, w: 18, h: 2.0, d: 3.5, kind: 'gold', isLandmark: true },
    { id: 'north-side-w', x: -24, y: 0, z: -60, w: 8, h: 3.2, d: 8, kind: 'deepslate' },
    { id: 'north-side-e', x: 24, y: 0, z: -60, w: 8, h: 3.2, d: 8, kind: 'deepslate' },

    // South Biome: Amethyst Sky Temple (z: +54 to +86)
    { id: 'south-temple-base', x: 0, y: 0, z: 64, w: 16, h: 1.8, d: 14, kind: 'deepslate', isLandmark: true },
    { id: 'south-temple-step', x: 0, y: 0, z: 55, w: 9, h: 0.9, d: 5, kind: 'stone' },
    { id: 'south-col-l', x: -6, y: 1.8, z: 66, w: 2.8, h: 10, d: 2.8, kind: 'amethyst', isLandmark: true },
    { id: 'south-col-r', x: 6, y: 1.8, z: 66, w: 2.8, h: 10, d: 2.8, kind: 'amethyst', isLandmark: true },
    { id: 'south-sky-deck', x: 0, y: 11.8, z: 66, w: 15, h: 1.6, d: 6, kind: 'amethyst', isLandmark: true },
    { id: 'south-wing-w', x: -25, y: 0, z: 62, w: 7, h: 2.8, d: 7, kind: 'turf' },
    { id: 'south-wing-e', x: 25, y: 0, z: 62, w: 7, h: 2.8, d: 7, kind: 'turf' },

    // East Biome: MinuteTech Tactical Ruins (x: +54 to +86)
    { id: 'east-fort-base', x: 64, y: 0, z: 0, w: 14, h: 2.0, d: 18, kind: 'stone', isLandmark: true },
    { id: 'east-fort-step', x: 55, y: 0, z: 0, w: 5, h: 1.0, d: 10, kind: 'deepslate' },
    { id: 'east-bunker-n', x: 66, y: 2.0, z: -7, w: 4.5, h: 5.5, d: 4.5, kind: 'deepslate' },
    { id: 'east-bunker-s', x: 66, y: 2.0, z: 7, w: 4.5, h: 5.5, d: 4.5, kind: 'deepslate' },
    { id: 'east-overpass', x: 66, y: 7.5, z: 0, w: 5, h: 1.4, d: 18, kind: 'gold', isLandmark: true },
    { id: 'east-cover-n', x: 46, y: 0, z: -22, w: 6, h: 2.6, d: 4, kind: 'stone' },
    { id: 'east-cover-s', x: 46, y: 0, z: 22, w: 6, h: 2.6, d: 4, kind: 'stone' },

    // West Biome: Wemmbu Canyon Bastions (x: -54 to -86)
    { id: 'west-bastion-base', x: -64, y: 0, z: 0, w: 14, h: 2.0, d: 18, kind: 'deepslate', isLandmark: true },
    { id: 'west-bastion-step', x: -55, y: 0, z: 0, w: 5, h: 1.0, d: 10, kind: 'stone' },
    { id: 'west-monolith-n', x: -66, y: 2.0, z: -7, w: 4, h: 9.0, d: 4, kind: 'obsidian', isLandmark: true },
    { id: 'west-monolith-s', x: -66, y: 2.0, z: 7, w: 4, h: 9.0, d: 4, kind: 'obsidian', isLandmark: true },
    { id: 'west-sky-bridge', x: -66, y: 11.0, z: 0, w: 5, h: 1.4, d: 18, kind: 'amethyst', isLandmark: true },
    { id: 'west-cover-n', x: -46, y: 0, z: -22, w: 6, h: 2.6, d: 4, kind: 'turf' },
    { id: 'west-cover-s', x: -46, y: 0, z: 22, w: 6, h: 2.6, d: 4, kind: 'turf' },

    // Diagonal Outer Ring Outposts & Sky Islands (r ~ 56-72)
    { id: 'outpost-nw-base', x: -46, y: 0, z: -46, w: 8, h: 2.2, d: 8, kind: 'obsidian' },
    { id: 'outpost-nw-top', x: -46, y: 7.5, z: -46, w: 5, h: 1.2, d: 5, kind: 'amethyst' },
    { id: 'outpost-ne-base', x: 46, y: 0, z: -46, w: 8, h: 2.2, d: 8, kind: 'obsidian' },
    { id: 'outpost-ne-top', x: 46, y: 7.5, z: -46, w: 5, h: 1.2, d: 5, kind: 'gold' },
    { id: 'outpost-sw-base', x: -46, y: 0, z: 46, w: 8, h: 2.2, d: 8, kind: 'deepslate' },
    { id: 'outpost-sw-top', x: -46, y: 7.5, z: 46, w: 5, h: 1.2, d: 5, kind: 'amethyst' },
    { id: 'outpost-se-base', x: 46, y: 0, z: 46, w: 8, h: 2.2, d: 8, kind: 'deepslate' },
    { id: 'outpost-se-top', x: 46, y: 7.5, z: 46, w: 5, h: 1.2, d: 5, kind: 'gold' },

    // Outer perimeter jump hills
    { id: 'hill-n', x: 0, y: 0, z: -88, w: 14, h: 3.0, d: 6, kind: 'stone' },
    { id: 'hill-s', x: 0, y: 0, z: 88, w: 14, h: 3.0, d: 6, kind: 'stone' },
    { id: 'hill-e', x: 88, y: 0, z: 0, w: 6, h: 3.0, d: 14, kind: 'stone' },
    { id: 'hill-w', x: -88, y: 0, z: 0, w: 6, h: 3.0, d: 14, kind: 'stone' },
  ];
}

export function tickCooldowns(cooldowns: number[], dt: number): void {
  for (let i = 0; i < cooldowns.length; i++) {
    if (cooldowns[i] > 0) {
      cooldowns[i] = Math.max(0, cooldowns[i] - dt);
    }
  }
}

/**
 * Ticks stackable charge regeneration: whenever cooldown reaches 0 while charges < maxCharges,
 * increments charges by 1 and restarts recharge timer if still below maxCharges.
 */
export function tickSlotRecharge(
  charges: number[],
  maxCharges: readonly number[],
  cooldowns: number[],
  maxCooldowns: readonly number[],
  useDelays: number[],
  dt: number
): void {
  for (let i = 0; i < cooldowns.length; i++) {
    if (useDelays[i] > 0) {
      useDelays[i] = Math.max(0, useDelays[i] - dt);
    }
    const maxC = maxCharges[i];
    if (maxC > 1) {
      if (charges[i] < maxC) {
        cooldowns[i] -= dt;
        if (cooldowns[i] <= 0) {
          charges[i] += 1;
          cooldowns[i] = charges[i] < maxC ? maxCooldowns[i] : 0;
        }
      } else {
        cooldowns[i] = 0;
      }
    } else if (cooldowns[i] > 0) {
      cooldowns[i] = Math.max(0, cooldowns[i] - dt);
    }
  }
}

/**
 * Consumes 1 use of a slot (either stackable charge or standard cooldown).
 * Returns false if slot has 0 charges or is on cooldown/useDelay.
 */
export function consumeSlotUse(
  idx: number,
  charges: number[],
  maxCharges: readonly number[],
  cooldowns: number[],
  maxCooldowns: readonly number[],
  useDelays: number[],
  useDelay = 0.25
): boolean {
  if (useDelays[idx] > 0) return false;
  const maxC = maxCharges[idx];
  if (maxC > 1) {
    if (charges[idx] <= 0) return false;
    charges[idx] -= 1;
    useDelays[idx] = useDelay;
    if (cooldowns[idx] <= 0) {
      cooldowns[idx] = maxCooldowns[idx];
    }
    return true;
  }
  if (cooldowns[idx] > 0) return false;
  cooldowns[idx] = maxCooldowns[idx];
  return true;
}

/**
 * Resolves single ground jump (x1) and double mid-air jump (x2) state transitions.
 */
export function stepPlayerJump(params: {
  jumpCount: number;
  canDoubleJump: boolean;
  canGroundJump: boolean;
  isGliding: boolean;
}): { jumped: boolean; isDoubleJump: boolean; nextJumpCount: number } {
  if (params.isGliding) {
    return { jumped: false, isDoubleJump: false, nextJumpCount: params.jumpCount };
  }
  if (params.canGroundJump) {
    return { jumped: true, isDoubleJump: false, nextJumpCount: 1 };
  }
  if (params.canDoubleJump && params.jumpCount < 2) {
    return {
      jumped: true,
      isDoubleJump: true,
      nextJumpCount: 2,
    };
  }
  return { jumped: false, isDoubleJump: false, nextJumpCount: params.jumpCount };
}

/**
 * Computes vertical launch velocity for single and double jumps.
 * Characters with double-jump loadouts (bow, crossbow, or mace) leap much higher.
 */
export function computeJumpVelocity(params: {
  inWeb: boolean;
  canDoubleJump: boolean;
  isDoubleJump: boolean;
}): number {
  if (params.inWeb) return 4.8;
  if (!params.canDoubleJump) return 11.2;
  return params.isDoubleJump ? 20.4 : 16.2;
}

/**
 * Prevents offensive attacks while phased/stealthed via Shadow Step.
 */
export function isStealthAttackRestricted(slotId: WeaponSlotId, attackerStealthed: boolean): boolean {
  if (!attackerStealthed) return false;
  return (
    slotId === 'sword' ||
    slotId === 'fire_sword' ||
    slotId === 'spear' ||
    slotId === 'axe' ||
    slotId === 'mace' ||
    slotId === 'trident' ||
    slotId === 'bow' ||
    slotId === 'crossbow' ||
    slotId === 'tnt_charge' ||
    slotId === 'lava_bucket' ||
    slotId === 'cobweb'
  );
}

/**
 * Computes optical scope zoom FOV, sensitivity scale, and zoom factor when
 * right-click blocking with a bow/crossbow character.
 */
export function computeBowScopeState(params: {
  isBlocking: boolean;
  hasBowLoadout: boolean;
  isGliding: boolean;
  isSpectating: boolean;
  baseFov: number;
}): {
  isScoped: boolean;
  targetFov: number;
  sensitivityMult: number;
  zoomFactor: number;
} {
  const active =
    params.isBlocking &&
    params.hasBowLoadout &&
    !params.isGliding &&
    !params.isSpectating;
  if (!active) {
    return {
      isScoped: false,
      targetFov: params.baseFov,
      sensitivityMult: 1.0,
      zoomFactor: 1.0,
    };
  }
  const targetFov = Math.max(28, Math.round(params.baseFov * 0.42));
  const zoomFactor = Number((params.baseFov / targetFov).toFixed(1));
  return {
    isScoped: true,
    targetFov,
    sensitivityMult: 0.48,
    zoomFactor,
  };
}

