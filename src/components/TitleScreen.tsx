import { useEffect, useState } from 'react';
import {
  Copy,
  Check,
  Users,
  LogOut,
  Crown,
  Globe,
  Swords,
  Trophy,
  UserCheck,
  LogIn,
} from 'lucide-react';
import type { PlayerAccountProfile } from '../firebase';
import { CHARACTER_LIST, GAME_MODES } from '../game/characters';
import type { CharacterId, GameModeId, MultiplayerHudState } from '../game/types';
import { UnstableCrest, WeaponIcon } from './WeaponIcons';

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
  onCreateRoom: (name: string, includeBots: boolean) => void;
  onJoinRoom: (code: string, name: string) => void;
  onUpdateLobby: (updates: { name?: string; includeBots?: boolean }) => void;
  onStartMultiplayer: () => void;
  onLeaveRoom: () => void;
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
}: TitleScreenProps) {
  const activeChar = CHARACTER_LIST.find((c) => c.id === selectedCharacter) ?? CHARACTER_LIST[0];
  const [nickname, setNickname] = useState(account?.nickname || multiplayer.playerName || 'Player');
  const [joinCode, setJoinCode] = useState(initialRoomCode);
  const [linkCodeInput, setLinkCodeInput] = useState(initialLinkCode);
  const [includeBots, setIncludeBots] = useState(multiplayer.includeBots);
  const [copied, setCopied] = useState(false);
  const [globalOnlineCount, setGlobalOnlineCount] = useState<number>(0);

  useEffect(() => {
    if (account?.nickname) {
      setNickname(account.nickname);
    }
  }, [account?.nickname]);

  useEffect(() => {
    let active = true;
    const pollHealth = () => {
      fetch('/api/health')
        .then((r) => (r.ok ? r.json() : null))
        .then((data: { globalPlayers?: number } | null) => {
          if (active && data && typeof data.globalPlayers === 'number') {
            setGlobalOnlineCount(data.globalPlayers);
          }
        })
        .catch(() => {});
    };
    pollHealth();
    const timer = window.setInterval(pollHealth, 5000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

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

  const resolvedName = nickname.trim() || account?.nickname || 'Player';

  return (
    <div className="fixed inset-0 z-20 flex flex-col justify-between p-5 md:p-7 pointer-events-none bg-gradient-to-r from-[#090b13]/94 via-[#090b13]/75 to-transparent overflow-y-auto">
      <div className="max-w-3xl my-auto space-y-3.5 pointer-events-auto">
        {/* Top Header + Account & Leaderboard Strip */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <UnstableCrest className="w-11 h-11 shrink-0" />
            <div>
              <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight text-white leading-none">
                UNSTABLE SMP FFA
              </h1>
              <p className="text-xs text-slate-300 mt-1">
                216m 오픈월드 · 0초 쿨타임 검 · 링크전 1v1 랭크 &amp; 실시간 PvP
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              data-testid="open-leaderboard-btn"
              onClick={() => onOpenAuth('leaderboard')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#14192b] hover:bg-[#1e2540] border border-purple-400/35 text-xs font-display font-bold text-purple-200 cursor-pointer"
            >
              <Trophy className="w-3.5 h-3.5 text-amber-300" />
              랭킹
            </button>

            {account ? (
              <button
                type="button"
                data-testid="open-account-btn"
                onClick={() => onOpenAuth('auth')}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#181d33] hover:bg-[#222947] border border-amber-400/50 text-xs text-white cursor-pointer"
              >
                <UserCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="font-display font-bold">{account.nickname}</span>
                <span className="font-mono-num text-[11px] text-amber-300">
                  {account.tier} ({account.elo})
                </span>
              </button>
            ) : (
              <button
                type="button"
                data-testid="open-auth-btn"
                onClick={() => onOpenAuth('auth')}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold text-xs cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                로그인 / 회원가입
              </button>
            )}
          </div>
        </div>

        {/* Mode Selector (4 Modes: Online Open World [default], Link Duel, Solo FFA, Friend Private) */}
        <section aria-label="게임 모드 선택" className="space-y-1.5">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold tracking-wider text-slate-400">전투 모드</h2>
            <span className="text-[11px] text-emerald-300 font-medium flex items-center gap-1">
              <Globe className="w-3 h-3" />
              오픈월드 접속 중: {globalOnlineCount}명
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {GAME_MODES.map((m) => {
              const active = m.id === selectedMode;
              return (
                <button
                  key={m.id}
                  type="button"
                  data-mode-id={m.id}
                  onClick={() => onSelectMode(m.id)}
                  className={`text-left px-3 py-2 rounded-lg border transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#1e1b38] border-amber-400 text-white'
                      : 'bg-[#121524]/90 border-white/10 text-slate-300 hover:border-white/25 hover:text-white'
                  }`}
                >
                  <div className="font-display text-sm font-bold whitespace-nowrap">{m.label}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">{m.subtitle}</div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Character Selector (9 Playable Creators) */}
        <section aria-label="캐릭터 선택" className="space-y-1.5">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-xs font-semibold tracking-wider text-slate-400">
              캐릭터 로드아웃 (9인)
            </h2>
            <span className="text-xs text-amber-300 font-medium truncate">
              {activeChar.signatureLabel}
            </span>
          </div>
          <div className="grid grid-cols-3 md:grid-cols-5 gap-1.5">
            {CHARACTER_LIST.map((c) => {
              const active = c.id === selectedCharacter;
              return (
                <button
                  key={c.id}
                  type="button"
                  data-char-id={c.id}
                  onClick={() => onSelectCharacter(c.id)}
                  className={`flex flex-col items-start px-2.5 py-2 rounded-lg border transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#1a1d30] border-purple-400 text-white'
                      : 'bg-[#121524]/90 border-white/10 text-slate-300 hover:border-white/25'
                  }`}
                >
                  <div className="flex items-center gap-1.5 w-full">
                    <span
                      className="w-2.5 h-2.5 rounded-xs shrink-0 border border-black/40"
                      style={{ backgroundColor: c.trimColor }}
                    />
                    <span className="font-display text-xs font-bold whitespace-nowrap">{c.name}</span>
                  </div>
                  <span className="text-[11px] text-slate-400 mt-0.5 whitespace-nowrap">{c.role}</span>
                </button>
              );
            })}
          </div>

          {/* Selected Character 6-Slot Loadout Preview */}
          <div className="bg-[#121524]/92 border border-white/10 rounded-lg px-3 py-2 space-y-1.5">
            <p className="text-xs text-slate-300">
              <strong className="text-white">{activeChar.name}</strong> — {activeChar.titleKr} ({activeChar.summary})
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {activeChar.loadout.map((item, idx) => {
                const maxC = item.maxCharges ?? 1;
                return (
                  <div
                    key={`${activeChar.id}-${item.id}-${idx}`}
                    className="flex items-center gap-1.5 bg-[#191d30] border border-white/10 rounded px-2.5 py-1"
                  >
                    <WeaponIcon id={item.id} className="w-4 h-4 shrink-0" />
                    <span className="text-[11px] text-slate-200 whitespace-nowrap">
                      {idx + 1}. {item.name}
                    </span>
                    {maxC > 1 && (
                      <span className="ml-auto font-mono-num text-[10px] font-bold text-amber-300 shrink-0">
                        x{maxC}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Mode-Specific Action Panel */}
        {selectedMode === 'online_world' && (
          <div className="bg-[#121524]/95 border border-amber-400/35 rounded-lg p-3.5 space-y-2.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <input
                type="text"
                maxLength={16}
                value={nickname}
                onChange={(e) => handleNicknameChange(e.target.value)}
                placeholder="오픈월드 닉네임"
                aria-label="플레이어 닉네임"
                className="w-44 px-3 py-2.5 rounded-lg bg-[#0b0e19] border border-white/15 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
              />
              <button
                type="button"
                data-start="true"
                onClick={onStart}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-display text-base font-bold tracking-wide transition-colors cursor-pointer whitespace-nowrap"
              >
                <Globe className="w-4 h-4" />
                {multiplayer.status === 'connecting' ? '월드 접속 중...' : '글로벌 오픈월드 입장'}
              </button>
              <span className="text-xs text-slate-400">단일 216m 월드 · 난입형 무제한 PvP</span>
            </div>
            {multiplayer.error && (
              <p className="text-xs text-red-400 font-medium">{multiplayer.error}</p>
            )}
          </div>
        )}

        {selectedMode === 'ffa' && (
          <div className="flex items-center gap-4 pt-0.5">
            <button
              type="button"
              data-start="true"
              onClick={onStart}
              className="px-7 py-3 rounded-lg bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-display text-lg font-bold tracking-wide transition-colors cursor-pointer whitespace-nowrap"
            >
              솔로 연습 시작
            </button>
            <span className="text-xs text-slate-400">Enter 또는 Space로 즉시 출격 (216m 오픈월드)</span>
          </div>
        )}

        {selectedMode === 'link_duel' && (
          !multiplayer.roomCode || multiplayer.roomKind !== 'link_duel' ? (
            <div className="bg-[#121524]/95 border border-purple-400/35 rounded-lg p-3.5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-display font-bold text-purple-300">
                  <Swords className="w-4 h-4" />
                  1v1 링크전 (3선승 · ELO 랭크 반영)
                </div>
                {!account && (
                  <button
                    type="button"
                    onClick={() => onOpenAuth('auth')}
                    className="text-[11px] text-amber-300 hover:underline cursor-pointer"
                  >
                    로그인 시 전적/티어 저장 →
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
                <input
                  type="text"
                  maxLength={16}
                  value={nickname}
                  onChange={(e) => handleNicknameChange(e.target.value)}
                  placeholder="도전자 닉네임"
                  aria-label="링크전 닉네임"
                  className="md:col-span-3 px-3 py-2 rounded-md bg-[#0b0e19] border border-white/15 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-400"
                />

                {multiplayer.linkQueueing ? (
                  <button
                    type="button"
                    data-testid="cancel-link-queue-btn"
                    onClick={onCancelLinkQueue}
                    className="md:col-span-3 px-3 py-2 rounded-md bg-rose-500 hover:bg-rose-400 text-white font-display font-bold text-xs cursor-pointer whitespace-nowrap"
                  >
                    매칭 대기 취소...
                  </button>
                ) : (
                  <button
                    type="button"
                    data-testid="queue-link-duel-btn"
                    onClick={() => onQueueLinkDuel(resolvedName)}
                    className="md:col-span-3 px-3 py-2 rounded-md bg-purple-500 hover:bg-purple-400 text-white font-display font-bold text-xs cursor-pointer whitespace-nowrap"
                  >
                    1v1 즉시 매칭
                  </button>
                )}

                <button
                  type="button"
                  data-testid="create-link-duel-btn"
                  onClick={() => onCreateLinkDuel(resolvedName)}
                  className="md:col-span-3 px-3 py-2 rounded-md bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-display font-bold text-xs cursor-pointer whitespace-nowrap"
                >
                  초대 링크 생성
                </button>

                <div className="md:col-span-3 flex items-center gap-1.5">
                  <input
                    type="text"
                    maxLength={4}
                    value={linkCodeInput}
                    onChange={(e) =>
                      setLinkCodeInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))
                    }
                    placeholder="링크코드"
                    aria-label="링크전 코드"
                    className="flex-1 min-w-0 px-2.5 py-2 rounded-md bg-[#0b0e19] border border-white/15 font-mono-num uppercase text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-400"
                  />
                  <button
                    type="button"
                    data-testid="join-link-duel-btn"
                    disabled={linkCodeInput.trim().length < 4}
                    onClick={() => onJoinLinkDuel(linkCodeInput.trim(), resolvedName)}
                    className="px-3 py-2 rounded-md bg-sky-500 hover:bg-sky-400 disabled:opacity-45 text-slate-950 font-display font-bold text-xs cursor-pointer whitespace-nowrap"
                  >
                    도전
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                <button
                  type="button"
                  data-start="true"
                  onClick={onStart}
                  className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-display text-sm font-bold cursor-pointer whitespace-nowrap"
                >
                  랭크 AI 1v1 즉시 대결 (3선승)
                </button>
                <span className="text-[11px] text-slate-400">
                  상대가 없을 때도 AI 챌린저와 3선승 랭크 연습 가능
                </span>
              </div>

              {multiplayer.error && (
                <p className="text-xs text-red-400 font-medium">{multiplayer.error}</p>
              )}
            </div>
          ) : (
            <div className="bg-[#121524]/95 border border-purple-400/50 rounded-lg p-3.5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="text-xs text-slate-400">링크전 코드</span>
                  <span
                    data-testid="link-code-badge"
                    className="px-2.5 py-0.5 rounded bg-purple-500/20 border border-purple-400/50 font-mono-num text-base font-bold text-purple-200 tracking-widest"
                  >
                    {multiplayer.roomCode}
                  </span>
                  <button
                    type="button"
                    data-testid="copy-link-invite-btn"
                    onClick={() => handleCopyInvite('link_duel')}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#1a1f34] hover:bg-[#242b47] border border-white/15 text-xs text-slate-200 cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? '링크전 URL 복사됨!' : '1v1 초대 링크 복사'}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={onLeaveRoom}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#1b2036] hover:bg-red-500/20 border border-white/15 text-xs text-slate-300 hover:text-red-200 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  나가기
                </button>
              </div>
              <div className="flex items-center gap-2 text-xs">
                {multiplayer.peers.map((peer) => (
                  <div
                    key={peer.id}
                    className="px-2.5 py-1 rounded bg-[#191d30] border border-white/15 text-white font-medium"
                  >
                    {peer.name} ({CHARACTER_LIST.find((c) => c.id === peer.characterId)?.name ?? peer.characterId})
                  </div>
                ))}
                {multiplayer.peers.length < 2 && (
                  <span className="text-amber-300">도전자가 링크로 접속하면 자동으로 1v1 결투가 시작됩니다...</span>
                )}
              </div>
            </div>
          )
        )}

        {selectedMode === 'multiplayer' && (
          !multiplayer.roomCode || multiplayer.roomKind !== 'private' ? (
            <div className="bg-[#121524]/95 border border-emerald-400/30 rounded-lg p-3.5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-display font-bold text-emerald-300">
                  <Users className="w-4 h-4" />
                  친구 비공개 방
                </div>
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeBots}
                    onChange={(e) => setIncludeBots(e.target.checked)}
                    className="accent-amber-400"
                  />
                  빈 자리에 AI 봇 추가
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
                <input
                  type="text"
                  maxLength={16}
                  value={nickname}
                  onChange={(e) => handleNicknameChange(e.target.value)}
                  placeholder="닉네임 (예: WemmbuFan)"
                  aria-label="플레이어 닉네임"
                  className="md:col-span-4 px-3 py-2 rounded-md bg-[#0b0e19] border border-white/15 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                />

                <button
                  type="button"
                  data-testid="create-room-btn"
                  onClick={() => onCreateRoom(resolvedName, includeBots)}
                  className="md:col-span-3 px-4 py-2 rounded-md bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-display font-bold text-sm cursor-pointer whitespace-nowrap"
                >
                  {multiplayer.status === 'connecting' ? '연결 중...' : '방 만들기'}
                </button>

                <div className="md:col-span-5 flex items-center gap-1.5">
                  <input
                    type="text"
                    maxLength={4}
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                    placeholder="방 코드 4자리"
                    aria-label="참가할 방 코드"
                    className="flex-1 min-w-0 px-3 py-2 rounded-md bg-[#0b0e19] border border-white/15 font-mono-num uppercase text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-400"
                  />
                  <button
                    type="button"
                    data-testid="join-room-btn"
                    onClick={() => {
                      if (joinCode.trim().length >= 4) {
                        onJoinRoom(joinCode.trim().toUpperCase(), resolvedName);
                      }
                    }}
                    disabled={joinCode.trim().length < 4}
                    className="px-4 py-2 rounded-md bg-sky-500 hover:bg-sky-400 disabled:opacity-45 disabled:cursor-not-allowed text-slate-950 font-display font-bold text-sm cursor-pointer whitespace-nowrap"
                  >
                    참가
                  </button>
                </div>
              </div>

              {multiplayer.error && (
                <p className="text-xs text-red-400 font-medium">{multiplayer.error}</p>
              )}
            </div>
          ) : (
            <div className="bg-[#121524]/95 border border-emerald-400/40 rounded-lg p-3.5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="text-xs text-slate-400">방 코드</span>
                  <span
                    data-testid="room-code-badge"
                    className="px-2.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-400/50 font-mono-num text-base font-bold text-emerald-300 tracking-widest"
                  >
                    {multiplayer.roomCode}
                  </span>
                  <button
                    type="button"
                    data-testid="copy-invite-btn"
                    onClick={() => handleCopyInvite('private')}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#1a1f34] hover:bg-[#242b47] border border-white/15 text-xs text-slate-200 cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? '초대 링크 복사됨!' : '초대 링크 복사'}
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  {multiplayer.isHost && (
                    <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={multiplayer.includeBots}
                        onChange={(e) => onUpdateLobby({ includeBots: e.target.checked })}
                        className="accent-amber-400"
                      />
                      AI 봇 포함
                    </label>
                  )}
                  <button
                    type="button"
                    onClick={onLeaveRoom}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#1b2036] hover:bg-red-500/20 border border-white/15 text-xs text-slate-300 hover:text-red-200 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    나가기
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {multiplayer.peers.map((peer) => {
                  const charName = CHARACTER_LIST.find((c) => c.id === peer.characterId)?.name ?? peer.characterId;
                  const isSelf = peer.id === multiplayer.selfId;
                  return (
                    <div
                      key={peer.id}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs ${
                        isSelf
                          ? 'bg-purple-500/20 border-purple-400/50 text-white'
                          : 'bg-[#191d30] border-white/10 text-slate-300'
                      }`}
                    >
                      {peer.isHost && <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                      <span className="font-semibold">{peer.name}</span>
                      <span className="text-slate-400">({charName})</span>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center gap-3">
                {multiplayer.isHost ? (
                  <button
                    type="button"
                    data-start="true"
                    onClick={onStartMultiplayer}
                    className="px-6 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-display text-base font-bold cursor-pointer whitespace-nowrap"
                  >
                    멀티플레이 전투 시작 ({multiplayer.peers.length}명)
                  </button>
                ) : (
                  <div className="text-xs text-amber-300 font-medium">
                    방장이 전투를 시작하길 기다리는 중... (캐릭터를 자유롭게 변경할 수 있습니다)
                  </div>
                )}
              </div>
            </div>
          )
        )}
      </div>

      <div className="text-xs text-slate-400 hud-text-stroke pt-3">
        WASD 이동 · L-Shift 달리기 · Space 점프 · 좌클릭(또는 J) 공격/설치 · 우클릭(또는 C) 방패 · 1~6 또는 마우스 휠 인벤토리 · F 겉날개 · Right Shift / V 시점 전환(3인칭/1인칭/자유)
      </div>
    </div>
  );
}

