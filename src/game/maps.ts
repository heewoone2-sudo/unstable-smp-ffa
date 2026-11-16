import type { ArenaBlock, JumpPadZone, MapId, PlayerTeam, RoomMode } from './types';

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

export const MAP_ROTATION_SECONDS = 900; // 15 minutes per map

export const MAP_ORDER: MapId[] = [
  'container_yard',
  'emerald_citadel',
  'sky_dock',
  'nether_foundry',
  'cyber_nexus',
  'frost_bastion',
  'ancient_temple',
  'orbital_reactor',
];

export function createEmptyMapVotes(): Record<MapId, number> {
  return {
    container_yard: 0,
    emerald_citadel: 0,
    sky_dock: 0,
    nether_foundry: 0,
    cyber_nexus: 0,
    frost_bastion: 0,
    ancient_temple: 0,
    orbital_reactor: 0,
  };
}

export const MAP_DEFINITIONS: Record<MapId, MapDefinition> = {
  container_yard: {
    id: 'container_yard',
    name: '컨테이너 야드',
    englishName: 'CONTAINER YARD',
    badge: '리뉴얼',
    description: '2단 화물 컨테이너, 크레인 캣워크, 점프 패드가 교차하는 입체 전술 야적장',
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
    badge: '리뉴얼',
    description: '이중 성채 램프와 공중 회랑, 흑요석·자수정 타워가 어우러진 입체 시타델',
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
    badge: '리뉴얼',
    description: '다층 활주로 브릿지와 도크 타워를 점프 패드·겉날개로 비행하는 공중 항구',
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
    badge: '리뉴얼',
    description: '고열 제련 브릿지와 2층 관제 데크, 용암 도가니 엄폐물이 배치된 요새',
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
  cyber_nexus: {
    id: 'cyber_nexus',
    name: '사이버 넥서스',
    englishName: 'CYBER NEXUS',
    badge: '신규',
    description: '복층 네온 서버 캣워크와 대칭 점프 패드, 고속 우회 램프로 구성된 테크 아레나',
    accentHex: '#06b6d4',
    groundColor: 0x334155,
    skyTop: '#0f172a',
    skyMid: '#0369a1',
    skyHorizon: '#a5f3fc',
    skyBottom: '#1e293b',
    fogColor: 0xbae6fd,
    sunColor: 0xe0f2fe,
    ambientSky: 0x7dd3fc,
    ambientGround: 0x1e293b,
    worldRadius: 96,
  },
  frost_bastion: {
    id: 'frost_bastion',
    name: '빙하 요새',
    englishName: 'FROST BASTION',
    badge: '신규',
    description: '계단식 빙벽 성채와 고지대 크리스탈 빙하 브릿지가 펼쳐진 설원 전장',
    accentHex: '#38bdf8',
    groundColor: 0xcbd5e1,
    skyTop: '#1d4ed8',
    skyMid: '#93c5fd',
    skyHorizon: '#f0f9ff',
    skyBottom: '#e2e8f0',
    fogColor: 0xe0f2fe,
    sunColor: 0xffffff,
    ambientSky: 0xe0f2fe,
    ambientGround: 0x64748b,
    worldRadius: 98,
  },
  ancient_temple: {
    id: 'ancient_temple',
    name: '고대 사원',
    englishName: 'ANCIENT TEMPLE',
    badge: '신규',
    description: '피라미드 단차 제단, 회랑 기둥 엄폐물, 황금 지구라트 상층부가 있는 유적',
    accentHex: '#d97706',
    groundColor: 0xd6b47b,
    skyTop: '#2563eb',
    skyMid: '#60a5fa',
    skyHorizon: '#fef3c7',
    skyBottom: '#d6b47b',
    fogColor: 0xfde68a,
    sunColor: 0xfffbeb,
    ambientSky: 0xfef3c7,
    ambientGround: 0x78350f,
    worldRadius: 98,
  },
  orbital_reactor: {
    id: 'orbital_reactor',
    name: '궤도 원자로',
    englishName: 'ORBITAL REACTOR',
    badge: '신규',
    description: '중앙 코어 링 브릿지와 4방향 플라즈마 냉각탑을 점프 패드로 넘나드는 복합 기지',
    accentHex: '#6366f1',
    groundColor: 0x475569,
    skyTop: '#1e1b4b',
    skyMid: '#4338ca',
    skyHorizon: '#c7d2fe',
    skyBottom: '#312e81',
    fogColor: 0xc7d2fe,
    sunColor: 0xeef2ff,
    ambientSky: 0xc7d2fe,
    ambientGround: 0x1e1b4b,
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
  const counts = createEmptyMapVotes();
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
  kind: ArenaBlock['kind'],
  baseY = 0
) {
  for (let i = 0; i < steps; i++) {
    const h = (i + 1) * stepHeight;
    blocks.push({
      id: `${prefix}_${i}`,
      x: baseX + dirX * i * depth,
      y: baseY,
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
  blocks.push({ id, x, y: baseY, z, w, h, d, kind });
}

/**
 * Map 1 (Renewed): Container Yard (컨테이너 야드)
 * Multi-tier shipping containers, central overpass bridge, crane catwalks & sightline crates.
 */
function buildContainerYardBlocks(): ArenaBlock[] {
  const blocks: ArenaBlock[] = [];

  blocks.push(
    { id: 'cy_center_pad_n', x: 0, y: 0, z: -12, w: 7.5, h: 0.7, d: 3.5, kind: 'asphalt' },
    { id: 'cy_center_pad_s', x: 0, y: 0, z: 12, w: 7.5, h: 0.7, d: 3.5, kind: 'asphalt' }
  );

  // West Wing — Red & Amber Shipping Container Stack + Overpass Bridge
  addContainer(blocks, 'cy_c_w1', -14, 0, -6, 3.6, 3.0, 9.0, 'container_red');
  addContainer(blocks, 'cy_c_w2', -14, 0, 7, 3.6, 3.0, 8.5, 'container_amber');
  addContainer(blocks, 'cy_c_w_top', -14, 3.0, 0.5, 3.6, 2.8, 8.0, 'container_blue');
  addSteps(blocks, 'cy_ramp_w', -10.4, -8.5, 0, 1, 4, 0.75, 2.6, 1.8, 'wood_crate');
  blocks.push({ id: 'cy_crate_w1', x: -9.5, y: 0, z: 6.5, w: 2.2, h: 1.7, d: 2.2, kind: 'wood_crate' });

  // East Wing — Blue & Teal Shipping Container Stack + Overpass Bridge
  addContainer(blocks, 'cy_c_e1', 14, 0, 6, 3.6, 3.0, 9.0, 'container_blue');
  addContainer(blocks, 'cy_c_e2', 14, 0, -7, 3.6, 3.0, 8.5, 'container_teal');
  addContainer(blocks, 'cy_c_e_top', 14, 3.0, -0.5, 3.6, 2.8, 8.0, 'container_red');
  addSteps(blocks, 'cy_ramp_e', 10.4, 8.5, 0, -1, 4, 0.75, 2.6, 1.8, 'wood_crate');
  blocks.push({ id: 'cy_crate_e1', x: 9.5, y: 0, z: -6.5, w: 2.2, h: 1.7, d: 2.2, kind: 'wood_crate' });

  // Overhead Cross-Yard Catwalk connecting W & E stacks above center (y=5.8, clears (0,0)!)
  blocks.push(
    { id: 'cy_overpass_mid', x: 0, y: 5.8, z: 0, w: 24.5, h: 0.75, d: 3.4, kind: 'deepslate' },
    { id: 'cy_overpass_pillar_w', x: -8.5, y: 0, z: 0, w: 1.6, h: 5.8, d: 1.6, kind: 'deepslate' },
    { id: 'cy_overpass_pillar_e', x: 8.5, y: 0, z: 0, w: 1.6, h: 5.8, d: 1.6, kind: 'deepslate' },
    { id: 'cy_overpass_cover_l', x: -4.2, y: 6.55, z: 0, w: 1.4, h: 1.1, d: 1.4, kind: 'wood_crate' },
    { id: 'cy_overpass_cover_r', x: 4.2, y: 6.55, z: 0, w: 1.4, h: 1.1, d: 1.4, kind: 'wood_crate' }
  );

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
    { id: 'cy_mid_c1', x: -5.2, y: 0, z: -5.2, w: 2.1, h: 1.8, d: 2.1, kind: 'wood_crate' },
    { id: 'cy_mid_c2', x: 5.2, y: 0, z: 5.2, w: 2.1, h: 1.8, d: 2.1, kind: 'wood_crate' },
    { id: 'cy_mid_c3', x: -5.5, y: 0, z: 5.2, w: 2.0, h: 1.4, d: 2.0, kind: 'deepslate' },
    { id: 'cy_mid_c4', x: 5.5, y: 0, z: -5.2, w: 2.0, h: 1.4, d: 2.0, kind: 'deepslate' }
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

  const rim = 84;
  for (let i = -3; i <= 3; i++) {
    const pos = i * 22;
    addContainer(blocks, `cy_rim_n_${i}`, pos, 0, -rim, 10, 3.0, 3.6, i % 2 === 0 ? 'container_red' : 'container_blue');
    addContainer(blocks, `cy_rim_s_${i}`, pos, 0, rim, 10, 3.0, 3.6, i % 2 === 0 ? 'container_teal' : 'container_amber');
  }

  return blocks;
}

/**
 * Map 2 (Renewed): Emerald Citadel (초원 시타델)
 * Terraced bastion walls, connecting sky ramparts, central peek pillars & corner towers.
 */
function buildEmeraldCitadelBlocks(): ArenaBlock[] {
  const blocks: ArenaBlock[] = [
    { id: 'dais_n', x: 0, y: 0, z: -22, w: 7.5, h: 2.2, d: 6.5, kind: 'deepslate' },
    { id: 'dais_s', x: 0, y: 0, z: 22, w: 7.5, h: 2.2, d: 6.5, kind: 'deepslate' },
    { id: 'step_n1', x: -5.2, y: 0, z: -22, w: 2.4, h: 1.1, d: 3.6, kind: 'stone' },
    { id: 'step_s1', x: 5.2, y: 0, z: 22, w: 2.4, h: 1.1, d: 3.6, kind: 'stone' },

    // Side Sanctuary Balconies + Connecting Bridges
    { id: 'ec_wall_w', x: -18, y: 0, z: 0, w: 4.5, h: 4.4, d: 18, kind: 'stone' },
    { id: 'ec_wall_e', x: 18, y: 0, z: 0, w: 4.5, h: 4.4, d: 18, kind: 'stone' },
    { id: 'ec_bridge_n', x: 0, y: 5.8, z: -16, w: 32, h: 0.9, d: 3.6, kind: 'deepslate' },
    { id: 'ec_bridge_s', x: 0, y: 5.8, z: 16, w: 32, h: 0.9, d: 3.6, kind: 'deepslate' },

    { id: 'tower_nw', x: -18, y: 0, z: -16, w: 4.4, h: 6.7, d: 4.4, kind: 'obsidian' },
    { id: 'tower_ne', x: 18, y: 0, z: -16, w: 4.4, h: 6.7, d: 4.4, kind: 'obsidian' },
    { id: 'tower_sw', x: -18, y: 0, z: 16, w: 4.4, h: 6.7, d: 4.4, kind: 'obsidian' },
    { id: 'tower_se', x: 18, y: 0, z: 16, w: 4.4, h: 6.7, d: 4.4, kind: 'obsidian' },

    { id: 'step_nw1', x: -14.6, y: 0, z: -16, w: 2.2, h: 3.4, d: 3.2, kind: 'deepslate' },
    { id: 'step_nw2', x: -12.4, y: 0, z: -16, w: 2.2, h: 1.7, d: 3.2, kind: 'stone' },
    { id: 'step_se1', x: 14.6, y: 0, z: 16, w: 2.2, h: 3.4, d: 3.2, kind: 'deepslate' },
    { id: 'step_se2', x: 12.4, y: 0, z: 16, w: 2.2, h: 1.7, d: 3.2, kind: 'stone' },

    { id: 'spire_w', x: -29, y: 0, z: 0, w: 4.2, h: 12.4, d: 4.2, kind: 'amethyst' },
    { id: 'spire_e', x: 29, y: 0, z: 0, w: 4.2, h: 12.4, d: 4.2, kind: 'amethyst' },
    { id: 'gold_w', x: -29, y: 12.4, z: 0, w: 5.2, h: 1.2, d: 5.2, kind: 'gold' },
    { id: 'gold_e', x: 29, y: 12.4, z: 0, w: 5.2, h: 1.2, d: 5.2, kind: 'gold' },

    { id: 'sky_1', x: -9, y: 8.8, z: -30, w: 6.8, h: 1.2, d: 6.8, kind: 'gold' },
    { id: 'sky_2', x: 9, y: 10.0, z: 30, w: 6.8, h: 1.2, d: 6.8, kind: 'gold' },

    // Mid-arena tactical pillar cover
    { id: 'crate_nw', x: -8.2, y: 0, z: -7.2, w: 2.2, h: 2.0, d: 2.2, kind: 'stone' },
    { id: 'crate_ne', x: 8.2, y: 0, z: -7.2, w: 2.2, h: 2.0, d: 2.2, kind: 'stone' },
    { id: 'crate_sw', x: -8.2, y: 0, z: 7.2, w: 2.2, h: 2.0, d: 2.2, kind: 'stone' },
    { id: 'crate_se', x: 8.2, y: 0, z: 7.2, w: 2.2, h: 2.0, d: 2.2, kind: 'stone' },
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
 * Map 3 (Renewed): Sky Dock (스카이 도크)
 * Elevated piers, central high sky-bridge arch, cargo cover & floating aerial perches.
 */
function buildSkyDockBlocks(): ArenaBlock[] {
  const blocks: ArenaBlock[] = [
    { id: 'sd_pier_w', x: -12, y: 0, z: 0, w: 5.8, h: 2.8, d: 28, kind: 'deepslate' },
    { id: 'sd_pier_e', x: 12, y: 0, z: 0, w: 5.8, h: 2.8, d: 28, kind: 'deepslate' },
    { id: 'sd_bridge_n', x: 0, y: 0, z: -15, w: 22, h: 2.8, d: 4.8, kind: 'stone' },
    { id: 'sd_bridge_s', x: 0, y: 0, z: 15, w: 22, h: 2.8, d: 4.8, kind: 'stone' },

    // Elevated center sky-arch (y=6.2, clear ground spawn at (0,0))
    { id: 'sd_sky_arch', x: 0, y: 6.2, z: 0, w: 24, h: 0.9, d: 3.6, kind: 'gold' },
    { id: 'sd_pier_cover_w', x: -12, y: 2.8, z: -6, w: 2.0, h: 1.6, d: 2.4, kind: 'container_blue' },
    { id: 'sd_pier_cover_e', x: 12, y: 2.8, z: 6, w: 2.0, h: 1.6, d: 2.4, kind: 'container_teal' },

    // Ramps from ground plaza up to piers
    { id: 'sd_ramp_nw', x: -6.8, y: 0, z: -8, w: 3.5, h: 1.5, d: 3.5, kind: 'wood_crate' },
    { id: 'sd_ramp_se', x: 6.8, y: 0, z: 8, w: 3.5, h: 1.5, d: 3.5, kind: 'wood_crate' },
    { id: 'sd_ramp_ne', x: 6.8, y: 0, z: -8, w: 3.5, h: 1.5, d: 3.5, kind: 'wood_crate' },
    { id: 'sd_ramp_sw', x: -6.8, y: 0, z: 8, w: 3.5, h: 1.5, d: 3.5, kind: 'wood_crate' },

    // High sky-dock control towers
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
 * Map 4 (Renewed): Crimson Foundry (크림슨 제련소)
 * Multi-level foundry walkways, molten corner smelters, high gold catwalks & tactical forge pillars.
 */
function buildNetherFoundryBlocks(): ArenaBlock[] {
  const blocks: ArenaBlock[] = [
    { id: 'nf_forge_w', x: -13, y: 0, z: 0, w: 5.0, h: 4.0, d: 18, kind: 'basalt' },
    { id: 'nf_forge_e', x: 13, y: 0, z: 0, w: 5.0, h: 4.0, d: 18, kind: 'basalt' },
    { id: 'nf_brick_n', x: 0, y: 0, z: -16, w: 14, h: 3.4, d: 4.8, kind: 'crimson_brick' },
    { id: 'nf_brick_s', x: 0, y: 0, z: 16, w: 14, h: 3.4, d: 4.8, kind: 'crimson_brick' },

    // High gold catwalk ring linking north/south/east/west forges
    { id: 'nf_high_bridge_n', x: 0, y: 6.5, z: -22, w: 40, h: 0.9, d: 3.6, kind: 'gold' },
    { id: 'nf_high_bridge_s', x: 0, y: 6.5, z: 22, w: 40, h: 0.9, d: 3.6, kind: 'gold' },

    { id: 'nf_step_w1', x: -9.5, y: 0, z: -5, w: 2.5, h: 2.0, d: 3.0, kind: 'basalt' },
    { id: 'nf_step_e1', x: 9.5, y: 0, z: 5, w: 2.5, h: 2.0, d: 3.0, kind: 'basalt' },
    { id: 'nf_step_n1', x: -8.5, y: 0, z: -16, w: 3.0, h: 1.7, d: 3.2, kind: 'gold' },
    { id: 'nf_step_s1', x: 8.5, y: 0, z: 16, w: 3.0, h: 1.7, d: 3.2, kind: 'gold' },

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
    { id: 'nf_cover_1', x: -6.0, y: 0, z: -6.0, w: 2.2, h: 2.2, d: 2.2, kind: 'crimson_brick' },
    { id: 'nf_cover_2', x: 6.0, y: 0, z: 6.0, w: 2.2, h: 2.2, d: 2.2, kind: 'crimson_brick' },
    { id: 'nf_cover_3', x: -6.0, y: 0, z: 6.0, w: 2.2, h: 2.2, d: 2.2, kind: 'crimson_brick' },
    { id: 'nf_cover_4', x: 6.0, y: 0, z: -6.0, w: 2.2, h: 2.2, d: 2.2, kind: 'crimson_brick' },
  ];
  return blocks;
}

/**
 * Map 5 (New): Cyber Nexus (사이버 넥서스)
 * Symmetrical neon server banks, upper data catwalks, angled flank ramps & center hologram cover.
 */
function buildCyberNexusBlocks(): ArenaBlock[] {
  const blocks: ArenaBlock[] = [
    // Symmetrical Side Server Terraces
    { id: 'cn_bank_w', x: -15, y: 0, z: 0, w: 5.5, h: 3.6, d: 22, kind: 'cyber_panel' },
    { id: 'cn_bank_e', x: 15, y: 0, z: 0, w: 5.5, h: 3.6, d: 22, kind: 'cyber_panel' },
    // Ramps up to Side Server Terraces
    { id: 'cn_ramp_w_n', x: -15, y: 0, z: -13, w: 4.5, h: 1.8, d: 3.5, kind: 'deepslate' },
    { id: 'cn_ramp_e_s', x: 15, y: 0, z: 13, w: 4.5, h: 1.8, d: 3.5, kind: 'deepslate' },
    // High Data Catwalks
    { id: 'cn_skywalk_n', x: 0, y: 5.4, z: -14, w: 26, h: 0.85, d: 3.8, kind: 'cyber_panel' },
    { id: 'cn_skywalk_s', x: 0, y: 5.4, z: 14, w: 26, h: 0.85, d: 3.8, kind: 'cyber_panel' },
    { id: 'cn_cross_mid', x: 0, y: 5.4, z: 0, w: 3.8, h: 0.85, d: 26, kind: 'amethyst' },
    // Corner Mainframe Towers
    { id: 'cn_node_nw', x: -26, y: 0, z: -22, w: 5.2, h: 8.5, d: 5.2, kind: 'cyber_panel' },
    { id: 'cn_node_ne', x: 26, y: 0, z: -22, w: 5.2, h: 8.5, d: 5.2, kind: 'cyber_panel' },
    { id: 'cn_node_sw', x: -26, y: 0, z: 22, w: 5.2, h: 8.5, d: 5.2, kind: 'cyber_panel' },
    { id: 'cn_node_se', x: 26, y: 0, z: 22, w: 5.2, h: 8.5, d: 5.2, kind: 'cyber_panel' },
    { id: 'cn_cap_nw', x: -26, y: 8.5, z: -22, w: 7.5, h: 0.9, d: 7.5, kind: 'reactor_core' },
    { id: 'cn_cap_ne', x: 26, y: 8.5, z: -22, w: 7.5, h: 0.9, d: 7.5, kind: 'reactor_core' },
    { id: 'cn_cap_sw', x: -26, y: 8.5, z: 22, w: 7.5, h: 0.9, d: 7.5, kind: 'reactor_core' },
    { id: 'cn_cap_se', x: 26, y: 8.5, z: 22, w: 7.5, h: 0.9, d: 7.5, kind: 'reactor_core' },
    // Center Tactical Pillars (leaving (0,0) clear)
    { id: 'cn_cov_1', x: -5.8, y: 0, z: -5.8, w: 2.2, h: 2.2, d: 2.2, kind: 'cyber_panel' },
    { id: 'cn_cov_2', x: 5.8, y: 0, z: 5.8, w: 2.2, h: 2.2, d: 2.2, kind: 'cyber_panel' },
    { id: 'cn_cov_3', x: -5.8, y: 0, z: 5.8, w: 2.2, h: 2.2, d: 2.2, kind: 'cyber_panel' },
    { id: 'cn_cov_4', x: 5.8, y: 0, z: -5.8, w: 2.2, h: 2.2, d: 2.2, kind: 'cyber_panel' },
  ];
  return blocks;
}

/**
 * Map 6 (New): Frost Bastion (빙하 요새)
 * Stepped glacial citadels, elevated ice arch bridges, snow-stone bunkers & sniper spires.
 */
function buildFrostBastionBlocks(): ArenaBlock[] {
  const blocks: ArenaBlock[] = [
    // North & South Glacial Bastion Keeps with double stair tiers
    { id: 'fb_keep_n', x: 0, y: 0, z: -20, w: 14, h: 3.2, d: 6.0, kind: 'ice_brick' },
    { id: 'fb_keep_s', x: 0, y: 0, z: 20, w: 14, h: 3.2, d: 6.0, kind: 'ice_brick' },
    addStepBlock('fb_st_n1', -9.0, 0, -20, 3.2, 1.6, 4.0, 'stone'),
    addStepBlock('fb_st_s1', 9.0, 0, 20, 3.2, 1.6, 4.0, 'stone'),

    // Flanking Ice Monoliths & Elevated Bridges
    { id: 'fb_wall_w', x: -16, y: 0, z: 0, w: 4.5, h: 5.2, d: 16, kind: 'ice_brick' },
    { id: 'fb_wall_e', x: 16, y: 0, z: 0, w: 4.5, h: 5.2, d: 16, kind: 'ice_brick' },
    { id: 'fb_bridge_top', x: 0, y: 6.4, z: 0, w: 28, h: 0.9, d: 3.6, kind: 'ice_brick' },

    // High Frozen Watchtowers
    { id: 'fb_spire_nw', x: -24, y: 0, z: -24, w: 5.0, h: 9.5, d: 5.0, kind: 'deepslate' },
    { id: 'fb_spire_ne', x: 24, y: 0, z: -24, w: 5.0, h: 9.5, d: 5.0, kind: 'deepslate' },
    { id: 'fb_spire_sw', x: -24, y: 0, z: 24, w: 5.0, h: 9.5, d: 5.0, kind: 'deepslate' },
    { id: 'fb_spire_se', x: 24, y: 0, z: 24, w: 5.0, h: 9.5, d: 5.0, kind: 'deepslate' },
    { id: 'fb_cap_nw', x: -24, y: 9.5, z: -24, w: 7.5, h: 1.0, d: 7.5, kind: 'ice_brick' },
    { id: 'fb_cap_ne', x: 24, y: 9.5, z: -24, w: 7.5, h: 1.0, d: 7.5, kind: 'ice_brick' },
    { id: 'fb_cap_sw', x: -24, y: 9.5, z: 24, w: 7.5, h: 1.0, d: 7.5, kind: 'ice_brick' },
    { id: 'fb_cap_se', x: 24, y: 9.5, z: 24, w: 7.5, h: 1.0, d: 7.5, kind: 'ice_brick' },

    // Low Ice Shield Bunkers near center plaza
    { id: 'fb_cov_1', x: -6.5, y: 0, z: -7.0, w: 3.0, h: 1.8, d: 1.8, kind: 'ice_brick' },
    { id: 'fb_cov_2', x: 6.5, y: 0, z: 7.0, w: 3.0, h: 1.8, d: 1.8, kind: 'ice_brick' },
    { id: 'fb_cov_3', x: -6.5, y: 0, z: 7.0, w: 3.0, h: 1.8, d: 1.8, kind: 'ice_brick' },
    { id: 'fb_cov_4', x: 6.5, y: 0, z: -7.0, w: 3.0, h: 1.8, d: 1.8, kind: 'ice_brick' },
  ];
  return blocks;
}

function addStepBlock(
  id: string,
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  d: number,
  kind: ArenaBlock['kind']
): ArenaBlock {
  return { id, x, y, z, w, h, d, kind };
}

/**
 * Map 7 (New): Ancient Temple (고대 사원)
 * Stepped sandstone ziggurats, golden temple lintels, colonnade cover pillars & desert obelisks.
 */
function buildAncientTempleBlocks(): ArenaBlock[] {
  const blocks: ArenaBlock[] = [
    // East & West Stepped Sandstone Ziggurats
    { id: 'at_zig_w1', x: -18, y: 0, z: 0, w: 10, h: 2.0, d: 18, kind: 'sandstone' },
    { id: 'at_zig_w2', x: -18, y: 2.0, z: 0, w: 6.5, h: 2.0, d: 12, kind: 'sandstone' },
    { id: 'at_zig_w3', x: -18, y: 4.0, z: 0, w: 4.0, h: 2.2, d: 6.5, kind: 'gold' },

    { id: 'at_zig_e1', x: 18, y: 0, z: 0, w: 10, h: 2.0, d: 18, kind: 'sandstone' },
    { id: 'at_zig_e2', x: 18, y: 2.0, z: 0, w: 6.5, h: 2.0, d: 12, kind: 'sandstone' },
    { id: 'at_zig_e3', x: 18, y: 4.0, z: 0, w: 4.0, h: 2.2, d: 6.5, kind: 'gold' },

    // North & South Sun Gate Sanctuaries
    { id: 'at_gate_n', x: 0, y: 0, z: -22, w: 14, h: 3.2, d: 5.5, kind: 'sandstone' },
    { id: 'at_gate_s', x: 0, y: 0, z: 22, w: 14, h: 3.2, d: 5.5, kind: 'sandstone' },
    { id: 'at_lintel_n', x: 0, y: 5.6, z: -22, w: 16, h: 1.1, d: 4.0, kind: 'gold' },
    { id: 'at_lintel_s', x: 0, y: 5.6, z: 22, w: 16, h: 1.1, d: 4.0, kind: 'gold' },

    // Colonnade Courtyard Pillars (creating tactical peak angles around clear center)
    { id: 'at_col_1', x: -6.5, y: 0, z: -8.0, w: 2.2, h: 4.2, d: 2.2, kind: 'sandstone' },
    { id: 'at_col_2', x: 6.5, y: 0, z: -8.0, w: 2.2, h: 4.2, d: 2.2, kind: 'sandstone' },
    { id: 'at_col_3', x: -6.5, y: 0, z: 8.0, w: 2.2, h: 4.2, d: 2.2, kind: 'sandstone' },
    { id: 'at_col_4', x: 6.5, y: 0, z: 8.0, w: 2.2, h: 4.2, d: 2.2, kind: 'sandstone' },

    // Corner Obelisks
    { id: 'at_ob_nw', x: -28, y: 0, z: -26, w: 4.2, h: 11.0, d: 4.2, kind: 'obsidian' },
    { id: 'at_ob_ne', x: 28, y: 0, z: -26, w: 4.2, h: 11.0, d: 4.2, kind: 'obsidian' },
    { id: 'at_ob_sw', x: -28, y: 0, z: 26, w: 4.2, h: 11.0, d: 4.2, kind: 'obsidian' },
    { id: 'at_ob_se', x: 28, y: 0, z: 26, w: 4.2, h: 11.0, d: 4.2, kind: 'obsidian' },
    { id: 'at_ob_cap_nw', x: -28, y: 11.0, z: -26, w: 6.2, h: 1.0, d: 6.2, kind: 'gold' },
    { id: 'at_ob_cap_ne', x: 28, y: 11.0, z: -26, w: 6.2, h: 1.0, d: 6.2, kind: 'gold' },
    { id: 'at_ob_cap_sw', x: -28, y: 11.0, z: 26, w: 6.2, h: 1.0, d: 6.2, kind: 'gold' },
    { id: 'at_ob_cap_se', x: 28, y: 11.0, z: 26, w: 6.2, h: 1.0, d: 6.2, kind: 'gold' },
  ];
  return blocks;
}

/**
 * Map 8 (New): Orbital Reactor (궤도 원자로)
 * Multi-ring reactor catwalks, plasma cooling pylons, stepped ramps & suspended sniper decks.
 */
function buildOrbitalReactorBlocks(): ArenaBlock[] {
  const blocks: ArenaBlock[] = [
    // Cardinal Reactor Platforms
    { id: 'or_deck_n', x: 0, y: 0, z: -17, w: 12, h: 3.0, d: 5.5, kind: 'reactor_core' },
    { id: 'or_deck_s', x: 0, y: 0, z: 17, w: 12, h: 3.0, d: 5.5, kind: 'reactor_core' },
    { id: 'or_deck_w', x: -17, y: 0, z: 0, w: 5.5, h: 3.0, d: 12, kind: 'reactor_core' },
    { id: 'or_deck_e', x: 17, y: 0, z: 0, w: 5.5, h: 3.0, d: 12, kind: 'reactor_core' },

    // Diagonal Access Ramps
    { id: 'or_step_n', x: -7.5, y: 0, z: -17, w: 3.2, h: 1.5, d: 3.8, kind: 'asphalt' },
    { id: 'or_step_s', x: 7.5, y: 0, z: 17, w: 3.2, h: 1.5, d: 3.8, kind: 'asphalt' },
    { id: 'or_step_w', x: -17, y: 0, z: 7.5, w: 3.8, h: 1.5, d: 3.2, kind: 'asphalt' },
    { id: 'or_step_e', x: 17, y: 0, z: -7.5, w: 3.8, h: 1.5, d: 3.2, kind: 'asphalt' },

    // Overhead Cross-Ring Reactor Catwalks (y=6.6, clear ground center (0,0))
    { id: 'or_sky_ns', x: 0, y: 6.6, z: 0, w: 3.6, h: 0.9, d: 30, kind: 'cyber_panel' },
    { id: 'or_sky_ew', x: 0, y: 6.6, z: 0, w: 30, h: 0.9, d: 3.6, kind: 'cyber_panel' },

    // 4 Corner Cooling Pylons
    { id: 'or_pylon_nw', x: -24, y: 0, z: -24, w: 5.5, h: 9.2, d: 5.5, kind: 'reactor_core' },
    { id: 'or_pylon_ne', x: 24, y: 0, z: -24, w: 5.5, h: 9.2, d: 5.5, kind: 'reactor_core' },
    { id: 'or_pylon_sw', x: -24, y: 0, z: 24, w: 5.5, h: 9.2, d: 5.5, kind: 'reactor_core' },
    { id: 'or_pylon_se', x: 24, y: 0, z: 24, w: 5.5, h: 9.2, d: 5.5, kind: 'reactor_core' },
    { id: 'or_cap_nw', x: -24, y: 9.2, z: -24, w: 8.0, h: 0.9, d: 8.0, kind: 'gold' },
    { id: 'or_cap_ne', x: 24, y: 9.2, z: -24, w: 8.0, h: 0.9, d: 8.0, kind: 'gold' },
    { id: 'or_cap_sw', x: -24, y: 9.2, z: 24, w: 8.0, h: 0.9, d: 8.0, kind: 'gold' },
    { id: 'or_cap_se', x: 24, y: 9.2, z: 24, w: 8.0, h: 0.9, d: 8.0, kind: 'gold' },

    // Inner Reactor Shield Pods
    { id: 'or_pod_1', x: -6.2, y: 0, z: -6.2, w: 2.2, h: 2.2, d: 2.2, kind: 'reactor_core' },
    { id: 'or_pod_2', x: 6.2, y: 0, z: 6.2, w: 2.2, h: 2.2, d: 2.2, kind: 'reactor_core' },
    { id: 'or_pod_3', x: -6.2, y: 0, z: 6.2, w: 2.2, h: 2.2, d: 2.2, kind: 'reactor_core' },
    { id: 'or_pod_4', x: 6.2, y: 0, z: -6.2, w: 2.2, h: 2.2, d: 2.2, kind: 'reactor_core' },
  ];
  return blocks;
}

export function getJumpPadsForMap(mapId: MapId): JumpPadZone[] {
  switch (mapId) {
    case 'container_yard':
      return [
        { id: 'jp_cy_w', x: -19.5, y: 0, z: 0, radius: 1.8, boostY: 18.5, boostForward: 6, color: '#38bdf8' },
        { id: 'jp_cy_e', x: 19.5, y: 0, z: 0, radius: 1.8, boostY: 18.5, boostForward: 6, color: '#38bdf8' },
        { id: 'jp_cy_n', x: 0, y: 0, z: -18, radius: 1.8, boostY: 16.5, boostForward: 5, color: '#facc15' },
        { id: 'jp_cy_s', x: 0, y: 0, z: 18, radius: 1.8, boostY: 16.5, boostForward: 5, color: '#facc15' },
      ];
    case 'emerald_citadel':
      return [
        { id: 'jp_ec_nw', x: -23, y: 0, z: -8, radius: 1.8, boostY: 19.0, boostForward: 6, color: '#34d399' },
        { id: 'jp_ec_se', x: 23, y: 0, z: 8, radius: 1.8, boostY: 19.0, boostForward: 6, color: '#34d399' },
        { id: 'jp_ec_n', x: 0, y: 2.2, z: -22, radius: 1.7, boostY: 16.0, boostForward: 7, color: '#facc15' },
        { id: 'jp_ec_s', x: 0, y: 2.2, z: 22, radius: 1.7, boostY: 16.0, boostForward: 7, color: '#facc15' },
      ];
    case 'sky_dock':
      return [
        { id: 'jp_sd_w', x: -18.5, y: 0, z: 0, radius: 1.9, boostY: 20.0, boostForward: 7, color: '#38bdf8' },
        { id: 'jp_sd_e', x: 18.5, y: 0, z: 0, radius: 1.9, boostY: 20.0, boostForward: 7, color: '#38bdf8' },
        { id: 'jp_sd_n', x: 0, y: 2.8, z: -15, radius: 1.8, boostY: 17.5, boostForward: 8, color: '#a855f7' },
        { id: 'jp_sd_s', x: 0, y: 2.8, z: 15, radius: 1.8, boostY: 17.5, boostForward: 8, color: '#a855f7' },
      ];
    case 'nether_foundry':
      return [
        { id: 'jp_nf_nw', x: -18, y: 0, z: -15, radius: 1.8, boostY: 19.0, boostForward: 6, color: '#f97316' },
        { id: 'jp_nf_se', x: 18, y: 0, z: 15, radius: 1.8, boostY: 19.0, boostForward: 6, color: '#f97316' },
        { id: 'jp_nf_ne', x: 18, y: 0, z: -15, radius: 1.8, boostY: 19.0, boostForward: 6, color: '#facc15' },
        { id: 'jp_nf_sw', x: -18, y: 0, z: 15, radius: 1.8, boostY: 19.0, boostForward: 6, color: '#facc15' },
      ];
    case 'cyber_nexus':
      return [
        { id: 'jp_cn_w', x: -20, y: 0, z: 0, radius: 1.8, boostY: 18.5, boostForward: 7, color: '#06b6d4' },
        { id: 'jp_cn_e', x: 20, y: 0, z: 0, radius: 1.8, boostY: 18.5, boostForward: 7, color: '#06b6d4' },
        { id: 'jp_cn_n', x: 0, y: 0, z: -20, radius: 1.8, boostY: 17.0, boostForward: 6, color: '#a855f7' },
        { id: 'jp_cn_s', x: 0, y: 0, z: 20, radius: 1.8, boostY: 17.0, boostForward: 6, color: '#a855f7' },
      ];
    case 'frost_bastion':
      return [
        { id: 'jp_fb_nw', x: -17, y: 0, z: -17, radius: 1.8, boostY: 19.5, boostForward: 6, color: '#7dd3fc' },
        { id: 'jp_fb_se', x: 17, y: 0, z: 17, radius: 1.8, boostY: 19.5, boostForward: 6, color: '#7dd3fc' },
        { id: 'jp_fb_ne', x: 17, y: 0, z: -17, radius: 1.8, boostY: 19.5, boostForward: 6, color: '#38bdf8' },
        { id: 'jp_fb_sw', x: -17, y: 0, z: 17, radius: 1.8, boostY: 19.5, boostForward: 6, color: '#38bdf8' },
      ];
    case 'ancient_temple':
      return [
        { id: 'jp_at_w', x: -10.5, y: 0, z: 0, radius: 1.8, boostY: 17.5, boostForward: 6, color: '#f59e0b' },
        { id: 'jp_at_e', x: 10.5, y: 0, z: 0, radius: 1.8, boostY: 17.5, boostForward: 6, color: '#f59e0b' },
        { id: 'jp_at_n', x: 0, y: 0, z: -15, radius: 1.8, boostY: 17.0, boostForward: 5, color: '#fbbf24' },
        { id: 'jp_at_s', x: 0, y: 0, z: 15, radius: 1.8, boostY: 17.0, boostForward: 5, color: '#fbbf24' },
      ];
    case 'orbital_reactor':
      return [
        { id: 'jp_or_nw', x: -17, y: 0, z: -17, radius: 1.8, boostY: 20.0, boostForward: 7, color: '#818cf8' },
        { id: 'jp_or_ne', x: 17, y: 0, z: -17, radius: 1.8, boostY: 20.0, boostForward: 7, color: '#818cf8' },
        { id: 'jp_or_sw', x: -17, y: 0, z: 17, radius: 1.8, boostY: 20.0, boostForward: 7, color: '#38bdf8' },
        { id: 'jp_or_se', x: 17, y: 0, z: 17, radius: 1.8, boostY: 20.0, boostForward: 7, color: '#38bdf8' },
      ];
    default:
      return [];
  }
}

export function getArenaBlocksForMap(mapId: MapId): ArenaBlock[] {
  switch (mapId) {
    case 'container_yard':
      return buildContainerYardBlocks();
    case 'sky_dock':
      return buildSkyDockBlocks();
    case 'nether_foundry':
      return buildNetherFoundryBlocks();
    case 'cyber_nexus':
      return buildCyberNexusBlocks();
    case 'frost_bastion':
      return buildFrostBastionBlocks();
    case 'ancient_temple':
      return buildAncientTempleBlocks();
    case 'orbital_reactor':
      return buildOrbitalReactorBlocks();
    case 'emerald_citadel':
    default:
      return buildEmeraldCitadelBlocks();
  }
}

export interface CombatScoreEntry {
  id: string;
  team: PlayerTeam;
  kills: number;
}

export function evaluateMatchOutcome(
  roomMode: 'ffa' | 'team',
  localId: string,
  localTeam: PlayerTeam,
  targetKills: number,
  entries: CombatScoreEntry[]
): { ended: boolean; won: boolean; winningTeam?: 'red' | 'blue'; winnerId?: string; redKills: number; blueKills: number } {
  const redKills = entries.filter((e) => e.team === 'red').reduce((acc, e) => acc + e.kills, 0);
  const blueKills = entries.filter((e) => e.team === 'blue').reduce((acc, e) => acc + e.kills, 0);

  if (roomMode === 'team') {
    if (redKills >= targetKills || blueKills >= targetKills) {
      const winningTeam: 'red' | 'blue' = redKills >= targetKills ? 'red' : 'blue';
      return {
        ended: true,
        won: localTeam === winningTeam,
        winningTeam,
        redKills,
        blueKills,
      };
    }
    return { ended: false, won: false, redKills, blueKills };
  }

  const winner = entries.find((e) => e.kills >= targetKills);
  if (winner) {
    return {
      ended: true,
      won: winner.id === localId,
      winnerId: winner.id,
      redKills,
      blueKills,
    };
  }

  return { ended: false, won: false, redKills, blueKills };
}

