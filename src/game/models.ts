import * as THREE from 'three';
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

function buildWeaponMeshes(): Record<WeaponSlotId, THREE.Group> {
  const darkMetal = makeMat(0x2d2a35, 0.3, 0.8);
  const goldAccent = makeMat(0xf59e0b, 0.22, 0.88);
  const woodMat = makeMat(0x4b2e1b, 0.82, 0.05);

  // 1. Netherite Sword
  const sword = new THREE.Group();
  const netherEdge = makeMat(0x524a64, 0.2, 0.9, 0x7c3aed, 0.28);
  const sPommel = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.11, 0.11), goldAccent);
  sPommel.position.set(0, -0.14, 0.04);
  const sHilt = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.22, 0.07), woodMat);
  sHilt.position.set(0, -0.02, 0.04);
  const sGuard = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.06, 0.1), goldAccent);
  sGuard.position.set(0, 0.1, 0.04);
  const sBlade = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.78, 0.05), darkMetal);
  sBlade.position.set(0, 0.51, 0.04);
  const sEdge = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.82, 0.065), netherEdge);
  sEdge.position.set(0, 0.53, 0.04);
  sword.add(sPommel, sHilt, sGuard, sBlade, sEdge);
  sword.rotation.x = Math.PI * 0.42;
  sword.position.set(0, -0.58, 0.15);

  // 2. Fire Aspect Sword
  const fire_sword = new THREE.Group();
  const fireBlade = new THREE.Mesh(
    new THREE.BoxGeometry(0.13, 0.8, 0.055),
    makeMat(0xf97316, 0.22, 0.65, 0xea580c, 0.7)
  );
  fireBlade.position.set(0, 0.52, 0.04);
  const fireCore = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.84, 0.07),
    makeMat(0xfef08a, 0.15, 0.3, 0xf59e0b, 0.95)
  );
  fireCore.position.set(0, 0.54, 0.04);
  fire_sword.add(sPommel.clone(), sHilt.clone(), sGuard.clone(), fireBlade, fireCore);
  fire_sword.rotation.x = Math.PI * 0.42;
  fire_sword.position.set(0, -0.58, 0.15);

  // 3. Orbital Spear
  const spear = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.04, 1.35, 8), woodMat);
  shaft.position.set(0, 0.4, 0.04);
  const spearTip = new THREE.Mesh(
    new THREE.ConeGeometry(0.1, 0.36, 4),
    makeMat(0xc084fc, 0.2, 0.85, 0x9333ea, 0.45)
  );
  spearTip.position.set(0, 1.2, 0.04);
  const spearCollar = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.06, 0.12), goldAccent);
  spearCollar.position.set(0, 1.0, 0.04);
  spear.add(shaft, spearTip, spearCollar);
  spear.rotation.x = Math.PI * 0.45;
  spear.position.set(0, -0.55, 0.18);

  // 4. Heavy Axe
  const axe = new THREE.Group();
  const axeHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.045, 0.92, 8), woodMat);
  axeHandle.position.set(0, 0.25, 0.04);
  const axeHead = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 0.34, 0.36),
    makeMat(0x3f3a4a, 0.28, 0.88, 0xf59e0b, 0.18)
  );
  axeHead.position.set(0, 0.66, 0.14);
  const axeEdge = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.38, 0.12),
    makeMat(0xfbbf24, 0.2, 0.9, 0xd97706, 0.35)
  );
  axeEdge.position.set(0, 0.66, 0.3);
  axe.add(axeHandle, axeHead, axeEdge);
  axe.rotation.x = Math.PI * 0.4;
  axe.position.set(0, -0.58, 0.15);

  // 5. Heavy Mace
  const mace = new THREE.Group();
  const rod = new THREE.Mesh(
    new THREE.CylinderGeometry(0.045, 0.05, 0.8, 8),
    makeMat(0x7dd3fc, 0.3, 0.5, 0x0284c7, 0.35)
  );
  rod.position.set(0, 0.24, 0.04);
  const maceHead = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.34, 0.34), makeMat(0x334155, 0.25, 0.85));
  maceHead.position.set(0, 0.64, 0.04);
  const maceBand = new THREE.Mesh(
    new THREE.BoxGeometry(0.38, 0.1, 0.38),
    makeMat(0xf59e0b, 0.2, 0.9, 0xb45309, 0.25)
  );
  maceBand.position.set(0, 0.64, 0.04);
  const maceCore = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.13, 0),
    makeMat(0x38bdf8, 0.15, 0.4, 0x0ea5e9, 0.85)
  );
  maceCore.position.set(0, 0.84, 0.04);
  mace.add(rod, maceHead, maceBand, maceCore);
  mace.rotation.x = Math.PI * 0.38;
  mace.position.set(0, -0.56, 0.16);

  // 6. Trident
  const trident = new THREE.Group();
  const triMat = makeMat(0x2dd4bf, 0.22, 0.72, 0x0d9488, 0.4);
  const triShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.038, 1.15, 8), triMat);
  triShaft.position.set(0, 0.34, 0.04);
  const triCross = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.06, 0.06), triMat);
  triCross.position.set(0, 0.9, 0.04);
  const prongM = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.32, 0.05), triMat);
  prongM.position.set(0, 1.08, 0.04);
  const prongL = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.24, 0.045), triMat);
  prongL.position.set(-0.13, 1.02, 0.04);
  const prongR = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.24, 0.045), triMat);
  prongR.position.set(0.13, 1.02, 0.04);
  trident.add(triShaft, triCross, prongM, prongL, prongR);
  trident.rotation.x = Math.PI * 0.44;
  trident.position.set(0, -0.56, 0.18);

  // 7. Wind Charge
  const wind_charge = new THREE.Group();
  const windCore = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.16, 1),
    makeMat(0xe0f2fe, 0.2, 0.2, 0x7dd3fc, 0.7)
  );
  const windRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.2, 0.035, 6, 12),
    makeMat(0x38bdf8, 0.25, 0.3, 0x0284c7, 0.5)
  );
  windRing.rotation.x = Math.PI / 2.5;
  wind_charge.add(windCore, windRing);
  wind_charge.position.set(0, -0.62, 0.22);

  // 8. Cobweb Cube Held
  const cobweb = new THREE.Group();
  const webBox = new THREE.Mesh(
    new THREE.BoxGeometry(0.26, 0.26, 0.26),
    new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      roughness: 0.9,
      wireframe: true,
      emissive: 0xcbd5e1,
      emissiveIntensity: 0.35,
    })
  );
  const webInner = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.12, 0),
    makeMat(0xffffff, 0.85, 0.05, 0xe2e8f0, 0.4)
  );
  cobweb.add(webBox, webInner);
  cobweb.position.set(0, -0.62, 0.22);

  // 9. TNT Bomb
  const tnt_charge = new THREE.Group();
  const tntBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.26, 0.26, 0.26),
    makeMat(0xdc2626, 0.65, 0.1, 0x991b1b, 0.3)
  );
  const tntBand = new THREE.Mesh(new THREE.BoxGeometry(0.27, 0.09, 0.27), makeMat(0xf8fafc, 0.8, 0.05));
  tnt_charge.add(tntBody, tntBand);
  tnt_charge.position.set(0, -0.62, 0.22);

  // 10. Ender Pearl
  const ender_pearl = new THREE.Group();
  const pearlShell = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.16, 1),
    makeMat(0x0f766e, 0.15, 0.5, 0x2dd4bf, 0.4)
  );
  const pearlCore = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.09, 0),
    makeMat(0xa855f7, 0.1, 0.2, 0xc084fc, 0.9)
  );
  ender_pearl.add(pearlShell, pearlCore);
  ender_pearl.position.set(0, -0.62, 0.22);

  // 11. Shadow Step Cloak Gem
  const shadow_step = new THREE.Group();
  const cloakGem = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.18, 0),
    makeMat(0x6366f1, 0.15, 0.4, 0x818cf8, 0.85)
  );
  shadow_step.add(cloakGem);
  shadow_step.position.set(0, -0.62, 0.22);

  // 12. Golden Apple
  const gapple = new THREE.Group();
  const appleBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.24, 0.22, 0.24),
    makeMat(0xfbbf24, 0.18, 0.88, 0xd97706, 0.35)
  );
  const stem = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.1, 0.05), woodMat);
  stem.position.y = 0.15;
  const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.05, 0.06), makeMat(0x22c55e, 0.6, 0.05));
  leaf.position.set(0.06, 0.16, 0);
  gapple.add(appleBody, stem, leaf);
  gapple.position.set(0, -0.62, 0.22);

  // 13. Splash Healing Potion
  const potion = new THREE.Group();
  const bottle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.11, 0.13, 0.22, 8),
    makeMat(0xf43f5e, 0.15, 0.2, 0xfb7185, 0.65)
  );
  const cork = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.08, 6), woodMat);
  cork.position.y = 0.14;
  potion.add(bottle, cork);
  potion.position.set(0, -0.62, 0.22);

  // 14. Lava Bucket
  const lava_bucket = new THREE.Group();
  const bucketMat = makeMat(0x94a3b8, 0.3, 0.85);
  const bucketShell = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.1, 0.24, 8), bucketMat);
  const lavaFill = new THREE.Mesh(
    new THREE.CylinderGeometry(0.125, 0.11, 0.06, 8),
    makeMat(0xf97316, 0.25, 0.1, 0xea580c, 0.95)
  );
  lavaFill.position.y = 0.1;
  lava_bucket.add(bucketShell, lavaFill);
  lava_bucket.position.set(0, -0.62, 0.22);

  // 15. Water Bucket
  const water_bucket = new THREE.Group();
  const waterShell = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.1, 0.24, 8), bucketMat);
  const waterFill = new THREE.Mesh(
    new THREE.CylinderGeometry(0.125, 0.11, 0.06, 8),
    makeMat(0x38bdf8, 0.15, 0.2, 0x0ea5e9, 0.7)
  );
  waterFill.position.y = 0.1;
  water_bucket.add(waterShell, waterFill);
  water_bucket.position.set(0, -0.62, 0.22);

  // 16. Building Block (Obsidian/Deepslate Voxel)
  const build_block = new THREE.Group();
  const blockCore = new THREE.Mesh(
    new THREE.BoxGeometry(0.25, 0.25, 0.25),
    makeMat(0x475569, 0.72, 0.2, 0x64748b, 0.15)
  );
  const blockRim = new THREE.Mesh(
    new THREE.BoxGeometry(0.27, 0.07, 0.27),
    makeMat(0x94a3b8, 0.4, 0.5)
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

  const registerMat = (mat: THREE.MeshStandardMaterial) => {
    hitFlashMaterials.push(mat);
    baseEmissives.push(mat.emissive.clone());
    return mat;
  };

  const armorMat = registerMat(makeMat(profile.primaryColor, 0.55, 0.35));
  const trimMat = registerMat(
    makeMat(profile.trimColor, 0.22, 0.82, new THREE.Color(profile.trimColor).getHex(), 0.2)
  );
  const skinMat = registerMat(makeMat(profile.skinColor, 0.78, 0.04));
  const pantsMat = registerMat(makeMat('#1f2430', 0.82, 0.12));
  const visorMat = registerMat(
    makeMat(profile.visorColor, 0.15, 0.3, new THREE.Color(profile.visorColor).getHex(), 0.55)
  );

  // Legs
  const leftLegPivot = new THREE.Group();
  leftLegPivot.position.set(-0.15, 0.72, 0);
  const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.72, 0.26), pantsMat);
  leftLeg.position.y = -0.36;
  const leftBoot = new THREE.Mesh(new THREE.BoxGeometry(0.27, 0.2, 0.29), trimMat);
  leftBoot.position.set(0, -0.62, 0.01);
  leftLegPivot.add(leftLeg, leftBoot);

  const rightLegPivot = new THREE.Group();
  rightLegPivot.position.set(0.15, 0.72, 0);
  const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.72, 0.26), pantsMat);
  rightLeg.position.y = -0.36;
  const rightBoot = new THREE.Mesh(new THREE.BoxGeometry(0.27, 0.2, 0.29), trimMat);
  rightBoot.position.set(0, -0.62, 0.01);
  rightLegPivot.add(rightLeg, rightBoot);

  bodyGroup.add(leftLegPivot, rightLegPivot);

  // Torso
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.72, 0.3), armorMat);
  torso.position.set(0, 1.08, 0);
  const chestPlate = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.42, 0.34), trimMat);
  chestPlate.position.set(0, 1.18, 0);
  const belt = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.12, 0.33), makeMat('#11131a', 0.5, 0.6));
  belt.position.set(0, 0.78, 0);
  bodyGroup.add(torso, chestPlate, belt);

  // Head + Hair + Headgear
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.46, 0);
  const headMesh = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.46, 0.46), skinMat);
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
  const hairMat = registerMat(makeMat(hairColors[profile.id] ?? '#1f2937', 0.85, 0.05));
  const hairTop = new THREE.Mesh(new THREE.BoxGeometry(0.49, 0.14, 0.49), hairMat);
  hairTop.position.set(0, 0.42, -0.01);
  const hairBack = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.38, 0.14), hairMat);
  hairBack.position.set(0, 0.22, -0.19);
  const hairSideL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.24, 0.34), hairMat);
  hairSideL.position.set(-0.22, 0.28, -0.04);
  const hairSideR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.24, 0.34), hairMat);
  hairSideR.position.set(0.22, 0.28, -0.04);
  headGroup.add(hairTop, hairBack, hairSideL, hairSideR);

  const eyeLeft = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.07, 0.04), visorMat);
  eyeLeft.position.set(-0.1, 0.24, 0.235);
  const eyeRight = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.07, 0.04), visorMat);
  eyeRight.position.set(0.1, 0.24, 0.235);
  headGroup.add(eyeLeft, eyeRight);

  if (profile.headgear === 'crown') {
    const crownBand = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 0.5), trimMat);
    crownBand.position.y = 0.5;
    const gem = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.12), visorMat);
    gem.position.set(0, 0.57, 0.2);
    headGroup.add(crownBand, gem);
  } else if (profile.headgear === 'hood') {
    const hoodTop = new THREE.Mesh(new THREE.BoxGeometry(0.53, 0.14, 0.53), armorMat);
    hoodTop.position.y = 0.47;
    const hoodBack = new THREE.Mesh(new THREE.BoxGeometry(0.53, 0.46, 0.16), armorMat);
    hoodBack.position.set(0, 0.24, -0.22);
    headGroup.add(hoodTop, hoodBack);
  } else if (profile.headgear === 'visor') {
    const visorBar = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.12, 0.08), visorMat);
    visorBar.position.set(0, 0.25, 0.235);
    headGroup.add(visorBar);
  } else if (profile.headgear === 'headband') {
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.51, 0.1, 0.51), armorMat);
    band.position.y = 0.36;
    const knot = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.2, 0.1), trimMat);
    knot.position.set(0, 0.32, -0.28);
    headGroup.add(band, knot);
  } else {
    const hornL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.22, 0.1), trimMat);
    hornL.position.set(-0.24, 0.52, 0);
    hornL.rotation.z = 0.3;
    const hornR = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.22, 0.1), trimMat);
    hornR.position.set(0.24, 0.52, 0);
    hornR.rotation.z = -0.3;
    headGroup.add(hornL, hornR);
  }
  bodyGroup.add(headGroup);

  // Arms
  const leftArmPivot = new THREE.Group();
  leftArmPivot.position.set(-0.4, 1.38, 0);
  const leftShoulder = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.24, 0.28), trimMat);
  leftShoulder.position.y = -0.06;
  const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.64, 0.22), armorMat);
  leftArm.position.y = -0.32;
  leftArmPivot.add(leftShoulder, leftArm);

  const shieldMesh = new THREE.Group();
  const shieldBoard = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.66, 0.44), makeMat('#334155', 0.4, 0.7));
  const shieldTrim = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.2, 0.46), trimMat);
  shieldMesh.add(shieldBoard, shieldTrim);
  shieldMesh.position.set(-0.14, -0.38, 0.14);
  shieldMesh.rotation.y = Math.PI * 0.4;
  shieldMesh.visible = false;
  leftArmPivot.add(shieldMesh);

  const rightArmPivot = new THREE.Group();
  rightArmPivot.position.set(0.4, 1.38, 0);
  const rightShoulder = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.24, 0.28), trimMat);
  rightShoulder.position.y = -0.06;
  const rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.64, 0.22), armorMat);
  rightArm.position.y = -0.32;
  rightArmPivot.add(rightShoulder, rightArm);

  const weaponModels = buildWeaponMeshes();
  (Object.keys(weaponModels) as WeaponSlotId[]).forEach((slot) => {
    weaponModels[slot].visible = slot === profile.loadout[0].id;
    rightArmPivot.add(weaponModels[slot]);
  });

  bodyGroup.add(leftArmPivot, rightArmPivot);

  // Elytra Wings
  const wingsGroup = new THREE.Group();
  wingsGroup.position.set(0, 1.34, -0.17);
  const wingMat = makeMat('#64748b', 0.35, 0.55, 0x38bdf8, 0.15);
  const leftWing = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.85, 0.05), wingMat);
  leftWing.position.set(-0.16, -0.4, 0);
  leftWing.rotation.z = 0.15;
  const rightWing = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.85, 0.05), wingMat);
  rightWing.position.set(0.16, -0.4, 0);
  rightWing.rotation.z = -0.15;
  wingsGroup.add(leftWing, rightWing);
  bodyGroup.add(wingsGroup);

  const shadowDisc = new THREE.Mesh(new THREE.CircleGeometry(0.55, 20), shadowMaterial);
  shadowDisc.rotation.x = -Math.PI / 2;
  shadowDisc.position.y = 0.02;
  root.add(shadowDisc);

  const telegraphRing = new THREE.Mesh(
    new THREE.RingGeometry(0.65, 0.95, 24),
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
 * Creates a crisp Minecraft-style 3D crossed-planes Cobweb cube mesh.
 */
export function createCobwebMesh(): THREE.Group {
  const group = new THREE.Group();

  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 64, 64);
  ctx.strokeStyle = 'rgba(241, 245, 249, 0.92)';
  ctx.lineWidth = 3;

  // Radial web threads
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(32, 32);
    ctx.lineTo(32 + Math.cos(a) * 30, 32 + Math.sin(a) * 30);
    ctx.stroke();
  }
  // Concentric web rings
  ctx.lineWidth = 2.2;
  [10, 19, 28].forEach((r) => {
    ctx.beginPath();
    ctx.arc(32, 32, r, 0, Math.PI * 2);
    ctx.stroke();
  });

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
    alphaTest: 0.1,
  });

  const planeGeo = new THREE.PlaneGeometry(2.3, 1.9);
  const p1 = new THREE.Mesh(planeGeo, mat);
  p1.position.y = 0.95;
  p1.rotation.y = Math.PI / 4;
  const p2 = new THREE.Mesh(planeGeo, mat);
  p2.position.y = 0.95;
  p2.rotation.y = -Math.PI / 4;

  const baseRing = new THREE.Mesh(
    new THREE.RingGeometry(0.95, 1.15, 16),
    new THREE.MeshBasicMaterial({
      color: 0xe2e8f0,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  baseRing.rotation.x = -Math.PI / 2;
  baseRing.position.y = 0.04;

  group.add(p1, p2, baseRing);
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
    new THREE.BoxGeometry(0.16, 0.44, 0.16),
    makeMat(profile.primaryColor, 0.6, 0.25)
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
  const shieldBoard = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.42, 0.05), makeMat('#334155', 0.4, 0.7));
  const shieldTrim = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.12, 0.06), makeMat(profile.trimColor, 0.25, 0.8));
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

export function createHazardPoolMesh(kind: 'lava' | 'water', radius = 2.0): THREE.Group {
  const group = new THREE.Group();
  const isLava = kind === 'lava';
  const disc = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius * 1.04, 0.1, 18),
    new THREE.MeshStandardMaterial({
      color: isLava ? 0xf97316 : 0x0ea5e9,
      emissive: isLava ? 0xea580c : 0x0284c7,
      emissiveIntensity: isLava ? 0.95 : 0.45,
      roughness: isLava ? 0.35 : 0.15,
      metalness: 0.1,
      transparent: !isLava,
      opacity: isLava ? 1.0 : 0.78,
    })
  );
  disc.position.y = 0.05;

  const rim = new THREE.Mesh(
    new THREE.RingGeometry(radius * 0.88, radius * 1.06, 20),
    new THREE.MeshBasicMaterial({
      color: isLava ? 0xfef08a : 0x7dd3fc,
      transparent: true,
      opacity: isLava ? 0.65 : 0.55,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  rim.rotation.x = -Math.PI / 2;
  rim.position.y = 0.11;

  group.add(disc, rim);
  return group;
}

export function createTntBlockMesh(): THREE.Group {
  const g = new THREE.Group();
  const red = new THREE.Mesh(
    new THREE.BoxGeometry(0.85, 0.85, 0.85),
    makeMat(0xdc2626, 0.6, 0.1, 0x991b1b, 0.4)
  );
  const band = new THREE.Mesh(
    new THREE.BoxGeometry(0.87, 0.28, 0.87),
    makeMat(0xf8fafc, 0.8, 0.05, 0xffffff, 0.25)
  );
  g.add(red, band);
  return g;
}

