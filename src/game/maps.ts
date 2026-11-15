import type { ArenaBlock, MapId, PlayerTeam, RoomMode } from './types';

export interface MapDefinition {
  id: MapId;
  name: string;
  englishName: string;
  badge: string;
  description: string;
  accentHex: string;
  groundColor: number;
  skyTop: string;
  skyMid: string;
  skyHorizon: string;
  skyBottom: string;
  fogColor: number;
  sunColor: number;
  ambientSky: number;
  ambientGround: number;
  worldRadius: number;
}

export const MAP_ROTATION_SECONDS = 180; // 3 minutes per map

export const MAP_ORDER: MapId[] = [
  'container_yard',
  'emerald_citadel',
  'sky_dock',
  'nether_foundry',
];

export const MAP_DEFINITIONS: Record<MapId, MapDefinition> = {
  container_yard: {
    id: 'container_yard',
    name: '컨테이너 야드',
    englishName: 'CONTAINER YARD',
    badge: '신규 메인',
    description: '적재된 2단 화물 컨테이너와 램프, 크레인 탑이 어우러진 전술 시가전 야적장',
    accentHex: '#2563eb',
    groundColor: 0x6b7280,
    skyTop: '#3b82f6',
    skyMid: '#7dd3fc',
    skyHorizon: '#e0f2fe',
    skyBottom: '#cbd5e1',
    fogColor: 0xbae6fd,
    sunColor: 0xfff8eb,
    ambientSky: 0xdbeafe,
    ambientGround: 0x475569,
    worldRadius: 96,
  },
  emerald_citadel: {
    id: 'emerald_citadel',
    name: '초원 시타델',
    englishName: 'EMERALD CITADEL',
    badge: '클래식',
    description: '햇살 가득한 초원 중앙 제단과 흑요석·자수정 타워가 펼쳐진 밸런스 아레나',
    accentHex: '#16a34a',
    groundColor: 0x62a844,
    skyTop: '#4f97e8',
    skyMid: '#7abbf2',
    skyHorizon: '#cce9fc',
    skyBottom: '#cfe3c8',
    fogColor: 0xc2e2fb,
    sunColor: 0xfff7e6,
    ambientSky: 0xdbeafe,
    ambientGround: 0x3f6b35,
    worldRadius: 108,
  },
  sky_dock: {
    id: 'sky_dock',
    name: '스카이 도크',
    englishName: 'SKY DOCK',
    badge: '공중전',
    description: '고공 스카이 브릿지와 도크 타워를 겉날개와 윈드 차지를 타고 넘나드는 공중 항구',
    accentHex: '#0284c7',
    groundColor: 0x94a3b8,
    skyTop: '#2563eb',
    skyMid: '#60a5fa',
    skyHorizon: '#e0f2fe',
    skyBottom: '#bae6fd',
    fogColor: 0xdbeafe,
    sunColor: 0xffffff,
    ambientSky: 0xe0f2fe,
    ambientGround: 0x64748b,
    worldRadius: 96,
  },
  nether_foundry: {
    id: 'nether_foundry',
    name: '크림슨 제련소',
    englishName: 'CRIMSON FOUNDRY',
    badge: '고열전',
    description: '현무암 기둥과 황금 제련 브릿지가 교차하는 묵직한 화산 요새',
    accentHex: '#dc2626',
    groundColor: 0x47424a,
    skyTop: '#7c2d12',
    skyMid: '#ea580c',
    skyHorizon: '#fed7aa',
    skyBottom: '#78350f',
    fogColor: 0xfdba74,
    sunColor: 0xffedd5,
    ambientSky: 0xfed7aa,
    ambientGround: 0x451a03,
    worldRadius: 96,
  },
};

export function getNextMapId(current: MapId): MapId {
  const idx = MAP_ORDER.indexOf(current);
  if (idx < 0) return MAP_ORDER[0];
  return MAP_ORDER[(idx + 1) % MAP_ORDER.length];
}

export function getMapForElapsedTime(elapsedSeconds: number, startMap: MapId = 'container_yard'): MapId {
  const startIdx = Math.max(0, MAP_ORDER.indexOf(startMap));
  const steps = Math.max(0, Math.floor(elapsedSeconds / MAP_ROTATION_SECONDS));
  return MAP_ORDER[(startIdx + steps) % MAP_ORDER.length];
}

export function tallyMapVotes(
  votes: Iterable<MapId>,
  fallback: MapId = 'container_yard'
): { winner: MapId; counts: Record<MapId, number> } {
  const counts: Record<MapId, number> = {
    container_yard: 0,
    emerald_citadel: 0,
    sky_dock: 0,
    nether_foundry: 0,
  };
  let total = 0;
  for (const m of votes) {
    if (m in counts) {
      counts[m] += 1;
      total += 1;
    }
  }
  if (total === 0) {
    return { winner: fallback, counts };
  }
  let winner = fallback;
  let best = counts[fallback] ?? -1;
  for (const id of MAP_ORDER) {
    if (counts[id] > best) {
      best = counts[id];
      winner = id;
    }
  }
  return { winner, counts };
}

export function canDamageTarget(
  roomMode: RoomMode,
  attackerTeam: PlayerTeam,
  targetTeam: PlayerTeam
): boolean {
  if (roomMode !== 'team') return true;
  if (attackerTeam === 'ffa' || targetTeam === 'ffa') return true;
  return attackerTeam !== targetTeam;
}

function addSteps(
  blocks: ArenaBlock[],
  prefix: string,
  baseX: number,
  baseZ: number,
  dirX: number,
  dirZ: number,
  steps: number,
  stepHeight: number,
  width: number,
  depth: number,
  kind: ArenaBlock['kind']
) {
  for (let i = 0; i < steps; i++) {
    const h = (i + 1) * stepHeight;
    blocks.push({
      id: `${prefix}_${i}`,
      x: baseX + dirX * i * depth,
      y: 0,
      z: baseZ + dirZ * i * depth,
      w: width,
      h,
      d: depth,
      kind,
    });
  }
}

function addContainer(
  blocks: ArenaBlock[],
  id: string,
  x: number,
  baseY: number,
  z: number,
  w: number,
  h: number,
  d: number,
  kind: 'container_red' | 'container_blue' | 'container_amber' | 'container_teal'
) {
  blocks.push({
    id,
    x,
    y: baseY,
    z,
    w,
    h,
    d,
    kind,
  });
}

/**
 * Map 1 (Default): Container Yard (컨테이너 야드)
 * Crisp cargo shipping containers, forklift crates, catwalk ramps, and central loading plaza.
 */
function buildContainerYardBlocks(): ArenaBlock[] {
  const blocks: ArenaBlock[] = [];

  // Central low loading dock pads (safe spawn around (0, 0) stays clear)
  blocks.push(
    { id: 'cy_center_pad_n', x: 0, y: 0, z: -12, w: 7.5, h: 0.7, d: 3.5, kind: 'asphalt' },
    { id: 'cy_center_pad_s', x: 0, y: 0, z: 12, w: 7.5, h: 0.7, d: 3.5, kind: 'asphalt' }
  );

  // West Wing — Red & Amber Shipping Container Stack + Ramp access
  addContainer(blocks, 'cy_c_w1', -14, 0, -6, 3.6, 3.0, 9.0, 'container_red');
  addContainer(blocks, 'cy_c_w2', -14, 0, 7, 3.6, 3.0, 8.5, 'container_amber');
  addContainer(blocks, 'cy_c_w_top', -14, 3.0, 0.5, 3.6, 2.8, 8.0, 'container_blue');
  addSteps(blocks, 'cy_ramp_w', -10.4, -8.5, 0, 1, 4, 0.75, 2.6, 1.8, 'wood_crate');
  blocks.push({ id: 'cy_crate_w1', x: -9.5, y: 0, z: 6.5, w: 2.2, h: 1.7, d: 2.2, kind: 'wood_crate' });

  // East Wing — Blue & Teal Shipping Container Stack + Ramp access
  addContainer(blocks, 'cy_c_e1', 14, 0, 6, 3.6, 3.0, 9.0, 'container_blue');
  addContainer(blocks, 'cy_c_e2', 14, 0, -7, 3.6, 3.0, 8.5, 'container_teal');
  addContainer(blocks, 'cy_c_e_top', 14, 3.0, -0.5, 3.6, 2.8, 8.0, 'container_red');
  addSteps(blocks, 'cy_ramp_e', 10.4, 8.5, 0, -1, 4, 0.75, 2.6, 1.8, 'wood_crate');
  blocks.push({ id: 'cy_crate_e1', x: 9.5, y: 0, z: -6.5, w: 2.2, h: 1.7, d: 2.2, kind: 'wood_crate' });

  // North Dock — Wide sniper containers + high crane perch
  addContainer(blocks, 'cy_c_n1', -6.5, 0, -24, 9.5, 3.0, 3.8, 'container_teal');
  addContainer(blocks, 'cy_c_n2', 6.5, 0, -24, 9.5, 3.0, 3.8, 'container_red');
  addContainer(blocks, 'cy_c_n_top', 0, 3.0, -24, 10.5, 2.8, 3.8, 'container_amber');
  addSteps(blocks, 'cy_ramp_n', -12.5, -24, 1, 0, 4, 0.75, 2.4, 1.8, 'deepslate');

  // South Dock — Symmetric Red/Blue spawn cover & flank crates
  addContainer(blocks, 'cy_c_s1', -6.5, 0, 24, 9.5, 3.0, 3.8, 'container_blue');
  addContainer(blocks, 'cy_c_s2', 6.5, 0, 24, 9.5, 3.0, 3.8, 'container_amber');
  addContainer(blocks, 'cy_c_s_top', 0, 3.0, 24, 10.5, 2.8, 3.8, 'container_teal');
  addSteps(blocks, 'cy_ramp_s', 12.5, 24, -1, 0, 4, 0.75, 2.4, 1.8, 'deepslate');

  // Mid-lane tactical chest-high crates for quick peek / cover shooting
  blocks.push(
    { id: 'cy_mid_c1', x: -6.5, y: 0, z: 0, w: 2.2, h: 1.8, d: 2.2, kind: 'wood_crate' },
    { id: 'cy_mid_c2', x: 6.5, y: 0, z: 0, w: 2.2, h: 1.8, d: 2.2, kind: 'wood_crate' },
    { id: 'cy_mid_c3', x: -5.5, y: 0, z: -12, w: 2.0, h: 1.3, d: 2.0, kind: 'deepslate' },
    { id: 'cy_mid_c4', x: 5.5, y: 0, z: 12, w: 2.0, h: 1.3, d: 2.0, kind: 'deepslate' }
  );

  // Outer Yard Crane Towers & Container Depot Clusters
  addContainer(blocks, 'cy_out_nw', -38, 0, -34, 4.0, 3.2, 10.0, 'container_amber');
  addContainer(blocks, 'cy_out_nw2', -38, 3.2, -34, 4.0, 3.2, 9.0, 'container_red');
  addContainer(blocks, 'cy_out_ne', 38, 0, -34, 4.0, 3.2, 10.0, 'container_blue');
  addContainer(blocks, 'cy_out_ne2', 38, 3.2, -34, 4.0, 3.2, 9.0, 'container_teal');
  addContainer(blocks, 'cy_out_sw', -38, 0, 34, 4.0, 3.2, 10.0, 'container_teal');
  addContainer(blocks, 'cy_out_se', 38, 0, 34, 4.0, 3.2, 10.0, 'container_red');

  // Elevated Gantry Watch Towers on center flanks
  blocks.push(
    { id: 'cy_gantry_pillar_w', x: -25, y: 0, z: 0, w: 2.4, h: 9.0, d: 2.4, kind: 'deepslate' },
    { id: 'cy_gantry_pillar_e', x: 25, y: 0, z: 0, w: 2.4, h: 9.0, d: 2.4, kind: 'deepslate' },
    { id: 'cy_gantry_deck_w', x: -25, y: 9.0, z: 0, w: 5.5, h: 0.7, d: 7.5, kind: 'gold' },
    { id: 'cy_gantry_deck_e', x: 25, y: 9.0, z: 0, w: 5.5, h: 0.7, d: 7.5, kind: 'gold' }
  );

  // Yard perimeter cargo barrier wall
  const rim = 84;
  for (let i = -3; i <= 3; i++) {
    const pos = i * 22;
    addContainer(blocks, `cy_rim_n_${i}`, pos, 0, -rim, 10, 3.0, 3.6, i % 2 === 0 ? 'container_red' : 'container_blue');
    addContainer(blocks, `cy_rim_s_${i}`, pos, 0, rim, 10, 3.0, 3.6, i % 2 === 0 ? 'container_teal' : 'container_amber');
  }

  return blocks;
}

/**
 * Map 2: Emerald Citadel (초원 시타델)
 */
function buildEmeraldCitadelBlocks(): ArenaBlock[] {
  const blocks: ArenaBlock[] = [
    { id: 'dais_n', x: 0, y: 0, z: -22, w: 6.5, h: 1.5, d: 6.5, kind: 'deepslate' },
    { id: 'dais_s', x: 0, y: 0, z: 22, w: 6.5, h: 1.5, d: 6.5, kind: 'deepslate' },
    { id: 'step_n1', x: -4.2, y: 0, z: -22, w: 1.8, h: 0.8, d: 3.4, kind: 'stone' },
    { id: 'step_s1', x: 4.2, y: 0, z: 22, w: 1.8, h: 0.8, d: 3.4, kind: 'stone' },

    { id: 'tower_nw', x: -18, y: 0, z: -16, w: 4.2, h: 6.4, d: 4.2, kind: 'obsidian' },
    { id: 'tower_ne', x: 18, y: 0, z: -16, w: 4.2, h: 6.4, d: 4.2, kind: 'obsidian' },
    { id: 'tower_sw', x: -18, y: 0, z: 16, w: 4.2, h: 6.4, d: 4.2, kind: 'obsidian' },
    { id: 'tower_se', x: 18, y: 0, z: 16, w: 4.2, h: 6.4, d: 4.2, kind: 'obsidian' },

    { id: 'step_nw1', x: -14.8, y: 0, z: -16, w: 2.0, h: 2.4, d: 3.2, kind: 'deepslate' },
    { id: 'step_nw2', x: -12.6, y: 0, z: -16, w: 2.0, h: 1.2, d: 3.2, kind: 'stone' },
    { id: 'step_se1', x: 14.8, y: 0, z: 16, w: 2.0, h: 2.4, d: 3.2, kind: 'deepslate' },
    { id: 'step_se2', x: 12.6, y: 0, z: 16, w: 2.0, h: 1.2, d: 3.2, kind: 'stone' },

    { id: 'spire_w', x: -29, y: 0, z: 0, w: 4.0, h: 12.4, d: 4.0, kind: 'amethyst' },
    { id: 'spire_e', x: 29, y: 0, z: 0, w: 4.0, h: 12.4, d: 4.0, kind: 'amethyst' },
    { id: 'gold_w', x: -29, y: 12.4, z: 0, w: 4.6, h: 1.2, d: 4.6, kind: 'gold' },
    { id: 'gold_e', x: 29, y: 12.4, z: 0, w: 4.6, h: 1.2, d: 4.6, kind: 'gold' },

    { id: 'sky_1', x: -9, y: 8.6, z: -30, w: 6.2, h: 1.2, d: 6.2, kind: 'gold' },
    { id: 'sky_2', x: 9, y: 10.0, z: 30, w: 6.2, h: 1.2, d: 6.2, kind: 'gold' },

    { id: 'crate_nw', x: -8.5, y: 0, z: -7.5, w: 2.0, h: 1.4, d: 2.0, kind: 'stone' },
    { id: 'crate_ne', x: 8.5, y: 0, z: -7.5, w: 2.0, h: 1.4, d: 2.0, kind: 'stone' },
    { id: 'crate_sw', x: -8.5, y: 0, z: 7.5, w: 2.0, h: 1.4, d: 2.0, kind: 'stone' },
    { id: 'crate_se', x: 8.5, y: 0, z: 7.5, w: 2.0, h: 1.4, d: 2.0, kind: 'stone' },
  ];

  const outerBiomes = [
    { x: -64, z: -60, h: 7.0, kind: 'obsidian' as const },
    { x: 64, z: -60, h: 7.0, kind: 'amethyst' as const },
    { x: -64, z: 60, h: 7.0, kind: 'amethyst' as const },
    { x: 64, z: 60, h: 7.0, kind: 'obsidian' as const },
    { x: 0, z: -72, h: 9.0, kind: 'gold' as const },
    { x: 0, z: 72, h: 9.0, kind: 'gold' as const },
    { x: -76, z: 0, h: 8.0, kind: 'deepslate' as const },
    { x: 76, z: 0, h: 8.0, kind: 'deepslate' as const },
  ];
  outerBiomes.forEach((o, idx) => {
    blocks.push({ id: `out_pillar_${idx}`, x: o.x, y: 0, z: o.z, w: 5.5, h: o.h, d: 5.5, kind: o.kind });
    blocks.push({
      id: `out_plat_${idx}`,
      x: o.x,
      y: o.h,
      z: o.z,
      w: 10.5,
      h: 1.2,
      d: 10.5,
      kind: idx % 2 === 0 ? 'turf' : 'stone',
    });
  });

  return blocks;
}

/**
 * Map 3: Sky Dock (스카이 도크)
 */
function buildSkyDockBlocks(): ArenaBlock[] {
  const blocks: ArenaBlock[] = [
    // Elevated runway strips & side piers
    { id: 'sd_pier_w', x: -12, y: 0, z: 0, w: 5.5, h: 2.8, d: 26, kind: 'deepslate' },
    { id: 'sd_pier_e', x: 12, y: 0, z: 0, w: 5.5, h: 2.8, d: 26, kind: 'deepslate' },
    { id: 'sd_bridge_n', x: 0, y: 0, z: -14.5, w: 20, h: 2.8, d: 4.5, kind: 'stone' },
    { id: 'sd_bridge_s', x: 0, y: 0, z: 14.5, w: 20, h: 2.8, d: 4.5, kind: 'stone' },

    // Ramps from ground plaza up to piers
    { id: 'sd_ramp_nw', x: -6.8, y: 0, z: -8, w: 3.5, h: 1.5, d: 3.5, kind: 'wood_crate' },
    { id: 'sd_ramp_se', x: 6.8, y: 0, z: 8, w: 3.5, h: 1.5, d: 3.5, kind: 'wood_crate' },
    { id: 'sd_ramp_ne', x: 6.8, y: 0, z: -8, w: 3.5, h: 1.5, d: 3.5, kind: 'wood_crate' },
    { id: 'sd_ramp_sw', x: -6.8, y: 0, z: 8, w: 3.5, h: 1.5, d: 3.5, kind: 'wood_crate' },

    // High sky-dock control towers (Elytra + Bow perches)
    { id: 'sd_tower_w', x: -24, y: 0, z: 0, w: 5.0, h: 10.0, d: 5.0, kind: 'container_blue' },
    { id: 'sd_tower_e', x: 24, y: 0, z: 0, w: 5.0, h: 10.0, d: 5.0, kind: 'container_teal' },
    { id: 'sd_deck_w', x: -24, y: 10.0, z: 0, w: 9.0, h: 1.0, d: 9.0, kind: 'gold' },
    { id: 'sd_deck_e', x: 24, y: 10.0, z: 0, w: 9.0, h: 1.0, d: 9.0, kind: 'gold' },

    // Floating catwalk islands
    { id: 'sd_float_n', x: 0, y: 6.9, z: -28, w: 9.5, h: 1.2, d: 7.5, kind: 'amethyst' },
    { id: 'sd_float_s', x: 0, y: 6.9, z: 28, w: 9.5, h: 1.2, d: 7.5, kind: 'amethyst' },
    { id: 'sd_float_nw', x: -26, y: 5.9, z: -26, w: 7.5, h: 1.2, d: 7.5, kind: 'gold' },
    { id: 'sd_float_se', x: 26, y: 5.9, z: 26, w: 7.5, h: 1.2, d: 7.5, kind: 'gold' },
  ];
  return blocks;
}

/**
 * Map 4: Crimson Foundry (크림슨 제련소)
 */
function buildNetherFoundryBlocks(): ArenaBlock[] {
  const blocks: ArenaBlock[] = [
    // Basalt Monoliths + Golden Forge Bridges
    { id: 'nf_forge_w', x: -13, y: 0, z: 0, w: 4.5, h: 4.0, d: 14, kind: 'basalt' },
    { id: 'nf_forge_e', x: 13, y: 0, z: 0, w: 4.5, h: 4.0, d: 14, kind: 'basalt' },
    { id: 'nf_brick_n', x: 0, y: 0, z: -16, w: 12, h: 3.2, d: 4.5, kind: 'crimson_brick' },
    { id: 'nf_brick_s', x: 0, y: 0, z: 16, w: 12, h: 3.2, d: 4.5, kind: 'crimson_brick' },

    { id: 'nf_step_w1', x: -9.5, y: 0, z: -5, w: 2.5, h: 2.0, d: 3.0, kind: 'basalt' },
    { id: 'nf_step_e1', x: 9.5, y: 0, z: 5, w: 2.5, h: 2.0, d: 3.0, kind: 'basalt' },
    { id: 'nf_step_n1', x: -7.5, y: 0, z: -16, w: 3.0, h: 1.6, d: 3.2, kind: 'gold' },
    { id: 'nf_step_s1', x: 7.5, y: 0, z: 16, w: 3.0, h: 1.6, d: 3.2, kind: 'gold' },

    // High Obsidian Smelters in corners
    { id: 'nf_smelt_nw', x: -24, y: 0, z: -22, w: 5.5, h: 9.0, d: 5.5, kind: 'obsidian' },
    { id: 'nf_smelt_ne', x: 24, y: 0, z: -22, w: 5.5, h: 9.0, d: 5.5, kind: 'obsidian' },
    { id: 'nf_smelt_sw', x: -24, y: 0, z: 22, w: 5.5, h: 9.0, d: 5.5, kind: 'obsidian' },
    { id: 'nf_smelt_se', x: 24, y: 0, z: 22, w: 5.5, h: 9.0, d: 5.5, kind: 'obsidian' },
    { id: 'nf_cap_nw', x: -24, y: 9.0, z: -22, w: 7.5, h: 1.0, d: 7.5, kind: 'gold' },
    { id: 'nf_cap_ne', x: 24, y: 9.0, z: -22, w: 7.5, h: 1.0, d: 7.5, kind: 'gold' },
    { id: 'nf_cap_sw', x: -24, y: 9.0, z: 22, w: 7.5, h: 1.0, d: 7.5, kind: 'gold' },
    { id: 'nf_cap_se', x: 24, y: 9.0, z: 22, w: 7.5, h: 1.0, d: 7.5, kind: 'gold' },

    // Mid lava-forge cover pillars
    { id: 'nf_cover_1', x: -6.0, y: 0, z: -6.0, w: 2.2, h: 2.0, d: 2.2, kind: 'crimson_brick' },
    { id: 'nf_cover_2', x: 6.0, y: 0, z: 6.0, w: 2.2, h: 2.0, d: 2.2, kind: 'crimson_brick' },
    { id: 'nf_cover_3', x: -6.0, y: 0, z: 6.0, w: 2.2, h: 2.0, d: 2.2, kind: 'crimson_brick' },
    { id: 'nf_cover_4', x: 6.0, y: 0, z: -6.0, w: 2.2, h: 2.0, d: 2.2, kind: 'crimson_brick' },
  ];
  return blocks;
}

export function getArenaBlocksForMap(mapId: MapId): ArenaBlock[] {
  switch (mapId) {
    case 'container_yard':
      return buildContainerYardBlocks();
    case 'sky_dock':
      return buildSkyDockBlocks();
    case 'nether_foundry':
      return buildNetherFoundryBlocks();
    case 'emerald_citadel':
    default:
      return buildEmeraldCitadelBlocks();
  }
}
