import test from 'node:test';
import assert from 'node:assert/strict';
import { CHARACTER_LIST, GAME_MODES, ITEM_CATALOG } from './characters';
import {
  applyCombatDamage,
  computeBlockPlacement,
  computeMaceDamage,
  computeSwordDamage,
  consumeSlotUse,
  createArenaBlocks,
  getSupportHeightAt,
  isInsideCobweb,
  isInsideHazardPool,
  resolveHorizontalCollision,
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
  assert.equal(ITEM_CATALOG.crossbow.maxCharges, 3);
  assert.ok((ITEM_CATALOG.tnt_charge.damage ?? 0) >= 120);
  assert.ok(flame && flame.loadout.some((i) => i.id === 'cobweb'));
  assert.ok(flame && !flame.loadout.some((i) => i.id === 'tnt_charge'));
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
  assert.equal(r1.durationSec, 180);

  const r2 = getKnockoutRoundInfo(2);
  assert.equal(r2.quota, 2);
  assert.equal(r2.durationSec, 180);

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
  assert.equal(resolveEffectiveRoomMode('multiplayer', 'team', 'knockout'), 'ffa');
  assert.equal(resolveEffectiveRoomMode('multiplayer', 'team', 'classic'), 'team');
  assert.equal(resolveEffectiveRoomMode('multiplayer', 'ffa', 'classic'), 'ffa');

  // In custom FFA or knockout, even if a peer had team 'red', they are hostile
  const effFfa = resolveEffectiveRoomMode('multiplayer', 'ffa', 'classic');
  assert.equal(isHostileTarget(effFfa, 'red', 'red'), true);

  // In custom Team mode, opposing team is hostile and same team is ally
  const effTeam = resolveEffectiveRoomMode('multiplayer', 'team', 'classic');
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
