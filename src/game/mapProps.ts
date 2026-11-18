import * as THREE from 'three';
import type { MapId } from './types';
import type { MapDefinition } from './maps';

export interface AnimatedMapProp {
  obj: THREE.Object3D;
  kind: 'spinY' | 'spinZ' | 'spinX' | 'bob';
  speed: number;
  baseY: number;
  phase: number;
}

export interface BuiltMapSignatureProps {
  group: THREE.Group;
  animatedProps: AnimatedMapProp[];
  materials: THREE.Material[];
}

/**
 * Builds iconic, bespoke 3D architectural centerpieces, animated monuments,
 * and perimeter skyline props tailored to each of the 20 arenas.
 */
export function buildMapSignatureProps(
  mapId: MapId,
  mapDef: MapDefinition,
  arenaRadius: number,
  isCompactPreview = false
): BuiltMapSignatureProps {
  const group = new THREE.Group();
  const animatedProps: AnimatedMapProp[] = [];
  const materials: THREE.Material[] = [];

  const trackMat = <T extends THREE.Material>(m: T): T => {
    materials.push(m);
    return m;
  };

  const accentMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: mapDef.ringPrimary,
      emissive: mapDef.ringEmissive,
      emissiveIntensity: 0.72,
      roughness: 0.24,
      metalness: 0.68,
    })
  );

  const goldMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      emissive: 0xd97706,
      emissiveIntensity: 0.35,
      roughness: 0.25,
      metalness: 0.85,
    })
  );

  const darkSteelMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.45,
      metalness: 0.78,
    })
  );

  const stoneTrimMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughness: 0.72,
      metalness: 0.12,
    })
  );

  const outerR = arenaRadius + 6.5;

  // Helper: cardinal / radial glowing beacon banners
  const addBannerRow = (bannerColor: number, count: number, radius: number, height: number) => {
    const poleGeo = new THREE.CylinderGeometry(0.14, 0.18, height, 8);
    const flagGeo = new THREE.BoxGeometry(1.7, 2.8, 0.14);
    const flagMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: bannerColor,
        emissive: bannerColor,
        emissiveIntensity: 0.28,
        roughness: 0.65,
      })
    );
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + Math.PI / count;
      const px = Math.cos(a) * radius;
      const pz = Math.sin(a) * radius;
      const g = new THREE.Group();
      g.position.set(px, 0, pz);
      g.rotation.y = -a + Math.PI * 0.5;
      const pole = new THREE.Mesh(poleGeo, darkSteelMat);
      pole.position.y = height * 0.5;
      const flag = new THREE.Mesh(flagGeo, flagMat);
      flag.position.set(0, height - 1.5, 0.25);
      g.add(pole, flag);
      group.add(g);
    }
  };

  switch (mapId) {
    case 'container_yard': {
      // Colossal Harbor Gantry Crane arching over the whole port yard!
      const yellowMat = trackMat(
        new THREE.MeshStandardMaterial({
          color: 0xf59e0b,
          roughness: 0.35,
          metalness: 0.65,
        })
      );
      const legGeo = new THREE.BoxGeometry(1.8, 22, 1.8);
      const beamGeo = new THREE.BoxGeometry(74, 2.2, 3.0);
      const trolleyGeo = new THREE.BoxGeometry(4.8, 1.8, 4.2);
      const cableGeo = new THREE.CylinderGeometry(0.08, 0.08, 7.5, 6);

      for (const lx of [-34, 34]) {
        for (const lz of [-2.2, 2.2]) {
          const leg = new THREE.Mesh(legGeo, yellowMat);
          leg.position.set(lx, 11, lz);
          group.add(leg);
        }
      }
      const gantryBeam = new THREE.Mesh(beamGeo, yellowMat);
      gantryBeam.position.set(0, 22.5, 0);
      group.add(gantryBeam);

      const trolley = new THREE.Group();
      trolley.position.set(0, 20.8, 0);
      const cab = new THREE.Mesh(trolleyGeo, darkSteelMat);
      const cable = new THREE.Mesh(cableGeo, darkSteelMat);
      cable.position.y = -4.2;
      const hookCrate = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.2, 5.2), accentMat);
      hookCrate.position.y = -8.4;
      trolley.add(cab, cable, hookCrate);
      group.add(trolley);
      animatedProps.push({ obj: trolley, kind: 'bob', speed: 1.2, baseY: 20.8, phase: 0 });
      addBannerRow(0x2563eb, 8, arenaRadius + 1.5, 9.5);
      break;
    }

    case 'emerald_citadel': {
      // Floating Giant Emerald Crown Jewel above Mid + Royal Emerald Banners
      const crownGeo = new THREE.OctahedronGeometry(2.3, 0);
      const emeraldMat = trackMat(
        new THREE.MeshPhysicalMaterial({
          color: 0x10b981,
          emissive: 0x059669,
          emissiveIntensity: 0.78,
          roughness: 0.12,
          metalness: 0.2,
          clearcoat: 1,
        })
      );
      const gem = new THREE.Mesh(crownGeo, emeraldMat);
      gem.position.set(0, 15.5, 0);
      const halo = new THREE.Mesh(new THREE.TorusGeometry(3.5, 0.16, 10, 32), goldMat);
      halo.rotation.x = Math.PI / 2;
      gem.add(halo);
      group.add(gem);
      animatedProps.push({ obj: gem, kind: 'spinY', speed: 0.9, baseY: 15.5, phase: 0 });
      addBannerRow(0x10b981, 8, arenaRadius - 0.5, 9.2);
      break;
    }

    case 'sky_dock': {
      // Floating Sky-Cruiser Airship docked overhead + Runway Light Strips
      const ship = new THREE.Group();
      ship.position.set(0, 21.5, -24);
      const hullMat = trackMat(
        new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35, metalness: 0.45 })
      );
      const balloon = new THREE.Mesh(new THREE.CapsuleGeometry(3.2, 16, 8, 16), hullMat);
      balloon.rotation.z = Math.PI / 2;
      const gondola = new THREE.Mesh(new THREE.BoxGeometry(10, 2.2, 3.2), darkSteelMat);
      gondola.position.y = -4.2;
      const fin = new THREE.Mesh(new THREE.BoxGeometry(3.5, 4.2, 0.3), accentMat);
      fin.position.set(-9.5, 1.4, 0);
      const engineRingL = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.22, 8, 18), accentMat);
      engineRingL.rotation.y = Math.PI / 2;
      engineRingL.position.set(-6.5, -2.5, 3.4);
      const engineRingR = engineRingL.clone();
      engineRingR.position.z = -3.4;
      ship.add(balloon, gondola, fin, engineRingL, engineRingR);
      group.add(ship);
      animatedProps.push({ obj: ship, kind: 'bob', speed: 1.1, baseY: 21.5, phase: 0.4 });

      // Runway glowing beacon pylons
      const pylonGeo = new THREE.BoxGeometry(0.7, 0.25, 2.6);
      for (const z of [-12, -4, 4, 12]) {
        for (const x of [-13, 13]) {
          const strip = new THREE.Mesh(pylonGeo, accentMat);
          strip.position.set(x, 2.95, z);
          group.add(strip);
        }
      }
      break;
    }

    case 'nether_foundry': {
      // Giant Nether Crucible Cauldrons + Glowing Lava Pour Pillars + Basalt Horns
      const magmaMat = trackMat(
        new THREE.MeshStandardMaterial({
          color: 0xf97316,
          emissive: 0xea580c,
          emissiveIntensity: 1.3,
          roughness: 0.2,
        })
      );
      const hornGeo = new THREE.ConeGeometry(2.6, 17, 5);
      const potGeo = new THREE.CylinderGeometry(2.6, 2.0, 2.8, 10);
      const pourGeo = new THREE.CylinderGeometry(0.45, 0.55, 11, 8);
      for (const [cx, cz] of [
        [-26, -22],
        [26, -22],
        [-26, 22],
        [26, 22],
      ]) {
        const pot = new THREE.Mesh(potGeo, darkSteelMat);
        pot.position.set(cx, 11.4, cz);
        const molten = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.1, 0.4, 10), magmaMat);
        molten.position.set(cx, 12.75, cz);
        const pour = new THREE.Mesh(pourGeo, magmaMat);
        pour.position.set(cx * 0.88, 5.5, cz * 0.88);
        group.add(pot, molten, pour);
      }
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const horn = new THREE.Mesh(hornGeo, darkSteelMat);
        horn.position.set(Math.cos(a) * outerR, 8.5, Math.sin(a) * outerR);
        horn.lookAt(0, 14, 0);
        horn.rotateX(Math.PI * 0.42);
        group.add(horn);
      }
      break;
    }

    case 'cyber_nexus': {
      // Spinning Holographic Data Core Cube + Twin Orbiting Cyber Rings overhead
      const holoGroup = new THREE.Group();
      holoGroup.position.set(0, 15.2, 0);
      const coreCube = new THREE.Mesh(new THREE.BoxGeometry(3.0, 3.0, 3.0), accentMat);
      const ringA = new THREE.Mesh(new THREE.TorusGeometry(4.6, 0.16, 10, 32), accentMat);
      const ringB = new THREE.Mesh(new THREE.TorusGeometry(5.8, 0.14, 10, 32), goldMat);
      ringA.rotation.x = Math.PI / 3;
      ringB.rotation.y = Math.PI / 3;
      holoGroup.add(coreCube, ringA, ringB);
      group.add(holoGroup);
      animatedProps.push({ obj: holoGroup, kind: 'spinY', speed: 1.15, baseY: 15.2, phase: 0 });
      animatedProps.push({ obj: ringA, kind: 'spinX', speed: 1.5, baseY: 0, phase: 0 });

      // Neon perimeter server towers
      const towerGeo = new THREE.BoxGeometry(2.4, 19, 2.4);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + 0.2;
        const tx = Math.cos(a) * (outerR + 2);
        const tz = Math.sin(a) * (outerR + 2);
        const tw = new THREE.Mesh(towerGeo, darkSteelMat);
        tw.position.set(tx, 9.5, tz);
        const strip = new THREE.Mesh(new THREE.BoxGeometry(0.4, 17, 2.55), accentMat);
        strip.position.set(tx, 9.5, tz);
        strip.rotation.y = a;
        group.add(tw, strip);
      }
      break;
    }

    case 'frost_bastion': {
      // Jagged Glacial Icebergs + Aurora Crystal Crown overhead
      const iceMat = trackMat(
        new THREE.MeshPhysicalMaterial({
          color: 0xe0f2fe,
          emissive: 0x0284c7,
          emissiveIntensity: 0.38,
          roughness: 0.14,
          metalness: 0.15,
          clearcoat: 1,
        })
      );
      const glacierGeo = new THREE.ConeGeometry(4.2, 21, 5);
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        const r = outerR + (i % 2) * 3.5;
        const ice = new THREE.Mesh(glacierGeo, iceMat);
        ice.position.set(Math.cos(a) * r, 9.5, Math.sin(a) * r);
        ice.rotation.set((i % 3 - 1) * 0.14, a, ((i + 1) % 3 - 1) * 0.12);
        group.add(ice);
      }
      const snowStar = new THREE.Mesh(new THREE.OctahedronGeometry(2.4, 1), iceMat);
      snowStar.position.set(0, 15.8, 0);
      group.add(snowStar);
      animatedProps.push({ obj: snowStar, kind: 'spinY', speed: 0.85, baseY: 15.8, phase: 0 });
      break;
    }

    case 'ancient_temple': {
      // Colossal Golden Desert Pyramids + Flaming Ankh Sun Obelisks
      const sandMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xd9b372, roughness: 0.88 }));
      const pyrGeo = new THREE.ConeGeometry(14, 19, 4);
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + Math.PI * 0.25;
        const p = new THREE.Mesh(pyrGeo, sandMat);
        p.position.set(Math.cos(a) * (outerR + 10), 9.2, Math.sin(a) * (outerR + 10));
        p.rotation.y = Math.PI * 0.25;
        const tip = new THREE.Mesh(new THREE.ConeGeometry(2.8, 3.8, 4), goldMat);
        tip.position.set(p.position.x, 17.5, p.position.z);
        tip.rotation.y = Math.PI * 0.25;
        group.add(p, tip);
      }
      const sunDisc = new THREE.Mesh(new THREE.TorusGeometry(3.2, 0.35, 10, 28), goldMat);
      sunDisc.position.set(0, 15.5, 0);
      group.add(sunDisc);
      animatedProps.push({ obj: sunDisc, kind: 'spinY', speed: 0.75, baseY: 15.5, phase: 0 });
      break;
    }

    case 'orbital_reactor': {
      // Massive 3-Axis Spinning Tokamak Plasma Rings over Center Core
      const reactor = new THREE.Group();
      reactor.position.set(0, 15.6, 0);
      const coreSphere = new THREE.Mesh(new THREE.IcosahedronGeometry(2.1, 1), accentMat);
      const r1 = new THREE.Mesh(new THREE.TorusGeometry(4.5, 0.24, 12, 36), accentMat);
      const r2 = new THREE.Mesh(new THREE.TorusGeometry(5.8, 0.2, 12, 36), goldMat);
      const r3 = new THREE.Mesh(new THREE.TorusGeometry(7.0, 0.16, 10, 36), accentMat);
      r2.rotation.x = Math.PI / 2.3;
      r3.rotation.y = Math.PI / 2.5;
      reactor.add(coreSphere, r1, r2, r3);
      group.add(reactor);
      animatedProps.push({ obj: reactor, kind: 'spinY', speed: 1.0, baseY: 15.6, phase: 0 });
      animatedProps.push({ obj: r1, kind: 'spinX', speed: 1.4, baseY: 0, phase: 0 });
      animatedProps.push({ obj: r2, kind: 'spinZ', speed: -1.1, baseY: 0, phase: 0 });
      break;
    }

    case 'volcanic_caldera': {
      // Erupting Volcano Cones around perimeter + Glowing Magma Crater Rim
      const rockMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x292524, roughness: 0.92 }));
      const lavaGlowMat = trackMat(
        new THREE.MeshStandardMaterial({
          color: 0xf97316,
          emissive: 0xea580c,
          emissiveIntensity: 1.35,
        })
      );
      const coneGeo = new THREE.CylinderGeometry(4.2, 12.5, 21, 7);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const r = outerR + 7.5;
        const volc = new THREE.Mesh(coneGeo, rockMat);
        volc.position.set(Math.cos(a) * r, 9.5, Math.sin(a) * r);
        const crater = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.4, 0.6, 8), lavaGlowMat);
        crater.position.set(volc.position.x, 20.1, volc.position.z);
        group.add(volc, crater);
      }
      const emberCore = new THREE.Mesh(new THREE.DodecahedronGeometry(2.0, 0), lavaGlowMat);
      emberCore.position.set(0, 15.0, 0);
      group.add(emberCore);
      animatedProps.push({ obj: emberCore, kind: 'spinY', speed: 1.1, baseY: 15.0, phase: 0 });
      break;
    }

    case 'bamboo_sanctuary': {
      // Lush Emerald Bamboo Groves + Floating Warm Paper Sky Lanterns
      const bambooMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.58 }));
      const leafMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x4ade80, roughness: 0.72 }));
      const stalkGeo = new THREE.CylinderGeometry(0.24, 0.3, 13.5, 7);
      const count = isCompactPreview ? 16 : 28;
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2 + (i % 3) * 0.05;
        const r = arenaRadius + 2.2 + (i % 4) * 2.1;
        const stalk = new THREE.Mesh(stalkGeo, bambooMat);
        const hScale = 0.8 + (i % 4) * 0.18;
        stalk.scale.set(1, hScale, 1);
        stalk.position.set(Math.cos(a) * r, 6.5 * hScale, Math.sin(a) * r);
        stalk.rotation.z = ((i % 3) - 1) * 0.05;
        const tuft = new THREE.Mesh(new THREE.SphereGeometry(1.1, 7, 6), leafMat);
        tuft.position.set(stalk.position.x, 13.2 * hScale, stalk.position.z);
        group.add(stalk, tuft);
      }

      const lanternMat = trackMat(
        new THREE.MeshStandardMaterial({
          color: 0xfef08a,
          emissive: 0xf59e0b,
          emissiveIntensity: 1.2,
        })
      );
      const lanternGeo = new THREE.CylinderGeometry(0.65, 0.65, 1.35, 8);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const l = new THREE.Mesh(lanternGeo, lanternMat);
        const ly = 13.5 + (i % 2) * 2.4;
        l.position.set(Math.cos(a) * 16, ly, Math.sin(a) * 16);
        group.add(l);
        animatedProps.push({ obj: l, kind: 'bob', speed: 1.4, baseY: ly, phase: i * 0.9 });
      }
      break;
    }

    case 'neon_downtown': {
      // Towering Cyber Skyscraper Skyline + Glowing Neon Billboards
      const bldgMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.5 }));
      const neonPinkMat = trackMat(
        new THREE.MeshStandardMaterial({ color: 0xf472b6, emissive: 0xec4899, emissiveIntensity: 1.1 })
      );
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        const r = outerR + 5 + (i % 3) * 4;
        const h = 18 + (i % 4) * 6;
        const b = new THREE.Mesh(new THREE.BoxGeometry(6.5, h, 6.5), bldgMat);
        b.position.set(Math.cos(a) * r, h * 0.5, Math.sin(a) * r);
        const sign = new THREE.Mesh(
          new THREE.BoxGeometry(4.8, 1.4, 0.4),
          i % 2 === 0 ? accentMat : neonPinkMat
        );
        sign.position.set(Math.cos(a) * (r - 3.4), h * 0.68, Math.sin(a) * (r - 3.4));
        sign.lookAt(0, h * 0.68, 0);
        group.add(b, sign);
      }
      break;
    }

    case 'sunken_atlantis': {
      // Colossal Glowing Golden Poseidon Trident Centerpiece + Coral Spires
      const trident = new THREE.Group();
      trident.position.set(0, 10.5, 0);
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, 11, 10), goldMat);
      const cross = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.55, 0.6), goldMat);
      cross.position.y = 3.2;
      const pMid = new THREE.Mesh(new THREE.ConeGeometry(0.45, 4.4, 8), accentMat);
      pMid.position.y = 5.4;
      const pLeft = new THREE.Mesh(new THREE.ConeGeometry(0.35, 3.6, 8), goldMat);
      pLeft.position.set(-1.9, 5.0, 0);
      const pRight = pLeft.clone();
      pRight.position.x = 1.9;
      trident.add(shaft, cross, pMid, pLeft, pRight);
      group.add(trident);
      animatedProps.push({ obj: trident, kind: 'spinY', speed: 0.65, baseY: 10.5, phase: 0 });

      const coralMat = trackMat(
        new THREE.MeshStandardMaterial({ color: 0x2dd4bf, emissive: 0x0d9488, emissiveIntensity: 0.45 })
      );
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const coral = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.7, 13, 7), coralMat);
        coral.position.set(Math.cos(a) * outerR, 6.5, Math.sin(a) * outerR);
        group.add(coral);
      }
      break;
    }

    case 'clockwork_tower': {
      // Giant Interlocking Spinning Brass Clockwork Gears Overhead & Perimeter
      const brassMat = goldMat;
      const makeGear = (radius: number, teeth: number) => {
        const g = new THREE.Group();
        const rim = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.42, 8, 24), brassMat);
        const hub = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.28, radius * 0.28, 0.7, 12), darkSteelMat);
        hub.rotation.x = Math.PI / 2;
        const spokeA = new THREE.Mesh(new THREE.BoxGeometry(radius * 1.9, 0.45, 0.45), brassMat);
        const spokeB = new THREE.Mesh(new THREE.BoxGeometry(0.45, radius * 1.9, 0.45), brassMat);
        g.add(rim, hub, spokeA, spokeB);
        const toothGeo = new THREE.BoxGeometry(0.75, 0.95, 0.65);
        for (let t = 0; t < teeth; t++) {
          const ang = (t / teeth) * Math.PI * 2;
          const tooth = new THREE.Mesh(toothGeo, brassMat);
          tooth.position.set(Math.cos(ang) * (radius + 0.5), Math.sin(ang) * (radius + 0.5), 0);
          tooth.rotation.z = ang;
          g.add(tooth);
        }
        return g;
      };

      const skyGear = makeGear(5.2, 12);
      skyGear.position.set(0, 16.5, 0);
      skyGear.rotation.x = Math.PI / 2;
      group.add(skyGear);
      animatedProps.push({ obj: skyGear, kind: 'spinY', speed: 0.75, baseY: 16.5, phase: 0 });

      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        const wallGear = makeGear(4.0, 10);
        wallGear.position.set(Math.cos(a) * (arenaRadius - 0.5), 11.5, Math.sin(a) * (arenaRadius - 0.5));
        wallGear.lookAt(0, 11.5, 0);
        group.add(wallGear);
        animatedProps.push({
          obj: wallGear,
          kind: 'spinZ',
          speed: i % 2 === 0 ? 0.9 : -0.9,
          baseY: 11.5,
          phase: 0,
        });
      }
      break;
    }

    case 'desert_mirage': {
      // Twin Towering Sandstone Pyramids + Oasis Palm Trees
      const sandMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.85 }));
      const palmMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.78 }));
      const trunkMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9 }));
      for (const [px, pz] of [
        [-outerR - 8, -22],
        [outerR + 8, 22],
      ]) {
        const pyr = new THREE.Mesh(new THREE.ConeGeometry(15, 22, 4), sandMat);
        pyr.position.set(px, 11, pz);
        pyr.rotation.y = Math.PI * 0.25;
        group.add(pyr);
      }
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + 0.3;
        const r = arenaRadius + 2.5;
        const tx = Math.cos(a) * r;
        const tz = Math.sin(a) * r;
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.48, 9.5, 7), trunkMat);
        trunk.position.set(tx, 4.75, tz);
        const frond = new THREE.Mesh(new THREE.ConeGeometry(2.8, 1.8, 6), palmMat);
        frond.position.set(tx, 9.8, tz);
        group.add(trunk, frond);
      }
      break;
    }

    case 'crystal_cavern': {
      // Giant Tilted Glowing Amethyst Crystal Clusters + Suspended Geode
      const crysMat = trackMat(
        new THREE.MeshPhysicalMaterial({
          color: 0xc084fc,
          emissive: 0x7e22ce,
          emissiveIntensity: 0.82,
          roughness: 0.1,
          metalness: 0.2,
          clearcoat: 1,
        })
      );
      const shardGeo = new THREE.ConeGeometry(2.4, 15, 6);
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        const r = outerR + (i % 2) * 2.5;
        const shard = new THREE.Mesh(shardGeo, crysMat);
        shard.position.set(Math.cos(a) * r, 6.5, Math.sin(a) * r);
        shard.lookAt(0, 14, 0);
        shard.rotateX(Math.PI * 0.45);
        group.add(shard);
      }
      const centerGeode = new THREE.Mesh(new THREE.OctahedronGeometry(2.6, 0), crysMat);
      centerGeode.position.set(0, 15.2, 0);
      group.add(centerGeode);
      animatedProps.push({ obj: centerGeode, kind: 'spinY', speed: 0.95, baseY: 15.2, phase: 0 });
      break;
    }

    case 'cherry_pagoda': {
      // Sculpted Pink Sakura Cherry Blossom Trees + Floating Sakura Lanterns
      const sakuraMat = trackMat(
        new THREE.MeshStandardMaterial({
          color: 0xf9a8d4,
          emissive: 0xf472b6,
          emissiveIntensity: 0.22,
          roughness: 0.82,
        })
      );
      const woodMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.9 }));
      const count = isCompactPreview ? 10 : 18;
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2;
        const r = arenaRadius + 2.8 + (i % 3) * 2.8;
        const tx = Math.cos(a) * r;
        const tz = Math.sin(a) * r;
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.58, 6.2, 8), woodMat);
        trunk.position.set(tx, 3.1, tz);
        const canopyA = new THREE.Mesh(new THREE.SphereGeometry(3.2, 10, 8), sakuraMat);
        canopyA.scale.set(1.2, 0.72, 1.2);
        canopyA.position.set(tx, 7.2, tz);
        const canopyB = new THREE.Mesh(new THREE.SphereGeometry(2.2, 9, 7), sakuraMat);
        canopyB.scale.set(1.1, 0.7, 1.1);
        canopyB.position.set(tx + Math.cos(a) * 1.4, 8.6, tz + Math.sin(a) * 1.4);
        group.add(trunk, canopyA, canopyB);
      }
      const blossomCore = new THREE.Mesh(new THREE.TorusKnotGeometry(1.5, 0.35, 48, 8), sakuraMat);
      blossomCore.position.set(0, 14.8, 0);
      group.add(blossomCore);
      animatedProps.push({ obj: blossomCore, kind: 'spinY', speed: 0.75, baseY: 14.8, phase: 0 });
      break;
    }

    case 'obsidian_keep': {
      // End-Style Towering Obsidian Pillars topped with Spinning Ender Crystals!
      const obsMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x1e1b4b, roughness: 0.55, metalness: 0.35 }));
      const enderMat = trackMat(
        new THREE.MeshStandardMaterial({
          color: 0xe879f9,
          emissive: 0xa855f7,
          emissiveIntensity: 1.35,
          roughness: 0.1,
        })
      );
      const pilGeo = new THREE.BoxGeometry(3.8, 22, 3.8);
      const crysGeo = new THREE.OctahedronGeometry(1.4, 0);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const r = outerR + 1.5;
        const px = Math.cos(a) * r;
        const pz = Math.sin(a) * r;
        const pil = new THREE.Mesh(pilGeo, obsMat);
        pil.position.set(px, 11, pz);
        const crys = new THREE.Mesh(crysGeo, enderMat);
        crys.position.set(px, 24.2, pz);
        group.add(pil, crys);
        animatedProps.push({ obj: crys, kind: 'spinY', speed: 1.3, baseY: 24.2, phase: i });
      }
      addBannerRow(0x6366f1, 8, arenaRadius - 0.8, 9.5);
      break;
    }

    case 'solar_observatory': {
      // Massive 3-Ring Golden Celestial Armillary Sphere Gyroscope overhead!
      const armillary = new THREE.Group();
      armillary.position.set(0, 16.4, 0);
      const sunCore = new THREE.Mesh(
        new THREE.SphereGeometry(1.9, 16, 12),
        trackMat(new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xf59e0b, emissiveIntensity: 1.4 }))
      );
      const ring1 = new THREE.Mesh(new THREE.TorusGeometry(4.2, 0.24, 10, 36), goldMat);
      const ring2 = new THREE.Mesh(new THREE.TorusGeometry(5.5, 0.2, 10, 36), goldMat);
      const ring3 = new THREE.Mesh(new THREE.TorusGeometry(6.8, 0.18, 10, 36), accentMat);
      ring1.rotation.x = Math.PI * 0.35;
      ring2.rotation.y = Math.PI * 0.42;
      ring3.rotation.z = Math.PI * 0.25;
      armillary.add(sunCore, ring1, ring2, ring3);
      group.add(armillary);
      animatedProps.push({ obj: ring1, kind: 'spinX', speed: 0.9, baseY: 0, phase: 0 });
      animatedProps.push({ obj: ring2, kind: 'spinY', speed: -1.1, baseY: 0, phase: 0 });
      animatedProps.push({ obj: ring3, kind: 'spinZ', speed: 0.7, baseY: 0, phase: 0 });
      break;
    }

    case 'toxic_refinery': {
      // Glowing Neon-Emerald Chemical Silos & Overhead Pipeline Arches
      const acidMat = trackMat(
        new THREE.MeshStandardMaterial({ color: 0x34d399, emissive: 0x10b981, emissiveIntensity: 1.15 })
      );
      const vatGeo = new THREE.CylinderGeometry(2.8, 2.8, 15, 14);
      const pipeGeo = new THREE.CylinderGeometry(0.75, 0.75, 26, 10);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const r = outerR + 1.5;
        const vx = Math.cos(a) * r;
        const vz = Math.sin(a) * r;
        const silo = new THREE.Mesh(vatGeo, darkSteelMat);
        silo.position.set(vx, 7.5, vz);
        const capGlow = new THREE.Mesh(new THREE.CylinderGeometry(2.9, 2.9, 1.8, 14), acidMat);
        capGlow.position.set(vx, 13.8, vz);
        group.add(silo, capGlow);
      }
      const pipeCross = new THREE.Mesh(pipeGeo, acidMat);
      pipeCross.rotation.z = Math.PI / 2;
      pipeCross.position.set(0, 14.5, 0);
      group.add(pipeCross);
      break;
    }

    case 'aether_spire':
    default: {
      // Orbiting Floating Marble Sky Islands + Giant Angelic Golden Halo Rings
      const marbleMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.45 }));
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const r = outerR + 3.5;
        const isl = new THREE.Group();
        const iy = 12 + (i % 3) * 3.2;
        isl.position.set(Math.cos(a) * r, iy, Math.sin(a) * r);
        const top = new THREE.Mesh(new THREE.CylinderGeometry(4.4, 3.2, 1.5, 8), marbleMat);
        const under = new THREE.Mesh(new THREE.ConeGeometry(3.2, 5.2, 8), stoneTrimMat);
        under.rotation.x = Math.PI;
        under.position.y = -3.3;
        const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(1.1, 0), accentMat);
        crystal.position.y = 2.6;
        isl.add(top, under, crystal);
        group.add(isl);
        animatedProps.push({ obj: isl, kind: 'bob', speed: 0.9, baseY: iy, phase: i * 1.1 });
      }
      const celestialHalo = new THREE.Mesh(new THREE.TorusGeometry(6.2, 0.28, 12, 40), goldMat);
      celestialHalo.rotation.x = Math.PI / 2;
      celestialHalo.position.set(0, 18.0, 0);
      group.add(celestialHalo);
      animatedProps.push({ obj: celestialHalo, kind: 'spinZ', speed: 0.45, baseY: 18.0, phase: 0 });
      break;
    }
  }

  return { group, animatedProps, materials };
}
