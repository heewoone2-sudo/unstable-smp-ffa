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

test('GAME_MODES removes simulator and includes online_world and link_duel', () => {
  const ids = GAME_MODES.map((m) => m.id);
  assert.equal(ids.includes('simulator' as never), false);
  assert.equal(ids.includes('online_world'), true);
  assert.equal(ids.includes('link_duel'), true);
});

test('computeMaceDamage scales strongly with fall height and triggers smash >= 2.0m', () => {
  const lowHit = computeMaceDamage(12, 1.0, 1.0, false);
  assert.equal(lowHit.isSmash, false);
  assert.equal(lowHit.damage, 12);

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

test('all 9 playable characters have distinct 6-item loadout signatures', () => {
  assert.equal(CHARACTER_LIST.length, 9);
  const signatures = new Set(CHARACTER_LIST.map((c) => c.loadout.map((i) => i.id).join(',')));
  assert.equal(signatures.size, CHARACTER_LIST.length);
  for (const c of CHARACTER_LIST) {
    assert.equal(c.loadout.length, 6);
  }
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

test('tickCooldowns decrements cleanly down to zero', () => {
  const cds = [1.5, 0.2, 0];
  tickCooldowns(cds, 0.5);
  assert.deepEqual(cds, [1.0, 0, 0]);
});

