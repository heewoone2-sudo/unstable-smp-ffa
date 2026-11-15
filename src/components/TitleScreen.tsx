import { useEffect, useState } from 'react';
import { Copy, Check, LogOut, Trophy, UserCheck, LogIn, Globe, Server } from 'lucide-react';
import type { PlayerAccountProfile } from '../firebase';
import { CHARACTER_LIST, GAME_MODES } from '../game/characters';
import { getCustomServerUrl, saveCustomServerUrl } from '../game/net';
import type { CharacterId, GameModeId, MultiplayerHudState } from '../game/types';
import { WeaponIcon } from './WeaponIcons';

interface TitleScreenProps {
  selectedCharacter: CharacterId;
  selectedMode: GameModeId;
  multiplayer: MultiplayerHudState;
  account: PlayerAccountProfile | null;
  initialRoomCode: string;
  initialLinkCode: string;
  onSelectCharacter: (id: CharacterId) => void;
  onSelectMode: (mode: GameModeId) => void;
  onStart: () => void;
  onSetPlayerName: (name: string) => void;
  onOpenAuth: (tab: 'auth' | 'leaderboard') => void;
  onCreateLinkDuel: (name: string) => void;
  onJoinLinkDuel: (code: string, name: string) => void;
  onQueueLinkDuel: (name: string) => void;
  onCancelLinkQueue: () => void;
  onCreateRoom: (name: string, includeBots: boolean, roomMode: 'ffa' | 'team', team: 'red' | 'blue' | 'ffa') => void;
  onJoinRoom: (code: string, name: string, team: 'red' | 'blue' | 'ffa') => void;
  onUpdateLobby: (updates: { name?: string; includeBots?: boolean; team?: 'red' | 'blue' | 'ffa'; roomMode?: 'ffa' | 'team' }) => void;
  onStartMultiplayer: () => void;
  onLeaveRoom: () => void;
  onResetNetwork?: () => void;
}

export function TitleScreen({
  selectedCharacter,
  selectedMode,
  multiplayer,
  account,
  initialRoomCode,
  initialLinkCode,
  onSelectCharacter,
  onSelectMode,
  onStart,
  onSetPlayerName,
  onOpenAuth,
  onCreateLinkDuel,
  onJoinLinkDuel,
  onQueueLinkDuel,
  onCancelLinkQueue,
  onCreateRoom,
  onJoinRoom,
  onUpdateLobby,
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
  const [roomMode, setRoomMode] = useState<'ffa' | 'team'>('ffa');
  const [myTeam, setMyTeam] = useState<'red' | 'blue' | 'ffa'>('red');

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

  const resolvedName = nickname.trim() || account?.nickname || 'Player';

  return (
    <div className="fixed inset-0 z-20 flex justify-center bg-white p-4 sm:p-8 overflow-y-auto">
      <div className="w-full max-w-3xl my-auto bg-white border border-slate-200 rounded-xl shadow-xs p-5 sm:p-7 space-y-5 text-slate-900">
        {/* Top Bar */}
        <header className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-950 leading-none">
              UNSTABLE SMP FFA
            </h1>
            <p className="text-xs text-slate-500 mt-1.5">
              초원 216m 오픈월드 · 0초 쿨타임 검 · 1v1 링크전 &amp; 실시간 PvP
            </p>
          </div>

          <div className="flex items-center gap-2">
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
                  <div className="text-[11px] text-slate-500 truncate mt-0.5">{m.subtitle}</div>
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
        <section aria-label="캐릭터 선택" className="space-y-3 pt-4 border-t border-slate-200">
          <div className="flex items-baseline justify-between gap-2 text-xs">
            <span className="font-semibold text-slate-700">캐릭터 선택</span>
            <span className="text-slate-500 truncate">{activeChar.signatureLabel}</span>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
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
        <section className="pt-4 border-t border-slate-200 space-y-3">
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
                <span className="text-xs text-slate-500">초원 216m 월드 · 실시간 난입 PvP</span>
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
                    onClick={onLeaveRoom}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-md border border-slate-300 bg-white hover:bg-red-50 text-xs text-slate-600 hover:text-red-700 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    나가기
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

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
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
                    onClick={() => onCreateRoom(resolvedName, includeBots, roomMode, roomMode === 'team' ? myTeam : 'ffa')}
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
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="text-slate-500">방 코드</span>
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
                      className="flex items-center gap-1 px-2.5 py-1 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 cursor-pointer"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? '복사 완료' : '초대 링크 복사'}
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    {multiplayer.isHost && (
                      <label className="flex items-center gap-1.5 text-slate-600 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={multiplayer.includeBots}
                          onChange={(e) => onUpdateLobby({ includeBots: e.target.checked })}
                          className="accent-slate-900"
                        />
                        AI 봇 포함
                      </label>
                    )}
                    <button
                      type="button"
                      onClick={onLeaveRoom}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-md border border-slate-300 bg-white hover:bg-red-50 text-slate-600 hover:text-red-700 cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      나가기
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 py-1">
                  <span className="text-xs font-semibold text-slate-700">팀 변경:</span>
                  <button
                    type="button"
                    onClick={() => {
                      setMyTeam('red');
                      onUpdateLobby({ team: 'red' });
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold border cursor-pointer ${
                      myTeam === 'red' ? 'bg-red-600 border-red-600 text-white' : 'bg-white text-red-700 border-slate-300'
                    }`}
                  >
                    🔴 레드팀
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMyTeam('blue');
                      onUpdateLobby({ team: 'blue' });
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold border cursor-pointer ${
                      myTeam === 'blue' ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white text-blue-700 border-slate-300'
                    }`}
                  >
                    🔵 블루팀
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {multiplayer.peers.map((peer) => {
                    const charName = CHARACTER_LIST.find((c) => c.id === peer.characterId)?.name ?? peer.characterId;
                    const teamBadge =
                      peer.team === 'red' ? '🔴 [레드팀]' : peer.team === 'blue' ? '🔵 [블루팀]' : '⚔️ [FFA]';
                    return (
                      <div
                        key={peer.id}
                        className="flex items-center justify-between p-2 rounded-lg border border-slate-200 bg-slate-50"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{teamBadge}</span>
                          <span className="font-medium text-slate-900">
                            {peer.name} {peer.isHost && '(방장)'}
                          </span>
                        </div>
                        <span className="text-slate-500">{charName}</span>
                      </div>
                    );
                  })}
                </div>

                <div>
                  {multiplayer.isHost ? (
                    <button
                      type="button"
                      data-start="true"
                      onClick={onStartMultiplayer}
                      className="px-6 py-2.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-white font-display text-sm font-bold cursor-pointer whitespace-nowrap"
                    >
                      전투 시작 ({multiplayer.peers.length}명)
                    </button>
                  ) : (
                    <div className="text-xs text-slate-500">
                      방장이 시작할 때까지 대기 중입니다.
                    </div>
                  )}
                </div>
              </div>
            )
          )}
        </section>

        <footer className="pt-3 border-t border-slate-100 text-[11px] text-slate-500 leading-relaxed">
          WASD 이동 · Shift 달리기 · Space 점프 · 좌클릭(또는 J) 공격 및 3초 꾹 눌러 거미줄 제거 · 우클릭(또는 C) 방패 · F 겉날개(활공 시 HP 회복, 우클릭 시 폭죽 가속) · 1~6 / 휠 슬롯 변경 · Enter 채팅 · V / R-Shift 시점 전환
        </footer>
      </div>
    </div>
  );
}
