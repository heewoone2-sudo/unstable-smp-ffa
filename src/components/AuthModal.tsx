import { useEffect, useState } from 'react';
import { X, Trophy, LogIn, UserPlus, LogOut, Shield, Users, Search, Send, Check, Trash2 } from 'lucide-react';
import {
  auth,
  fetchTopLeaderboard,
  removeFriendRequest,
  respondFriendRequest,
  searchPlayerByNickname,
  sendFriendRequest,
  sendRoomInvite,
  signInWithEmailAccount,
  signInWithGoogle,
  signOutAccount,
  signUpWithEmailAccount,
  subscribeFriendData,
  updateAccountNickname,
  updateRoomInviteStatus,
  type FriendRequestRecord,
  type LeaderboardEntry,
  type PlayerAccountProfile,
  type RoomInviteRecord,
} from '../firebase';
import { CHARACTER_LIST } from '../game/characters';
import type { CharacterId, MultiplayerHudState } from '../game/types';

interface AuthModalProps {
  open: boolean;
  initialTab?: 'auth' | 'leaderboard' | 'friends';
  account: PlayerAccountProfile | null;
  selectedCharacter: CharacterId;
  multiplayer?: MultiplayerHudState;
  onJoinRoomFromInvite?: (roomCode: string, roomMode: 'ffa' | 'team') => void;
  onJoinLinkFromInvite?: (roomCode: string) => void;
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
  multiplayer,
  onJoinRoomFromInvite,
  onJoinLinkFromInvite,
  onClose,
  onAccountUpdated,
}: AuthModalProps) {
  const [section, setSection] = useState<'auth' | 'leaderboard' | 'friends'>(initialTab);
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

  const [friendKeyword, setFriendKeyword] = useState('');
  const [searchResults, setSearchResults] = useState<LeaderboardEntry[]>([]);
  const [searching, setSearching] = useState(false);
  const [friendRequests, setFriendRequests] = useState<FriendRequestRecord[]>([]);
  const [roomInvites, setRoomInvites] = useState<RoomInviteRecord[]>([]);

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

  useEffect(() => {
    if (!open || !account?.uid) {
      setFriendRequests([]);
      setRoomInvites([]);
      return;
    }
    const unsub = subscribeFriendData(account.uid, (data) => {
      setFriendRequests(data.friendRequests);
      setRoomInvites(data.roomInvites);
    });
    return () => unsub();
  }, [open, account?.uid]);

  useEffect(() => {
    if (!open || section !== 'friends' || !account?.uid) return;
    let active = true;
    setSearching(true);
    searchPlayerByNickname('', account.uid)
      .then((rows) => {
        if (active) setSearchResults(rows);
      })
      .catch((err) => {
        if (active) setError(mapAuthError(err));
      })
      .finally(() => {
        if (active) setSearching(false);
      });
    return () => {
      active = false;
    };
  }, [open, section, account?.uid]);

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

  const handleSearchFriends = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account) return;
    setSearching(true);
    setError(null);
    try {
      const rows = await searchPlayerByNickname(friendKeyword, account.uid);
      setSearchResults(rows);
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setSearching(false);
    }
  };

  const handleSendFriendRequest = async (target: LeaderboardEntry) => {
    if (!account) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    const existingDeclined = friendRequests.some(
      (r) =>
        r.status === 'declined' &&
        ((r.fromUid === account.uid && r.toUid === target.uid) ||
          (r.toUid === account.uid && r.fromUid === target.uid))
    );
    try {
      await sendFriendRequest(account, target, existingDeclined);
      setNotice(`${target.nickname}님에게 친구 요청을 보냈습니다.`);
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleRespondFriend = async (req: FriendRequestRecord, status: 'accepted' | 'declined') => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await respondFriendRequest(req.id, status);
      setNotice(
        status === 'accepted'
          ? `${req.fromNickname}님과 친구가 되었습니다.`
          : `${req.fromNickname}님의 요청을 거절했습니다.`
      );
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleRemoveFriend = async (req: FriendRequestRecord, label: string) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await removeFriendRequest(req.id);
      setNotice(`${label} 완료되었습니다.`);
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleInviteToRoom = async (friendUid: string, friendNick: string) => {
    if (!account || !multiplayer?.roomCode) return;
    if (multiplayer.roomKind !== 'private' && multiplayer.roomKind !== 'link_duel') return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await sendRoomInvite({
        from: account,
        toUid: friendUid,
        toNickname: friendNick,
        roomCode: multiplayer.roomCode,
        roomKind: multiplayer.roomKind,
        roomMode: multiplayer.roomMode ?? 'ffa',
      });
      setNotice(`${friendNick}님에게 방(${multiplayer.roomCode}) 초대를 보냈습니다.`);
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleAcceptInvite = async (inv: RoomInviteRecord) => {
    setBusy(true);
    setError(null);
    try {
      await updateRoomInviteStatus(inv.id, 'accepted');
      if (inv.roomKind === 'link_duel') {
        onJoinLinkFromInvite?.(inv.roomCode);
      } else {
        onJoinRoomFromInvite?.(inv.roomCode, inv.roomMode);
      }
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleDeclineInvite = async (inv: RoomInviteRecord) => {
    setBusy(true);
    setError(null);
    try {
      await updateRoomInviteStatus(inv.id, 'declined');
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  const incomingPendingRequests = friendRequests.filter(
    (r) => account && r.toUid === account.uid && r.status === 'pending'
  );
  const outgoingPendingRequests = friendRequests.filter(
    (r) => account && r.fromUid === account.uid && r.status === 'pending'
  );
  const acceptedFriends = friendRequests.filter((r) => r.status === 'accepted');
  const incomingPendingInvites = roomInvites.filter(
    (inv) => account && inv.toUid === account.uid && inv.status === 'pending'
  );
  const canInviteFriends =
    Boolean(multiplayer?.roomCode) &&
    (multiplayer?.roomKind === 'private' || multiplayer?.roomKind === 'link_duel');

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/55 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="계정, 친구 및 랭킹"
    >
      <div className="w-full max-w-3xl bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xl text-slate-900">
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-slate-200 bg-slate-50 gap-2">
          <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg">
            <button
              type="button"
              data-testid="tab-auth"
              onClick={() => setSection('auth')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap ${
                section === 'auth'
                  ? 'bg-white text-slate-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-950'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              {account ? '내 계정' : '로그인'}
            </button>
            <button
              type="button"
              data-testid="tab-friends"
              onClick={() => setSection('friends')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap ${
                section === 'friends'
                  ? 'bg-white text-slate-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-950'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              친구
              {(incomingPendingRequests.length + incomingPendingInvites.length > 0) && (
                <span className="px-1.5 py-0.2 rounded-full bg-red-600 text-white font-mono-num text-[10px]">
                  {incomingPendingRequests.length + incomingPendingInvites.length}
                </span>
              )}
            </button>
            <button
              type="button"
              data-testid="tab-leaderboard"
              onClick={() => setSection('leaderboard')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap ${
                section === 'leaderboard'
                  ? 'bg-white text-slate-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-950'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              랭킹
            </button>
          </div>
          <button
            type="button"
            aria-label="닫기"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-md text-slate-500 hover:text-slate-950 hover:bg-slate-200/60 cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-3">
          {section === 'auth' ? (
            account ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                <div className="space-y-3 bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-200">
                    <div className="min-w-0">
                      <div className="font-display text-xl font-bold text-slate-950 truncate">{account.nickname}</div>
                      {account.email && <div className="text-xs text-slate-500 truncate">{account.email}</div>}
                    </div>
                    <div className="text-right font-mono-num text-xs font-bold text-slate-900 shrink-0">
                      {account.tier} · {account.elo} ELO
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2 text-center pt-1">
                    <div className="bg-white border border-slate-200 rounded-lg py-2 px-1">
                      <div className="text-[10px] text-slate-500">링크전 승</div>
                      <div className="font-mono-num text-base font-bold text-emerald-700">{account.wins}</div>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-lg py-2 px-1">
                      <div className="text-[10px] text-slate-500">링크전 패</div>
                      <div className="font-mono-num text-base font-bold text-red-600">{account.losses}</div>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-lg py-2 px-1">
                      <div className="text-[10px] text-slate-500">누적 킬</div>
                      <div className="font-mono-num text-base font-bold text-slate-900">{account.kills}</div>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-lg py-2 px-1">
                      <div className="text-[10px] text-slate-500">누적 데스</div>
                      <div className="font-mono-num text-base font-bold text-slate-600">{account.deaths}</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <form onSubmit={handleSaveNickname} className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-700">게임 내 닉네임 수정</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        maxLength={16}
                        value={editNickname}
                        onChange={(e) => setEditNickname(e.target.value)}
                        className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:border-slate-900"
                      />
                      <button
                        type="submit"
                        disabled={busy}
                        className="px-4 py-2 rounded-lg bg-slate-950 hover:bg-slate-800 disabled:opacity-50 text-white font-semibold text-sm cursor-pointer shrink-0"
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
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-[1fr_1.25fr] gap-4 items-center">
                <div className="space-y-3 bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <div className="space-y-1">
                    <div className="font-display text-sm font-black text-slate-900">간편 로그인 &amp; 전적 연동</div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Google 계정으로 바로 로그인하거나 이메일 계정으로 친구 추가, 사설방 초대, 랭크 ELO 기록을 연동하세요.
                    </p>
                  </div>
                  <button
                    type="button"
                    data-testid="google-signin-btn"
                    disabled={busy}
                    onClick={handleGoogle}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-60 text-slate-900 font-semibold text-sm cursor-pointer transition-colors"
                  >
                    Google 계정으로 로그인 / 가입
                  </button>
                </div>

                <div className="space-y-3 bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <div className="grid grid-cols-2 gap-1 bg-slate-200/70 p-1 rounded-lg">
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

                  <form onSubmit={handleEmailSubmit} className="space-y-2.5">
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
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900"
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
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900"
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
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={busy}
                      className="w-full py-2 rounded-lg bg-slate-950 hover:bg-slate-800 disabled:opacity-50 text-white font-semibold text-sm cursor-pointer"
                    >
                      {busy ? '처리 중...' : authMode === 'login' ? '로그인' : '회원가입 완료'}
                    </button>
                  </form>
                </div>
              </div>
            )
          ) : section === 'friends' ? (
            !account ? (
              <div className="py-8 text-center space-y-3">
                <p className="text-xs text-slate-600">
                  친구 추가 및 사설방 초대 기능은 로그인 후 이용하실 수 있습니다.
                </p>
                <button
                  type="button"
                  onClick={() => setSection('auth')}
                  className="px-4 py-2 rounded-lg bg-slate-950 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer"
                >
                  로그인 / 회원가입으로 이동
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                {/* Left Column: Invites, Friend Requests & My Friends */}
                <div className="space-y-3">
                  {incomingPendingInvites.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="text-xs font-bold text-slate-800">
                        받은 방 초대 ({incomingPendingInvites.length})
                      </div>
                      <div className="space-y-1">
                        {incomingPendingInvites.slice(0, 3).map((inv) => (
                          <div
                            key={inv.id}
                            className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border border-amber-300 bg-amber-50 text-xs"
                          >
                            <div className="min-w-0 truncate">
                              <span className="font-bold text-slate-900">{inv.fromNickname}</span>
                              <span className="text-slate-600">
                                {' '}· {inv.roomKind === 'link_duel' ? '1v1 링크전' : inv.roomMode === 'team' ? '팀전' : '개인전'} ({inv.roomCode})
                              </span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => handleAcceptInvite(inv)}
                                className="px-2 py-0.5 rounded bg-slate-950 text-white font-semibold cursor-pointer"
                              >
                                참가
                              </button>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => handleDeclineInvite(inv)}
                                className="px-2 py-0.5 rounded border border-slate-300 bg-white text-slate-600 cursor-pointer"
                              >
                                거절
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {incomingPendingRequests.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="text-xs font-bold text-slate-800">
                        받은 친구 요청 ({incomingPendingRequests.length})
                      </div>
                      <div className="grid grid-cols-1 gap-1">
                        {incomingPendingRequests.slice(0, 4).map((req) => (
                          <div key={req.id} className="flex items-center justify-between px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs">
                            <span className="font-semibold text-slate-900 truncate">{req.fromNickname}</span>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => handleRespondFriend(req, 'accepted')}
                                className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold cursor-pointer"
                              >
                                <Check className="w-3 h-3" />
                                수락
                              </button>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => handleRespondFriend(req, 'declined')}
                                className="px-2 py-0.5 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-600 cursor-pointer"
                              >
                                거절
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* My Friends List */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800">내 친구 ({acceptedFriends.length})</span>
                      {canInviteFriends ? (
                        <span className="text-[11px] text-emerald-700 font-semibold">
                          방 {multiplayer?.roomCode} 초대 가능
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400">
                          사설방/링크전 생성 시 초대 가능
                        </span>
                      )}
                    </div>
                    {acceptedFriends.length === 0 ? (
                      <div className="py-5 px-3 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg">
                        등록된 친구가 없습니다. 오른쪽에서 닉네임으로 검색해 추가해 보세요.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {acceptedFriends.slice(0, 8).map((req) => {
                          const isSender = req.fromUid === account.uid;
                          const friendUid = isSender ? req.toUid : req.fromUid;
                          const friendNick = isSender ? req.toNickname : req.fromNickname;
                          const friendChar = isSender ? req.toCharacter : req.fromCharacter;
                          const charName = CHARACTER_LIST.find((c) => c.id === friendChar)?.name ?? friendChar;
                          return (
                            <div key={req.id} className="flex items-center justify-between px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs gap-1">
                              <div className="min-w-0">
                                <div className="font-semibold text-slate-900 truncate">{friendNick}</div>
                                <div className="text-[10px] text-slate-500 truncate">{charName}</div>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                {canInviteFriends && (
                                  <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() => handleInviteToRoom(friendUid, friendNick)}
                                    className="px-2 py-1 rounded bg-slate-950 hover:bg-slate-800 text-white text-[10px] font-semibold cursor-pointer flex items-center gap-1"
                                  >
                                    <Send className="w-2.5 h-2.5" />
                                    초대
                                  </button>
                                )}
                                <button
                                  type="button"
                                  disabled={busy}
                                  aria-label="친구 삭제"
                                  onClick={() => handleRemoveFriend(req, '친구 삭제')}
                                  className="p-1 rounded border border-slate-200 bg-white hover:bg-red-50 text-slate-500 hover:text-red-600 cursor-pointer"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {outgoingPendingRequests.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-[11px] font-semibold text-slate-600">
                        보낸 친구 요청 ({outgoingPendingRequests.length})
                      </div>
                      <div className="grid grid-cols-2 gap-1">
                        {outgoingPendingRequests.slice(0, 4).map((req) => (
                          <div key={req.id} className="flex items-center justify-between px-2 py-1 rounded border border-slate-200 bg-slate-50 text-[11px]">
                            <span className="text-slate-700 font-medium truncate">{req.toNickname}</span>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => handleRemoveFriend(req, '요청 취소')}
                              className="px-1.5 py-0.5 rounded border border-slate-300 bg-white text-slate-600 hover:text-red-600 cursor-pointer shrink-0"
                            >
                              취소
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Column: Search Players (Zero Scroll Grid) */}
                <div className="space-y-2 bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <div className="text-xs font-bold text-slate-800">플레이어 검색 &amp; 친구 추가</div>
                  <form onSubmit={handleSearchFriends} className="flex gap-1.5">
                    <input
                      type="text"
                      data-testid="friend-search-input"
                      maxLength={16}
                      value={friendKeyword}
                      onChange={(e) => setFriendKeyword(e.target.value)}
                      placeholder="플레이어 닉네임 검색..."
                      className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900"
                    />
                    <button
                      type="submit"
                      data-testid="friend-search-btn"
                      disabled={searching}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer shrink-0"
                    >
                      <Search className="w-3.5 h-3.5" />
                      검색
                    </button>
                  </form>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {searching ? (
                      <div className="col-span-full py-6 text-center text-xs text-slate-500">플레이어 검색 중...</div>
                    ) : searchResults.length === 0 ? (
                      <div className="col-span-full py-6 text-center text-xs text-slate-400 bg-white border border-slate-200 rounded-lg">
                        일치하는 플레이어가 없습니다.
                      </div>
                    ) : (
                      searchResults.slice(0, 8).map((player) => {
                        const rel = friendRequests.find(
                          (r) =>
                            (r.fromUid === account.uid && r.toUid === player.uid) ||
                            (r.toUid === account.uid && r.fromUid === player.uid)
                        );
                        return (
                          <div key={player.uid} className="flex items-center justify-between px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white gap-1.5">
                            <div className="min-w-0">
                              <div className="font-semibold text-slate-900 truncate">{player.nickname}</div>
                              <div className="text-[10px] text-slate-500 font-mono-num">
                                {player.tier} · {player.elo}
                              </div>
                            </div>
                            {rel?.status === 'accepted' ? (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold text-[10px] shrink-0">
                                친구
                              </span>
                            ) : rel?.status === 'pending' ? (
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-semibold text-[10px] shrink-0">
                                대기
                              </span>
                            ) : (
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => handleSendFriendRequest(player)}
                                className="flex items-center gap-1 px-2 py-1 rounded bg-slate-950 hover:bg-slate-800 text-white text-[10px] font-semibold cursor-pointer shrink-0"
                              >
                                <UserPlus className="w-3 h-3" />
                                친추
                              </button>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            )
          ) : (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="font-bold text-slate-800">링크전 ELO 상위 12명</span>
                <span>기본 1000 ELO (승 +28 / 패 -18)</span>
              </div>
              {boardLoading ? (
                <div className="py-8 text-center text-xs text-slate-500">랭킹 데이터를 불러오는 중...</div>
              ) : board.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  아직 등록된 랭크 전적이 없습니다. 로그인 후 첫 링크전에 도전하세요.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {board.map((row, idx) => {
                    const charName =
                      CHARACTER_LIST.find((c) => c.id === row.favoriteCharacter)?.name ?? row.favoriteCharacter;
                    const isMe = account?.uid === row.uid;
                    return (
                      <div
                        key={row.uid}
                        className={`flex items-center justify-between py-2 px-3 rounded-lg border text-xs ${
                          isMe
                            ? 'bg-amber-50/70 border-amber-300 font-semibold'
                            : 'bg-slate-50/60 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className={`font-mono-num font-black w-6 shrink-0 ${
                              idx === 0
                                ? 'text-amber-600'
                                : idx <= 2
                                  ? 'text-rose-600'
                                  : 'text-slate-500'
                            }`}
                          >
                            #{idx + 1}
                          </span>
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900 truncate">{row.nickname}</div>
                            <div className="text-[10px] text-slate-500 truncate">{charName}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2.5 shrink-0">
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
