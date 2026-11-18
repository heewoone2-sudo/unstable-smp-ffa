import type { ArenaBlock, HazardPoolZone, JumpPadZone, MapCategory, MapId, PlayerTeam, RoomMode } from './types';

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
  groundStyle: 'grass' | 'asphalt';
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
    description: '2단 화물 컨테이너, 크레인 캣워크, 점프 패드가 교차하는 입체 전술 야적장',
    traitName: '크레인 터보 하버',
    traitDesc: '항만 갠트리 크레인 · 이동속도 +4% & 4방향 고속 컨테이너 점프 패드',
    gravityMult: 1.0,
    moveSpeedMult: 1.04,
    cooldownSpeedMult: 1.0,
    poolRegenPerSec: 0,
    accentHex: '#2563eb',
    groundStyle: 'asphalt',
    groundTint: 0xffffff,
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
    description: '이중 성채 램프와 공중 회랑, 흑요석·자수정 타워가 어우러진 입체 시타델',
    traitName: '성소 치유 분수',
    traitDesc: '에메랄드 왕관 성소 · 남북 성소 샘물 진입 시 초당 +3.5 HP 회복 & 화상 해제',
    gravityMult: 1.0,
    moveSpeedMult: 1.0,
    cooldownSpeedMult: 1.0,
    poolRegenPerSec: 3.5,
    accentHex: '#16a34a',
    groundStyle: 'grass',
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
    description: '다층 활주로 브릿지와 도크 타워를 점프 패드·겉날개로 비행하는 공중 항구',
    traitName: '제트 기류 활주로',
    traitDesc: '부유 비행선 도크 · 체공 저중력(0.88x) & 장거리 전진 캐터펄트 점프 패드',
    gravityMult: 0.88,
    moveSpeedMult: 1.02,
    cooldownSpeedMult: 1.0,
    poolRegenPerSec: 0,
    accentHex: '#0284c7',
    groundStyle: 'asphalt',
    groundTint: 0xcbd5e1,
    ringPrimary: 0x38bdf8,
    ringEmissive: 0x0284c7,
    groundColor: 0x94a3b8,
    skyTop: '#2563eb',
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
    description: '고열 제련 브릿지와 2층 관제 데크, 용암 도가니 엄폐물이 배치된 요새',
    traitName: '용광로 화염 도가니',
    traitDesc: '쌍둥이 용암 도가니 함정 · 스킬 재충전 +12% 가속',
    gravityMult: 1.0,
    moveSpeedMult: 1.0,
    cooldownSpeedMult: 1.12,
    poolRegenPerSec: 0,
    accentHex: '#dc2626',
    groundStyle: 'asphalt',
    groundTint: 0x64545c,
    ringPrimary: 0xef4444,
    ringEmissive: 0xb91c1c,
    groundColor: 0x47424a,
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
    description: '복층 네온 서버 캣워크와 대칭 점프 패드, 고속 우회 램프로 구성된 테크 아레나',
    traitName: '하이퍼 데이터 가속',
    traitDesc: '홀로그램 코어 공명 · 이동속도 +8% & 쿨타임 회복 +10% 오버클럭',
    gravityMult: 1.0,
    moveSpeedMult: 1.08,
    cooldownSpeedMult: 1.1,
    poolRegenPerSec: 0,
    accentHex: '#06b6d4',
    groundStyle: 'asphalt',
    groundTint: 0x475569,
    ringPrimary: 0x06b6d4,
    ringEmissive: 0x0891b2,
    groundColor: 0x334155,
    skyTop: '#0f172a',
    skyMid: '#0369a1',
    skyHorizon: '#a5f3fc',
    skyBottom: '#1e293b',
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
    description: '계단식 빙벽 성채와 고지대 크리스탈 빙하 브릿지가 펼쳐진 설원 전장',
    traitName: '빙하 설원 활주',
    traitDesc: '빙벽 스케이팅 기동(+7%) · 남북 냉각 빙하샘 화상 즉시 치유(+2.5 HP/s)',
    gravityMult: 1.0,
    moveSpeedMult: 1.07,
    cooldownSpeedMult: 1.0,
    poolRegenPerSec: 2.5,
    accentHex: '#38bdf8',
    groundStyle: 'asphalt',
    groundTint: 0xdbeafe,
    ringPrimary: 0x7dd3fc,
    ringEmissive: 0x0369a1,
    groundColor: 0xcbd5e1,
    skyTop: '#1d4ed8',
    skyMid: '#93c5fd',
    skyHorizon: '#f0f9ff',
    skyBottom: '#e2e8f0',
    fogColor: 0xe0f2fe,
    sunColor: 0xffffff,
    ambientSky: 0xe0f2fe,
    ambientGround: 0x64748b,
    worldRadius: 48,
  },
  ancient_temple: {
    id: 'ancient_temple',
    name: '고대 사원',
    englishName: 'ANCIENT TEMPLE',
    badge: '유적',
    category: 'nature',
    description: '피라미드 단차 제단, 회랑 기둥 엄폐물, 황금 지구라트 상층부가 있는 유적',
    traitName: '파라오 태양 오아시스',
    traitDesc: '황금 피라미드 성역 · 신전 오아시스 물웅덩이에서 초당 +3 HP 치유',
    gravityMult: 1.0,
    moveSpeedMult: 1.0,
    cooldownSpeedMult: 1.04,
    poolRegenPerSec: 3.0,
    accentHex: '#d97706',
    groundStyle: 'grass',
    groundTint: 0xe2c792,
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
    worldRadius: 48,
  },
  orbital_reactor: {
    id: 'orbital_reactor',
    name: '궤도 원자로',
    englishName: 'ORBITAL REACTOR',
    badge: '우주',
    category: 'cosmic',
    description: '중앙 코어 링 브릿지와 4방향 플라즈마 냉각탑을 점프 패드로 넘나드는 복합 기지',
    traitName: '제로-G 플라즈마 코어',
    traitDesc: '우주 저중력(0.80x) 토카막 코어 · 스킬 쿨타임 +12% & 고공 도약전',
    gravityMult: 0.8,
    moveSpeedMult: 1.02,
    cooldownSpeedMult: 1.12,
    poolRegenPerSec: 0,
    accentHex: '#6366f1',
    groundStyle: 'asphalt',
    groundTint: 0x334155,
    ringPrimary: 0xa855f7,
    ringEmissive: 0x7e22ce,
    groundColor: 0x475569,
    skyTop: '#1e1b4b',
    skyMid: '#4338ca',
    skyHorizon: '#c7d2fe',
    skyBottom: '#312e81',
    fogColor: 0xc7d2fe,
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
    description: '현무암 계단 능선과 흑요석 분화구 림 브릿지가 겹치는 고열 전장',
    traitName: '칼데라 마그마 분출',
    traitDesc: '분화구 상승 기류(중력 0.92x) · 대각 마그마 웅덩이 & 고탄성 간헐천 패드',
    gravityMult: 0.92,
    moveSpeedMult: 1.0,
    cooldownSpeedMult: 1.05,
    poolRegenPerSec: 0,
    accentHex: '#ea580c',
    groundStyle: 'asphalt',
    groundTint: 0x57534e,
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
    worldRadius: 48,
  },
  bamboo_sanctuary: {
    id: 'bamboo_sanctuary',
    name: '대나무 성소',
    englishName: 'BAMBOO SANCTUARY',
    badge: '성소',
    category: 'nature',
    description: '초록 계단식 정원과 목재 누각 브릿지가 교차하는 평화로운 고지대 사원',
    traitName: '검선(劍仙) 대나무 풍림',
    traitDesc: '경공술 질풍(+5% 이속) · 대나무 정원 연못에서 초당 +3.5 HP 치유',
    gravityMult: 0.95,
    moveSpeedMult: 1.05,
    cooldownSpeedMult: 1.0,
    poolRegenPerSec: 3.5,
    accentHex: '#15803d',
    groundStyle: 'grass',
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
    worldRadius: 48,
  },
  neon_downtown: {
    id: 'neon_downtown',
    name: '네온 다운타운',
    englishName: 'NEON DOWNTOWN',
    badge: '도시',
    category: 'industrial',
    description: '고층 빌딩 옥상 스카이브릿지와 시가지 컨테이너 골목이 이어진 도심 전장',
    traitName: '루프탑 시티러너',
    traitDesc: '마천루 네온 스트리트 · 도심 파쿠르(+8% 이속) & 전진형 환풍구 부스터',
    gravityMult: 1.0,
    moveSpeedMult: 1.08,
    cooldownSpeedMult: 1.0,
    poolRegenPerSec: 0,
    accentHex: '#0ea5e9',
    groundStyle: 'asphalt',
    groundTint: 0x64748b,
    ringPrimary: 0x38bdf8,
    ringEmissive: 0x0369a1,
    groundColor: 0x334155,
    skyTop: '#0f172a',
    skyMid: '#1e3a8a',
    skyHorizon: '#bae6fd',
    skyBottom: '#334155',
    fogColor: 0xbae6fd,
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
    description: '산호빛 빙정 신전과 대칭 아쿠아 다리, 황금 포세이돈 첨탑이 솟은 고대 수중 유적',
    traitName: '포세이돈 삼지창 성역',
    traitDesc: '해저 부력(중력 0.86x) · 아쿠아 성수 연못에서 초당 +3 HP & 심해 간헐천',
    gravityMult: 0.86,
    moveSpeedMult: 1.02,
    cooldownSpeedMult: 1.0,
    poolRegenPerSec: 3.0,
    accentHex: '#0d9488',
    groundStyle: 'asphalt',
    groundTint: 0x99f6e4,
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
    worldRadius: 48,
  },
  clockwork_tower: {
    id: 'clockwork_tower',
    name: '시계탑 기어',
    englishName: 'CLOCKWORK TOWER',
    badge: '기계',
    category: 'industrial',
    description: '황동 대교와 다단 기어 데크, 상층부 펜듈럼 브릿지가 엇갈리는 스팀펑크 요새',
    traitName: '크로노 대시계 태엽',
    traitDesc: '시간 가속 톱니바퀴 · 모든 스킬/대쉬 쿨타임 회복 +22% 부스트!',
    gravityMult: 1.0,
    moveSpeedMult: 1.02,
    cooldownSpeedMult: 1.22,
    poolRegenPerSec: 0,
    accentHex: '#b45309',
    groundStyle: 'asphalt',
    groundTint: 0x78716c,
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
    description: '모래사암 오아시스 성벽과 쌍둥이 스핑크스 망루, 공중 사원 다리가 있는 사막 아레나',
    traitName: '신기루 쌍둥이 오아시스',
    traitDesc: '사막 열풍 기동(+4% 이속) · 남북 오아시스 샘물 초당 +3 HP 치유',
    gravityMult: 1.0,
    moveSpeedMult: 1.04,
    cooldownSpeedMult: 1.0,
    poolRegenPerSec: 3.0,
    accentHex: '#eab308',
    groundStyle: 'grass',
    groundTint: 0xfde68a,
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
    description: '거대 자수정 결정 기둥과 흑요석 단차 다리가 얽힌 빛나는 크리스탈 아레나',
    traitName: '에코 크리스탈 공명',
    traitDesc: '자수정 마력 공명 · 스킬 쿨타임 +15% 가속 & 크리스탈 프리즘 패드',
    gravityMult: 0.96,
    moveSpeedMult: 1.0,
    cooldownSpeedMult: 1.15,
    poolRegenPerSec: 0,
    accentHex: '#9333ea',
    groundStyle: 'asphalt',
    groundTint: 0x581c87,
    ringPrimary: 0xc084fc,
    ringEmissive: 0x7e22ce,
    groundColor: 0x3b0764,
    skyTop: '#1e1b4b',
    skyMid: '#6b21a8',
    skyHorizon: '#e9d5ff',
    skyBottom: '#3b0764',
    fogColor: 0xe9d5ff,
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
    description: '목조 오층 누각 주변을 따라 도는 다층 회랑과 자수정 벚꽃 정원 아레나',
    traitName: '천년 벚꽃 연못',
    traitDesc: '만개한 사쿠라 정원 · 벚꽃 연못에서 초당 +4 HP 최고 수준 자연 치유',
    gravityMult: 0.96,
    moveSpeedMult: 1.02,
    cooldownSpeedMult: 1.0,
    poolRegenPerSec: 4.0,
    accentHex: '#ec4899',
    groundStyle: 'grass',
    groundTint: 0xfbcfe8,
    ringPrimary: 0xf472b6,
    ringEmissive: 0xbe185d,
    groundColor: 0x86efac,
    skyTop: '#3b82f6',
    skyMid: '#93c5fd',
    skyHorizon: '#fce7f3',
    skyBottom: '#fbcfe8',
    fogColor: 0xfce7f3,
    sunColor: 0xfff1f2,
    ambientSky: 0xfbcfe8,
    ambientGround: 0x831843,
    worldRadius: 48,
  },
  obsidian_keep: {
    id: 'obsidian_keep',
    name: '흑요석 요새',
    englishName: 'OBSIDIAN KEEP',
    badge: '요새',
    category: 'citadel',
    description: '4면 성벽 보루와 중앙 공중 성채 다리로 겹겹이 방어된 중세 흑요석 성곽',
    traitName: '엔드 드래곤 성채',
    traitDesc: '엔더 크리스탈 탑(중력 0.90x) · 쿨타임 +10% & 성채 용암 해자 함정',
    gravityMult: 0.9,
    moveSpeedMult: 1.0,
    cooldownSpeedMult: 1.1,
    poolRegenPerSec: 0,
    accentHex: '#4f46e5',
    groundStyle: 'asphalt',
    groundTint: 0x312e81,
    ringPrimary: 0x818cf8,
    ringEmissive: 0x4338ca,
    groundColor: 0x1e1b4b,
    skyTop: '#090d16',
    skyMid: '#312e81',
    skyHorizon: '#c7d2fe',
    skyBottom: '#1e1b4b',
    fogColor: 0xc7d2fe,
    sunColor: 0xe0e7ff,
    ambientSky: 0xa5b4fc,
    ambientGround: 0x1e1b4b,
    worldRadius: 48,
  },
  solar_observatory: {
    id: 'solar_observatory',
    name: '태양 관측소',
    englishName: 'SOLAR OBSERVATORY',
    badge: '천문',
    category: 'cosmic',
    description: '황금 천문 링 브릿지와 대리석 관측 타워가 웅장하게 솟은 고지대 관측소',
    traitName: '천구의 성좌 관측',
    traitDesc: '거대 황금 혼천의 궤도 · 성간 저중력(0.85x) & 태양 렌즈 도약 패드',
    gravityMult: 0.85,
    moveSpeedMult: 1.02,
    cooldownSpeedMult: 1.05,
    poolRegenPerSec: 0,
    accentHex: '#f59e0b',
    groundStyle: 'asphalt',
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
    worldRadius: 48,
  },
  toxic_refinery: {
    id: 'toxic_refinery',
    name: '독성 정제소',
    englishName: 'TOXIC REFINERY',
    badge: '플랜트',
    category: 'industrial',
    description: '청록 정제 파이프 다리와 화학 저장 컨테이너 2층 통로가 얽힌 산업 플랜트',
    traitName: '케미컬 가압 플랜트',
    traitDesc: '반응로 촉진제(+5% 이속, +10% 쿨감) & 화학 고열 반응 웅덩이',
    gravityMult: 1.0,
    moveSpeedMult: 1.05,
    cooldownSpeedMult: 1.1,
    poolRegenPerSec: 0,
    accentHex: '#10b981',
    groundStyle: 'asphalt',
    groundTint: 0x3f6212,
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
    description: '구름 위 3단 공중 회랑과 순백의 스카이 첨탑을 넘나드는 최상위 공중전 아레나',
    traitName: '천공 발할라 저중력',
    traitDesc: '극한 저중력(0.76x) + 초고공 상승 패드(23.5) · 최강의 공중전 & 철퇴 스매시!',
    gravityMult: 0.76,
    moveSpeedMult: 1.03,
    cooldownSpeedMult: 1.08,
    poolRegenPerSec: 0,
    accentHex: '#7c3aed',
    groundStyle: 'asphalt',
    groundTint: 0xf1f5f9,
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

/**
 * Valorant-style Tactical Prefab Helpers
 */
function addValorantChokeGate(
  blocks: ArenaBlock[],
  id: string,
  x: number,
  z: number,
  facingAxis: 'x' | 'z',
  gapHalf: number,
  height: number,
  wallKind: ArenaBlock['kind'],
  lintelKind: ArenaBlock['kind']
) {
  if (facingAxis === 'x') {
    blocks.push(
      { id: `${id}_p1`, x, y: 0, z: z - gapHalf - 1.2, w: 2.4, h: height, d: 2.4, kind: wallKind },
      { id: `${id}_p2`, x, y: 0, z: z + gapHalf + 1.2, w: 2.4, h: height, d: 2.4, kind: wallKind },
      { id: `${id}_top`, x, y: height, z, w: 2.8, h: 1.2, d: gapHalf * 2 + 4.8, kind: lintelKind }
    );
  } else {
    blocks.push(
      { id: `${id}_p1`, x: x - gapHalf - 1.2, y: 0, z, w: 2.4, h: height, d: 2.4, kind: wallKind },
      { id: `${id}_p2`, x: x + gapHalf + 1.2, y: 0, z, w: 2.4, h: height, d: 2.4, kind: wallKind },
      { id: `${id}_top`, x, y: height, z, w: gapHalf * 2 + 4.8, h: 1.2, d: 2.8, kind: lintelKind }
    );
  }
}

function addValorantSiteBoxCluster(
  blocks: ArenaBlock[],
  id: string,
  x: number,
  z: number,
  dirX: 1 | -1,
  dirZ: 1 | -1,
  tallKind: ArenaBlock['kind'],
  crateKind: ArenaBlock['kind']
) {
  blocks.push(
    // Tall 3.1m radianite/cargo stack
    { id: `${id}_tall`, x, y: 0, z, w: 2.5, h: 3.1, d: 2.5, kind: tallKind },
    // Step-up waist-high crate (1.55m) for off-angle jumps & crouch peek
    { id: `${id}_low`, x: x + dirX * 2.55, y: 0, z, w: 2.2, h: 1.55, d: 2.2, kind: crateKind },
    // Diagonal headglitch box (1.35m)
    { id: `${id}_peek`, x, y: 0, z: z + dirZ * 2.65, w: 2.1, h: 1.35, d: 2.1, kind: crateKind }
  );
}

function addValorantHeavenBalcony(
  blocks: ArenaBlock[],
  id: string,
  x: number,
  z: number,
  w: number,
  d: number,
  height: number,
  deckKind: ArenaBlock['kind'],
  parapetKind: ArenaBlock['kind'],
  stairDir: 'posX' | 'negX' | 'posZ' | 'negZ',
  parapetSide: 'posX' | 'negX' | 'posZ' | 'negZ'
) {
  blocks.push({ id: `${id}_deck`, x, y: 0, z, w, h: height, d, kind: deckKind });

  // Waist-high front parapet on Heaven overlooking site (leaves flank openings on ends)
  if (parapetSide === 'posX' || parapetSide === 'negX') {
    const px = x + (parapetSide === 'posX' ? w * 0.5 - 0.45 : -w * 0.5 + 0.45);
    blocks.push({ id: `${id}_para`, x: px, y: height, z, w: 0.9, h: 1.15, d: Math.max(2.0, d - 2.4), kind: parapetKind });
  } else {
    const pz = z + (parapetSide === 'posZ' ? d * 0.5 - 0.45 : -d * 0.5 + 0.45);
    blocks.push({ id: `${id}_para`, x, y: height, z: pz, w: Math.max(2.0, w - 2.4), h: 1.15, d: 0.9, kind: parapetKind });
  }

  // 3-step walkable ramp leading up to Heaven
  const stepH = height / 3;
  for (let i = 0; i < 3; i++) {
    const t = i + 1;
    const h = height - i * stepH;
    const sx =
      stairDir === 'posX'
        ? x + w * 0.5 + t * 1.9 - 0.95
        : stairDir === 'negX'
          ? x - w * 0.5 - t * 1.9 + 0.95
          : x;
    const sz =
      stairDir === 'posZ'
        ? z + d * 0.5 + t * 1.9 - 0.95
        : stairDir === 'negZ'
          ? z - d * 0.5 - t * 1.9 + 0.95
          : z;
    blocks.push({
      id: `${id}_st_${i}`,
      x: sx,
      y: 0,
      z: sz,
      w: stairDir === 'posX' || stairDir === 'negX' ? 1.9 : 3.2,
      h,
      d: stairDir === 'posZ' || stairDir === 'negZ' ? 1.9 : 3.2,
      kind: parapetKind,
    });
  }
}

function addValorantMidControlGrid(
  blocks: ArenaBlock[],
  prefix: string,
  wallKind: ArenaBlock['kind'],
  crateKind: ArenaBlock['kind'],
  trimKind: ArenaBlock['kind']
) {
  // Inner Mid L-Walls & Peek Boxes — tight tactical corners keeping (0,0) and (0,±9) clear!
  blocks.push(
    // NW Mid L-corner screen
    { id: `${prefix}_ml_nw1`, x: -6.8, y: 0, z: -6.2, w: 3.4, h: 2.9, d: 1.3, kind: wallKind },
    { id: `${prefix}_ml_nw2`, x: -7.8, y: 0, z: -4.4, w: 1.3, h: 2.9, d: 2.6, kind: wallKind },
    { id: `${prefix}_mc_nw`, x: -4.6, y: 0, z: -4.5, w: 1.7, h: 1.4, d: 1.7, kind: crateKind },

    // SE Mid L-corner screen (symmetric diagonal)
    { id: `${prefix}_ml_se1`, x: 6.8, y: 0, z: 6.2, w: 3.4, h: 2.9, d: 1.3, kind: wallKind },
    { id: `${prefix}_ml_se2`, x: 7.8, y: 0, z: 4.4, w: 1.3, h: 2.9, d: 2.6, kind: wallKind },
    { id: `${prefix}_mc_se`, x: 4.6, y: 0, z: 4.5, w: 1.7, h: 1.4, d: 1.7, kind: crateKind },

    // NE & SW Mid sightline half-walls & crouch boxes
    { id: `${prefix}_mw_ne`, x: 6.6, y: 0, z: -6.0, w: 1.5, h: 2.4, d: 3.2, kind: trimKind },
    { id: `${prefix}_mc_ne`, x: 4.7, y: 0, z: -4.8, w: 1.6, h: 1.35, d: 1.6, kind: crateKind },
    { id: `${prefix}_mw_sw`, x: -6.6, y: 0, z: 6.0, w: 1.5, h: 2.4, d: 3.2, kind: trimKind },
    { id: `${prefix}_mc_sw`, x: -4.7, y: 0, z: 4.8, w: 1.6, h: 1.35, d: 1.6, kind: crateKind }
  );
}

/**
 * Compact Perimeter Enclosure: outer walls + walkable 2nd-floor perimeter catwalks + 4 corner towers + ramps.
 * Eliminates empty "hollow" horizon space and creates tight Valorant-style multi-level sightlines.
 */
function addCompactPerimeterEnclosure(
  blocks: ArenaBlock[],
  prefix: string,
  radius: number,
  wallKind: ArenaBlock['kind'],
  walkKind: ArenaBlock['kind'],
  parapetKind: ArenaBlock['kind'],
  towerKind: ArenaBlock['kind']
) {
  const wallR = Math.max(36, radius - 3);
  const catR = wallR - 2.9;
  const span = wallR * 2 - 4;
  const catSpan = catR * 2 - 5;

  blocks.push(
    // 4 Continuous Outer Fortress Walls (height 6.4m)
    { id: `${prefix}_enc_n`, x: 0, y: 0, z: -wallR, w: span, h: 6.4, d: 2.2, kind: wallKind },
    { id: `${prefix}_enc_s`, x: 0, y: 0, z: wallR, w: span, h: 6.4, d: 2.2, kind: wallKind },
    { id: `${prefix}_enc_w`, x: -wallR, y: 0, z: 0, w: 2.2, h: 6.4, d: span, kind: wallKind },
    { id: `${prefix}_enc_e`, x: wallR, y: 0, z: 0, w: 2.2, h: 6.4, d: span, kind: wallKind },

    // Continuous 2nd-Floor Perimeter Walkways (height 3.0m, 3.4m wide)
    { id: `${prefix}_cat_n`, x: 0, y: 0, z: -catR, w: catSpan, h: 3.0, d: 3.4, kind: walkKind },
    { id: `${prefix}_cat_s`, x: 0, y: 0, z: catR, w: catSpan, h: 3.0, d: 3.4, kind: walkKind },
    { id: `${prefix}_cat_w`, x: -catR, y: 0, z: 0, w: 3.4, h: 3.0, d: catSpan, kind: walkKind },
    { id: `${prefix}_cat_e`, x: catR, y: 0, z: 0, w: 3.4, h: 3.0, d: catSpan, kind: walkKind },

    // Parapet Cover Blocks on 2nd Floor Walkway
    { id: `${prefix}_par_n1`, x: -10, y: 3.0, z: -(catR - 1.25), w: 4.0, h: 1.05, d: 0.85, kind: parapetKind },
    { id: `${prefix}_par_n2`, x: 10, y: 3.0, z: -(catR - 1.25), w: 4.0, h: 1.05, d: 0.85, kind: parapetKind },
    { id: `${prefix}_par_s1`, x: -10, y: 3.0, z: catR - 1.25, w: 4.0, h: 1.05, d: 0.85, kind: parapetKind },
    { id: `${prefix}_par_s2`, x: 10, y: 3.0, z: catR - 1.25, w: 4.0, h: 1.05, d: 0.85, kind: parapetKind },
    { id: `${prefix}_par_w1`, x: -(catR - 1.25), y: 3.0, z: -10, w: 0.85, h: 1.05, d: 4.0, kind: parapetKind },
    { id: `${prefix}_par_w2`, x: -(catR - 1.25), y: 3.0, z: 10, w: 0.85, h: 1.05, d: 4.0, kind: parapetKind },
    { id: `${prefix}_par_e1`, x: catR - 1.25, y: 3.0, z: -10, w: 0.85, h: 1.05, d: 4.0, kind: parapetKind },
    { id: `${prefix}_par_e2`, x: catR - 1.25, y: 3.0, z: 10, w: 0.85, h: 1.05, d: 4.0, kind: parapetKind },

    // 4 Corner Watchtowers framing the perimeter skyline
    { id: `${prefix}_tw_nw`, x: -(wallR - 2.6), y: 0, z: -(wallR - 2.6), w: 5.2, h: 7.4, d: 5.2, kind: towerKind },
    { id: `${prefix}_tw_ne`, x: wallR - 2.6, y: 0, z: -(wallR - 2.6), w: 5.2, h: 7.4, d: 5.2, kind: towerKind },
    { id: `${prefix}_tw_sw`, x: -(wallR - 2.6), y: 0, z: wallR - 2.6, w: 5.2, h: 7.4, d: 5.2, kind: towerKind },
    { id: `${prefix}_tw_se`, x: wallR - 2.6, y: 0, z: wallR - 2.6, w: 5.2, h: 7.4, d: 5.2, kind: towerKind }
  );

  // 4 Walkable Ramps ascending onto the 2nd-floor perimeter walkways
  addSteps(blocks, `${prefix}_enc_st_n`, -14, -(catR - 4.8), 0, -1, 3, 1.0, 3.0, 1.4, walkKind);
  addSteps(blocks, `${prefix}_enc_st_s`, 14, catR - 4.8, 0, 1, 3, 1.0, 3.0, 1.4, walkKind);
  addSteps(blocks, `${prefix}_enc_st_w`, -(catR - 4.8), 14, -1, 0, 3, 1.0, 1.4, 3.0, walkKind);
  addSteps(blocks, `${prefix}_enc_st_e`, catR - 4.8, -14, 1, 0, 3, 1.0, 1.4, 3.0, walkKind);
}

/**
 * Map 1: Container Yard (컨테이너 야드 — Split/Icebox-style compact enclosed port sites)
 */
function buildContainerYardBlocks(): ArenaBlock[] {
  const blocks: ArenaBlock[] = [];

  // Mid Control Boxes & L-Containers (clears (0,0) & (0,±9.5))
  addValorantMidControlGrid(blocks, 'cy', 'container_amber', 'wood_crate', 'deepslate');

  // A-Site (West Harbor Sector) — Stacked Containers + Heaven Balcony + Choke Gate
  addContainer(blocks, 'cy_c_w1', -15, 0, -6.5, 3.6, 3.0, 8.5, 'container_red');
  addContainer(blocks, 'cy_c_w2', -15, 0, 7.0, 3.6, 3.0, 8.5, 'container_amber');
  addContainer(blocks, 'cy_c_w_top', -15, 3.0, 0.2, 3.6, 2.8, 7.6, 'container_blue');
  addSteps(blocks, 'cy_ramp_w', -11.4, -8.5, 0, 1, 4, 0.75, 2.4, 1.8, 'wood_crate');
  addValorantChokeGate(blocks, 'cy_gate_a', -21, -12, 'z', 2.8, 4.4, 'deepslate', 'container_teal');
  addValorantSiteBoxCluster(blocks, 'cy_abox', -26, 4.5, 1, -1, 'container_red', 'wood_crate');
  addValorantHeavenBalcony(blocks, 'cy_heav_a', -31, -2, 6.0, 10, 4.4, 'deepslate', 'container_amber', 'negZ', 'posX');

  // B-Site (East Harbor Sector) — Symmetrical B Container Cluster + Heaven Deck + Choke Gate
  addContainer(blocks, 'cy_c_e1', 15, 0, 6.5, 3.6, 3.0, 8.5, 'container_blue');
  addContainer(blocks, 'cy_c_e2', 15, 0, -7.0, 3.6, 3.0, 8.5, 'container_teal');
  addContainer(blocks, 'cy_c_e_top', 15, 3.0, -0.2, 3.6, 2.8, 7.6, 'container_red');
  addSteps(blocks, 'cy_ramp_e', 11.4, 8.5, 0, -1, 4, 0.75, 2.4, 1.8, 'wood_crate');
  addValorantChokeGate(blocks, 'cy_gate_b', 21, 12, 'z', 2.8, 4.4, 'deepslate', 'container_amber');
  addValorantSiteBoxCluster(blocks, 'cy_bbox', 26, -4.5, -1, 1, 'container_blue', 'wood_crate');
  addValorantHeavenBalcony(blocks, 'cy_heav_b', 31, 2, 6.0, 10, 4.4, 'deepslate', 'container_teal', 'posZ', 'negX');

  // Overhead Cross-Yard Gantry Overpass above clear (0,0)
  blocks.push(
    { id: 'cy_overpass_mid', x: 0, y: 5.8, z: 0, w: 27, h: 0.75, d: 3.6, kind: 'deepslate' },
    { id: 'cy_overpass_pillar_w', x: -10.5, y: 0, z: 0, w: 1.6, h: 5.8, d: 1.6, kind: 'deepslate' },
    { id: 'cy_overpass_pillar_e', x: 10.5, y: 0, z: 0, w: 1.6, h: 5.8, d: 1.6, kind: 'deepslate' },
    { id: 'cy_overpass_cov_l', x: -4.5, y: 6.55, z: -0.9, w: 1.8, h: 1.05, d: 0.9, kind: 'wood_crate' },
    { id: 'cy_overpass_cov_r', x: 4.5, y: 6.55, z: 0.9, w: 1.8, h: 1.05, d: 0.9, kind: 'wood_crate' }
  );

  // North & South Spawn Corridors & Double-Stack Sniper Bunkers
  addContainer(blocks, 'cy_c_n1', -6.8, 0, -24, 9.5, 3.0, 3.8, 'container_teal');
  addContainer(blocks, 'cy_c_n2', 6.8, 0, -24, 9.5, 3.0, 3.8, 'container_red');
  addContainer(blocks, 'cy_c_n_top', 0, 3.0, -24, 10.5, 2.8, 3.8, 'container_amber');
  addSteps(blocks, 'cy_ramp_n', -12.8, -24, 1, 0, 4, 0.75, 2.4, 1.8, 'deepslate');

  addContainer(blocks, 'cy_c_s1', -6.8, 0, 24, 9.5, 3.0, 3.8, 'container_blue');
  addContainer(blocks, 'cy_c_s2', 6.8, 0, 24, 9.5, 3.0, 3.8, 'container_amber');
  addContainer(blocks, 'cy_c_s_top', 0, 3.0, 24, 10.5, 2.8, 3.8, 'container_teal');
  addSteps(blocks, 'cy_ramp_s', 12.8, 24, -1, 0, 4, 0.75, 2.4, 1.8, 'deepslate');

  // Corner Cargo Stacks + Full Enclosed Perimeter 2nd-Floor Catwalk
  addContainer(blocks, 'cy_out_nw', -33, 0, -26, 3.8, 3.0, 8.0, 'container_amber');
  addContainer(blocks, 'cy_out_ne', 33, 0, -26, 3.8, 3.0, 8.0, 'container_blue');
  addContainer(blocks, 'cy_out_sw', -33, 0, 26, 3.8, 3.0, 8.0, 'container_teal');
  addContainer(blocks, 'cy_out_se', 33, 0, 26, 3.8, 3.0, 8.0, 'container_red');
  addCompactPerimeterEnclosure(blocks, 'cy', 46, 'deepslate', 'container_blue', 'wood_crate', 'container_amber');
  return blocks;
}

/**
 * Map 2: Emerald Citadel (초원 시타델 — Ascent-style double bastion + Heaven catwalks)
 */
function buildEmeraldCitadelBlocks(): ArenaBlock[] {
  const blocks: ArenaBlock[] = [
    { id: 'dais_n', x: 0, y: 0, z: -22, w: 7.5, h: 2.2, d: 6.5, kind: 'deepslate' },
    { id: 'dais_s', x: 0, y: 0, z: 22, w: 7.5, h: 2.2, d: 6.5, kind: 'deepslate' },
    { id: 'step_n1', x: -5.2, y: 0, z: -22, w: 2.4, h: 1.1, d: 3.6, kind: 'stone' },
    { id: 'step_s1', x: 5.2, y: 0, z: 22, w: 2.4, h: 1.1, d: 3.6, kind: 'stone' },

    // Side Bastions & Overhead Citadel Ramparts
    { id: 'ec_wall_w', x: -17.5, y: 0, z: 0, w: 4.2, h: 4.4, d: 15, kind: 'stone' },
    { id: 'ec_wall_e', x: 17.5, y: 0, z: 0, w: 4.2, h: 4.4, d: 15, kind: 'stone' },
    { id: 'ec_bridge_n', x: 0, y: 5.8, z: -15.5, w: 32, h: 0.9, d: 3.6, kind: 'deepslate' },
    { id: 'ec_bridge_s', x: 0, y: 5.8, z: 15.5, w: 32, h: 0.9, d: 3.6, kind: 'deepslate' },

    { id: 'tower_nw', x: -18, y: 0, z: -16, w: 4.4, h: 6.7, d: 4.4, kind: 'obsidian' },
    { id: 'tower_ne', x: 18, y: 0, z: -16, w: 4.4, h: 6.7, d: 4.4, kind: 'obsidian' },
    { id: 'tower_sw', x: -18, y: 0, z: 16, w: 4.4, h: 6.7, d: 4.4, kind: 'obsidian' },
    { id: 'tower_se', x: 18, y: 0, z: 16, w: 4.4, h: 6.7, d: 4.4, kind: 'obsidian' },

    { id: 'step_nw1', x: -14.6, y: 0, z: -16, w: 2.2, h: 3.4, d: 3.2, kind: 'deepslate' },
    { id: 'step_nw2', x: -12.4, y: 0, z: -16, w: 2.2, h: 1.7, d: 3.2, kind: 'stone' },
    { id: 'step_se1', x: 14.6, y: 0, z: 16, w: 2.2, h: 3.4, d: 3.2, kind: 'deepslate' },
    { id: 'step_se2', x: 12.4, y: 0, z: 16, w: 2.2, h: 1.7, d: 3.2, kind: 'stone' },

    { id: 'spire_w', x: -32, y: 0, z: 0, w: 4.0, h: 11.4, d: 4.0, kind: 'amethyst' },
    { id: 'spire_e', x: 32, y: 0, z: 0, w: 4.0, h: 11.4, d: 4.0, kind: 'amethyst' },
    { id: 'gold_w', x: -32, y: 11.4, z: 0, w: 5.0, h: 1.2, d: 5.0, kind: 'gold' },
    { id: 'gold_e', x: 32, y: 11.4, z: 0, w: 5.0, h: 1.2, d: 5.0, kind: 'gold' },
  ];

  // Dense Valorant Mid L-Walls + Site Boxes + Heaven Balconies
  addValorantMidControlGrid(blocks, 'ec', 'stone', 'turf', 'deepslate');
  addValorantSiteBoxCluster(blocks, 'ec_abox', -25, 3.5, 1, -1, 'obsidian', 'stone');
  addValorantSiteBoxCluster(blocks, 'ec_bbox', 25, -3.5, -1, 1, 'amethyst', 'stone');
  addValorantChokeGate(blocks, 'ec_gate_n', 0, -14, 'z', 3.4, 4.6, 'stone', 'gold');
  addValorantChokeGate(blocks, 'ec_gate_s', 0, 14, 'z', 3.4, 4.6, 'stone', 'gold');
  addValorantHeavenBalcony(blocks, 'ec_heav_w', -28, -9, 6.0, 9.5, 4.4, 'deepslate', 'stone', 'posZ', 'posX');
  addValorantHeavenBalcony(blocks, 'ec_heav_e', 28, 9, 6.0, 9.5, 4.4, 'deepslate', 'stone', 'negZ', 'negX');

  // Enclosed Perimeter Courtyard Bastions + 2nd-Floor Walkway
  addCompactPerimeterEnclosure(blocks, 'ec', 50, 'stone', 'deepslate', 'turf', 'obsidian');
  return blocks;
}

/**
 * Map 3: Sky Dock (스카이 도크 — High runway piers, underpasses, cargo sites)
 */
function buildSkyDockBlocks(): ArenaBlock[] {
  const blocks: ArenaBlock[] = [
    { id: 'sd_pier_w', x: -13, y: 0, z: 0, w: 5.5, h: 2.8, d: 28, kind: 'deepslate' },
    { id: 'sd_pier_e', x: 13, y: 0, z: 0, w: 5.5, h: 2.8, d: 28, kind: 'deepslate' },
    { id: 'sd_bridge_n', x: 0, y: 0, z: -17, w: 22, h: 2.8, d: 4.8, kind: 'stone' },
    { id: 'sd_bridge_s', x: 0, y: 0, z: 17, w: 22, h: 2.8, d: 4.8, kind: 'stone' },
    { id: 'sd_sky_arch', x: 0, y: 6.2, z: 0, w: 26, h: 0.9, d: 3.6, kind: 'gold' },
    { id: 'sd_pier_cov_w1', x: -13, y: 2.8, z: -6.5, w: 2.0, h: 1.6, d: 2.4, kind: 'container_blue' },
    { id: 'sd_pier_cov_w2', x: -13, y: 2.8, z: 6.5, w: 2.0, h: 1.6, d: 2.4, kind: 'container_teal' },
    { id: 'sd_pier_cov_e1', x: 13, y: 2.8, z: 6.5, w: 2.0, h: 1.6, d: 2.4, kind: 'container_teal' },
    { id: 'sd_pier_cov_e2', x: 13, y: 2.8, z: -6.5, w: 2.0, h: 1.6, d: 2.4, kind: 'container_blue' },
    { id: 'sd_ramp_nw', x: -7.8, y: 0, z: -8, w: 3.5, h: 1.5, d: 3.5, kind: 'wood_crate' },
    { id: 'sd_ramp_se', x: 7.8, y: 0, z: 8, w: 3.5, h: 1.5, d: 3.5, kind: 'wood_crate' },
    { id: 'sd_ramp_ne', x: 7.8, y: 0, z: -8, w: 3.5, h: 1.5, d: 3.5, kind: 'wood_crate' },
    { id: 'sd_ramp_sw', x: -7.8, y: 0, z: 8, w: 3.5, h: 1.5, d: 3.5, kind: 'wood_crate' },
    { id: 'sd_tower_w', x: -25, y: 0, z: 0, w: 5.0, h: 10.0, d: 5.0, kind: 'container_blue' },
    { id: 'sd_tower_e', x: 25, y: 0, z: 0, w: 5.0, h: 10.0, d: 5.0, kind: 'container_teal' },
    { id: 'sd_deck_w', x: -25, y: 10.0, z: 0, w: 9.0, h: 1.0, d: 9.0, kind: 'gold' },
    { id: 'sd_deck_e', x: 25, y: 10.0, z: 0, w: 9.0, h: 1.0, d: 9.0, kind: 'gold' },
    { id: 'sd_float_n', x: 0, y: 6.9, z: -28, w: 9.5, h: 1.2, d: 7.5, kind: 'amethyst' },
    { id: 'sd_float_s', x: 0, y: 6.9, z: 28, w: 9.5, h: 1.2, d: 7.5, kind: 'amethyst' },
  ];
  addValorantMidControlGrid(blocks, 'sd', 'container_blue', 'wood_crate', 'stone');
  addValorantSiteBoxCluster(blocks, 'sd_abox', -24, -10, 1, 1, 'container_blue', 'wood_crate');
  addValorantSiteBoxCluster(blocks, 'sd_bbox', 24, 10, -1, -1, 'container_teal', 'wood_crate');
  addValorantChokeGate(blocks, 'sd_gate_w', -18, 10, 'x', 2.6, 4.4, 'deepslate', 'gold');
  addValorantChokeGate(blocks, 'sd_gate_e', 18, -10, 'x', 2.6, 4.4, 'deepslate', 'gold');
  addCompactPerimeterEnclosure(blocks, 'sd', 46, 'deepslate', 'stone', 'container_blue', 'gold');
  return blocks;
}

/**
 * Map 4: Crimson Foundry (크림슨 제련소)
 */
function buildNetherFoundryBlocks(): ArenaBlock[] {
  const blocks: ArenaBlock[] = [
    { id: 'nf_forge_w', x: -14, y: 0, z: 0, w: 4.8, h: 4.0, d: 17, kind: 'basalt' },
    { id: 'nf_forge_e', x: 14, y: 0, z: 0, w: 4.8, h: 4.0, d: 17, kind: 'basalt' },
    { id: 'nf_brick_n', x: 0, y: 0, z: -18, w: 14, h: 3.4, d: 4.5, kind: 'crimson_brick' },
    { id: 'nf_brick_s', x: 0, y: 0, z: 18, w: 14, h: 3.4, d: 4.5, kind: 'crimson_brick' },
    { id: 'nf_high_bridge_n', x: 0, y: 6.4, z: -22, w: 38, h: 0.9, d: 3.6, kind: 'gold' },
    { id: 'nf_high_bridge_s', x: 0, y: 6.4, z: 22, w: 38, h: 0.9, d: 3.6, kind: 'gold' },
    { id: 'nf_step_w1', x: -10.0, y: 0, z: -5, w: 2.5, h: 2.0, d: 3.0, kind: 'basalt' },
    { id: 'nf_step_e1', x: 10.0, y: 0, z: 5, w: 2.5, h: 2.0, d: 3.0, kind: 'basalt' },
    { id: 'nf_smelt_nw', x: -26, y: 0, z: -22, w: 5.5, h: 9.0, d: 5.5, kind: 'obsidian' },
    { id: 'nf_smelt_ne', x: 26, y: 0, z: -22, w: 5.5, h: 9.0, d: 5.5, kind: 'obsidian' },
    { id: 'nf_smelt_sw', x: -26, y: 0, z: 22, w: 5.5, h: 9.0, d: 5.5, kind: 'obsidian' },
    { id: 'nf_smelt_se', x: 26, y: 0, z: 22, w: 5.5, h: 9.0, d: 5.5, kind: 'obsidian' },
    { id: 'nf_cap_nw', x: -26, y: 9.0, z: -22, w: 7.5, h: 1.0, d: 7.5, kind: 'gold' },
    { id: 'nf_cap_ne', x: 26, y: 9.0, z: -22, w: 7.5, h: 1.0, d: 7.5, kind: 'gold' },
    { id: 'nf_cap_sw', x: -26, y: 9.0, z: 22, w: 7.5, h: 1.0, d: 7.5, kind: 'gold' },
    { id: 'nf_cap_se', x: 26, y: 9.0, z: 22, w: 7.5, h: 1.0, d: 7.5, kind: 'gold' },
  ];
  addValorantMidControlGrid(blocks, 'nf', 'crimson_brick', 'basalt', 'gold');
  addValorantSiteBoxCluster(blocks, 'nf_abox', -24, 4.5, 1, -1, 'obsidian', 'crimson_brick');
  addValorantSiteBoxCluster(blocks, 'nf_bbox', 24, -4.5, -1, 1, 'obsidian', 'crimson_brick');
  addValorantChokeGate(blocks, 'nf_gate_w', -19, -11, 'z', 2.8, 4.6, 'basalt', 'gold');
  addValorantChokeGate(blocks, 'nf_gate_e', 19, 11, 'z', 2.8, 4.6, 'basalt', 'gold');
  addValorantHeavenBalcony(blocks, 'nf_heav_w', -30, -8, 6.0, 9.0, 4.4, 'basalt', 'crimson_brick', 'posZ', 'posX');
  addValorantHeavenBalcony(blocks, 'nf_heav_e', 30, 8, 6.0, 9.0, 4.4, 'basalt', 'crimson_brick', 'negZ', 'negX');
  addCompactPerimeterEnclosure(blocks, 'nf', 46, 'basalt', 'crimson_brick', 'gold', 'obsidian');
  return blocks;
}

/**
 * Map 5: Cyber Nexus (사이버 넥서스)
 */
function buildCyberNexusBlocks(): ArenaBlock[] {
  const blocks: ArenaBlock[] = [
    { id: 'cn_bank_w', x: -16, y: 0, z: 0, w: 5.0, h: 3.6, d: 21, kind: 'cyber_panel' },
    { id: 'cn_bank_e', x: 16, y: 0, z: 0, w: 5.0, h: 3.6, d: 21, kind: 'cyber_panel' },
    { id: 'cn_ramp_w_n', x: -16, y: 0, z: -12.5, w: 4.2, h: 1.8, d: 3.5, kind: 'deepslate' },
    { id: 'cn_ramp_e_s', x: 16, y: 0, z: 12.5, w: 4.2, h: 1.8, d: 3.5, kind: 'deepslate' },
    { id: 'cn_skywalk_n', x: 0, y: 5.4, z: -15, w: 28, h: 0.85, d: 3.8, kind: 'cyber_panel' },
    { id: 'cn_skywalk_s', x: 0, y: 5.4, z: 15, w: 28, h: 0.85, d: 3.8, kind: 'cyber_panel' },
    { id: 'cn_cross_mid', x: 0, y: 5.4, z: 0, w: 3.8, h: 0.85, d: 28, kind: 'amethyst' },
    { id: 'cn_node_nw', x: -28, y: 0, z: -22, w: 5.2, h: 8.5, d: 5.2, kind: 'cyber_panel' },
    { id: 'cn_node_ne', x: 28, y: 0, z: -22, w: 5.2, h: 8.5, d: 5.2, kind: 'cyber_panel' },
    { id: 'cn_node_sw', x: -28, y: 0, z: 22, w: 5.2, h: 8.5, d: 5.2, kind: 'cyber_panel' },
    { id: 'cn_node_se', x: 28, y: 0, z: 22, w: 5.2, h: 8.5, d: 5.2, kind: 'cyber_panel' },
    { id: 'cn_cap_nw', x: -28, y: 8.5, z: -22, w: 7.5, h: 0.9, d: 7.5, kind: 'reactor_core' },
    { id: 'cn_cap_ne', x: 28, y: 8.5, z: -22, w: 7.5, h: 0.9, d: 7.5, kind: 'reactor_core' },
    { id: 'cn_cap_sw', x: -28, y: 8.5, z: 22, w: 7.5, h: 0.9, d: 7.5, kind: 'reactor_core' },
    { id: 'cn_cap_se', x: 28, y: 8.5, z: 22, w: 7.5, h: 0.9, d: 7.5, kind: 'reactor_core' },
  ];
  addValorantMidControlGrid(blocks, 'cn', 'cyber_panel', 'reactor_core', 'deepslate');
  addValorantSiteBoxCluster(blocks, 'cn_abox', -24, 5.0, 1, -1, 'cyber_panel', 'reactor_core');
  addValorantSiteBoxCluster(blocks, 'cn_bbox', 24, -5.0, -1, 1, 'cyber_panel', 'reactor_core');
  addValorantChokeGate(blocks, 'cn_gate_w', -20, -12, 'z', 2.8, 4.5, 'deepslate', 'reactor_core');
  addValorantChokeGate(blocks, 'cn_gate_e', 20, 12, 'z', 2.8, 4.5, 'deepslate', 'reactor_core');
  addCompactPerimeterEnclosure(blocks, 'cn', 46, 'deepslate', 'cyber_panel', 'reactor_core', 'amethyst');
  return blocks;
}

/**
 * Map 6: Frost Bastion (빙하 요새)
 */
function buildFrostBastionBlocks(): ArenaBlock[] {
  const blocks: ArenaBlock[] = [
    { id: 'fb_keep_n', x: 0, y: 0, z: -22, w: 14, h: 3.2, d: 5.5, kind: 'ice_brick' },
    { id: 'fb_keep_s', x: 0, y: 0, z: 22, w: 14, h: 3.2, d: 5.5, kind: 'ice_brick' },
    addStepBlock('fb_st_n1', -9.0, 0, -22, 3.2, 1.6, 4.0, 'stone'),
    addStepBlock('fb_st_s1', 9.0, 0, 22, 3.2, 1.6, 4.0, 'stone'),
    { id: 'fb_wall_w', x: -17, y: 0, z: 0, w: 4.5, h: 5.2, d: 16, kind: 'ice_brick' },
    { id: 'fb_wall_e', x: 17, y: 0, z: 0, w: 4.5, h: 5.2, d: 16, kind: 'ice_brick' },
    { id: 'fb_bridge_top', x: 0, y: 6.4, z: 0, w: 30, h: 0.9, d: 3.6, kind: 'ice_brick' },
    { id: 'fb_spire_nw', x: -26, y: 0, z: -24, w: 5.0, h: 9.5, d: 5.0, kind: 'deepslate' },
    { id: 'fb_spire_ne', x: 26, y: 0, z: -24, w: 5.0, h: 9.5, d: 5.0, kind: 'deepslate' },
    { id: 'fb_spire_sw', x: -26, y: 0, z: 24, w: 5.0, h: 9.5, d: 5.0, kind: 'deepslate' },
    { id: 'fb_spire_se', x: 26, y: 0, z: 24, w: 5.0, h: 9.5, d: 5.0, kind: 'deepslate' },
    { id: 'fb_cap_nw', x: -26, y: 9.5, z: -24, w: 7.5, h: 1.0, d: 7.5, kind: 'ice_brick' },
    { id: 'fb_cap_ne', x: 26, y: 9.5, z: -24, w: 7.5, h: 1.0, d: 7.5, kind: 'ice_brick' },
    { id: 'fb_cap_sw', x: -26, y: 9.5, z: 24, w: 7.5, h: 1.0, d: 7.5, kind: 'ice_brick' },
    { id: 'fb_cap_se', x: 26, y: 9.5, z: 24, w: 7.5, h: 1.0, d: 7.5, kind: 'ice_brick' },
  ];
  addValorantMidControlGrid(blocks, 'fb', 'ice_brick', 'stone', 'deepslate');
  addValorantSiteBoxCluster(blocks, 'fb_abox', -24, 5.0, 1, -1, 'ice_brick', 'stone');
  addValorantSiteBoxCluster(blocks, 'fb_bbox', 24, -5.0, -1, 1, 'ice_brick', 'stone');
  addValorantHeavenBalcony(blocks, 'fb_heav_w', -30, -8, 6.0, 9.0, 4.4, 'deepslate', 'ice_brick', 'posZ', 'posX');
  addValorantHeavenBalcony(blocks, 'fb_heav_e', 30, 8, 6.0, 9.0, 4.4, 'deepslate', 'ice_brick', 'negZ', 'negX');
  addCompactPerimeterEnclosure(blocks, 'fb', 48, 'deepslate', 'ice_brick', 'stone', 'amethyst');
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
 * Map 7: Ancient Temple (고대 사원 — Ziggurat sites, colonnade Mid & Sun Gate arches)
 */
function buildAncientTempleBlocks(): ArenaBlock[] {
  const blocks: ArenaBlock[] = [
    { id: 'at_zig_w1', x: -20, y: 0, z: 0, w: 9.5, h: 2.0, d: 18, kind: 'sandstone' },
    { id: 'at_zig_w2', x: -20, y: 2.0, z: 0, w: 6.2, h: 2.0, d: 12, kind: 'sandstone' },
    { id: 'at_zig_w3', x: -20, y: 4.0, z: 0, w: 3.8, h: 2.2, d: 6.2, kind: 'gold' },
    { id: 'at_zig_e1', x: 20, y: 0, z: 0, w: 9.5, h: 2.0, d: 18, kind: 'sandstone' },
    { id: 'at_zig_e2', x: 20, y: 2.0, z: 0, w: 6.2, h: 2.0, d: 12, kind: 'sandstone' },
    { id: 'at_zig_e3', x: 20, y: 4.0, z: 0, w: 3.8, h: 2.2, d: 6.2, kind: 'gold' },
    { id: 'at_gate_n', x: 0, y: 0, z: -22, w: 14, h: 3.2, d: 5.5, kind: 'sandstone' },
    { id: 'at_gate_s', x: 0, y: 0, z: 22, w: 14, h: 3.2, d: 5.5, kind: 'sandstone' },
    { id: 'at_lintel_n', x: 0, y: 5.6, z: -22, w: 16, h: 1.1, d: 4.0, kind: 'gold' },
    { id: 'at_lintel_s', x: 0, y: 5.6, z: 22, w: 16, h: 1.1, d: 4.0, kind: 'gold' },
    { id: 'at_ob_nw', x: -30, y: 0, z: -26, w: 4.2, h: 11.0, d: 4.2, kind: 'obsidian' },
    { id: 'at_ob_ne', x: 30, y: 0, z: -26, w: 4.2, h: 11.0, d: 4.2, kind: 'obsidian' },
    { id: 'at_ob_sw', x: -30, y: 0, z: 26, w: 4.2, h: 11.0, d: 4.2, kind: 'obsidian' },
    { id: 'at_ob_se', x: 30, y: 0, z: 26, w: 4.2, h: 11.0, d: 4.2, kind: 'obsidian' },
    { id: 'at_ob_cap_nw', x: -30, y: 11.0, z: -26, w: 6.2, h: 1.0, d: 6.2, kind: 'gold' },
    { id: 'at_ob_cap_ne', x: 30, y: 11.0, z: -26, w: 6.2, h: 1.0, d: 6.2, kind: 'gold' },
    { id: 'at_ob_cap_sw', x: -30, y: 11.0, z: 26, w: 6.2, h: 1.0, d: 6.2, kind: 'gold' },
    { id: 'at_ob_cap_se', x: 30, y: 11.0, z: 26, w: 6.2, h: 1.0, d: 6.2, kind: 'gold' },
  ];
  addValorantMidControlGrid(blocks, 'at', 'sandstone', 'wood_crate', 'gold');
  addValorantChokeGate(blocks, 'at_choke_nw', -12, -13, 'x', 2.6, 4.4, 'sandstone', 'gold');
  addValorantChokeGate(blocks, 'at_choke_se', 12, 13, 'x', 2.6, 4.4, 'sandstone', 'gold');
  addValorantSiteBoxCluster(blocks, 'at_abox', -29, -8, 1, 1, 'sandstone', 'wood_crate');
  addValorantSiteBoxCluster(blocks, 'at_bbox', 29, 8, -1, -1, 'sandstone', 'wood_crate');
  addCompactPerimeterEnclosure(blocks, 'at', 48, 'sandstone', 'deepslate', 'wood_crate', 'gold');
  return blocks;
}

/**
 * Map 8: Orbital Reactor (궤도 원자로)
 */
function buildOrbitalReactorBlocks(): ArenaBlock[] {
  const blocks: ArenaBlock[] = [
    { id: 'or_deck_n', x: 0, y: 0, z: -18, w: 12, h: 3.0, d: 5.5, kind: 'reactor_core' },
    { id: 'or_deck_s', x: 0, y: 0, z: 18, w: 12, h: 3.0, d: 5.5, kind: 'reactor_core' },
    { id: 'or_deck_w', x: -18, y: 0, z: 0, w: 5.5, h: 3.0, d: 12, kind: 'reactor_core' },
    { id: 'or_deck_e', x: 18, y: 0, z: 0, w: 5.5, h: 3.0, d: 12, kind: 'reactor_core' },
    { id: 'or_step_n', x: -7.5, y: 0, z: -18, w: 3.2, h: 1.5, d: 3.8, kind: 'asphalt' },
    { id: 'or_step_s', x: 7.5, y: 0, z: 18, w: 3.2, h: 1.5, d: 3.8, kind: 'asphalt' },
    { id: 'or_step_w', x: -18, y: 0, z: 7.5, w: 3.8, h: 1.5, d: 3.2, kind: 'asphalt' },
    { id: 'or_step_e', x: 18, y: 0, z: -7.5, w: 3.8, h: 1.5, d: 3.2, kind: 'asphalt' },
    { id: 'or_sky_ns', x: 0, y: 6.4, z: 0, w: 3.6, h: 0.9, d: 32, kind: 'cyber_panel' },
    { id: 'or_sky_ew', x: 0, y: 6.4, z: 0, w: 32, h: 0.9, d: 3.6, kind: 'cyber_panel' },
    { id: 'or_pylon_nw', x: -26, y: 0, z: -24, w: 5.5, h: 9.2, d: 5.5, kind: 'reactor_core' },
    { id: 'or_pylon_ne', x: 26, y: 0, z: -24, w: 5.5, h: 9.2, d: 5.5, kind: 'reactor_core' },
    { id: 'or_pylon_sw', x: -26, y: 0, z: 24, w: 5.5, h: 9.2, d: 5.5, kind: 'reactor_core' },
    { id: 'or_pylon_se', x: 26, y: 0, z: 24, w: 5.5, h: 9.2, d: 5.5, kind: 'reactor_core' },
    { id: 'or_cap_nw', x: -26, y: 9.2, z: -24, w: 8.0, h: 0.9, d: 8.0, kind: 'gold' },
    { id: 'or_cap_ne', x: 26, y: 9.2, z: -24, w: 8.0, h: 0.9, d: 8.0, kind: 'gold' },
    { id: 'or_cap_sw', x: -26, y: 9.2, z: 24, w: 8.0, h: 0.9, d: 8.0, kind: 'gold' },
    { id: 'or_cap_se', x: 26, y: 9.2, z: 24, w: 8.0, h: 0.9, d: 8.0, kind: 'gold' },
  ];
  addValorantMidControlGrid(blocks, 'or', 'cyber_panel', 'reactor_core', 'asphalt');
  addValorantSiteBoxCluster(blocks, 'or_abox', -26, 6.0, 1, -1, 'cyber_panel', 'reactor_core');
  addValorantSiteBoxCluster(blocks, 'or_bbox', 26, -6.0, -1, 1, 'cyber_panel', 'reactor_core');
  addValorantChokeGate(blocks, 'or_gate_w', -18, -11, 'z', 2.6, 4.4, 'reactor_core', 'cyber_panel');
  addValorantChokeGate(blocks, 'or_gate_e', 18, 11, 'z', 2.6, 4.4, 'reactor_core', 'cyber_panel');
  addCompactPerimeterEnclosure(blocks, 'or', 46, 'asphalt', 'cyber_panel', 'reactor_core', 'gold');
  return blocks;
}

/**
 * Bespoke Valorant-Style Arena Builder for Maps 9–20 (Each map gets unique macro + dense A/B/Mid sites + enclosed 2F walkways!)
 */
function buildBespokeValorantMap(
  prefix: string,
  wallMat: ArenaBlock['kind'],
  siteMat: ArenaBlock['kind'],
  accentMat: ArenaBlock['kind'],
  crateMat: ArenaBlock['kind'],
  signatureStyle:
    | 'caldera_crater'
    | 'bamboo_pavilions'
    | 'downtown_alleys'
    | 'atlantis_trident'
    | 'clockwork_pendulum'
    | 'mirage_market'
    | 'crystal_grottos'
    | 'cherry_veranda'
    | 'obsidian_citadel'
    | 'solar_rings'
    | 'toxic_vats'
    | 'aether_islands',
  radius = 48
): ArenaBlock[] {
  const blocks: ArenaBlock[] = [];

  // 1. Core Mid Control Grid (L-corners, crouch peek crates, tight sightline screens; keeps (0,0) clear!)
  addValorantMidControlGrid(blocks, prefix, wallMat, crateMat, accentMat);

  // 2. A-Site (West) & B-Site (East) Heaven Balconies + Site Double-Stacks + Choke Gates
  addValorantHeavenBalcony(blocks, `${prefix}_ha`, -28, -4, 5.5, 10, 4.4, wallMat, crateMat, 'negZ', 'posX');
  addValorantHeavenBalcony(blocks, `${prefix}_hb`, 28, 4, 5.5, 10, 4.4, wallMat, crateMat, 'posZ', 'negX');
  addValorantSiteBoxCluster(blocks, `${prefix}_sa`, -20, 7.5, 1, -1, siteMat, crateMat);
  addValorantSiteBoxCluster(blocks, `${prefix}_sb`, 20, -7.5, -1, 1, siteMat, crateMat);
  addValorantChokeGate(blocks, `${prefix}_ga`, -14.5, -12, 'z', 2.6, 4.4, wallMat, accentMat);
  addValorantChokeGate(blocks, `${prefix}_gb`, 14.5, 12, 'z', 2.6, 4.4, wallMat, accentMat);

  // 3. Unique Bespoke Signature Landmarks per Map!
  switch (signatureStyle) {
    case 'caldera_crater':
      // Stepped basalt crater rim walls + high obsidian catwalks + corner magma stacks
      blocks.push(
        { id: `${prefix}_rim_n`, x: 0, y: 0, z: -21, w: 18, h: 3.2, d: 4.5, kind: wallMat },
        { id: `${prefix}_rim_s`, x: 0, y: 0, z: 21, w: 18, h: 3.2, d: 4.5, kind: wallMat },
        { id: `${prefix}_bridge_ew`, x: 0, y: 6.2, z: 0, w: 46, h: 0.9, d: 3.4, kind: accentMat },
        { id: `${prefix}_spire_nw`, x: -24, y: 0, z: -22, w: 4.5, h: 9.5, d: 4.5, kind: siteMat },
        { id: `${prefix}_spire_ne`, x: 24, y: 0, z: -22, w: 4.5, h: 9.5, d: 4.5, kind: siteMat },
        { id: `${prefix}_spire_sw`, x: -24, y: 0, z: 22, w: 4.5, h: 9.5, d: 4.5, kind: siteMat },
        { id: `${prefix}_spire_se`, x: 24, y: 0, z: 22, w: 4.5, h: 9.5, d: 4.5, kind: siteMat }
      );
      break;
    case 'bamboo_pavilions':
      // Twin Dojo Verandas + Cross Tea-House Overpass + Garden Screen Walls
      blocks.push(
        { id: `${prefix}_dojo_w`, x: -16, y: 0, z: -18, w: 9.0, h: 2.6, d: 7.0, kind: siteMat },
        { id: `${prefix}_dojo_e`, x: 16, y: 0, z: 18, w: 9.0, h: 2.6, d: 7.0, kind: siteMat },
        { id: `${prefix}_dojo_roof_w`, x: -16, y: 5.4, z: -18, w: 10.5, h: 0.85, d: 8.5, kind: accentMat },
        { id: `${prefix}_dojo_roof_e`, x: 16, y: 5.4, z: 18, w: 10.5, h: 0.85, d: 8.5, kind: accentMat },
        { id: `${prefix}_sky_ns`, x: 0, y: 5.8, z: 0, w: 3.6, h: 0.85, d: 34, kind: wallMat },
        { id: `${prefix}_scr_n`, x: 0, y: 0, z: -16, w: 7.5, h: 2.3, d: 1.4, kind: crateMat },
        { id: `${prefix}_scr_s`, x: 0, y: 0, z: 16, w: 7.5, h: 2.3, d: 1.4, kind: crateMat }
      );
      break;
    case 'downtown_alleys':
      // High-rise Rooftop Blocks + Street Alley Chokes + Storefront Cover
      blocks.push(
        { id: `${prefix}_bldg_nw`, x: -22, y: 0, z: -20, w: 7.5, h: 8.5, d: 7.5, kind: wallMat },
        { id: `${prefix}_bldg_se`, x: 22, y: 0, z: 20, w: 7.5, h: 8.5, d: 7.5, kind: wallMat },
        { id: `${prefix}_bldg_ne`, x: 22, y: 0, z: -20, w: 6.5, h: 6.2, d: 6.5, kind: siteMat },
        { id: `${prefix}_bldg_sw`, x: -22, y: 0, z: 20, w: 6.5, h: 6.2, d: 6.5, kind: siteMat },
        { id: `${prefix}_skywalk_n`, x: 0, y: 6.2, z: -20, w: 38, h: 0.9, d: 3.6, kind: accentMat },
        { id: `${prefix}_skywalk_s`, x: 0, y: 6.2, z: 20, w: 38, h: 0.9, d: 3.6, kind: accentMat },
        { id: `${prefix}_kiosk_n`, x: 0, y: 0, z: -15, w: 4.5, h: 2.2, d: 2.4, kind: crateMat },
        { id: `${prefix}_kiosk_s`, x: 0, y: 0, z: 15, w: 4.5, h: 2.2, d: 2.4, kind: crateMat }
      );
      break;
    case 'atlantis_trident':
      // Colonnade Amphitheater Steps + Golden Trident Overpass + Coral Bunkers
      blocks.push(
        { id: `${prefix}_col_nw`, x: -12, y: 0, z: -20, w: 2.4, h: 6.2, d: 2.4, kind: siteMat },
        { id: `${prefix}_col_ne`, x: 12, y: 0, z: -20, w: 2.4, h: 6.2, d: 2.4, kind: siteMat },
        { id: `${prefix}_col_sw`, x: -12, y: 0, z: 20, w: 2.4, h: 6.2, d: 2.4, kind: siteMat },
        { id: `${prefix}_col_se`, x: 12, y: 0, z: 20, w: 2.4, h: 6.2, d: 2.4, kind: siteMat },
        { id: `${prefix}_lintel_n`, x: 0, y: 6.2, z: -20, w: 28, h: 1.0, d: 3.8, kind: accentMat },
        { id: `${prefix}_lintel_s`, x: 0, y: 6.2, z: 20, w: 28, h: 1.0, d: 3.8, kind: accentMat },
        { id: `${prefix}_stage_n`, x: 0, y: 0, z: -26, w: 12, h: 2.2, d: 5.0, kind: wallMat },
        { id: `${prefix}_stage_s`, x: 0, y: 0, z: 26, w: 12, h: 2.2, d: 5.0, kind: wallMat }
      );
      break;
    case 'clockwork_pendulum':
      // Multi-gear Stepped Decks + Pendulum Catwalk Cross + Brass Towers
      blocks.push(
        { id: `${prefix}_gear_w`, x: -16, y: 0, z: -18, w: 8.5, h: 2.0, d: 8.5, kind: wallMat },
        { id: `${prefix}_gear_e`, x: 16, y: 0, z: 18, w: 8.5, h: 2.0, d: 8.5, kind: wallMat },
        { id: `${prefix}_pend_ns`, x: 0, y: 5.8, z: 0, w: 3.6, h: 0.9, d: 38, kind: accentMat },
        { id: `${prefix}_pend_ew`, x: 0, y: 5.8, z: 0, w: 38, h: 0.9, d: 3.6, kind: accentMat },
        { id: `${prefix}_bell_nw`, x: -26, y: 0, z: -25, w: 4.5, h: 10.0, d: 4.5, kind: siteMat },
        { id: `${prefix}_bell_se`, x: 26, y: 0, z: 25, w: 4.5, h: 10.0, d: 4.5, kind: siteMat }
      );
      break;
    case 'mirage_market':
      // Classic Mirage Mid Window + Market Arches + Palace Overlook
      blocks.push(
        { id: `${prefix}_window_n`, x: 0, y: 0, z: -16.5, w: 11, h: 2.2, d: 4.2, kind: wallMat },
        { id: `${prefix}_window_top_n`, x: 0, y: 4.5, z: -16.5, w: 11, h: 1.5, d: 4.2, kind: accentMat },
        { id: `${prefix}_window_s`, x: 0, y: 0, z: 16.5, w: 11, h: 2.2, d: 4.2, kind: wallMat },
        { id: `${prefix}_window_top_s`, x: 0, y: 4.5, z: 16.5, w: 11, h: 1.5, d: 4.2, kind: accentMat },
        { id: `${prefix}_palace_w`, x: -20, y: 4.8, z: -18, w: 12, h: 0.9, d: 4.2, kind: accentMat },
        { id: `${prefix}_palace_e`, x: 20, y: 4.8, z: 18, w: 12, h: 0.9, d: 4.2, kind: accentMat },
        { id: `${prefix}_stall_1`, x: -13, y: 0, z: 16, w: 3.5, h: 1.6, d: 2.2, kind: crateMat },
        { id: `${prefix}_stall_2`, x: 13, y: 0, z: -16, w: 3.5, h: 1.6, d: 2.2, kind: crateMat }
      );
      break;
    case 'crystal_grottos':
      // Amethyst Crystal Pillars + Suspended Prism Bridges
      blocks.push(
        { id: `${prefix}_crys_nw`, x: -16, y: 0, z: -16, w: 4.0, h: 7.5, d: 4.0, kind: siteMat },
        { id: `${prefix}_crys_ne`, x: 16, y: 0, z: -16, w: 4.0, h: 7.5, d: 4.0, kind: wallMat },
        { id: `${prefix}_crys_sw`, x: -16, y: 0, z: 16, w: 4.0, h: 7.5, d: 4.0, kind: wallMat },
        { id: `${prefix}_crys_se`, x: 16, y: 0, z: 16, w: 4.0, h: 7.5, d: 4.0, kind: siteMat },
        { id: `${prefix}_prism_n`, x: 0, y: 5.8, z: -16, w: 28, h: 0.9, d: 3.6, kind: accentMat },
        { id: `${prefix}_prism_s`, x: 0, y: 5.8, z: 16, w: 28, h: 0.9, d: 3.6, kind: accentMat },
        { id: `${prefix}_geode_n`, x: 0, y: 0, z: -25, w: 8.5, h: 3.0, d: 4.5, kind: siteMat },
        { id: `${prefix}_geode_s`, x: 0, y: 0, z: 25, w: 8.5, h: 3.0, d: 4.5, kind: siteMat }
      );
      break;
    case 'cherry_veranda':
      // Torii Entry Gates + Multi-Tier Pagoda Galleries
      blocks.push(
        { id: `${prefix}_torii_n_l`, x: -4.2, y: 0, z: -17, w: 1.8, h: 5.4, d: 1.8, kind: siteMat },
        { id: `${prefix}_torii_n_r`, x: 4.2, y: 0, z: -17, w: 1.8, h: 5.4, d: 1.8, kind: siteMat },
        { id: `${prefix}_torii_n_top`, x: 0, y: 5.4, z: -17, w: 12.5, h: 1.1, d: 2.6, kind: accentMat },
        { id: `${prefix}_torii_s_l`, x: -4.2, y: 0, z: 17, w: 1.8, h: 5.4, d: 1.8, kind: siteMat },
        { id: `${prefix}_torii_s_r`, x: 4.2, y: 0, z: 17, w: 1.8, h: 5.4, d: 1.8, kind: siteMat },
        { id: `${prefix}_torii_s_top`, x: 0, y: 5.4, z: 17, w: 12.5, h: 1.1, d: 2.6, kind: accentMat },
        { id: `${prefix}_pagoda_nw`, x: -24, y: 0, z: -24, w: 6.5, h: 8.2, d: 6.5, kind: wallMat },
        { id: `${prefix}_pagoda_se`, x: 24, y: 0, z: 24, w: 6.5, h: 8.2, d: 6.5, kind: wallMat }
      );
      break;
    case 'obsidian_citadel':
      // Medieval Keep Walls + Battlement Bridges + Twin Corner Bastions
      blocks.push(
        { id: `${prefix}_keep_n`, x: 0, y: 0, z: -21, w: 18, h: 3.8, d: 4.8, kind: wallMat },
        { id: `${prefix}_keep_s`, x: 0, y: 0, z: 21, w: 18, h: 3.8, d: 4.8, kind: wallMat },
        { id: `${prefix}_cat_ew`, x: 0, y: 6.4, z: 0, w: 44, h: 1.0, d: 3.8, kind: accentMat },
        { id: `${prefix}_bast_nw`, x: -24, y: 0, z: -24, w: 5.5, h: 9.8, d: 5.5, kind: wallMat },
        { id: `${prefix}_bast_ne`, x: 24, y: 0, z: -24, w: 5.5, h: 9.8, d: 5.5, kind: wallMat },
        { id: `${prefix}_bast_sw`, x: -24, y: 0, z: 24, w: 5.5, h: 9.8, d: 5.5, kind: wallMat },
        { id: `${prefix}_bast_se`, x: 24, y: 0, z: 24, w: 5.5, h: 9.8, d: 5.5, kind: wallMat }
      );
      break;
    case 'solar_rings':
      // Concentric Observatory Decks + Elevated Astronomical Bridges
      blocks.push(
        { id: `${prefix}_dial_n`, x: 0, y: 0, z: -18, w: 14, h: 2.6, d: 4.8, kind: siteMat },
        { id: `${prefix}_dial_s`, x: 0, y: 0, z: 18, w: 14, h: 2.6, d: 4.8, kind: siteMat },
        { id: `${prefix}_ring_ns`, x: 0, y: 6.0, z: 0, w: 3.6, h: 0.9, d: 34, kind: accentMat },
        { id: `${prefix}_ring_ew`, x: 0, y: 6.0, z: 0, w: 34, h: 0.9, d: 3.6, kind: accentMat },
        { id: `${prefix}_lens_nw`, x: -22, y: 0, z: -22, w: 4.8, h: 8.8, d: 4.8, kind: wallMat },
        { id: `${prefix}_lens_se`, x: 22, y: 0, z: 22, w: 4.8, h: 8.8, d: 4.8, kind: wallMat }
      );
      break;
    case 'toxic_vats':
      // Industrial Chemical Vats + Pipe Catwalks + Bunker Tanks
      blocks.push(
        { id: `${prefix}_vat_nw`, x: -17, y: 0, z: -17, w: 5.5, h: 5.8, d: 5.5, kind: wallMat },
        { id: `${prefix}_vat_ne`, x: 17, y: 0, z: -17, w: 5.5, h: 5.8, d: 5.5, kind: siteMat },
        { id: `${prefix}_vat_sw`, x: -17, y: 0, z: 17, w: 5.5, h: 5.8, d: 5.5, kind: siteMat },
        { id: `${prefix}_vat_se`, x: 17, y: 0, z: 17, w: 5.5, h: 5.8, d: 5.5, kind: wallMat },
        { id: `${prefix}_pipe_n`, x: 0, y: 5.8, z: -17, w: 30, h: 0.9, d: 3.2, kind: accentMat },
        { id: `${prefix}_pipe_s`, x: 0, y: 5.8, z: 17, w: 30, h: 0.9, d: 3.2, kind: accentMat },
        { id: `${prefix}_sump_n`, x: 0, y: 0, z: -24, w: 10, h: 2.2, d: 4.0, kind: crateMat },
        { id: `${prefix}_sump_s`, x: 0, y: 0, z: 24, w: 10, h: 2.2, d: 4.0, kind: crateMat }
      );
      break;
    case 'aether_islands':
      // Multi-altitude Floating Sky Decks + White Spire Towers
      blocks.push(
        { id: `${prefix}_isl_n`, x: 0, y: 5.4, z: -17, w: 12, h: 1.0, d: 6.5, kind: wallMat },
        { id: `${prefix}_isl_s`, x: 0, y: 5.4, z: 17, w: 12, h: 1.0, d: 6.5, kind: wallMat },
        { id: `${prefix}_bridge_ew`, x: 0, y: 6.4, z: 0, w: 42, h: 0.9, d: 3.4, kind: accentMat },
        { id: `${prefix}_spire_nw`, x: -24, y: 0, z: -22, w: 4.4, h: 10.2, d: 4.4, kind: siteMat },
        { id: `${prefix}_spire_ne`, x: 24, y: 0, z: -22, w: 4.4, h: 10.2, d: 4.4, kind: siteMat },
        { id: `${prefix}_spire_sw`, x: -24, y: 0, z: 22, w: 4.4, h: 10.2, d: 4.4, kind: siteMat },
        { id: `${prefix}_spire_se`, x: 24, y: 0, z: 22, w: 4.4, h: 10.2, d: 4.4, kind: siteMat }
      );
      break;
  }

  addCompactPerimeterEnclosure(blocks, prefix, radius, wallMat, accentMat, crateMat, siteMat);
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
        { id: 'jp_sd_w', x: -18.5, y: 0, z: 0, radius: 1.9, boostY: 21.5, boostForward: 11.5, color: '#38bdf8' },
        { id: 'jp_sd_e', x: 18.5, y: 0, z: 0, radius: 1.9, boostY: 21.5, boostForward: 11.5, color: '#38bdf8' },
        { id: 'jp_sd_n', x: 0, y: 2.8, z: -17, radius: 1.8, boostY: 18.5, boostForward: 12.0, color: '#a855f7' },
        { id: 'jp_sd_s', x: 0, y: 2.8, z: 17, radius: 1.8, boostY: 18.5, boostForward: 12.0, color: '#a855f7' },
      ];
    case 'nether_foundry':
      return [
        { id: 'jp_nf_nw', x: -19, y: 0, z: -16, radius: 1.8, boostY: 19.0, boostForward: 6, color: '#f97316' },
        { id: 'jp_nf_se', x: 19, y: 0, z: 16, radius: 1.8, boostY: 19.0, boostForward: 6, color: '#f97316' },
        { id: 'jp_nf_ne', x: 19, y: 0, z: -16, radius: 1.8, boostY: 19.0, boostForward: 6, color: '#facc15' },
        { id: 'jp_nf_sw', x: -19, y: 0, z: 16, radius: 1.8, boostY: 19.0, boostForward: 6, color: '#facc15' },
      ];
    case 'cyber_nexus':
      return [
        { id: 'jp_cn_w', x: -21, y: 0, z: 0, radius: 1.8, boostY: 19.5, boostForward: 10, color: '#06b6d4' },
        { id: 'jp_cn_e', x: 21, y: 0, z: 0, radius: 1.8, boostY: 19.5, boostForward: 10, color: '#06b6d4' },
        { id: 'jp_cn_n', x: 0, y: 0, z: -21, radius: 1.8, boostY: 18.0, boostForward: 9, color: '#a855f7' },
        { id: 'jp_cn_s', x: 0, y: 0, z: 21, radius: 1.8, boostY: 18.0, boostForward: 9, color: '#a855f7' },
      ];
    case 'frost_bastion':
      return [
        { id: 'jp_fb_nw', x: -18, y: 0, z: -17, radius: 1.8, boostY: 19.5, boostForward: 6, color: '#7dd3fc' },
        { id: 'jp_fb_se', x: 18, y: 0, z: 17, radius: 1.8, boostY: 19.5, boostForward: 6, color: '#7dd3fc' },
        { id: 'jp_fb_ne', x: 18, y: 0, z: -17, radius: 1.8, boostY: 19.5, boostForward: 6, color: '#38bdf8' },
        { id: 'jp_fb_sw', x: -18, y: 0, z: 17, radius: 1.8, boostY: 19.5, boostForward: 6, color: '#38bdf8' },
      ];
    case 'ancient_temple':
      return [
        { id: 'jp_at_w', x: -11.5, y: 0, z: 0, radius: 1.8, boostY: 17.5, boostForward: 6, color: '#f59e0b' },
        { id: 'jp_at_e', x: 11.5, y: 0, z: 0, radius: 1.8, boostY: 17.5, boostForward: 6, color: '#f59e0b' },
        { id: 'jp_at_n', x: 0, y: 0, z: -15, radius: 1.8, boostY: 17.0, boostForward: 5, color: '#fbbf24' },
        { id: 'jp_at_s', x: 0, y: 0, z: 15, radius: 1.8, boostY: 17.0, boostForward: 5, color: '#fbbf24' },
      ];
    case 'orbital_reactor':
      return [
        { id: 'jp_or_nw', x: -17, y: 0, z: -17, radius: 1.8, boostY: 22.0, boostForward: 8, color: '#818cf8' },
        { id: 'jp_or_ne', x: 17, y: 0, z: -17, radius: 1.8, boostY: 22.0, boostForward: 8, color: '#818cf8' },
        { id: 'jp_or_sw', x: -17, y: 0, z: 17, radius: 1.8, boostY: 22.0, boostForward: 8, color: '#38bdf8' },
        { id: 'jp_or_se', x: 17, y: 0, z: 17, radius: 1.8, boostY: 22.0, boostForward: 8, color: '#38bdf8' },
      ];
    case 'volcanic_caldera':
      return [
        { id: 'jp_vc_w', x: -12.5, y: 0, z: 0, radius: 1.8, boostY: 21.0, boostForward: 7.5, color: '#f97316' },
        { id: 'jp_vc_e', x: 12.5, y: 0, z: 0, radius: 1.8, boostY: 21.0, boostForward: 7.5, color: '#f97316' },
        { id: 'jp_vc_nw', x: -18.5, y: 0, z: -17, radius: 1.8, boostY: 20.5, boostForward: 6.5, color: '#fb923c' },
        { id: 'jp_vc_se', x: 18.5, y: 0, z: 17, radius: 1.8, boostY: 20.5, boostForward: 6.5, color: '#fb923c' },
      ];
    case 'bamboo_sanctuary':
      return [
        { id: 'jp_bs_w', x: -12, y: 0, z: -12, radius: 1.8, boostY: 18.5, boostForward: 7, color: '#22c55e' },
        { id: 'jp_bs_e', x: 12, y: 0, z: 12, radius: 1.8, boostY: 18.5, boostForward: 7, color: '#22c55e' },
        { id: 'jp_bs_n', x: 0, y: 0, z: -22, radius: 1.8, boostY: 19.0, boostForward: 6, color: '#84cc16' },
        { id: 'jp_bs_s', x: 0, y: 0, z: 22, radius: 1.8, boostY: 19.0, boostForward: 6, color: '#84cc16' },
      ];
    case 'neon_downtown':
      return [
        { id: 'jp_nd_w', x: -14, y: 0, z: 0, radius: 1.8, boostY: 19.5, boostForward: 11, color: '#38bdf8' },
        { id: 'jp_nd_e', x: 14, y: 0, z: 0, radius: 1.8, boostY: 19.5, boostForward: 11, color: '#38bdf8' },
        { id: 'jp_nd_nw', x: -14, y: 0, z: -20, radius: 1.8, boostY: 20.0, boostForward: 9, color: '#ec4899' },
        { id: 'jp_nd_se', x: 14, y: 0, z: 20, radius: 1.8, boostY: 20.0, boostForward: 9, color: '#ec4899' },
      ];
    case 'sunken_atlantis':
      return [
        { id: 'jp_sa_w', x: -11, y: 0, z: 0, radius: 1.8, boostY: 21.0, boostForward: 7, color: '#14b8a6' },
        { id: 'jp_sa_e', x: 11, y: 0, z: 0, radius: 1.8, boostY: 21.0, boostForward: 7, color: '#14b8a6' },
        { id: 'jp_sa_n', x: 0, y: 0, z: -14, radius: 1.8, boostY: 20.5, boostForward: 6, color: '#2dd4bf' },
        { id: 'jp_sa_s', x: 0, y: 0, z: 14, radius: 1.8, boostY: 20.5, boostForward: 6, color: '#2dd4bf' },
      ];
    case 'clockwork_tower':
      return [
        { id: 'jp_ct_n', x: 0, y: 0, z: -14, radius: 1.8, boostY: 19.5, boostForward: 7.5, color: '#f59e0b' },
        { id: 'jp_ct_s', x: 0, y: 0, z: 14, radius: 1.8, boostY: 19.5, boostForward: 7.5, color: '#f59e0b' },
        { id: 'jp_ct_w', x: -13, y: 0, z: 0, radius: 1.8, boostY: 19.5, boostForward: 7.5, color: '#fbbf24' },
        { id: 'jp_ct_e', x: 13, y: 0, z: 0, radius: 1.8, boostY: 19.5, boostForward: 7.5, color: '#fbbf24' },
      ];
    case 'desert_mirage':
      return [
        { id: 'jp_dm_nw', x: -18, y: 0, z: -11, radius: 1.8, boostY: 18.5, boostForward: 7, color: '#eab308' },
        { id: 'jp_dm_se', x: 18, y: 0, z: 11, radius: 1.8, boostY: 18.5, boostForward: 7, color: '#eab308' },
        { id: 'jp_dm_ne', x: 18, y: 0, z: -11, radius: 1.8, boostY: 18.5, boostForward: 7, color: '#facc15' },
        { id: 'jp_dm_sw', x: -18, y: 0, z: 11, radius: 1.8, boostY: 18.5, boostForward: 7, color: '#facc15' },
      ];
    case 'crystal_cavern':
      return [
        { id: 'jp_cc_nw', x: -12, y: 0, z: -16, radius: 1.8, boostY: 20.0, boostForward: 7, color: '#c084fc' },
        { id: 'jp_cc_se', x: 12, y: 0, z: 16, radius: 1.8, boostY: 20.0, boostForward: 7, color: '#c084fc' },
        { id: 'jp_cc_ne', x: 12, y: 0, z: -16, radius: 1.8, boostY: 20.0, boostForward: 7, color: '#a855f7' },
        { id: 'jp_cc_sw', x: -12, y: 0, z: 16, radius: 1.8, boostY: 20.0, boostForward: 7, color: '#a855f7' },
      ];
    case 'cherry_pagoda':
      return [
        { id: 'jp_cp_w', x: -12, y: 0, z: 0, radius: 1.8, boostY: 18.5, boostForward: 6.5, color: '#f472b6' },
        { id: 'jp_cp_e', x: 12, y: 0, z: 0, radius: 1.8, boostY: 18.5, boostForward: 6.5, color: '#f472b6' },
        { id: 'jp_cp_n', x: 0, y: 0, z: -12, radius: 1.8, boostY: 18.5, boostForward: 6.5, color: '#fb7185' },
        { id: 'jp_cp_s', x: 0, y: 0, z: 12, radius: 1.8, boostY: 18.5, boostForward: 6.5, color: '#fb7185' },
      ];
    case 'obsidian_keep':
      return [
        { id: 'jp_ok_nw', x: -18, y: 0, z: -15, radius: 1.8, boostY: 20.5, boostForward: 7, color: '#818cf8' },
        { id: 'jp_ok_se', x: 18, y: 0, z: 15, radius: 1.8, boostY: 20.5, boostForward: 7, color: '#818cf8' },
        { id: 'jp_ok_ne', x: 18, y: 0, z: -15, radius: 1.8, boostY: 20.5, boostForward: 7, color: '#a855f7' },
        { id: 'jp_ok_sw', x: -18, y: 0, z: 15, radius: 1.8, boostY: 20.5, boostForward: 7, color: '#a855f7' },
      ];
    case 'solar_observatory':
      return [
        { id: 'jp_so_n', x: 0, y: 0, z: -13, radius: 1.8, boostY: 21.5, boostForward: 7.5, color: '#fbbf24' },
        { id: 'jp_so_s', x: 0, y: 0, z: 13, radius: 1.8, boostY: 21.5, boostForward: 7.5, color: '#fbbf24' },
        { id: 'jp_so_w', x: -13, y: 0, z: 0, radius: 1.8, boostY: 21.5, boostForward: 7.5, color: '#f59e0b' },
        { id: 'jp_so_e', x: 13, y: 0, z: 0, radius: 1.8, boostY: 21.5, boostForward: 7.5, color: '#f59e0b' },
      ];
    case 'toxic_refinery':
      return [
        { id: 'jp_tr_w', x: -12, y: 0, z: 0, radius: 1.8, boostY: 19.0, boostForward: 8, color: '#34d399' },
        { id: 'jp_tr_e', x: 12, y: 0, z: 0, radius: 1.8, boostY: 19.0, boostForward: 8, color: '#34d399' },
        { id: 'jp_tr_n', x: 0, y: 0, z: -13, radius: 1.8, boostY: 19.0, boostForward: 7, color: '#10b981' },
        { id: 'jp_tr_s', x: 0, y: 0, z: 13, radius: 1.8, boostY: 19.0, boostForward: 7, color: '#10b981' },
      ];
    case 'aether_spire':
      return [
        { id: 'jp_as_n', x: 0, y: 0, z: -12, radius: 1.9, boostY: 23.5, boostForward: 8.5, color: '#a78bfa' },
        { id: 'jp_as_s', x: 0, y: 0, z: 12, radius: 1.9, boostY: 23.5, boostForward: 8.5, color: '#a78bfa' },
        { id: 'jp_as_w', x: -13, y: 0, z: 0, radius: 1.9, boostY: 23.5, boostForward: 8.5, color: '#38bdf8' },
        { id: 'jp_as_e', x: 13, y: 0, z: 0, radius: 1.9, boostY: 23.5, boostForward: 8.5, color: '#38bdf8' },
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

/**
 * Returns built-in signature water springs (sanctum heal/extinguish) or
 * lava/magma crucible hazards tailored to each map's theme (never blocking origin spawn).
 */
export function getMapSignaturePools(mapId: MapId): HazardPoolZone[] {
  switch (mapId) {
    case 'emerald_citadel':
      return [
        { id: 'mp_ec_n', kind: 'water', x: 0, y: 0.02, z: -29, radius: 2.8 },
        { id: 'mp_ec_s', kind: 'water', x: 0, y: 0.02, z: 29, radius: 2.8 },
      ];
    case 'nether_foundry':
      return [
        { id: 'mp_nf_w', kind: 'lava', x: -14, y: 0.02, z: -14, radius: 2.5 },
        { id: 'mp_nf_e', kind: 'lava', x: 14, y: 0.02, z: 14, radius: 2.5 },
      ];
    case 'frost_bastion':
      return [
        { id: 'mp_fb_n', kind: 'water', x: 0, y: 0.02, z: -29, radius: 2.8 },
        { id: 'mp_fb_s', kind: 'water', x: 0, y: 0.02, z: 29, radius: 2.8 },
      ];
    case 'ancient_temple':
      return [
        { id: 'mp_at_n', kind: 'water', x: 0, y: 0.02, z: -29, radius: 2.8 },
        { id: 'mp_at_s', kind: 'water', x: 0, y: 0.02, z: 29, radius: 2.8 },
      ];
    case 'volcanic_caldera':
      return [
        { id: 'mp_vc_ne', kind: 'lava', x: 13, y: 0.02, z: -13, radius: 2.5 },
        { id: 'mp_vc_sw', kind: 'lava', x: -13, y: 0.02, z: 13, radius: 2.5 },
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
        { id: 'mp_ok_w', kind: 'lava', x: -24, y: 0.02, z: 0, radius: 2.4 },
        { id: 'mp_ok_e', kind: 'lava', x: 24, y: 0.02, z: 0, radius: 2.4 },
      ];
    case 'toxic_refinery':
      return [
        { id: 'mp_tr_w', kind: 'lava', x: -23, y: 0.02, z: 0, radius: 2.4 },
        { id: 'mp_tr_e', kind: 'lava', x: 23, y: 0.02, z: 0, radius: 2.4 },
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
    case 'volcanic_caldera':
      return buildBespokeValorantMap('vc', 'basalt', 'obsidian', 'crimson_brick', 'wood_crate', 'caldera_crater', 48);
    case 'bamboo_sanctuary':
      return buildBespokeValorantMap('bs', 'wood_crate', 'turf', 'gold', 'stone', 'bamboo_pavilions', 48);
    case 'neon_downtown':
      return buildBespokeValorantMap('nd', 'cyber_panel', 'container_blue', 'reactor_core', 'asphalt', 'downtown_alleys', 46);
    case 'sunken_atlantis':
      return buildBespokeValorantMap('sa', 'ice_brick', 'sandstone', 'gold', 'stone', 'atlantis_trident', 48);
    case 'clockwork_tower':
      return buildBespokeValorantMap('ct', 'deepslate', 'gold', 'wood_crate', 'stone', 'clockwork_pendulum', 46);
    case 'desert_mirage':
      return buildBespokeValorantMap('dm', 'sandstone', 'wood_crate', 'gold', 'asphalt', 'mirage_market', 50);
    case 'crystal_cavern':
      return buildBespokeValorantMap('cc', 'obsidian', 'amethyst', 'ice_brick', 'stone', 'crystal_grottos', 46);
    case 'cherry_pagoda':
      return buildBespokeValorantMap('cp', 'wood_crate', 'amethyst', 'gold', 'stone', 'cherry_veranda', 48);
    case 'obsidian_keep':
      return buildBespokeValorantMap('ok', 'obsidian', 'deepslate', 'amethyst', 'stone', 'obsidian_citadel', 48);
    case 'solar_observatory':
      return buildBespokeValorantMap('so', 'sandstone', 'gold', 'reactor_core', 'stone', 'solar_rings', 48);
    case 'toxic_refinery':
      return buildBespokeValorantMap('tr', 'basalt', 'container_teal', 'cyber_panel', 'wood_crate', 'toxic_vats', 46);
    case 'aether_spire':
      return buildBespokeValorantMap('as', 'ice_brick', 'amethyst', 'gold', 'stone', 'aether_islands', 50);
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

