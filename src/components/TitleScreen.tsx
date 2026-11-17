import {
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  Crown,
  Flame,
  Gamepad2,
  GripVertical,
  Link2,
  MapPin,
  Plus,
  Settings,
  Shield,
  Shuffle,
  Sparkles,
  Swords,
  Target,
  Trash2,
  Trophy,
  UserPlus,
  Users,
  VolumeX,
  X,
  Zap,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import type { PlayerAccountProfile } from '../firebase';
import { CHARACTER_LIST, CHARACTER_MAP, GAME_MODES } from '../game/characters';
import { MAP_DEFINITIONS, MAP_ORDER } from '../game/maps';
import type {
  BotDifficulty,
  CharacterId,
  ChatEntry,
  CustomBotSlot,
  CustomPartyMode,
  GameModeId,
  GameSettings,
  MapCategory,
  MapId,
  MultiplayerHudState,
  PlayerTeam,
  RoomMode,
} from '../game/types';
import { WeaponIcon } from './WeaponIcons';

function formatRotationTimer(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const ARENA_RULE_LIST: Array<{
  id: CustomPartyMode;
  label: string;
  badge: string;
  shortDesc: string;
}> = [
  {
    id: 'knockout',
    label: '녹아웃 서바이벌',
    badge: '3:00',
    shortDesc: '3분마다 킬 할당 미달자 탈락',
  },
  {
    id: 'random_arsenal',
    label: '랜덤 무기',
    badge: '25초',
    shortDesc: '25초마다 3종 랜덤 무장 전환',
  },
  {
    id: 'one_shot',
    label: '원샷 스나이퍼',
    badge: '일격',
    shortDesc: '원거리 명중 시 즉시 일격 처치',
  },
  {
    id: 'boss_raid',
    label: '거대 괴수 레이드',
    badge: '보스',
    shortDesc: '거대 보스 및 호위병 집중 격파',
  },
  {
    id: 'classic',
    label: '클래식 난타전',
    badge: '15킬',
    shortDesc: '6슬롯 풀무장 정통 아레나',
  },
];

const BOT_DIFFICULTY_LIST: Array<{ id: BotDifficulty; label: string }> = [
  { id: 'easy', label: '쉬움' },
  { id: 'medium', label: '보통' },
  { id: 'hard', label: '어려움' },
];

type QuickRuleSelectValue = CustomPartyMode | 'practice';

interface LobbyUpdatePayload {
  includeBots?: boolean;
  roomMode?: RoomMode;
  team?: PlayerTeam;
  targetKills?: number;
  botDifficulty?: BotDifficulty;
  partyMode?: CustomPartyMode;
  customBots?: CustomBotSlot[];
}

interface TitleScreenProps {
  selectedCharacter: CharacterId;
  selectedMode: GameModeId;
  isPractice: boolean;
  currentMapId: MapId;
  activeRotationMaps: MapId[];
  rotationEndsAt: number;
  multiplayer: MultiplayerHudState;
  settings: GameSettings;
  chatMessages: ChatEntry[];
  account: PlayerAccountProfile | null;
  initialRoomCode: string;
  initialLinkCode: string;
  onSelectCharacter: (id: CharacterId) => void;
  onSelectMode: (mode: GameModeId) => void;
  onSetPracticeMode: (enabled: boolean) => void;
  onSelectOpenWorldMap: (mapId: MapId) => void;
  onSelectPracticeMap: (mapId: MapId) => void;
  onPlayUiSound?: (kind: 'vote' | 'tick' | 'lock', step?: number) => void;
  onStart: () => void;
  onSetPlayerName: (name: string) => void;
  onOpenAuth: (tab: 'auth' | 'leaderboard' | 'friends') => void;
  onOpenSettings: () => void;
  onCreateLinkDuel: (name: string) => void;
  onJoinLinkDuel: (code: string, name: string) => void;
  onQueueLinkDuel: (name: string) => void;
  onCancelLinkQueue: () => void;
  onCreateRoom: (
    name: string,
    includeBots: boolean,
    roomMode: RoomMode,
    team: PlayerTeam,
    botDifficulty?: BotDifficulty,
    partyMode?: CustomPartyMode,
    customBots?: CustomBotSlot[]
  ) => void;
  onJoinRoom: (code: string, name: string, team: PlayerTeam) => void;
  onUpdateLobby: (updates: LobbyUpdatePayload) => void;
  onVoteMap: (mapId: MapId) => void;
  onSendChat: (text: string) => void;
  onStartMultiplayer: () => void;
  onLeaveRoom: () => void;
  onResetNetwork: () => void;
}

const PATCH_NOTES = [
  {
    version: 'v3.6 — 화이트 아레나 로비 & 사설 상단 직결 개편',
    date: '최신 업데이트',
    highlights: [
      '전체 로비를 밝은 화이트 스튜디오 테마로 통일하고 상단 바 3등분(좌 랭킹전·데스매치 / 중앙 빠른 대전·사설 / 우 유틸) 배치',
      '가로 드래그 없는 11명 전체 캐릭터 격자 선택 + 대칭 랜덤 버튼 적용',
      '좌측 패널 세로 풀사이즈 확장 및 대형 화이트 전장/서버 버튼 배치',
    ],
  },
  {
    version: 'v3.5 — 겉날개 10초 제한 & 엔더진주 쿨타임 단축',
    date: '이전 업데이트',
    highlights: [
      '겉날개(Elytra) 무한 고공 비행 방지를 위해 연속 비행 최대 10초 제한 및 인게임 카운트다운 추가',
      '엔더 진주 쿨타임 4.8초 → 2.4초 대폭 단축으로 기동성·추격전 강화',
    ],
  },
];

export function TitleScreen({
  selectedCharacter,
  selectedMode,
  isPractice,
  currentMapId,
  activeRotationMaps,
  rotationEndsAt,
  multiplayer,
  settings,
  account,
  initialRoomCode,
  initialLinkCode,
  onSelectCharacter,
  onSelectMode,
  onSetPracticeMode,
  onSelectOpenWorldMap,
  onSelectPracticeMap,
  onPlayUiSound,
  onStart,
  onSetPlayerName,
  onOpenAuth,
  onOpenSettings,
  onCreateLinkDuel,
  onJoinLinkDuel,
  onQueueLinkDuel,
  onCancelLinkQueue,
  onCreateRoom,
  onJoinRoom,
  onUpdateLobby,
  onVoteMap,
  onStartMultiplayer,
  onLeaveRoom,
}: TitleScreenProps) {
  const char = CHARACTER_MAP[selectedCharacter] ?? CHARACTER_LIST[0];
  const modeInfo = GAME_MODES.find((m) => m.id === selectedMode) ?? GAME_MODES[0];
  const activeRuleId: CustomPartyMode = multiplayer.partyMode ?? 'knockout';
  const activeRule = ARENA_RULE_LIST.find((p) => p.id === activeRuleId) ?? ARENA_RULE_LIST[0];

  const [joinCodeInput, setJoinCodeInput] = useState(initialRoomCode || '');
  const [linkCodeInput, setLinkCodeInput] = useState(initialLinkCode || '');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const [updatesOpen, setUpdatesOpen] = useState(false);
  const [loadoutExpanded, setLoadoutExpanded] = useState(false);
  const [showAll20Maps, setShowAll20Maps] = useState(false);

  // Drag & Drop Bot state (inside Custom Room mode)
  const [dragPayload, setDragPayload] = useState<{
    type: 'pool' | 'existing';
    characterId?: CharacterId;
    botId?: string;
  } | null>(null);
  const [dragOverZone, setDragOverZone] = useState<PlayerTeam | null>(null);
  const [selectedPoolBotChar, setSelectedPoolBotChar] = useState<CharacterId>('wemmbu');

  // Map Filter & Roulette state
  const [mapCategoryFilter, setMapCategoryFilter] = useState<'all' | MapCategory>('all');
  const [practiceCategoryFilter, setPracticeCategoryFilter] = useState<'all' | MapCategory>('all');
  const [lastVotedMap, setLastVotedMap] = useState<MapId | null>(null);
  const [rouletteSpinning, setRouletteSpinning] = useState(false);
  const [rouletteHighlightMap, setRouletteHighlightMap] = useState<MapId | null>(null);

  // Live rotation countdown
  const [rotationSecondsLeft, setRotationSecondsLeft] = useState(() =>
    Math.max(0, Math.ceil((rotationEndsAt - Date.now()) / 1000))
  );

  useEffect(() => {
    const updateTimer = () => {
      setRotationSecondsLeft(Math.max(0, Math.ceil((rotationEndsAt - Date.now()) / 1000)));
    };
    updateTimer();
    const id = window.setInterval(updateTimer, 1000);
    return () => window.clearInterval(id);
  }, [rotationEndsAt]);

  const rotationMaps: MapId[] =
    activeRotationMaps && activeRotationMaps.length > 0
      ? activeRotationMaps
      : MAP_ORDER.slice(0, 4);

  const activeMapDef = MAP_DEFINITIONS[currentMapId] ?? MAP_DEFINITIONS.container_yard;
  const customBots = multiplayer.customBots ?? [];
  const playerCallsign = account?.nickname || multiplayer.playerName || 'Player';

  const handleCopyRoomCode = (code: string) => {
    navigator.clipboard?.writeText(code).catch(() => {});
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 1800);
  };

  const handleCopyInviteLink = (code: string, isLinkDuel: boolean) => {
    const url = new URL(window.location.href);
    url.searchParams.delete('room');
    url.searchParams.delete('link');
    url.searchParams.set(isLinkDuel ? 'link' : 'room', code);
    navigator.clipboard?.writeText(url.toString()).catch(() => {});
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 1800);
  };

  const handlePickRandomCharacter = () => {
    const candidates = CHARACTER_LIST.filter((c) => c.id !== selectedCharacter);
    const chosen =
      candidates[Math.floor(Math.random() * candidates.length)] ?? CHARACTER_LIST[0];
    onSelectCharacter(chosen.id);
  };

  const handleAddBotToTeam = (characterId: CharacterId, team: PlayerTeam) => {
    const cProf = CHARACTER_MAP[characterId] ?? CHARACTER_LIST[0];
    const nextBot: CustomBotSlot = {
      id: `bot-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: `${cProf.name} 봇`,
      characterId,
      team,
    };
    onUpdateLobby({ customBots: [...customBots.slice(0, 7), nextBot] });
  };

  const handleMoveBotToTeam = (botId: string, targetTeam: PlayerTeam) => {
    onUpdateLobby({
      customBots: customBots.map((b) => (b.id === botId ? { ...b, team: targetTeam } : b)),
    });
  };

  const handleRemoveBot = (botId: string) => {
    onUpdateLobby({ customBots: customBots.filter((b) => b.id !== botId) });
  };

  const handleClearBots = () => {
    onUpdateLobby({ customBots: [] });
  };

  const handleVoteMapClick = (mapId: MapId) => {
    setLastVotedMap(mapId);
    onPlayUiSound?.('vote');
    onVoteMap(mapId);
    setTimeout(() => {
      setLastVotedMap((prev) => (prev === mapId ? null : prev));
    }, 900);
  };

  const handleLaunchCustomMatchWithRoulette = () => {
    if (rouletteSpinning) return;
    const voteEntries = MAP_ORDER.filter((mId) => (multiplayer.mapVotes?.[mId] ?? 0) > 0);
    if (voteEntries.length <= 1) {
      onSetPracticeMode(false);
      onStartMultiplayer();
      return;
    }
    setRouletteSpinning(true);
    let step = 0;
    const totalSteps = 12;
    const interval = window.setInterval(() => {
      const candidate = voteEntries[step % voteEntries.length];
      setRouletteHighlightMap(candidate);
      onPlayUiSound?.('tick', step);
      step++;
      if (step >= totalSteps) {
        window.clearInterval(interval);
        const winner = multiplayer.selectedMap || voteEntries[0];
        setRouletteHighlightMap(winner);
        onPlayUiSound?.('lock');
        window.setTimeout(() => {
          setRouletteSpinning(false);
          setRouletteHighlightMap(null);
          onSetPracticeMode(false);
          onStartMultiplayer();
        }, 550);
      }
    }, 85);
  };

  const handleQuickRuleSelectChange = (val: QuickRuleSelectValue) => {
    if (val === 'practice') {
      onSelectMode('ffa');
      onSetPracticeMode(true);
      setShowAll20Maps(true);
      return;
    }
    setShowAll20Maps(false);
    onSelectMode('ffa');
    onSetPracticeMode(false);
    onUpdateLobby({ partyMode: val });
  };

  const quickDropdownValue: QuickRuleSelectValue = isPractice ? 'practice' : activeRuleId;

  const totalVotes = MAP_ORDER.reduce((sum, mId) => sum + (multiplayer.mapVotes?.[mId] ?? 0), 0);
  const inCustomLobby =
    selectedMode === 'multiplayer' &&
    multiplayer.roomKind === 'private' &&
    Boolean(multiplayer.roomCode);

  const filteredCustomMaps = MAP_ORDER.filter(
    (mId) => mapCategoryFilter === 'all' || MAP_DEFINITIONS[mId].category === mapCategoryFilter
  );
  const filteredPracticeMaps = MAP_ORDER.filter(
    (mId) =>
      practiceCategoryFilter === 'all' || MAP_DEFINITIONS[mId].category === practiceCategoryFilter
  );

  const quickMatchCtaLabel = isPractice
    ? '연습장 입장'
    : activeRuleId === 'knockout'
      ? '빠른 대전 즉시 출전'
      : `${activeRule.label} 즉시 출전`;

  return (
    <div
      data-testid="title-screen"
      className="fixed inset-0 z-30 flex flex-col justify-between pointer-events-none select-none overflow-hidden text-slate-900"
    >
      {/* ==================== FULL-WIDTH WHITE TOP BAR: [랭킹전 · 데스매치] --- [빠른 대전 (정중앙 50%)] --- [사용자 설정 게임 ... 유틸] ==================== */}
      <header className="relative z-10 w-full bg-white/95 border-b border-slate-200 shadow-sm pointer-events-auto px-2.5 sm:px-4 lg:px-5 py-2 grid grid-cols-[1fr_auto_1fr] items-center gap-1.5 sm:gap-2.5">
        {/* Col 1 (Left 1fr): SC Emblem + Large 랭킹전 & 데스매치 filling the left section */}
        <div className="col-start-1 row-start-1 flex items-stretch gap-1 sm:gap-2 min-w-0">
          <div
            className="hidden 2xl:flex w-10 rounded-xl bg-rose-600 text-white items-center justify-center font-display font-black text-sm shrink-0 shadow-xs"
            title="SKYBOX CLASH"
          >
            SC
          </div>

          <button
            type="button"
            data-mode-id="link_duel"
            data-testid="mode-tab-link_duel"
            onClick={() => {
              onSetPracticeMode(false);
              onSelectMode('link_duel');
            }}
            className={`flex-1 px-2 sm:px-3.5 py-2 sm:py-2.5 rounded-xl border transition-all cursor-pointer whitespace-nowrap flex items-center justify-center gap-1 sm:gap-2 min-w-0 ${
              selectedMode === 'link_duel'
                ? 'bg-rose-600 border-rose-600 text-white shadow-sm'
                : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100 hover:border-slate-300'
            }`}
          >
            <Swords className="hidden sm:block w-4 h-4 shrink-0" />
            <span className="font-display text-xs sm:text-sm lg:text-base font-black truncate">랭킹전</span>
            <span className="hidden 2xl:inline text-[11px] font-semibold opacity-85">· 1:1 대결</span>
          </button>

          <button
            type="button"
            data-mode-id="online_world"
            data-testid="mode-tab-online_world"
            onClick={() => {
              onSetPracticeMode(false);
              onSelectMode('online_world');
            }}
            className={`flex-1 px-2 sm:px-3.5 py-2 sm:py-2.5 rounded-xl border transition-all cursor-pointer whitespace-nowrap flex items-center justify-center gap-1 sm:gap-2 min-w-0 ${
              selectedMode === 'online_world'
                ? 'bg-rose-600 border-rose-600 text-white shadow-sm'
                : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100 hover:border-slate-300'
            }`}
          >
            <Sparkles className="hidden sm:block w-4 h-4 shrink-0" />
            <span className="font-display text-xs sm:text-sm lg:text-base font-black truncate">데스매치</span>
            <span className="hidden 2xl:inline text-[11px] font-semibold opacity-85">· 오픈월드</span>
          </button>
        </div>

        {/* Col 2 (Exact Mathematical Center 50%): 빠른 대전 단독 배치 */}
        <button
          type="button"
          data-mode-id="ffa"
          data-testid="mode-tab-ffa"
          onClick={() => {
            setShowAll20Maps(false);
            onSetPracticeMode(false);
            onSelectMode('ffa');
          }}
          className={`col-start-2 row-start-1 justify-self-center shrink-0 px-3 sm:px-6 lg:px-7 py-2 sm:py-2.5 rounded-xl border transition-all cursor-pointer whitespace-nowrap flex items-center justify-center gap-1.5 sm:gap-2 font-display text-xs sm:text-base font-black tracking-tight shadow-sm ${
            selectedMode === 'ffa'
              ? 'bg-rose-600 border-rose-600 text-white'
              : 'bg-slate-100 border-slate-300 text-slate-900 hover:bg-slate-200'
          }`}
        >
          <Gamepad2 className="hidden sm:block w-4 h-4 shrink-0" />
          <span>빠른 대전</span>
          <span className="hidden md:inline text-[11px] font-bold opacity-85">
            · {isPractice ? '연습장' : '3분 녹아웃'}
          </span>
        </button>

        {/* Col 3 Left (Immediately Right of 빠른 대전): 사용자 설정 게임 */}
        <button
          type="button"
          data-mode-id="multiplayer"
          data-testid="mode-tab-multiplayer"
          onClick={() => {
            onSetPracticeMode(false);
            onSelectMode('multiplayer');
          }}
          className={`col-start-3 row-start-1 justify-self-start shrink-0 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-xl border transition-all cursor-pointer whitespace-nowrap flex items-center justify-center gap-1.5 font-display text-xs sm:text-sm lg:text-base font-black ${
            selectedMode === 'multiplayer'
              ? 'bg-rose-600 border-rose-600 text-white shadow-sm'
              : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100 hover:border-slate-300'
          }`}
        >
          <Users className="hidden sm:block w-4 h-4 shrink-0" />
          <span>사용자 설정 게임</span>
        </button>

        {/* Right Utility Controls: Row 2 on <1280px (zero collision with 사용자 설정 게임), Col 3 Right on >=1280px */}
        <div className="col-span-3 row-start-2 xl:col-span-1 xl:col-start-3 xl:row-start-1 xl:justify-self-end flex items-center justify-between xl:justify-end gap-1.5 pt-1.5 xl:pt-0 border-t border-slate-100 xl:border-t-0 min-w-0">
          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 sm:py-2 shrink-0">
            <span className="text-[11px] font-bold text-slate-500 mr-1.5 whitespace-nowrap">닉네임</span>
            <input
              type="text"
              aria-label="플레이어 닉네임"
              data-testid="player-name-input"
              maxLength={14}
              value={multiplayer.playerName}
              onChange={(e) => onSetPlayerName(e.target.value)}
              placeholder="Player"
              className="w-16 2xl:w-20 bg-transparent text-xs font-bold text-slate-900 focus:outline-none placeholder:text-slate-400"
            />
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => onOpenAuth('auth')}
              className="h-8 sm:h-9 lg:h-10 px-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-800 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              title="프로필 및 계정 연동"
            >
              <Shield className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="truncate max-w-16 2xl:max-w-24">
                {account ? `${account.nickname} (${account.elo})` : '프로필'}
              </span>
            </button>

            <button
              type="button"
              data-testid="open-leaderboard-btn"
              onClick={() => onOpenAuth('leaderboard')}
              className="h-8 sm:h-9 lg:h-10 px-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-800 flex items-center gap-1 cursor-pointer whitespace-nowrap"
              title="랭킹"
            >
              <Trophy className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span className="hidden 2xl:inline">랭킹</span>
            </button>

            <button
              type="button"
              data-testid="open-friends-btn"
              onClick={() => onOpenAuth('friends')}
              className="h-8 sm:h-9 lg:h-10 px-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-800 flex items-center gap-1 cursor-pointer whitespace-nowrap"
              title="친구"
            >
              <UserPlus className="w-3.5 h-3.5 text-sky-600 shrink-0" />
              <span className="hidden 2xl:inline">친구</span>
            </button>

            <button
              type="button"
              data-testid="open-updates-btn"
              onClick={() => setUpdatesOpen(true)}
              className="h-8 sm:h-9 lg:h-10 px-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 hidden 2xl:flex items-center cursor-pointer whitespace-nowrap"
            >
              패치노트
            </button>

            <button
              type="button"
              data-testid="open-settings-btn"
              onClick={onOpenSettings}
              aria-label="환경 설정"
              className="w-8 h-8 sm:w-9 sm:h-9 lg:w-10 lg:h-10 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 hover:text-slate-900 cursor-pointer shrink-0"
            >
              {settings.muted ? <VolumeX className="w-4 h-4 text-rose-600" /> : <Settings className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* ==================== MAIN STAGE: FULL-HEIGHT BUTTON-FILLED WHITE LEFT PANEL + OPEN 3D CHARACTER + BOTTOM-RIGHT WHITE TIMER ==================== */}
      <div className="relative z-10 flex-1 min-h-0 flex flex-col lg:flex-row items-stretch justify-between px-3 sm:px-5 py-3 gap-4 overflow-y-auto lg:overflow-hidden pointer-events-none">
        {/* LEFT VERTICAL WHITE PANEL: Mode Header · 11-Fighter Grid · Large White Map/Mode Cards · Bottom Actions */}
        <section
          className={`pointer-events-auto shrink-0 lg:shrink flex flex-col justify-between gap-2.5 bg-white/95 border border-slate-200 rounded-2xl p-3.5 sm:p-4 shadow-xl text-slate-900 lg:h-full lg:overflow-y-auto ${
            inCustomLobby
              ? 'w-full lg:w-[680px] xl:w-[740px]'
              : 'w-full lg:w-[475px] xl:w-[500px]'
          }`}
        >
          {/* 1. MODE HEADER */}
          <div className="flex items-start justify-between gap-2 pb-2 border-b border-slate-200 shrink-0">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
                <span className="text-rose-600 font-bold">{modeInfo.subtitle}</span>
                <span aria-hidden="true">·</span>
                <span className="truncate text-slate-700">현재 전장: {activeMapDef.name}</span>
              </div>
              <h1
                data-testid="lobby-mode-title"
                className="font-display text-xl sm:text-2xl font-black text-slate-900 leading-tight mt-0.5"
              >
                {selectedMode === 'ffa' && isPractice ? '연습장' : modeInfo.label}
              </h1>
              <p className="text-xs text-slate-600 mt-0.5 leading-snug">
                {selectedMode === 'ffa' && isPractice
                  ? '20종 전술 맵과 11명 파이터의 6슬롯 무장을 자유롭게 테스트합니다.'
                  : modeInfo.description}
              </p>
            </div>
          </div>

          {/* 2. ZERO-DRAG 11-FIGHTER GRID + SELECTED FIGHTER SUMMARY */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 space-y-2 shrink-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-black text-slate-800">캐릭터 선택 · 11명 전체</span>
              <span className="text-[11px] font-semibold text-slate-500">한 번에 1클릭 선택</span>
            </div>

            {/* 4x3 Grid showing all 11 fighters simultaneously + Random picker (ZERO horizontal drag/scroll!) */}
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5" data-testid="left-character-grid">
              {CHARACTER_LIST.map((c) => {
                const active = selectedCharacter === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    data-char-id={c.id}
                    data-testid={`char-card-${c.id}`}
                    onClick={() => onSelectCharacter(c.id)}
                    className={`min-h-[36px] px-1.5 sm:px-2 py-1.5 rounded-lg border text-[10px] sm:text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1 sm:gap-1.5 ${
                      active
                        ? 'bg-rose-600 border-rose-600 text-white shadow-xs'
                        : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-100 hover:border-slate-300'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${active ? 'ring-1 ring-white/80' : ''}`}
                      style={{ backgroundColor: c.primaryColor }}
                    />
                    <span className="truncate">{c.name}</span>
                  </button>
                );
              })}

              <button
                type="button"
                data-testid="random-character-btn"
                onClick={handlePickRandomCharacter}
                className="min-h-[36px] px-1.5 sm:px-2 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 hover:border-slate-300 text-[10px] sm:text-[11px] font-bold text-slate-700 cursor-pointer flex items-center justify-center gap-1 transition-colors"
                title="무작위 캐릭터 선택"
              >
                <Shuffle className="w-3 h-3 text-rose-600 shrink-0" />
                <span>랜덤</span>
              </button>
            </div>

            {/* Selected Fighter Details + Inline Tabular Stats + 6-Slot Bar */}
            <div className="pt-2 border-t border-slate-200 space-y-1.5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <h2
                    data-testid="selected-character-name"
                    className="font-display text-base font-black text-slate-900 whitespace-nowrap"
                  >
                    {char.name}
                  </h2>
                  <span className="text-[11px] font-bold text-rose-600 whitespace-nowrap">
                    {char.titleKr}
                  </span>
                </div>
                <div className="font-mono-num text-[11px] font-bold text-slate-600 whitespace-nowrap">
                  체력 {char.maxHp} · 속도 {Math.round(char.speedMult * 100)}% · 공격{' '}
                  {Math.round(char.damageMult * 100)}%
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-snug" data-testid="selected-character-desc">
                {char.summary}
              </p>

              <div className="flex items-center justify-between gap-1.5 pt-0.5">
                <div className="flex items-center gap-1 flex-1 min-w-0">
                  {char.loadout.map((item, idx) => (
                    <div
                      key={`${char.id}-slot-${item.id}-${idx}`}
                      title={`${idx + 1}번 ${item.name} (${item.role})`}
                      className="flex-1 py-1 rounded-md bg-white border border-slate-200 flex items-center justify-center gap-1"
                    >
                      <WeaponIcon id={item.id} className="w-3.5 h-3.5 text-slate-700 shrink-0" />
                      <span className="text-[9px] font-mono-num font-bold text-slate-500">
                        {idx + 1}
                      </span>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  data-testid="toggle-loadout-drawer-btn"
                  onClick={() => setLoadoutExpanded((v) => !v)}
                  className="px-2.5 py-1 rounded-md bg-white hover:bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-700 cursor-pointer whitespace-nowrap shrink-0"
                >
                  {loadoutExpanded ? '무장 접기' : '무장 상세'}
                </button>
              </div>

              {loadoutExpanded && (
                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  {char.loadout.map((item, idx) => (
                    <div
                      key={`${char.id}-detail-${item.id}-${idx}`}
                      className="p-1.5 rounded-lg bg-white border border-slate-200 flex items-center gap-2"
                    >
                      <WeaponIcon id={item.id} className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                      <div className="min-w-0">
                        <div className="text-[11px] font-bold text-slate-900 truncate">
                          {idx + 1}. {item.name}
                        </div>
                        <div className="text-[9px] text-slate-500 truncate">
                          쿨 {item.cooldown.toFixed(1)}s · {item.role}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 3. FLEX-1 VERTICALLY FILLED WHITE MAP / SERVER / MODE BUTTONS */}
          <div className="flex-1 min-h-0 flex flex-col">
            {/* 3A. 빠른 대전 (FFA / 녹아웃 / 연습장): Large White Map Cards Filling Left Panel */}
            {selectedMode === 'ffa' && (
              <div className="flex-1 min-h-0 flex flex-col gap-2" data-testid="quick-match-map-section">
                <div className="flex items-center justify-between gap-2 shrink-0">
                  <span className="text-xs font-black text-slate-800">
                    {isPractice ? '연습장 맵 선택 · 전체 20종' : '맵 선택 · 현재 4맵 로테이션'}
                  </span>
                  {isPractice ? (
                    <button
                      type="button"
                      data-testid="toggle-all-20-maps-btn"
                      onClick={() => setShowAll20Maps((v) => !v)}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-[11px] font-bold text-slate-800 flex items-center gap-1 cursor-pointer"
                    >
                      <span>{showAll20Maps ? '4맵 로테이션 보기' : '전체 20맵 선택'}</span>
                      {showAll20Maps ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  ) : (
                    <span className="text-[11px] font-semibold text-slate-500">
                      15분 로테이션 전용
                    </span>
                  )}
                </div>

                {!(isPractice && showAll20Maps) ? (
                  <div
                    className="grid grid-cols-2 gap-2.5 flex-1 min-h-[168px] auto-rows-fr"
                    data-testid="main-rotation-grid"
                  >
                    {rotationMaps.map((mId, idx) => {
                      const def = MAP_DEFINITIONS[mId] ?? MAP_DEFINITIONS.container_yard;
                      const active = currentMapId === mId;
                      return (
                        <button
                          key={mId}
                          type="button"
                          data-testid={`rotation-map-card-${mId}`}
                          onClick={() => onSelectPracticeMap(mId)}
                          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between min-h-[82px] shadow-xs ${
                            active
                              ? 'bg-rose-50 border-rose-500 ring-2 ring-rose-500/20 text-slate-900'
                              : 'bg-white border-slate-200 hover:border-slate-400 hover:bg-slate-50 text-slate-900'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1 text-[11px]">
                            <span className="font-bold text-slate-500">
                              #{idx + 1} · {def.badge}
                            </span>
                            {active && (
                              <span className="font-black text-rose-600">선택됨</span>
                            )}
                          </div>
                          <div>
                            <div className="font-display text-sm sm:text-base font-black text-slate-900 truncate">
                              {def.name}
                            </div>
                            <div className="mt-1.5 flex items-center gap-2">
                              <span
                                className="h-1 w-8 rounded-full shrink-0"
                                style={{ backgroundColor: def.accentHex }}
                              />
                              <span className="text-[10px] font-semibold text-slate-500 truncate">
                                {def.worldRadius * 2}m 밀집 전장
                              </span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex-1 min-h-0 flex flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-1 shrink-0">
                      {(
                        [
                          { id: 'all', label: '전체 20' },
                          { id: 'industrial', label: '산업·도시' },
                          { id: 'nature', label: '자연·유적' },
                          { id: 'citadel', label: '요새·용암' },
                          { id: 'cosmic', label: '우주·특수' },
                        ] as Array<{ id: 'all' | MapCategory; label: string }>
                      ).map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setPracticeCategoryFilter(cat.id)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                            practiceCategoryFilter === cat.id
                              ? 'bg-rose-600 text-white'
                              : 'bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-2 gap-2 flex-1 min-h-[150px] overflow-y-auto pr-1">
                      {filteredPracticeMaps.map((mId) => {
                        const def = MAP_DEFINITIONS[mId];
                        const active = currentMapId === mId;
                        return (
                          <button
                            key={mId}
                            type="button"
                            data-testid={`practice-map-select-${mId}`}
                            onClick={() => onSelectPracticeMap(mId)}
                            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                              active
                                ? 'bg-rose-50 border-rose-500 ring-1 ring-rose-500/20 text-slate-900'
                                : 'bg-white border-slate-200 hover:border-slate-400 hover:bg-slate-50 text-slate-900'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1 text-[10px]">
                              <span className="font-semibold text-slate-500 truncate">{def.badge}</span>
                              {active && <span className="font-black text-rose-600">선택</span>}
                            </div>
                            <div className="font-display text-xs sm:text-sm font-black mt-1 truncate text-slate-900">
                              {def.name}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 3B. 데스매치 (온라인 오픈월드): Large White 4 Rotating Server Cards */}
            {selectedMode === 'online_world' && (
              <div className="flex-1 min-h-0 flex flex-col gap-2" data-testid="online-world-panel">
                <div className="flex items-center justify-between shrink-0">
                  <span className="text-xs font-black text-slate-800">
                    오픈월드 서버(맵) 선택 · 15분 순환
                  </span>
                  <span className="text-xs font-mono-num text-amber-700 font-black">
                    {formatRotationTimer(rotationSecondsLeft)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5 flex-1 min-h-[168px] auto-rows-fr">
                  {rotationMaps.map((mId, idx) => {
                    const def = MAP_DEFINITIONS[mId] ?? MAP_DEFINITIONS.container_yard;
                    const active = currentMapId === mId;
                    return (
                      <button
                        key={mId}
                        type="button"
                        data-testid={`openworld-map-card-${mId}`}
                        onClick={() => onSelectOpenWorldMap(mId)}
                        className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between min-h-[82px] shadow-xs ${
                          active
                            ? 'bg-rose-50 border-rose-500 ring-2 ring-rose-500/20 text-slate-900'
                            : 'bg-white border-slate-200 hover:border-slate-400 hover:bg-slate-50 text-slate-900'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 text-[11px]">
                          <span className="font-bold text-slate-500">
                            서버 #{idx + 1} · {def.badge}
                          </span>
                          {active && <span className="font-black text-rose-600">선택됨</span>}
                        </div>
                        <div>
                          <div className="font-display text-sm sm:text-base font-black text-slate-900 truncate">
                            {def.name}
                          </div>
                          <div className="mt-1.5 h-1 w-8 rounded-full" style={{ backgroundColor: def.accentHex }} />
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="p-2.5 rounded-xl bg-sky-50 border border-sky-200 text-xs font-medium text-sky-900 flex items-center gap-2 shrink-0">
                  <Zap className="w-4 h-4 text-sky-600 shrink-0" />
                  <span>전장 보급 코어 4종 및 돌발 서지 이벤트가 실시간으로 활성화됩니다.</span>
                </div>
              </div>
            )}

            {/* 3C. 랭킹전 (랭크 1대1 대결) */}
            {selectedMode === 'link_duel' && (
              <div className="flex-1 min-h-0 flex flex-col justify-between gap-2.5" data-testid="link-duel-panel">
                <div className="grid grid-cols-2 gap-2.5 flex-1 min-h-[120px]">
                  <button
                    type="button"
                    data-testid="create-link-duel-btn"
                    onClick={() => onCreateLinkDuel(playerCallsign)}
                    className="p-4 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-400 text-slate-900 text-left cursor-pointer flex flex-col justify-center gap-2 shadow-xs"
                  >
                    <div className="flex items-center gap-2 font-display text-sm sm:text-base font-black leading-tight">
                      <Link2 className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>방 생성 · 코드</span>
                    </div>
                    <div className="text-xs text-slate-500 leading-relaxed">
                      4자리 초대 코드를 생성해 친구와 1:1 랭크 대결을 시작합니다.
                    </div>
                  </button>

                  <button
                    type="button"
                    data-testid="quick-match-link-duel-btn"
                    onClick={() =>
                      multiplayer.linkQueueing
                        ? onCancelLinkQueue()
                        : onQueueLinkDuel(playerCallsign)
                    }
                    className="p-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-left cursor-pointer flex flex-col justify-center gap-2 shadow-sm"
                  >
                    <div className="flex items-center gap-2 font-display text-sm sm:text-base font-black leading-tight">
                      <Swords className="w-4 h-4 shrink-0" />
                      <span>{multiplayer.linkQueueing ? '매칭 대기 취소' : '실시간 1:1 매칭'}</span>
                    </div>
                    <div className="text-xs text-sky-100 leading-relaxed">
                      {multiplayer.linkQueueing
                        ? '동일 ELO 티어 라이벌을 실시간으로 탐색 중입니다.'
                        : '동일 티어 라이벌과 즉시 3판 2선승 랭크 대결을 매칭합니다.'}
                    </div>
                  </button>
                </div>

                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-2 shrink-0">
                  <input
                    type="text"
                    maxLength={4}
                    value={linkCodeInput}
                    onChange={(e) => setLinkCodeInput(e.target.value.toUpperCase())}
                    placeholder="4자리 초대 코드 입력"
                    className="flex-1 bg-transparent px-2 text-xs sm:text-sm font-mono-num font-bold text-slate-900 uppercase focus:outline-none placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      linkCodeInput.trim() && onJoinLinkDuel(linkCodeInput.trim(), playerCallsign)
                    }
                    className="px-4 py-2 rounded-lg bg-rose-600 text-white text-xs font-bold hover:bg-rose-500 cursor-pointer"
                  >
                    코드 입장
                  </button>
                </div>

                {multiplayer.roomCode && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between gap-2 shrink-0">
                    <div>
                      <div className="text-[11px] font-bold text-rose-700">대기 중인 1:1 코드</div>
                      <div className="font-mono-num text-lg font-black text-slate-900">
                        {multiplayer.roomCode}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyInviteLink(multiplayer.roomCode!, true)}
                      className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedLink ? '복사됨' : '초대링크'}</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* 3D. 사용자 설정 게임 (상단 [사용자 설정 게임] 버튼 클릭 시) */}
            {selectedMode === 'multiplayer' && !inCustomLobby && (
              <div className="flex-1 min-h-0 flex flex-col justify-between gap-2.5" data-testid="custom-room-entry">
                <div className="grid grid-cols-2 gap-2.5 flex-1 min-h-[120px]">
                  <button
                    type="button"
                    data-testid="create-ffa-room-btn"
                    onClick={() =>
                      onCreateRoom(
                        playerCallsign,
                        multiplayer.includeBots,
                        'ffa',
                        'ffa',
                        multiplayer.botDifficulty ?? 'medium',
                        multiplayer.partyMode ?? 'knockout',
                        customBots
                      )
                    }
                    className="p-4 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-400 text-slate-900 text-left cursor-pointer flex flex-col justify-center gap-2 shadow-xs"
                  >
                    <div className="font-display text-sm sm:text-base font-black flex items-center gap-2 leading-tight">
                      <Flame className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>개인전(FFA) 방 생성</span>
                    </div>
                    <div className="text-xs text-slate-500 leading-relaxed">
                      커스텀 봇 자유 배치 · 특수 규칙 및 20맵 룰렛 투표 지원
                    </div>
                  </button>

                  <button
                    type="button"
                    data-testid="create-team-room-btn"
                    onClick={() =>
                      onCreateRoom(
                        playerCallsign,
                        multiplayer.includeBots,
                        'team',
                        'red',
                        multiplayer.botDifficulty ?? 'medium',
                        multiplayer.partyMode ?? 'knockout',
                        customBots
                      )
                    }
                    className="p-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-left cursor-pointer flex flex-col justify-center gap-2 shadow-sm"
                  >
                    <div className="font-display text-sm sm:text-base font-black flex items-center gap-2 leading-tight">
                      <Users className="w-4 h-4 shrink-0" />
                      <span>팀전(RED vs BLUE)</span>
                    </div>
                    <div className="text-xs text-sky-100 leading-relaxed">
                      팀킬 방지 · RED / BLUE 진영 외곽선 구분 및 드래그 팀 배정
                    </div>
                  </button>
                </div>

                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-2 shrink-0">
                  <input
                    type="text"
                    data-testid="join-room-code-input"
                    maxLength={4}
                    value={joinCodeInput}
                    onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                    placeholder="사용자 설정 방 4자리 코드 입력"
                    className="flex-1 bg-transparent px-2 text-xs sm:text-sm font-mono-num font-bold text-slate-900 uppercase focus:outline-none placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    data-testid="join-room-submit-btn"
                    onClick={() =>
                      joinCodeInput.trim() && onJoinRoom(joinCodeInput.trim(), playerCallsign, 'ffa')
                    }
                    className="px-4 py-2 rounded-lg bg-rose-600 text-white text-xs font-bold hover:bg-rose-500 cursor-pointer"
                  >
                    코드 참가
                  </button>
                </div>
              </div>
            )}

            {/* INSIDE CUSTOM LOBBY (White Theme) */}
            {inCustomLobby && (
              <div className="space-y-2.5 overflow-y-auto pr-1" data-testid="custom-room-lobby">
                <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-500">방 코드</span>
                    <span
                      data-testid="custom-room-code"
                      className="font-mono-num text-base font-black text-rose-700 px-2 py-0.5 rounded-md bg-rose-50 border border-rose-200"
                    >
                      {multiplayer.roomCode}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyRoomCode(multiplayer.roomCode!)}
                      className="px-2 py-1 rounded-md bg-white hover:bg-slate-100 border border-slate-200 text-[11px] font-bold text-slate-700 flex items-center gap-1 cursor-pointer"
                    >
                      {copiedCode ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedCode ? '복사됨' : '코드복사'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopyInviteLink(multiplayer.roomCode!, false)}
                      className="px-2 py-1 rounded-md bg-white hover:bg-slate-100 border border-slate-200 text-[11px] font-bold text-slate-700 flex items-center gap-1 cursor-pointer"
                    >
                      <Link2 className="w-3 h-3" />
                      <span>{copiedLink ? '링크복사됨' : '초대링크'}</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      data-testid="switch-room-ffa-btn"
                      onClick={() => onUpdateLobby({ roomMode: 'ffa', team: 'ffa' })}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                        multiplayer.roomMode === 'ffa'
                          ? 'bg-rose-600 text-white'
                          : 'bg-white border border-slate-200 text-slate-700'
                      }`}
                    >
                      개인전 (FFA)
                    </button>
                    <button
                      type="button"
                      data-testid="switch-room-team-btn"
                      onClick={() => onUpdateLobby({ roomMode: 'team', team: 'red' })}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                        multiplayer.roomMode === 'team'
                          ? 'bg-sky-600 text-white'
                          : 'bg-white border border-slate-200 text-slate-700'
                      }`}
                    >
                      팀전 (RED vs BLUE)
                    </button>
                    <button
                      type="button"
                      data-testid="leave-custom-room-btn"
                      onClick={onLeaveRoom}
                      className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold cursor-pointer"
                    >
                      방 나가기
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-2">
                    <div className="text-[10px] font-bold text-slate-500 mb-1">아레나 전투 규칙</div>
                    <select
                      aria-label="사용자 설정 게임 전투 규칙"
                      data-testid="custom-party-mode-select"
                      value={multiplayer.partyMode ?? 'knockout'}
                      onChange={(e) =>
                        onUpdateLobby({ partyMode: e.target.value as CustomPartyMode })
                      }
                      className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-900"
                    >
                      {ARENA_RULE_LIST.map((pm) => (
                        <option key={pm.id} value={pm.id}>
                          {pm.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-2">
                    <div className="text-[10px] font-bold text-slate-500 mb-1">AI 봇 난이도</div>
                    <select
                      aria-label="사용자 설정 게임 봇 난이도"
                      data-testid="custom-bot-difficulty-select"
                      value={multiplayer.botDifficulty ?? 'medium'}
                      onChange={(e) =>
                        onUpdateLobby({ botDifficulty: e.target.value as BotDifficulty })
                      }
                      className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-900"
                    >
                      {BOT_DIFFICULTY_LIST.map((bd) => (
                        <option key={bd.id} value={bd.id}>
                          {bd.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-2">
                    <div className="text-[10px] font-bold text-slate-500 mb-1">목표 승리 킬 수</div>
                    <div className="flex items-center gap-1">
                      {[10, 15, 25, 35].map((k) => (
                        <button
                          key={k}
                          type="button"
                          onClick={() => onUpdateLobby({ targetKills: k })}
                          className={`flex-1 py-1 rounded-md text-xs font-mono-num font-bold cursor-pointer ${
                            multiplayer.targetKills === k
                              ? 'bg-rose-600 text-white'
                              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {k}킬
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Custom Bot Placement Deck (Non-scrolling grid) */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">
                        커스텀 봇 배치 ({customBots.length}명)
                      </span>
                      <label className="flex items-center gap-1 text-[11px] text-slate-600 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={multiplayer.includeBots}
                          onChange={(e) => onUpdateLobby({ includeBots: e.target.checked })}
                          className="accent-rose-600"
                        />
                        <span>빈 슬롯 자동 봇 채우기</span>
                      </label>
                    </div>

                    {customBots.length > 0 && (
                      <button
                        type="button"
                        data-testid="clear-custom-bots-btn"
                        onClick={handleClearBots}
                        className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" /> 초기화
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-1">
                    {CHARACTER_LIST.map((c) => {
                      const selected = selectedPoolBotChar === c.id;
                      return (
                        <div
                          key={c.id}
                          draggable
                          data-testid={`bot-pool-card-${c.id}`}
                          onClick={() => setSelectedPoolBotChar(c.id)}
                          onDragStart={() =>
                            setDragPayload({ type: 'pool', characterId: c.id })
                          }
                          onDragEnd={() => {
                            setDragPayload(null);
                            setDragOverZone(null);
                          }}
                          className={`px-2 py-1 rounded-lg border text-[11px] font-bold flex items-center gap-1 cursor-grab active:cursor-grabbing ${
                            selected
                              ? 'bg-rose-600 border-rose-600 text-white'
                              : 'bg-white border-slate-200 text-slate-800 hover:border-slate-300'
                          }`}
                        >
                          <GripVertical className="w-3 h-3 opacity-50 shrink-0" />
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: c.primaryColor }}
                          />
                          <span className="truncate">{c.name}</span>
                        </div>
                      );
                    })}
                  </div>

                  {multiplayer.roomMode === 'team' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {(
                        [
                          {
                            team: 'red' as PlayerTeam,
                            title: 'RED 팀 슬롯',
                            border: 'border-rose-200',
                            bg: 'bg-rose-50/70',
                            badge: 'bg-rose-600 text-white',
                          },
                          {
                            team: 'blue' as PlayerTeam,
                            title: 'BLUE 팀 슬롯',
                            border: 'border-sky-200',
                            bg: 'bg-sky-50/70',
                            badge: 'bg-sky-600 text-white',
                          },
                        ] as const
                      ).map((zone) => {
                        const teamBots = customBots.filter((b) => b.team === zone.team);
                        const teamPeers = multiplayer.peers.filter((p) => p.team === zone.team);
                        const isOver = dragOverZone === zone.team;
                        return (
                          <div
                            key={zone.team}
                            data-testid={`dropzone-${zone.team}`}
                            onDragOver={(e) => {
                              e.preventDefault();
                              setDragOverZone(zone.team);
                            }}
                            onDragLeave={() => setDragOverZone(null)}
                            onDrop={(e) => {
                              e.preventDefault();
                              setDragOverZone(null);
                              if (!dragPayload) return;
                              if (dragPayload.type === 'pool' && dragPayload.characterId) {
                                handleAddBotToTeam(dragPayload.characterId, zone.team);
                              } else if (dragPayload.type === 'existing' && dragPayload.botId) {
                                handleMoveBotToTeam(dragPayload.botId, zone.team);
                              }
                              setDragPayload(null);
                            }}
                            className={`rounded-xl border p-2.5 min-h-16 ${zone.bg} ${
                              isOver ? 'border-slate-900 ring-2 ring-slate-900/15' : zone.border
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1 mb-1.5">
                              <div className="flex items-center gap-1.5">
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded ${zone.badge}`}>
                                  {zone.title}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => onUpdateLobby({ team: zone.team })}
                                  className="text-[10px] font-bold px-2 py-0.5 rounded bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 cursor-pointer"
                                >
                                  내 팀 변경
                                </button>
                              </div>
                              <button
                                type="button"
                                data-testid={`quick-add-bot-${zone.team}`}
                                onClick={() => handleAddBotToTeam(selectedPoolBotChar, zone.team)}
                                className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-[10px] font-bold text-white flex items-center gap-1 cursor-pointer"
                              >
                                <Plus className="w-3 h-3" /> 봇 추가
                              </button>
                            </div>

                            <div className="flex flex-wrap gap-1.5">
                              {teamPeers.map((p) => (
                                <div
                                  key={p.id}
                                  className="px-2 py-1 rounded bg-white border border-slate-200 text-[11px] font-bold text-slate-900 flex items-center gap-1"
                                >
                                  <Crown className="w-3 h-3 text-rose-600" />
                                  <span>{p.name}</span>
                                </div>
                              ))}
                              {teamBots.map((b) => (
                                <div
                                  key={b.id}
                                  draggable
                                  data-testid={`placed-bot-${b.id}`}
                                  onDragStart={() =>
                                    setDragPayload({ type: 'existing', botId: b.id })
                                  }
                                  className="px-2 py-1 rounded bg-white border border-slate-200 text-[11px] font-bold text-slate-800 flex items-center gap-1.5 cursor-grab"
                                >
                                  <span>{b.name}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveBot(b.id)}
                                    className="text-slate-400 hover:text-rose-600 cursor-pointer"
                                    aria-label="봇 제거"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div
                      data-testid="dropzone-ffa"
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOverZone('ffa');
                      }}
                      onDragLeave={() => setDragOverZone(null)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragOverZone(null);
                        if (dragPayload?.type === 'pool' && dragPayload.characterId) {
                          handleAddBotToTeam(dragPayload.characterId, 'ffa');
                        }
                        setDragPayload(null);
                      }}
                      className={`rounded-xl border p-2.5 min-h-14 bg-white ${
                        dragOverZone === 'ffa' ? 'border-slate-900 ring-2 ring-slate-900/15' : 'border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-bold text-slate-700">개인전(FFA) 참가 슬롯</span>
                        <button
                          type="button"
                          data-testid="quick-add-bot-ffa"
                          onClick={() => handleAddBotToTeam(selectedPoolBotChar, 'ffa')}
                          className="px-2 py-0.5 rounded-md bg-slate-900 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" /> 봇 추가
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {customBots.map((b) => (
                          <div
                            key={b.id}
                            data-testid={`placed-bot-${b.id}`}
                            className="px-2 py-1 rounded bg-slate-50 border border-slate-200 text-[11px] font-bold text-slate-800 flex items-center gap-1.5"
                          >
                            <span>{b.name}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveBot(b.id)}
                              className="text-slate-400 hover:text-rose-600 cursor-pointer"
                              aria-label="봇 제거"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* 20-Map Animated Voting Grid */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-rose-600" />
                      <span className="text-xs font-bold text-slate-900">20종 맵 투표 (총 {totalVotes}표)</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {(
                        [
                          { id: 'all', label: '전체' },
                          { id: 'industrial', label: '산업' },
                          { id: 'nature', label: '자연' },
                          { id: 'citadel', label: '요새' },
                          { id: 'cosmic', label: '우주' },
                        ] as Array<{ id: 'all' | MapCategory; label: string }>
                      ).map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          data-testid={`vote-cat-${cat.id}`}
                          onClick={() => setMapCategoryFilter(cat.id)}
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold cursor-pointer ${
                            mapCategoryFilter === cat.id
                              ? 'bg-rose-600 text-white'
                              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 max-h-32 overflow-y-auto pr-1">
                    {filteredCustomMaps.map((mId) => {
                      const def = MAP_DEFINITIONS[mId];
                      const votes = multiplayer.mapVotes?.[mId] ?? 0;
                      const pct = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
                      const isSelected = multiplayer.selectedMap === mId;
                      const isRoulette = rouletteHighlightMap === mId;
                      const justVoted = lastVotedMap === mId;

                      return (
                        <button
                          key={mId}
                          type="button"
                          data-testid={`vote-map-card-${mId}`}
                          onClick={() => handleVoteMapClick(mId)}
                          className={`relative p-2 rounded-xl border text-left overflow-hidden cursor-pointer ${
                            isRoulette
                              ? 'bg-rose-600 text-white border-rose-600'
                              : isSelected
                                ? 'bg-rose-50 text-slate-900 border-rose-500'
                                : 'bg-white text-slate-800 border-slate-200 hover:border-slate-400'
                          }`}
                        >
                          <div
                            className="absolute inset-y-0 left-0 pointer-events-none transition-all duration-300"
                            style={{ width: `${pct}%`, backgroundColor: `${def.accentHex}22` }}
                          />
                          <div className="relative z-10 flex items-center justify-between gap-1 text-[10px]">
                            <span className={isRoulette ? 'text-rose-100 truncate' : 'text-slate-500 truncate'}>
                              {def.badge}
                            </span>
                            <span className={`font-mono-num font-black ${isRoulette ? 'text-white' : 'text-rose-600'}`}>
                              {votes > 0 ? `${votes}표` : '0표'}
                            </span>
                          </div>
                          <div className={`relative z-10 font-display text-xs font-bold mt-0.5 truncate ${isRoulette ? 'text-white' : 'text-slate-900'}`}>
                            {def.name}
                          </div>
                          {justVoted && (
                            <span className="absolute top-1 right-1 z-20 px-1 py-0.5 rounded bg-rose-600 text-white font-mono-num text-[9px] font-black">
                              +1
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 4. MODE-SPECIFIC BOTTOM CONTROLS & PRIMARY LAUNCH CTA */}
          <div className="pt-2.5 border-t border-slate-200 space-y-2.5 shrink-0">
            {selectedMode === 'ffa' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" data-testid="quick-match-bottom-controls">
                <div className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
                  <label
                    htmlFor="quick-mode-options-select"
                    className="block text-[10px] font-bold text-slate-500 mb-0.5"
                  >
                    특수규칙 · 연습장 선택
                  </label>
                  <select
                    id="quick-mode-options-select"
                    data-testid="quick-mode-options-select"
                    value={quickDropdownValue}
                    onChange={(e) => handleQuickRuleSelectChange(e.target.value as QuickRuleSelectValue)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-900 cursor-pointer focus:outline-none focus:border-rose-500"
                  >
                    <option value="knockout">3분 녹아웃 서바이벌 (기본)</option>
                    <option value="random_arsenal">특수규칙 · 25초 랜덤 무기</option>
                    <option value="one_shot">특수규칙 · 원샷 스나이퍼</option>
                    <option value="boss_raid">특수규칙 · 거대 괴수 레이드</option>
                    <option value="classic">특수규칙 · 클래식 난타전</option>
                    <option value="practice">연습장 · 전장 및 무장 테스트</option>
                  </select>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-slate-500">AI 봇 난이도</span>
                  <div className="grid grid-cols-3 gap-1 mt-0.5" data-testid="practice-bot-difficulty-select">
                    {BOT_DIFFICULTY_LIST.map((bd) => {
                      const activeDiff = (multiplayer.botDifficulty ?? 'medium') === bd.id;
                      return (
                        <button
                          key={bd.id}
                          type="button"
                          data-testid={`practice-bot-difficulty-${bd.id}`}
                          onClick={() => onUpdateLobby({ botDifficulty: bd.id })}
                          className={`py-1.5 rounded-lg text-[11px] font-bold cursor-pointer transition-colors ${
                            activeDiff
                              ? 'bg-slate-900 text-white'
                              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {bd.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {multiplayer.error && (
              <div
                data-testid="lobby-error-banner"
                className="px-3 py-2 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700"
              >
                {multiplayer.error}
              </div>
            )}

            <button
              type="button"
              data-start="true"
              data-testid="start-match-btn"
              disabled={rouletteSpinning}
              onClick={() => {
                if (inCustomLobby) {
                  handleLaunchCustomMatchWithRoulette();
                } else if (selectedMode === 'multiplayer') {
                  onCreateRoom(
                    playerCallsign,
                    multiplayer.includeBots,
                    'ffa',
                    'ffa',
                    multiplayer.botDifficulty ?? 'medium',
                    multiplayer.partyMode ?? 'knockout',
                    customBots
                  );
                } else {
                  onSetPracticeMode(selectedMode === 'ffa' && isPractice);
                  onStart();
                }
              }}
              className="w-full py-3.5 px-5 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-[0.99] text-white font-display text-base sm:text-lg font-black tracking-tight shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all whitespace-nowrap"
            >
              {selectedMode === 'ffa' && isPractice ? (
                <Target className="w-5 h-5 shrink-0" />
              ) : (
                <Swords className="w-5 h-5 shrink-0" />
              )}
              <span>
                {rouletteSpinning
                  ? '투표 맵 추첨 중...'
                  : inCustomLobby
                    ? `커스텀 매치 시작 (${MAP_DEFINITIONS[multiplayer.selectedMap || currentMapId].name})`
                    : selectedMode === 'ffa'
                      ? quickMatchCtaLabel
                      : selectedMode === 'online_world'
                        ? `데스매치 오픈월드 입장 (${activeMapDef.name})`
                        : selectedMode === 'link_duel'
                          ? '랭킹전 1:1 대결 시작'
                          : '사용자 설정 게임 방 생성'}
              </span>
            </button>
          </div>
        </section>

        {/* CENTER & RIGHT OPEN 3D SHOWCASE + BOTTOM-RIGHT WHITE ROTATION TIMER */}
        <section className="flex-1 flex flex-col justify-end items-end pointer-events-none min-h-[120px]">
          <div
            data-testid="bottom-rotation-timer-card"
            className="pointer-events-auto bg-white/95 border border-slate-200 rounded-xl px-4 py-3 shadow-lg flex items-center gap-3 text-slate-900"
          >
            <Clock className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <div className="text-[11px] font-bold text-slate-500">맵 로테이션 남은 시간</div>
              <div className="flex items-baseline gap-2">
                <span
                  data-testid="bottom-rotation-timer"
                  className="font-mono-num text-lg sm:text-xl font-black text-slate-900 leading-tight"
                >
                  {formatRotationTimer(rotationSecondsLeft)}
                </span>
                <span className="text-[11px] font-semibold text-slate-500">· 4맵 순환</span>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ==================== INLINE WHITE PATCH NOTES MODAL ==================== */}
      {updatesOpen && (
        <div
          data-testid="updates-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 pointer-events-auto"
        >
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl p-5 text-slate-900 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h2 className="font-display text-lg font-black text-slate-900">패치노트 &amp; 업데이트 내역</h2>
                <p className="text-xs text-slate-500">SKYBOX CLASH 최신 밸런스 및 신규 콘텐츠</p>
              </div>
              <button
                type="button"
                onClick={() => setUpdatesOpen(false)}
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
              {PATCH_NOTES.map((note) => (
                <div key={note.version} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-display text-sm font-bold text-rose-600">{note.version}</span>
                    <span className="text-[11px] text-slate-500">{note.date}</span>
                  </div>
                  <ul className="space-y-1.5 text-xs text-slate-700 list-disc pl-4">
                    {note.highlights.map((h) => (
                      <li key={h}>{h}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
