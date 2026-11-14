import { useEffect, useState } from 'react';
import { X, Trophy, LogIn, UserPlus, LogOut, Shield, Sparkles } from 'lucide-react';
import {
  fetchTopLeaderboard,
  signInWithEmailAccount,
  signInWithGoogle,
  signOutAccount,
  signUpWithEmailAccount,
  updateAccountNickname,
  type LeaderboardEntry,
  type PlayerAccountProfile,
  type RankTier,
} from '../firebase';
import { auth } from '../firebase';
import { CHARACTER_LIST } from '../game/characters';
import type { CharacterId } from '../game/types';

interface AuthModalProps {
  open: boolean;
  initialTab?: 'auth' | 'leaderboard';
  account: PlayerAccountProfile | null;
  selectedCharacter: CharacterId;
  onClose: () => void;
  onAccountUpdated: (profile: PlayerAccountProfile | null) => void;
}

const TIER_COLORS: Record<RankTier, string> = {
  Bronze: 'text-amber-600 border-amber-700/50 bg-amber-950/40',
  Silver: 'text-slate-200 border-slate-400/50 bg-slate-800/60',
  Gold: 'text-amber-300 border-amber-400/60 bg-amber-500/15',
  Platinum: 'text-cyan-300 border-cyan-400/60 bg-cyan-500/15',
  Diamond: 'text-sky-300 border-sky-400/70 bg-sky-500/20',
  'Unstable Master': 'text-fuchsia-300 border-fuchsia-400/75 bg-fuchsia-500/20',
};

function mapAuthError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes('auth/operation-not-allowed')) {
    return '이메일/비밀번호 로그인은 Firebase Console > Authentication > Sign-in method에서 활성화가 필요합니다. 위의 Google 계정 로그인을 바로 사용하실 수 있습니다.';
  }
  if (msg.includes('auth/invalid-credential') || msg.includes('auth/wrong-password')) {
    return '이메일 또는 비밀번호가 올바르지 않습니다.';
  }
  if (msg.includes('auth/user-not-found')) {
    return '등록되지 않은 이메일입니다. 회원가입 탭에서 계정을 생성하세요.';
  }
  if (msg.includes('auth/email-already-in-use')) {
    return '이미 가입된 이메일 주소입니다.';
  }
  if (msg.includes('auth/weak-password')) {
    return '비밀번호는 6자 이상이어야 합니다.';
  }
  if (msg.includes('auth/invalid-email')) {
    return '올바른 이메일 형식을 입력하세요.';
  }
  if (msg.includes('auth/popup-closed-by-user')) {
    return 'Google 로그인 창이 닫혔습니다.';
  }
  if (msg.includes('auth/unauthorized-domain')) {
    return '현재 접속 중인 웹 주소(도메인)가 Firebase 콘솔에 등록되지 않았습니다. Firebase Console > Authentication > Settings(설정) > Authorized domains(승인된 도메인)에 현재 주소를 추가해 주세요.';
  }
  return msg;
}

export function AuthModal({
  open,
  initialTab = 'auth',
  account,
  selectedCharacter,
  onClose,
  onAccountUpdated,
}: AuthModalProps) {
  const [section, setSection] = useState<'auth' | 'leaderboard'>(initialTab);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState(account?.nickname ?? '');
  const [editNickname, setEditNickname] = useState(account?.nickname ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [board, setBoard] = useState<LeaderboardEntry[]>([]);
  const [boardLoading, setBoardLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSection(initialTab);
    setError(null);
    setNotice(null);
    if (account) {
      setEditNickname(account.nickname);
    }
  }, [open, initialTab, account]);

  useEffect(() => {
    if (!open || section !== 'leaderboard') return;
    let active = true;
    setBoardLoading(true);
    fetchTopLeaderboard(12)
      .then((rows) => {
        if (active) setBoard(rows);
      })
      .catch((err) => {
        if (active) setError(mapAuthError(err));
      })
      .finally(() => {
        if (active) setBoardLoading(false);
      });
    return () => {
      active = false;
    };
  }, [open, section]);

  if (!open) return null;

  const handleGoogle = async () => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const profile = await signInWithGoogle(
        nickname.trim().length >= 2 ? nickname.trim() : undefined,
        selectedCharacter
      );
      onAccountUpdated(profile);
      setNotice('Google 계정으로 로그인되었습니다!');
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const profile =
        authMode === 'login'
          ? await signInWithEmailAccount(email, password)
          : await signUpWithEmailAccount(email, password, nickname || email.split('@')[0], selectedCharacter);
      onAccountUpdated(profile);
      setNotice(authMode === 'login' ? '로그인 성공!' : '회원가입 및 프로필 생성 완료!');
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleSaveNickname = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || editNickname.trim().length < 2) {
      setError('닉네임은 2자 이상 16자 이하로 입력하세요.');
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const updated = await updateAccountNickname(auth.currentUser, editNickname.trim());
      onAccountUpdated(updated);
      setNotice('닉네임이 저장되었습니다.');
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleSignOut = async () => {
    setBusy(true);
    setError(null);
    try {
      await signOutAccount();
      onAccountUpdated(null);
      setNotice('로그아웃되었습니다.');
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-[#060810]/85 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="계정 및 랭킹"
    >
      <div className="w-full max-w-lg bg-[#111524] border border-white/15 rounded-xl overflow-hidden shadow-2xl">
        {/* Header Tabs */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-[#0d101c]">
          <div className="flex items-center gap-2">
            <button
              type="button"
              data-testid="tab-auth"
              onClick={() => setSection('auth')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-display font-bold cursor-pointer transition-colors ${
                section === 'auth'
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-[#191f36] text-slate-300 hover:text-white'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              {account ? '내 계정' : '로그인 / 회원가입'}
            </button>
            <button
              type="button"
              data-testid="tab-leaderboard"
              onClick={() => setSection('leaderboard')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-display font-bold cursor-pointer transition-colors ${
                section === 'leaderboard'
                  ? 'bg-purple-500 text-white'
                  : 'bg-[#191f36] text-slate-300 hover:text-white'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              랭크 리더보드
            </button>
          </div>
          <button
            type="button"
            aria-label="닫기"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[82vh] overflow-y-auto">
          {section === 'auth' ? (
            account ? (
              <div className="space-y-4">
                <div className="bg-[#171c30] border border-white/10 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="font-display text-xl font-bold text-white">{account.nickname}</div>
                      {account.email && (
                        <div className="text-xs text-slate-400">{account.email}</div>
                      )}
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded border text-xs font-display font-bold ${
                        TIER_COLORS[account.tier]
                      }`}
                    >
                      {account.tier} · {account.elo} ELO
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-2 pt-1">
                    <div className="bg-[#0f1322] rounded p-2 text-center border border-white/5">
                      <div className="text-[10px] text-slate-400">링크전 승</div>
                      <div className="font-mono-num text-sm font-bold text-emerald-300">{account.wins}</div>
                    </div>
                    <div className="bg-[#0f1322] rounded p-2 text-center border border-white/5">
                      <div className="text-[10px] text-slate-400">링크전 패</div>
                      <div className="font-mono-num text-sm font-bold text-rose-300">{account.losses}</div>
                    </div>
                    <div className="bg-[#0f1322] rounded p-2 text-center border border-white/5">
                      <div className="text-[10px] text-slate-400">누적 킬</div>
                      <div className="font-mono-num text-sm font-bold text-white">{account.kills}</div>
                    </div>
                    <div className="bg-[#0f1322] rounded p-2 text-center border border-white/5">
                      <div className="text-[10px] text-slate-400">누적 데스</div>
                      <div className="font-mono-num text-sm font-bold text-slate-300">{account.deaths}</div>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleSaveNickname} className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-300">게임 내 닉네임 수정</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      maxLength={16}
                      value={editNickname}
                      onChange={(e) => setEditNickname(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-md bg-[#0b0e19] border border-white/15 text-sm text-white focus:outline-none focus:border-amber-400"
                    />
                    <button
                      type="submit"
                      disabled={busy}
                      className="px-4 py-2 rounded-md bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-display font-bold text-sm cursor-pointer"
                    >
                      저장
                    </button>
                  </div>
                </form>

                <button
                  type="button"
                  disabled={busy}
                  onClick={handleSignOut}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#191f36] hover:bg-red-500/20 border border-white/15 text-sm text-slate-200 hover:text-red-200 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  로그아웃
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <button
                  type="button"
                  data-testid="google-signin-btn"
                  disabled={busy}
                  onClick={handleGoogle}
                  className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-lg bg-white hover:bg-slate-100 disabled:opacity-60 text-slate-900 font-display font-bold text-sm cursor-pointer transition-colors"
                >
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  Google 계정으로 원클릭 로그인 / 가입
                </button>

                <div className="flex items-center gap-3 text-[11px] text-slate-500">
                  <div className="flex-1 h-px bg-white/10" />
                  <span>또는 이메일 계정</span>
                  <div className="flex-1 h-px bg-white/10" />
                </div>

                <div className="grid grid-cols-2 gap-1.5 bg-[#0c0f1b] p-1 rounded-lg border border-white/10">
                  <button
                    type="button"
                    data-testid="auth-mode-login"
                    onClick={() => {
                      setAuthMode('login');
                      setError(null);
                    }}
                    className={`flex items-center justify-center gap-1.5 py-1.5 rounded text-xs font-display font-bold cursor-pointer ${
                      authMode === 'login'
                        ? 'bg-[#212744] text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    로그인
                  </button>
                  <button
                    type="button"
                    data-testid="auth-mode-signup"
                    onClick={() => {
                      setAuthMode('signup');
                      setError(null);
                    }}
                    className={`flex items-center justify-center gap-1.5 py-1.5 rounded text-xs font-display font-bold cursor-pointer ${
                      authMode === 'signup'
                        ? 'bg-[#212744] text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    회원가입
                  </button>
                </div>

                <form onSubmit={handleEmailSubmit} className="space-y-2.5">
                  {authMode === 'signup' && (
                    <div>
                      <label className="block text-xs text-slate-300 mb-1">닉네임 (2~16자)</label>
                      <input
                        type="text"
                        required
                        minLength={2}
                        maxLength={16}
                        value={nickname}
                        onChange={(e) => setNickname(e.target.value)}
                        placeholder="예: UnstablePro"
                        className="w-full px-3 py-2 rounded-md bg-[#0b0e19] border border-white/15 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-xs text-slate-300 mb-1">이메일</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="player@example.com"
                      className="w-full px-3 py-2 rounded-md bg-[#0b0e19] border border-white/15 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-300 mb-1">비밀번호 (6자 이상)</label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••"
                      className="w-full px-3 py-2 rounded-md bg-[#0b0e19] border border-white/15 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={busy}
                    className="w-full py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-display font-bold text-sm cursor-pointer"
                  >
                    {busy ? '처리 중...' : authMode === 'login' ? '이메일로 로그인' : '회원가입 완료'}
                  </button>
                </form>
              </div>
            )
          ) : (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>링크전 ELO 상위 12명</span>
                <span>기본 1000 ELO (승 +28 / 패 -18)</span>
              </div>
              {boardLoading ? (
                <div className="py-8 text-center text-xs text-slate-400">랭킹 데이터를 불러오는 중...</div>
              ) : board.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  아직 등록된 랭크 전적이 없습니다. 로그인 후 첫 링크전에 도전하세요!
                </div>
              ) : (
                <div className="space-y-1.5">
                  {board.map((row, idx) => {
                    const charName =
                      CHARACTER_LIST.find((c) => c.id === row.favoriteCharacter)?.name ?? row.favoriteCharacter;
                    const isMe = account?.uid === row.uid;
                    return (
                      <div
                        key={row.uid}
                        className={`flex items-center justify-between px-3 py-2 rounded-lg border text-xs ${
                          isMe
                            ? 'bg-purple-500/15 border-purple-400/50 text-white'
                            : 'bg-[#161b2e] border-white/10 text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="font-mono-num font-bold w-5 text-amber-300">#{idx + 1}</span>
                          <div className="min-w-0">
                            <div className="font-bold truncate">{row.nickname}</div>
                            <div className="text-[11px] text-slate-400">{charName}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="font-mono-num text-[11px] text-slate-300">
                            {row.wins}W {row.losses}L
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded border text-[11px] font-display font-bold ${
                              TIER_COLORS[row.tier]
                            }`}
                          >
                            {row.elo}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="px-3 py-2 rounded-md bg-red-500/15 border border-red-400/40 text-xs text-red-200 leading-relaxed">
              {error}
            </div>
          )}
          {notice && (
            <div className="px-3 py-2 rounded-md bg-emerald-500/15 border border-emerald-400/40 text-xs text-emerald-200">
              {notice}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
