import {
  Check,
  Clock,
  Copy,
  Crown,
  Flame,
  Gamepad2,
  Link2,
  MapPin,
  MessageSquare,
  Play,
  Plus,
  Send,
  Settings,
  Shield,
  Sparkles,
  Swords,
  Trash2,
  Trophy,
  UserPlus,
  Users,
  VolumeX,
  X,
  Zap,
} from 'lucide-react';
import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import type { LocalSkillStats } from '../App';
import type { PlayerAccountProfile } from '../firebase';
import { CHARACTER_LIST, CHARACTER_MAP, GAME_MODES } from '../game/characters';
import {
  MAP_DEFINITIONS,
  MAP_ORDER,
  getArenaBlocksForMap,
  getJumpPadsForMap,
} from '../game/maps';
import {
  evaluatePlayerSkillForMatchmaking,
  type SkillEvaluationResult,
} from '../game/partyModes';
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
import { MapPreview3D } from './MapPreview3D';
import { OverwatchHeroSelect } from './OverwatchHeroSelect';
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
    label: '1분 녹아웃 서바이벌',
    badge: '1:00',
    shortDesc: '1분마다 킬 할당 미달자 탈락',
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
  skillStats?: LocalSkillStats;
  initialRoomCode: string;
  initialLinkCode: string;
  onSelectCharacter: (id: CharacterId) => void;
  onSelectMode: (mode: GameModeId) => void;
  onSetPracticeMode: (enabled: boolean) => void;
  onSelectOpenWorldMap: (mapId: MapId) => void;
  onSelectPracticeMap: (mapId: MapId) => void;
  onPlayUiSound?: (kind: 'vote' | 'tick' | 'lock', step?: number) => void;
  onStart: () => void;
  onLaunchMatchedGame?: (skillDifficulty?: BotDifficulty) => void;
  onSetPlayerName: (name: string) => void;
  onOpenAuth: (tab: 'auth' | 'leaderboard' | 'friends') => void;
  onOpenSettings: () => void;
  onCreateLinkDuel: (name: string, customCode?: string) => void;
  onJoinLinkDuel: (code: string, name: string) => void;
  onQueueLinkDuel: (name: string) => void;
  onCancelLinkQueue: () => void;
  onQueueQuickMatch?: (name: string) => void;
  onCancelQuickQueue?: () => void;
  onCreateRoom: (
    name: string,
    includeBots: boolean,
    roomMode: RoomMode,
    team: PlayerTeam,
    botDifficulty?: BotDifficulty,
    partyMode?: CustomPartyMode,
    customBots?: CustomBotSlot[],
    customCode?: string
  ) => void;
  onJoinRoom: (code: string, name: string, team: PlayerTeam) => void;
  onUpdateLobby: (updates: LobbyUpdatePayload) => void;
  onVoteMap: (mapId: MapId) => void;
  onPreviewMap?: (mapId: MapId | null) => void;
  onSendChat: (text: string) => void;
  onStartMultiplayer: () => void;
  onLeaveRoom: () => void;
  onResetNetwork: () => void;
}

const PATCH_NOTES = [
  {
    version: 'v3.7 — 실시간 매칭 대기열 & 실력 기반 매칭',
    date: '최신 업데이트',
    highlights: [
      '빠른 대전·랭킹전 실시간 매칭 대기열(00:00~00:30 대형 타이머) 및 30초 자동 성사 적용',
      '플레이어 ELO·전적·최근 K/D·연승/연패 기반 실시간 랭크 매칭 및 밸런스 보정 적용',
      '데스매치 오픈월드 및 연습장 즉시 입장, 3라운드 결승 녹아웃 개편',
    ],
  },
  {
    version: 'v3.6 — 화이트 아레나 로비 & 사용자 설정 게임 개편',
    date: '이전 업데이트',
    highlights: [
      '전체 로비를 밝은 화이트 스튜디오 테마로 통일하고 빠른 대전을 상단 정중앙(50%)에 배치',
      '가로 드래그 없는 11명 전체 캐릭터 격자 선택 + 대칭 랜덤 버튼 적용',
      '3분 녹아웃 라운드 종료 시 9종 스펙터클 탈락 연출(희귀 잭팟 4종 포함) 추가',
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
  chatMessages,
  account,
  skillStats,
  initialRoomCode,
  initialLinkCode,
  onSelectCharacter,
  onSelectMode,
  onSetPracticeMode,
  onSelectOpenWorldMap,
  onSelectPracticeMap,
  onPlayUiSound,
  onStart,
  onLaunchMatchedGame,
  onSetPlayerName,
  onOpenAuth,
  onOpenSettings,
  onCreateLinkDuel,
  onJoinLinkDuel,
  onQueueLinkDuel,
  onCancelLinkQueue,
  onQueueQuickMatch,
  onCancelQuickQueue,
  onCreateRoom,
  onJoinRoom,
  onUpdateLobby,
  onVoteMap,
  onPreviewMap,
  onSendChat,
  onStartMultiplayer,
  onLeaveRoom,
}: TitleScreenProps) {
  const char = CHARACTER_MAP[selectedCharacter] ?? CHARACTER_LIST[0];
  const modeInfo = GAME_MODES.find((m) => m.id === selectedMode) ?? GAME_MODES[0];

  const [joinCodeInput, setJoinCodeInput] = useState(initialRoomCode || '');
  const [customCreateCode, setCustomCreateCode] = useState('');
  const [linkCodeInput, setLinkCodeInput] = useState(initialLinkCode || '');
  const [linkCreateCode, setLinkCreateCode] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const [updatesOpen, setUpdatesOpen] = useState(false);
  const [heroSelectMode, setHeroSelectMode] = useState<'quick_launch' | 'browse' | null>(null);
  const [heroSelectSec, setHeroSelectSec] = useState(15);
  const [heroSelectLaunching, setHeroSelectLaunching] = useState(false);

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
  const [hoveredMapId, setHoveredMapId] = useState<MapId | null>(null);
  const [lastVotedMap, setLastVotedMap] = useState<MapId | null>(null);
  const [rouletteSpinning, setRouletteSpinning] = useState(false);
  const [rouletteHighlightMap, setRouletteHighlightMap] = useState<MapId | null>(null);

  // Custom Lobby Direct Chat state
  const [customChatText, setCustomChatText] = useState('');
  const [customChatHovered, setCustomChatHovered] = useState(false);
  const [customChatFocused, setCustomChatFocused] = useState(false);
  const customChatScrollRef = useRef<HTMLDivElement | null>(null);
  const customChatInputRef = useRef<HTMLInputElement | null>(null);
  const customChatExpanded = customChatHovered || customChatFocused;

  // Real-time Matchmaking Queue state (Quick Match & Ranked 1v1)
  const [queueActiveMode, setQueueActiveMode] = useState<'ffa' | 'link_duel' | null>(null);
  const [queueElapsedSec, setQueueElapsedSec] = useState(0);
  const [matchFoundState, setMatchFoundState] = useState(false);
  const [activeQueueDecision, setActiveQueueDecision] = useState<SkillEvaluationResult | null>(null);

  const liveSkillEvaluation = evaluatePlayerSkillForMatchmaking(
    {
      elo: account?.elo ?? 1000,
      wins: (account?.wins ?? 0) + (skillStats?.wins ?? 0),
      losses: (account?.losses ?? 0) + (skillStats?.losses ?? 0),
      kills: (account?.kills ?? 0) + (skillStats?.kills ?? 0),
      deaths: (account?.deaths ?? 0) + (skillStats?.deaths ?? 0),
      recentKd: skillStats?.recentKd ?? 1.0,
      winStreak: skillStats?.winStreak ?? 0,
      lossStreak: skillStats?.lossStreak ?? 0,
    },
    () => 0.45
  );

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

  const handleStartMatchmakingQueue = (targetMode: 'ffa' | 'link_duel') => {
    const decision = evaluatePlayerSkillForMatchmaking({
      elo: account?.elo ?? 1000,
      wins: (account?.wins ?? 0) + (skillStats?.wins ?? 0),
      losses: (account?.losses ?? 0) + (skillStats?.losses ?? 0),
      kills: (account?.kills ?? 0) + (skillStats?.kills ?? 0),
      deaths: (account?.deaths ?? 0) + (skillStats?.deaths ?? 0),
      recentKd: skillStats?.recentKd ?? 1.0,
      winStreak: skillStats?.winStreak ?? 0,
      lossStreak: skillStats?.lossStreak ?? 0,
    });
    setActiveQueueDecision(decision);
    setQueueElapsedSec(0);
    setMatchFoundState(false);
    setQueueActiveMode(targetMode);
    onPlayUiSound?.('vote');

    if (targetMode === 'link_duel') {
      onQueueLinkDuel(playerCallsign);
    } else {
      onSetPracticeMode(false);
      onQueueQuickMatch?.(playerCallsign);
    }
  };

  const handleCancelMatchmakingQueue = () => {
    if (queueActiveMode === 'link_duel') {
      onCancelLinkQueue();
    } else if (queueActiveMode === 'ffa') {
      onCancelQuickQueue?.();
    }
    setQueueActiveMode(null);
    setQueueElapsedSec(0);
    setMatchFoundState(false);
  };

  const handleTriggerMatchFoundAndLaunch = () => {
    if (matchFoundState) return;
    setMatchFoundState(true);
    onPlayUiSound?.('lock');
    const diff = (activeQueueDecision ?? liveSkillEvaluation).recommendedDifficulty;
    window.setTimeout(() => {
      setQueueActiveMode(null);
      setMatchFoundState(false);
      if (onLaunchMatchedGame) {
        onLaunchMatchedGame(diff);
      } else {
        onStart();
      }
    }, 900);
  };

  useEffect(() => {
    if (!queueActiveMode || matchFoundState) return;
    const id = window.setInterval(() => {
      setQueueElapsedSec((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, [queueActiveMode, matchFoundState]);

  useEffect(() => {
    if (!queueActiveMode || matchFoundState) return;
    const decision = activeQueueDecision ?? liveSkillEvaluation;
    // Wait up to decision.targetWaitSec (7~13s for low-tier frequent AI matches, or 30s human search)
    if (queueElapsedSec >= decision.targetWaitSec || queueElapsedSec >= 30) {
      handleTriggerMatchFoundAndLaunch();
    }
  }, [queueElapsedSec, queueActiveMode, matchFoundState, activeQueueDecision]);

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

  const handleConfirmHeroSelect = () => {
    if (heroSelectLaunching) return;
    onPlayUiSound?.('lock');
    if (heroSelectMode === 'quick_launch') {
      setHeroSelectLaunching(true);
      const diff = (activeQueueDecision ?? liveSkillEvaluation).recommendedDifficulty;
      window.setTimeout(() => {
        setHeroSelectMode(null);
        setHeroSelectLaunching(false);
        if (onLaunchMatchedGame) {
          onLaunchMatchedGame(diff);
        } else {
          onStart();
        }
      }, 250);
    } else {
      setHeroSelectMode(null);
    }
  };

  const handleCancelHeroSelect = () => {
    if (heroSelectMode === 'quick_launch') {
      onCancelQuickQueue?.();
    }
    setHeroSelectMode(null);
    setHeroSelectLaunching(false);
  };

  useEffect(() => {
    if (heroSelectMode !== 'quick_launch' || heroSelectLaunching) return;
    if (heroSelectSec <= 0) {
      handleConfirmHeroSelect();
      return;
    }
    const id = window.setTimeout(() => {
      setHeroSelectSec((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => window.clearTimeout(id);
  }, [heroSelectMode, heroSelectSec, heroSelectLaunching]);

  const handleAddBotToTeam = (characterId: CharacterId, team: PlayerTeam) => {
    const cProf = CHARACTER_MAP[characterId] ?? CHARACTER_LIST[0];
    const nextBot: CustomBotSlot = {
      id: `bot-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: cProf.name,
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
    if (queueActiveMode) {
      handleCancelMatchmakingQueue();
    }
    if (val === 'practice') {
      onSelectMode('ffa');
      onSetPracticeMode(true);
      return;
    }
    onSelectMode('ffa');
    onSetPracticeMode(false);
    onUpdateLobby({ partyMode: val });
  };

  const totalVotes = MAP_ORDER.reduce((sum, mId) => sum + (multiplayer.mapVotes?.[mId] ?? 0), 0);
  const inCustomLobby =
    selectedMode === 'multiplayer' &&
    multiplayer.roomKind === 'private' &&
    Boolean(multiplayer.roomCode);

  useEffect(() => {
    if (!inCustomLobby && hoveredMapId !== null) {
      setHoveredMapId(null);
      onPreviewMap?.(null);
    }
  }, [inCustomLobby]);

  useEffect(() => {
    if (!inCustomLobby) return;
    const el = customChatScrollRef.current;
    if (!el) return;
    const pinBottom = () => {
      el.scrollTop = el.scrollHeight;
    };
    pinBottom();
    const timer = window.setTimeout(pinBottom, 220);
    const observer =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => {
            pinBottom();
          })
        : null;
    observer?.observe(el);
    return () => {
      window.clearTimeout(timer);
      observer?.disconnect();
    };
  }, [inCustomLobby, chatMessages.length, customChatExpanded]);

  useEffect(() => {
    return () => {
      onPreviewMap?.(null);
    };
  }, []);

  const handleCustomChatSubmit = (e?: FormEvent) => {
    e?.preventDefault();
    const clean = customChatText.trim();
    if (!clean) return;
    onSendChat(clean);
    setCustomChatText('');
    customChatInputRef.current?.blur();
  };

  const isHoveringMap = inCustomLobby && hoveredMapId !== null;
  const previewMapId: MapId = hoveredMapId ?? multiplayer.selectedMap ?? currentMapId;
  const previewMapDef = MAP_DEFINITIONS[previewMapId] ?? activeMapDef;
  const previewBlockCount = useMemo(
    () => getArenaBlocksForMap(previewMapId).length,
    [previewMapId]
  );
  const previewJumpPadCount = useMemo(
    () => getJumpPadsForMap(previewMapId).length,
    [previewMapId]
  );
  const previewVotes = multiplayer.mapVotes?.[previewMapId] ?? 0;

  const filteredCustomMaps = MAP_ORDER.filter(
    (mId) => mapCategoryFilter === 'all' || MAP_DEFINITIONS[mId].category === mapCategoryFilter
  );
  const filteredPracticeMaps = MAP_ORDER.filter(
    (mId) =>
      practiceCategoryFilter === 'all' || MAP_DEFINITIONS[mId].category === practiceCategoryFilter
  );

  const handlePrimaryLaunch = () => {
    if (rouletteSpinning) return;
    if (inCustomLobby) {
      handleLaunchCustomMatchWithRoulette();
    } else if (selectedMode === 'multiplayer') {
      onCreateRoom(
        playerCallsign,
        false,
        'ffa',
        'ffa',
        multiplayer.botDifficulty ?? 'medium',
        multiplayer.partyMode ?? 'knockout',
        customBots,
        customCreateCode.trim() || undefined
      );
    } else if (selectedMode === 'ffa' && !isPractice) {
      const decision = evaluatePlayerSkillForMatchmaking({
        elo: account?.elo ?? 1000,
        wins: (account?.wins ?? 0) + (skillStats?.wins ?? 0),
        losses: (account?.losses ?? 0) + (skillStats?.losses ?? 0),
        kills: (account?.kills ?? 0) + (skillStats?.kills ?? 0),
        deaths: (account?.deaths ?? 0) + (skillStats?.deaths ?? 0),
        recentKd: skillStats?.recentKd ?? 1.0,
        winStreak: skillStats?.winStreak ?? 0,
        lossStreak: skillStats?.lossStreak ?? 0,
      });
      setActiveQueueDecision(decision);
      onSetPracticeMode(false);
      onQueueQuickMatch?.(playerCallsign);
      onPlayUiSound?.('vote');
      setHeroSelectSec(15);
      setHeroSelectLaunching(false);
      setHeroSelectMode('quick_launch');
    } else if (selectedMode === 'link_duel') {
      if (queueActiveMode === 'link_duel') {
        handleTriggerMatchFoundAndLaunch();
      } else {
        handleStartMatchmakingQueue('link_duel');
      }
    } else {
      if (queueActiveMode) {
        handleCancelMatchmakingQueue();
      }
      onSetPracticeMode(selectedMode === 'ffa' && isPractice);
      onStart();
    }
  };

  const primaryPlayLabel = rouletteSpinning
    ? '맵 추첨 중...'
    : matchFoundState
      ? '전장 입장 중...'
      : inCustomLobby
        ? 'PLAY · 커스텀 시작'
        : selectedMode === 'ffa'
          ? isPractice
            ? 'PLAY · 연습장'
            : 'PLAY · 빠른 대전'
          : selectedMode === 'online_world'
            ? 'PLAY · 데스매치'
            : selectedMode === 'link_duel'
              ? queueActiveMode === 'link_duel'
                ? `매칭 중 (${formatRotationTimer(queueElapsedSec)}) · 즉시 시작`
                : 'PLAY · 랭킹전'
              : '방 만들기';

  if (heroSelectMode !== null) {
    return (
      <OverwatchHeroSelect
        selectedCharacter={selectedCharacter}
        modeTitle={
          heroSelectMode === 'quick_launch'
            ? '빠른 대전 · 1분 녹아웃'
            : selectedMode === 'ffa' && isPractice
              ? '연습장'
              : modeInfo.label
        }
        mapLabel={
          selectedMode === 'ffa' && !isPractice ? '20종 랜덤 아레나' : activeMapDef.name
        }
        isQuickLaunch={heroSelectMode === 'quick_launch'}
        countdownSec={heroSelectMode === 'quick_launch' ? heroSelectSec : undefined}
        isLaunching={heroSelectLaunching}
        onSelectCharacter={(id) => {
          onPlayUiSound?.('vote');
          onSelectCharacter(id);
        }}
        onConfirm={handleConfirmHeroSelect}
        onCancel={handleCancelHeroSelect}
      />
    );
  }

  return (
    <div
      data-testid="title-screen"
      className="fixed inset-0 z-30 flex flex-col justify-between pointer-events-none select-none overflow-hidden text-slate-900"
    >
      {/* ==================== FULL-WIDTH WHITE TOP BAR: [랭킹전 · 데스매치] --- [빠른 대전 (정중앙 50%)] --- [사용자 설정 게임 ... 유틸] ==================== */}
      <header
        className={`relative z-10 w-full border-b border-slate-200 shadow-sm pointer-events-auto px-2.5 sm:px-4 lg:px-5 py-2 grid grid-cols-[1fr_auto_1fr] items-center gap-1.5 sm:gap-2.5 transition-opacity duration-200 ${
          isHoveringMap ? 'bg-white/60 opacity-20' : inCustomLobby ? 'bg-white/80 opacity-100' : 'bg-white/95 opacity-100'
        }`}
      >
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
            · {isPractice ? '연습장' : '1분 녹아웃'}
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

        {/* Right Utility Controls: Row 2 on <1280px, Col 3 Right on >=1280px */}
        <div className="col-span-3 row-start-2 xl:col-span-1 xl:col-start-3 xl:row-start-1 xl:justify-self-end flex items-center justify-end gap-1.5 pt-1.5 xl:pt-0 border-t border-slate-100 xl:border-t-0 min-w-0">
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

      {/* ==================== MAIN STAGE ==================== */}
      {inCustomLobby ? (
        (() => {
          const hostPeer =
            multiplayer.peers.find((p) => p.isHost) ?? multiplayer.peers[0] ?? null;
          const totalParticipantCount = multiplayer.peers.length + customBots.length;
          const getCharName = (cId: CharacterId) => CHARACTER_MAP[cId]?.name ?? cId;
          const getCharColor = (cId: CharacterId) =>
            CHARACTER_MAP[cId]?.primaryColor ?? '#64748b';
          const canEditRoomSettings = multiplayer.isHost || multiplayer.peers.length <= 1;

          return (
            <div
              data-testid="custom-room-lobby"
              className="relative z-10 flex-1 min-h-0 w-full max-w-[1440px] mx-auto px-3 sm:px-5 py-2 flex flex-col gap-2 pointer-events-auto overflow-hidden"
            >
              {/* TOP ROOM HEADER STRIP */}
              <div
                className={`bg-white/75 border border-slate-200/90 rounded-2xl px-3.5 py-2 shadow-lg flex flex-wrap items-center justify-between gap-2 shrink-0 transition-opacity duration-200 ${
                  isHoveringMap ? 'opacity-15' : 'opacity-100'
                }`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-slate-500">방 코드</span>
                  <span
                    data-testid="custom-room-code"
                    className="font-mono-num text-base font-black text-rose-700 px-2.5 py-0.5 rounded-lg bg-rose-50 border border-rose-200"
                  >
                    {multiplayer.roomCode}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyRoomCode(multiplayer.roomCode!)}
                    className="px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 flex items-center gap-1 cursor-pointer"
                  >
                    {copiedCode ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>{copiedCode ? '복사됨' : '코드복사'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopyInviteLink(multiplayer.roomCode!, false)}
                    className="px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 flex items-center gap-1 cursor-pointer"
                  >
                    <Link2 className="w-3.5 h-3.5" />
                    <span>{copiedLink ? '링크복사됨' : '초대링크'}</span>
                  </button>

                  {/* UNMISTAKABLE HOST INDICATOR */}
                  <div
                    data-testid="custom-room-host-banner"
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-100 border border-amber-300 text-amber-950 text-xs font-black"
                  >
                    <Crown className="w-3.5 h-3.5 text-amber-600 fill-amber-400 shrink-0" />
                    <span>방장: {hostPeer?.name ?? playerCallsign}</span>
                    {multiplayer.isHost && (
                      <span className="px-1.5 py-0.2 rounded bg-amber-500 text-white text-[10px] font-black">
                        나
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    data-testid="switch-room-ffa-btn"
                    disabled={!canEditRoomSettings}
                    onClick={() => onUpdateLobby({ roomMode: 'ffa', team: 'ffa' })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                      multiplayer.roomMode === 'ffa'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100'
                    } ${canEditRoomSettings ? 'cursor-pointer' : 'opacity-60 cursor-not-allowed'}`}
                  >
                    개인전 (FFA)
                  </button>
                  <button
                    type="button"
                    data-testid="switch-room-team-btn"
                    disabled={!canEditRoomSettings}
                    onClick={() => onUpdateLobby({ roomMode: 'team', team: 'red' })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                      multiplayer.roomMode === 'team'
                        ? 'bg-sky-600 text-white shadow-xs'
                        : 'bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100'
                    } ${canEditRoomSettings ? 'cursor-pointer' : 'opacity-60 cursor-not-allowed'}`}
                  >
                    팀전 (RED vs BLUE)
                  </button>
                  <button
                    type="button"
                    data-testid="leave-custom-room-btn"
                    onClick={onLeaveRoom}
                    className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold cursor-pointer"
                  >
                    방 나가기
                  </button>
                </div>
              </div>

              {/* 2-COLUMN CUSTOM STUDIO DASHBOARD */}
              <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[460px_1fr] xl:grid-cols-[510px_1fr] gap-2.5">
                {/* LEFT COLUMN: CHARACTER + RULES + PARTICIPANT ROSTER + HOVER-EXPANDING CHAT */}
                <section
                  className={`relative bg-white/75 border border-slate-200/90 rounded-2xl p-2.5 sm:p-3 shadow-xl flex flex-col gap-2 min-h-0 overflow-visible transition-opacity duration-200 ${
                    isHoveringMap ? 'opacity-15' : 'opacity-100'
                  }`}
                >
                  {/* My Selected Character */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-2 space-y-1.5 shrink-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-sm shrink-0"
                          style={{ backgroundColor: char.primaryColor }}
                        />
                        <h2
                          data-testid="selected-character-name"
                          className="font-display text-sm sm:text-base font-black text-slate-900 truncate"
                        >
                          {char.name}
                        </h2>
                        <span className="text-[11px] font-bold text-rose-600 truncate">
                          {char.titleKr}
                        </span>
                      </div>
                      <button
                        type="button"
                        data-testid="open-hero-select-btn"
                        onClick={() => {
                          onPlayUiSound?.('vote');
                          setHeroSelectMode('browse');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold cursor-pointer shrink-0 transition-colors"
                      >
                        캐릭터 변경
                      </button>
                    </div>

                    <div className="flex items-center gap-1">
                      {char.loadout.map((item, idx) => (
                        <div
                          key={`${char.id}-custom-slot-${item.id}-${idx}`}
                          title={`${idx + 1}번 ${item.name}`}
                          className="flex-1 py-0.5 rounded-md bg-white border border-slate-200 flex items-center justify-center gap-1"
                        >
                          <WeaponIcon id={item.id} className="w-3 h-3 text-slate-700 shrink-0" />
                          <span className="text-[9px] font-mono-num font-bold text-slate-500">
                            {idx + 1}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Match Rules */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 shrink-0">
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-1.5">
                      <div className="text-[10px] font-bold text-slate-500 mb-0.5">아레나 전투 규칙</div>
                      <select
                        aria-label="사용자 설정 게임 전투 규칙"
                        data-testid="custom-party-mode-select"
                        disabled={!canEditRoomSettings}
                        value={multiplayer.partyMode ?? 'knockout'}
                        onChange={(e) =>
                          onUpdateLobby({ partyMode: e.target.value as CustomPartyMode })
                        }
                        className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-900 disabled:opacity-60"
                      >
                        {ARENA_RULE_LIST.map((pm) => (
                          <option key={pm.id} value={pm.id}>
                            {pm.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-1.5">
                      <div className="text-[10px] font-bold text-slate-500 mb-0.5">대전 강도</div>
                      <select
                        aria-label="사용자 설정 게임 난이도"
                        data-testid="custom-bot-difficulty-select"
                        disabled={!canEditRoomSettings}
                        value={multiplayer.botDifficulty ?? 'medium'}
                        onChange={(e) =>
                          onUpdateLobby({ botDifficulty: e.target.value as BotDifficulty })
                        }
                        className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-900 disabled:opacity-60"
                      >
                        {BOT_DIFFICULTY_LIST.map((bd) => (
                          <option key={bd.id} value={bd.id}>
                            {bd.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-1.5">
                      <div className="text-[10px] font-bold text-slate-500 mb-0.5">목표 승리 킬 수</div>
                      <div className="flex items-center gap-1">
                        {[10, 15, 25, 35].map((k) => (
                          <button
                            key={k}
                            type="button"
                            disabled={!canEditRoomSettings}
                            onClick={() => onUpdateLobby({ targetKills: k })}
                            className={`flex-1 py-1 rounded-md text-xs font-mono-num font-bold ${
                              multiplayer.targetKills === k
                                ? 'bg-rose-600 text-white'
                                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                            } ${canEditRoomSettings ? 'cursor-pointer' : 'opacity-60 cursor-not-allowed'}`}
                          >
                            {k}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* CLEAR PARTICIPANT ROSTER & SLOT PLACEMENT */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 space-y-1.5 shrink-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-baseline gap-2 min-w-0">
                        <h3 className="text-xs font-black text-slate-900 whitespace-nowrap">
                          참가자 현황 ({totalParticipantCount}명)
                        </h3>
                        <span className="text-[10px] text-slate-500 truncate">
                          유저 {multiplayer.peers.length} · 봇 {customBots.length}
                        </span>
                      </div>

                      {customBots.length > 0 && canEditRoomSettings && (
                        <button
                          type="button"
                          data-testid="clear-custom-bots-btn"
                          onClick={handleClearBots}
                          className="px-2 py-0.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 text-[11px] font-bold flex items-center gap-1 cursor-pointer shrink-0"
                        >
                          <Trash2 className="w-3 h-3" /> 초기화
                        </button>
                      )}
                    </div>

                    {/* TEAM OR FFA SLOT LISTS */}
                    {multiplayer.roomMode === 'team' ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {(
                          [
                            {
                              team: 'red' as PlayerTeam,
                              title: 'RED 팀',
                              border: 'border-rose-200',
                              bg: 'bg-rose-50/75',
                              badge: 'bg-rose-600 text-white',
                            },
                            {
                              team: 'blue' as PlayerTeam,
                              title: 'BLUE 팀',
                              border: 'border-sky-200',
                              bg: 'bg-sky-50/75',
                              badge: 'bg-sky-600 text-white',
                            },
                          ] as const
                        ).map((zone) => {
                          const teamPeers = multiplayer.peers.filter(
                            (p, idx) =>
                              (p.team === 'red' || p.team === 'blue'
                                ? p.team
                                : idx % 2 === 0
                                  ? 'red'
                                  : 'blue') === zone.team
                          );
                          const teamBots = customBots.filter(
                            (b, idx) =>
                              (b.team === 'red' || b.team === 'blue'
                                ? b.team
                                : idx % 2 === 0
                                  ? 'red'
                                  : 'blue') === zone.team
                          );
                          const isOver = dragOverZone === zone.team;
                          const myPeer = multiplayer.peers.find((p) => p.id === multiplayer.selfId);
                          const amInThisTeam = myPeer?.team === zone.team;

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
                              className={`rounded-xl border p-2 min-h-[84px] flex flex-col gap-1.5 ${zone.bg} ${
                                isOver ? 'border-slate-900 ring-2 ring-slate-900/15' : zone.border
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1">
                                <div className="flex items-center gap-1 min-w-0">
                                  <span
                                    className={`text-[11px] font-black px-2 py-0.5 rounded-md whitespace-nowrap shrink-0 ${zone.badge}`}
                                  >
                                    {zone.title} · {teamPeers.length + teamBots.length}명
                                  </span>
                                  {!amInThisTeam && (
                                    <button
                                      type="button"
                                      onClick={() => onUpdateLobby({ team: zone.team })}
                                      className="text-[11px] font-bold px-1.5 py-0.5 rounded-md bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 cursor-pointer whitespace-nowrap shrink-0"
                                    >
                                      팀 이동
                                    </button>
                                  )}
                                </div>
                                {canEditRoomSettings && (
                                  <button
                                    type="button"
                                    data-testid={`quick-add-bot-${zone.team}`}
                                    onClick={() => handleAddBotToTeam(selectedPoolBotChar, zone.team)}
                                    className="px-2 py-0.5 rounded-md bg-slate-900 hover:bg-slate-800 text-[11px] font-bold text-white flex items-center gap-0.5 cursor-pointer whitespace-nowrap shrink-0"
                                  >
                                    <Plus className="w-3 h-3 shrink-0" />
                                    <span>추가</span>
                                  </button>
                                )}
                              </div>

                              <div className="space-y-1">
                                {teamPeers.length === 0 && teamBots.length === 0 && (
                                  <div className="text-[11px] text-slate-400 py-2 text-center">
                                    참가자 없음
                                  </div>
                                )}
                                {teamPeers.map((p) => (
                                  <div
                                    key={p.id}
                                    className={`px-2.5 py-1.5 rounded-lg border flex items-center justify-between gap-2 ${
                                      p.isHost
                                        ? 'bg-amber-50 border-amber-400 shadow-xs'
                                        : 'bg-white border-slate-200'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span
                                        className="w-2.5 h-2.5 rounded-sm shrink-0"
                                        style={{ backgroundColor: getCharColor(p.characterId) }}
                                      />
                                      <div className="min-w-0">
                                        <div className="text-xs font-black text-slate-900 truncate flex items-center gap-1">
                                          <span>{p.name}</span>
                                          {p.id === multiplayer.selfId && (
                                            <span className="text-[10px] font-bold text-sky-600">(나)</span>
                                          )}
                                        </div>
                                        <div className="text-[10px] font-semibold text-slate-500">
                                          {getCharName(p.characterId)}
                                        </div>
                                      </div>
                                    </div>
                                    {p.isHost ? (
                                      <span className="px-2 py-0.5 rounded-md bg-amber-400 text-slate-950 text-[10px] font-black flex items-center gap-1 shrink-0">
                                        <Crown className="w-3 h-3" /> 방장
                                      </span>
                                    ) : (
                                      <span className="text-[10px] font-bold text-slate-500 shrink-0">유저</span>
                                    )}
                                  </div>
                                ))}

                                {teamBots.map((b) => (
                                  <div
                                    key={b.id}
                                    draggable={canEditRoomSettings}
                                    data-testid={`placed-bot-${b.id}`}
                                    onDragStart={() =>
                                      setDragPayload({ type: 'existing', botId: b.id })
                                    }
                                    className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 flex items-center justify-between gap-1.5 cursor-grab"
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span
                                        className="w-2.5 h-2.5 rounded-sm shrink-0"
                                        style={{ backgroundColor: getCharColor(b.characterId) }}
                                      />
                                      <div className="min-w-0">
                                        <div className="text-xs font-bold text-slate-800 truncate">
                                          {b.name}
                                        </div>
                                        <div className="text-[10px] text-slate-500">
                                          {getCharName(b.characterId)}
                                        </div>
                                      </div>
                                    </div>
                                    {canEditRoomSettings && (
                                      <div className="flex items-center gap-1 shrink-0">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleMoveBotToTeam(
                                              b.id,
                                              zone.team === 'red' ? 'blue' : 'red'
                                            )
                                          }
                                          className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-[10px] font-bold text-slate-700 cursor-pointer"
                                          title="상대 팀으로 이동"
                                        >
                                          이동
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleRemoveBot(b.id)}
                                          className="p-0.5 text-slate-400 hover:text-rose-600 cursor-pointer"
                                          aria-label="제거"
                                        >
                                          <X className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    )}
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
                        className={`rounded-xl border p-2.5 bg-white space-y-2 ${
                          dragOverZone === 'ffa'
                            ? 'border-slate-900 ring-2 ring-slate-900/15'
                            : 'border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-700">
                            개인전(FFA) 참가자 목록
                          </span>
                          {canEditRoomSettings && (
                            <button
                              type="button"
                              data-testid="quick-add-bot-ffa"
                              onClick={() => handleAddBotToTeam(selectedPoolBotChar, 'ffa')}
                              className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" /> {getCharName(selectedPoolBotChar)} 추가
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {multiplayer.peers.map((p) => (
                            <div
                              key={p.id}
                              className={`px-2.5 py-1.5 rounded-lg border flex items-center justify-between gap-2 ${
                                p.isHost
                                  ? 'bg-amber-50 border-amber-400 shadow-xs'
                                  : 'bg-slate-50 border-slate-200'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span
                                  className="w-2.5 h-2.5 rounded-sm shrink-0"
                                  style={{ backgroundColor: getCharColor(p.characterId) }}
                                />
                                <div className="min-w-0">
                                  <div className="text-xs font-black text-slate-900 truncate flex items-center gap-1">
                                    <span>{p.name}</span>
                                    {p.id === multiplayer.selfId && (
                                      <span className="text-[10px] font-bold text-sky-600">(나)</span>
                                    )}
                                  </div>
                                  <div className="text-[10px] font-semibold text-slate-500">
                                    {getCharName(p.characterId)}
                                  </div>
                                </div>
                              </div>
                              {p.isHost ? (
                                <span className="px-2 py-0.5 rounded-md bg-amber-400 text-slate-950 text-[10px] font-black flex items-center gap-1 shrink-0">
                                  <Crown className="w-3 h-3" /> 방장
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold text-slate-500 shrink-0">유저</span>
                              )}
                            </div>
                          ))}

                          {customBots.map((b) => (
                            <div
                              key={b.id}
                              data-testid={`placed-bot-${b.id}`}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between gap-2"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span
                                  className="w-2.5 h-2.5 rounded-sm shrink-0"
                                  style={{ backgroundColor: getCharColor(b.characterId) }}
                                />
                                <div className="min-w-0">
                                  <div className="text-xs font-bold text-slate-800 truncate">
                                    {b.name}
                                  </div>
                                  <div className="text-[10px] text-slate-500">
                                    {getCharName(b.characterId)}
                                  </div>
                                </div>
                              </div>
                              {canEditRoomSettings && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveBot(b.id)}
                                  className="p-0.5 text-slate-400 hover:text-rose-600 cursor-pointer shrink-0"
                                  aria-label="제거"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* COMPACT CHARACTER ADD STRIP */}
                    {canEditRoomSettings && (
                      <div className="pt-0.5 space-y-1">
                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
                          <span>캐릭터 선택 후 [+ 추가] 또는 슬롯으로 드래그</span>
                        </div>
                        <div className="grid grid-cols-4 gap-1">
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
                                className={`px-1.5 py-0.5 rounded-md border text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                                  selected
                                    ? 'bg-rose-600 border-rose-600 text-white'
                                    : 'bg-white border-slate-200 text-slate-800 hover:border-slate-400'
                                }`}
                              >
                                <span
                                  className="w-2 h-2 rounded-full shrink-0"
                                  style={{ backgroundColor: selected ? '#ffffff' : c.primaryColor }}
                                />
                                <span className="truncate">{c.name}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* DIRECT SPACIOUS ROOM CHAT IN LOWER LEFT COLUMN (EXPANDS UPWARD ON HOVER / FOCUS) */}
                  <div className="relative flex-1 min-h-[148px]">
                    <div
                      data-testid="custom-lobby-chat-panel"
                      onMouseEnter={() => setCustomChatHovered(true)}
                      onMouseLeave={() => setCustomChatHovered(false)}
                      className={`absolute inset-x-0 bottom-0 rounded-xl border p-2 flex flex-col gap-1 transition-all duration-200 ease-out ${
                        customChatExpanded
                          ? 'h-[min(640px,calc(100vh-175px))] z-30 bg-white border-rose-300 shadow-2xl'
                          : 'h-full z-10 bg-slate-50/90 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 shrink-0">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <MessageSquare className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                          <span className="text-xs font-black text-slate-900 whitespace-nowrap">방 채팅</span>
                          <span className="text-[10px] font-mono-num font-bold text-slate-500">
                            {chatMessages.length}개
                          </span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {['준비 완료!', '잠시만요', '팀 맞춰요', '바로 ㄱㄱ'].map((phrase) => (
                            <button
                              key={phrase}
                              type="button"
                              tabIndex={-1}
                              onClick={(e) => {
                                e.currentTarget.blur();
                                onSendChat(phrase);
                              }}
                              className="px-1.5 py-0.5 rounded-md bg-white hover:bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-700 whitespace-nowrap cursor-pointer shrink-0 transition-colors"
                            >
                              {phrase}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div
                        ref={customChatScrollRef}
                        data-testid="custom-lobby-chat-messages"
                        className="flex-1 min-h-0 overflow-y-auto rounded-lg border border-slate-200 bg-white p-2 space-y-1"
                      >
                        {chatMessages.length === 0 ? (
                          <div className="h-full flex items-center justify-center text-center text-xs text-slate-400">
                            친구들과 대화하거나 빠른 말 버튼을 눌러 보세요!
                          </div>
                        ) : (
                          chatMessages.map((m) => {
                            const isSelf =
                              m.senderId === multiplayer.selfId ||
                              (m.senderId === 'local' && m.senderName === multiplayer.playerName);
                            const senderPeer = multiplayer.peers.find((p) => p.id === m.senderId);
                            const senderIsHost = senderPeer?.isHost ?? false;

                            return (
                              <div
                                key={m.id}
                                className={`rounded-lg px-2.5 py-1 text-xs leading-snug break-words ${
                                  isSelf
                                    ? 'bg-rose-50 border border-rose-200/80 text-slate-900'
                                    : 'bg-slate-50 border border-slate-200/80 text-slate-900'
                                }`}
                              >
                                <span className="inline-flex items-center gap-1 font-black mr-1.5">
                                  {senderIsHost && (
                                    <Crown className="w-3 h-3 text-amber-600 fill-amber-400 shrink-0" />
                                  )}
                                  {multiplayer.roomMode === 'team' &&
                                    (m.team === 'red' || m.team === 'blue') && (
                                      <span
                                        className={`text-[10px] font-black ${
                                          m.team === 'red' ? 'text-rose-600' : 'text-sky-600'
                                        }`}
                                      >
                                        [{m.team === 'red' ? 'RED' : 'BLUE'}]
                                      </span>
                                    )}
                                  <span className={isSelf ? 'text-rose-700' : 'text-slate-950'}>
                                    {m.senderName}:
                                  </span>
                                </span>
                                <span className="font-medium text-slate-800">{m.text}</span>
                              </div>
                            );
                          })
                        )}
                      </div>

                      <form
                        onSubmit={handleCustomChatSubmit}
                        autoComplete="off"
                        className="flex items-stretch gap-1.5 shrink-0"
                      >
                        <input
                          ref={customChatInputRef}
                          type="text"
                          autoComplete="off"
                          autoCorrect="off"
                          autoCapitalize="off"
                          spellCheck={false}
                          data-testid="custom-lobby-chat-input"
                          maxLength={160}
                          value={customChatText}
                          onFocus={() => setCustomChatFocused(true)}
                          onBlur={() => setCustomChatFocused(false)}
                          onKeyDown={(e) => {
                            if (e.key === 'Escape') {
                              e.currentTarget.blur();
                            }
                          }}
                          onChange={(e) => setCustomChatText(e.target.value)}
                          placeholder="채팅 입력 후 Enter..."
                          className="flex-1 min-w-0 bg-white border border-slate-300 focus:border-rose-500 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none"
                        />
                        <button
                          type="submit"
                          tabIndex={-1}
                          data-testid="custom-lobby-chat-send-btn"
                          className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 active:scale-[0.98] text-white text-xs font-black flex items-center gap-1 cursor-pointer shrink-0 transition-all"
                        >
                          <Send className="w-3.5 h-3.5 shrink-0" />
                          <span>전송</span>
                        </button>
                      </form>
                    </div>
                  </div>
                </section>

                {/* RIGHT COLUMN: ALL 20 MAPS VOTING (STRETCHED NO-SCROLL) + LIVE 3D PREVIEW + BOTTOM ACTION BAR */}
                <section
                  className={`rounded-2xl p-3 flex flex-col justify-between gap-2 min-h-0 transition-all duration-200 ${
                    isHoveringMap
                      ? 'bg-transparent border border-transparent shadow-none'
                      : 'bg-white/75 border border-slate-200/90 shadow-xl'
                  }`}
                >
                  <div className="flex-1 min-h-0 flex flex-col gap-2">
                    <div
                      className={`flex flex-wrap items-center justify-between gap-2 shrink-0 transition-opacity duration-200 ${
                        isHoveringMap ? 'opacity-20' : 'opacity-100'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-rose-600" />
                        <span className="text-sm font-black text-slate-900">
                          20종 맵 투표 (총 {totalVotes}표)
                        </span>
                        <span className="text-xs font-semibold text-slate-500">
                          · 현재 선택: <strong className="text-rose-600">{activeMapDef.name}</strong>
                        </span>
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
                            className={`px-2.5 py-0.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                              mapCategoryFilter === cat.id
                                ? 'bg-rose-600 text-white'
                                : 'bg-white/80 border border-slate-200 text-slate-700 hover:bg-white'
                            }`}
                          >
                            {cat.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div
                      data-testid="custom-map-vote-grid"
                      onMouseLeave={() => {
                        setHoveredMapId(null);
                        onPreviewMap?.(null);
                      }}
                      className="flex-1 min-h-0 grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-5 auto-rows-fr gap-1.5 py-0.5 overflow-hidden"
                    >
                      {filteredCustomMaps.map((mId) => {
                        const def = MAP_DEFINITIONS[mId];
                        const votes = multiplayer.mapVotes?.[mId] ?? 0;
                        const pct = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
                        const isSelected = multiplayer.selectedMap === mId;
                        const isHovered = hoveredMapId === mId;
                        const isRoulette = rouletteHighlightMap === mId;
                        const justVoted = lastVotedMap === mId;
                        const isLeading =
                          votes > 0 &&
                          votes === Math.max(...MAP_ORDER.map((id) => multiplayer.mapVotes?.[id] ?? 0));

                        return (
                          <button
                            key={mId}
                            type="button"
                            data-testid={`vote-map-card-${mId}`}
                            onMouseEnter={() => {
                              setHoveredMapId(mId);
                              onPreviewMap?.(mId);
                            }}
                            onFocus={() => {
                              setHoveredMapId(mId);
                              onPreviewMap?.(mId);
                            }}
                            onBlur={() => {
                              setHoveredMapId((prev) => (prev === mId ? null : prev));
                              onPreviewMap?.(null);
                            }}
                            onClick={() => handleVoteMapClick(mId)}
                            className={`group relative h-full min-h-0 px-2.5 py-1.5 rounded-xl border text-left overflow-hidden cursor-pointer flex flex-col justify-between transition-all duration-200 active:scale-[0.97] ${
                              isHoveringMap && !isHovered
                                ? 'opacity-20 bg-white/60 border-slate-200/70'
                                : isHovered
                                  ? 'opacity-100 scale-[1.03] z-20 bg-white/95 border-rose-500 ring-2 ring-rose-500/75 shadow-xl'
                                  : isRoulette
                                    ? 'bg-rose-600 text-white border-amber-300 ring-2 ring-amber-300/80 scale-[1.04] shadow-lg z-10'
                                    : isSelected
                                      ? 'bg-rose-50/90 text-slate-900 border-rose-500 ring-1 ring-rose-400/60 shadow-sm'
                                      : isLeading
                                        ? 'bg-amber-50/85 text-slate-900 border-amber-400 shadow-xs'
                                        : 'bg-white/85 text-slate-800 border-slate-200 hover:border-slate-400 hover:bg-white shadow-2xs'
                            }`}
                          >
                            <div
                              className="absolute inset-y-0 left-0 pointer-events-none transition-all duration-500 ease-out"
                              style={{ width: `${pct}%`, backgroundColor: `${def.accentHex}2a` }}
                            />
                            {justVoted && (
                              <span
                                aria-hidden="true"
                                className="absolute inset-0 rounded-xl border-2 border-rose-500 animate-ping pointer-events-none opacity-45"
                              />
                            )}
                            <div className="relative z-10 flex items-center justify-between gap-1 text-[10px] leading-tight w-full">
                              <span
                                className={
                                  isRoulette
                                    ? 'text-rose-100 truncate font-semibold'
                                    : 'text-slate-500 truncate font-semibold'
                                }
                              >
                                {def.badge}
                              </span>
                              <span
                                className={`font-mono-num font-black shrink-0 ${
                                  isRoulette
                                    ? 'text-white'
                                    : isLeading
                                      ? 'text-amber-600'
                                      : 'text-rose-600'
                                }`}
                              >
                                {votes}표
                              </span>
                            </div>
                            <div
                              className={`relative z-10 font-display text-xs sm:text-sm font-black mt-1 truncate w-full ${
                                isRoulette ? 'text-white' : 'text-slate-900'
                              }`}
                            >
                              {def.name}
                            </div>
                            {justVoted && (
                              <span className="absolute -top-0.5 right-1 z-20 px-1 py-0.5 rounded bg-rose-600 text-white font-mono-num text-[9px] font-black animate-bounce shadow-xs">
                                +1
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* DEDICATED LIVE 3D AERIAL MINI-VIEW + MAP STRUCTURE PREVIEW BOX */}
                    <div
                      data-testid="custom-map-preview-panel"
                      className={`rounded-xl border p-2 grid grid-cols-1 sm:grid-cols-[225px_1fr] xl:grid-cols-[250px_1fr] gap-2.5 items-stretch shrink-0 transition-all duration-200 ${
                        isHoveringMap
                          ? 'bg-white/90 border-rose-300 shadow-xl'
                          : 'bg-white/80 border-slate-200/90 shadow-xs'
                      }`}
                    >
                      <div className="relative h-[112px] sm:h-[120px] rounded-lg overflow-hidden border border-slate-200 bg-slate-900">
                        <MapPreview3D mapId={previewMapId} className="w-full h-full" />
                        <div className="absolute top-1.5 left-1.5 pointer-events-none flex items-center gap-1 px-2 py-0.5 rounded bg-slate-950/75 text-white text-[10px] font-bold">
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: previewMapDef.accentHex }}
                          />
                          <span>{isHoveringMap ? '미리보기 중' : '3D 항공 미니뷰'}</span>
                        </div>
                      </div>

                      <div className="flex flex-col justify-between gap-2 min-w-0">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center justify-between gap-1.5">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px] font-black text-slate-700 shrink-0">
                                {previewMapDef.badge}
                              </span>
                              <h4
                                data-testid="preview-map-name"
                                className="font-display text-sm sm:text-base font-black text-slate-900 truncate"
                              >
                                {previewMapDef.name}
                              </h4>
                              <span className="hidden xl:inline text-[10px] font-mono-num font-bold text-slate-400 truncate">
                                {previewMapDef.englishName}
                              </span>
                            </div>

                            <span className="px-2 py-0.5 rounded bg-rose-50 border border-rose-200 text-rose-700 font-mono-num text-[11px] font-black shrink-0">
                              {previewVotes}표
                            </span>
                          </div>

                          <p
                            data-testid="preview-map-description"
                            className="text-xs font-medium text-slate-700 leading-relaxed line-clamp-2"
                          >
                            {previewMapDef.description}
                          </p>
                          <div
                            data-testid="preview-map-trait"
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-[10.5px] font-bold text-amber-900 max-w-full truncate"
                            title={previewMapDef.traitDesc}
                          >
                            <span className="shrink-0">⚡ {previewMapDef.traitName}</span>
                            <span className="text-amber-700 font-medium truncate">{previewMapDef.traitDesc}</span>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <div className="grid grid-cols-3 gap-1.5">
                            <div className="rounded-lg bg-slate-50 border border-slate-200 px-2 py-1">
                              <div className="text-[10px] font-bold text-slate-500">전장 규모</div>
                              <div className="font-mono-num text-xs font-black text-slate-900">
                                지름 {previewMapDef.worldRadius * 2}m
                              </div>
                            </div>
                            <div className="rounded-lg bg-slate-50 border border-slate-200 px-2 py-1">
                              <div className="text-[10px] font-bold text-slate-500">엄폐/구조물</div>
                              <div className="font-mono-num text-xs font-black text-slate-900">
                                {previewBlockCount}개
                              </div>
                            </div>
                            <div className="rounded-lg bg-slate-50 border border-slate-200 px-2 py-1">
                              <div className="text-[10px] font-bold text-slate-500">점프 패드</div>
                              <div className="font-mono-num text-xs font-black text-sky-700 flex items-center gap-0.5">
                                <Zap className="w-3 h-3 shrink-0" />
                                <span>{previewJumpPadCount}개</span>
                              </div>
                            </div>
                          </div>

                          <div className="text-[10px] font-semibold text-slate-500">
                            맵 카드에 마우스를 올리면 배경·미니뷰 미리보기 / 클릭 시 투표 반영
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {multiplayer.error && (
                    <div
                      data-testid="lobby-error-banner"
                      className="px-3 py-2 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700 shrink-0"
                    >
                      {multiplayer.error}
                    </div>
                  )}

                  {/* DEDICATED NON-OVERLAPPING BOTTOM ACTION BAR */}
                  <div
                    className={`pt-2 border-t border-slate-200/80 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0 transition-opacity duration-200 ${
                      isHoveringMap ? 'opacity-15' : 'opacity-100'
                    }`}
                  >
                    <div
                      data-testid="nickname-stage-card"
                      className="sm:w-[250px] bg-slate-50/90 border border-slate-300 focus-within:border-rose-600 rounded-xl px-3 py-1.5 flex items-center gap-2 shrink-0"
                    >
                      <label
                        htmlFor="stage-player-name-input"
                        className="text-xs font-black text-rose-600 whitespace-nowrap shrink-0"
                      >
                        닉네임
                      </label>
                      <input
                        id="stage-player-name-input"
                        type="text"
                        aria-label="플레이어 닉네임"
                        data-testid="player-name-input"
                        maxLength={14}
                        value={multiplayer.playerName}
                        onChange={(e) => onSetPlayerName(e.target.value)}
                        placeholder="Player"
                        className="flex-1 min-w-0 bg-white border border-slate-200 focus:border-rose-500 rounded-lg px-2.5 py-1 text-sm font-display font-black text-slate-900 focus:outline-none"
                      />
                    </div>

                    {canEditRoomSettings ? (
                      <button
                        type="button"
                        data-start="true"
                        data-testid="start-match-btn"
                        disabled={rouletteSpinning}
                        onClick={handlePrimaryLaunch}
                        className="flex-1 py-3 px-6 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:translate-y-0.5 text-slate-950 font-display text-xl sm:text-2xl font-black tracking-tight border-2 border-slate-900 border-b-4 shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all whitespace-nowrap"
                      >
                        <Play className="w-5 h-5 fill-slate-950 text-slate-950 shrink-0" />
                        <span>{primaryPlayLabel}</span>
                      </button>
                    ) : (
                      <div className="flex-1 py-3 px-5 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-sm font-black flex items-center justify-center gap-2">
                        <Crown className="w-4 h-4 text-amber-600 fill-amber-400 shrink-0" />
                        <span>방장({hostPeer?.name ?? '호스트'})이 경기를 시작할 때까지 대기 중</span>
                      </div>
                    )}
                  </div>
                </section>
              </div>
            </div>
          );
        })()
      ) : (
      <div className="relative z-10 flex-1 min-h-0 flex flex-col lg:flex-row items-stretch justify-between px-3 sm:px-5 py-2.5 gap-3 overflow-hidden pointer-events-none">
        {/* LEFT PANEL (Compact card in Quick Match & Practice so center 3D stage stays open) */}
        <section
          className={`pointer-events-auto shrink-0 flex flex-col justify-between gap-2.5 bg-white/95 border border-slate-200 rounded-2xl p-3 sm:p-3.5 shadow-xl text-slate-900 overflow-hidden ${
            selectedMode === 'ffa'
              ? 'w-full lg:w-[270px] lg:self-start'
              : 'w-full lg:w-[370px] xl:w-[395px] lg:self-start'
          }`}
        >
          {/* 1. MODE HEADER */}
          <div className="flex items-start justify-between gap-2 pb-2 border-b border-slate-200 shrink-0">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
                <span className="text-rose-600 font-bold">{modeInfo.subtitle}</span>
                <span aria-hidden="true">·</span>
                <span className="truncate text-slate-700">
                  {selectedMode === 'ffa' && !isPractice
                    ? '20맵 랜덤'
                    : activeMapDef.name}
                </span>
              </div>
              <h1
                data-testid="lobby-mode-title"
                className="font-display text-xl sm:text-2xl font-black text-slate-900 leading-tight mt-0.5"
              >
                {selectedMode === 'ffa' && isPractice ? '연습장' : modeInfo.label}
              </h1>
            </div>
          </div>

          {/* 2. COMPACT SELECTED HERO BANNER (Shown in non-Quick-Match modes) */}
          {(selectedMode !== 'ffa' || isPractice) && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 space-y-2 shrink-0">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: char.primaryColor }}
                  />
                  <h2
                    data-testid="selected-character-name"
                    className="font-display text-base font-black text-slate-900 truncate"
                  >
                    {char.name}
                  </h2>
                  <span className="text-[11px] font-bold text-rose-600 truncate">
                    {char.titleKr}
                  </span>
                </div>
                <button
                  type="button"
                  data-testid="open-hero-select-btn"
                  onClick={() => {
                    onPlayUiSound?.('vote');
                    setHeroSelectMode('browse');
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-black cursor-pointer shrink-0 transition-colors"
                >
                  캐릭터 선택
                </button>
              </div>

              <div className="flex items-center gap-1">
                {char.loadout.map((item, idx) => (
                  <div
                    key={`${char.id}-slot-${item.id}-${idx}`}
                    title={`${idx + 1}번 ${item.name}`}
                    className="flex-1 py-1 rounded-md bg-white border border-slate-200 flex items-center justify-center gap-1"
                  >
                    <WeaponIcon id={item.id} className="w-3.5 h-3.5 text-slate-700 shrink-0" />
                    <span className="text-[9px] font-mono-num font-bold text-slate-500">
                      {idx + 1}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. MODE CONTENT (Only for online_world / link_duel / multiplayer entry; Practice 20-map lives in wide right panel!) */}
          {selectedMode !== 'ffa' && (
            <div className="flex flex-col gap-2.5">

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
                          <div className="text-[11px] font-semibold text-slate-600 truncate mt-0.5">
                            {def.traitName}
                          </div>
                          <div className="mt-1 h-1 w-8 rounded-full" style={{ backgroundColor: def.accentHex }} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 3C. 랭킹전 (랭크 1대1 대결) */}
            {selectedMode === 'link_duel' && (
              <div className="flex-1 min-h-0 flex flex-col justify-between gap-2.5" data-testid="link-duel-panel">
                <div className="space-y-2 bg-slate-50 border border-slate-200 rounded-xl p-2.5 shrink-0">
                  <div className="text-[11px] font-bold text-slate-600">
                    내 방 코드 직접 만들기 (선택 · 미입력 시 자동 생성)
                  </div>
                  <input
                    type="text"
                    data-testid="create-link-code-input"
                    maxLength={12}
                    value={linkCreateCode}
                    onChange={(e) => setLinkCreateCode(e.target.value.toUpperCase())}
                    placeholder="원하는 코드 입력 (예: 1VS1, HEEWOO)"
                    className="w-full bg-white border border-slate-200 focus:border-rose-500 rounded-lg px-2.5 py-1.5 text-xs font-mono-num font-bold text-slate-900 uppercase focus:outline-none placeholder:text-slate-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5 flex-1 min-h-[96px]">
                  <button
                    type="button"
                    data-testid="create-link-duel-btn"
                    onClick={() => onCreateLinkDuel(playerCallsign, linkCreateCode.trim() || undefined)}
                    className="p-3.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-400 text-slate-900 text-left cursor-pointer flex items-center justify-center gap-2 shadow-xs"
                  >
                    <Link2 className="w-4 h-4 text-rose-600 shrink-0" />
                    <span className="font-display text-sm font-black leading-tight">
                      방 생성 · 코드
                    </span>
                  </button>

                  <button
                    type="button"
                    data-testid="quick-match-link-duel-btn"
                    onClick={() =>
                      queueActiveMode === 'link_duel' || multiplayer.linkQueueing
                        ? handleCancelMatchmakingQueue()
                        : handleStartMatchmakingQueue('link_duel')
                    }
                    className={`p-3.5 rounded-xl text-white text-left cursor-pointer flex items-center justify-center gap-2 shadow-sm transition-colors ${
                      queueActiveMode === 'link_duel' || multiplayer.linkQueueing
                        ? 'bg-rose-600 hover:bg-rose-500'
                        : 'bg-sky-600 hover:bg-sky-500'
                    }`}
                  >
                    <Swords className="w-4 h-4 shrink-0" />
                    <span className="font-display text-sm font-black leading-tight">
                      {queueActiveMode === 'link_duel' || multiplayer.linkQueueing
                        ? `매칭 취소 (${formatRotationTimer(queueElapsedSec)})`
                        : '실시간 1:1 매칭'}
                    </span>
                  </button>
                </div>

                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-2 shrink-0">
                  <input
                    type="text"
                    maxLength={12}
                    value={linkCodeInput}
                    onChange={(e) => setLinkCodeInput(e.target.value.toUpperCase())}
                    placeholder="초대 코드 입력 (최대 12자)"
                    className="flex-1 bg-transparent px-2 text-xs sm:text-sm font-mono-num font-bold text-slate-900 uppercase focus:outline-none placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      linkCodeInput.trim() && onJoinLinkDuel(linkCodeInput.trim(), playerCallsign)
                    }
                    className="px-4 py-2 rounded-lg bg-rose-600 text-white text-xs font-bold hover:bg-rose-500 cursor-pointer shrink-0"
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
                <div className="space-y-1.5 bg-slate-50 border border-slate-200 rounded-xl p-2.5 shrink-0">
                  <div className="text-[11px] font-bold text-slate-600">
                    방 코드 직접 만들기 (선택 · 미입력 시 자동 생성)
                  </div>
                  <input
                    type="text"
                    data-testid="create-room-code-input"
                    maxLength={12}
                    value={customCreateCode}
                    onChange={(e) => setCustomCreateCode(e.target.value.toUpperCase())}
                    placeholder="원하는 코드 입력 (예: MYROOM, 우리방)"
                    className="w-full bg-white border border-slate-200 focus:border-rose-500 rounded-lg px-2.5 py-1.5 text-xs sm:text-sm font-mono-num font-bold text-slate-900 uppercase focus:outline-none placeholder:text-slate-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5 flex-1 min-h-[96px]">
                  <button
                    type="button"
                    data-testid="create-ffa-room-btn"
                    onClick={() =>
                      onCreateRoom(
                        playerCallsign,
                        false,
                        'ffa',
                        'ffa',
                        multiplayer.botDifficulty ?? 'medium',
                        multiplayer.partyMode ?? 'knockout',
                        customBots,
                        customCreateCode.trim() || undefined
                      )
                    }
                    className="p-3.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-400 text-slate-900 text-left cursor-pointer flex items-center justify-center gap-2 shadow-xs"
                  >
                    <Flame className="w-4 h-4 text-rose-600 shrink-0" />
                    <span className="font-display text-sm font-black leading-tight">
                      개인전(FFA) 방 생성
                    </span>
                  </button>

                  <button
                    type="button"
                    data-testid="create-team-room-btn"
                    onClick={() =>
                      onCreateRoom(
                        playerCallsign,
                        false,
                        'team',
                        'red',
                        multiplayer.botDifficulty ?? 'medium',
                        multiplayer.partyMode ?? 'knockout',
                        customBots,
                        customCreateCode.trim() || undefined
                      )
                    }
                    className="p-3.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-left cursor-pointer flex items-center justify-center gap-2 shadow-sm"
                  >
                    <Users className="w-4 h-4 shrink-0" />
                    <span className="font-display text-sm font-black leading-tight">
                      팀전(RED vs BLUE)
                    </span>
                  </button>
                </div>

                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-2 shrink-0">
                  <input
                    type="text"
                    data-testid="join-room-code-input"
                    maxLength={12}
                    value={joinCodeInput}
                    onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                    placeholder="초대받은 방 코드 입력 (최대 12자)"
                    className="flex-1 bg-transparent px-2 text-xs sm:text-sm font-mono-num font-bold text-slate-900 uppercase focus:outline-none placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    data-testid="join-room-submit-btn"
                    onClick={() =>
                      joinCodeInput.trim() && onJoinRoom(joinCodeInput.trim(), playerCallsign, 'ffa')
                    }
                    className="px-4 py-2 rounded-lg bg-rose-600 text-white text-xs font-bold hover:bg-rose-500 cursor-pointer shrink-0"
                  >
                    코드 참가
                  </button>
                </div>
              </div>
            )}

          </div>
          )}

          {/* 4. MODE-SPECIFIC BOTTOM CONTROLS */}
          <div className={`${selectedMode === 'ffa' && !isPractice ? '' : 'pt-2 border-t border-slate-200'} space-y-2 shrink-0`}>
            {selectedMode === 'ffa' && (
              <div className="space-y-2" data-testid="quick-match-bottom-controls">
                <div className="grid grid-cols-2 gap-1.5" data-testid="quick-mode-options-select">
                  <button
                    type="button"
                    data-testid="quick-mode-knockout-btn"
                    onClick={() => handleQuickRuleSelectChange('knockout')}
                    className={`py-2 rounded-xl text-xs font-black cursor-pointer transition-colors ${
                      !isPractice
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    1분 녹아웃
                  </button>
                  <button
                    type="button"
                    data-testid="quick-mode-practice-btn"
                    onClick={() => handleQuickRuleSelectChange('practice')}
                    className={`py-2 rounded-xl text-xs font-black cursor-pointer transition-colors ${
                      isPractice
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    연습장
                  </button>
                </div>

                {isPractice && (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 flex flex-col justify-between">
                    <span className="text-[10px] font-bold text-slate-500">연습장 난이도</span>
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
                )}
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
          </div>
        </section>

        {/* TRUE VIEWPORT-CENTERED 3D STAGE OVERLAYS: MATCHMAKING TIMER + NICKNAME & PLAY DOCK + BOTTOM-RIGHT ROTATION TIMER */}
        <section className="flex-1 flex flex-col justify-between items-center pointer-events-none min-h-[200px]">
          {/* TOP-CENTER PROMINENT MATCHMAKING ELAPSED TIMER CARD */}
          <div className="w-full flex justify-center lg:absolute lg:top-4 lg:left-1/2 lg:-translate-x-1/2 lg:w-auto z-20">
            {(queueActiveMode !== null || multiplayer.linkQueueing || multiplayer.quickQueueing) && (
              <div
                data-testid="matchmaking-banner"
                className={`pointer-events-auto w-full max-w-md lg:w-[420px] rounded-2xl border-2 px-5 py-4 shadow-2xl transition-all ${
                  matchFoundState
                    ? 'bg-emerald-600 border-emerald-400 text-white'
                    : 'bg-white/98 border-rose-500 text-slate-900'
                }`}
              >
                {matchFoundState ? (
                  <div
                    data-testid="matchmaking-found-badge"
                    className="flex flex-col items-center text-center gap-1.5 py-1"
                  >
                    <div className="flex items-center gap-2 font-display text-xl sm:text-2xl font-black tracking-tight">
                      <Zap className="w-6 h-6 text-amber-300 shrink-0" />
                      <span>매치 성사!</span>
                    </div>
                    <p className="text-xs sm:text-sm font-bold text-emerald-100">
                      {activeMapDef.name} 입장 중...
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping shrink-0" />
                        <span className="text-xs font-black text-rose-600 uppercase tracking-wider">
                          {queueActiveMode === 'link_duel'
                            ? '랭킹전 1:1 매칭'
                            : '빠른 대전 통합 서버 매칭'}
                        </span>
                      </div>

                      <button
                        type="button"
                        data-testid="matchmaking-cancel-btn"
                        onClick={handleCancelMatchmakingQueue}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-bold text-slate-700 cursor-pointer shrink-0"
                      >
                        취소
                      </button>
                    </div>

                    {/* GIANT HIGHLIGHTED ELAPSED TIMER */}
                    <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                      <div className="text-xs font-black text-rose-700">매칭 경과</div>
                      <div className="text-right">
                        <div
                          data-testid="matchmaking-elapsed-timer"
                          className="font-mono-num text-4xl sm:text-5xl font-black text-rose-600 leading-none tracking-tight"
                        >
                          {formatRotationTimer(queueElapsedSec)}
                        </div>
                        <div className="font-mono-num text-[11px] font-bold text-slate-500 mt-1">
                          / 00:30
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar + Instant Match Lock-In Button */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
                        <div
                          className="h-full bg-rose-600 transition-all duration-500"
                          style={{
                            width: `${Math.min(100, Math.round((queueElapsedSec / 30) * 100))}%`,
                          }}
                        />
                      </div>
                      <button
                        type="button"
                        data-testid="matchmaking-instant-lock-btn"
                        onClick={handleTriggerMatchFoundAndLaunch}
                        className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-black cursor-pointer shrink-0"
                      >
                        즉시 입장
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* VIEWPORT-CENTERED NICKNAME INPUT + GIANT PLAY BUTTON */}
          <div
            className={`pointer-events-auto w-full max-w-[350px] flex flex-col items-center gap-2 mt-auto z-20 ${
              isPractice
                ? 'mb-2'
                : selectedMode === 'ffa'
                  ? 'lg:mt-0 lg:absolute lg:bottom-5 lg:left-1/2 lg:-translate-x-1/2'
                  : 'lg:mb-2 xl:mt-0 xl:mb-0 xl:absolute xl:bottom-5 xl:left-1/2 xl:-translate-x-1/2'
            }`}
          >
            <div
              data-testid="nickname-stage-card"
              className="w-full bg-white/95 border-2 border-slate-900 focus-within:border-rose-600 focus-within:ring-4 focus-within:ring-rose-500/20 rounded-2xl px-4 py-2 shadow-2xl transition-all flex items-center gap-2.5"
            >
              <label
                htmlFor="stage-player-name-input"
                className="text-xs font-black tracking-wide text-rose-600 whitespace-nowrap shrink-0"
              >
                닉네임
              </label>
              <input
                id="stage-player-name-input"
                type="text"
                aria-label="플레이어 닉네임"
                data-testid="player-name-input"
                maxLength={14}
                value={multiplayer.playerName}
                onChange={(e) => onSetPlayerName(e.target.value)}
                placeholder="Player"
                className="flex-1 min-w-0 bg-slate-50 focus:bg-white border border-slate-200 focus:border-rose-500 rounded-xl px-3 py-1.5 text-center font-display text-base sm:text-lg font-black text-slate-900 focus:outline-none placeholder:text-slate-400 transition-colors"
              />
            </div>

            <button
              type="button"
              data-start="true"
              data-testid="start-match-btn"
              disabled={rouletteSpinning}
              onClick={handlePrimaryLaunch}
              className="w-full py-3.5 px-6 rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:translate-y-0.5 text-slate-950 font-display text-2xl sm:text-3xl font-black tracking-tight border-2 border-slate-900 border-b-4 shadow-2xl flex items-center justify-center gap-2.5 cursor-pointer transition-all whitespace-nowrap"
            >
              <Play className="w-6 h-6 fill-slate-950 text-slate-950 shrink-0" />
              <span>{primaryPlayLabel}</span>
            </button>
          </div>

          {/* BOTTOM-RIGHT MAP ROTATION TIMER (Hidden when Practice Panel holds right column) */}
          {!(selectedMode === 'ffa' && isPractice) && (
            <div className="w-full flex justify-end mt-3 lg:mt-auto">
              <div
                data-testid="bottom-rotation-timer-card"
                className="pointer-events-auto bg-white/95 border border-slate-200 rounded-xl px-4 py-3 shadow-lg flex items-center gap-3 text-slate-900"
              >
                <Clock className="w-5 h-5 text-amber-600 shrink-0" />
                <div>
                  <div className="text-[11px] font-bold text-slate-500">맵 로테이션</div>
                  <div className="flex items-baseline gap-2">
                    <span
                      data-testid="bottom-rotation-timer"
                      className="font-mono-num text-lg sm:text-xl font-black text-slate-900 leading-tight"
                    >
                      {formatRotationTimer(rotationSecondsLeft)}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500">· 4맵</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* RIGHT WIDE PRACTICE 20-MAP PANEL (Zero-Scroll 5x4 Grid) */}
        {selectedMode === 'ffa' && isPractice && (
          <aside className="pointer-events-auto shrink-0 w-full lg:w-[530px] xl:w-[610px] flex flex-col justify-between gap-2.5">
            <div
              data-testid="quick-match-map-section"
              className="bg-white/95 border border-slate-200 rounded-2xl p-3.5 shadow-xl text-slate-900 space-y-2.5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-rose-600 shrink-0" />
                  <span className="text-xs sm:text-sm font-black text-slate-900">
                    연습장 맵 선택 · 전체 20종
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {(
                    [
                      { id: 'all', label: '전체 20' },
                      { id: 'industrial', label: '산업' },
                      { id: 'nature', label: '자연' },
                      { id: 'citadel', label: '요새' },
                      { id: 'cosmic', label: '우주' },
                    ] as Array<{ id: 'all' | MapCategory; label: string }>
                  ).map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setPracticeCategoryFilter(cat.id)}
                      className={`px-2 py-0.5 rounded-md text-[11px] font-bold cursor-pointer transition-colors ${
                        practiceCategoryFilter === cat.id
                          ? 'bg-rose-600 text-white'
                          : 'bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-5 gap-1.5">
                {filteredPracticeMaps.map((mId) => {
                  const def = MAP_DEFINITIONS[mId];
                  const active = currentMapId === mId;
                  return (
                    <button
                      key={mId}
                      type="button"
                      data-testid={`practice-map-select-${mId}`}
                      onClick={() => onSelectPracticeMap(mId)}
                      className={`px-2.5 py-2 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        active
                          ? 'bg-rose-50 border-rose-500 ring-1 ring-rose-500/20 text-slate-900'
                          : 'bg-white border-slate-200 hover:border-slate-400 hover:bg-slate-50 text-slate-900'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 text-[10px]">
                        <span className="font-semibold text-slate-500 truncate">{def.badge}</span>
                        {active && <span className="font-black text-rose-600 shrink-0">선택</span>}
                      </div>
                      <div className="font-display text-xs font-black mt-1 truncate text-slate-900">
                        {def.name}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end">
              <div
                data-testid="bottom-rotation-timer-card"
                className="bg-white/95 border border-slate-200 rounded-xl px-4 py-2.5 shadow-lg flex items-center gap-3 text-slate-900"
              >
                <Clock className="w-5 h-5 text-amber-600 shrink-0" />
                <div>
                  <div className="text-[11px] font-bold text-slate-500">맵 로테이션</div>
                  <div className="flex items-baseline gap-2">
                    <span
                      data-testid="bottom-rotation-timer"
                      className="font-mono-num text-lg font-black text-slate-900 leading-tight"
                    >
                      {formatRotationTimer(rotationSecondsLeft)}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500">· 4맵</span>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        )}
      </div>
      )}

      {/* ==================== INLINE WHITE PATCH NOTES MODAL (2-COL NO-SCROLL) ==================== */}
      {updatesOpen && (
        <div
          data-testid="updates-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 pointer-events-auto"
        >
          <div className="w-full max-w-3xl bg-white border border-slate-200 rounded-2xl p-5 text-slate-900 shadow-2xl space-y-4 overflow-hidden">
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {PATCH_NOTES.map((note) => (
                <div
                  key={note.version}
                  className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-slate-200">
                    <span className="font-display text-sm font-bold text-rose-600">{note.version}</span>
                    <span className="text-[11px] font-semibold text-slate-500 shrink-0">{note.date}</span>
                  </div>
                  <ul className="space-y-1.5 text-xs text-slate-700 list-disc pl-4 leading-relaxed">
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
