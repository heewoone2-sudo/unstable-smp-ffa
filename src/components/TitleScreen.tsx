import { useEffect, useRef, useState } from 'react';
import {
  Copy,
  Check,
  LogOut,
  Trophy,
  UserCheck,
  LogIn,
  Globe,
  Server,
  Settings,
  Send,
  Crown,
  MapPin,
  Users,
  GripVertical,
  Plus,
  X,
} from 'lucide-react';
import type { PlayerAccountProfile } from '../firebase';
import { CHARACTER_LIST, GAME_MODES } from '../game/characters';
import { MAP_DEFINITIONS, MAP_ORDER } from '../game/maps';
import { getCustomServerUrl, saveCustomServerUrl } from '../game/net';
import type {
  BotDifficulty,
  CharacterId,
  ChatEntry,
  CustomBotSlot,
  CustomPartyMode,
  GameModeId,
  GameSettings,
  MapId,
  MultiplayerHudState,
  PlayerTeam,
} from '../game/types';
import { WeaponIcon } from './WeaponIcons';

interface TitleScreenProps {
  selectedCharacter: CharacterId;
  selectedMode: GameModeId;
  multiplayer: MultiplayerHudState;
  settings: GameSettings;
  chatMessages: ChatEntry[];
  account: PlayerAccountProfile | null;
  initialRoomCode: string;
  initialLinkCode: string;
  onSelectCharacter: (id: CharacterId) => void;
  onSelectMode: (mode: GameModeId) => void;
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
    roomMode: 'ffa' | 'team',
    team: 'red' | 'blue' | 'ffa',
    botDifficulty: BotDifficulty,
    partyMode: CustomPartyMode,
    customBots?: CustomBotSlot[]
  ) => void;
  onJoinRoom: (code: string, name: string, team: 'red' | 'blue' | 'ffa') => void;
  onUpdateLobby: (updates: {
    name?: string;
    includeBots?: boolean;
    team?: 'red' | 'blue' | 'ffa';
    roomMode?: 'ffa' | 'team';
    targetKills?: number;
    selectedMap?: MapId;
    botDifficulty?: BotDifficulty;
    partyMode?: CustomPartyMode;
    customBots?: CustomBotSlot[];
  }) => void;
  onVoteMap: (mapId: MapId) => void;
  onSendChat: (text: string) => void;
  onStartMultiplayer: () => void;
  onLeaveRoom: () => void;
  onResetNetwork?: () => void;
}

export function TitleScreen({
  selectedCharacter,
  selectedMode,
  multiplayer,
  settings,
  chatMessages,
  account,
  initialRoomCode,
  initialLinkCode,
  onSelectCharacter,
  onSelectMode,
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
  onSendChat,
  onStartMultiplayer,
  onLeaveRoom,
  onResetNetwork,
}: TitleScreenProps) {
  const activeChar = CHARACTER_LIST.find((c) => c.id === selectedCharacter) ?? CHARACTER_LIST[0];
  const [nickname, setNickname] = useState(account?.nickname || multiplayer.playerName || 'Player');
  const [joinCode, setJoinCode] = useState(initialRoomCode);
  const [linkCodeInput, setLinkCodeInput] = useState(initialLinkCode);
  const [includeBots, setIncludeBots] = useState(multiplayer.includeBots);
  const [copied, setCopied] = useState(false);
  const [globalOnlineCount, setGlobalOnlineCount] = useState<number>(0);
  const [serverReachable, setServerReachable] = useState<boolean | null>(null);
  const [showServerConfig, setShowServerConfig] = useState(false);
  const [customServerUrl, setCustomServerUrl] = useState(() => getCustomServerUrl());
  const [roomMode, setRoomMode] = useState<'ffa' | 'team'>('team');
  const [myTeam, setMyTeam] = useState<'red' | 'blue' | 'ffa'>('red');
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [lobbyChatText, setLobbyChatText] = useState('');
  const [draggedBotCharId, setDraggedBotCharId] = useState<CharacterId | null>(null);
  const [draggedPlacedBotId, setDraggedPlacedBotId] = useState<string | null>(null);
  const [dragOverZone, setDragOverZone] = useState<'red' | 'blue' | 'ffa' | null>(null);
  const lobbyChatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (account?.nickname) {
      setNickname(account.nickname);
    }
  }, [account?.nickname]);

  useEffect(() => {
    let active = true;
    const pollHealth = () => {
      const saved = getCustomServerUrl().trim();
      let healthUrl = '/api/health';
      if (saved) {
        const httpBase = saved
          .replace(/^wss:/, 'https:')
          .replace(/^ws:/, 'http:')
          .replace(/\/ws\/?$/, '')
          .replace(/\/$/, '');
        healthUrl = `${httpBase}/api/health`;
      }

      fetch(healthUrl)
        .then((r) => (r.ok ? r.json() : null))
        .then((data: { ok?: boolean; globalPlayers?: number } | null) => {
          if (!active) return;
          if (data && data.ok) {
            setServerReachable(true);
            if (typeof data.globalPlayers === 'number') {
              setGlobalOnlineCount(data.globalPlayers);
            }
          } else {
            setServerReachable(false);
          }
        })
        .catch(() => {
          if (active) setServerReachable(false);
        });
    };
    pollHealth();
    const timer = window.setInterval(pollHealth, 6000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [customServerUrl]);

  const handleNicknameChange = (val: string) => {
    setNickname(val);
    onSetPlayerName(val);
  };

  const handleCopyInvite = (kind: 'link_duel' | 'private') => {
    if (!multiplayer.roomCode) return;
    const param = kind === 'link_duel' ? 'link' : 'room';
    const url = `${window.location.origin}${window.location.pathname}?${param}=${multiplayer.roomCode}`;
    navigator.clipboard?.writeText(url).catch(() => {});
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const handleSaveServerUrl = (e: React.FormEvent) => {
    e.preventDefault();
    saveCustomServerUrl(customServerUrl);
    onResetNetwork?.();
    setShowServerConfig(false);
  };

  useEffect(() => {
    if (lobbyChatEndRef.current) {
      lobbyChatEndRef.current.scrollTop = lobbyChatEndRef.current.scrollHeight;
    }
  }, [chatMessages.length]);

  const handleLobbyChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = lobbyChatText.trim();
    if (!cleaned) return;
    onSendChat(cleaned);
    setLobbyChatText('');
  };

  const resolvedName = nickname.trim() || account?.nickname || 'Player';
  const currentLobbyMode = multiplayer.roomMode ?? roomMode;
  const currentPartyMode: CustomPartyMode = multiplayer.partyMode ?? 'classic';
  const currentBotDifficulty: BotDifficulty = multiplayer.botDifficulty ?? 'medium';
  const partyModeLabelMap: Record<CustomPartyMode, string> = {
    classic: '클래식',
    knockout: '킬 녹아웃',
    boss_raid: '보스 레이드',
    random_arsenal: '랜덤 무기',
    one_shot: '원샷원킬',
  };
  const botDifficultyLabelMap: Record<BotDifficulty, string> = {
    easy: '쉬움',
    medium: '보통',
    hard: '어려움',
  };
  const selfPeer = multiplayer.peers.find((p) => p.id === multiplayer.selfId);
  const activeMyTeam = selfPeer?.team ?? myTeam;
  const redPeers = multiplayer.peers.filter((p) => p.team === 'red');
  const bluePeers = multiplayer.peers.filter((p) => p.team === 'blue');
  const customBots: CustomBotSlot[] = multiplayer.customBots ?? [];
  const redCustomBots = customBots.filter((b) => b.team === 'red');
  const blueCustomBots = customBots.filter((b) => b.team === 'blue');

  const handleAddCustomBot = (charId: CharacterId, team: PlayerTeam) => {
    if (!multiplayer.isHost || customBots.length >= 10) return;
    const prof = CHARACTER_LIST.find((c) => c.id === charId);
    const sameCount = customBots.filter((b) => b.characterId === charId).length;
    const suffix = sameCount > 0 ? ` ${sameCount + 1}` : '';
    const newBot: CustomBotSlot = {
      id: `cb-${charId}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
      name: `${prof?.name ?? charId}${suffix}`,
      characterId: charId,
      team: currentLobbyMode === 'team' ? (team === 'blue' ? 'blue' : 'red') : 'ffa',
    };
    onUpdateLobby({ customBots: [...customBots, newBot] });
  };

  const handleRemoveCustomBot = (botId: string) => {
    if (!multiplayer.isHost) return;
    onUpdateLobby({ customBots: customBots.filter((b) => b.id !== botId) });
  };

  const handleMoveCustomBot = (botId: string, nextTeam: PlayerTeam) => {
    if (!multiplayer.isHost) return;
    onUpdateLobby({
      customBots: customBots.map((b) => (b.id === botId ? { ...b, team: nextTeam } : b)),
    });
  };

  const handleZoneDrop = (e: React.DragEvent, zoneTeam: PlayerTeam) => {
    if (!multiplayer.isHost) return;
    e.preventDefault();
    setDragOverZone(null);
    const payload = e.dataTransfer.getData('text/plain');
    if (payload.startsWith('botId:')) {
      handleMoveCustomBot(payload.slice(6), zoneTeam);
    } else if (draggedPlacedBotId) {
      handleMoveCustomBot(draggedPlacedBotId, zoneTeam);
    } else if (payload.startsWith('char:')) {
      handleAddCustomBot(payload.slice(5) as CharacterId, zoneTeam);
    } else if (draggedBotCharId) {
      handleAddCustomBot(draggedBotCharId, zoneTeam);
    }
    setDraggedBotCharId(null);
    setDraggedPlacedBotId(null);
  };

  return (
    <div className="fixed inset-0 z-20 flex items-start sm:items-center justify-center bg-white p-3 sm:p-5 overflow-y-auto">
      <div className="w-full max-w-4xl sm:my-auto bg-white border border-slate-200 rounded-xl shadow-xs p-4 sm:p-5 space-y-3.5 text-slate-900">
        {/* Top Bar */}
        <header className="flex flex-wrap items-center justify-between gap-3 sm:gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-950 leading-none">
                SKYBOX CLASH
              </h1>
              <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-[10px] font-bold tracking-wide text-slate-700">
                UNSTABLE SMP
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              스카이박스 클래시 · 8종 입체 아레나 멀티플레이어 PvP
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              data-testid="open-updates-btn"
              onClick={() => setShowUpdateModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100 text-xs font-semibold text-amber-800 cursor-pointer whitespace-nowrap"
            >
              <Crown className="w-3.5 h-3.5 text-amber-600" />
              업데이트
            </button>
            <button
              type="button"
              data-testid="open-settings-btn"
              aria-label="환경설정"
              title={`환경설정 (${settings.cameraMode === 'firstperson' ? '1인칭' : settings.cameraMode === 'shiftlock' ? '시프트락' : '자유시점'})`}
              onClick={onOpenSettings}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer whitespace-nowrap"
            >
              <Settings className="w-3.5 h-3.5 text-slate-600" />
              환경설정
            </button>

            <button
              type="button"
              data-testid="open-friends-btn"
              onClick={() => onOpenAuth('friends')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer whitespace-nowrap"
            >
              <Users className="w-3.5 h-3.5 text-blue-600" />
              친구
            </button>

            <button
              type="button"
              data-testid="open-leaderboard-btn"
              onClick={() => onOpenAuth('leaderboard')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer whitespace-nowrap"
            >
              <Trophy className="w-3.5 h-3.5 text-amber-600" />
              랭킹
            </button>

            {account ? (
              <button
                type="button"
                data-testid="open-account-btn"
                onClick={() => onOpenAuth('auth')}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs text-slate-900 cursor-pointer whitespace-nowrap"
              >
                <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="font-semibold">{account.nickname}</span>
                <span className="font-mono-num text-[11px] text-slate-500">
                  {account.tier} · {account.elo}
                </span>
              </button>
            ) : (
              <button
                type="button"
                data-testid="open-auth-btn"
                onClick={() => onOpenAuth('auth')}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs cursor-pointer whitespace-nowrap"
              >
                <LogIn className="w-3.5 h-3.5" />
                로그인 / 회원가입
              </button>
            )}
          </div>
        </header>

        {/* Mode Tabs */}
        <section aria-label="게임 모드 선택" className="space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-slate-700">게임 모드</span>
            <div className="flex items-center gap-3 text-slate-500">
              <span>
                오픈월드 접속: <strong className="font-mono-num text-slate-900">{globalOnlineCount}명</strong>
              </span>
              <span aria-hidden="true">·</span>
              <button
                type="button"
                onClick={() => setShowServerConfig((v) => !v)}
                className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-900 underline-offset-2 hover:underline cursor-pointer"
              >
                <Server className="w-3 h-3" />
                {serverReachable === false ? '서버 연결 설정 필요' : '서버 설정'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 p-1 bg-slate-100 rounded-lg">
            {GAME_MODES.map((m) => {
              const active = m.id === selectedMode;
              return (
                <button
                  key={m.id}
                  type="button"
                  data-mode-id={m.id}
                  onClick={() => onSelectMode(m.id)}
                  className={`px-3 py-2 rounded-md text-left transition-colors cursor-pointer ${
                    active
                      ? 'bg-white text-slate-950 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <div className="font-display text-xs sm:text-sm font-bold whitespace-nowrap">{m.label}</div>
                </button>
              );
            })}
          </div>

          {showServerConfig && (
            <form
              onSubmit={handleSaveServerUrl}
              className="flex flex-wrap items-center gap-2 pt-2 text-xs"
            >
              <input
                type="text"
                value={customServerUrl}
                onChange={(e) => setCustomServerUrl(e.target.value)}
                placeholder="외부 웹소켓 서버 주소 (예: wss://your-app.onrender.com/ws)"
                className="flex-1 min-w-[220px] px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold cursor-pointer whitespace-nowrap"
              >
                주소 저장
              </button>
              {customServerUrl && (
                <button
                  type="button"
                  onClick={() => {
                    setCustomServerUrl('');
                    saveCustomServerUrl('');
                    onResetNetwork?.();
                  }}
                  className="px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 cursor-pointer whitespace-nowrap"
                >
                  기본값 복원
                </button>
              )}
            </form>
          )}
        </section>

        {/* Character Roster */}
        <section aria-label="캐릭터 선택" className="space-y-2.5 pt-3 border-t border-slate-200">
          <div className="flex items-baseline justify-between gap-2 text-xs">
            <span className="font-semibold text-slate-700">캐릭터 선택</span>
            <span className="text-slate-500 truncate">{activeChar.signatureLabel}</span>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-1.5">
            {CHARACTER_LIST.map((c) => {
              const active = c.id === selectedCharacter;
              return (
                <button
                  key={c.id}
                  type="button"
                  data-char-id={c.id}
                  onClick={() => onSelectCharacter(c.id)}
                  className={`flex flex-col items-start px-3 py-2 rounded-lg border transition-colors cursor-pointer ${
                    active
                      ? 'bg-slate-900 border-slate-900 text-white'
                      : 'bg-white border-slate-200 text-slate-800 hover:border-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-1.5 w-full">
                    <span
                      className="w-2.5 h-2.5 rounded-xs shrink-0 border border-black/15"
                      style={{ backgroundColor: c.trimColor }}
                    />
                    <span className="font-display text-xs font-bold whitespace-nowrap truncate">{c.name}</span>
                  </div>
                  <span
                    className={`text-[11px] mt-0.5 whitespace-nowrap ${
                      active ? 'text-slate-300' : 'text-slate-500'
                    }`}
                  >
                    {c.role}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Loadout Summary Strip (Flat, no nested card clutter) */}
          <div className="pt-2 space-y-2">
            <p className="text-xs text-slate-600">
              <strong className="text-slate-950 font-semibold">{activeChar.name}</strong>
              <span aria-hidden="true"> · </span>
              {activeChar.titleKr}
              <span aria-hidden="true"> · </span>
              <span className="text-slate-500">{activeChar.summary}</span>
            </p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-700">
              {activeChar.loadout.map((item, idx) => {
                const maxC = item.maxCharges ?? 1;
                return (
                  <div key={`${activeChar.id}-${item.id}-${idx}`} className="flex items-center gap-1.5">
                    <WeaponIcon id={item.id} className="w-4 h-4 shrink-0" />
                    <span className="whitespace-nowrap">
                      {idx + 1}. {item.name}
                    </span>
                    {maxC > 1 && (
                      <span className="font-mono-num text-[11px] font-semibold text-amber-700">
                        x{maxC}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Action Panel */}
        <section className="pt-3 border-t border-slate-200 space-y-2.5">
          {selectedMode === 'online_world' && (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2.5">
                <input
                  type="text"
                  maxLength={16}
                  value={nickname}
                  onChange={(e) => handleNicknameChange(e.target.value)}
                  placeholder="닉네임"
                  aria-label="플레이어 닉네임"
                  className="w-44 px-3 py-2.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900"
                />
                <button
                  type="button"
                  data-start="true"
                  onClick={onStart}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-white font-display text-sm sm:text-base font-bold transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Globe className="w-4 h-4 text-amber-400" />
                  {multiplayer.status === 'connecting' ? '접속 중...' : '글로벌 오픈월드 입장'}
                </button>
                <span className="text-xs text-slate-500">15분마다 8종 아레나 자동 순환 · 실시간 난입 PvP</span>
              </div>
              {serverReachable === false && !multiplayer.error && (
                <p className="text-xs text-amber-700">
                  현재 호스트에서 웹소켓 서버(/ws)가 응답하지 않습니다. Render Web Service(npm start) 배포 여부를 확인하세요.
                </p>
              )}
              {multiplayer.error && (
                <p className="text-xs text-red-600 font-medium">{multiplayer.error}</p>
              )}
            </div>
          )}

          {selectedMode === 'ffa' && (
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                data-start="true"
                onClick={onStart}
                className="px-7 py-2.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-white font-display text-base font-bold transition-colors cursor-pointer whitespace-nowrap"
              >
                솔로 연습 시작
              </button>
              <span className="text-xs text-slate-500">Enter 또는 Space로 바로 시작할 수 있습니다.</span>
            </div>
          )}

          {selectedMode === 'link_duel' && (
            !multiplayer.roomCode || multiplayer.roomKind !== 'link_duel' ? (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-slate-800">1v1 링크전 (3선승 · ELO 반영)</span>
                  {!account && (
                    <button
                      type="button"
                      onClick={() => onOpenAuth('auth')}
                      className="text-slate-600 hover:text-slate-950 underline cursor-pointer"
                    >
                      로그인하면 전적이 저장됩니다
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                  <input
                    type="text"
                    maxLength={16}
                    value={nickname}
                    onChange={(e) => handleNicknameChange(e.target.value)}
                    placeholder="닉네임"
                    aria-label="링크전 닉네임"
                    className="sm:col-span-3 px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900"
                  />

                  {multiplayer.linkQueueing ? (
                    <button
                      type="button"
                      data-testid="cancel-link-queue-btn"
                      onClick={onCancelLinkQueue}
                      className="sm:col-span-3 px-3 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold text-xs cursor-pointer whitespace-nowrap"
                    >
                      매칭 취소
                    </button>
                  ) : (
                    <button
                      type="button"
                      data-testid="queue-link-duel-btn"
                      onClick={() => onQueueLinkDuel(resolvedName)}
                      className="sm:col-span-3 px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs cursor-pointer whitespace-nowrap"
                    >
                      1v1 즉시 매칭
                    </button>
                  )}

                  <button
                    type="button"
                    data-testid="create-link-duel-btn"
                    onClick={() => onCreateLinkDuel(resolvedName)}
                    className="sm:col-span-3 px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-900 font-semibold text-xs cursor-pointer whitespace-nowrap"
                  >
                    초대 링크 생성
                  </button>

                  <div className="sm:col-span-3 flex items-center gap-1.5">
                    <input
                      type="text"
                      maxLength={4}
                      value={linkCodeInput}
                      onChange={(e) =>
                        setLinkCodeInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))
                      }
                      placeholder="코드"
                      aria-label="링크전 코드"
                      className="flex-1 min-w-0 px-2.5 py-2 rounded-lg border border-slate-300 bg-white font-mono-num uppercase text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900"
                    />
                    <button
                      type="button"
                      data-testid="join-link-duel-btn"
                      disabled={linkCodeInput.trim().length < 4}
                      onClick={() => onJoinLinkDuel(linkCodeInput.trim(), resolvedName)}
                      className="px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-semibold text-xs cursor-pointer whitespace-nowrap"
                    >
                      입장
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    data-start="true"
                    onClick={onStart}
                    className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-display text-sm font-bold cursor-pointer whitespace-nowrap"
                  >
                    AI 1v1 연습 대결 (3선승)
                  </button>
                  <span className="text-xs text-slate-500">대기 상대가 없으면 AI와 1v1 연습 가능</span>
                </div>

                {multiplayer.error && (
                  <p className="text-xs text-red-600 font-medium">{multiplayer.error}</p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 text-xs">
                    <span className="text-slate-500">링크전 코드</span>
                    <span
                      data-testid="link-code-badge"
                      className="font-mono-num text-base font-bold text-slate-950 tracking-widest"
                    >
                      {multiplayer.roomCode}
                    </span>
                    <button
                      type="button"
                      data-testid="copy-link-invite-btn"
                      onClick={() => handleCopyInvite('link_duel')}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-xs text-slate-700 cursor-pointer"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? '복사 완료' : '초대 링크 복사'}
                    </button>
                  </div>
                  <button
                    type="button"
                    data-testid="room-leave-btn"
                    onClick={onLeaveRoom}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-md border border-slate-300 bg-white hover:bg-red-50 text-xs text-slate-600 hover:text-red-700 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    방 나가기
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-700">
                  {multiplayer.peers.map((peer) => (
                    <span key={peer.id} className="font-medium">
                      {peer.name} ({CHARACTER_LIST.find((c) => c.id === peer.characterId)?.name ?? peer.characterId})
                    </span>
                  ))}
                  {multiplayer.peers.length < 2 && (
                    <span className="text-slate-500">· 상대방이 접속하면 자동으로 결투가 시작됩니다</span>
                  )}
                </div>
              </div>
            )
          )}

          {selectedMode === 'multiplayer' && (
            !multiplayer.roomCode || multiplayer.roomKind !== 'private' ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-800">게임 방식:</span>
                    <div className="inline-flex rounded-lg bg-slate-100 p-0.5">
                      <button
                        type="button"
                        onClick={() => setRoomMode('ffa')}
                        className={`px-3 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                          roomMode === 'ffa' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        ⚔️ 개인전 (FFA)
                      </button>
                      <button
                        type="button"
                        onClick={() => setRoomMode('team')}
                        className={`px-3 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                          roomMode === 'team' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        🔴 vs 🔵 팀전 (Red/Blue)
                      </button>
                    </div>
                  </div>

                  <label className="flex items-center gap-2 text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeBots}
                      onChange={(e) => setIncludeBots(e.target.checked)}
                      className="accent-slate-900"
                    />
                    빈 자리에 AI 봇 포함
                  </label>
                </div>

                {roomMode === 'team' && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-semibold text-slate-700">소속 팀 선택:</span>
                    <button
                      type="button"
                      onClick={() => setMyTeam('red')}
                      className={`px-3 py-1 rounded-lg font-semibold border cursor-pointer transition-colors ${
                        myTeam === 'red'
                          ? 'bg-red-600 border-red-600 text-white shadow-xs'
                          : 'bg-white border-slate-300 text-red-700 hover:border-red-400'
                      }`}
                    >
                      🔴 레드팀
                    </button>
                    <button
                      type="button"
                      onClick={() => setMyTeam('blue')}
                      className={`px-3 py-1 rounded-lg font-semibold border cursor-pointer transition-colors ${
                        myTeam === 'blue'
                          ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                          : 'bg-white border-slate-300 text-blue-700 hover:border-blue-400'
                      }`}
                    >
                      🔵 블루팀
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-1">
                  <input
                    type="text"
                    maxLength={16}
                    value={nickname}
                    onChange={(e) => handleNicknameChange(e.target.value)}
                    placeholder="닉네임"
                    aria-label="플레이어 닉네임"
                    className="sm:col-span-4 px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900"
                  />

                  <button
                    type="button"
                    data-testid="create-room-btn"
                    onClick={() =>
                      onCreateRoom(
                        resolvedName,
                        includeBots,
                        roomMode,
                        roomMode === 'team' ? myTeam : 'ffa',
                        'medium',
                        'classic'
                      )
                    }
                    className="sm:col-span-3 px-4 py-2 rounded-lg bg-slate-950 hover:bg-slate-800 text-white font-semibold text-sm cursor-pointer whitespace-nowrap"
                  >
                    {multiplayer.status === 'connecting' ? '연결 중...' : '방 만들기'}
                  </button>

                  <div className="sm:col-span-5 flex items-center gap-1.5">
                    <input
                      type="text"
                      maxLength={4}
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                      placeholder="방 코드 4자리"
                      aria-label="참가할 방 코드"
                      className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-slate-300 bg-white font-mono-num uppercase text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900"
                    />
                    <button
                      type="button"
                      data-testid="join-room-btn"
                      onClick={() => {
                        if (joinCode.trim().length >= 4) {
                          onJoinRoom(joinCode.trim().toUpperCase(), resolvedName, roomMode === 'team' ? myTeam : 'ffa');
                        }
                      }}
                      disabled={joinCode.trim().length < 4}
                      className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-semibold text-sm cursor-pointer whitespace-nowrap"
                    >
                      참가
                    </button>
                  </div>
                </div>

                {multiplayer.error && (
                  <p className="text-xs text-red-600 font-medium">{multiplayer.error}</p>
                )}
              </div>
            ) : (
              /* Valorant-Style Custom Room Lobby */
              <div className="space-y-2.5" data-testid="custom-lobby-panel">
                {/* Lobby Header & Match Rules */}
                <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="px-2 py-0.5 rounded bg-slate-900 text-white font-bold tracking-wider text-[10px]">
                      CUSTOM ROOM
                    </span>
                    <span
                      data-testid="room-code-badge"
                      className="font-mono-num text-base font-bold text-slate-950 tracking-widest"
                    >
                      {multiplayer.roomCode}
                    </span>
                    <button
                      type="button"
                      data-testid="copy-invite-btn"
                      onClick={() => handleCopyInvite('private')}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-md border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 cursor-pointer"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? '복사 완료' : '초대 링크'}
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {multiplayer.isHost ? (
                      <>
                        <div className="inline-flex rounded-lg bg-white border border-slate-200 p-0.5">
                          <button
                            type="button"
                            onClick={() => onUpdateLobby({ roomMode: 'team' })}
                            className={`px-2.5 py-1 rounded-md font-semibold cursor-pointer ${
                              currentLobbyMode === 'team' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            팀전
                          </button>
                          <button
                            type="button"
                            onClick={() => onUpdateLobby({ roomMode: 'ffa' })}
                            className={`px-2.5 py-1 rounded-md font-semibold cursor-pointer ${
                              currentLobbyMode === 'ffa' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            개인전
                          </button>
                        </div>

                        <div className="inline-flex items-center gap-1 rounded-lg bg-white border border-slate-200 px-2 py-0.5">
                          <span className="text-slate-500 text-[11px]">목표</span>
                          {[10, 15, 25, 30].map((tk) => (
                            <button
                              key={tk}
                              type="button"
                              onClick={() => onUpdateLobby({ targetKills: tk })}
                              className={`px-1.5 py-0.5 rounded font-mono-num font-bold cursor-pointer ${
                                (multiplayer.targetKills ?? 15) === tk
                                  ? 'bg-slate-900 text-white'
                                  : 'text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              {tk}
                            </button>
                          ))}
                        </div>

                        <label className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={multiplayer.includeBots}
                            onChange={(e) => onUpdateLobby({ includeBots: e.target.checked })}
                            className="accent-slate-900"
                          />
                          AI 봇
                        </label>
                      </>
                    ) : (
                      <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-600 font-medium">
                        {currentLobbyMode === 'team' ? '팀전' : '개인전'} · {partyModeLabelMap[currentPartyMode]} · AI {botDifficultyLabelMap[currentBotDifficulty]} · 목표 {multiplayer.targetKills ?? 15}킬
                      </span>
                    )}

                    <button
                      type="button"
                      data-testid="room-leave-btn"
                      onClick={onLeaveRoom}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-300 bg-white hover:bg-red-50 text-slate-600 hover:text-red-700 cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      방 나가기
                    </button>
                  </div>
                </div>

                {/* Party Game Mode & AI Bot Difficulty (Inside Custom Lobby) */}
                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/80 space-y-2.5 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold text-slate-800">파티 게임 모드</span>
                    {!multiplayer.isHost && (
                      <span className="px-2 py-0.5 rounded bg-slate-900 text-white font-semibold">
                        {partyModeLabelMap[currentPartyMode]}
                      </span>
                    )}
                  </div>
                  {multiplayer.isHost ? (
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                      {(
                        [
                          { id: 'classic', label: '클래식' },
                          { id: 'knockout', label: '킬 녹아웃' },
                          { id: 'boss_raid', label: '보스 레이드' },
                          { id: 'random_arsenal', label: '랜덤 무기' },
                          { id: 'one_shot', label: '원샷원킬' },
                        ] as Array<{ id: CustomPartyMode; label: string }>
                      ).map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          data-testid={`party-mode-${m.id}`}
                          onClick={() => onUpdateLobby({ partyMode: m.id })}
                          className={`px-2 py-1.5 rounded-lg font-semibold border cursor-pointer transition-colors ${
                            currentPartyMode === m.id
                              ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
                              : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                  ) : null}

                  {(multiplayer.includeBots || currentPartyMode === 'boss_raid' || currentPartyMode === 'knockout') && (
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-slate-200/80">
                      <span className="font-semibold text-slate-800">AI 봇 난이도</span>
                      {multiplayer.isHost ? (
                        <div className="inline-flex items-center gap-1.5">
                          {(
                            [
                              { id: 'easy', label: '쉬움' },
                              { id: 'medium', label: '보통' },
                              { id: 'hard', label: '어려움' },
                            ] as Array<{ id: BotDifficulty; label: string }>
                          ).map((d) => (
                            <button
                              key={d.id}
                              type="button"
                              data-testid={`bot-diff-${d.id}`}
                              onClick={() => onUpdateLobby({ botDifficulty: d.id })}
                              className={`px-3 py-1 rounded-lg font-semibold border cursor-pointer transition-colors ${
                                currentBotDifficulty === d.id
                                  ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
                                  : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                              }`}
                            >
                              {d.label}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700 font-semibold">
                          {botDifficultyLabelMap[currentBotDifficulty]}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Valorant-style Team Roster + Lobby Chat Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
                  {/* Roster Columns */}
                  <div className="lg:col-span-8 space-y-2.5">
                    {/* Valorant-style Team Roster + Drag-and-Drop Bot Dropzones */}
                    {currentLobbyMode === 'team' ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {/* RED TEAM */}
                        <div
                          data-testid="dropzone-red"
                          onDragOver={(e) => {
                            if (!multiplayer.isHost) return;
                            e.preventDefault();
                            if (dragOverZone !== 'red') setDragOverZone('red');
                          }}
                          onDragLeave={() => {
                            if (dragOverZone === 'red') setDragOverZone(null);
                          }}
                          onDrop={(e) => handleZoneDrop(e, 'red')}
                          className={`rounded-xl border bg-white overflow-hidden transition-all ${
                            dragOverZone === 'red'
                              ? 'border-red-500 ring-2 ring-red-300 bg-red-50/40'
                              : 'border-red-200'
                          }`}
                        >
                          <div className="flex items-center justify-between px-3 py-2 bg-red-600 text-white text-xs">
                            <span className="font-display font-bold tracking-wide">
                              RED TEAM ({redPeers.length + redCustomBots.length})
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setMyTeam('red');
                                onUpdateLobby({ team: 'red' });
                              }}
                              disabled={activeMyTeam === 'red'}
                              className="px-2 py-0.5 rounded bg-white/15 hover:bg-white/25 disabled:opacity-60 text-[11px] font-semibold cursor-pointer"
                            >
                              {activeMyTeam === 'red' ? '소속됨' : '레드팀 합류'}
                            </button>
                          </div>
                          <div className="p-2 space-y-1.5 min-h-[104px]">
                            {redPeers.map((peer) => {
                              const charProf = CHARACTER_LIST.find((c) => c.id === peer.characterId);
                              const isSelf = peer.id === multiplayer.selfId;
                              return (
                                <div
                                  key={peer.id}
                                  className={`flex items-center justify-between px-2.5 py-2 rounded-lg border text-xs ${
                                    isSelf
                                      ? 'border-red-300 bg-red-50/70'
                                      : 'border-slate-200 bg-slate-50/70'
                                  }`}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span
                                      className="w-2.5 h-2.5 rounded-xs shrink-0 border border-black/15"
                                      style={{ backgroundColor: charProf?.trimColor ?? '#dc2626' }}
                                    />
                                    <span className="font-semibold text-slate-900 truncate">
                                      {peer.name}
                                    </span>
                                    {peer.isHost && (
                                      <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" aria-label="방장" />
                                    )}
                                    {isSelf && (
                                      <span className="text-[10px] font-bold text-red-700">(나)</span>
                                    )}
                                  </div>
                                  <span className="text-[11px] text-slate-500 whitespace-nowrap ml-2">
                                    {charProf?.name ?? peer.characterId}
                                  </span>
                                </div>
                              );
                            })}
                            {redCustomBots.map((bot) => {
                              const charProf = CHARACTER_LIST.find((c) => c.id === bot.characterId);
                              return (
                                <div
                                  key={bot.id}
                                  data-testid={`placed-bot-${bot.id}`}
                                  draggable={multiplayer.isHost}
                                  onDragStart={(e) => {
                                    e.dataTransfer.setData('text/plain', `botId:${bot.id}`);
                                    setDraggedPlacedBotId(bot.id);
                                  }}
                                  onDragEnd={() => {
                                    setDraggedPlacedBotId(null);
                                    setDragOverZone(null);
                                  }}
                                  className="flex items-center justify-between px-2.5 py-1.5 rounded-lg border border-red-200 bg-red-50/40 text-xs"
                                >
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    {multiplayer.isHost && (
                                      <GripVertical className="w-3.5 h-3.5 text-slate-400 shrink-0 cursor-grab" />
                                    )}
                                    <span
                                      className="w-2.5 h-2.5 rounded-xs shrink-0 border border-black/15"
                                      style={{ backgroundColor: charProf?.trimColor ?? '#dc2626' }}
                                    />
                                    <span className="font-semibold text-slate-800 truncate">{bot.name}</span>
                                    <span className="px-1 py-0.5 rounded bg-red-100 text-red-700 text-[9px] font-bold">
                                      BOT
                                    </span>
                                  </div>
                                  {multiplayer.isHost && (
                                    <button
                                      type="button"
                                      aria-label={`${bot.name} 제거`}
                                      onClick={() => handleRemoveCustomBot(bot.id)}
                                      className="p-0.5 rounded text-slate-400 hover:text-red-600 cursor-pointer"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                            {redPeers.length === 0 && redCustomBots.length === 0 && (
                              <div className="text-[11px] text-slate-400 py-3 text-center">
                                {multiplayer.isHost
                                  ? '아래 봇 카드를 이곳으로 드래그하여 배치'
                                  : multiplayer.includeBots
                                    ? 'AI 봇 자동 충원 대기'
                                    : '플레이어 대기 중'}
                              </div>
                            )}
                            {multiplayer.includeBots && customBots.length === 0 && redPeers.length < 3 && (
                              <div className="text-[11px] text-slate-400 px-2 pt-0.5">
                                + 봇 미배치 시 자동 충원
                              </div>
                            )}
                          </div>
                        </div>

                        {/* BLUE TEAM */}
                        <div
                          data-testid="dropzone-blue"
                          onDragOver={(e) => {
                            if (!multiplayer.isHost) return;
                            e.preventDefault();
                            if (dragOverZone !== 'blue') setDragOverZone('blue');
                          }}
                          onDragLeave={() => {
                            if (dragOverZone === 'blue') setDragOverZone(null);
                          }}
                          onDrop={(e) => handleZoneDrop(e, 'blue')}
                          className={`rounded-xl border bg-white overflow-hidden transition-all ${
                            dragOverZone === 'blue'
                              ? 'border-blue-500 ring-2 ring-blue-300 bg-blue-50/40'
                              : 'border-blue-200'
                          }`}
                        >
                          <div className="flex items-center justify-between px-3 py-2 bg-blue-600 text-white text-xs">
                            <span className="font-display font-bold tracking-wide">
                              BLUE TEAM ({bluePeers.length + blueCustomBots.length})
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setMyTeam('blue');
                                onUpdateLobby({ team: 'blue' });
                              }}
                              disabled={activeMyTeam === 'blue'}
                              className="px-2 py-0.5 rounded bg-white/15 hover:bg-white/25 disabled:opacity-60 text-[11px] font-semibold cursor-pointer"
                            >
                              {activeMyTeam === 'blue' ? '소속됨' : '블루팀 합류'}
                            </button>
                          </div>
                          <div className="p-2 space-y-1.5 min-h-[104px]">
                            {bluePeers.map((peer) => {
                              const charProf = CHARACTER_LIST.find((c) => c.id === peer.characterId);
                              const isSelf = peer.id === multiplayer.selfId;
                              return (
                                <div
                                  key={peer.id}
                                  className={`flex items-center justify-between px-2.5 py-2 rounded-lg border text-xs ${
                                    isSelf
                                      ? 'border-blue-300 bg-blue-50/70'
                                      : 'border-slate-200 bg-slate-50/70'
                                  }`}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span
                                      className="w-2.5 h-2.5 rounded-xs shrink-0 border border-black/15"
                                      style={{ backgroundColor: charProf?.trimColor ?? '#2563eb' }}
                                    />
                                    <span className="font-semibold text-slate-900 truncate">
                                      {peer.name}
                                    </span>
                                    {peer.isHost && (
                                      <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" aria-label="방장" />
                                    )}
                                    {isSelf && (
                                      <span className="text-[10px] font-bold text-blue-700">(나)</span>
                                    )}
                                  </div>
                                  <span className="text-[11px] text-slate-500 whitespace-nowrap ml-2">
                                    {charProf?.name ?? peer.characterId}
                                  </span>
                                </div>
                              );
                            })}
                            {blueCustomBots.map((bot) => {
                              const charProf = CHARACTER_LIST.find((c) => c.id === bot.characterId);
                              return (
                                <div
                                  key={bot.id}
                                  data-testid={`placed-bot-${bot.id}`}
                                  draggable={multiplayer.isHost}
                                  onDragStart={(e) => {
                                    e.dataTransfer.setData('text/plain', `botId:${bot.id}`);
                                    setDraggedPlacedBotId(bot.id);
                                  }}
                                  onDragEnd={() => {
                                    setDraggedPlacedBotId(null);
                                    setDragOverZone(null);
                                  }}
                                  className="flex items-center justify-between px-2.5 py-1.5 rounded-lg border border-blue-200 bg-blue-50/40 text-xs"
                                >
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    {multiplayer.isHost && (
                                      <GripVertical className="w-3.5 h-3.5 text-slate-400 shrink-0 cursor-grab" />
                                    )}
                                    <span
                                      className="w-2.5 h-2.5 rounded-xs shrink-0 border border-black/15"
                                      style={{ backgroundColor: charProf?.trimColor ?? '#2563eb' }}
                                    />
                                    <span className="font-semibold text-slate-800 truncate">{bot.name}</span>
                                    <span className="px-1 py-0.5 rounded bg-blue-100 text-blue-700 text-[9px] font-bold">
                                      BOT
                                    </span>
                                  </div>
                                  {multiplayer.isHost && (
                                    <button
                                      type="button"
                                      aria-label={`${bot.name} 제거`}
                                      onClick={() => handleRemoveCustomBot(bot.id)}
                                      className="p-0.5 rounded text-slate-400 hover:text-red-600 cursor-pointer"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                            {bluePeers.length === 0 && blueCustomBots.length === 0 && (
                              <div className="text-[11px] text-slate-400 py-3 text-center">
                                {multiplayer.isHost
                                  ? '아래 봇 카드를 이곳으로 드래그하여 배치'
                                  : multiplayer.includeBots
                                    ? 'AI 봇 자동 충원 대기'
                                    : '플레이어 대기 중'}
                              </div>
                            )}
                            {multiplayer.includeBots && customBots.length === 0 && bluePeers.length < 3 && (
                              <div className="text-[11px] text-slate-400 px-2 pt-0.5">
                                + 봇 미배치 시 자동 충원
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div
                        data-testid="dropzone-ffa"
                        onDragOver={(e) => {
                          if (!multiplayer.isHost) return;
                          e.preventDefault();
                          if (dragOverZone !== 'ffa') setDragOverZone('ffa');
                        }}
                        onDragLeave={() => {
                          if (dragOverZone === 'ffa') setDragOverZone(null);
                        }}
                        onDrop={(e) => handleZoneDrop(e, 'ffa')}
                        className={`rounded-xl border bg-white overflow-hidden transition-all ${
                          dragOverZone === 'ffa'
                            ? 'border-slate-900 ring-2 ring-slate-300 bg-slate-50'
                            : 'border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between px-3 py-2 bg-slate-900 text-white text-xs">
                          <span className="font-display font-bold tracking-wide">
                            FREE FOR ALL ROSTER ({multiplayer.peers.length + customBots.length})
                          </span>
                          <span className="text-[11px] text-slate-300">
                            {customBots.length > 0
                              ? `직접 배치 봇 ${customBots.length}명`
                              : multiplayer.includeBots
                                ? 'AI 봇 자동 충원 ON'
                                : '유저 전용'}
                          </span>
                        </div>
                        <div className="p-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {multiplayer.peers.map((peer) => {
                            const charProf = CHARACTER_LIST.find((c) => c.id === peer.characterId);
                            const isSelf = peer.id === multiplayer.selfId;
                            return (
                              <div
                                key={peer.id}
                                className={`flex items-center justify-between px-2.5 py-2 rounded-lg border text-xs ${
                                  isSelf ? 'border-slate-900 bg-slate-100' : 'border-slate-200 bg-slate-50'
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <span
                                    className="w-2.5 h-2.5 rounded-xs shrink-0 border border-black/15"
                                    style={{ backgroundColor: charProf?.trimColor ?? '#0f172a' }}
                                  />
                                  <span className="font-semibold text-slate-900 truncate">{peer.name}</span>
                                  {peer.isHost && <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                                </div>
                                <span className="text-[11px] text-slate-500">{charProf?.name ?? peer.characterId}</span>
                              </div>
                            );
                          })}
                          {customBots.map((bot) => {
                            const charProf = CHARACTER_LIST.find((c) => c.id === bot.characterId);
                            return (
                              <div
                                key={bot.id}
                                data-testid={`placed-bot-${bot.id}`}
                                className="flex items-center justify-between px-2.5 py-2 rounded-lg border border-slate-200 bg-amber-50/50 text-xs"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <span
                                    className="w-2.5 h-2.5 rounded-xs shrink-0 border border-black/15"
                                    style={{ backgroundColor: charProf?.trimColor ?? '#0f172a' }}
                                  />
                                  <span className="font-semibold text-slate-900 truncate">{bot.name}</span>
                                  <span className="px-1 py-0.5 rounded bg-slate-200 text-slate-700 text-[9px] font-bold">
                                    BOT
                                  </span>
                                </div>
                                {multiplayer.isHost && (
                                  <button
                                    type="button"
                                    aria-label={`${bot.name} 제거`}
                                    onClick={() => handleRemoveCustomBot(bot.id)}
                                    className="p-0.5 rounded text-slate-400 hover:text-red-600 cursor-pointer"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Drag-and-Drop AI Bot Bench (Host only) */}
                    {multiplayer.isHost && currentPartyMode !== 'boss_raid' && (
                      <div
                        data-testid="custom-bot-bench"
                        className="rounded-xl border border-slate-200 bg-slate-50/90 p-2.5 space-y-2 text-xs"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-800">
                              AI 봇 대기석 (팀 칸으로 드래그 앤 드롭 배치)
                            </span>
                            <span className="font-mono-num text-[11px] text-slate-500">
                              {customBots.length}/10
                            </span>
                          </div>
                          {customBots.length > 0 && (
                            <button
                              type="button"
                              onClick={() => onUpdateLobby({ customBots: [] })}
                              className="px-2 py-0.5 rounded border border-slate-300 bg-white hover:bg-red-50 text-[11px] font-semibold text-slate-600 hover:text-red-700 cursor-pointer"
                            >
                              배치 초기화
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                          {CHARACTER_LIST.map((c) => (
                            <div
                              key={`bench-${c.id}`}
                              data-testid={`bot-card-${c.id}`}
                              draggable
                              onDragStart={(e) => {
                                e.dataTransfer.setData('text/plain', `char:${c.id}`);
                                setDraggedBotCharId(c.id);
                              }}
                              onDragEnd={() => {
                                setDraggedBotCharId(null);
                                setDragOverZone(null);
                              }}
                              className="flex items-center justify-between gap-1 px-2 py-1.5 rounded-lg border border-slate-200 bg-white hover:border-slate-400 cursor-grab active:cursor-grabbing"
                            >
                              <div className="flex items-center gap-1.5 min-w-0">
                                <GripVertical className="w-3 h-3 text-slate-400 shrink-0" />
                                <span
                                  className="w-2 h-2 rounded-xs shrink-0 border border-black/15"
                                  style={{ backgroundColor: c.trimColor }}
                                />
                                <span className="font-semibold text-slate-900 truncate text-[11px]">
                                  {c.name}
                                </span>
                              </div>
                              <div className="flex items-center gap-0.5 shrink-0">
                                {currentLobbyMode === 'team' ? (
                                  <>
                                    <button
                                      type="button"
                                      data-testid={`add-bot-red-${c.id}`}
                                      title="레드팀에 추가"
                                      onClick={() => handleAddCustomBot(c.id, 'red')}
                                      className="px-1.5 py-0.5 rounded bg-red-100 hover:bg-red-200 text-red-700 font-bold text-[10px] cursor-pointer"
                                    >
                                      +R
                                    </button>
                                    <button
                                      type="button"
                                      data-testid={`add-bot-blue-${c.id}`}
                                      title="블루팀에 추가"
                                      onClick={() => handleAddCustomBot(c.id, 'blue')}
                                      className="px-1.5 py-0.5 rounded bg-blue-100 hover:bg-blue-200 text-blue-700 font-bold text-[10px] cursor-pointer"
                                    >
                                      +B
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    type="button"
                                    data-testid={`add-bot-ffa-${c.id}`}
                                    title="개인전 슬롯에 추가"
                                    onClick={() => handleAddCustomBot(c.id, 'ffa')}
                                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-[10px] cursor-pointer"
                                  >
                                    <Plus className="w-2.5 h-2.5" />
                                    추가
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Pre-Match 8-Map Voting Strip */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-blue-600" />
                          사설 맵 투표 (8종 아레나 · 다수결 결정)
                        </span>
                        <span className="text-[11px] text-slate-500">전투 중 15분마다 자동 로테이션</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {MAP_ORDER.map((mapId) => {
                          const def = MAP_DEFINITIONS[mapId];
                          const votes = multiplayer.mapVotes?.[mapId] ?? 0;
                          const isSelected = multiplayer.selectedMap === mapId;
                          const myVote = selfPeer?.votedMap === mapId;
                          return (
                            <button
                              key={mapId}
                              type="button"
                              data-testid={`vote-map-${mapId}`}
                              onClick={() => onVoteMap(mapId)}
                              className={`p-2 rounded-lg border text-left transition-colors cursor-pointer ${
                                isSelected
                                  ? 'bg-slate-900 border-slate-900 text-white'
                                  : myVote
                                    ? 'bg-blue-50 border-blue-400 text-slate-900'
                                    : 'bg-white border-slate-200 text-slate-800 hover:border-slate-400'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span
                                  className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                                  style={{
                                    backgroundColor: isSelected ? 'rgba(255,255,255,0.16)' : `${def.accentHex}18`,
                                    color: isSelected ? '#ffffff' : def.accentHex,
                                  }}
                                >
                                  {def.badge}
                                </span>
                                <span
                                  className={`font-mono-num text-[11px] font-bold ${
                                    isSelected ? 'text-amber-300' : 'text-slate-600'
                                  }`}
                                >
                                  {votes}표
                                </span>
                              </div>
                              <div className="font-display text-xs font-bold mt-1.5 truncate">{def.name}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Embedded Lobby Chat */}
                  <div className="lg:col-span-4 rounded-xl border border-slate-200 bg-white flex flex-col overflow-hidden">
                    <div className="px-3 py-2 border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700">
                      사설 로비 채팅
                    </div>
                    <div
                      ref={lobbyChatEndRef}
                      className="flex-1 min-h-[108px] max-h-40 overflow-y-auto px-3 py-2 space-y-1.5 text-xs"
                    >
                      {chatMessages.length === 0 ? (
                        <div className="text-[11px] text-slate-400 py-4 text-center">
                          팀원에게 인사를 남겨보세요
                        </div>
                      ) : (
                        chatMessages.slice(-24).map((m) => (
                          <div key={m.id} className="leading-snug break-words">
                            <span
                              className={`font-semibold ${
                                m.team === 'red'
                                  ? 'text-red-600'
                                  : m.team === 'blue'
                                    ? 'text-blue-600'
                                    : 'text-slate-950'
                              }`}
                            >
                              {m.senderName}:{' '}
                            </span>
                            <span className="text-slate-700">{m.text}</span>
                          </div>
                        ))
                      )}
                    </div>
                    <form
                      onSubmit={handleLobbyChatSubmit}
                      className="flex items-center border-t border-slate-200 bg-slate-50"
                    >
                      <input
                        type="text"
                        data-testid="lobby-chat-input"
                        maxLength={160}
                        value={lobbyChatText}
                        onChange={(e) => setLobbyChatText(e.target.value)}
                        placeholder="로비 채팅 입력..."
                        aria-label="사설 로비 채팅 입력"
                        className="flex-1 min-w-0 px-3 py-2 bg-transparent text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none"
                      />
                      <button
                        type="submit"
                        aria-label="로비 채팅 전송"
                        className="px-3 py-2 text-slate-600 hover:text-slate-950 cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </form>
                  </div>
                </div>

                {/* Bottom Start / Waiting Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <div className="text-xs text-slate-500">
                    선택된 맵:{' '}
                    <strong className="text-slate-900">
                      {MAP_DEFINITIONS[multiplayer.selectedMap ?? 'container_yard'].name}
                    </strong>
                    <span aria-hidden="true"> · </span>
                    모드 <strong className="text-slate-900">{partyModeLabelMap[currentPartyMode]}</strong>
                    <span aria-hidden="true"> · </span>
                    목표 {multiplayer.targetKills ?? 15}킬
                  </div>
                  {multiplayer.isHost ? (
                    <button
                      type="button"
                      data-start="true"
                      onClick={onStartMultiplayer}
                      className="px-7 py-2.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-white font-display text-sm font-bold cursor-pointer whitespace-nowrap"
                    >
                      매치 시작 ({multiplayer.peers.length}명)
                    </button>
                  ) : (
                    <div className="text-xs font-medium text-slate-600">
                      방장이 매치를 시작할 때까지 대기 중입니다.
                    </div>
                  )}
                </div>
              </div>
            )
          )}
        </section>
      </div>

      {showUpdateModal && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-xl p-6 space-y-4 text-slate-900 animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-500" />
                <h2 className="font-display text-lg font-bold text-slate-950">
                  SKYBOX CLASH v3.0 업데이트 로그
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowUpdateModal(false)}
                className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 cursor-pointer"
              >
                닫기
              </button>
            </div>
            <div className="space-y-3 text-xs text-slate-600 max-h-[60vh] overflow-y-auto pr-2">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                <h3 className="font-bold text-slate-900 text-sm">🛡️ 팀킬 방지 &amp; 적군 붉은색 외곽선 강조</h3>
                <p>같은 팀 아군끼리는 근접·원거리·TNT·용암 피해가 일절 들어가지 않으며, 모든 적군에게 선명한 붉은색 외곽선이 적용되어 피아식별이 즉시 가능합니다.</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                <h3 className="font-bold text-slate-900 text-sm">💥 TNT 위력 대폭 상향 &amp; 점프 패드·연속 킬</h3>
                <p>TNT 폭발 피해량(최대 130)과 반경(9m)이 크게 상승했으며, 맵 곳곳의 3D 점프 패드와 연속 킬 배너(더블/트리플/쿼드라/펜타 킬)로 역동적인 전투를 즐길 수 있습니다.</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                <h3 className="font-bold text-slate-900 text-sm">👹 보스 레이드 괴물 모델 &amp; 승패 세레머니</h3>
                <p>보스가 거대한 뿔·발톱·코어를 지닌 압도적인 3D 괴물 크리처로 개편되었고, 매치 종료 시 팀전/개인전 승패 결과에 맞춘 3D 트로피·왕관 세레머니 컷신이 연출됩니다.</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                <h3 className="font-bold text-slate-900 text-sm">🗺️ 8종 입체 아레나 &amp; 15분 자동 로테이션</h3>
                <p>고저차와 캣워크가 강화된 신규 4종 맵(사이버 넥서스, 빙하 요새, 고대 사원, 궤도 원자로)이 추가되어 15분마다 자동 순환합니다.</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                <h3 className="font-bold text-slate-900 text-sm">🤖 사설 봇 드래그 배치 &amp; 랜덤 무기 3슬롯</h3>
                <p>사설 방 대기실에서 AI 봇을 원하는 팀으로 드래그 앤 드롭 배치할 수 있으며, 랜덤 무기 모드는 공격·치유·이동기 3종만 지급됩니다.</p>
              </div>
            </div>
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => setShowUpdateModal(false)}
                className="w-full py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-white font-semibold text-sm cursor-pointer"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
