import type { ArenaBlock, HazardPoolZone, JumpPadZone, MapCategory, MapId, PlayerTeam, RoomMode } from './types';

export type MapGroundStyle =
  | 'grass'
  | 'asphalt'
  | 'runway'
  | 'sand'
  | 'ice'
  | 'cyber'
  | 'obsidian'
  | 'marble'
  | 'brass'
  | 'geode';

export interface MapDefinition {
  id: MapId;
  name: string;
  englishName: string;
  badge: string;
  category: MapCategory;
  description: string;
  traitName: string;
  traitDesc: string;
  gravityMult: number;
  moveSpeedMult: number;
  cooldownSpeedMult: number;
  poolRegenPerSec: number;
  accentHex: string;
  groundStyle: MapGroundStyle;
  ringStyle: 'double' | 'outer_only' | 'none';
  isFloatingSky: boolean;
  groundTint: number;
  ringPrimary: number;
  ringEmissive: number;
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

export const MAP_ROTATION_SECONDS = 900; // 15 minutes per 4-map rotation window
export const MAP_ROTATION_MS = MAP_ROTATION_SECONDS * 1000;
export const OPEN_WORLD_ROTATION_COUNT = 4;

export const MAP_ORDER: MapId[] = [
  'container_yard',
  'emerald_citadel',
  'sky_dock',
  'nether_foundry',
  'cyber_nexus',
  'frost_bastion',
  'ancient_temple',
  'orbital_reactor',
  'volcanic_caldera',
  'bamboo_sanctuary',
  'neon_downtown',
  'sunken_atlantis',
  'clockwork_tower',
  'desert_mirage',
  'crystal_cavern',
  'cherry_pagoda',
  'obsidian_keep',
  'solar_observatory',
  'toxic_refinery',
  'aether_spire',
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
    volcanic_caldera: 0,
    bamboo_sanctuary: 0,
    neon_downtown: 0,
    sunken_atlantis: 0,
    clockwork_tower: 0,
    desert_mirage: 0,
    crystal_cavern: 0,
    cherry_pagoda: 0,
    obsidian_keep: 0,
    solar_observatory: 0,
    toxic_refinery: 0,
    aether_spire: 0,
  };
}

function seededPrng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface RotationWindowInfo {
  windowIndex: number;
  activeMaps: [MapId, MapId, MapId, MapId];
  endsAtMs: number;
  remainingSeconds: number;
}

/**
 * Draws 4 distinct random maps out of the 20-map pool for the current 15-minute window.
 * Deterministic per 15-minute epoch so server and all clients agree on the exact 4 active maps.
 */
export function getRotationWindow(nowMs = Date.now()): RotationWindowInfo {
  const safeNow = Math.max(0, nowMs);
  const windowIndex = Math.floor(safeNow / MAP_ROTATION_MS);
  const endsAtMs = (windowIndex + 1) * MAP_ROTATION_MS;
  const remainingSeconds = Math.max(1, Math.ceil((endsAtMs - safeNow) / 1000));
  const pool = [...MAP_ORDER];
  const rand = seededPrng(windowIndex * 2654435761 + 1013904223);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = pool[i];
    pool[i] = pool[j];
    pool[j] = tmp;
  }
  return {
    windowIndex,
    activeMaps: [pool[0], pool[1], pool[2], pool[3]],
    endsAtMs,
    remainingSeconds,
  };
}

export const MAP_DEFINITIONS: Record<MapId, MapDefinition> = {
  container_yard: {
    id: 'container_yard',
    name: '컨테이너 야드',
    englishName: 'CONTAINER YARD',
    badge: '항만',
    category: 'industrial',
    description: '사선 화물 레인과 3단 적재 컨테이너, 중앙 크레인 캣워크가 교차하는 항만 야적장',
    traitName: '크레인 터보 하버',
    traitDesc: '항만 갠트리 크레인 · 이동속도 +4% & 4방향 고속 컨테이너 점프 패드',
    gravityMult: 1.0,
    moveSpeedMult: 1.04,
    cooldownSpeedMult: 1.0,
    poolRegenPerSec: 0,
    accentHex: '#2563eb',
    groundStyle: 'asphalt',
    ringStyle: 'none',
    isFloatingSky: false,
    groundTint: 0x94a3b8,
    ringPrimary: 0xf59e0b,
    ringEmissive: 0xb45309,
    groundColor: 0x6b7280,
    skyTop: '#3b82f6',
    skyMid: '#7dd3fc',
    skyHorizon: '#e0f2fe',
    skyBottom: '#cbd5e1',
    fogColor: 0xbae6fd,
    sunColor: 0xfff8eb,
    ambientSky: 0xdbeafe,
    ambientGround: 0x475569,
    worldRadius: 46,
  },
  emerald_citadel: {
    id: 'emerald_citadel',
    name: '초원 시타델',
    englishName: 'EMERALD CITADEL',
    badge: '자연',
    category: 'nature',
    description: '넓은 개방형 미드 광장과 와인 셀러, 보트하우스 목조 데크로 나뉜 어센트형 성채',
    traitName: '성소 치유 분수',
    traitDesc: '에메랄드 왕관 성소 · 남북 성소 샘물 진입 시 초당 +3.5 HP 회복 & 화상 해제',
    gravityMult: 1.0,
    moveSpeedMult: 1.0,
    cooldownSpeedMult: 1.0,
    poolRegenPerSec: 3.5,
    accentHex: '#16a34a',
    groundStyle: 'grass',
    ringStyle: 'outer_only',
    isFloatingSky: false,
    groundTint: 0xffffff,
    ringPrimary: 0x10b981,
    ringEmissive: 0x047857,
    groundColor: 0x62a844,
    skyTop: '#4f97e8',
    skyMid: '#7abbf2',
    skyHorizon: '#cce9fc',
    skyBottom: '#cfe3c8',
    fogColor: 0xc2e2fb,
    sunColor: 0xfff7e6,
    ambientSky: 0xdbeafe,
    ambientGround: 0x3f6b35,
    worldRadius: 50,
  },
  sky_dock: {
    id: 'sky_dock',
    name: '스카이 도크',
    englishName: 'SKY DOCK',
    badge: '비행',
    category: 'industrial',
    description: '구름 위를 비행하는 3열 항공모함 활주로 피어와 관제탑 브릿지 공중 항구',
    traitName: '제트 기류 활주로',
    traitDesc: '부유 비행선 도크 · 체공 저중력(0.88x) & 장거리 전진 캐터펄트 점프 패드',
    gravityMult: 0.88,
    moveSpeedMult: 1.02,
    cooldownSpeedMult: 1.0,
    poolRegenPerSec: 0,
    accentHex: '#0284c7',
    groundStyle: 'runway',
    ringStyle: 'none',
    isFloatingSky: true,
    groundTint: 0xffffff,
    ringPrimary: 0x38bdf8,
    ringEmissive: 0x0284c7,
    groundColor: 0x64748b,
    skyTop: '#1d4ed8',
    skyMid: '#60a5fa',
    skyHorizon: '#e0f2fe',
    skyBottom: '#bae6fd',
    fogColor: 0xdbeafe,
    sunColor: 0xffffff,
    ambientSky: 0xe0f2fe,
    ambientGround: 0x64748b,
    worldRadius: 46,
  },
  nether_foundry: {
    id: 'nether_foundry',
    name: '크림슨 제련소',
    englishName: 'CRIMSON FOUNDRY',
    badge: '용암',
    category: 'citadel',
    description: '4방향 거대 용광로 구획 사이 X자 교차로와 공중 제련 캣워크가 펼쳐진 용암 공장',
    traitName: '용광로 화염 도가니',
    traitDesc: '사방 용암 도가니 함정 · 스킬 재충전 +12% 가속',
    gravityMult: 1.0,
    moveSpeedMult: 1.0,
    cooldownSpeedMult: 1.12,
    poolRegenPerSec: 0,
    accentHex: '#dc2626',
    groundStyle: 'obsidian',
    ringStyle: 'outer_only',
    isFloatingSky: false,
    groundTint: 0xb91c1c,
    ringPrimary: 0xef4444,
    ringEmissive: 0xb91c1c,
    groundColor: 0x451a1a,
    skyTop: '#7c2d12',
    skyMid: '#ea580c',
    skyHorizon: '#fed7aa',
    skyBottom: '#78350f',
    fogColor: 0xfdba74,
    sunColor: 0xffedd5,
    ambientSky: 0xfed7aa,
    ambientGround: 0x451a03,
    worldRadius: 46,
  },
  cyber_nexus: {
    id: 'cyber_nexus',
    name: '사이버 넥서스',
    englishName: 'CYBER NEXUS',
    badge: '테크',
    category: 'industrial',
    description: '45도 다이아몬드 회전 회랑과 홀로그램 데이터 뱅크가 대각선으로 얽힌 테크 매트릭스',
    traitName: '하이퍼 데이터 가속',
    traitDesc: '홀로그램 코어 공명 · 이동속도 +8% & 쿨타임 회복 +10% 오버클럭',
    gravityMult: 1.0,
    moveSpeedMult: 1.08,
    cooldownSpeedMult: 1.1,
    poolRegenPerSec: 0,
    accentHex: '#06b6d4',
    groundStyle: 'cyber',
    ringStyle: 'double',
    isFloatingSky: false,
    groundTint: 0xffffff,
    ringPrimary: 0x06b6d4,
    ringEmissive: 0x0891b2,
    groundColor: 0x0f172a,
    skyTop: '#020617',
    skyMid: '#0369a1',
    skyHorizon: '#a5f3fc',
    skyBottom: '#0f172a',
    fogColor: 0xbae6fd,
    sunColor: 0xe0f2fe,
    ambientSky: 0x7dd3fc,
    ambientGround: 0x1e293b,
    worldRadius: 46,
  },
  frost_bastion: {
    id: 'frost_bastion',
    name: '빙하 요새',
    englishName: 'FROST BASTION',
    badge: '설원',
    category: 'nature',
    description: '서쪽 빙벽 파이프 협곡과 동쪽 개방형 얼음 분화구, 대각 빙하 교각의 비대칭 설원',
    traitName: '빙하 설원 활주',
    traitDesc: '빙벽 스케이팅 기동(+7%) · 남북 냉각 빙하샘 화상 즉시 치유(+2.5 HP/s)',
    gravityMult: 1.0,
    moveSpeedMult: 1.07,
    cooldownSpeedMult: 1.0,
    poolRegenPerSec: 2.5,
    accentHex: '#38bdf8',
    groundStyle: 'ice',
    ringStyle: 'none',
    isFloatingSky: false,
    groundTint: 0xffffff,
    ringPrimary: 0x7dd3fc,
    ringEmissive: 0x0369a1,
    groundColor: 0xbae6fd,
    skyTop: '#1d4ed8',
    skyMid: '#93c5fd',
    skyHorizon: '#f0f9ff',
    skyBottom: '#e2e8f0',
    fogColor: 0xe0f2fe,
    sunColor: 0xffffff,
    ambientSky: 0xe0f2fe,
    ambientGround: 0x64748b,
    worldRadius: 70,
  },
  ancient_temple: {
    id: 'ancient_temple',
    name: '고대 사원',
    englishName: 'ANCIENT TEMPLE',
    badge: '유적',
    category: 'nature',
    description: '서쪽 피라미드 지구라트, 중앙 태양 열주 광장, 동쪽 파라오 스나이퍼 회랑의 3구역 신전',
    traitName: '파라오 태양 오아시스',
    traitDesc: '황금 피라미드 성역 · 신전 오아시스 물웅덩이에서 초당 +3 HP 치유',
    gravityMult: 1.0,
    moveSpeedMult: 1.0,
    cooldownSpeedMult: 1.04,
    poolRegenPerSec: 3.0,
    accentHex: '#d97706',
    groundStyle: 'sand',
    ringStyle: 'outer_only',
    isFloatingSky: false,
    groundTint: 0xfde68a,
    ringPrimary: 0xd97706,
    ringEmissive: 0x92400e,
    groundColor: 0xd6b47b,
    skyTop: '#2563eb',
    skyMid: '#60a5fa',
    skyHorizon: '#fef3c7',
    skyBottom: '#d6b47b',
    fogColor: 0xfde68a,
    sunColor: 0xfffbeb,
    ambientSky: 0xfef3c7,
    ambientGround: 0x78350f,
    worldRadius: 70,
  },
  orbital_reactor: {
    id: 'orbital_reactor',
    name: '궤도 원자로',
    englishName: 'ORBITAL REACTOR',
    badge: '우주',
    category: 'cosmic',
    description: '우주 궤도 위 동서 2개 대형 윙 데크를 4개 플라즈마 협곡 교각이 잇는 H자형 스테이션',
    traitName: '제로-G 플라즈마 코어',
    traitDesc: '우주 저중력(0.80x) 토카막 코어 · 스킬 쿨타임 +12% & 협곡 횡단 점프 패드',
    gravityMult: 0.8,
    moveSpeedMult: 1.02,
    cooldownSpeedMult: 1.12,
    poolRegenPerSec: 0,
    accentHex: '#6366f1',
    groundStyle: 'cyber',
    ringStyle: 'outer_only',
    isFloatingSky: true,
    groundTint: 0x818cf8,
    ringPrimary: 0xa855f7,
    ringEmissive: 0x7e22ce,
    groundColor: 0x312e81,
    skyTop: '#090d1f',
    skyMid: '#3730a3',
    skyHorizon: '#a5b4fc',
    skyBottom: '#1e1b4b',
    fogColor: 0x818cf8,
    sunColor: 0xeef2ff,
    ambientSky: 0xc7d2fe,
    ambientGround: 0x1e1b4b,
    worldRadius: 46,
  },
  volcanic_caldera: {
    id: 'volcanic_caldera',
    name: '화산 칼데라',
    englishName: 'VOLCANIC CALDERA',
    badge: '화산',
    category: 'citadel',
    description: '외곽으로 갈수록 높아지는 3단 원형 분화구 단차 능선과 중앙 흑요석 분지 원형 아레나',
    traitName: '칼데라 마그마 분출',
    traitDesc: '분화구 상승 기류(중력 0.92x) · 대각 마그마 웅덩이 & 고탄성 간헐천 패드',
    gravityMult: 0.92,
    moveSpeedMult: 1.0,
    cooldownSpeedMult: 1.05,
    poolRegenPerSec: 0,
    accentHex: '#ea580c',
    groundStyle: 'obsidian',
    ringStyle: 'double',
    isFloatingSky: false,
    groundTint: 0x78350f,
    ringPrimary: 0xf97316,
    ringEmissive: 0xc2410c,
    groundColor: 0x44403c,
    skyTop: '#450a0a',
    skyMid: '#c2410c',
    skyHorizon: '#fdba74',
    skyBottom: '#431407',
    fogColor: 0xfed7aa,
    sunColor: 0xffedd5,
    ambientSky: 0xfdba74,
    ambientGround: 0x292524,
    worldRadius: 70,
  },
  bamboo_sanctuary: {
    id: 'bamboo_sanctuary',
    name: '대나무 성소',
    englishName: 'BAMBOO SANCTUARY',
    badge: '성소',
    category: 'nature',
    description: '비대칭 3개 수상 누각 데크와 굽이치는 대나무 우회 회랑이 연못을 감싸는 선(禪) 정원',
    traitName: '검선(劍仙) 대나무 풍림',
    traitDesc: '경공술 질풍(+5% 이속) · 대나무 정원 연못에서 초당 +3.5 HP 치유',
    gravityMult: 0.95,
    moveSpeedMult: 1.05,
    cooldownSpeedMult: 1.0,
    poolRegenPerSec: 3.5,
    accentHex: '#15803d',
    groundStyle: 'grass',
    ringStyle: 'none',
    isFloatingSky: false,
    groundTint: 0xd9f99d,
    ringPrimary: 0x22c55e,
    ringEmissive: 0x15803d,
    groundColor: 0x4d7c0f,
    skyTop: '#0369a1',
    skyMid: '#38bdf8',
    skyHorizon: '#ecfccb',
    skyBottom: '#bef264',
    fogColor: 0xd9f99d,
    sunColor: 0xfefce8,
    ambientSky: 0xecfccb,
    ambientGround: 0x365314,
    worldRadius: 70,
  },
  neon_downtown: {
    id: 'neon_downtown',
    name: '네온 다운타운',
    englishName: 'NEON DOWNTOWN',
    badge: '도시',
    category: 'industrial',
    description: '4개 초대형 마천루 빌딩 사이를 가르는 십자 대로와 뒷골목 아케이드 스플릿 도심 전장',
    traitName: '루프탑 시티러너',
    traitDesc: '마천루 네온 스트리트 · 도심 파쿠르(+8% 이속) & 옥상 환풍구 점프 패드',
    gravityMult: 1.0,
    moveSpeedMult: 1.08,
    cooldownSpeedMult: 1.0,
    poolRegenPerSec: 0,
    accentHex: '#0ea5e9',
    groundStyle: 'asphalt',
    ringStyle: 'none',
    isFloatingSky: false,
    groundTint: 0x475569,
    ringPrimary: 0x38bdf8,
    ringEmissive: 0x0369a1,
    groundColor: 0x1e293b,
    skyTop: '#090d16',
    skyMid: '#1e3a8a',
    skyHorizon: '#bae6fd',
    skyBottom: '#334155',
    fogColor: 0x93c5fd,
    sunColor: 0xf0f9ff,
    ambientSky: 0x93c5fd,
    ambientGround: 0x1e293b,
    worldRadius: 46,
  },
  sunken_atlantis: {
    id: 'sunken_atlantis',
    name: '아틀란티스 유적',
    englishName: 'SUNKEN ATLANTIS',
    badge: '해저',
    category: 'nature',
    description: '브리즈 스타일의 광활한 장거리 중앙 신전 광장과 남북 원형 원형극장 계단식 수중 유적',
    traitName: '포세이돈 삼지창 성역',
    traitDesc: '해저 부력(중력 0.86x) · 아쿠아 성수 연못에서 초당 +3 HP & 심해 간헐천',
    gravityMult: 0.86,
    moveSpeedMult: 1.02,
    cooldownSpeedMult: 1.0,
    poolRegenPerSec: 3.0,
    accentHex: '#0d9488',
    groundStyle: 'marble',
    ringStyle: 'outer_only',
    isFloatingSky: false,
    groundTint: 0x5eead4,
    ringPrimary: 0x14b8a6,
    ringEmissive: 0x0f766e,
    groundColor: 0x115e59,
    skyTop: '#0f766e',
    skyMid: '#2dd4bf',
    skyHorizon: '#ccfbf1',
    skyBottom: '#99f6e4',
    fogColor: 0xccfbf1,
    sunColor: 0xf0fdfa,
    ambientSky: 0x99f6e4,
    ambientGround: 0x134e4a,
    worldRadius: 70,
  },
  clockwork_tower: {
    id: 'clockwork_tower',
    name: '시계탑 기어',
    englishName: 'CLOCKWORK TOWER',
    badge: '기계',
    category: 'industrial',
    description: '서로 다른 높이로 맞물린 4대 원형 톱니바퀴 데크와 나선형 외곽 태엽 브릿지',
    traitName: '크로노 대시계 태엽',
    traitDesc: '시간 가속 톱니바퀴 · 모든 스킬/대쉬 쿨타임 회복 +22% 부스트!',
    gravityMult: 1.0,
    moveSpeedMult: 1.02,
    cooldownSpeedMult: 1.22,
    poolRegenPerSec: 0,
    accentHex: '#b45309',
    groundStyle: 'brass',
    ringStyle: 'double',
    isFloatingSky: false,
    groundTint: 0xffffff,
    ringPrimary: 0xf59e0b,
    ringEmissive: 0xb45309,
    groundColor: 0x57534e,
    skyTop: '#1e293b',
    skyMid: '#92400e',
    skyHorizon: '#fef3c7',
    skyBottom: '#78350f',
    fogColor: 0xfde68a,
    sunColor: 0xfffbeb,
    ambientSky: 0xfef3c7,
    ambientGround: 0x451a03,
    worldRadius: 46,
  },
  desert_mirage: {
    id: 'desert_mirage',
    name: '사막 신기루',
    englishName: 'DESERT MIRAGE',
    badge: '사막',
    category: 'nature',
    description: '거대한 중앙 성벽이 동서 바자르·궁전 구역을 가르고 양방향 텔레포트 패드로 잇는 바인드형 사막',
    traitName: '신기루 쌍둥이 오아시스',
    traitDesc: '사막 열풍 기동(+4% 이속) · 오아시스 샘물 초당 +3 HP 치유 & 횡단 텔레포트 패드',
    gravityMult: 1.0,
    moveSpeedMult: 1.04,
    cooldownSpeedMult: 1.0,
    poolRegenPerSec: 3.0,
    accentHex: '#eab308',
    groundStyle: 'sand',
    ringStyle: 'none',
    isFloatingSky: false,
    groundTint: 0xffffff,
    ringPrimary: 0xfacc15,
    ringEmissive: 0xca8a04,
    groundColor: 0xd97706,
    skyTop: '#0284c7',
    skyMid: '#38bdf8',
    skyHorizon: '#fef9c3',
    skyBottom: '#fde047',
    fogColor: 0xfef08a,
    sunColor: 0xffffff,
    ambientSky: 0xfef9c3,
    ambientGround: 0x854d0e,
    worldRadius: 50,
  },
  crystal_cavern: {
    id: 'crystal_cavern',
    name: '수정 동굴',
    englishName: 'CRYSTAL CAVERN',
    badge: '수정',
    category: 'cosmic',
    description: '거대 암석 격벽으로 나뉜 3개 지하 동굴 방과 좁은 자수정 터널이 굽이치는 지저 아레나',
    traitName: '에코 크리스탈 공명',
    traitDesc: '자수정 마력 공명 · 스킬 쿨타임 +15% 가속 & 크리스탈 프리즘 패드',
    gravityMult: 0.96,
    moveSpeedMult: 1.0,
    cooldownSpeedMult: 1.15,
    poolRegenPerSec: 0,
    accentHex: '#9333ea',
    groundStyle: 'geode',
    ringStyle: 'none',
    isFloatingSky: false,
    groundTint: 0xffffff,
    ringPrimary: 0xc084fc,
    ringEmissive: 0x7e22ce,
    groundColor: 0x3b0764,
    skyTop: '#0f0720',
    skyMid: '#4c1d95',
    skyHorizon: '#d8b4fe',
    skyBottom: '#2e1065',
    fogColor: 0xc4b5fd,
    sunColor: 0xfaf5ff,
    ambientSky: 0xd8b4fe,
    ambientGround: 0x2e1065,
    worldRadius: 46,
  },
  cherry_pagoda: {
    id: 'cherry_pagoda',
    name: '벚꽃 파고다',
    englishName: 'CHERRY PAGODA',
    badge: '누각',
    category: 'nature',
    description: '남서-북동 대각선 신사 도리이 산책로와 북서 3단 오층 파고다, 남동 연못 정원',
    traitName: '천년 벚꽃 연못',
    traitDesc: '만개한 사쿠라 정원 · 벚꽃 연못에서 초당 +4 HP 최고 수준 자연 치유',
    gravityMult: 0.96,
    moveSpeedMult: 1.02,
    cooldownSpeedMult: 1.0,
    poolRegenPerSec: 4.0,
    accentHex: '#ec4899',
    groundStyle: 'marble',
    ringStyle: 'none',
    isFloatingSky: false,
    groundTint: 0xfce7f3,
    ringPrimary: 0xf472b6,
    ringEmissive: 0xbe185d,
    groundColor: 0xf9a8d4,
    skyTop: '#3b82f6',
    skyMid: '#93c5fd',
    skyHorizon: '#fce7f3',
    skyBottom: '#fbcfe8',
    fogColor: 0xfce7f3,
    sunColor: 0xfff1f2,
    ambientSky: 0xfbcfe8,
    ambientGround: 0x831843,
    worldRadius: 70,
  },
  obsidian_keep: {
    id: 'obsidian_keep',
    name: '흑요석 요새',
    englishName: 'OBSIDIAN KEEP',
    badge: '요새',
    category: 'citadel',
    description: '공허의 하늘 위 4개 분리된 부유 흑요석 섬과 좁은 엔드 다리로 연결된 아키펠라고 성채',
    traitName: '엔드 드래곤 성채',
    traitDesc: '부유 공허 군도(중력 0.90x) · 쿨타임 +10% & 섬 횡단 엔더 패드',
    gravityMult: 0.9,
    moveSpeedMult: 1.0,
    cooldownSpeedMult: 1.1,
    poolRegenPerSec: 0,
    accentHex: '#4f46e5',
    groundStyle: 'obsidian',
    ringStyle: 'outer_only',
    isFloatingSky: true,
    groundTint: 0xc4b5fd,
    ringPrimary: 0x818cf8,
    ringEmissive: 0x4338ca,
    groundColor: 0x1e1b4b,
    skyTop: '#050814',
    skyMid: '#312e81',
    skyHorizon: '#a5b4fc',
    skyBottom: '#0f0a24',
    fogColor: 0x6366f1,
    sunColor: 0xe0e7ff,
    ambientSky: 0xa5b4fc,
    ambientGround: 0x1e1b4b,
    worldRadius: 70,
  },
  solar_observatory: {
    id: 'solar_observatory',
    name: '태양 관측소',
    englishName: 'SOLAR OBSERVATORY',
    badge: '천문',
    category: 'cosmic',
    description: '스톤헨지형 2중 동심원 모노리스 아크와 적도 천문 교각이 가로지르는 해시계 광장',
    traitName: '천구의 성좌 관측',
    traitDesc: '거대 황금 혼천의 궤도 · 성간 저중력(0.85x) & 태양 렌즈 도약 패드',
    gravityMult: 0.85,
    moveSpeedMult: 1.02,
    cooldownSpeedMult: 1.05,
    poolRegenPerSec: 0,
    accentHex: '#f59e0b',
    groundStyle: 'brass',
    ringStyle: 'double',
    isFloatingSky: false,
    groundTint: 0xe2e8f0,
    ringPrimary: 0xfbbf24,
    ringEmissive: 0xd97706,
    groundColor: 0xcbd5e1,
    skyTop: '#1d4ed8',
    skyMid: '#60a5fa',
    skyHorizon: '#fef3c7',
    skyBottom: '#fde68a',
    fogColor: 0xfef3c7,
    sunColor: 0xffffff,
    ambientSky: 0xfef3c7,
    ambientGround: 0x64748b,
    worldRadius: 70,
  },
  toxic_refinery: {
    id: 'toxic_refinery',
    name: '독성 정제소',
    englishName: 'TOXIC REFINERY',
    badge: '플랜트',
    category: 'industrial',
    description: '거대한 6대 케미컬 사일로 탱크 사이를 지그재그 공중 파이프 캣워크로 잇는 화학 플랜트',
    traitName: '케미컬 가압 플랜트',
    traitDesc: '반응로 촉진제(+5% 이속, +10% 쿨감) & 화학 고열 반응 웅덩이',
    gravityMult: 1.0,
    moveSpeedMult: 1.05,
    cooldownSpeedMult: 1.1,
    poolRegenPerSec: 0,
    accentHex: '#10b981',
    groundStyle: 'asphalt',
    ringStyle: 'none',
    isFloatingSky: false,
    groundTint: 0x4d7c0f,
    ringPrimary: 0x34d399,
    ringEmissive: 0x059669,
    groundColor: 0x365314,
    skyTop: '#064e3b',
    skyMid: '#059669',
    skyHorizon: '#d1fae5',
    skyBottom: '#365314',
    fogColor: 0xd1fae5,
    sunColor: 0xecfdf5,
    ambientSky: 0xa7f3d0,
    ambientGround: 0x14532d,
    worldRadius: 46,
  },
  aether_spire: {
    id: 'aether_spire',
    name: '에테르 첨탑',
    englishName: 'AETHER SPIRE',
    badge: '천공',
    category: 'cosmic',
    description: '남쪽 저지대 광장에서 중층 대리석 테라스를 거쳐 북쪽 하이 그라운드 성소로 오르는 3단 천공 계단 전장',
    traitName: '천공 발할라 저중력',
    traitDesc: '극한 저중력(0.76x) + 초고공 상승 패드(23.5) · 최강의 공중전 & 철퇴 스매시!',
    gravityMult: 0.76,
    moveSpeedMult: 1.03,
    cooldownSpeedMult: 1.08,
    poolRegenPerSec: 0,
    accentHex: '#7c3aed',
    groundStyle: 'marble',
    ringStyle: 'outer_only',
    isFloatingSky: true,
    groundTint: 0xffffff,
    ringPrimary: 0xa78bfa,
    ringEmissive: 0x6d28d9,
    groundColor: 0xe2e8f0,
    skyTop: '#2563eb',
    skyMid: '#818cf8',
    skyHorizon: '#f5f3ff',
    skyBottom: '#ede9fe',
    fogColor: 0xede9fe,
    sunColor: 0xffffff,
    ambientSky: 0xddd6fe,
    ambientGround: 0x64748b,
    worldRadius: 50,
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

function addRamp(
  blocks: ArenaBlock[],
  prefix: string,
  startX: number,
  startZ: number,
  dirX: number,
  dirZ: number,
  steps: number,
  totalHeight: number,
  width: number,
  stepRun: number,
  kind: ArenaBlock['kind'],
  baseY = 0
) {
  const stepH = totalHeight / steps;
  for (let i = 0; i < steps; i++) {
    blocks.push({
      id: `${prefix}_${i}`,
      x: startX + dirX * i * stepRun,
      y: baseY,
      z: startZ + dirZ * i * stepRun,
      w: dirX !== 0 ? stepRun : width,
      h: (i + 1) * stepH,
      d: dirZ !== 0 ? stepRun : width,
      kind,
    });
  }
}

/**
 * 1. Container Yard (Bind-inspired Split Compound + Central Divider Spine + Twin Harbor Docks)
 */
function buildContainerYardBlocks(): ArenaBlock[] {
  const blocks: ArenaBlock[] = [
    // Bind-style massive Central Spine dividing A-West & B-East with a tight Mid Double-Doorway
    { id: 'cy_spine_n', x: 0, y: 0, z: -13.5, w: 3.4, h: 4.8, d: 15, kind: 'deepslate' },
    { id: 'cy_spine_s', x: 0, y: 0, z: 13.5, w: 3.4, h: 4.8, d: 15, kind: 'deepslate' },
    { id: 'cy_spine_lintel', x: 0, y: 4.8, z: 0, w: 3.8, h: 1.2, d: 13, kind: 'container_amber' },
    { id: 'cy_mid_hook_w', x: -5.2, y: 0, z: -4.2, w: 2.2, h: 2.6, d: 2.2, kind: 'wood_crate' },
    { id: 'cy_mid_hook_e', x: 5.2, y: 0, z: 4.2, w: 2.2, h: 2.6, d: 2.2, kind: 'wood_crate' },

    // A-Site (West Cargo Bay — Asymmetric Angled Shipping Rows + Overhead Crane Gantry)
    { id: 'cy_a_main_1', x: -13.5, y: 0, z: -10, w: 3.8, h: 3.1, d: 9.5, kind: 'container_red' },
    { id: 'cy_a_main_2', x: -13.5, y: 3.1, z: -9.5, w: 3.8, h: 2.8, d: 7.2, kind: 'container_blue' },
    { id: 'cy_a_truck', x: -19, y: 0, z: 4.5, w: 7.8, h: 2.8, d: 3.6, kind: 'container_amber' },
    { id: 'cy_a_truck_top', x: -20.5, y: 2.8, z: 4.5, w: 4.2, h: 1.6, d: 3.4, kind: 'wood_crate' },
    { id: 'cy_a_cubby', x: -26, y: 0, z: -14, w: 6.5, h: 3.6, d: 3.2, kind: 'deepslate' },
    { id: 'cy_a_tower', x: -31, y: 0, z: -2, w: 5.5, h: 4.5, d: 9.0, kind: 'deepslate' },
    { id: 'cy_a_tower_para', x: -28.6, y: 4.5, z: -2, w: 0.9, h: 1.1, d: 7.0, kind: 'container_red' },
    { id: 'cy_a_dock_wall', x: -35, y: 0, z: 14, w: 3.2, h: 5.2, d: 16, kind: 'container_teal' },

    // B-Site (East Long + Hookah Cubby + Stacked Double Containers)
    { id: 'cy_b_hookah', x: 11.5, y: 0, z: 12.5, w: 8.5, h: 3.2, d: 4.2, kind: 'container_teal' },
    { id: 'cy_b_site_1', x: 20, y: 0, z: -6.5, w: 9.2, h: 3.0, d: 3.8, kind: 'container_blue' },
    { id: 'cy_b_site_2', x: 21.5, y: 3.0, z: -6.5, w: 6.0, h: 2.8, d: 3.8, kind: 'container_red' },
    { id: 'cy_b_peek_1', x: 17.5, y: 0, z: 1.5, w: 2.4, h: 1.45, d: 2.4, kind: 'wood_crate' },
    { id: 'cy_b_peek_2', x: 25.5, y: 0, z: 7.5, w: 3.8, h: 3.2, d: 8.2, kind: 'container_amber' },
    { id: 'cy_b_crane_n', x: 29, y: 0, z: -18, w: 5.2, h: 8.5, d: 5.2, kind: 'deepslate' },
    { id: 'cy_b_crane_s', x: 29, y: 0, z: 22, w: 5.2, h: 8.5, d: 5.2, kind: 'deepslate' },
    { id: 'cy_b_gantry', x: 29, y: 8.5, z: 2, w: 3.8, h: 1.1, d: 44, kind: 'container_amber' },

    // North & South Teleport/Spawn Shipping Bunkers
    { id: 'cy_n_bunk_w', x: -11, y: 0, z: -27, w: 9.0, h: 3.2, d: 4.0, kind: 'container_teal' },
    { id: 'cy_n_bunk_e', x: 11, y: 0, z: -27, w: 9.0, h: 3.2, d: 4.0, kind: 'container_red' },
    { id: 'cy_s_bunk_w', x: -11, y: 0, z: 27, w: 9.0, h: 3.2, d: 4.0, kind: 'container_blue' },
    { id: 'cy_s_bunk_e', x: 11, y: 0, z: 27, w: 9.0, h: 3.2, d: 4.0, kind: 'container_amber' },
    { id: 'cy_out_w_wall', x: -38, y: 0, z: -12, w: 2.8, h: 5.0, d: 22, kind: 'deepslate' },
    { id: 'cy_out_e_wall', x: 38, y: 0, z: 8, w: 2.8, h: 5.0, d: 24, kind: 'deepslate' },
  ];

  addRamp(blocks, 'cy_ramp_atow', -31, -8.5, 0, -1, 4, 4.5, 3.2, 1.8, 'wood_crate');
  addRamp(blocks, 'cy_ramp_ahook', -9.2, -10, 0, 1, 3, 3.1, 2.4, 1.8, 'deepslate');
  addRamp(blocks, 'cy_ramp_bsite', 14.5, -6.5, 1, 0, 3, 3.0, 2.6, 1.6, 'wood_crate');
  addRamp(blocks, 'cy_ramp_bhook', 6.5, 12.5, 1, 0, 3, 3.2, 2.6, 1.6, 'deepslate');
  return blocks;
}

/**
 * 2. Emerald Citadel (Ascent-inspired Wide Open Mid Courtyard + Market + Boathouse + Asymmetric Heaven)
 */
function buildEmeraldCitadelBlocks(): ArenaBlock[] {
  const blocks: ArenaBlock[] = [
    // Open Mid Courtyard rimmed by low cover plinths (keeps center wide & airy)
    { id: 'ec_mid_arch_w', x: -12.5, y: 0, z: 0, w: 3.2, h: 4.6, d: 3.2, kind: 'stone' },
    { id: 'ec_mid_arch_e', x: 12.5, y: 0, z: 0, w: 3.2, h: 4.6, d: 3.2, kind: 'stone' },
    { id: 'ec_mid_top', x: 0, y: 0, z: -7.5, w: 5.5, h: 1.35, d: 2.2, kind: 'turf' },
    { id: 'ec_mid_bot', x: 0, y: 0, z: 7.5, w: 5.5, h: 1.35, d: 2.2, kind: 'turf' },
    { id: 'ec_pizza_w', x: -7.5, y: 0, z: -6.5, w: 2.2, h: 1.65, d: 2.2, kind: 'wood_crate' },
    { id: 'ec_pizza_e', x: 7.5, y: 0, z: 6.5, w: 2.2, h: 1.65, d: 2.2, kind: 'wood_crate' },

    // North-West A-Site: Citadel Heaven Keep + Generator Triple-Box + Wine Corner
    { id: 'ec_a_keep', x: -24, y: 0, z: -20, w: 12, h: 4.2, d: 7.5, kind: 'deepslate' },
    { id: 'ec_a_parapet', x: -24, y: 4.2, z: -16.6, w: 9.5, h: 1.05, d: 0.9, kind: 'stone' },
    { id: 'ec_a_gen1', x: -21, y: 0, z: -6.5, w: 3.4, h: 3.1, d: 3.4, kind: 'obsidian' },
    { id: 'ec_a_gen2', x: -24, y: 0, z: -6.5, w: 2.4, h: 1.55, d: 2.4, kind: 'wood_crate' },
    { id: 'ec_a_wine', x: -33, y: 0, z: -4, w: 4.2, h: 3.8, d: 11, kind: 'stone' },
    { id: 'ec_a_tree_wall', x: -14, y: 0, z: -19, w: 5.5, h: 3.4, d: 3.0, kind: 'stone' },

    // South-East B-Site: Boathouse + Market Window + Lane Shed
    { id: 'ec_b_boat', x: 27, y: 0, z: 22, w: 13, h: 3.6, d: 7.5, kind: 'wood_crate' },
    { id: 'ec_b_market_n', x: 16, y: 0, z: 12, w: 3.2, h: 4.0, d: 7.5, kind: 'stone' },
    { id: 'ec_b_market_s', x: 16, y: 0, z: 23.5, w: 3.2, h: 4.0, d: 6.5, kind: 'stone' },
    { id: 'ec_b_shed', x: 25, y: 0, z: 7.5, w: 4.5, h: 2.9, d: 4.5, kind: 'deepslate' },
    { id: 'ec_b_logs', x: 32, y: 0, z: 13, w: 2.6, h: 1.5, d: 5.2, kind: 'wood_crate' },

    // North-East & South-West Flanking Pergola Ruins (open outdoor perimeter, no enclosing walls)
    { id: 'ec_ruin_ne1', x: 19, y: 0, z: -18, w: 4.5, h: 6.5, d: 4.5, kind: 'amethyst' },
    { id: 'ec_ruin_ne2', x: 28, y: 0, z: -12, w: 3.8, h: 3.2, d: 8.5, kind: 'stone' },
    { id: 'ec_ruin_sw1', x: -19, y: 0, z: 18, w: 4.5, h: 6.5, d: 4.5, kind: 'amethyst' },
    { id: 'ec_ruin_sw2', x: -28, y: 0, z: 12, w: 3.8, h: 3.2, d: 8.5, kind: 'stone' },
    { id: 'ec_dais_n', x: 0, y: 0, z: -24, w: 10, h: 2.2, d: 6.0, kind: 'deepslate' },
    { id: 'ec_dais_s', x: 0, y: 0, z: 24, w: 10, h: 2.2, d: 6.0, kind: 'deepslate' },
    { id: 'ec_obel_w', x: -37, y: 0, z: -24, w: 4.2, h: 9.5, d: 4.2, kind: 'obsidian' },
    { id: 'ec_obel_e', x: 37, y: 0, z: 24, w: 4.2, h: 9.5, d: 4.2, kind: 'obsidian' },
  ];

  addRamp(blocks, 'ec_st_akeep', -16.8, -20, -1, 0, 4, 4.2, 3.6, 1.8, 'stone');
  addRamp(blocks, 'ec_st_bboat', 19.5, 22, 1, 0, 3, 3.6, 3.6, 1.8, 'wood_crate');
  addRamp(blocks, 'ec_st_dn', -6.2, -24, 1, 0, 2, 2.2, 3.4, 1.8, 'stone');
  addRamp(blocks, 'ec_st_ds', 6.2, 24, -1, 0, 2, 2.2, 3.4, 1.8, 'stone');
  return blocks;
}

/**
 * 3. Sky Dock (Floating 3-Parallel Aircraft Carrier Flight Runways + Diagonal Catwalks)
 */
function buildSkyDockBlocks(): ArenaBlock[] {
  const blocks: ArenaBlock[] = [
    // West Runway Pier (elevated flight deck y=2.4)
    { id: 'sd_rw_w_n', x: -22, y: 0, z: -15, w: 9.5, h: 2.4, d: 20, kind: 'deepslate' },
    { id: 'sd_rw_w_s', x: -22, y: 0, z: 15, w: 9.5, h: 2.4, d: 20, kind: 'deepslate' },
    { id: 'sd_rw_w_mid', x: -22, y: 0, z: 0, w: 9.5, h: 2.4, d: 10, kind: 'asphalt' },
    // East Runway Pier (elevated flight deck y=2.4)
    { id: 'sd_rw_e_n', x: 22, y: 0, z: -15, w: 9.5, h: 2.4, d: 20, kind: 'deepslate' },
    { id: 'sd_rw_e_s', x: 22, y: 0, z: 15, w: 9.5, h: 2.4, d: 20, kind: 'deepslate' },
    { id: 'sd_rw_e_mid', x: 22, y: 0, z: 0, w: 9.5, h: 2.4, d: 10, kind: 'asphalt' },

    // Central Runway Strip (Split North/South decks keeping (0,0) clear on tarmac!)
    { id: 'sd_cen_n', x: 0, y: 0, z: -21, w: 8.5, h: 2.4, d: 18, kind: 'asphalt' },
    { id: 'sd_cen_s', x: 0, y: 0, z: 21, w: 8.5, h: 2.4, d: 18, kind: 'asphalt' },

    // Skewed Cross Catwalks linking the 3 Parallel Carrier Strips
    { id: 'sd_cross_nw', x: -11, y: 2.4, z: -14, w: 14, h: 0.75, d: 4.2, kind: 'container_blue' },
    { id: 'sd_cross_se', x: 11, y: 2.4, z: 14, w: 14, h: 0.75, d: 4.2, kind: 'container_teal' },
    { id: 'sd_cross_ne', x: 11, y: 4.8, z: -9, w: 15, h: 0.75, d: 3.6, kind: 'gold' },
    { id: 'sd_cross_sw', x: -11, y: 4.8, z: 9, w: 15, h: 0.75, d: 3.6, kind: 'gold' },

    // Flight Deck Jet-Blast Deflectors & Cargo Pods
    { id: 'sd_def_w1', x: -22, y: 2.4, z: -12, w: 6.0, h: 1.5, d: 1.4, kind: 'container_amber' },
    { id: 'sd_def_w2', x: -22, y: 2.4, z: 12, w: 6.0, h: 1.5, d: 1.4, kind: 'container_red' },
    { id: 'sd_def_e1', x: 22, y: 2.4, z: -12, w: 6.0, h: 1.5, d: 1.4, kind: 'container_red' },
    { id: 'sd_def_e2', x: 22, y: 2.4, z: 12, w: 6.0, h: 1.5, d: 1.4, kind: 'container_amber' },
    { id: 'sd_pod_w', x: -24.5, y: 2.4, z: 0, w: 3.2, h: 2.8, d: 6.5, kind: 'container_blue' },
    { id: 'sd_pod_e', x: 24.5, y: 2.4, z: 0, w: 3.2, h: 2.8, d: 6.5, kind: 'container_teal' },

    // Carrier Control Island Tower (North-East asymmetry!) + Radar Wing
    { id: 'sd_island', x: 31, y: 0, z: -18, w: 6.5, h: 11.5, d: 11, kind: 'deepslate' },
    { id: 'sd_island_bridge', x: 29, y: 8.0, z: -18, w: 9.5, h: 1.8, d: 6.5, kind: 'gold' },
    { id: 'sd_tug_sw', x: -31, y: 0, z: 18, w: 6.0, h: 4.5, d: 7.5, kind: 'container_blue' },
    { id: 'sd_ground_cov_w', x: -7.5, y: 0, z: -5.5, w: 2.4, h: 1.5, d: 4.2, kind: 'wood_crate' },
    { id: 'sd_ground_cov_e', x: 7.5, y: 0, z: 5.5, w: 2.4, h: 1.5, d: 4.2, kind: 'wood_crate' },
  ];

  addRamp(blocks, 'sd_rmp_cn', 0, -10.5, 0, -1, 3, 2.4, 4.0, 1.8, 'wood_crate');
  addRamp(blocks, 'sd_rmp_cs', 0, 10.5, 0, 1, 3, 2.4, 4.0, 1.8, 'wood_crate');
  addRamp(blocks, 'sd_rmp_w', -15.8, 0, -1, 0, 3, 2.4, 3.8, 1.8, 'stone');
  addRamp(blocks, 'sd_rmp_e', 15.8, 0, 1, 0, 3, 2.4, 3.8, 1.8, 'stone');
  addRamp(blocks, 'sd_rmp_up_w', -22, 3.5, 0, 1, 3, 2.4, 3.0, 1.6, 'container_amber', 2.4);
  addRamp(blocks, 'sd_rmp_up_e', 22, -3.5, 0, -1, 3, 2.4, 3.0, 1.6, 'container_amber', 2.4);
  return blocks;
}

/**
 * 4. Crimson Foundry (Diagonal X-Cross Smelting Catwalks & 4 Blast Furnaces)
 */
function buildNetherFoundryBlocks(): ArenaBlock[] {
  const blocks: ArenaBlock[] = [
    // Diagonal X-Arm Smelting Platforms (4 Quadrants separated by deep magma channels)
    { id: 'nf_arm_nw1', x: -11, y: 0, z: -11, w: 7.5, h: 2.2, d: 7.5, kind: 'basalt' },
    { id: 'nf_arm_nw2', x: -19, y: 0, z: -19, w: 8.5, h: 3.8, d: 8.5, kind: 'crimson_brick' },
    { id: 'nf_arm_ne1', x: 11, y: 0, z: -11, w: 7.5, h: 2.2, d: 7.5, kind: 'basalt' },
    { id: 'nf_arm_ne2', x: 19, y: 0, z: -19, w: 8.5, h: 3.8, d: 8.5, kind: 'crimson_brick' },
    { id: 'nf_arm_sw1', x: -11, y: 0, z: 11, w: 7.5, h: 2.2, d: 7.5, kind: 'basalt' },
    { id: 'nf_arm_sw2', x: -19, y: 0, z: 19, w: 8.5, h: 3.8, d: 8.5, kind: 'crimson_brick' },
    { id: 'nf_arm_se1', x: 11, y: 0, z: 11, w: 7.5, h: 2.2, d: 7.5, kind: 'basalt' },
    { id: 'nf_arm_se2', x: 19, y: 0, z: 19, w: 8.5, h: 3.8, d: 8.5, kind: 'crimson_brick' },

    // 4 Corner Blast-Furnace Chimneys + Overhead Crucible Truss Rings
    { id: 'nf_chim_nw', x: -30, y: 0, z: -30, w: 6.5, h: 11, d: 6.5, kind: 'obsidian' },
    { id: 'nf_chim_ne', x: 30, y: 0, z: -30, w: 6.5, h: 11, d: 6.5, kind: 'obsidian' },
    { id: 'nf_chim_sw', x: -30, y: 0, z: 30, w: 6.5, h: 11, d: 6.5, kind: 'obsidian' },
    { id: 'nf_chim_se', x: 30, y: 0, z: 30, w: 6.5, h: 11, d: 6.5, kind: 'obsidian' },

    // Overhead Iron Catwalk Bridges linking the X-arms at y=6.0 (clearing (0,0) high above)
    { id: 'nf_truss_n', x: 0, y: 6.0, z: -19, w: 32, h: 0.9, d: 3.6, kind: 'gold' },
    { id: 'nf_truss_s', x: 0, y: 6.0, z: 19, w: 32, h: 0.9, d: 3.6, kind: 'gold' },
    { id: 'nf_truss_w', x: -19, y: 6.0, z: 0, w: 3.6, h: 0.9, d: 32, kind: 'gold' },
    { id: 'nf_truss_e', x: 19, y: 6.0, z: 0, w: 3.6, h: 0.9, d: 32, kind: 'gold' },

    // Ground-level Slag Shields around Cardinal Corridors
    { id: 'nf_sh_n', x: 0, y: 0, z: -9, w: 4.5, h: 1.5, d: 1.8, kind: 'basalt' },
    { id: 'nf_sh_s', x: 0, y: 0, z: 9, w: 4.5, h: 1.5, d: 1.8, kind: 'basalt' },
    { id: 'nf_sh_w', x: -9, y: 0, z: 0, w: 1.8, h: 1.5, d: 4.5, kind: 'basalt' },
    { id: 'nf_sh_e', x: 9, y: 0, z: 0, w: 1.8, h: 1.5, d: 4.5, kind: 'basalt' },
    { id: 'nf_slag_w', x: -29, y: 0, z: 0, w: 4.5, h: 3.2, d: 12, kind: 'crimson_brick' },
    { id: 'nf_slag_e', x: 29, y: 0, z: 0, w: 4.5, h: 3.2, d: 12, kind: 'crimson_brick' },
  ];

  addRamp(blocks, 'nf_r_nw', -5.8, -11, -1, 0, 3, 2.2, 3.2, 1.5, 'basalt');
  addRamp(blocks, 'nf_r_ne', 5.8, -11, 1, 0, 3, 2.2, 3.2, 1.5, 'basalt');
  addRamp(blocks, 'nf_r_sw', -5.8, 11, -1, 0, 3, 2.2, 3.2, 1.5, 'basalt');
  addRamp(blocks, 'nf_r_se', 5.8, 11, 1, 0, 3, 2.2, 3.2, 1.5, 'basalt');
  addRamp(blocks, 'nf_r_hi_n', -14, -19, -1, 0, 2, 1.6, 3.2, 1.6, 'crimson_brick', 2.2);
  addRamp(blocks, 'nf_r_hi_s', 14, 19, 1, 0, 2, 1.6, 3.2, 1.6, 'crimson_brick', 2.2);
  return blocks;
}

/**
 * 5. Cyber Nexus (45° Rotated Diamond Server Matrix + Split-Level Monorail Data Trench)
 */
function buildCyberNexusBlocks(): ArenaBlock[] {
  const blocks: ArenaBlock[] = [
    // Diamond Outer Corner Server Citadels (along N, S, E, W vertices instead of NW/NE/SW/SE!)
    { id: 'cn_v_n', x: 0, y: 0, z: -27, w: 13, h: 3.4, d: 7.5, kind: 'cyber_panel' },
    { id: 'cn_v_s', x: 0, y: 0, z: 27, w: 13, h: 3.4, d: 7.5, kind: 'cyber_panel' },
    { id: 'cn_v_w', x: -27, y: 0, z: 0, w: 7.5, h: 3.4, d: 13, kind: 'cyber_panel' },
    { id: 'cn_v_e', x: 27, y: 0, z: 0, w: 7.5, h: 3.4, d: 13, kind: 'cyber_panel' },

    // Diamond Edge Angled Data Banks forming a rotated octagon courtyard
    { id: 'cn_d_nw1', x: -16, y: 0, z: -10, w: 2.8, h: 3.8, d: 6.5, kind: 'deepslate' },
    { id: 'cn_d_nw2', x: -10, y: 0, z: -16, w: 6.5, h: 3.8, d: 2.8, kind: 'deepslate' },
    { id: 'cn_d_ne1', x: 16, y: 0, z: -10, w: 2.8, h: 3.8, d: 6.5, kind: 'deepslate' },
    { id: 'cn_d_ne2', x: 10, y: 0, z: -16, w: 6.5, h: 3.8, d: 2.8, kind: 'deepslate' },
    { id: 'cn_d_sw1', x: -16, y: 0, z: 10, w: 2.8, h: 3.8, d: 6.5, kind: 'deepslate' },
    { id: 'cn_d_sw2', x: -10, y: 0, z: 16, w: 6.5, h: 3.8, d: 2.8, kind: 'deepslate' },
    { id: 'cn_d_se1', x: 16, y: 0, z: 10, w: 2.8, h: 3.8, d: 6.5, kind: 'deepslate' },
    { id: 'cn_d_se2', x: 10, y: 0, z: 16, w: 6.5, h: 3.8, d: 2.8, kind: 'deepslate' },

    // Asymmetric Dual-Track Elevated Data Monorails (y=5.4, offset from center)
    { id: 'cn_rail_w', x: -12, y: 5.4, z: 0, w: 3.6, h: 0.85, d: 44, kind: 'reactor_core' },
    { id: 'cn_rail_s', x: 0, y: 5.4, z: 12, w: 44, h: 0.85, d: 3.6, kind: 'reactor_core' },
    { id: 'cn_pill_w1', x: -12, y: 0, z: -22, w: 2.4, h: 5.4, d: 2.4, kind: 'amethyst' },
    { id: 'cn_pill_w2', x: -12, y: 0, z: 22, w: 2.4, h: 5.4, d: 2.4, kind: 'amethyst' },
    { id: 'cn_pill_s1', x: -22, y: 0, z: 12, w: 2.4, h: 5.4, d: 2.4, kind: 'amethyst' },
    { id: 'cn_pill_s2', x: 22, y: 0, z: 12, w: 2.4, h: 5.4, d: 2.4, kind: 'amethyst' },

    // Inner Firewall Peek Nodes (around clear 0,0)
    { id: 'cn_fw_nw', x: -6.5, y: 0, z: -6.5, w: 2.2, h: 1.5, d: 2.2, kind: 'reactor_core' },
    { id: 'cn_fw_ne', x: 6.5, y: 0, z: -6.5, w: 2.2, h: 1.5, d: 2.2, kind: 'reactor_core' },
    { id: 'cn_fw_sw', x: -6.5, y: 0, z: 6.5, w: 2.2, h: 1.5, d: 2.2, kind: 'reactor_core' },
    { id: 'cn_fw_se', x: 6.5, y: 0, z: 6.5, w: 2.2, h: 1.5, d: 2.2, kind: 'reactor_core' },
  ];

  addRamp(blocks, 'cn_r_n', -8.0, -27, 1, 0, 4, 3.4, 3.2, 1.5, 'cyber_panel');
  addRamp(blocks, 'cn_r_s', 8.0, 27, -1, 0, 4, 3.4, 3.2, 1.5, 'cyber_panel');
  addRamp(blocks, 'cn_r_w', -27, 8.0, 0, -1, 4, 3.4, 3.2, 1.5, 'cyber_panel');
  addRamp(blocks, 'cn_r_e', 27, -8.0, 0, 1, 4, 3.4, 3.2, 1.5, 'cyber_panel');
  return blocks;
}

/**
 * 6. Frost Bastion (Icebox-inspired Asymmetric Glacier Canyon + Raised West Belt + Mid Tube)
 */
function buildFrostBastionBlocks(): ArenaBlock[] {
  const blocks: ArenaBlock[] = [
    // West High Glacier Shelf (A-Belt / Pipes / Rafters vertical cliffside!)
    { id: 'fb_shelf_w1', x: -24, y: 0, z: -10, w: 12, h: 3.6, d: 18, kind: 'ice_brick' },
    { id: 'fb_shelf_w2', x: -25, y: 3.6, z: -15, w: 9.0, h: 2.4, d: 8.0, kind: 'deepslate' },
    { id: 'fb_pipe_bridge', x: -16, y: 4.8, z: -12, w: 10, h: 0.9, d: 3.2, kind: 'container_teal' },
    { id: 'fb_rafter_w', x: -28, y: 5.8, z: 8, w: 6.5, h: 1.0, d: 14, kind: 'deepslate' },

    // Central Glacial Boiler Tube (Elevated enclosed-top corridor running NW->SE)
    { id: 'fb_tube_w', x: -5.5, y: 0, z: -3.5, w: 2.4, h: 3.6, d: 12, kind: 'container_blue' },
    { id: 'fb_tube_e', x: 5.5, y: 0, z: 3.5, w: 2.4, h: 3.6, d: 12, kind: 'container_blue' },
    { id: 'fb_boiler_box', x: 0, y: 0, z: -12, w: 4.2, h: 2.2, d: 3.2, kind: 'wood_crate' },

    // East B-Yellow Cargo Yard & Snowman Corner (Low fast-peek shipping yard!)
    { id: 'fb_b_yel1', x: 18, y: 0, z: -6, w: 3.6, h: 3.0, d: 8.2, kind: 'container_amber' },
    { id: 'fb_b_yel2', x: 24, y: 0, z: 4, w: 7.5, h: 2.8, d: 3.6, kind: 'container_teal' },
    { id: 'fb_b_yel3', x: 24, y: 2.8, z: 4, w: 4.0, h: 2.0, d: 3.4, kind: 'wood_crate' },
    { id: 'fb_b_kitchen', x: 16, y: 0, z: 17, w: 10, h: 4.0, d: 7.5, kind: 'ice_brick' },
    { id: 'fb_b_snowman', x: 32, y: 0, z: -18, w: 5.0, h: 6.2, d: 5.0, kind: 'ice_brick' },

    // Natural Stepped Icebergs Framing Horizon (No square enclosure wall)
    { id: 'fb_berg_nw', x: -35, y: 0, z: -26, w: 9.0, h: 8.5, d: 7.0, kind: 'ice_brick' },
    { id: 'fb_berg_n', x: -4, y: 0, z: -30, w: 14, h: 5.2, d: 5.5, kind: 'deepslate' },
    { id: 'fb_berg_s', x: 6, y: 0, z: 30, w: 14, h: 5.2, d: 5.5, kind: 'deepslate' },
    { id: 'fb_berg_sw', x: -24, y: 0, z: 24, w: 8.0, h: 6.5, d: 8.0, kind: 'ice_brick' },
    { id: 'fb_berg_se', x: 34, y: 0, z: 22, w: 7.5, h: 7.5, d: 7.5, kind: 'ice_brick' },
    { id: 'fb_crate_mid_n', x: -11, y: 0, z: -12, w: 2.2, h: 1.5, d: 2.2, kind: 'wood_crate' },
    { id: 'fb_crate_mid_s', x: 11, y: 0, z: 9.5, w: 2.2, h: 1.5, d: 2.2, kind: 'wood_crate' },
    { id: 'fb_crate_b1', x: 18, y: 0, z: 5.5, w: 2.2, h: 1.4, d: 2.2, kind: 'stone' },
  ];

  addRamp(blocks, 'fb_r_shw1', -16.5, -2, -1, 0, 4, 3.6, 4.2, 1.5, 'stone');
  addRamp(blocks, 'fb_r_shw2', -24, 1.5, 0, -1, 3, 3.6, 4.0, 1.5, 'stone');
  addRamp(blocks, 'fb_r_kit', 9.5, 17, 1, 0, 4, 4.0, 3.6, 1.6, 'ice_brick');
  addRamp(blocks, 'fb_r_raft', -28, 16.5, 0, -1, 4, 5.8, 3.2, 1.8, 'deepslate');
  addRamp(blocks, 'fb_r_n', -12.5, -30, 1, 0, 4, 5.2, 3.4, 1.6, 'ice_brick');
  return blocks;
}

/**
 * 7. Ancient Temple (Haven-inspired 3-Site Sand Ziggurat Courtyard: A, B, C Sites + Window)
 */
function buildAncientTempleBlocks(): ArenaBlock[] {
  const blocks: ArenaBlock[] = [
    // Central Terraced Sun Ziggurat Wings flanking clear (0,0) Plaza
    { id: 'at_zig_w1', x: -11.5, y: 0, z: 0, w: 4.5, h: 2.0, d: 13, kind: 'sandstone' },
    { id: 'at_zig_w2', x: -13.5, y: 2.0, z: 0, w: 2.8, h: 2.2, d: 8.0, kind: 'gold' },
    { id: 'at_zig_e1', x: 11.5, y: 0, z: 0, w: 4.5, h: 2.0, d: 13, kind: 'sandstone' },
    { id: 'at_zig_e2', x: 13.5, y: 2.0, z: 0, w: 2.8, h: 2.2, d: 8.0, kind: 'gold' },

    // A-Site (West) — L-Shaped Sandstone Cloister + Heaven Tower
    { id: 'at_a_short', x: -24, y: 0, z: 10, w: 9.0, h: 3.4, d: 3.5, kind: 'sandstone' },
    { id: 'at_a_box', x: -26, y: 0, z: -5, w: 3.2, h: 2.8, d: 3.2, kind: 'wood_crate' },
    { id: 'at_a_heav', x: -33, y: 0, z: -8, w: 6.5, h: 4.2, d: 12, kind: 'sandstone' },

    // B-Site (East) — Sunken Gong Pillars + Mid Window Frame
    { id: 'at_b_col_n', x: 24, y: 0, z: -9, w: 3.4, h: 5.5, d: 3.4, kind: 'sandstone' },
    { id: 'at_b_col_s', x: 24, y: 0, z: 9, w: 3.4, h: 5.5, d: 3.4, kind: 'sandstone' },
    { id: 'at_b_beam', x: 24, y: 5.5, z: 0, w: 3.8, h: 1.1, d: 21, kind: 'gold' },
    { id: 'at_b_alcove', x: 33, y: 0, z: 2, w: 5.5, h: 3.2, d: 14, kind: 'sandstone' },

    // C-Site (North Sanctuary) + South Entrance Gate
    { id: 'at_c_altar', x: 0, y: 0, z: -23, w: 12, h: 2.6, d: 5.5, kind: 'sandstone' },
    { id: 'at_c_step_top', x: 0, y: 2.6, z: -24, w: 6.5, h: 1.6, d: 3.2, kind: 'gold' },
    { id: 'at_c_wall_w', x: -13, y: 0, z: -22, w: 6.0, h: 4.5, d: 3.2, kind: 'sandstone' },
    { id: 'at_c_wall_e', x: 13, y: 0, z: -22, w: 6.0, h: 4.5, d: 3.2, kind: 'sandstone' },
    { id: 'at_s_gate_w', x: -8, y: 0, z: 22, w: 7.5, h: 4.2, d: 3.5, kind: 'sandstone' },
    { id: 'at_s_gate_e', x: 8, y: 0, z: 22, w: 7.5, h: 4.2, d: 3.5, kind: 'sandstone' },
    { id: 'at_s_lintel', x: 0, y: 4.2, z: 22, w: 22, h: 1.2, d: 3.8, kind: 'gold' },

    // Corner Sphinx Obelisks
    { id: 'at_ob_nw', x: -34, y: 0, z: -28, w: 4.5, h: 10.5, d: 4.5, kind: 'obsidian' },
    { id: 'at_ob_ne', x: 34, y: 0, z: -28, w: 4.5, h: 10.5, d: 4.5, kind: 'obsidian' },
    { id: 'at_ob_sw', x: -34, y: 0, z: 28, w: 4.5, h: 10.5, d: 4.5, kind: 'obsidian' },
    { id: 'at_ob_se', x: 34, y: 0, z: 28, w: 4.5, h: 10.5, d: 4.5, kind: 'obsidian' },
    { id: 'at_mid_pl_nw', x: -5.5, y: 0, z: -6.5, w: 2.4, h: 1.5, d: 2.4, kind: 'wood_crate' },
    { id: 'at_mid_pl_se', x: 5.5, y: 0, z: 6.5, w: 2.4, h: 1.5, d: 2.4, kind: 'wood_crate' },
    { id: 'at_a_cov', x: -20, y: 0, z: -12, w: 2.8, h: 1.6, d: 2.8, kind: 'sandstone' },
    { id: 'at_b_cov', x: 18, y: 0, z: 12, w: 2.8, h: 1.6, d: 2.8, kind: 'sandstone' },
  ];

  addRamp(blocks, 'at_r_zw', -7.8, 0, -1, 0, 2, 2.0, 4.5, 1.5, 'sandstone');
  addRamp(blocks, 'at_r_ze', 7.8, 0, 1, 0, 2, 2.0, 4.5, 1.5, 'sandstone');
  addRamp(blocks, 'at_r_aheav', -33, -15.5, 0, 1, 4, 4.2, 3.6, 1.6, 'sandstone');
  addRamp(blocks, 'at_r_calt', -7.2, -23, 1, 0, 3, 2.6, 3.6, 1.5, 'sandstone');
  addRamp(blocks, 'at_r_balc', 33, -6.5, 0, 1, 3, 3.2, 3.2, 1.5, 'sandstone');
  return blocks;
}

/**
 * 8. Orbital Reactor (Floating Concentric Space Station Ring Sectors + Radial Beams)
 */
function buildOrbitalReactorBlocks(): ArenaBlock[] {
  const blocks: ArenaBlock[] = [
    // 8 Segmented Circular Outer Tokamak Ring Decks (radius ~21m)
    ...Array.from({ length: 8 }, (_, i) => {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
      const r = 22;
      const isEW = Math.abs(Math.cos(a)) > Math.abs(Math.sin(a));
      return {
        id: `or_ring_${i}`,
        x: Math.round(Math.cos(a) * r),
        y: 0,
        z: Math.round(Math.sin(a) * r),
        w: isEW ? 6.0 : 10.5,
        h: 2.6,
        d: isEW ? 10.5 : 6.0,
        kind: (i % 2 === 0 ? 'reactor_core' : 'cyber_panel') as ArenaBlock['kind'],
      };
    }),

    // Upper Concentric Sniper Ring Segments at y=5.4
    ...Array.from({ length: 4 }, (_, i) => {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const r = 22;
      return {
        id: `or_upper_${i}`,
        x: Math.round(Math.cos(a) * r),
        y: 5.4,
        z: Math.round(Math.sin(a) * r),
        w: 8.5,
        h: 0.9,
        d: 8.5,
        kind: 'gold' as ArenaBlock['kind'],
      };
    }),

    // 4 Cardinal Plasma Spokes leading toward center (keeping (0,0) clear)
    { id: 'or_spk_n', x: 0, y: 0, z: -13, w: 3.4, h: 1.4, d: 8.5, kind: 'cyber_panel' },
    { id: 'or_spk_s', x: 0, y: 0, z: 13, w: 3.4, h: 1.4, d: 8.5, kind: 'cyber_panel' },
    { id: 'or_spk_w', x: -13, y: 0, z: 0, w: 8.5, h: 1.4, d: 3.4, kind: 'cyber_panel' },
    { id: 'or_spk_e', x: 13, y: 0, z: 0, w: 8.5, h: 1.4, d: 3.4, kind: 'cyber_panel' },

    // Overhead Zero-G Cross Bridges
    { id: 'or_sky_ns', x: 0, y: 6.4, z: 0, w: 3.2, h: 0.85, d: 30, kind: 'cyber_panel' },
    { id: 'or_sky_ew', x: 0, y: 6.4, z: 0, w: 30, h: 0.85, d: 3.2, kind: 'cyber_panel' },

    // Outer Floating Solar Capacitor Pylons
    { id: 'or_cap_n', x: 0, y: 0, z: -34, w: 9.0, h: 6.5, d: 4.5, kind: 'reactor_core' },
    { id: 'or_cap_s', x: 0, y: 0, z: 34, w: 9.0, h: 6.5, d: 4.5, kind: 'reactor_core' },
    { id: 'or_cap_w', x: -34, y: 0, z: 0, w: 4.5, h: 6.5, d: 9.0, kind: 'reactor_core' },
    { id: 'or_cap_e', x: 34, y: 0, z: 0, w: 4.5, h: 6.5, d: 9.0, kind: 'reactor_core' },
    { id: 'or_sh_nw', x: -5.5, y: 0, z: -5.5, w: 2.4, h: 1.4, d: 2.4, kind: 'asphalt' },
    { id: 'or_sh_ne', x: 5.5, y: 0, z: -5.5, w: 2.4, h: 1.4, d: 2.4, kind: 'asphalt' },
    { id: 'or_sh_sw', x: -5.5, y: 0, z: 5.5, w: 2.4, h: 1.4, d: 2.4, kind: 'asphalt' },
    { id: 'or_sh_se', x: 5.5, y: 0, z: 5.5, w: 2.4, h: 1.4, d: 2.4, kind: 'asphalt' },
  ];

  addRamp(blocks, 'or_r_n', 0, -7.2, 0, -1, 2, 1.4, 3.2, 1.5, 'asphalt');
  addRamp(blocks, 'or_r_s', 0, 7.2, 0, 1, 2, 1.4, 3.2, 1.5, 'asphalt');
  addRamp(blocks, 'or_r_w', -7.2, 0, -1, 0, 2, 1.4, 3.2, 1.5, 'asphalt');
  addRamp(blocks, 'or_r_e', 7.2, 0, 1, 0, 2, 1.4, 3.2, 1.5, 'asphalt');
  addRamp(blocks, 'or_r_nw', -19.5, -9, 0, 1, 3, 2.6, 3.2, 1.6, 'cyber_panel');
  addRamp(blocks, 'or_r_se', 19.5, 9, 0, -1, 3, 2.6, 3.2, 1.6, 'cyber_panel');
  return blocks;
}

/**
 * 9. Volcanic Caldera (3-Tier Radial Crater Amphitheater Climbing Outward)
 */
function buildVolcanicCalderaBlocks(): ArenaBlock[] {
  const blocks: ArenaBlock[] = [
    // Inner Crater Floor Boulders (leaving center + lava vents open)
    { id: 'vc_b_n', x: 0, y: 0, z: -8.5, w: 4.2, h: 1.5, d: 2.2, kind: 'basalt' },
    { id: 'vc_b_s', x: 0, y: 0, z: 8.5, w: 4.2, h: 1.5, d: 2.2, kind: 'basalt' },
    { id: 'vc_b_w', x: -8.5, y: 0, z: 0, w: 2.2, h: 1.5, d: 4.2, kind: 'basalt' },
    { id: 'vc_b_e', x: 8.5, y: 0, z: 0, w: 2.2, h: 1.5, d: 4.2, kind: 'basalt' },

    // Tier 2 Middle Caldera Ring Terraces (r ≈ 19m, y=1.8m)
    ...Array.from({ length: 8 }, (_, i) => {
      const a = (i / 8) * Math.PI * 2;
      const r = 19.5;
      const isEW = Math.abs(Math.cos(a)) > Math.abs(Math.sin(a));
      return {
        id: `vc_t2_${i}`,
        x: Math.round(Math.cos(a) * r),
        y: 0,
        z: Math.round(Math.sin(a) * r),
        w: isEW ? 5.2 : 9.0,
        h: 1.8,
        d: isEW ? 9.0 : 5.2,
        kind: (i % 2 === 0 ? 'basalt' : 'crimson_brick') as ArenaBlock['kind'],
      };
    }),

    // Tier 3 Outer Crater Ridge Arcs (r ≈ 31m, y=3.6m)
    ...Array.from({ length: 8 }, (_, i) => {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
      const r = 31.5;
      const isEW = Math.abs(Math.cos(a)) > Math.abs(Math.sin(a));
      return {
        id: `vc_t3_${i}`,
        x: Math.round(Math.cos(a) * r),
        y: 0,
        z: Math.round(Math.sin(a) * r),
        w: isEW ? 5.8 : 11,
        h: 3.6,
        d: isEW ? 11 : 5.8,
        kind: (i % 2 === 0 ? 'obsidian' : 'basalt') as ArenaBlock['kind'],
      };
    }),

    // 4 Jagged Volcanic Rim Spires
    { id: 'vc_sp_nw', x: -29, y: 0, z: -29, w: 5.5, h: 9.5, d: 5.5, kind: 'obsidian' },
    { id: 'vc_sp_ne', x: 29, y: 0, z: -29, w: 5.5, h: 9.5, d: 5.5, kind: 'obsidian' },
    { id: 'vc_sp_sw', x: -29, y: 0, z: 29, w: 5.5, h: 9.5, d: 5.5, kind: 'obsidian' },
    { id: 'vc_sp_se', x: 29, y: 0, z: 29, w: 5.5, h: 9.5, d: 5.5, kind: 'obsidian' },
  ];

  addRamp(blocks, 'vc_r_n', 0, -14, 0, -1, 2, 1.8, 3.6, 1.5, 'basalt');
  addRamp(blocks, 'vc_r_s', 0, 14, 0, 1, 2, 1.8, 3.6, 1.5, 'basalt');
  addRamp(blocks, 'vc_r_w', -14, 0, -1, 0, 2, 1.8, 3.6, 1.5, 'basalt');
  addRamp(blocks, 'vc_r_e', 14, 0, 1, 0, 2, 1.8, 3.6, 1.5, 'basalt');
  addRamp(blocks, 'vc_r_out_nw', -23, -10, -1, 0, 3, 3.6, 3.4, 1.6, 'crimson_brick');
  addRamp(blocks, 'vc_r_out_se', 23, 10, 1, 0, 3, 3.6, 3.4, 1.6, 'crimson_brick');
  return blocks;
}

/**
 * 10. Bamboo Sanctuary (Lotus-inspired Wooden Stilt Pavilions, Stepping Stones & Garden Screens)
 */
function buildBambooSanctuaryBlocks(): ArenaBlock[] {
  const blocks: ArenaBlock[] = [
    // Asymmetric Tea-House Pavilions (raised timber decks + floating shingled roofs)
    { id: 'bs_tea_w_deck', x: -20, y: 0, z: -12, w: 12, h: 2.2, d: 11, kind: 'wood_crate' },
    { id: 'bs_tea_w_p1', x: -24.5, y: 2.2, z: -16, w: 1.4, h: 3.4, d: 1.4, kind: 'deepslate' },
    { id: 'bs_tea_w_p2', x: -15.5, y: 2.2, z: -16, w: 1.4, h: 3.4, d: 1.4, kind: 'deepslate' },
    { id: 'bs_tea_w_roof', x: -20, y: 5.6, z: -12, w: 13.5, h: 0.9, d: 12.5, kind: 'gold' },

    { id: 'bs_tea_e_deck', x: 20, y: 0, z: 12, w: 12, h: 2.2, d: 11, kind: 'wood_crate' },
    { id: 'bs_tea_e_p1', x: 24.5, y: 2.2, z: 16, w: 1.4, h: 3.4, d: 1.4, kind: 'deepslate' },
    { id: 'bs_tea_e_p2', x: 15.5, y: 2.2, z: 16, w: 1.4, h: 3.4, d: 1.4, kind: 'deepslate' },
    { id: 'bs_tea_e_roof', x: 20, y: 5.6, z: 12, w: 13.5, h: 0.9, d: 12.5, kind: 'gold' },

    // Lotus Pond Stepping Stones & Curved Shoji Garden Screens (no boxy perimeter wall)
    { id: 'bs_step_1', x: -6.5, y: 0, z: -6.5, w: 3.0, h: 0.85, d: 3.0, kind: 'stone' },
    { id: 'bs_step_2', x: 6.5, y: 0, z: 6.5, w: 3.0, h: 0.85, d: 3.0, kind: 'stone' },
    { id: 'bs_step_3', x: -8.5, y: 0, z: 7.0, w: 2.8, h: 1.3, d: 2.8, kind: 'turf' },
    { id: 'bs_step_4', x: 8.5, y: 0, z: -7.0, w: 2.8, h: 1.3, d: 2.8, kind: 'turf' },

    { id: 'bs_scr_n1', x: -7, y: 0, z: -16, w: 6.5, h: 2.8, d: 1.2, kind: 'wood_crate' },
    { id: 'bs_scr_n2', x: 7, y: 0, z: -20, w: 6.5, h: 2.8, d: 1.2, kind: 'wood_crate' },
    { id: 'bs_scr_s1', x: 7, y: 0, z: 16, w: 6.5, h: 2.8, d: 1.2, kind: 'wood_crate' },
    { id: 'bs_scr_s2', x: -7, y: 0, z: 20, w: 6.5, h: 2.8, d: 1.2, kind: 'wood_crate' },

    // North Waterfall Terrace & South Bamboo Bridge Veranda
    { id: 'bs_ver_n', x: 0, y: 0, z: -29, w: 18, h: 3.0, d: 6.0, kind: 'turf' },
    { id: 'bs_ver_s', x: 0, y: 0, z: 29, w: 18, h: 3.0, d: 6.0, kind: 'turf' },
    { id: 'bs_moss_w', x: -31, y: 0, z: 10, w: 6.0, h: 4.5, d: 12, kind: 'turf' },
    { id: 'bs_moss_e', x: 31, y: 0, z: -10, w: 6.0, h: 4.5, d: 12, kind: 'turf' },
    { id: 'bs_lnt_1', x: -16, y: 0, z: 6.5, w: 2.2, h: 1.6, d: 2.2, kind: 'stone' },
    { id: 'bs_lnt_2', x: 16, y: 0, z: -6.5, w: 2.2, h: 1.6, d: 2.2, kind: 'stone' },
    { id: 'bs_lnt_3', x: -28, y: 0, z: -24, w: 4.0, h: 6.2, d: 4.0, kind: 'wood_crate' },
    { id: 'bs_lnt_4', x: 28, y: 0, z: 24, w: 4.0, h: 6.2, d: 4.0, kind: 'wood_crate' },
  ];

  addRamp(blocks, 'bs_r_tw', -12.5, -12, -1, 0, 3, 2.2, 3.6, 1.5, 'stone');
  addRamp(blocks, 'bs_r_te', 12.5, 12, 1, 0, 3, 2.2, 3.6, 1.5, 'stone');
  addRamp(blocks, 'bs_r_vn', -10.5, -29, 1, 0, 3, 3.0, 3.4, 1.5, 'wood_crate');
  addRamp(blocks, 'bs_r_vs', 10.5, 29, -1, 0, 3, 3.0, 3.4, 1.5, 'wood_crate');
  addRamp(blocks, 'bs_r_mw', -31, 2.5, 0, 1, 3, 4.5, 3.2, 1.6, 'stone');
  return blocks;
}

/**
 * 11. Neon Downtown (Split-inspired Urban City Block Canyons + Skytrain Overpass)
 */
function buildNeonDowntownBlocks(): ArenaBlock[] {
  const blocks: ArenaBlock[] = [
    // City High-Rise Corner Towers forming Cross Streets & Tight Neon Alleys
    { id: 'nd_tw_nw', x: -24, y: 0, z: -22, w: 13, h: 9.5, d: 12, kind: 'asphalt' },
    { id: 'nd_tw_ne', x: 24, y: 0, z: -22, w: 13, h: 11.0, d: 12, kind: 'cyber_panel' },
    { id: 'nd_tw_sw', x: -24, y: 0, z: 22, w: 13, h: 11.0, d: 12, kind: 'cyber_panel' },
    { id: 'nd_tw_se', x: 24, y: 0, z: 22, w: 13, h: 9.5, d: 12, kind: 'asphalt' },

    // Elevated Skytrain Viaduct Bridge running across West->East at z=12 (y=5.6)
    { id: 'nd_train_deck', x: 0, y: 5.6, z: 12, w: 48, h: 1.0, d: 4.5, kind: 'reactor_core' },
    { id: 'nd_train_pil1', x: -12, y: 0, z: 12, w: 2.2, h: 5.6, d: 2.2, kind: 'asphalt' },
    { id: 'nd_train_pil2', x: 12, y: 0, z: 12, w: 2.2, h: 5.6, d: 2.2, kind: 'asphalt' },

    // Mid Mail / Vents Split-Level Concrete Planters & Street Kiosks
    { id: 'nd_mid_box_n', x: -5.5, y: 0, z: -6.0, w: 3.4, h: 2.2, d: 2.6, kind: 'container_blue' },
    { id: 'nd_mid_box_s', x: 5.5, y: 0, z: 5.0, w: 3.4, h: 2.2, d: 2.6, kind: 'container_blue' },
    { id: 'nd_kiosk_w', x: -14, y: 0, z: 0, w: 4.5, h: 3.0, d: 7.0, kind: 'cyber_panel' },
    { id: 'nd_kiosk_e', x: 14, y: 0, z: 0, w: 4.5, h: 3.0, d: 7.0, kind: 'cyber_panel' },

    // Street-Side Parked Delivery Trucks & Concrete Barricades
    { id: 'nd_van_n', x: 0, y: 0, z: -18, w: 8.5, h: 2.7, d: 3.4, kind: 'container_teal' },
    { id: 'nd_van_s', x: 0, y: 0, z: 24, w: 8.5, h: 2.7, d: 3.4, kind: 'container_amber' },
    { id: 'nd_bill_w', x: -34, y: 0, z: 0, w: 3.2, h: 5.5, d: 16, kind: 'asphalt' },
    { id: 'nd_bill_e', x: 34, y: 0, z: 0, w: 3.2, h: 5.5, d: 16, kind: 'asphalt' },
    { id: 'nd_awning_n', x: 0, y: 3.8, z: -28, w: 22, h: 0.9, d: 4.5, kind: 'cyber_panel' },
    { id: 'nd_awning_s', x: 0, y: 3.8, z: 30, w: 22, h: 0.9, d: 4.5, kind: 'cyber_panel' },
    { id: 'nd_bol_nw', x: -8.5, y: 0, z: -11, w: 2.0, h: 1.45, d: 2.0, kind: 'stone' },
    { id: 'nd_bol_ne', x: 8.5, y: 0, z: -11, w: 2.0, h: 1.45, d: 2.0, kind: 'stone' },
    { id: 'nd_bol_sw', x: -8.5, y: 0, z: 6.0, w: 2.0, h: 1.45, d: 2.0, kind: 'stone' },
    { id: 'nd_bol_se', x: 8.5, y: 0, z: 18, w: 2.0, h: 1.45, d: 2.0, kind: 'stone' },
    { id: 'nd_dump_w', x: -24, y: 0, z: 0, w: 3.4, h: 2.0, d: 4.5, kind: 'container_teal' },
    { id: 'nd_dump_e', x: 24, y: 0, z: 0, w: 3.4, h: 2.0, d: 4.5, kind: 'container_amber' },
  ];

  addRamp(blocks, 'nd_r_kw', -14, -5.5, 0, 1, 3, 3.0, 3.4, 1.5, 'asphalt');
  addRamp(blocks, 'nd_r_ke', 14, 5.5, 0, -1, 3, 3.0, 3.4, 1.5, 'asphalt');
  addRamp(blocks, 'nd_r_trw', -22, 12, 1, 0, 4, 5.6, 3.2, 2.0, 'reactor_core');
  addRamp(blocks, 'nd_r_tre', 22, 12, -1, 0, 4, 5.6, 3.2, 2.0, 'reactor_core');
  addRamp(blocks, 'nd_r_van', -6.2, -18, 1, 0, 2, 2.7, 3.0, 1.6, 'stone');
  return blocks;
}

/**
 * 12. Sunken Atlantis (Breeze-inspired Wide Open Marble Coliseum + Twin Hollow Pyramids)
 */
function buildSunkenAtlantisBlocks(): ArenaBlock[] {
  const blocks: ArenaBlock[] = [
    // Twin Breeze-style Stepped Marble Site Pyramids at Mid-West & Mid-East
    { id: 'sa_pyr_w1', x: -16, y: 0, z: -3, w: 7.5, h: 1.8, d: 7.5, kind: 'ice_brick' },
    { id: 'sa_pyr_w2', x: -16, y: 1.8, z: -3, w: 4.4, h: 2.0, d: 4.4, kind: 'gold' },
    { id: 'sa_pyr_e1', x: 16, y: 0, z: 3, w: 7.5, h: 1.8, d: 7.5, kind: 'ice_brick' },
    { id: 'sa_pyr_e2', x: 16, y: 1.8, z: 3, w: 4.4, h: 2.0, d: 4.4, kind: 'gold' },

    // Wide Open Coastal Marble Amphitheater Arcs on North & South
    { id: 'sa_arc_n1', x: -12, y: 0, z: -26, w: 9.0, h: 2.6, d: 5.0, kind: 'stone' },
    { id: 'sa_arc_n2', x: 12, y: 0, z: -26, w: 9.0, h: 2.6, d: 5.0, kind: 'stone' },
    { id: 'sa_arc_n_hi', x: 0, y: 0, z: -31, w: 14, h: 3.8, d: 4.5, kind: 'sandstone' },
    { id: 'sa_arc_s1', x: -12, y: 0, z: 26, w: 9.0, h: 2.6, d: 5.0, kind: 'stone' },
    { id: 'sa_arc_s2', x: 12, y: 0, z: 26, w: 9.0, h: 2.6, d: 5.0, kind: 'stone' },
    { id: 'sa_arc_s_hi', x: 0, y: 0, z: 31, w: 14, h: 3.8, d: 4.5, kind: 'sandstone' },

    // Sweeping Colonnade Pillars framing wide long-range duel lanes
    { id: 'sa_col_nw', x: -28, y: 0, z: -14, w: 3.0, h: 7.2, d: 3.0, kind: 'ice_brick' },
    { id: 'sa_col_sw', x: -28, y: 0, z: 14, w: 3.0, h: 7.2, d: 3.0, kind: 'ice_brick' },
    { id: 'sa_col_ne', x: 28, y: 0, z: -14, w: 3.0, h: 7.2, d: 3.0, kind: 'ice_brick' },
    { id: 'sa_col_se', x: 28, y: 0, z: 14, w: 3.0, h: 7.2, d: 3.0, kind: 'ice_brick' },
    { id: 'sa_lint_w', x: -28, y: 7.2, z: 0, w: 3.6, h: 1.0, d: 32, kind: 'gold' },
    { id: 'sa_lint_e', x: 28, y: 7.2, z: 0, w: 3.6, h: 1.0, d: 32, kind: 'gold' },

    // Mid Breeze Pillar Duo & Coral Low Walls (keeps (0,0) and water pools at (±24,0) open!)
    { id: 'sa_mid_n', x: 0, y: 0, z: -11, w: 3.6, h: 4.8, d: 3.6, kind: 'sandstone' },
    { id: 'sa_mid_s', x: 0, y: 0, z: 11, w: 3.6, h: 4.8, d: 3.6, kind: 'sandstone' },
    { id: 'sa_reef_nw', x: -9, y: 0, z: -14, w: 3.2, h: 1.4, d: 2.0, kind: 'ice_brick' },
    { id: 'sa_reef_se', x: 9, y: 0, z: 14, w: 3.2, h: 1.4, d: 2.0, kind: 'ice_brick' },
    { id: 'sa_plinth_nw', x: -7.0, y: 0, z: 6.0, w: 2.4, h: 1.5, d: 2.4, kind: 'sandstone' },
    { id: 'sa_plinth_se', x: 7.0, y: 0, z: -6.0, w: 2.4, h: 1.5, d: 2.4, kind: 'sandstone' },
    { id: 'sa_ur_nw', x: -34, y: 0, z: -24, w: 4.5, h: 8.5, d: 4.5, kind: 'ice_brick' },
    { id: 'sa_ur_se', x: 34, y: 0, z: 24, w: 4.5, h: 8.5, d: 4.5, kind: 'ice_brick' },
  ];

  addRamp(blocks, 'sa_r_pw', -10.5, -3, -1, 0, 2, 1.8, 4.0, 1.5, 'stone');
  addRamp(blocks, 'sa_r_pe', 10.5, 3, 1, 0, 2, 1.8, 4.0, 1.5, 'stone');
  addRamp(blocks, 'sa_r_an1', -18.5, -26, 1, 0, 3, 2.6, 3.6, 1.5, 'sandstone');
  addRamp(blocks, 'sa_r_as2', 18.5, 26, -1, 0, 3, 2.6, 3.6, 1.5, 'sandstone');
  addRamp(blocks, 'sa_r_nhi', -8.8, -31, 1, 0, 3, 3.8, 3.2, 1.5, 'ice_brick');
  addRamp(blocks, 'sa_r_shi', 8.8, 31, -1, 0, 3, 3.8, 3.2, 1.5, 'ice_brick');
  return blocks;
}

/**
 * 13. Clockwork Tower (4 Interlocking Giant Brass Gear Islands + Clock-Hand Catwalks)
 */
function buildClockworkTowerBlocks(): ArenaBlock[] {
  const blocks: ArenaBlock[] = [
    // 4 Giant Stepped Brass Gear Platforms at Quadrant Centers
    { id: 'ct_g_nw', x: -17, y: 0, z: -17, w: 12, h: 2.4, d: 12, kind: 'deepslate' },
    { id: 'ct_g_nw_hub', x: -17, y: 2.4, z: -17, w: 5.5, h: 1.6, d: 5.5, kind: 'gold' },
    { id: 'ct_g_ne', x: 17, y: 0, z: -17, w: 12, h: 2.4, d: 12, kind: 'deepslate' },
    { id: 'ct_g_ne_hub', x: 17, y: 2.4, z: -17, w: 5.5, h: 1.6, d: 5.5, kind: 'gold' },
    { id: 'ct_g_sw', x: -17, y: 0, z: 17, w: 12, h: 2.4, d: 12, kind: 'deepslate' },
    { id: 'ct_g_sw_hub', x: -17, y: 2.4, z: 17, w: 5.5, h: 1.6, d: 5.5, kind: 'gold' },
    { id: 'ct_g_se', x: 17, y: 0, z: 17, w: 12, h: 2.4, d: 12, kind: 'deepslate' },
    { id: 'ct_g_se_hub', x: 17, y: 2.4, z: 17, w: 5.5, h: 1.6, d: 5.5, kind: 'gold' },

    // Axle Connecting Walkways between Gears (y=2.4)
    { id: 'ct_ax_n', x: 0, y: 2.4, z: -17, w: 22, h: 0.75, d: 3.4, kind: 'wood_crate' },
    { id: 'ct_ax_s', x: 0, y: 2.4, z: 17, w: 22, h: 0.75, d: 3.4, kind: 'wood_crate' },
    { id: 'ct_ax_w', x: -17, y: 2.4, z: 0, w: 3.4, h: 0.75, d: 22, kind: 'wood_crate' },
    { id: 'ct_ax_e', x: 17, y: 2.4, z: 0, w: 3.4, h: 0.75, d: 22, kind: 'wood_crate' },

    // High Clock-Hand Cross Catwalk overhead at y=5.8
    { id: 'ct_hand_ns', x: 0, y: 5.8, z: 0, w: 3.2, h: 0.85, d: 34, kind: 'gold' },
    { id: 'ct_hand_ew', x: 0, y: 5.8, z: 0, w: 34, h: 0.85, d: 3.2, kind: 'gold' },

    // Pendulum Anchor Bastions on Perimeter Edges
    { id: 'ct_bell_nw', x: -29, y: 0, z: -29, w: 5.2, h: 9.5, d: 5.2, kind: 'gold' },
    { id: 'ct_bell_se', x: 29, y: 0, z: 29, w: 5.2, h: 9.5, d: 5.2, kind: 'gold' },
    { id: 'ct_pend_w', x: -31, y: 0, z: 0, w: 4.0, h: 4.5, d: 10, kind: 'stone' },
    { id: 'ct_pend_e', x: 31, y: 0, z: 0, w: 4.0, h: 4.5, d: 10, kind: 'stone' },
    { id: 'ct_cog_1', x: -6.5, y: 0, z: -6.5, w: 2.4, h: 1.5, d: 2.4, kind: 'wood_crate' },
    { id: 'ct_cog_2', x: 6.5, y: 0, z: 6.5, w: 2.4, h: 1.5, d: 2.4, kind: 'wood_crate' },
    { id: 'ct_cog_3', x: -6.5, y: 0, z: 6.5, w: 2.4, h: 1.5, d: 2.4, kind: 'wood_crate' },
    { id: 'ct_cog_4', x: 6.5, y: 0, z: -6.5, w: 2.4, h: 1.5, d: 2.4, kind: 'wood_crate' },
    { id: 'ct_bell_ne', x: 29, y: 0, z: -29, w: 5.2, h: 9.5, d: 5.2, kind: 'gold' },
    { id: 'ct_bell_sw', x: -29, y: 0, z: 29, w: 5.2, h: 9.5, d: 5.2, kind: 'gold' },
  ];

  addRamp(blocks, 'ct_r_nw', -9.2, -17, -1, 0, 3, 2.4, 3.6, 1.5, 'stone');
  addRamp(blocks, 'ct_r_ne', 9.2, -17, 1, 0, 3, 2.4, 3.6, 1.5, 'stone');
  addRamp(blocks, 'ct_r_sw', -9.2, 17, -1, 0, 3, 2.4, 3.6, 1.5, 'stone');
  addRamp(blocks, 'ct_r_se', 9.2, 17, 1, 0, 3, 2.4, 3.6, 1.5, 'stone');
  addRamp(blocks, 'ct_r_hi_n', 0, -10.5, 0, -1, 3, 3.4, 3.0, 1.8, 'wood_crate', 2.4);
  return blocks;
}

/**
 * 14. Desert Mirage (Bazaar Market + Palace Balcony + Mid Window + Triple Box)
 */
function buildDesertMirageBlocks(): ArenaBlock[] {
  const blocks: ArenaBlock[] = [
    // Palace Upper Overlook (North-West A-Site) + Triple-Stack Boxes
    { id: 'dm_palace', x: -24, y: 0, z: -20, w: 14, h: 4.2, d: 6.5, kind: 'sandstone' },
    { id: 'dm_pal_bridge', x: -13, y: 3.8, z: -20, w: 9.0, h: 0.9, d: 4.2, kind: 'gold' },
    { id: 'dm_triple_1', x: -22, y: 0, z: -6, w: 2.6, h: 3.0, d: 2.6, kind: 'wood_crate' },
    { id: 'dm_triple_2', x: -24.8, y: 0, z: -6, w: 2.4, h: 1.55, d: 2.4, kind: 'wood_crate' },
    { id: 'dm_a_ramp', x: -34, y: 0, z: 2, w: 5.5, h: 3.4, d: 14, kind: 'sandstone' },

    // Mirage-style Mid Window Split Wall & Connector Doorway
    { id: 'dm_win_w', x: -7.5, y: 0, z: -12, w: 7.5, h: 4.5, d: 3.2, kind: 'sandstone' },
    { id: 'dm_win_e', x: 7.5, y: 0, z: -12, w: 7.5, h: 4.5, d: 3.2, kind: 'sandstone' },
    { id: 'dm_win_sill', x: 0, y: 0, z: -12, w: 8.5, h: 1.8, d: 3.2, kind: 'wood_crate' },
    { id: 'dm_win_top', x: 0, y: 4.5, z: -12, w: 22, h: 1.2, d: 3.4, kind: 'gold' },
    { id: 'dm_mid_box', x: -4.2, y: 0, z: 3.5, w: 2.4, h: 1.6, d: 2.4, kind: 'wood_crate' },
    { id: 'dm_cat_wall', x: 8.5, y: 0, z: 4.5, w: 2.8, h: 3.2, d: 9.0, kind: 'sandstone' },

    // East B-Site Market Stalls + Apartments Balcony + Van Jump-Up
    { id: 'dm_apts', x: 26, y: 0, z: 18, w: 14, h: 4.2, d: 6.5, kind: 'sandstone' },
    { id: 'dm_b_van', x: 18, y: 0, z: 6, w: 5.2, h: 2.2, d: 3.0, kind: 'asphalt' },
    { id: 'dm_b_bench', x: 25, y: 0, z: -5, w: 8.0, h: 2.4, d: 3.5, kind: 'wood_crate' },
    { id: 'dm_mkt_1', x: 16, y: 0, z: -16, w: 4.2, h: 2.8, d: 3.2, kind: 'wood_crate' },
    { id: 'dm_mkt_2', x: 28, y: 0, z: -16, w: 4.2, h: 2.8, d: 3.2, kind: 'wood_crate' },
    { id: 'dm_arch_s', x: -10, y: 0, z: 18, w: 12, h: 3.6, d: 3.8, kind: 'sandstone' },
    { id: 'dm_tower_se', x: 35, y: 0, z: -24, w: 5.0, h: 9.0, d: 5.0, kind: 'sandstone' },
    { id: 'dm_tower_sw', x: -35, y: 0, z: 24, w: 5.0, h: 9.0, d: 5.0, kind: 'sandstone' },
    { id: 'dm_crate_mid1', x: 5.0, y: 0, z: -4.0, w: 2.4, h: 1.5, d: 2.4, kind: 'wood_crate' },
    { id: 'dm_crate_mid2', x: -11, y: 0, z: 10, w: 2.6, h: 1.8, d: 2.6, kind: 'wood_crate' },
    { id: 'dm_crate_b1', x: 24, y: 0, z: 5.0, w: 2.6, h: 2.4, d: 2.6, kind: 'wood_crate' },
    { id: 'dm_crate_a1', x: -16, y: 0, z: -3.5, w: 2.5, h: 1.55, d: 2.5, kind: 'sandstone' },
    { id: 'dm_dome_nw', x: -35, y: 0, z: -26, w: 5.2, h: 8.5, d: 5.2, kind: 'gold' },
    { id: 'dm_dome_se', x: 35, y: 0, z: 26, w: 5.2, h: 8.5, d: 5.2, kind: 'gold' },
  ];

  addRamp(blocks, 'dm_r_pal', -32.8, -20, 1, 0, 4, 4.2, 3.8, 1.5, 'sandstone');
  addRamp(blocks, 'dm_r_win', 0, -16.8, 0, 1, 2, 1.8, 3.8, 1.5, 'wood_crate');
  addRamp(blocks, 'dm_r_apts', 17.2, 18, 1, 0, 4, 4.2, 3.8, 1.5, 'sandstone');
  addRamp(blocks, 'dm_r_aramp', -34, 11, 0, -1, 3, 3.4, 3.4, 1.6, 'wood_crate');
  return blocks;
}

/**
 * 15. Crystal Cavern (Diagonal Fracture Ravine + Natural Amethyst Geode Bridges)
 */
function buildCrystalCavernBlocks(): ArenaBlock[] {
  const blocks: ArenaBlock[] = [
    // Natural Staggered Stalagmite & Obsidian Formations flanking NW-to-SE Ravine
    { id: 'cc_ledge_sw1', x: -20, y: 0, z: 14, w: 12, h: 3.2, d: 10, kind: 'obsidian' },
    { id: 'cc_ledge_sw2', x: -26, y: 3.2, z: 18, w: 7.5, h: 2.2, d: 7.5, kind: 'amethyst' },
    { id: 'cc_ledge_ne1', x: 20, y: 0, z: -14, w: 12, h: 3.2, d: 10, kind: 'obsidian' },
    { id: 'cc_ledge_ne2', x: 26, y: 3.2, z: -18, w: 7.5, h: 2.2, d: 7.5, kind: 'amethyst' },

    // Crystal Arches & Suspended Prism Bridges spanning across diagonal center
    { id: 'cc_arch_1', x: -9, y: 3.8, z: 7, w: 14, h: 0.95, d: 3.6, kind: 'ice_brick' },
    { id: 'cc_arch_2', x: 9, y: 3.8, z: -7, w: 14, h: 0.95, d: 3.6, kind: 'ice_brick' },
    { id: 'cc_pil_nw', x: -16, y: 0, z: -6, w: 3.6, h: 6.5, d: 3.6, kind: 'amethyst' },
    { id: 'cc_pil_se', x: 16, y: 0, z: 6, w: 3.6, h: 6.5, d: 3.6, kind: 'amethyst' },

    // Irregular Geode Cover Clusters scattered naturally (zero boxy borders)
    { id: 'cc_geo_n', x: 0, y: 0, z: -16, w: 7.5, h: 2.4, d: 4.5, kind: 'amethyst' },
    { id: 'cc_geo_s', x: 0, y: 0, z: 16, w: 7.5, h: 2.4, d: 4.5, kind: 'amethyst' },
    { id: 'cc_rock_1', x: -6.5, y: 0, z: -5.5, w: 2.4, h: 1.55, d: 2.4, kind: 'stone' },
    { id: 'cc_rock_2', x: 6.5, y: 0, z: 5.5, w: 2.4, h: 1.55, d: 2.4, kind: 'stone' },
    { id: 'cc_stal_nw', x: -28, y: 0, z: -24, w: 6.0, h: 8.5, d: 6.0, kind: 'obsidian' },
    { id: 'cc_stal_se', x: 28, y: 0, z: 24, w: 6.0, h: 8.5, d: 6.0, kind: 'obsidian' },
    { id: 'cc_stal_w', x: -33, y: 0, z: -3, w: 5.0, h: 5.5, d: 9.0, kind: 'stone' },
    { id: 'cc_stal_e', x: 33, y: 0, z: 3, w: 5.0, h: 5.5, d: 9.0, kind: 'stone' },
    { id: 'cc_rim_n', x: -12, y: 0, z: -28, w: 11, h: 4.2, d: 5.0, kind: 'obsidian' },
    { id: 'cc_rim_s', x: 12, y: 0, z: 28, w: 11, h: 4.2, d: 5.0, kind: 'obsidian' },
    { id: 'cc_rock_3', x: -6.5, y: 0, z: 6.0, w: 2.4, h: 1.55, d: 2.4, kind: 'amethyst' },
    { id: 'cc_rock_4', x: 6.5, y: 0, z: -6.0, w: 2.4, h: 1.55, d: 2.4, kind: 'amethyst' },
    { id: 'cc_shard_ne', x: 28, y: 0, z: -26, w: 4.5, h: 7.5, d: 4.5, kind: 'ice_brick' },
    { id: 'cc_shard_sw', x: -28, y: 0, z: 26, w: 4.5, h: 7.5, d: 4.5, kind: 'ice_brick' },
    { id: 'cc_boulder_w', x: -23, y: 0, z: -12, w: 3.4, h: 2.2, d: 3.4, kind: 'stone' },
    { id: 'cc_boulder_e', x: 23, y: 0, z: 12, w: 3.4, h: 2.2, d: 3.4, kind: 'stone' },
  ];

  addRamp(blocks, 'cc_r_sw', -12.2, 14, -1, 0, 4, 3.2, 3.8, 1.5, 'stone');
  addRamp(blocks, 'cc_r_ne', 12.2, -14, 1, 0, 4, 3.2, 3.8, 1.5, 'stone');
  addRamp(blocks, 'cc_r_gn', -5.5, -16, 1, 0, 2, 2.4, 3.4, 1.5, 'amethyst');
  addRamp(blocks, 'cc_r_gs', 5.5, 16, -1, 0, 2, 2.4, 3.4, 1.5, 'amethyst');
  addRamp(blocks, 'cc_r_high', -20, 11.5, 0, 1, 3, 2.2, 3.0, 1.5, 'ice_brick', 1.6);
  return blocks;
}

/**
 * 16. Cherry Pagoda (Torii Ceremonial Avenue + East/West Pagoda Hills + Engawa Verandas)
 */
function buildCherryPagodaBlocks(): ArenaBlock[] {
  const blocks: ArenaBlock[] = [
    // Ceremonial Torii Gates framing North-South Avenue (center (0,0) crystal clear!)
    { id: 'cp_t_n_l', x: -4.5, y: 0, z: -13, w: 1.8, h: 5.4, d: 1.8, kind: 'crimson_brick' },
    { id: 'cp_t_n_r', x: 4.5, y: 0, z: -13, w: 1.8, h: 5.4, d: 1.8, kind: 'crimson_brick' },
    { id: 'cp_t_n_bar', x: 0, y: 5.4, z: -13, w: 13.5, h: 1.1, d: 2.4, kind: 'gold' },
    { id: 'cp_t_s_l', x: -4.5, y: 0, z: 13, w: 1.8, h: 5.4, d: 1.8, kind: 'crimson_brick' },
    { id: 'cp_t_s_r', x: 4.5, y: 0, z: 13, w: 1.8, h: 5.4, d: 1.8, kind: 'crimson_brick' },
    { id: 'cp_t_s_bar', x: 0, y: 5.4, z: 13, w: 13.5, h: 1.1, d: 2.4, kind: 'gold' },

    // Twin Multi-Tiered Wooden Pagodas (West Hill & East Hill)
    { id: 'cp_pag_w1', x: -24, y: 0, z: 0, w: 11, h: 2.6, d: 14, kind: 'wood_crate' },
    { id: 'cp_pag_w2', x: -24, y: 2.6, z: 0, w: 6.5, h: 3.2, d: 7.5, kind: 'amethyst' },
    { id: 'cp_pag_w3', x: -24, y: 5.8, z: 0, w: 8.5, h: 0.9, d: 9.5, kind: 'gold' },
    { id: 'cp_pag_e1', x: 24, y: 0, z: 0, w: 11, h: 2.6, d: 14, kind: 'wood_crate' },
    { id: 'cp_pag_e2', x: 24, y: 2.6, z: 0, w: 6.5, h: 3.2, d: 7.5, kind: 'amethyst' },
    { id: 'cp_pag_e3', x: 24, y: 5.8, z: 0, w: 8.5, h: 0.9, d: 9.5, kind: 'gold' },

    // Engawa Side Galleries & Stone Koi-Pond Lantern Plinths
    { id: 'cp_eng_nw', x: -16, y: 0, z: -22, w: 12, h: 2.0, d: 5.5, kind: 'stone' },
    { id: 'cp_eng_ne', x: 16, y: 0, z: -22, w: 12, h: 2.0, d: 5.5, kind: 'stone' },
    { id: 'cp_eng_sw', x: -16, y: 0, z: 22, w: 12, h: 2.0, d: 5.5, kind: 'stone' },
    { id: 'cp_eng_se', x: 16, y: 0, z: 22, w: 12, h: 2.0, d: 5.5, kind: 'stone' },
    { id: 'cp_lnt_nw', x: -7.5, y: 0, z: -6.5, w: 2.0, h: 1.5, d: 2.0, kind: 'stone' },
    { id: 'cp_lnt_se', x: 7.5, y: 0, z: 6.5, w: 2.0, h: 1.5, d: 2.0, kind: 'stone' },
    { id: 'cp_lnt_ne', x: 7.5, y: 0, z: -6.5, w: 2.0, h: 1.5, d: 2.0, kind: 'stone' },
    { id: 'cp_lnt_sw', x: -7.5, y: 0, z: 6.5, w: 2.0, h: 1.5, d: 2.0, kind: 'stone' },
    { id: 'cp_shrine_n', x: 0, y: 0, z: -31, w: 10, h: 3.2, d: 4.5, kind: 'crimson_brick' },
    { id: 'cp_shrine_s', x: 0, y: 0, z: 31, w: 10, h: 3.2, d: 4.5, kind: 'crimson_brick' },
  ];

  addRamp(blocks, 'cp_r_pw_n', -24, -9.2, 0, 1, 3, 2.6, 3.6, 1.5, 'stone');
  addRamp(blocks, 'cp_r_pw_s', -24, 9.2, 0, -1, 3, 2.6, 3.6, 1.5, 'stone');
  addRamp(blocks, 'cp_r_pe_n', 24, -9.2, 0, 1, 3, 2.6, 3.6, 1.5, 'stone');
  addRamp(blocks, 'cp_r_pe_s', 24, 9.2, 0, -1, 3, 2.6, 3.6, 1.5, 'stone');
  addRamp(blocks, 'cp_r_enw', -23.5, -22, 1, 0, 2, 2.0, 3.4, 1.5, 'wood_crate');
  addRamp(blocks, 'cp_r_ese', 23.5, 22, -1, 0, 2, 2.0, 3.4, 1.5, 'wood_crate');
  return blocks;
}

/**
 * 17. Obsidian Keep (Floating End Void Archipelago — Main Keep + 4 Satellite Island Forts + Narrow Skybridges)
 */
function buildObsidianKeepBlocks(): ArenaBlock[] {
  const blocks: ArenaBlock[] = [
    // Inner Broken Throne Ring framing open Void Courtyard (keeps (0,0) at ground level)
    { id: 'ok_in_n', x: 0, y: 0, z: -9.5, w: 6.5, h: 1.6, d: 2.6, kind: 'obsidian' },
    { id: 'ok_in_s', x: 0, y: 0, z: 9.5, w: 6.5, h: 1.6, d: 2.6, kind: 'obsidian' },
    { id: 'ok_in_w', x: -9.5, y: 0, z: 0, w: 2.6, h: 1.6, d: 6.5, kind: 'obsidian' },
    { id: 'ok_in_e', x: 9.5, y: 0, z: 0, w: 2.6, h: 1.6, d: 6.5, kind: 'obsidian' },

    // 4 Separated Floating Satellite Island Forts at NW, NE, SW, SE (NO outer perimeter box!)
    { id: 'ok_isl_nw', x: -24, y: 2.8, z: -24, w: 12, h: 1.4, d: 12, kind: 'deepslate' },
    { id: 'ok_tow_nw', x: -27, y: 4.2, z: -27, w: 4.5, h: 6.5, d: 4.5, kind: 'obsidian' },
    { id: 'ok_isl_ne', x: 24, y: 2.8, z: -24, w: 12, h: 1.4, d: 12, kind: 'deepslate' },
    { id: 'ok_tow_ne', x: 27, y: 4.2, z: -27, w: 4.5, h: 6.5, d: 4.5, kind: 'obsidian' },
    { id: 'ok_isl_sw', x: -24, y: 2.8, z: 24, w: 12, h: 1.4, d: 12, kind: 'deepslate' },
    { id: 'ok_tow_sw', x: -27, y: 4.2, z: 27, w: 4.5, h: 6.5, d: 4.5, kind: 'obsidian' },
    { id: 'ok_isl_se', x: 24, y: 2.8, z: 24, w: 12, h: 1.4, d: 12, kind: 'deepslate' },
    { id: 'ok_tow_se', x: 27, y: 4.2, z: 27, w: 4.5, h: 6.5, d: 4.5, kind: 'obsidian' },

    // Narrow Suspended Sky-Bridges Linking Satellite Forts Overhead
    { id: 'ok_br_n', x: 0, y: 3.4, z: -24, w: 36, h: 0.85, d: 3.4, kind: 'amethyst' },
    { id: 'ok_br_s', x: 0, y: 3.4, z: 24, w: 36, h: 0.85, d: 3.4, kind: 'amethyst' },
    { id: 'ok_br_w', x: -24, y: 3.4, z: 0, w: 3.4, h: 0.85, d: 36, kind: 'amethyst' },
    { id: 'ok_br_e', x: 24, y: 3.4, z: 0, w: 3.4, h: 0.85, d: 36, kind: 'amethyst' },

    // Ender Altar Stepping Stones inside inner void ring
    { id: 'ok_cov_nw', x: -16, y: 0, z: -16, w: 3.8, h: 2.8, d: 3.8, kind: 'amethyst' },
    { id: 'ok_cov_ne', x: 16, y: 0, z: -16, w: 3.8, h: 2.8, d: 3.8, kind: 'amethyst' },
    { id: 'ok_cov_sw', x: -16, y: 0, z: 16, w: 3.8, h: 2.8, d: 3.8, kind: 'amethyst' },
    { id: 'ok_cov_se', x: 16, y: 0, z: 16, w: 3.8, h: 2.8, d: 3.8, kind: 'amethyst' },
    { id: 'ok_bat_nw', x: -21, y: 4.2, z: -20, w: 4.0, h: 1.1, d: 1.0, kind: 'obsidian' },
    { id: 'ok_bat_ne', x: 21, y: 4.2, z: -20, w: 4.0, h: 1.1, d: 1.0, kind: 'obsidian' },
    { id: 'ok_bat_sw', x: -21, y: 4.2, z: 20, w: 4.0, h: 1.1, d: 1.0, kind: 'obsidian' },
    { id: 'ok_bat_se', x: 21, y: 4.2, z: 20, w: 4.0, h: 1.1, d: 1.0, kind: 'obsidian' },
  ];

  addRamp(blocks, 'ok_r_nw', -16, -24, -1, 0, 4, 3.6, 3.4, 1.5, 'obsidian');
  addRamp(blocks, 'ok_r_ne', 16, -24, 1, 0, 4, 3.6, 3.4, 1.5, 'obsidian');
  addRamp(blocks, 'ok_r_sw', -16, 24, -1, 0, 4, 3.6, 3.4, 1.5, 'obsidian');
  addRamp(blocks, 'ok_r_se', 16, 24, 1, 0, 4, 3.6, 3.4, 1.5, 'obsidian');
  return blocks;
}

/**
 * 18. Solar Observatory (Stonehenge-inspired Concentric Standing Stone Arcs & Solstice Corridor)
 */
function buildSolarObservatoryBlocks(): ArenaBlock[] {
  const blocks: ArenaBlock[] = [
    // Inner Sundial Standing Stone Arc (6 monoliths at r=11m with overhead lintel pairs)
    ...Array.from({ length: 6 }, (_, i) => {
      const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
      const r = 11.5;
      return {
        id: `so_in_mon_${i}`,
        x: Math.round(Math.cos(a) * r),
        y: 0,
        z: Math.round(Math.sin(a) * r),
        w: 2.6,
        h: 4.8,
        d: 2.6,
        kind: (i % 2 === 0 ? 'sandstone' : 'gold') as ArenaBlock['kind'],
      };
    }),
    // Outer Concentric Astronomical Trilithon Arc (8 tall pairs at r=26m)
    ...Array.from({ length: 8 }, (_, i) => {
      const a = (i / 8) * Math.PI * 2;
      const r = 26;
      const isEW = Math.abs(Math.cos(a)) > Math.abs(Math.sin(a));
      return {
        id: `so_out_arc_${i}`,
        x: Math.round(Math.cos(a) * r),
        y: 0,
        z: Math.round(Math.sin(a) * r),
        w: isEW ? 3.8 : 8.5,
        h: 3.0,
        d: isEW ? 8.5 : 3.8,
        kind: (i % 2 === 0 ? 'sandstone' : 'stone') as ArenaBlock['kind'],
      };
    }),

    // Giant Solstice Lintel Slabs & Meridian Lens Bridges (y=4.8 / y=6.2)
    { id: 'so_lint_n', x: 0, y: 4.8, z: -10, w: 14, h: 1.0, d: 3.0, kind: 'gold' },
    { id: 'so_lint_s', x: 0, y: 4.8, z: 10, w: 14, h: 1.0, d: 3.0, kind: 'gold' },
    { id: 'so_merid_w', x: -20, y: 5.6, z: 0, w: 14, h: 0.9, d: 3.4, kind: 'reactor_core' },
    { id: 'so_merid_e', x: 20, y: 5.6, z: 0, w: 14, h: 0.9, d: 3.4, kind: 'reactor_core' },

    // Corner Telescope Terraces
    { id: 'so_tel_nw', x: -30, y: 0, z: -26, w: 7.5, h: 5.5, d: 7.5, kind: 'sandstone' },
    { id: 'so_tel_ne', x: 30, y: 0, z: -26, w: 7.5, h: 5.5, d: 7.5, kind: 'sandstone' },
    { id: 'so_tel_sw', x: -30, y: 0, z: 26, w: 7.5, h: 5.5, d: 7.5, kind: 'sandstone' },
    { id: 'so_tel_se', x: 30, y: 0, z: 26, w: 7.5, h: 5.5, d: 7.5, kind: 'sandstone' },
  ];

  addRamp(blocks, 'so_r_n', -6.8, -26, 1, 0, 3, 3.0, 3.4, 1.5, 'stone');
  addRamp(blocks, 'so_r_s', 6.8, 26, -1, 0, 3, 3.0, 3.4, 1.5, 'stone');
  addRamp(blocks, 'so_r_w', -26, 6.8, 0, -1, 3, 3.0, 3.4, 1.5, 'stone');
  addRamp(blocks, 'so_r_e', 26, -6.8, 0, 1, 3, 3.0, 3.4, 1.5, 'stone');
  addRamp(blocks, 'so_r_tnw', -24.5, -26, -1, 0, 3, 5.5, 3.4, 1.5, 'gold');
  return blocks;
}

/**
 * 19. Toxic Refinery (Chemical Tank Farm + Snaking Pipe-Maze Catwalks + Acid Retaining Berms)
 */
function buildToxicRefineryBlocks(): ArenaBlock[] {
  const blocks: ArenaBlock[] = [
    // West Tank Farm Rows (3 Huge Elevated Chemical Tank Decks!)
    { id: 'tr_tank_w1', x: -16, y: 0, z: -15, w: 7.0, h: 3.4, d: 7.0, kind: 'container_teal' },
    { id: 'tr_tank_w2', x: -16, y: 0, z: 0, w: 7.0, h: 3.4, d: 7.0, kind: 'basalt' },
    { id: 'tr_tank_w3', x: -16, y: 0, z: 15, w: 7.0, h: 3.4, d: 7.0, kind: 'container_teal' },

    // East Distillation Manifold Platforms (2 staggered high vats leaving x=23, z=0 open for acid pool!)
    { id: 'tr_vat_ne', x: 18, y: 0, z: -14, w: 8.5, h: 4.4, d: 8.5, kind: 'cyber_panel' },
    { id: 'tr_vat_se', x: 18, y: 0, z: 14, w: 8.5, h: 4.4, d: 8.5, kind: 'cyber_panel' },
    { id: 'tr_berm_e', x: 29, y: 0, z: 0, w: 3.2, h: 2.2, d: 14, kind: 'basalt' },

    // Snaking S-Curve Overhead Pipe Bridges (connecting West Tanks <-> East Vats at y=5.4)
    { id: 'tr_pipe_n', x: 1, y: 5.4, z: -14, w: 30, h: 0.9, d: 3.2, kind: 'container_teal' },
    { id: 'tr_pipe_s', x: 1, y: 5.4, z: 14, w: 30, h: 0.9, d: 3.2, kind: 'container_teal' },
    { id: 'tr_pipe_w', x: -16, y: 5.4, z: 0, w: 3.2, h: 0.9, d: 28, kind: 'wood_crate' },

    // Hazmat Loading Crates & Refinery Pipe Manifold Walls
    { id: 'tr_haz_1', x: -5.5, y: 0, z: -6.5, w: 2.6, h: 1.5, d: 3.6, kind: 'wood_crate' },
    { id: 'tr_haz_2', x: 5.5, y: 0, z: 6.5, w: 2.6, h: 1.5, d: 3.6, kind: 'wood_crate' },
    { id: 'tr_wall_n', x: 0, y: 0, z: -26, w: 22, h: 4.2, d: 3.4, kind: 'basalt' },
    { id: 'tr_wall_s', x: 0, y: 0, z: 26, w: 22, h: 4.2, d: 3.4, kind: 'basalt' },
    { id: 'tr_silo_w', x: -31, y: 0, z: 0, w: 5.5, h: 8.5, d: 12, kind: 'container_teal' },
    { id: 'tr_silo_ne', x: 31, y: 0, z: -20, w: 5.5, h: 7.5, d: 5.5, kind: 'basalt' },
    { id: 'tr_silo_se', x: 31, y: 0, z: 20, w: 5.5, h: 7.5, d: 5.5, kind: 'basalt' },
    { id: 'tr_haz_3', x: -5.5, y: 0, z: 6.5, w: 2.6, h: 1.5, d: 3.6, kind: 'wood_crate' },
    { id: 'tr_haz_4', x: 5.5, y: 0, z: -6.5, w: 2.6, h: 1.5, d: 3.6, kind: 'wood_crate' },
    { id: 'tr_barrel_n', x: 0, y: 0, z: -11, w: 3.0, h: 1.8, d: 2.2, kind: 'container_teal' },
    { id: 'tr_barrel_s', x: 0, y: 0, z: 11, w: 3.0, h: 1.8, d: 2.2, kind: 'container_teal' },
    { id: 'tr_vat_nw', x: -29, y: 0, z: -22, w: 5.5, h: 7.0, d: 5.5, kind: 'cyber_panel' },
    { id: 'tr_vat_sw', x: -29, y: 0, z: 22, w: 5.5, h: 7.0, d: 5.5, kind: 'cyber_panel' },
    { id: 'tr_sump_w', x: -16, y: 3.4, z: 0, w: 3.6, h: 1.2, d: 3.6, kind: 'gold' },
  ];

  addRamp(blocks, 'tr_r_tw1', -10.5, -15, -1, 0, 3, 3.4, 3.4, 1.5, 'wood_crate');
  addRamp(blocks, 'tr_r_tw3', -10.5, 15, -1, 0, 3, 3.4, 3.4, 1.5, 'wood_crate');
  addRamp(blocks, 'tr_r_vne', 11.8, -14, 1, 0, 4, 4.4, 3.4, 1.5, 'basalt');
  addRamp(blocks, 'tr_r_vse', 11.8, 14, 1, 0, 4, 4.4, 3.4, 1.5, 'basalt');
  addRamp(blocks, 'tr_r_wn', -16, -22, 0, -1, 3, 4.2, 3.2, 1.5, 'container_teal');
  return blocks;
}

/**
 * 20. Aether Spire (Directional South-to-North 3-Tier Floating Olympus Temple Ascent)
 */
function buildAetherSpireBlocks(): ArenaBlock[] {
  const blocks: ArenaBlock[] = [
    // Tier 1 (South Lower Approach Plinths — leaves (0,0) wide open at y=0!)
    { id: 'as_t1_w', x: -12, y: 0, z: 18, w: 10, h: 1.6, d: 10, kind: 'ice_brick' },
    { id: 'as_t1_e', x: 12, y: 0, z: 18, w: 10, h: 1.6, d: 10, kind: 'ice_brick' },
    { id: 'as_t1_cov_w', x: -7.0, y: 0, z: 6.5, w: 2.8, h: 1.5, d: 2.8, kind: 'stone' },
    { id: 'as_t1_cov_e', x: 7.0, y: 0, z: 6.5, w: 2.8, h: 1.5, d: 2.8, kind: 'stone' },

    // Tier 2 (Mid Wing Floating Balconies flanking Central Arena at z=-6, y=3.2m)
    { id: 'as_t2_w', x: -16, y: 0, z: -6, w: 12, h: 3.2, d: 10, kind: 'ice_brick' },
    { id: 'as_t2_e', x: 16, y: 0, z: -6, w: 12, h: 3.2, d: 10, kind: 'ice_brick' },
    { id: 'as_t2_arch', x: 0, y: 4.8, z: -6, w: 20, h: 0.9, d: 3.4, kind: 'gold' },

    // Tier 3 (High North Olympus Sanctuary Acropolis at z=-24, y=5.4m!)
    { id: 'as_t3_acrop', x: 0, y: 0, z: -24, w: 26, h: 5.4, d: 10, kind: 'amethyst' },
    { id: 'as_t3_col1', x: -9.5, y: 5.4, z: -20, w: 2.0, h: 4.4, d: 2.0, kind: 'gold' },
    { id: 'as_t3_col2', x: 9.5, y: 5.4, z: -20, w: 2.0, h: 4.4, d: 2.0, kind: 'gold' },
    { id: 'as_t3_ped', x: 0, y: 9.8, z: -20, w: 24, h: 1.1, d: 3.2, kind: 'ice_brick' },

    // Flanking Angel-Wing Floating Skywalks returning South
    { id: 'as_wing_w', x: -28, y: 5.4, z: 4, w: 4.2, h: 0.9, d: 30, kind: 'gold' },
    { id: 'as_wing_e', x: 28, y: 5.4, z: 4, w: 4.2, h: 0.9, d: 30, kind: 'gold' },
    { id: 'as_spire_nw', x: -28, y: 0, z: -22, w: 5.0, h: 10.5, d: 5.0, kind: 'amethyst' },
    { id: 'as_spire_ne', x: 28, y: 0, z: -22, w: 5.0, h: 10.5, d: 5.0, kind: 'amethyst' },
    { id: 'as_spire_sw', x: -28, y: 0, z: 24, w: 5.0, h: 8.0, d: 5.0, kind: 'ice_brick' },
    { id: 'as_spire_se', x: 28, y: 0, z: 24, w: 5.0, h: 8.0, d: 5.0, kind: 'ice_brick' },
    { id: 'as_par_w1', x: -22, y: 0, z: -14, w: 2.4, h: 2.6, d: 2.4, kind: 'ice_brick' },
    { id: 'as_par_e1', x: 22, y: 0, z: -14, w: 2.4, h: 2.6, d: 2.4, kind: 'ice_brick' },
    { id: 'as_par_w2', x: -7.5, y: 0, z: -13, w: 2.4, h: 1.5, d: 2.4, kind: 'gold' },
    { id: 'as_par_e2', x: 7.5, y: 0, z: -13, w: 2.4, h: 1.5, d: 2.4, kind: 'gold' },
    { id: 'as_s_gate_w', x: -5.5, y: 0, z: 28, w: 3.5, h: 4.0, d: 3.5, kind: 'ice_brick' },
    { id: 'as_s_gate_e', x: 5.5, y: 0, z: 28, w: 3.5, h: 4.0, d: 3.5, kind: 'ice_brick' },
  ];

  addRamp(blocks, 'as_r_t1w', -12, 24.8, 0, -1, 2, 1.6, 4.2, 1.6, 'stone');
  addRamp(blocks, 'as_r_t1e', 12, 24.8, 0, -1, 2, 1.6, 4.2, 1.6, 'stone');
  addRamp(blocks, 'as_r_t2w', -16, 2.5, 0, -1, 3, 3.2, 4.2, 1.8, 'ice_brick');
  addRamp(blocks, 'as_r_t2e', 16, 2.5, 0, -1, 3, 3.2, 4.2, 1.8, 'ice_brick');
  addRamp(blocks, 'as_r_t3w', -16, -12.5, 0, -1, 3, 5.4, 4.0, 2.0, 'gold');
  addRamp(blocks, 'as_r_t3e', 16, -12.5, 0, -1, 3, 5.4, 4.0, 2.0, 'gold');
  return blocks;
}

export const ARENA_HORIZONTAL_SCALE = 1.45;

function getRawJumpPadsForMap(mapId: MapId): JumpPadZone[] {
  switch (mapId) {
    case 'container_yard':
      return [
        { id: 'jp_cy_w', x: -24, y: 0, z: -4, radius: 1.8, boostY: 18.5, boostForward: 6, color: '#38bdf8' },
        { id: 'jp_cy_e', x: 22, y: 0, z: 1.5, radius: 1.8, boostY: 18.5, boostForward: 6, color: '#38bdf8' },
        { id: 'jp_cy_n', x: -6.0, y: 0, z: -18, radius: 1.8, boostY: 16.5, boostForward: 5, color: '#facc15' },
        { id: 'jp_cy_s', x: 6.0, y: 0, z: 18, radius: 1.8, boostY: 16.5, boostForward: 5, color: '#facc15' },
      ];
    case 'emerald_citadel':
      return [
        { id: 'jp_ec_nw', x: -28, y: 0, z: -11, radius: 1.8, boostY: 19.0, boostForward: 6, color: '#34d399' },
        { id: 'jp_ec_se', x: 28, y: 0, z: 11, radius: 1.8, boostY: 19.0, boostForward: 6, color: '#34d399' },
        { id: 'jp_ec_n', x: 0, y: 2.2, z: -24, radius: 1.7, boostY: 16.0, boostForward: 7, color: '#facc15' },
        { id: 'jp_ec_s', x: 0, y: 2.2, z: 24, radius: 1.7, boostY: 16.0, boostForward: 7, color: '#facc15' },
      ];
    case 'sky_dock':
      return [
        { id: 'jp_sd_w', x: -21, y: 2.4, z: -6, radius: 1.9, boostY: 20.5, boostForward: 11.5, color: '#38bdf8' },
        { id: 'jp_sd_e', x: 21, y: 2.4, z: 6, radius: 1.9, boostY: 20.5, boostForward: 11.5, color: '#38bdf8' },
        { id: 'jp_sd_n', x: 0, y: 2.4, z: -19, radius: 1.8, boostY: 18.5, boostForward: 12.0, color: '#a855f7' },
        { id: 'jp_sd_s', x: 0, y: 2.4, z: 19, radius: 1.8, boostY: 18.5, boostForward: 12.0, color: '#a855f7' },
      ];
    case 'nether_foundry':
      return [
        { id: 'jp_nf_w', x: -14, y: 0, z: 0, radius: 1.8, boostY: 19.5, boostForward: 6, color: '#f97316' },
        { id: 'jp_nf_e', x: 14, y: 0, z: 0, radius: 1.8, boostY: 19.5, boostForward: 6, color: '#f97316' },
        { id: 'jp_nf_n', x: 0, y: 0, z: -14, radius: 1.8, boostY: 19.5, boostForward: 6, color: '#facc15' },
        { id: 'jp_nf_s', x: 0, y: 0, z: 14, radius: 1.8, boostY: 19.5, boostForward: 6, color: '#facc15' },
      ];
    case 'cyber_nexus':
      return [
        { id: 'jp_cn_w', x: -19, y: 0, z: 0, radius: 1.8, boostY: 19.5, boostForward: 10, color: '#06b6d4' },
        { id: 'jp_cn_e', x: 19, y: 0, z: 0, radius: 1.8, boostY: 19.5, boostForward: 10, color: '#06b6d4' },
        { id: 'jp_cn_n', x: 0, y: 0, z: -19, radius: 1.8, boostY: 18.0, boostForward: 9, color: '#a855f7' },
        { id: 'jp_cn_s', x: 0, y: 0, z: 19, radius: 1.8, boostY: 18.0, boostForward: 9, color: '#a855f7' },
      ];
    case 'frost_bastion':
      return [
        { id: 'jp_fb_nw', x: -12, y: 0, z: -18, radius: 1.8, boostY: 19.5, boostForward: 6, color: '#7dd3fc' },
        { id: 'jp_fb_ne', x: 12, y: 0, z: -15, radius: 1.8, boostY: 19.5, boostForward: 6, color: '#38bdf8' },
        { id: 'jp_fb_sw', x: -12, y: 0, z: 16, radius: 1.8, boostY: 19.5, boostForward: 6, color: '#38bdf8' },
        { id: 'jp_fb_e', x: 24, y: 0, z: -14, radius: 1.8, boostY: 19.5, boostForward: 6, color: '#7dd3fc' },
      ];
    case 'ancient_temple':
      return [
        { id: 'jp_at_w', x: -18, y: 0, z: -12, radius: 1.8, boostY: 18.0, boostForward: 6, color: '#f59e0b' },
        { id: 'jp_at_e', x: 18, y: 0, z: 12, radius: 1.8, boostY: 18.0, boostForward: 6, color: '#f59e0b' },
        { id: 'jp_at_n', x: 0, y: 0, z: -12, radius: 1.8, boostY: 17.5, boostForward: 5, color: '#fbbf24' },
        { id: 'jp_at_s', x: 0, y: 0, z: 12, radius: 1.8, boostY: 17.5, boostForward: 5, color: '#fbbf24' },
      ];
    case 'orbital_reactor':
      return [
        { id: 'jp_or_nw', x: -10, y: 0, z: -10, radius: 1.8, boostY: 22.0, boostForward: 8, color: '#818cf8' },
        { id: 'jp_or_ne', x: 10, y: 0, z: -10, radius: 1.8, boostY: 22.0, boostForward: 8, color: '#818cf8' },
        { id: 'jp_or_sw', x: -10, y: 0, z: 10, radius: 1.8, boostY: 22.0, boostForward: 8, color: '#38bdf8' },
        { id: 'jp_or_se', x: 10, y: 0, z: 10, radius: 1.8, boostY: 22.0, boostForward: 8, color: '#38bdf8' },
      ];
    case 'volcanic_caldera':
      return [
        { id: 'jp_vc_nw', x: -10.5, y: 0, z: -10.5, radius: 1.8, boostY: 21.0, boostForward: 7.5, color: '#f97316' },
        { id: 'jp_vc_se', x: 10.5, y: 0, z: 10.5, radius: 1.8, boostY: 21.0, boostForward: 7.5, color: '#f97316' },
        { id: 'jp_vc_ne', x: 10.5, y: 0, z: -10.5, radius: 1.8, boostY: 20.5, boostForward: 6.5, color: '#fb923c' },
        { id: 'jp_vc_sw', x: -10.5, y: 0, z: 10.5, radius: 1.8, boostY: 20.5, boostForward: 6.5, color: '#fb923c' },
      ];
    case 'bamboo_sanctuary':
      return [
        { id: 'jp_bs_w', x: -12, y: 0, z: 0, radius: 1.8, boostY: 18.5, boostForward: 7, color: '#22c55e' },
        { id: 'jp_bs_e', x: 12, y: 0, z: 0, radius: 1.8, boostY: 18.5, boostForward: 7, color: '#22c55e' },
        { id: 'jp_bs_n', x: 0, y: 0, z: -12, radius: 1.8, boostY: 19.0, boostForward: 6, color: '#84cc16' },
        { id: 'jp_bs_s', x: 0, y: 0, z: 12, radius: 1.8, boostY: 19.0, boostForward: 6, color: '#84cc16' },
      ];
    case 'neon_downtown':
      return [
        { id: 'jp_nd_w', x: -8, y: 0, z: 0, radius: 1.8, boostY: 19.5, boostForward: 11, color: '#38bdf8' },
        { id: 'jp_nd_e', x: 8, y: 0, z: 0, radius: 1.8, boostY: 19.5, boostForward: 11, color: '#38bdf8' },
        { id: 'jp_nd_n', x: 0, y: 0, z: -10, radius: 1.8, boostY: 20.0, boostForward: 9, color: '#ec4899' },
        { id: 'jp_nd_s', x: 0, y: 0, z: 6, radius: 1.8, boostY: 20.0, boostForward: 9, color: '#ec4899' },
      ];
    case 'sunken_atlantis':
      return [
        { id: 'jp_sa_w', x: -11, y: 0, z: 12, radius: 1.8, boostY: 21.0, boostForward: 7, color: '#14b8a6' },
        { id: 'jp_sa_e', x: 11, y: 0, z: -12, radius: 1.8, boostY: 21.0, boostForward: 7, color: '#14b8a6' },
        { id: 'jp_sa_n', x: 0, y: 0, z: -19, radius: 1.8, boostY: 20.5, boostForward: 6, color: '#2dd4bf' },
        { id: 'jp_sa_s', x: 0, y: 0, z: 19, radius: 1.8, boostY: 20.5, boostForward: 6, color: '#2dd4bf' },
      ];
    case 'clockwork_tower':
      return [
        { id: 'jp_ct_n', x: 0, y: 0, z: -12, radius: 1.8, boostY: 19.5, boostForward: 7.5, color: '#f59e0b' },
        { id: 'jp_ct_s', x: 0, y: 0, z: 12, radius: 1.8, boostY: 19.5, boostForward: 7.5, color: '#f59e0b' },
        { id: 'jp_ct_w', x: -12, y: 0, z: 0, radius: 1.8, boostY: 19.5, boostForward: 7.5, color: '#fbbf24' },
        { id: 'jp_ct_e', x: 12, y: 0, z: 0, radius: 1.8, boostY: 19.5, boostForward: 7.5, color: '#fbbf24' },
      ];
    case 'desert_mirage':
      return [
        { id: 'jp_dm_nw', x: -14, y: 0, z: -7, radius: 1.8, boostY: 18.5, boostForward: 7, color: '#eab308' },
        { id: 'jp_dm_se', x: 14, y: 0, z: 7, radius: 1.8, boostY: 18.5, boostForward: 7, color: '#eab308' },
        { id: 'jp_dm_ne', x: 14, y: 0, z: -8, radius: 1.8, boostY: 18.5, boostForward: 7, color: '#facc15' },
        { id: 'jp_dm_sw', x: -14, y: 0, z: 8, radius: 1.8, boostY: 18.5, boostForward: 7, color: '#facc15' },
      ];
    case 'crystal_cavern':
      return [
        { id: 'jp_cc_nw', x: -12, y: 0, z: -14, radius: 1.8, boostY: 20.0, boostForward: 7, color: '#c084fc' },
        { id: 'jp_cc_se', x: 12, y: 0, z: 14, radius: 1.8, boostY: 20.0, boostForward: 7, color: '#c084fc' },
        { id: 'jp_cc_ne', x: 10, y: 0, z: -16, radius: 1.8, boostY: 20.0, boostForward: 7, color: '#a855f7' },
        { id: 'jp_cc_sw', x: -10, y: 0, z: 16, radius: 1.8, boostY: 20.0, boostForward: 7, color: '#a855f7' },
      ];
    case 'cherry_pagoda':
      return [
        { id: 'jp_cp_w', x: -12, y: 0, z: 0, radius: 1.8, boostY: 18.5, boostForward: 6.5, color: '#f472b6' },
        { id: 'jp_cp_e', x: 12, y: 0, z: 0, radius: 1.8, boostY: 18.5, boostForward: 6.5, color: '#f472b6' },
        { id: 'jp_cp_n', x: 0, y: 0, z: -8, radius: 1.8, boostY: 18.5, boostForward: 6.5, color: '#fb7185' },
        { id: 'jp_cp_s', x: 0, y: 0, z: 8, radius: 1.8, boostY: 18.5, boostForward: 6.5, color: '#fb7185' },
      ];
    case 'obsidian_keep':
      return [
        { id: 'jp_ok_nw', x: -12, y: 0, z: -12, radius: 1.8, boostY: 20.5, boostForward: 7, color: '#818cf8' },
        { id: 'jp_ok_se', x: 12, y: 0, z: 12, radius: 1.8, boostY: 20.5, boostForward: 7, color: '#818cf8' },
        { id: 'jp_ok_ne', x: 12, y: 0, z: -12, radius: 1.8, boostY: 20.5, boostForward: 7, color: '#a855f7' },
        { id: 'jp_ok_sw', x: -12, y: 0, z: 12, radius: 1.8, boostY: 20.5, boostForward: 7, color: '#a855f7' },
      ];
    case 'solar_observatory':
      return [
        { id: 'jp_so_n', x: 0, y: 0, z: -17, radius: 1.8, boostY: 21.5, boostForward: 7.5, color: '#fbbf24' },
        { id: 'jp_so_s', x: 0, y: 0, z: 17, radius: 1.8, boostY: 21.5, boostForward: 7.5, color: '#fbbf24' },
        { id: 'jp_so_w', x: -16, y: 0, z: 0, radius: 1.8, boostY: 21.5, boostForward: 7.5, color: '#f59e0b' },
        { id: 'jp_so_e', x: 16, y: 0, z: 0, radius: 1.8, boostY: 21.5, boostForward: 7.5, color: '#f59e0b' },
      ];
    case 'toxic_refinery':
      return [
        { id: 'jp_tr_w', x: -9, y: 0, z: 0, radius: 1.8, boostY: 19.0, boostForward: 8, color: '#34d399' },
        { id: 'jp_tr_e', x: 9, y: 0, z: 0, radius: 1.8, boostY: 19.0, boostForward: 8, color: '#34d399' },
        { id: 'jp_tr_n', x: 0, y: 0, z: -18, radius: 1.8, boostY: 19.0, boostForward: 7, color: '#10b981' },
        { id: 'jp_tr_s', x: 0, y: 0, z: 18, radius: 1.8, boostY: 19.0, boostForward: 7, color: '#10b981' },
      ];
    case 'aether_spire':
      return [
        { id: 'jp_as_nw', x: -8, y: 0, z: -14, radius: 1.9, boostY: 23.5, boostForward: 8.5, color: '#a78bfa' },
        { id: 'jp_as_ne', x: 8, y: 0, z: -14, radius: 1.9, boostY: 23.5, boostForward: 8.5, color: '#a78bfa' },
        { id: 'jp_as_sw', x: -12, y: 0, z: 9, radius: 1.9, boostY: 22.0, boostForward: 8.5, color: '#38bdf8' },
        { id: 'jp_as_se', x: 12, y: 0, z: 9, radius: 1.9, boostY: 22.0, boostForward: 8.5, color: '#38bdf8' },
      ];
    default: {
      const def: MapDefinition = MAP_DEFINITIONS[mapId] ?? MAP_DEFINITIONS.emerald_citadel;
      return [
        { id: `jp_${mapId}_nw`, x: -18.5, y: 0, z: -18.5, radius: 1.8, boostY: 19.0, boostForward: 6, color: def.accentHex },
        { id: `jp_${mapId}_ne`, x: 18.5, y: 0, z: -18.5, radius: 1.8, boostY: 19.0, boostForward: 6, color: def.accentHex },
        { id: `jp_${mapId}_sw`, x: -18.5, y: 0, z: 18.5, radius: 1.8, boostY: 19.0, boostForward: 6, color: '#38bdf8' },
        { id: `jp_${mapId}_se`, x: 18.5, y: 0, z: 18.5, radius: 1.8, boostY: 19.0, boostForward: 6, color: '#38bdf8' },
      ];
    }
  }
}

export function getJumpPadsForMap(mapId: MapId): JumpPadZone[] {
  return getRawJumpPadsForMap(mapId).map((pad) => ({
    ...pad,
    x: Number((pad.x * ARENA_HORIZONTAL_SCALE).toFixed(2)),
    z: Number((pad.z * ARENA_HORIZONTAL_SCALE).toFixed(2)),
    radius: Number((pad.radius * 1.22).toFixed(2)),
    boostForward: pad.boostForward ? Number((pad.boostForward * 1.32).toFixed(2)) : undefined,
  }));
}

/**
 * Returns built-in signature water springs (sanctum heal/extinguish) or
 * lava/magma crucible hazards tailored to each map's theme (never blocking origin spawn).
 */
function getRawMapSignaturePools(mapId: MapId): HazardPoolZone[] {
  switch (mapId) {
    case 'emerald_citadel':
      return [
        { id: 'mp_ec_n', kind: 'water', x: 0, y: 0.02, z: -31, radius: 2.8 },
        { id: 'mp_ec_s', kind: 'water', x: 0, y: 0.02, z: 31, radius: 2.8 },
      ];
    case 'nether_foundry':
      return [
        { id: 'mp_nf_w', kind: 'lava', x: -21, y: 0.02, z: 0, radius: 2.5 },
        { id: 'mp_nf_e', kind: 'lava', x: 21, y: 0.02, z: 0, radius: 2.5 },
      ];
    case 'frost_bastion':
      return [
        { id: 'mp_fb_n', kind: 'water', x: 0, y: 0.02, z: -23, radius: 2.8 },
        { id: 'mp_fb_s', kind: 'water', x: 0, y: 0.02, z: 23, radius: 2.8 },
      ];
    case 'ancient_temple':
      return [
        { id: 'mp_at_n', kind: 'water', x: 0, y: 0.02, z: -30, radius: 2.8 },
        { id: 'mp_at_s', kind: 'water', x: 0, y: 0.02, z: 30, radius: 2.8 },
      ];
    case 'volcanic_caldera':
      return [
        { id: 'mp_vc_ne', kind: 'lava', x: 6.5, y: 0.02, z: -6.5, radius: 2.3 },
        { id: 'mp_vc_sw', kind: 'lava', x: -6.5, y: 0.02, z: 6.5, radius: 2.3 },
      ];
    case 'bamboo_sanctuary':
      return [
        { id: 'mp_bs_ne', kind: 'water', x: 13, y: 0.02, z: -13, radius: 2.7 },
        { id: 'mp_bs_sw', kind: 'water', x: -13, y: 0.02, z: 13, radius: 2.7 },
      ];
    case 'sunken_atlantis':
      return [
        { id: 'mp_sa_w', kind: 'water', x: -24, y: 0.02, z: 0, radius: 2.8 },
        { id: 'mp_sa_e', kind: 'water', x: 24, y: 0.02, z: 0, radius: 2.8 },
      ];
    case 'desert_mirage':
      return [
        { id: 'mp_dm_n', kind: 'water', x: 0, y: 0.02, z: -26, radius: 2.8 },
        { id: 'mp_dm_s', kind: 'water', x: 0, y: 0.02, z: 26, radius: 2.8 },
      ];
    case 'cherry_pagoda':
      return [
        { id: 'mp_cp_n', kind: 'water', x: 0, y: 0.02, z: -25, radius: 2.8 },
        { id: 'mp_cp_s', kind: 'water', x: 0, y: 0.02, z: 25, radius: 2.8 },
      ];
    case 'obsidian_keep':
      return [
        { id: 'mp_ok_n', kind: 'lava', x: 0, y: 0.02, z: -17, radius: 2.4 },
        { id: 'mp_ok_s', kind: 'lava', x: 0, y: 0.02, z: 17, radius: 2.4 },
      ];
    case 'toxic_refinery':
      return [
        { id: 'mp_tr_w', kind: 'lava', x: -24, y: 0.02, z: 0, radius: 2.4 },
        { id: 'mp_tr_e', kind: 'lava', x: 24, y: 0.02, z: 0, radius: 2.4 },
      ];
    default:
      return [];
  }
}

export function getMapSignaturePools(mapId: MapId): HazardPoolZone[] {
  return getRawMapSignaturePools(mapId).map((pool) => ({
    ...pool,
    x: Number((pool.x * ARENA_HORIZONTAL_SCALE).toFixed(2)),
    z: Number((pool.z * ARENA_HORIZONTAL_SCALE).toFixed(2)),
    radius: Number((pool.radius * 1.28).toFixed(2)),
  }));
}

function getRawArenaBlocksForMap(mapId: MapId): ArenaBlock[] {
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
    case 'volcanic_caldera':
      return buildVolcanicCalderaBlocks();
    case 'bamboo_sanctuary':
      return buildBambooSanctuaryBlocks();
    case 'neon_downtown':
      return buildNeonDowntownBlocks();
    case 'sunken_atlantis':
      return buildSunkenAtlantisBlocks();
    case 'clockwork_tower':
      return buildClockworkTowerBlocks();
    case 'desert_mirage':
      return buildDesertMirageBlocks();
    case 'crystal_cavern':
      return buildCrystalCavernBlocks();
    case 'cherry_pagoda':
      return buildCherryPagodaBlocks();
    case 'obsidian_keep':
      return buildObsidianKeepBlocks();
    case 'solar_observatory':
      return buildSolarObservatoryBlocks();
    case 'toxic_refinery':
      return buildToxicRefineryBlocks();
    case 'aether_spire':
      return buildAetherSpireBlocks();
    case 'emerald_citadel':
    default:
      return buildEmeraldCitadelBlocks();
  }
}

export function getArenaBlocksForMap(mapId: MapId): ArenaBlock[] {
  return getRawArenaBlocksForMap(mapId).map((b) => ({
    ...b,
    x: Number((b.x * ARENA_HORIZONTAL_SCALE).toFixed(2)),
    z: Number((b.z * ARENA_HORIZONTAL_SCALE).toFixed(2)),
    w: Number((b.w * ARENA_HORIZONTAL_SCALE).toFixed(2)),
    d: Number((b.d * ARENA_HORIZONTAL_SCALE).toFixed(2)),
  }));
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

