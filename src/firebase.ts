import { initializeApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  getFirestore,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Timestamp,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import type { CharacterId } from './game/types';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export type RankTier = 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond' | 'Unstable Master';

export interface PlayerAccountProfile {
  uid: string;
  email: string;
  nickname: string;
  favoriteCharacter: CharacterId;
  tier: RankTier;
  elo: number;
  wins: number;
  losses: number;
  kills: number;
  deaths: number;
}

export interface LeaderboardEntry {
  uid: string;
  nickname: string;
  favoriteCharacter: CharacterId;
  tier: RankTier;
  elo: number;
  wins: number;
  losses: number;
  kills: number;
  deaths: number;
}

export type FriendRequestStatus = 'pending' | 'accepted' | 'declined';

export interface FriendRequestRecord {
  id: string;
  fromUid: string;
  toUid: string;
  fromNickname: string;
  toNickname: string;
  fromCharacter: CharacterId;
  toCharacter: CharacterId;
  status: FriendRequestStatus;
  createdAtMs: number;
  updatedAtMs: number;
}

export interface RoomInviteRecord {
  id: string;
  fromUid: string;
  toUid: string;
  fromNickname: string;
  toNickname: string;
  roomCode: string;
  roomKind: 'private' | 'link_duel';
  roomMode: 'ffa' | 'team';
  status: FriendRequestStatus;
  createdAtMs: number;
  updatedAtMs: number;
}

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection(): Promise<void> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
void testConnection();

export function computeTierFromElo(elo: number): RankTier {
  if (elo >= 1800) return 'Unstable Master';
  if (elo >= 1550) return 'Diamond';
  if (elo >= 1350) return 'Platinum';
  if (elo >= 1150) return 'Gold';
  if (elo >= 1000) return 'Silver';
  return 'Bronze';
}

export function sanitizeNickname(raw: string, fallback = 'Fighter'): string {
  const cleaned = raw.trim().replace(/\s+/g, ' ').slice(0, 16);
  if (cleaned.length >= 2) return cleaned;
  return fallback;
}

export function subscribeAuthState(cb: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, cb);
}

export async function ensureUserAccountProfile(
  user: User,
  preferredNickname?: string,
  favoriteCharacter: CharacterId = 'wemmbu'
): Promise<PlayerAccountProfile> {
  const uid = user.uid;
  const userPath = `users/${uid}`;
  const boardPath = `leaderboard/${uid}`;

  let existingUser: Record<string, unknown> | null = null;
  let existingBoard: Record<string, unknown> | null = null;

  try {
    const userSnap = await getDoc(doc(db, 'users', uid));
    if (userSnap.exists()) existingUser = userSnap.data();
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, userPath);
  }

  try {
    const boardSnap = await getDoc(doc(db, 'leaderboard', uid));
    if (boardSnap.exists()) existingBoard = boardSnap.data();
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, boardPath);
  }

  const defaultNick = sanitizeNickname(
    preferredNickname ||
      (typeof existingUser?.nickname === 'string' ? existingUser.nickname : '') ||
      user.displayName ||
      user.email?.split('@')[0] ||
      'UnstablePlayer'
  );
  const email = (user.email || '').slice(0, 120);

  if (!existingUser) {
    try {
      await setDoc(doc(db, 'users', uid), {
        uid,
        email,
        nickname: defaultNick,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, userPath);
    }
  } else if (preferredNickname && preferredNickname.trim().length >= 2) {
    try {
      await updateDoc(doc(db, 'users', uid), {
        nickname: defaultNick,
        email,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, userPath);
    }
  }

  if (!existingBoard) {
    const initial: LeaderboardEntry = {
      uid,
      nickname: defaultNick,
      favoriteCharacter,
      tier: computeTierFromElo(1000),
      elo: 1000,
      wins: 0,
      losses: 0,
      kills: 0,
      deaths: 0,
    };
    try {
      await setDoc(doc(db, 'leaderboard', uid), {
        ...initial,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, boardPath);
    }
    return { ...initial, email };
  }

  if (preferredNickname && preferredNickname.trim().length >= 2) {
    try {
      await updateDoc(doc(db, 'leaderboard', uid), {
        nickname: defaultNick,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, boardPath);
    }
  }

  const elo = Number(existingBoard.elo ?? 1000);
  return {
    uid,
    email,
    nickname: preferredNickname && preferredNickname.trim().length >= 2
      ? defaultNick
      : String(existingBoard.nickname || defaultNick),
    favoriteCharacter: (existingBoard.favoriteCharacter as CharacterId) || favoriteCharacter,
    tier: computeTierFromElo(elo),
    elo,
    wins: Number(existingBoard.wins ?? 0),
    losses: Number(existingBoard.losses ?? 0),
    kills: Number(existingBoard.kills ?? 0),
    deaths: Number(existingBoard.deaths ?? 0),
  };
}

export async function signInWithGoogle(
  preferredNickname?: string,
  favoriteCharacter: CharacterId = 'wemmbu'
): Promise<PlayerAccountProfile> {
  const cred = await signInWithPopup(auth, googleProvider);
  return ensureUserAccountProfile(cred.user, preferredNickname, favoriteCharacter);
}

export async function signInWithEmailAccount(
  email: string,
  password: string
): Promise<PlayerAccountProfile> {
  const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
  return ensureUserAccountProfile(cred.user);
}

export async function signUpWithEmailAccount(
  email: string,
  password: string,
  nickname: string,
  favoriteCharacter: CharacterId = 'wemmbu'
): Promise<PlayerAccountProfile> {
  const cleanNick = sanitizeNickname(nickname);
  const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
  await updateProfile(cred.user, { displayName: cleanNick }).catch(() => {});
  return ensureUserAccountProfile(cred.user, cleanNick, favoriteCharacter);
}

export async function updateAccountNickname(
  user: User,
  nickname: string
): Promise<PlayerAccountProfile> {
  const cleanNick = sanitizeNickname(nickname);
  await updateProfile(user, { displayName: cleanNick }).catch(() => {});
  return ensureUserAccountProfile(user, cleanNick);
}

export async function recordAccountMatchResult(params: {
  profile: PlayerAccountProfile;
  isRankedLink: boolean;
  won: boolean | null;
  killsDelta: number;
  deathsDelta: number;
  favoriteCharacter: CharacterId;
}): Promise<PlayerAccountProfile> {
  const { profile, isRankedLink, won, killsDelta, deathsDelta, favoriteCharacter } = params;
  const uid = profile.uid;
  const boardPath = `leaderboard/${uid}`;

  let nextElo = profile.elo;
  let nextWins = profile.wins;
  let nextLosses = profile.losses;
  if (isRankedLink && won !== null) {
    if (won) {
      nextElo = Math.min(5000, profile.elo + 28);
      nextWins += 1;
    } else {
      nextElo = Math.max(100, profile.elo - 18);
      nextLosses += 1;
    }
  }
  const nextTier = computeTierFromElo(nextElo);
  const nextKills = Math.max(0, profile.kills + Math.max(0, Math.round(killsDelta)));
  const nextDeaths = Math.max(0, profile.deaths + Math.max(0, Math.round(deathsDelta)));

  try {
    await updateDoc(doc(db, 'leaderboard', uid), {
      nickname: profile.nickname,
      favoriteCharacter,
      tier: nextTier,
      elo: nextElo,
      wins: nextWins,
      losses: nextLosses,
      kills: nextKills,
      deaths: nextDeaths,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, boardPath);
  }

  return {
    ...profile,
    favoriteCharacter,
    tier: nextTier,
    elo: nextElo,
    wins: nextWins,
    losses: nextLosses,
    kills: nextKills,
    deaths: nextDeaths,
  };
}

export async function fetchTopLeaderboard(maxRows = 12): Promise<LeaderboardEntry[]> {
  const path = 'leaderboard';
  try {
    const q = query(
      collection(db, 'leaderboard'),
      where('elo', '>=', 100),
      orderBy('elo', 'desc'),
      limit(Math.min(50, maxRows))
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data();
      const elo = Number(data.elo ?? 1000);
      return {
        uid: String(data.uid || d.id),
        nickname: String(data.nickname || 'Player'),
        favoriteCharacter: (data.favoriteCharacter as CharacterId) || 'wemmbu',
        tier: computeTierFromElo(elo),
        elo,
        wins: Number(data.wins ?? 0),
        losses: Number(data.losses ?? 0),
        kills: Number(data.kills ?? 0),
        deaths: Number(data.deaths ?? 0),
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function signOutAccount(): Promise<void> {
  await signOut(auth);
}

const VALID_CHAR_SET = new Set<CharacterId>([
  'wemmbu',
  'flamefrags',
  'parrotx2',
  'spokeishere',
  'manepear',
  'clownpierce',
  'princezam',
  'jumperwho',
  'minutetech',
  'kestrel',
  'vexor',
]);

function coerceCharacterId(raw: unknown): CharacterId {
  const c = String(raw || 'wemmbu') as CharacterId;
  return VALID_CHAR_SET.has(c) ? c : 'wemmbu';
}

function toMillis(ts: unknown): number {
  if (ts && typeof ts === 'object' && 'toMillis' in ts && typeof (ts as Timestamp).toMillis === 'function') {
    return (ts as Timestamp).toMillis();
  }
  return 0;
}

export function buildFriendDocId(uidA: string, uidB: string): string {
  const cleanA = uidA.trim().replace(/[^a-zA-Z0-9_\-]/g, '');
  const cleanB = uidB.trim().replace(/[^a-zA-Z0-9_\-]/g, '');
  return [cleanA, cleanB].sort().join('__').slice(0, 128);
}

export async function searchPlayerByNickname(
  keyword: string,
  excludeUid?: string
): Promise<LeaderboardEntry[]> {
  const rows = await fetchTopLeaderboard(50);
  const needle = keyword.trim().toLowerCase();
  return rows.filter((entry) => {
    if (excludeUid && entry.uid === excludeUid) return false;
    if (!needle) return true;
    return entry.nickname.toLowerCase().includes(needle);
  });
}

export async function sendFriendRequest(
  from: PlayerAccountProfile,
  target: LeaderboardEntry,
  replaceExistingDeclined = false
): Promise<FriendRequestRecord> {
  const docId = buildFriendDocId(from.uid, target.uid);
  const path = `friendRequests/${docId}`;
  if (!docId || from.uid === target.uid) {
    throw new Error('유효한 대상 플레이어가 아닙니다.');
  }

  if (replaceExistingDeclined) {
    try {
      await deleteDoc(doc(db, 'friendRequests', docId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }

  const fromNickname = sanitizeNickname(from.nickname, 'Player');
  const toNickname = sanitizeNickname(target.nickname, 'Fighter');
  const fromCharacter = coerceCharacterId(from.favoriteCharacter);
  const toCharacter = coerceCharacterId(target.favoriteCharacter);

  try {
    await setDoc(doc(db, 'friendRequests', docId), {
      id: docId,
      fromUid: from.uid,
      toUid: target.uid,
      fromNickname,
      toNickname,
      fromCharacter,
      toCharacter,
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }

  const now = Date.now();
  return {
    id: docId,
    fromUid: from.uid,
    toUid: target.uid,
    fromNickname,
    toNickname,
    fromCharacter,
    toCharacter,
    status: 'pending',
    createdAtMs: now,
    updatedAtMs: now,
  };
}

export async function respondFriendRequest(
  requestId: string,
  status: 'accepted' | 'declined'
): Promise<void> {
  const path = `friendRequests/${requestId}`;
  try {
    await updateDoc(doc(db, 'friendRequests', requestId), {
      status,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function removeFriendRequest(requestId: string): Promise<void> {
  const path = `friendRequests/${requestId}`;
  try {
    await deleteDoc(doc(db, 'friendRequests', requestId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function sendRoomInvite(params: {
  from: PlayerAccountProfile;
  toUid: string;
  toNickname: string;
  roomCode: string;
  roomKind: 'private' | 'link_duel';
  roomMode: 'ffa' | 'team';
}): Promise<void> {
  const cleanRoomCode = params.roomCode
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 8);
  if (cleanRoomCode.length < 4 || params.from.uid === params.toUid) {
    throw new Error('유효한 방 코드 또는 대상이 아닙니다.');
  }
  const suffix = Date.now().toString(36).replace(/[^a-zA-Z0-9]/g, '');
  const inviteId = `${params.from.uid.slice(0, 32)}_${params.toUid.slice(0, 32)}_${cleanRoomCode}_${suffix}`.slice(0, 128);
  const path = `roomInvites/${inviteId}`;

  try {
    await setDoc(doc(db, 'roomInvites', inviteId), {
      id: inviteId,
      fromUid: params.from.uid,
      toUid: params.toUid,
      fromNickname: sanitizeNickname(params.from.nickname, 'Player'),
      toNickname: sanitizeNickname(params.toNickname, 'Fighter'),
      roomCode: cleanRoomCode,
      roomKind: params.roomKind,
      roomMode: params.roomMode,
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateRoomInviteStatus(
  inviteId: string,
  status: 'accepted' | 'declined'
): Promise<void> {
  const path = `roomInvites/${inviteId}`;
  try {
    await updateDoc(doc(db, 'roomInvites', inviteId), {
      status,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

function mapFriendRequestDoc(id: string, data: Record<string, unknown>): FriendRequestRecord {
  const statusRaw = String(data.status || 'pending');
  const status: FriendRequestStatus =
    statusRaw === 'accepted' || statusRaw === 'declined' ? statusRaw : 'pending';
  return {
    id: String(data.id || id),
    fromUid: String(data.fromUid || ''),
    toUid: String(data.toUid || ''),
    fromNickname: String(data.fromNickname || 'Player'),
    toNickname: String(data.toNickname || 'Fighter'),
    fromCharacter: coerceCharacterId(data.fromCharacter),
    toCharacter: coerceCharacterId(data.toCharacter),
    status,
    createdAtMs: toMillis(data.createdAt),
    updatedAtMs: toMillis(data.updatedAt),
  };
}

function mapRoomInviteDoc(id: string, data: Record<string, unknown>): RoomInviteRecord {
  const statusRaw = String(data.status || 'pending');
  const status: FriendRequestStatus =
    statusRaw === 'accepted' || statusRaw === 'declined' ? statusRaw : 'pending';
  return {
    id: String(data.id || id),
    fromUid: String(data.fromUid || ''),
    toUid: String(data.toUid || ''),
    fromNickname: String(data.fromNickname || 'Player'),
    toNickname: String(data.toNickname || 'Fighter'),
    roomCode: String(data.roomCode || ''),
    roomKind: data.roomKind === 'link_duel' ? 'link_duel' : 'private',
    roomMode: data.roomMode === 'team' ? 'team' : 'ffa',
    status,
    createdAtMs: toMillis(data.createdAt),
    updatedAtMs: toMillis(data.updatedAt),
  };
}

export function subscribeFriendData(
  uid: string,
  onChange: (data: { friendRequests: FriendRequestRecord[]; roomInvites: RoomInviteRecord[] }) => void
): () => void {
  const sentRequests = new Map<string, FriendRequestRecord>();
  const recvRequests = new Map<string, FriendRequestRecord>();
  const sentInvites = new Map<string, RoomInviteRecord>();
  const recvInvites = new Map<string, RoomInviteRecord>();

  const emit = () => {
    const reqMap = new Map<string, FriendRequestRecord>();
    for (const [k, v] of sentRequests) reqMap.set(k, v);
    for (const [k, v] of recvRequests) reqMap.set(k, v);
    const invMap = new Map<string, RoomInviteRecord>();
    for (const [k, v] of sentInvites) invMap.set(k, v);
    for (const [k, v] of recvInvites) invMap.set(k, v);

    const friendRequests = Array.from(reqMap.values()).sort((a, b) => b.updatedAtMs - a.updatedAtMs);
    const roomInvites = Array.from(invMap.values()).sort((a, b) => b.updatedAtMs - a.updatedAtMs);
    onChange({ friendRequests, roomInvites });
  };

  const unsub1 = onSnapshot(
    query(collection(db, 'friendRequests'), where('fromUid', '==', uid), limit(50)),
    (snap) => {
      sentRequests.clear();
      snap.docs.forEach((d) => sentRequests.set(d.id, mapFriendRequestDoc(d.id, d.data())));
      emit();
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'friendRequests');
    }
  );

  const unsub2 = onSnapshot(
    query(collection(db, 'friendRequests'), where('toUid', '==', uid), limit(50)),
    (snap) => {
      recvRequests.clear();
      snap.docs.forEach((d) => recvRequests.set(d.id, mapFriendRequestDoc(d.id, d.data())));
      emit();
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'friendRequests');
    }
  );

  const unsub3 = onSnapshot(
    query(collection(db, 'roomInvites'), where('fromUid', '==', uid), limit(50)),
    (snap) => {
      sentInvites.clear();
      snap.docs.forEach((d) => sentInvites.set(d.id, mapRoomInviteDoc(d.id, d.data())));
      emit();
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'roomInvites');
    }
  );

  const unsub4 = onSnapshot(
    query(collection(db, 'roomInvites'), where('toUid', '==', uid), limit(50)),
    (snap) => {
      recvInvites.clear();
      snap.docs.forEach((d) => recvInvites.set(d.id, mapRoomInviteDoc(d.id, d.data())));
      emit();
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'roomInvites');
    }
  );

  return () => {
    unsub1();
    unsub2();
    unsub3();
    unsub4();
  };
}

