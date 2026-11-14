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
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  getFirestore,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
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
