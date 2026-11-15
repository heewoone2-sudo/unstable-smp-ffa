import { useEffect, useState } from 'react';
import { X, Trophy, LogIn, UserPlus, LogOut, Shield } from 'lucide-react';
import {
  auth,
  fetchTopLeaderboard,
  signInWithEmailAccount,
  signInWithGoogle,
  signOutAccount,
  signUpWithEmailAccount,
  updateAccountNickname,
  type LeaderboardEntry,
  type PlayerAccountProfile,
} from '../firebase';
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

function mapAuthError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes('auth/operation-not-allowed')) {
    return '이메일/비밀번호 로그인은 Firebase Console > Authentication > Sign-in method에서 활성화가 필요합니다. Google 계정 로그인을 바로 이용하실 수 있습니다.';
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
    return '현재 도메인이 Firebase Console > Authentication > Settings > Authorized domains에 등록되지 않았습니다.';
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
      setNotice('Google 계정으로 로그인되었습니다.');
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
      setNotice(authMode === 'login' ? '로그인되었습니다.' : '회원가입이 완료되었습니다.');
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
      setNotice('닉네임이 변경되었습니다.');
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
      className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      aria-label="계정 및 랭킹"
    >
      <div className="w-full max-w-lg bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xl text-slate-900">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg">
            <button
              type="button"
              data-testid="tab-auth"
              onClick={() => setSection('auth')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-colors ${
                section === 'auth'
                  ? 'bg-white text-slate-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-950'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              {account ? '내 계정' : '로그인 / 회원가입'}
            </button>
            <button
              type="button"
              data-testid="tab-leaderboard"
              onClick={() => setSection('leaderboard')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-colors ${
                section === 'leaderboard'
                  ? 'bg-white text-slate-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-950'
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
            className="w-8 h-8 flex items-center justify-center rounded-md text-slate-500 hover:text-slate-950 hover:bg-slate-200/60 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[82vh] overflow-y-auto">
          {section === 'auth' ? (
            account ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-200">
                  <div>
                    <div className="font-display text-xl font-bold text-slate-950">{account.nickname}</div>
                    {account.email && <div className="text-xs text-slate-500">{account.email}</div>}
                  </div>
                  <div className="text-right font-mono-num text-xs font-bold text-slate-900">
                    {account.tier} · {account.elo} ELO
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-3 pb-3 border-b border-slate-200 text-center">
                  <div>
                    <div className="text-[11px] text-slate-500">링크전 승</div>
                    <div className="font-mono-num text-base font-bold text-emerald-700">{account.wins}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-500">링크전 패</div>
                    <div className="font-mono-num text-base font-bold text-red-600">{account.losses}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-500">누적 킬</div>
                    <div className="font-mono-num text-base font-bold text-slate-900">{account.kills}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-500">누적 데스</div>
                    <div className="font-mono-num text-base font-bold text-slate-600">{account.deaths}</div>
                  </div>
                </div>

                <form onSubmit={handleSaveNickname} className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-700">게임 내 닉네임 수정</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      maxLength={16}
                      value={editNickname}
                      onChange={(e) => setEditNickname(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:border-slate-900"
                    />
                    <button
                      type="submit"
                      disabled={busy}
                      className="px-4 py-2 rounded-lg bg-slate-950 hover:bg-slate-800 disabled:opacity-50 text-white font-semibold text-sm cursor-pointer"
                    >
                      저장
                    </button>
                  </div>
                </form>

                <button
                  type="button"
                  disabled={busy}
                  onClick={handleSignOut}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-red-50 text-sm text-slate-700 hover:text-red-700 cursor-pointer"
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
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-60 text-slate-900 font-semibold text-sm cursor-pointer transition-colors"
                >
                  Google 계정으로 로그인 / 가입
                </button>

                <div className="flex items-center gap-3 text-[11px] text-slate-400">
                  <div className="flex-1 h-px bg-slate-200" />
                  <span>또는 이메일 계정</span>
                  <div className="flex-1 h-px bg-slate-200" />
                </div>

                <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-lg">
                  <button
                    type="button"
                    data-testid="auth-mode-login"
                    onClick={() => {
                      setAuthMode('login');
                      setError(null);
                    }}
                    className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-semibold cursor-pointer ${
                      authMode === 'login' ? 'bg-white text-slate-950 shadow-xs' : 'text-slate-600 hover:text-slate-950'
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
                    className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-semibold cursor-pointer ${
                      authMode === 'signup' ? 'bg-white text-slate-950 shadow-xs' : 'text-slate-600 hover:text-slate-950'
                    }`}
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    회원가입
                  </button>
                </div>

                <form onSubmit={handleEmailSubmit} className="space-y-3">
                  {authMode === 'signup' && (
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">닉네임 (2~16자)</label>
                      <input
                        type="text"
                        required
                        minLength={2}
                        maxLength={16}
                        value={nickname}
                        onChange={(e) => setNickname(e.target.value)}
                        placeholder="예: UnstablePro"
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">이메일</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="player@example.com"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">비밀번호 (6자 이상)</label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={busy}
                    className="w-full py-2.5 rounded-lg bg-slate-950 hover:bg-slate-800 disabled:opacity-50 text-white font-semibold text-sm cursor-pointer"
                  >
                    {busy ? '처리 중...' : authMode === 'login' ? '로그인' : '회원가입 완료'}
                  </button>
                </form>
              </div>
            )
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>링크전 ELO 상위 12명</span>
                <span>기본 1000 ELO (승 +28 / 패 -18)</span>
              </div>
              {boardLoading ? (
                <div className="py-8 text-center text-xs text-slate-500">랭킹 데이터를 불러오는 중...</div>
              ) : board.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  아직 등록된 랭크 전적이 없습니다. 로그인 후 첫 링크전에 도전하세요.
                </div>
              ) : (
                <div className="divide-y divide-slate-200 border-y border-slate-200">
                  {board.map((row, idx) => {
                    const charName =
                      CHARACTER_LIST.find((c) => c.id === row.favoriteCharacter)?.name ?? row.favoriteCharacter;
                    const isMe = account?.uid === row.uid;
                    return (
                      <div
                        key={row.uid}
                        className={`flex items-center justify-between py-2.5 px-1 text-xs ${
                          isMe ? 'bg-slate-50 font-semibold' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="font-mono-num font-bold w-6 text-slate-500">#{idx + 1}</span>
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900 truncate">{row.nickname}</div>
                            <div className="text-[11px] text-slate-500">{charName}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="font-mono-num text-[11px] text-slate-600">
                            {row.wins}W {row.losses}L
                          </span>
                          <span className="font-mono-num text-xs font-bold text-slate-950">
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
            <div className="px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 leading-relaxed">
              {error}
            </div>
          )}
          {notice && (
            <div className="px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-700">
              {notice}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
