import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { CharacterProfile, WeaponSlotId } from './types';

export interface FighterRig {
  root: THREE.Group;
  bodyGroup: THREE.Group;
  headGroup: THREE.Group;
  leftArmPivot: THREE.Group;
  rightArmPivot: THREE.Group;
  leftLegPivot: THREE.Group;
  rightLegPivot: THREE.Group;
  wingsGroup: THREE.Group;
  leftWing: THREE.Mesh;
  rightWing: THREE.Mesh;
  shieldMesh: THREE.Group;
  weaponModels: Record<WeaponSlotId, THREE.Group>;
  shadowDisc: THREE.Mesh;
  hitFlashMaterials: THREE.MeshStandardMaterial[];
  baseEmissives: THREE.Color[];
  telegraphRing: THREE.Mesh;
  setActiveWeapon: (slot: WeaponSlotId) => void;
  setHitFlash: (active: boolean, telegraphColor?: number) => void;
  setOpacity: (opacity: number) => void;
}

function makeMat(
  color: string | number,
  roughness: number,
  metalness: number,
  emissive = 0x000000,
  emissiveIntensity = 0
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness,
    emissive,
    emissiveIntensity,
  });
}

function makeClearcoatMat(
  color: string | number,
  roughness: number,
  metalness: number,
  emissive = 0x000000,
  emissiveIntensity = 0,
  clearcoat = 0.9
): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness,
    metalness,
    emissive,
    emissiveIntensity,
    clearcoat,
    clearcoatRoughness: 0.12,
  });
}

function makeBladeGeometry(width: number, length: number, depth = 0.032): THREE.ExtrudeGeometry {
  const hw = width * 0.5;
  const shape = new THREE.Shape();
  shape.moveTo(-hw, 0);
  shape.lineTo(-hw * 0.88, length * 0.78);
  shape.lineTo(0, length);
  shape.lineTo(hw * 0.88, length * 0.78);
  shape.lineTo(hw, 0);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.012,
    bevelSize: 0.012,
    bevelSegments: 2,
  });
  geo.center();
  return geo;
}

function makeAxeHeadGeometry(): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, -0.07);
  shape.lineTo(0.24, -0.17);
  shape.quadraticCurveTo(0.32, 0, 0.24, 0.19);
  shape.lineTo(0, 0.08);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.06,
    bevelEnabled: true,
    bevelThickness: 0.018,
    bevelSize: 0.014,
    bevelSegments: 3,
  });
  geo.translate(0, 0, -0.03);
  return geo;
}

function makeKiteShieldGeometry(w: number, h: number, depth: number): THREE.ExtrudeGeometry {
  const hw = w * 0.5;
  const hh = h * 0.5;
  const shape = new THREE.Shape();
  shape.moveTo(-hw * 0.9, hh);
  shape.quadraticCurveTo(0, hh * 1.08, hw * 0.9, hh);
  shape.lineTo(hw, hh * 0.15);
  shape.quadraticCurveTo(hw * 0.72, -hh * 0.65, 0, -hh);
  shape.quadraticCurveTo(-hw * 0.72, -hh * 0.65, -hw, hh * 0.15);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.015,
    bevelSize: 0.015,
    bevelSegments: 2,
  });
  geo.center();
  return geo;
}

function makeAerodynamicWingGeometry(): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.quadraticCurveTo(-0.34, -0.12, -0.44, -0.58);
  shape.quadraticCurveTo(-0.38, -0.94, -0.12, -0.98);
  shape.quadraticCurveTo(-0.04, -0.58, 0.04, -0.16);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.032,
    bevelEnabled: true,
    bevelThickness: 0.012,
    bevelSize: 0.012,
    bevelSegments: 2,
  });
  geo.translate(0, 0, -0.016);
  return geo;
}

function buildWeaponMeshes(): Record<WeaponSlotId, THREE.Group> {
  const darkMetal = makeMat(0x2a2733, 0.24, 0.85);
  const goldAccent = makeClearcoatMat(0xf59e0b, 0.18, 0.9, 0x000000, 0, 0.8);
  const woodMat = makeMat(0x523420, 0.72, 0.06);

  // 1. Netherite Sword (Beveled blade + fuller + sculpted guard)
  const sword = new THREE.Group();
  const netherEdge = makeClearcoatMat(0x63597a, 0.16, 0.92, 0x7c3aed, 0.25, 0.9);
  const sPommel = new THREE.Mesh(new THREE.SphereGeometry(0.062, 14, 10), goldAccent);
  sPommel.position.set(0, -0.15, 0.04);
  const sHilt = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.038, 0.24, 14), woodMat);
  sHilt.position.set(0, -0.02, 0.04);
  const sGuard = new THREE.Mesh(new RoundedBoxGeometry(0.32, 0.065, 0.1, 3, 0.022), goldAccent);
  sGuard.position.set(0, 0.1, 0.04);
  const sBlade = new THREE.Mesh(makeBladeGeometry(0.11, 0.84, 0.028), netherEdge);
  sBlade.position.set(0, 0.54, 0.04);
  const sFuller = new THREE.Mesh(new RoundedBoxGeometry(0.032, 0.62, 0.06, 2, 0.01), darkMetal);
  sFuller.position.set(0, 0.45, 0.04);
  sword.add(sPommel, sHilt, sGuard, sBlade, sFuller);
  sword.rotation.x = Math.PI * 0.42;
  sword.position.set(0, -0.58, 0.15);

  // 2. Fire Aspect Sword
  const fire_sword = new THREE.Group();
  const fireBlade = new THREE.Mesh(
    makeBladeGeometry(0.12, 0.86, 0.03),
    makeClearcoatMat(0xf97316, 0.18, 0.72, 0xea580c, 0.65, 0.95)
  );
  fireBlade.position.set(0, 0.55, 0.04);
  const fireCore = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.022, 0.6, 6, 12),
    makeMat(0xfef08a, 0.12, 0.25, 0xf59e0b, 0.95)
  );
  fireCore.position.set(0, 0.52, 0.04);
  fire_sword.add(sPommel.clone(), sHilt.clone(), sGuard.clone(), fireBlade, fireCore);
  fire_sword.rotation.x = Math.PI * 0.42;
  fire_sword.position.set(0, -0.58, 0.15);

  // 3. Orbital Spear
  const spear = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.038, 1.38, 16), woodMat);
  shaft.position.set(0, 0.4, 0.04);
  const spearTip = new THREE.Mesh(
    makeBladeGeometry(0.16, 0.42, 0.03),
    makeClearcoatMat(0xc084fc, 0.15, 0.88, 0x9333ea, 0.45, 1.0)
  );
  spearTip.position.set(0, 1.24, 0.04);
  const spearCollar = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.024, 10, 18), goldAccent);
  spearCollar.rotation.x = Math.PI / 2;
  spearCollar.position.set(0, 1.02, 0.04);
  spear.add(shaft, spearTip, spearCollar);
  spear.rotation.x = Math.PI * 0.45;
  spear.position.set(0, -0.55, 0.18);

  // 4. Heavy Crescent Axe
  const axe = new THREE.Group();
  const axeHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.042, 0.94, 16), woodMat);
  axeHandle.position.set(0, 0.25, 0.04);
  const axeCollar = new THREE.Mesh(new RoundedBoxGeometry(0.11, 0.16, 0.12, 3, 0.02), darkMetal);
  axeCollar.position.set(0, 0.66, 0.04);
  const axeBlade = new THREE.Mesh(
    makeAxeHeadGeometry(),
    makeClearcoatMat(0xfbbf24, 0.16, 0.92, 0xd97706, 0.25, 0.9)
  );
  axeBlade.rotation.y = -Math.PI / 2;
  axeBlade.position.set(0, 0.66, 0.08);
  axe.add(axeHandle, axeCollar, axeBlade);
  axe.rotation.x = Math.PI * 0.4;
  axe.position.set(0, -0.58, 0.15);

  // 5. Heavy Flanged Mace
  const mace = new THREE.Group();
  const rod = new THREE.Mesh(
    new THREE.CylinderGeometry(0.038, 0.046, 0.82, 16),
    makeClearcoatMat(0x7dd3fc, 0.24, 0.6, 0x0284c7, 0.3, 0.8)
  );
  rod.position.set(0, 0.24, 0.04);
  const maceHead = new THREE.Mesh(
    new RoundedBoxGeometry(0.32, 0.34, 0.32, 4, 0.06),
    makeMat(0x334155, 0.22, 0.88)
  );
  maceHead.position.set(0, 0.64, 0.04);
  const maceBand = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.035, 10, 20), goldAccent);
  maceBand.rotation.x = Math.PI / 2;
  maceBand.position.set(0, 0.64, 0.04);
  const maceCore = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 18, 14),
    makeClearcoatMat(0x38bdf8, 0.1, 0.35, 0x0ea5e9, 0.85, 1.0)
  );
  maceCore.position.set(0, 0.84, 0.04);
  mace.add(rod, maceHead, maceBand, maceCore);
  mace.rotation.x = Math.PI * 0.38;
  mace.position.set(0, -0.56, 0.16);

  // 6. Trident
  const trident = new THREE.Group();
  const triMat = makeClearcoatMat(0x2dd4bf, 0.18, 0.78, 0x0d9488, 0.35, 0.95);
  const triShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.036, 1.15, 16), triMat);
  triShaft.position.set(0, 0.34, 0.04);
  const triCross = new THREE.Mesh(new RoundedBoxGeometry(0.34, 0.065, 0.065, 3, 0.02), triMat);
  triCross.position.set(0, 0.9, 0.04);
  const prongM = new THREE.Mesh(makeBladeGeometry(0.065, 0.36, 0.024), triMat);
  prongM.position.set(0, 1.09, 0.04);
  const prongL = new THREE.Mesh(makeBladeGeometry(0.055, 0.26, 0.022), triMat);
  prongL.position.set(-0.13, 1.03, 0.04);
  const prongR = new THREE.Mesh(makeBladeGeometry(0.055, 0.26, 0.022), triMat);
  prongR.position.set(0.13, 1.03, 0.04);
  trident.add(triShaft, triCross, prongM, prongL, prongR);
  trident.rotation.x = Math.PI * 0.44;
  trident.position.set(0, -0.56, 0.18);

  // 7. Wind Charge
  const wind_charge = new THREE.Group();
  const windCore = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 18, 14),
    makeClearcoatMat(0xe0f2fe, 0.12, 0.2, 0x7dd3fc, 0.75, 1.0)
  );
  const windRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.2, 0.028, 10, 24),
    makeMat(0x38bdf8, 0.2, 0.35, 0x0284c7, 0.5)
  );
  windRing.rotation.x = Math.PI / 2.5;
  wind_charge.add(windCore, windRing);
  wind_charge.position.set(0, -0.62, 0.22);

  // 8. Cobweb Silk Orb
  const cobweb = new THREE.Group();
  const webShell = new THREE.Mesh(
    new THREE.SphereGeometry(0.15, 16, 12),
    makeMat(0xf1f5f9, 0.78, 0.05, 0xcbd5e1, 0.3)
  );
  const webRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.18, 0.022, 8, 22),
    makeMat(0xffffff, 0.8, 0.05, 0xe2e8f0, 0.35)
  );
  webRing.rotation.set(0.6, 0.4, 0);
  cobweb.add(webShell, webRing);
  cobweb.position.set(0, -0.62, 0.22);

  // 9. TNT Canister
  const tnt_charge = new THREE.Group();
  const tntBody = new THREE.Mesh(
    new RoundedBoxGeometry(0.25, 0.26, 0.25, 3, 0.035),
    makeMat(0xdc2626, 0.55, 0.12, 0x991b1b, 0.25)
  );
  const tntBand = new THREE.Mesh(
    new RoundedBoxGeometry(0.265, 0.085, 0.265, 2, 0.015),
    makeMat(0xf8fafc, 0.75, 0.05)
  );
  tnt_charge.add(tntBody, tntBand);
  tnt_charge.position.set(0, -0.62, 0.22);

  // 10. Ender Pearl
  const ender_pearl = new THREE.Group();
  const pearlShell = new THREE.Mesh(
    new THREE.SphereGeometry(0.15, 20, 16),
    makeClearcoatMat(0x0f766e, 0.08, 0.45, 0x2dd4bf, 0.45, 1.0)
  );
  const pearlCore = new THREE.Mesh(
    new THREE.SphereGeometry(0.08, 14, 12),
    makeMat(0xa855f7, 0.1, 0.2, 0xc084fc, 0.9)
  );
  ender_pearl.add(pearlShell, pearlCore);
  ender_pearl.position.set(0, -0.62, 0.22);

  // 11. Shadow Step Cloak Gem
  const shadow_step = new THREE.Group();
  const cloakGem = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 18, 14),
    makeClearcoatMat(0x6366f1, 0.1, 0.4, 0x818cf8, 0.85, 1.0)
  );
  cloakGem.scale.set(0.85, 1.25, 0.85);
  shadow_step.add(cloakGem);
  shadow_step.position.set(0, -0.62, 0.22);

  // 12. Golden Apple (Sculpted rounded fruit + stem + curved leaf)
  const gapple = new THREE.Group();
  const appleBody = new THREE.Mesh(
    new THREE.SphereGeometry(0.135, 20, 16),
    makeClearcoatMat(0xfbbf24, 0.14, 0.88, 0xd97706, 0.35, 1.0)
  );
  appleBody.scale.set(1.06, 0.94, 1.06);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.1, 10), woodMat);
  stem.position.y = 0.13;
  const leaf = new THREE.Mesh(
    new THREE.SphereGeometry(0.055, 10, 8),
    makeMat(0x22c55e, 0.45, 0.05)
  );
  leaf.scale.set(1.3, 0.35, 0.7);
  leaf.position.set(0.055, 0.15, 0);
  leaf.rotation.z = 0.35;
  gapple.add(appleBody, stem, leaf);
  gapple.position.set(0, -0.62, 0.22);

  // 13. Splash Healing Potion (Lathe flask)
  const potion = new THREE.Group();
  const flaskPts = [
    new THREE.Vector2(0, -0.13),
    new THREE.Vector2(0.11, -0.13),
    new THREE.Vector2(0.13, -0.05),
    new THREE.Vector2(0.09, 0.03),
    new THREE.Vector2(0.045, 0.08),
    new THREE.Vector2(0.055, 0.12),
    new THREE.Vector2(0, 0.12),
  ];
  const bottle = new THREE.Mesh(
    new THREE.LatheGeometry(flaskPts, 18),
    makeClearcoatMat(0xf43f5e, 0.08, 0.15, 0xfb7185, 0.6, 1.0)
  );
  const cork = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.036, 0.07, 12), woodMat);
  cork.position.y = 0.14;
  potion.add(bottle, cork);
  potion.position.set(0, -0.62, 0.22);

  // 14. Lava Bucket
  const lava_bucket = new THREE.Group();
  const bucketMat = makeClearcoatMat(0x94a3b8, 0.24, 0.88, 0x000000, 0, 0.5);
  const bucketShell = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.1, 0.24, 16), bucketMat);
  const lavaFill = new THREE.Mesh(
    new THREE.CylinderGeometry(0.125, 0.11, 0.055, 16),
    makeMat(0xf97316, 0.22, 0.1, 0xea580c, 0.95)
  );
  lavaFill.position.y = 0.1;
  lava_bucket.add(bucketShell, lavaFill);
  lava_bucket.position.set(0, -0.62, 0.22);

  // 15. Water Bucket
  const water_bucket = new THREE.Group();
  const waterShell = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.1, 0.24, 16), bucketMat);
  const waterFill = new THREE.Mesh(
    new THREE.CylinderGeometry(0.125, 0.11, 0.055, 16),
    makeClearcoatMat(0x38bdf8, 0.1, 0.15, 0x0ea5e9, 0.65, 1.0)
  );
  waterFill.position.y = 0.1;
  water_bucket.add(waterShell, waterFill);
  water_bucket.position.set(0, -0.62, 0.22);

  // 16. Building Block (Beveled Timber/Obsidian Cube)
  const build_block = new THREE.Group();
  const blockCore = new THREE.Mesh(
    new RoundedBoxGeometry(0.25, 0.25, 0.25, 3, 0.032),
    makeMat(0x8b5e34, 0.65, 0.12, 0x64748b, 0.1)
  );
  const blockRim = new THREE.Mesh(
    new RoundedBoxGeometry(0.265, 0.065, 0.265, 2, 0.015),
    makeMat(0xc49a6c, 0.45, 0.3)
  );
  build_block.add(blockCore, blockRim);
  build_block.position.set(0, -0.62, 0.22);

  return {
    sword,
    fire_sword,
    spear,
    axe,
    mace,
    trident,
    wind_charge,
    cobweb,
    tnt_charge,
    ender_pearl,
    shadow_step,
    gapple,
    potion,
    lava_bucket,
    water_bucket,
    build_block,
  };
}

export function createFighterModel(
  profile: CharacterProfile,
  shadowMaterial: THREE.MeshBasicMaterial,
  enableShadows: boolean
): FighterRig {
  const root = new THREE.Group();
  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  const hitFlashMaterials: THREE.MeshStandardMaterial[] = [];
  const baseEmissives: THREE.Color[] = [];

  const registerMat = <T extends THREE.MeshStandardMaterial>(mat: T): T => {
    hitFlashMaterials.push(mat);
    baseEmissives.push(mat.emissive.clone());
    return mat;
  };

  const armorMat = registerMat(makeMat(profile.primaryColor, 0.48, 0.42));
  const trimMat = registerMat(
    makeClearcoatMat(profile.trimColor, 0.18, 0.86, new THREE.Color(profile.trimColor).getHex(), 0.2, 0.8)
  );
  const skinMat = registerMat(makeMat(profile.skinColor, 0.68, 0.04));
  const pantsMat = registerMat(makeMat('#1f2430', 0.78, 0.12));
  const visorMat = registerMat(
    makeClearcoatMat(profile.visorColor, 0.08, 0.3, new THREE.Color(profile.visorColor).getHex(), 0.55, 1.0)
  );

  // Smooth Rounded Legs & Armored Greaves
  const leftLegPivot = new THREE.Group();
  leftLegPivot.position.set(-0.15, 0.72, 0);
  const leftLeg = new THREE.Mesh(new RoundedBoxGeometry(0.24, 0.72, 0.25, 3, 0.045), pantsMat);
  leftLeg.position.y = -0.36;
  const leftBoot = new THREE.Mesh(new RoundedBoxGeometry(0.27, 0.21, 0.3, 3, 0.045), trimMat);
  leftBoot.position.set(0, -0.62, 0.015);
  leftLegPivot.add(leftLeg, leftBoot);

  const rightLegPivot = new THREE.Group();
  rightLegPivot.position.set(0.15, 0.72, 0);
  const rightLeg = new THREE.Mesh(new RoundedBoxGeometry(0.24, 0.72, 0.25, 3, 0.045), pantsMat);
  rightLeg.position.y = -0.36;
  const rightBoot = new THREE.Mesh(new RoundedBoxGeometry(0.27, 0.21, 0.3, 3, 0.045), trimMat);
  rightBoot.position.set(0, -0.62, 0.015);
  rightLegPivot.add(rightLeg, rightBoot);

  bodyGroup.add(leftLegPivot, rightLegPivot);

  // Sculpted Anatomical Torso + Layered Chestplate
  const torso = new THREE.Mesh(new RoundedBoxGeometry(0.56, 0.72, 0.31, 4, 0.065), armorMat);
  torso.position.set(0, 1.08, 0);
  const chestPlate = new THREE.Mesh(new RoundedBoxGeometry(0.61, 0.42, 0.35, 4, 0.065), trimMat);
  chestPlate.position.set(0, 1.18, 0);
  const belt = new THREE.Mesh(new RoundedBoxGeometry(0.58, 0.12, 0.34, 3, 0.03), makeMat('#11131a', 0.42, 0.65));
  belt.position.set(0, 0.78, 0);
  const beltBuckle = new THREE.Mesh(new RoundedBoxGeometry(0.14, 0.1, 0.06, 2, 0.015), trimMat);
  beltBuckle.position.set(0, 0.78, 0.16);
  bodyGroup.add(torso, chestPlate, belt, beltBuckle);

  // Contoured Head + Layered Hair + Glossy Visor & Sculpted Headgear
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.46, 0);
  const headMesh = new THREE.Mesh(new RoundedBoxGeometry(0.46, 0.46, 0.46, 4, 0.085), skinMat);
  headMesh.position.y = 0.23;
  headGroup.add(headMesh);

  const hairColors: Record<string, string> = {
    wemmbu: '#2e1065',
    flamefrags: '#451a03',
    parrotx2: '#134e4a',
    spokeishere: '#1e1b4b',
    manepear: '#3f2212',
    clownpierce: '#450a0a',
    princezam: '#064e3b',
    jumperwho: '#3b0764',
    minutetech: '#172554',
  };
  const hairMat = registerMat(makeMat(hairColors[profile.id] ?? '#1f2937', 0.82, 0.05));
  const hairTop = new THREE.Mesh(new RoundedBoxGeometry(0.5, 0.15, 0.5, 4, 0.055), hairMat);
  hairTop.position.set(0, 0.42, -0.01);
  const hairBack = new THREE.Mesh(new RoundedBoxGeometry(0.48, 0.38, 0.16, 3, 0.05), hairMat);
  hairBack.position.set(0, 0.22, -0.19);
  const hairSideL = new THREE.Mesh(new RoundedBoxGeometry(0.09, 0.24, 0.34, 3, 0.03), hairMat);
  hairSideL.position.set(-0.22, 0.28, -0.04);
  const hairSideR = new THREE.Mesh(new RoundedBoxGeometry(0.09, 0.24, 0.34, 3, 0.03), hairMat);
  hairSideR.position.set(0.22, 0.28, -0.04);
  headGroup.add(hairTop, hairBack, hairSideL, hairSideR);

  const eyeLeft = new THREE.Mesh(new RoundedBoxGeometry(0.11, 0.07, 0.045, 2, 0.015), visorMat);
  eyeLeft.position.set(-0.1, 0.24, 0.23);
  const eyeRight = new THREE.Mesh(new RoundedBoxGeometry(0.11, 0.07, 0.045, 2, 0.015), visorMat);
  eyeRight.position.set(0.1, 0.24, 0.23);
  headGroup.add(eyeLeft, eyeRight);

  if (profile.headgear === 'crown') {
    const crownBand = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.25, 0.09, 20), trimMat);
    crownBand.position.y = 0.5;
    const gem = new THREE.Mesh(new THREE.SphereGeometry(0.07, 14, 10), visorMat);
    gem.position.set(0, 0.55, 0.22);
    headGroup.add(crownBand, gem);
  } else if (profile.headgear === 'hood') {
    const hoodTop = new THREE.Mesh(new RoundedBoxGeometry(0.54, 0.16, 0.54, 4, 0.06), armorMat);
    hoodTop.position.y = 0.47;
    const hoodBack = new THREE.Mesh(new RoundedBoxGeometry(0.54, 0.46, 0.18, 4, 0.06), armorMat);
    hoodBack.position.set(0, 0.24, -0.22);
    headGroup.add(hoodTop, hoodBack);
  } else if (profile.headgear === 'visor') {
    const visorBar = new THREE.Mesh(new RoundedBoxGeometry(0.49, 0.12, 0.09, 3, 0.03), visorMat);
    visorBar.position.set(0, 0.25, 0.23);
    headGroup.add(visorBar);
  } else if (profile.headgear === 'headband') {
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.045, 10, 22), armorMat);
    band.rotation.x = Math.PI / 2;
    band.position.y = 0.36;
    const knot = new THREE.Mesh(new RoundedBoxGeometry(0.13, 0.19, 0.09, 3, 0.03), trimMat);
    knot.position.set(0, 0.32, -0.27);
    headGroup.add(band, knot);
  } else {
    const hornL = new THREE.Mesh(new THREE.ConeGeometry(0.065, 0.24, 12), trimMat);
    hornL.position.set(-0.24, 0.52, 0);
    hornL.rotation.z = 0.32;
    const hornR = new THREE.Mesh(new THREE.ConeGeometry(0.065, 0.24, 12), trimMat);
    hornR.position.set(0.24, 0.52, 0);
    hornR.rotation.z = -0.32;
    headGroup.add(hornL, hornR);
  }
  bodyGroup.add(headGroup);

  // Arms & Beveled Kite Shield
  const leftArmPivot = new THREE.Group();
  leftArmPivot.position.set(-0.4, 1.38, 0);
  const leftShoulder = new THREE.Mesh(new RoundedBoxGeometry(0.27, 0.24, 0.29, 4, 0.065), trimMat);
  leftShoulder.position.y = -0.06;
  const leftArm = new THREE.Mesh(new RoundedBoxGeometry(0.21, 0.64, 0.21, 3, 0.045), armorMat);
  leftArm.position.y = -0.32;
  leftArmPivot.add(leftShoulder, leftArm);

  const shieldMesh = new THREE.Group();
  const shieldBoard = new THREE.Mesh(
    makeKiteShieldGeometry(0.46, 0.68, 0.05),
    makeMat('#334155', 0.34, 0.78)
  );
  const shieldTrim = new THREE.Mesh(new RoundedBoxGeometry(0.46, 0.14, 0.08, 2, 0.02), trimMat);
  shieldMesh.add(shieldBoard, shieldTrim);
  shieldMesh.position.set(-0.14, -0.38, 0.14);
  shieldMesh.rotation.y = Math.PI * 0.9;
  shieldMesh.visible = false;
  leftArmPivot.add(shieldMesh);

  const rightArmPivot = new THREE.Group();
  rightArmPivot.position.set(0.4, 1.38, 0);
  const rightShoulder = new THREE.Mesh(new RoundedBoxGeometry(0.27, 0.24, 0.29, 4, 0.065), trimMat);
  rightShoulder.position.y = -0.06;
  const rightArm = new THREE.Mesh(new RoundedBoxGeometry(0.21, 0.64, 0.21, 3, 0.045), armorMat);
  rightArm.position.y = -0.32;
  rightArmPivot.add(rightShoulder, rightArm);

  const weaponModels = buildWeaponMeshes();
  (Object.keys(weaponModels) as WeaponSlotId[]).forEach((slot) => {
    weaponModels[slot].visible = slot === profile.loadout[0].id;
    rightArmPivot.add(weaponModels[slot]);
  });

  bodyGroup.add(leftArmPivot, rightArmPivot);

  // Aerodynamic Swept Elytra Glider Wings
  const wingsGroup = new THREE.Group();
  wingsGroup.position.set(0, 1.34, -0.18);
  const wingMat = makeClearcoatMat('#64748b', 0.24, 0.62, 0x38bdf8, 0.16, 0.85);
  const wingGeo = makeAerodynamicWingGeometry();
  const leftWing = new THREE.Mesh(wingGeo, wingMat);
  leftWing.position.set(-0.06, 0, 0);
  leftWing.rotation.z = 0.15;
  const rightWing = new THREE.Mesh(wingGeo, wingMat);
  rightWing.scale.x = -1;
  rightWing.position.set(0.06, 0, 0);
  rightWing.rotation.z = -0.15;
  wingsGroup.add(leftWing, rightWing);
  bodyGroup.add(wingsGroup);

  const shadowDisc = new THREE.Mesh(new THREE.CircleGeometry(0.58, 24), shadowMaterial);
  shadowDisc.rotation.x = -Math.PI / 2;
  shadowDisc.position.y = 0.02;
  root.add(shadowDisc);

  const telegraphRing = new THREE.Mesh(
    new THREE.RingGeometry(0.65, 0.95, 32),
    new THREE.MeshBasicMaterial({
      color: 0xef4444,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  telegraphRing.rotation.x = -Math.PI / 2;
  telegraphRing.position.y = 0.05;
  telegraphRing.visible = false;
  root.add(telegraphRing);

  if (enableShadows) {
    bodyGroup.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });
  }

  return {
    root,
    bodyGroup,
    headGroup,
    leftArmPivot,
    rightArmPivot,
    leftLegPivot,
    rightLegPivot,
    wingsGroup,
    leftWing,
    rightWing,
    shieldMesh,
    weaponModels,
    shadowDisc,
    hitFlashMaterials,
    baseEmissives,
    telegraphRing,
    setActiveWeapon: (slot: WeaponSlotId) => {
      (Object.keys(weaponModels) as WeaponSlotId[]).forEach((k) => {
        weaponModels[k].visible = k === slot;
      });
    },
    setHitFlash: (active: boolean, telegraphColor?: number) => {
      for (let i = 0; i < hitFlashMaterials.length; i++) {
        const m = hitFlashMaterials[i];
        if (active) {
          m.emissive.setHex(telegraphColor ?? 0xffffff);
          m.emissiveIntensity = telegraphColor ? 0.85 : 1.3;
        } else {
          m.emissive.copy(baseEmissives[i]);
          m.emissiveIntensity = baseEmissives[i].getHex() === 0 ? 0 : 0.25;
        }
      }
    },
    setOpacity: (opacity: number) => {
      for (const m of hitFlashMaterials) {
        m.transparent = opacity < 1;
        m.opacity = opacity;
      }
    },
  };
}

/**
 * Multi-layered smooth spider silk snare mesh.
 */
export function createCobwebMesh(): THREE.Group {
  const group = new THREE.Group();

  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 128, 128);
  ctx.strokeStyle = 'rgba(248, 250, 252, 0.94)';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';

  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(64, 64);
    ctx.lineTo(64 + Math.cos(a) * 60, 64 + Math.sin(a) * 60);
    ctx.stroke();
  }
  ctx.lineWidth = 2.2;
  [16, 30, 44, 57].forEach((r) => {
    ctx.beginPath();
    for (let i = 0; i <= 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const aMid = ((i - 0.5) / 10) * Math.PI * 2;
      const px = 64 + Math.cos(a) * r;
      const py = 64 + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.quadraticCurveTo(64 + Math.cos(aMid) * (r * 0.86), 64 + Math.sin(aMid) * (r * 0.86), px, py);
    }
    ctx.stroke();
  });

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
    alphaTest: 0.08,
  });

  const planeGeo = new THREE.PlaneGeometry(2.3, 1.9);
  for (let i = 0; i < 3; i++) {
    const p = new THREE.Mesh(planeGeo, mat);
    p.position.y = 0.95;
    p.rotation.y = (i * Math.PI) / 3;
    group.add(p);
  }

  const baseRing = new THREE.Mesh(
    new THREE.RingGeometry(0.95, 1.15, 28),
    new THREE.MeshBasicMaterial({
      color: 0xe2e8f0,
      transparent: true,
      opacity: 0.42,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  baseRing.rotation.x = -Math.PI / 2;
  baseRing.position.y = 0.04;

  group.add(baseRing);
  return group;
}

export interface EnemyOverheadBar {
  group: THREE.Group;
  fillMesh: THREE.Mesh;
  updateHp: (ratio: number) => void;
}

export function createEnemyOverheadBar(name: string, trimColor: string): EnemyOverheadBar {
  const group = new THREE.Group();
  group.position.set(0, 2.42, 0);

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 256, 64);
  ctx.font = 'bold 28px "Chakra Petch", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 6;
  ctx.strokeStyle = 'rgba(10, 12, 20, 0.92)';
  ctx.strokeText(name, 128, 34);
  ctx.fillStyle = '#f8fafc';
  ctx.fillText(name, 128, 34);

  const labelTex = new THREE.CanvasTexture(canvas);
  labelTex.colorSpace = THREE.SRGBColorSpace;
  const labelMat = new THREE.SpriteMaterial({ map: labelTex, transparent: true, depthTest: false });
  const labelSprite = new THREE.Sprite(labelMat);
  labelSprite.position.set(0, 0.26, 0);
  labelSprite.scale.set(1.9, 0.48, 1);
  group.add(labelSprite);

  const bgMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(1.24, 0.16),
    new THREE.MeshBasicMaterial({ color: 0x0b0d16, transparent: true, opacity: 0.85, side: THREE.DoubleSide })
  );
  group.add(bgMesh);

  const fillGeo = new THREE.PlaneGeometry(1.16, 0.1);
  fillGeo.translate(0.58, 0, 0);
  const fillMat = new THREE.MeshBasicMaterial({ color: trimColor, side: THREE.DoubleSide });
  const fillMesh = new THREE.Mesh(fillGeo, fillMat);
  fillMesh.position.set(-0.58, 0, 0.01);
  group.add(fillMesh);

  return {
    group,
    fillMesh,
    updateHp: (ratio: number) => {
      const clamped = Math.max(0.001, Math.min(1, ratio));
      fillMesh.scale.x = clamped;
      fillMat.color.set(clamped < 0.3 ? '#ef4444' : trimColor);
    },
  };
}

export interface FirstPersonRig {
  root: THREE.Group;
  handPivot: THREE.Group;
  shieldGroup: THREE.Group;
  weapons: Record<WeaponSlotId, THREE.Group>;
  setActiveWeapon: (slot: WeaponSlotId) => void;
}

export function createFirstPersonRig(profile: CharacterProfile): FirstPersonRig {
  const root = new THREE.Group();
  const handPivot = new THREE.Group();
  handPivot.position.set(0.46, -0.34, -0.62);
  root.add(handPivot);

  const armMesh = new THREE.Mesh(
    new RoundedBoxGeometry(0.16, 0.44, 0.16, 3, 0.035),
    makeMat(profile.primaryColor, 0.52, 0.28)
  );
  armMesh.position.set(0.08, -0.24, 0.12);
  armMesh.rotation.set(Math.PI * 0.34, 0, -0.18);
  handPivot.add(armMesh);

  const weapons = buildWeaponMeshes();
  (Object.keys(weapons) as WeaponSlotId[]).forEach((slot) => {
    const w = weapons[slot];
    w.position.set(0, 0.05, -0.08);
    w.scale.setScalar(0.68);
    w.visible = slot === profile.loadout[0].id;
    handPivot.add(w);
  });

  const shieldGroup = new THREE.Group();
  const shieldBoard = new THREE.Mesh(
    makeKiteShieldGeometry(0.32, 0.44, 0.04),
    makeMat('#334155', 0.34, 0.78)
  );
  const shieldTrim = new THREE.Mesh(
    new RoundedBoxGeometry(0.34, 0.1, 0.06, 2, 0.015),
    makeClearcoatMat(profile.trimColor, 0.2, 0.85, 0x000000, 0, 0.8)
  );
  shieldGroup.add(shieldBoard, shieldTrim);
  shieldGroup.position.set(-0.42, -0.28, -0.52);
  shieldGroup.rotation.y = 0.25;
  shieldGroup.visible = false;
  root.add(shieldGroup);

  return {
    root,
    handPivot,
    shieldGroup,
    weapons,
    setActiveWeapon: (slot: WeaponSlotId) => {
      (Object.keys(weapons) as WeaponSlotId[]).forEach((k) => {
        weapons[k].visible = k === slot;
      });
    },
  };
}

export function createHazardPoolMesh(
  kind: 'lava' | 'water',
  radius = 2.0,
  lavaTex?: THREE.Texture
): THREE.Group {
  const group = new THREE.Group();
  const isLava = kind === 'lava';

  const discMat = isLava
    ? new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: lavaTex ?? null,
        emissive: 0xea580c,
        emissiveIntensity: 0.9,
        roughness: 0.28,
        metalness: 0.1,
      })
    : new THREE.MeshPhysicalMaterial({
        color: 0x0ea5e9,
        emissive: 0x0284c7,
        emissiveIntensity: 0.35,
        roughness: 0.08,
        metalness: 0.05,
        clearcoat: 1.0,
        clearcoatRoughness: 0.06,
        transparent: true,
        opacity: 0.76,
      });

  const disc = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 1.03, 0.08, 32), discMat);
  disc.position.y = 0.04;

  // Sculpted stone border torus instead of flat paper ring
  const stoneRim = new THREE.Mesh(
    new THREE.TorusGeometry(radius, 0.12, 10, 32),
    makeMat(isLava ? 0x332b29 : 0x64748b, 0.85, 0.1)
  );
  stoneRim.rotation.x = Math.PI / 2;
  stoneRim.scale.set(1, 1, 0.45);
  stoneRim.position.y = 0.05;

  const glowRim = new THREE.Mesh(
    new THREE.RingGeometry(radius * 0.84, radius * 0.98, 32),
    new THREE.MeshBasicMaterial({
      color: isLava ? 0xfef08a : 0xbae6fd,
      transparent: true,
      opacity: isLava ? 0.55 : 0.45,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  glowRim.rotation.x = -Math.PI / 2;
  glowRim.position.y = 0.095;

  group.add(disc, stoneRim, glowRim);
  return group;
}

export function createTntBlockMesh(): THREE.Group {
  const g = new THREE.Group();
  const red = new THREE.Mesh(
    new RoundedBoxGeometry(0.84, 0.86, 0.84, 3, 0.06),
    makeMat(0xdc2626, 0.55, 0.12, 0x991b1b, 0.35)
  );
  const band = new THREE.Mesh(
    new RoundedBoxGeometry(0.87, 0.26, 0.87, 3, 0.03),
    makeMat(0xf8fafc, 0.75, 0.05, 0xffffff, 0.2)
  );
  const fuseCap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.1, 0.14, 12),
    makeMat(0x334155, 0.4, 0.7)
  );
  fuseCap.position.y = 0.47;
  g.add(red, band, fuseCap);
  return g;
}
