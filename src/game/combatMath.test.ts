import test from 'node:test';
import assert from 'node:assert/strict';
import { CHARACTER_LIST, GAME_MODES, ITEM_CATALOG, hasDoubleJumpLoadout, hasRangedBowLoadout } from './characters';
import {
  applyCombatDamage,
  computeBlockPlacement,
  computeBowScopeState,
  computeJumpVelocity,
  computeMaceDamage,
  computeMaceSmashPreview,
  computeSwordDamage,
  consumeSlotUse,
  createArenaBlocks,
  getSupportHeightAt,
  isInsideCobweb,
  isInsideHazardPool,
  isStealthAttackRestricted,
  resolveHorizontalCollision,
  stepPlayerJump,
  tickCooldowns,
  tickSlotRecharge,
} from './combatMath';
import {
  MAP_DEFINITIONS,
  MAP_ORDER,
  MAP_ROTATION_SECONDS,
  canDamageTarget,
  getArenaBlocksForMap,
  getJumpPadsForMap,
  getMapForElapsedTime,
  getNextMapId,
  getRotationWindow,
  tallyMapVotes,
} from './maps';
import {
  getKnockoutRoundInfo,
  MAX_KNOCKOUT_ROUNDS,
  resolveKnockoutFinalShowdown,
  selectKnockoutRoundEliminations,
} from './partyModes';

test('computeSwordDamage grants 1.5x critical hit when falling airborne', () => {
  const groundHit = computeSwordDamage(14, 1.0, 0, true);
  assert.equal(groundHit.isCrit, false);
  assert.equal(groundHit.damage, 14);

  const critHit = computeSwordDamage(14, 1.0, -2.5, false);
  assert.equal(critHit.isCrit, true);
  assert.equal(critHit.damage, 21);
});

test('sword and fire_sword have zero cooldown and swing continuously without cooldown lock', () => {
  assert.equal(ITEM_CATALOG.sword.cooldown, 0);
  assert.equal(ITEM_CATALOG.fire_sword.cooldown, 0);
  const charges = [1, 1, 1, 1, 1, 1];
  const maxCharges = [1, 1, 1, 1, 1, 1];
  const cds = [0, 0, 0, 0, 0, 0];
  const maxCds = [0, 0, 0, 0, 0, 0];
  const delays = [0, 0, 0, 0, 0, 0];
  assert.equal(consumeSlotUse(0, charges, maxCharges, cds, maxCds, delays, 0), true);
  assert.equal(cds[0], 0);
  assert.equal(consumeSlotUse(0, charges, maxCharges, cds, maxCds, delays, 0), true);
  assert.equal(cds[0], 0);
});

test('GAME_MODES puts ffa Knockout Arcade first and includes multiplayer, link_duel, and online_world', () => {
  const ids = GAME_MODES.map((m) => m.id);
  assert.equal(ids[0], 'ffa');
  assert.equal(ids.includes('simulator' as never), false);
  assert.equal(ids.includes('online_world'), true);
  assert.equal(ids.includes('link_duel'), true);
  assert.equal(ids.includes('multiplayer'), true);
});

test('computeMaceDamage scales strongly with fall height and triggers smash >= 2.0m', () => {
  const lowHit = computeMaceDamage(12, 1.0, 1.0, false);
  assert.equal(lowHit.isSmash, false);
  assert.equal(lowHit.damage, 19);

  const mediumSmash = computeMaceDamage(12, 1.0, 6.0, false);
  assert.equal(mediumSmash.isSmash, true);
  assert.ok(mediumSmash.damage > 25);
});

test('computeMaceSmashPreview tracks fall distance, 2.0m threshold tier, and damage multiplier', () => {
  const ground = computeMaceSmashPreview(28, 1.0, 5.0, true);
  assert.equal(ground.tier, 'ground');
  assert.equal(ground.fallDistance, 0);
  assert.equal(ground.isSmashReady, false);
  assert.equal(ground.damageMultiplier, 1.0);

  const charging = computeMaceSmashPreview(28, 1.0, 1.97, false);
  assert.equal(charging.tier, 'charging');
  assert.equal(charging.fallDistance, 1.9);
  assert.equal(charging.isSmashReady, false);
  assert.equal(charging.damageMultiplier, 1.0);
  assert.ok(charging.progressPct < charging.thresholdPct);

  const ready = computeMaceSmashPreview(28, 1.0, 2.04, false);
  assert.equal(ready.tier, 'ready');
  assert.equal(ready.fallDistance, 2.0);
  assert.equal(ready.isSmashReady, true);
  assert.ok(ready.damageMultiplier >= 1.7);
  assert.ok(ready.potentialDamage > ready.groundDamage);

  const maxCap = computeMaceSmashPreview(28, 1.0, 10.5, false);
  assert.equal(maxCap.tier, 'max');
  assert.equal(maxCap.progressPct, 100);
  assert.ok(maxCap.damageMultiplier >= 5.0);
});

test('isInsideCobweb detects actors trapped in cobweb bounds', () => {
  const webs = [{ x: 4, y: 0, z: -6, radius: 1.5, height: 2.2 }];
  assert.equal(isInsideCobweb(4.5, 0.2, -5.5, webs), true);
  assert.equal(isInsideCobweb(10, 0, 0, webs), false);
});

test('isInsideHazardPool distinguishes lava and water pools', () => {
  const pools = [
    { id: 'l1', kind: 'lava' as const, x: 3, y: 0, z: 3, radius: 2.0 },
    { id: 'w1', kind: 'water' as const, x: -4, y: 0, z: 2, radius: 2.2 },
  ];
  assert.equal(isInsideHazardPool(3.5, 0, 3.5, pools, 'lava'), true);
  assert.equal(isInsideHazardPool(3.5, 0, 3.5, pools, 'water'), false);
  assert.equal(isInsideHazardPool(-4.2, 0.1, 2.2, pools, 'water'), true);
});

test('all 11 playable characters including ranged marksmen have distinct 6-item loadout signatures', () => {
  assert.equal(CHARACTER_LIST.length, 11);
  const signatures = new Set(CHARACTER_LIST.map((c) => c.loadout.map((i) => i.id).join(',')));
  assert.equal(signatures.size, CHARACTER_LIST.length);
  for (const c of CHARACTER_LIST) {
    assert.equal(c.loadout.length, 6);
    assert.ok(c.maxHp >= 108, `${c.id} should keep healthy post-buff HP`);
  }
  const kestrel = CHARACTER_LIST.find((c) => c.id === 'kestrel');
  const vexor = CHARACTER_LIST.find((c) => c.id === 'vexor');
  const flame = CHARACTER_LIST.find((c) => c.id === 'flamefrags');
  assert.ok(kestrel && kestrel.loadout[0].id === 'bow');
  assert.ok(vexor && vexor.loadout[0].id === 'crossbow');
  assert.equal(ITEM_CATALOG.bow.cooldown, 0);
  assert.equal(ITEM_CATALOG.crossbow.cooldown, 0);
  assert.equal(ITEM_CATALOG.crossbow.maxCharges, 1);
  assert.ok((ITEM_CATALOG.tnt_charge.damage ?? 0) >= 120);
  assert.ok(flame && flame.loadout.some((i) => i.id === 'cobweb'));
  assert.ok(flame && !flame.loadout.some((i) => i.id === 'tnt_charge'));
});

test('bow/crossbow fire without cooldown and bow/crossbow/mace characters get x1->x2 double jump', () => {
  const charges = [1, 1, 1, 1, 1, 1];
  const maxCharges = [1, 1, 1, 1, 1, 1];
  const cds = [0, 0, 0, 0, 0, 0];
  const maxCds = [ITEM_CATALOG.bow.cooldown, ITEM_CATALOG.crossbow.cooldown, 0, 0, 0, 0];
  const delays = [0, 0, 0, 0, 0, 0];
  assert.equal(consumeSlotUse(0, charges, maxCharges, cds, maxCds, delays, 0), true);
  assert.equal(consumeSlotUse(0, charges, maxCharges, cds, maxCds, delays, 0), true);
  assert.equal(consumeSlotUse(1, charges, maxCharges, cds, maxCds, delays, 0), true);
  assert.equal(consumeSlotUse(1, charges, maxCharges, cds, maxCds, delays, 0), true);

  const djIds = CHARACTER_LIST.filter((c) => hasDoubleJumpLoadout(c.loadout)).map((c) => c.id);
  assert.deepEqual(djIds.sort(), ['kestrel', 'manepear', 'minutetech', 'vexor', 'wemmbu']);

  const first = stepPlayerJump({ jumpCount: 0, canDoubleJump: true, canGroundJump: true, isGliding: false });
  assert.equal(first.jumped, true);
  assert.equal(first.isDoubleJump, false);
  assert.equal(first.nextJumpCount, 1);

  const second = stepPlayerJump({ jumpCount: first.nextJumpCount, canDoubleJump: true, canGroundJump: false, isGliding: false });
  assert.equal(second.jumped, true);
  assert.equal(second.isDoubleJump, true);
  assert.equal(second.nextJumpCount, 2);

  const third = stepPlayerJump({ jumpCount: second.nextJumpCount, canDoubleJump: true, canGroundJump: false, isGliding: false });
  assert.equal(third.jumped, false);
  assert.equal(third.nextJumpCount, 2);

  const noDj = stepPlayerJump({ jumpCount: 1, canDoubleJump: false, canGroundJump: false, isGliding: false });
  assert.equal(noDj.jumped, false);
  assert.equal(noDj.nextJumpCount, 1);

  const stdJump = computeJumpVelocity({ inWeb: false, canDoubleJump: false, isDoubleJump: false });
  const djFirst = computeJumpVelocity({ inWeb: false, canDoubleJump: true, isDoubleJump: false });
  const djSecond = computeJumpVelocity({ inWeb: false, canDoubleJump: true, isDoubleJump: true });
  const webbed = computeJumpVelocity({ inWeb: true, canDoubleJump: true, isDoubleJump: true });
  assert.ok(djFirst > stdJump * 1.35);
  assert.ok(djSecond > djFirst);
  assert.equal(webbed, 4.8);
});

test('bow and crossbow damages are lowered and shadow_step stealth restricts offensive attacks', () => {
  assert.equal(ITEM_CATALOG.bow.damage, 18);
  assert.equal(ITEM_CATALOG.crossbow.damage, 12);

  assert.equal(isStealthAttackRestricted('sword', true), true);
  assert.equal(isStealthAttackRestricted('bow', true), true);
  assert.equal(isStealthAttackRestricted('mace', true), true);
  assert.equal(isStealthAttackRestricted('tnt_charge', true), true);
  assert.equal(isStealthAttackRestricted('ender_pearl', true), false);
  assert.equal(isStealthAttackRestricted('gapple', true), false);
  assert.equal(isStealthAttackRestricted('sword', false), false);
});

test('bow and crossbow loadouts trigger scope zoom and sensitivity scaling while shield blocking', () => {
  const bowIds = CHARACTER_LIST.filter((c) => hasRangedBowLoadout(c.loadout)).map((c) => c.id);
  assert.deepEqual(bowIds.sort(), ['kestrel', 'vexor']);

  const scoped = computeBowScopeState({
    isBlocking: true,
    hasBowLoadout: true,
    isGliding: false,
    isSpectating: false,
    baseFov: 78,
  });
  assert.equal(scoped.isScoped, true);
  assert.equal(scoped.targetFov, 33);
  assert.ok(scoped.sensitivityMult < 0.6);
  assert.ok(scoped.zoomFactor >= 2.2);

  const nonBow = computeBowScopeState({
    isBlocking: true,
    hasBowLoadout: false,
    isGliding: false,
    isSpectating: false,
    baseFov: 78,
  });
  assert.equal(nonBow.isScoped, false);
  assert.equal(nonBow.targetFov, 78);
  assert.equal(nonBow.sensitivityMult, 1.0);
});

test('stackable cobweb charges consume down and recharge 1 at a time on cooldown', () => {
  const charges = [1, 1, 1, 3, 1, 16];
  const maxCharges = [1, 1, 1, 3, 1, 16];
  const cds = [0, 0, 0, 0, 0, 0];
  const maxCds = [0.4, 0.6, 1.2, 3.0, 6.0, 1.0];
  const delays = [0, 0, 0, 0, 0, 0];

  assert.equal(consumeSlotUse(3, charges, maxCharges, cds, maxCds, delays, 0.25), true);
  assert.equal(charges[3], 2);
  assert.equal(cds[3], 3.0);

  assert.equal(consumeSlotUse(3, charges, maxCharges, cds, maxCds, delays, 0.25), false);
  tickSlotRecharge(charges, maxCharges, cds, maxCds, delays, 0.3);
  assert.equal(consumeSlotUse(3, charges, maxCharges, cds, maxCds, delays, 0.25), true);
  assert.equal(charges[3], 1);

  tickSlotRecharge(charges, maxCharges, cds, maxCds, delays, 2.8);
  assert.equal(charges[3], 2);
  assert.ok(cds[3] > 2.8);

  tickSlotRecharge(charges, maxCharges, cds, maxCds, delays, 3.1);
  assert.equal(charges[3], 3);
  assert.equal(cds[3], 0);
});

test('computeBlockPlacement snaps to 1.5m grid and avoids overlapping player torso', () => {
  const blocks = createArenaBlocks();
  const placed = computeBlockPlacement(0, 1.56, 10, 0, -0.35, -0.94, 0, 0, 10, blocks, 108);
  assert.ok(placed !== null);
  assert.equal(placed!.x % 1.5, 0);
  assert.equal(placed!.z % 1.5, 0);
});

test('applyCombatDamage respects absorption and shield block unless broken', () => {
  const normalBlocked = applyCombatDamage(
    { hp: 100, maxHp: 100, absorption: 0, isBlocking: true },
    20,
    false
  );
  assert.equal(normalBlocked.blocked, true);
  assert.equal(normalBlocked.finalDamage, 7);

  const axeBreak = applyCombatDamage(
    { hp: 100, maxHp: 100, absorption: 15, isBlocking: true },
    35,
    true
  );
  assert.equal(axeBreak.blocked, false);
  assert.equal(axeBreak.remainingHp, 80);
});

test('expanded 216m open world has outer biome landmarks and open origin spawn', () => {
  const blocks = createArenaBlocks();
  assert.equal(getSupportHeightAt(0, 0, 0.5, 0.55, blocks), 0);
  const daisTop = getSupportHeightAt(0, -22, 1.6, 0.55, blocks);
  assert.equal(daisTop, 1.5);
  assert.ok(blocks.some((b) => Math.abs(b.x) >= 60 || Math.abs(b.z) >= 60));
  const pushed = resolveHorizontalCollision(-18, 0, -16, 0.6, 1.8, blocks, 108);
  assert.ok(Math.hypot(pushed.x - -18, pushed.z - -16) >= 1.6);
});

test('all 20 arena maps provide clear origin spawn, jump pads, and 15-minute 4-map rotation', () => {
  assert.equal(MAP_ROTATION_SECONDS, 900);
  assert.equal(MAP_ORDER.length, 20);
  assert.equal(MAP_ORDER[0], 'container_yard');
  for (const mapId of MAP_ORDER) {
    const def = MAP_DEFINITIONS[mapId];
    const blocks = getArenaBlocksForMap(mapId);
    const pads = getJumpPadsForMap(mapId);
    assert.ok(def.worldRadius <= 52, `${mapId} should be compact (${def.worldRadius}m)`);
    assert.ok(blocks.length >= 36, `${mapId} should have enclosed Valorant tactical geometry (${blocks.length})`);
    assert.ok(pads.length >= 4, `${mapId} should include jump pads for vertical combat`);
    assert.equal(getSupportHeightAt(0, 0, 0.5, 0.55, blocks), 0, `${mapId} origin must stay open for safe spawn`);
  }
  const cyBlocks = getArenaBlocksForMap('container_yard');
  assert.ok(cyBlocks.some((b) => b.kind.startsWith('container_')));

  assert.equal(getMapForElapsedTime(0, 'container_yard'), 'container_yard');
  assert.equal(getMapForElapsedTime(900, 'container_yard'), 'emerald_citadel');
  assert.equal(getMapForElapsedTime(1800, 'container_yard'), 'sky_dock');
  assert.equal(getNextMapId('aether_spire'), 'container_yard');

  const w1 = getRotationWindow(1_000);
  const w1Same = getRotationWindow(500_000);
  assert.equal(w1.activeMaps.length, 4);
  assert.equal(new Set(w1.activeMaps).size, 4);
  assert.deepEqual(w1.activeMaps, w1Same.activeMaps);
  for (const m of w1.activeMaps) {
    assert.ok(MAP_ORDER.includes(m));
  }
  const w2 = getRotationWindow(900_001);
  assert.equal(w2.activeMaps.length, 4);
  assert.equal(new Set(w2.activeMaps).size, 4);
  assert.notEqual(w1.windowIndex, w2.windowIndex);
});

test('tallyMapVotes picks majority map and canDamageTarget blocks friendly fire in team mode', () => {
  const tally = tallyMapVotes(['sky_dock', 'sky_dock', 'container_yard'], 'container_yard');
  assert.equal(tally.winner, 'sky_dock');
  assert.equal(tally.counts.sky_dock, 2);
  assert.equal(tally.counts.container_yard, 1);

  assert.equal(canDamageTarget('team', 'red', 'red'), false);
  assert.equal(canDamageTarget('team', 'red', 'blue'), true);
  assert.equal(canDamageTarget('ffa', 'red', 'red'), true);
});

test('tickCooldowns decrements cleanly down to zero', () => {
  const cds = [1.5, 0.2, 0];
  tickCooldowns(cds, 0.5);
  assert.deepEqual(cds, [1.0, 0, 0]);
});

test('bot difficulty scales cooldowns, aim jitter, and shield block reaction', async () => {
  const { getBotDifficultyConfig } = await import('./partyModes');
  const easy = getBotDifficultyConfig('easy');
  const medium = getBotDifficultyConfig('medium');
  const hard = getBotDifficultyConfig('hard');

  assert.ok(easy.attackCooldownMult > medium.attackCooldownMult);
  assert.ok(hard.attackCooldownMult < medium.attackCooldownMult);
  assert.ok(easy.shieldBlockChance < medium.shieldBlockChance);
  assert.ok(hard.shieldBlockChance > medium.shieldBlockChance);
  assert.equal(easy.allowAerialMace, false);
  assert.equal(hard.allowAerialMace, true);
});

test('computeWaterBurnHealing heals when burning in water and ignores dry or non-burning states', async () => {
  const { computeWaterBurnHealing } = await import('./partyModes');
  const resHealed = computeWaterBurnHealing(true, true, 50, 100, 28);
  assert.equal(resHealed.shouldHeal, true);
  assert.equal(resHealed.nextHp, 78);
  assert.equal(resHealed.healDelta, 28);

  const resDry = computeWaterBurnHealing(true, false, 50, 100, 28);
  assert.equal(resDry.shouldHeal, false);
  assert.equal(resDry.nextHp, 50);

  const resNoBurn = computeWaterBurnHealing(false, true, 50, 100, 28);
  assert.equal(resNoBurn.shouldHeal, false);
});

test('getKnockoutRoundInfo, computeOneShotDamage, 1+1+1 Random Arsenal, and hostility helpers work properly', async () => {
  const {
    getKnockoutRoundInfo,
    computeOneShotDamage,
    getRandomArsenalLoadout,
    isHostileTarget,
    normalizeCustomBots,
  } = await import('./partyModes');
  const r1 = getKnockoutRoundInfo(1);
  assert.equal(r1.quota, 1);
  assert.equal(r1.durationSec, 60);

  const r2 = getKnockoutRoundInfo(2);
  assert.equal(r2.quota, 2);
  assert.equal(r2.durationSec, 60);

  assert.equal(computeOneShotDamage(15, false), 15);
  assert.equal(computeOneShotDamage(15, true), 350);

  const setA = getRandomArsenalLoadout(0);
  assert.equal(setA.loadout.length, 6);
  assert.ok(setA.name.length > 0);
  assert.ok(setA.loadout[0] !== null);
  assert.ok(setA.loadout[1] !== null);
  assert.ok(setA.loadout[2] !== null);
  assert.equal(setA.loadout[3], null);
  assert.equal(setA.loadout[4], null);
  assert.equal(setA.loadout[5], null);

  assert.equal(isHostileTarget('team', 'red', 'red'), false);
  assert.equal(isHostileTarget('team', 'red', 'blue'), true);
  assert.equal(isHostileTarget('ffa', 'red', 'red'), true);

  const normalized = normalizeCustomBots(
    [{ id: 'b1', name: 'Bot 1', characterId: 'wemmbu', team: 'ffa' }],
    'team'
  );
  assert.equal(normalized[0].team, 'red');
});

test('resolveEffectiveRoomMode, computeBuffMultipliers, and computeSurgeModifiers scale gameplay and hostility accurately', async () => {
  const {
    resolveEffectiveRoomMode,
    isHostileTarget,
    computeBuffMultipliers,
    pickArenaSurgeEvent,
    computeSurgeModifiers,
  } = await import('./partyModes');

  assert.equal(resolveEffectiveRoomMode('ffa', 'team', 'classic'), 'ffa');
  assert.equal(resolveEffectiveRoomMode('online_world', 'team', 'classic'), 'ffa');
  assert.equal(resolveEffectiveRoomMode('multiplayer', 'team', 'knockout'), 'team');
  assert.equal(resolveEffectiveRoomMode('multiplayer', 'team', 'classic'), 'team');
  assert.equal(resolveEffectiveRoomMode('multiplayer', 'ffa', 'classic'), 'ffa');

  // In custom FFA, even if a peer had team 'red', they are hostile
  const effFfa = resolveEffectiveRoomMode('multiplayer', 'ffa', 'classic');
  assert.equal(isHostileTarget(effFfa, 'red', 'red'), true);

  // In custom Team mode (including knockout), opposing team is hostile and same team is ally
  const effTeam = resolveEffectiveRoomMode('multiplayer', 'team', 'knockout');
  assert.equal(isHostileTarget(effTeam, 'red', 'blue'), true);
  assert.equal(isHostileTarget(effTeam, 'red', 'red'), false);

  const buffs = computeBuffMultipliers([
    { kind: 'berserk', remainingSec: 8 },
    { kind: 'haste', remainingSec: 6 },
  ]);
  assert.equal(buffs.damageMult, 1.35);
  assert.equal(buffs.speedMult, 1.3);
  assert.equal(buffs.jumpMult, 1.18);
  assert.equal(buffs.cooldownRateMult, 1.35);

  const evt0 = pickArenaSurgeEvent(0);
  const evt1 = pickArenaSurgeEvent(1);
  assert.notEqual(evt0.kind, evt1.kind);

  const lowGravMods = computeSurgeModifiers({ kind: 'low_gravity', remainingSec: 10 });
  assert.ok(lowGravMods.gravityMult < 0.7);
  assert.ok(lowGravMods.jumpMult > 1.15);

  const idleMods = computeSurgeModifiers(null);
  assert.equal(idleMods.gravityMult, 1.0);
  assert.equal(idleMods.cooldownRateMult, 1.0);
});

test('pickKnockoutEliminationAnim returns 5 normal animations and 4 rare Jackpot variants', async () => {
  const { pickKnockoutEliminationAnim, NORMAL_ELIM_POOL, RARE_ELIM_POOL } = await import('./partyModes');
  assert.equal(NORMAL_ELIM_POOL.length, 5);
  assert.equal(RARE_ELIM_POOL.length, 4);
  assert.ok(RARE_ELIM_POOL.every((r) => r.isRare && r.isJackpot));

  const norm = pickKnockoutEliminationAnim(() => 0.5);
  assert.equal(norm.isRare, false);
  assert.equal(norm.isJackpot, false);
  assert.ok(
    [
      'trapdoor_abyss',
      'sky_launch_plunge',
      'meteor_knockback',
      'giant_slime_bounce',
      'void_whirlpool_suck',
    ].includes(norm.kind)
  );

  const seq = (vals: number[]) => {
    let i = 0;
    return () => vals[i++ % vals.length];
  };
  const rareUfo = pickKnockoutEliminationAnim(seq([0.04, 0.1]));
  assert.equal(rareUfo.isRare, true);
  assert.equal(rareUfo.isJackpot, true);
  assert.equal(rareUfo.kind, 'ufo_abduction_drop');

  const rareSlot = pickKnockoutEliminationAnim(seq([0.04, 0.35]));
  assert.equal(rareSlot.isJackpot, true);
  assert.equal(rareSlot.kind, 'jackpot_slot_cannon');

  const rareKraken = pickKnockoutEliminationAnim(seq([0.04, 0.6]));
  assert.equal(rareKraken.isJackpot, true);
  assert.equal(rareKraken.kind, 'kraken_tentacle_drag');

  const rareAnvil = pickKnockoutEliminationAnim(seq([0.04, 0.9]));
  assert.equal(rareAnvil.isRare, true);
  assert.equal(rareAnvil.isJackpot, true);
  assert.equal(rareAnvil.kind, 'anvil_yeet_pancake');
});

test('ender pearl cooldown is reduced to 2.4s and elytra continuous flight expires after 10s', async () => {
  assert.equal(ITEM_CATALOG.ender_pearl.cooldown, 2.4);

  const { MAX_ELYTRA_FLIGHT_SEC, stepElytraFlightLimit } = await import('./partyModes');
  assert.equal(MAX_ELYTRA_FLIGHT_SEC, 10);

  let rem = MAX_ELYTRA_FLIGHT_SEC;
  let gliding = true;
  let expired = false;
  for (let i = 0; i < 9; i++) {
    const step = stepElytraFlightLimit(gliding, rem, 1.0);
    gliding = step.stillGliding;
    rem = step.nextRemainingSec;
    expired = step.expired;
    assert.equal(gliding, true);
    assert.equal(expired, false);
  }
  const finalStep = stepElytraFlightLimit(gliding, rem, 1.0);
  assert.equal(finalStep.stillGliding, false);
  assert.equal(finalStep.nextRemainingSec, 0);
  assert.equal(finalStep.expired, true);
});

test('Quick Match Knockout never terminates early on 15-kill limit and scales mutators & bounty leaders across rounds', async () => {
  const {
    shouldEndMatchOnKillLimit,
    pickKnockoutMutator,
    pickBountyLeader,
    ARENA_EVENT_ORDER,
    ARENA_SURGE_EVENTS,
  } = await import('./partyModes');

  assert.equal(shouldEndMatchOnKillLimit('knockout', 'ffa'), false);
  assert.equal(shouldEndMatchOnKillLimit('knockout', 'multiplayer'), false);
  assert.equal(shouldEndMatchOnKillLimit('boss_raid', 'multiplayer'), false);
  assert.equal(shouldEndMatchOnKillLimit('classic', 'ffa'), true);
  assert.equal(shouldEndMatchOnKillLimit('classic', 'online_world'), false);

  const m1 = pickKnockoutMutator(1);
  const m2 = pickKnockoutMutator(2);
  const m3 = pickKnockoutMutator(3);
  const m4 = pickKnockoutMutator(4);
  assert.equal(m1.id, 'opening_brawl');
  assert.equal(m2.id, 'sky_leap');
  assert.ok(m2.jumpMult > 1.15 && m2.gravityMult < 0.9);
  assert.equal(m3.id, 'overdrive_clash');
  assert.ok(m3.cooldownRateMult > 1.5);
  assert.equal(m4.id, 'final_rumble');
  assert.ok(m4.damageMult > 1.15);

  const noBounty = pickBountyLeader([
    { id: 'local', name: 'Me', kills: 9, alive: true, isLocal: true },
    { id: 'b1', name: 'Bot1', kills: 1, alive: true },
  ]);
  assert.equal(noBounty, null);

  const bounty = pickBountyLeader([
    { id: 'local', name: 'Me', kills: 9, alive: true, isLocal: true },
    { id: 'b1', name: 'Bot1', kills: 4, alive: false },
    { id: 'b2', name: 'Bot2', kills: 3, alive: true },
    { id: 'b3', name: 'Bot3', kills: 2, alive: true },
  ]);
  assert.deepEqual(bounty, { id: 'b2', name: 'Bot2', kills: 3 });

  assert.ok(ARENA_EVENT_ORDER.includes('berserk_frenzy'));
  assert.ok(ARENA_SURGE_EVENTS.berserk_frenzy.cooldownRateMult > 1.2);
});

test('evaluatePlayerSkillForMatchmaking adapts AI difficulty and wait time based on tier, K/D, and streaks, and pickHumanizedChallengerNames avoids BOT tags', async () => {
  const {
    evaluatePlayerSkillForMatchmaking,
    pickHumanizedChallengerNames,
  } = await import('./partyModes');

  const lowTier = evaluatePlayerSkillForMatchmaking(
    {
      elo: 920,
      wins: 1,
      losses: 6,
      kills: 5,
      deaths: 18,
      recentKd: 0.4,
      winStreak: 0,
      lossStreak: 3,
    },
    () => 0.3
  );
  assert.equal(lowTier.frequentAiMatch, true);
  assert.equal(lowTier.recommendedDifficulty, 'easy');
  assert.ok(lowTier.targetWaitSec >= 7 && lowTier.targetWaitSec <= 13);

  const midTier = evaluatePlayerSkillForMatchmaking(
    {
      elo: 1120,
      wins: 6,
      losses: 6,
      kills: 24,
      deaths: 24,
      recentKd: 1.0,
      winStreak: 0,
      lossStreak: 0,
    },
    () => 0.5
  );
  assert.equal(midTier.frequentAiMatch, false);
  assert.equal(midTier.recommendedDifficulty, 'medium');
  assert.equal(midTier.targetWaitSec, 30);

  const highTier = evaluatePlayerSkillForMatchmaking(
    {
      elo: 1450,
      wins: 24,
      losses: 5,
      kills: 150,
      deaths: 55,
      recentKd: 2.6,
      winStreak: 4,
      lossStreak: 0,
    },
    () => 0.5
  );
  assert.equal(highTier.frequentAiMatch, false);
  assert.equal(highTier.recommendedDifficulty, 'hard');
  assert.equal(highTier.targetWaitSec, 30);

  const names = pickHumanizedChallengerNames(6, '박치기공룡', 3);
  assert.equal(names.length, 6);
  assert.equal(new Set(names).size, 6);
  assert.equal(names.includes('박치기공룡'), false);
  for (const n of names) {
    assert.equal(n.toLowerCase().includes('bot'), false);
    assert.equal(n.includes('봇'), false);
  }
});

test('selectKnockoutRoundEliminations keeps multi-round tournament alive past R1 and R2 before strict R3 cutoff', () => {
  const r1Candidates = [
    { id: 'bot-1', kills: 0, hp: 180 },
    { id: 'bot-2', kills: 0, hp: 140 },
    { id: 'bot-3', kills: 0, hp: 90 },
    { id: 'bot-4', kills: 0, hp: 40 },
    { id: 'bot-5', kills: 0, hp: 20 },
  ];
  const r1Res = selectKnockoutRoundEliminations(1, 1, r1Candidates);
  // R1 preserves 3 wildcard survivors when nobody hit quota so R2 actually starts
  assert.equal(r1Res.survivorIds.size, 3);
  assert.equal(r1Res.eliminatedIds.size, 2);
  assert.equal(r1Res.survivorIds.has('bot-1'), true);
  assert.equal(r1Res.survivorIds.has('bot-2'), true);
  assert.equal(r1Res.survivorIds.has('bot-3'), true);
  assert.equal(r1Res.eliminatedIds.has('bot-4'), true);
  assert.equal(r1Res.eliminatedIds.has('bot-5'), true);

  const r2Candidates = [
    { id: 'bot-1', kills: 1, hp: 160 },
    { id: 'bot-2', kills: 0, hp: 150 },
    { id: 'bot-3', kills: 0, hp: 70 },
  ];
  const r2Res = selectKnockoutRoundEliminations(2, 1, r2Candidates);
  // R2 preserves at least 2 finalists for the R3 final showdown
  assert.equal(r2Res.survivorIds.size, 2);
  assert.deepEqual([...r2Res.eliminatedIds], ['bot-3']);

  const r3Res = selectKnockoutRoundEliminations(3, 2, r2Candidates);
  // R3+ enforces strict quota without wildcard mercy
  assert.equal(r3Res.survivorIds.size, 0);
  assert.equal(r3Res.eliminatedIds.size, 3);
});

test('MAX_KNOCKOUT_ROUNDS and resolveKnockoutFinalShowdown guarantee Round 3 always crowns a single champion', () => {
  assert.equal(MAX_KNOCKOUT_ROUNDS, 3);
  assert.equal(getKnockoutRoundInfo(4).round, 3);
  assert.equal(getKnockoutRoundInfo(4).quota, 3);

  const resLocalWins = resolveKnockoutFinalShowdown([
    { id: 'bot-1', kills: 5, hp: 180 },
    { id: 'local', kills: 7, hp: 120, isLocal: true },
    { id: 'bot-2', kills: 4, hp: 200 },
  ]);
  assert.equal(resLocalWins.championId, 'local');
  assert.equal(resLocalWins.eliminatedIds.has('bot-1'), true);
  assert.equal(resLocalWins.eliminatedIds.has('bot-2'), true);
  assert.equal(resLocalWins.eliminatedIds.has('local'), false);

  const resTieBreak = resolveKnockoutFinalShowdown([
    { id: 'bot-1', kills: 6, hp: 150 },
    { id: 'local', kills: 6, hp: 150, isLocal: true },
  ]);
  assert.equal(resTieBreak.championId, 'local');
  assert.deepEqual([...resTieBreak.eliminatedIds], ['bot-1']);

  const resBotWins = resolveKnockoutFinalShowdown([
    { id: 'local', kills: 4, hp: 200, isLocal: true },
    { id: 'bot-top', kills: 8, hp: 110 },
  ]);
  assert.equal(resBotWins.championId, 'bot-top');
  assert.deepEqual([...resBotWins.eliminatedIds], ['local']);
});



