import { useEffect, useRef, useState } from 'react';
import { AuthModal } from './components/AuthModal';
import { GameHud } from './components/GameHud';
import { StatusModal } from './components/StatusModal';
import { TitleScreen } from './components/TitleScreen';
import {
  ensureUserAccountProfile,
  recordAccountMatchResult,
  subscribeAuthState,
  type PlayerAccountProfile,
} from './firebase';
import { CHARACTERS } from './game/characters';
import { UnstableArenaEngine } from './game/engine';
import type { CharacterId, GameModeId, HudSnapshot } from './game/types';

const INITIAL_HUD: HudSnapshot = {
  screen: 'title',
  mode: 'online_world',
  characterId: 'wemmbu',
  hp: 110,
  maxHp: 110,
  absorption: 0,
  stamina: 100,
  activeSlot: 0,
  loadout: CHARACTERS.wemmbu.loadout,
  slotCooldowns: [0, 0, 0, 0, 0, 0],
  slotMaxCooldowns: [
    CHARACTERS.wemmbu.loadout[0].cooldown,
    CHARACTERS.wemmbu.loadout[1].cooldown,
    CHARACTERS.wemmbu.loadout[2].cooldown,
    CHARACTERS.wemmbu.loadout[3].cooldown,
    CHARACTERS.wemmbu.loadout[4].cooldown,
    CHARACTERS.wemmbu.loadout[5].cooldown,
  ],
  slotCharges: [
    CHARACTERS.wemmbu.loadout[0].startCharges ?? 1,
    CHARACTERS.wemmbu.loadout[1].startCharges ?? 1,
    CHARACTERS.wemmbu.loadout[2].startCharges ?? 1,
    CHARACTERS.wemmbu.loadout[3].startCharges ?? 1,
    CHARACTERS.wemmbu.loadout[4].startCharges ?? 1,
    CHARACTERS.wemmbu.loadout[5].startCharges ?? 1,
  ],
  slotMaxCharges: [
    CHARACTERS.wemmbu.loadout[0].maxCharges ?? 1,
    CHARACTERS.wemmbu.loadout[1].maxCharges ?? 1,
    CHARACTERS.wemmbu.loadout[2].maxCharges ?? 1,
    CHARACTERS.wemmbu.loadout[3].maxCharges ?? 1,
    CHARACTERS.wemmbu.loadout[4].maxCharges ?? 1,
    CHARACTERS.wemmbu.loadout[5].maxCharges ?? 1,
  ],
  elytraCooldown: 0,
  elytraMaxCooldown: 3.8,
  isGliding: false,
  isBlocking: false,
  isStealthed: false,
  isInCobweb: false,
  cobwebBreakProgress: 0,
  isBurning: false,
  isInWater: false,
  cameraMode: 'firstperson',
  shiftLock: false,
  pointerLocked: false,
  kills: 0,
  deaths: 0,
  targetKills: 999,
  wave: 1,
  aliveEnemies: 6,
  comboStreak: 0,
  maxSmashHeight: 0,
  damageDealt: 0,
  elapsedTime: 0,
  outcome: null,
  calloutText: '',
  calloutAccent: '#fbbf24',
  calloutTimer: 0,
  killFeed: [],
  chatMessages: [],
  hitmarkerTimer: 0,
  hitmarkerCrit: false,
  lastHitText: '',
  fallHeightReady: 0,
  muted: false,
  multiplayer: {
    status: 'idle',
    roomKind: 'global',
    roomCode: null,
    selfId: null,
    isHost: false,
    playerName: 'Player',
    includeBots: true,
    linkQueueing: false,
    peers: [],
    error: null,
  },
};

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<UnstableArenaEngine | null>(null);
  const accountRef = useRef<PlayerAccountProfile | null>(null);
  const selectedCharRef = useRef<CharacterId>('wemmbu');

  const [hud, setHud] = useState<HudSnapshot>(INITIAL_HUD);
  const [account, setAccount] = useState<PlayerAccountProfile | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'auth' | 'leaderboard'>('auth');

  const [initialRoomCode] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return (params.get('room') ?? '').trim().toUpperCase().slice(0, 4);
  });
  const [initialLinkCode] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return (params.get('link') ?? '').trim().toUpperCase().slice(0, 4);
  });

  useEffect(() => {
    accountRef.current = account;
    if (account?.nickname) {
      engineRef.current?.setPlayerName(account.nickname);
    }
  }, [account]);

  useEffect(() => {
    selectedCharRef.current = hud.characterId;
  }, [hud.characterId]);

  useEffect(() => {
    const unsubscribe = subscribeAuthState((user) => {
      if (!user) {
        setAccount(null);
        return;
      }
      ensureUserAccountProfile(user, undefined, selectedCharRef.current)
        .then((profile) => {
          setAccount(profile);
        })
        .catch(() => {});
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const mount = canvasMountRef.current;
    if (!mount) return;

    const engine = new UnstableArenaEngine(mount, (snapshot) => {
      setHud(snapshot);
    });
    engine.setOnMatchEnd((res) => {
      const prof = accountRef.current;
      if (!prof) return;
      recordAccountMatchResult({
        profile: prof,
        isRankedLink: res.mode === 'link_duel',
        won: res.won,
        killsDelta: res.kills,
        deathsDelta: res.deaths,
        favoriteCharacter: selectedCharRef.current,
      })
        .then((updated) => {
          setAccount(updated);
        })
        .catch(() => {});
    });
    engineRef.current = engine;

    const params = new URLSearchParams(window.location.search);
    if (params.get('link')) {
      engine.setMode('link_duel');
    } else if (params.get('room')) {
      engine.setMode('multiplayer');
    } else if (params.get('mode') === 'ffa') {
      engine.setMode('ffa');
    }
    if (params.get('autostart') === '1') {
      engine.startGame();
    }

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  const handleSelectCharacter = (id: CharacterId) => {
    engineRef.current?.setCharacter(id);
  };

  const handleSelectMode = (mode: GameModeId) => {
    engineRef.current?.setMode(mode);
  };

  const handleStart = () => {
    (document.activeElement as HTMLElement | null)?.blur?.();
    engineRef.current?.startGame();
  };

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-white">
      <div
        ref={canvasMountRef}
        data-testid="arena-canvas"
        className="absolute inset-0 w-full h-full"
      />

      {hud.screen === 'title' && (
        <TitleScreen
          selectedCharacter={hud.characterId}
          selectedMode={hud.mode}
          multiplayer={hud.multiplayer}
          account={account}
          initialRoomCode={initialRoomCode}
          initialLinkCode={initialLinkCode}
          onSelectCharacter={handleSelectCharacter}
          onSelectMode={handleSelectMode}
          onStart={handleStart}
          onSetPlayerName={(name) => engineRef.current?.setPlayerName(name)}
          onOpenAuth={(tab) => {
            setAuthModalTab(tab);
            setAuthModalOpen(true);
          }}
          onCreateLinkDuel={(name) => engineRef.current?.createLinkDuelRoom(name)}
          onJoinLinkDuel={(code, name) => engineRef.current?.joinLinkDuelRoom(code, name)}
          onQueueLinkDuel={(name) => engineRef.current?.queueLinkDuel(name)}
          onCancelLinkQueue={() => engineRef.current?.cancelLinkQueue()}
          onCreateRoom={(name, includeBots, roomMode, team) => engineRef.current?.createMultiplayerRoom(name, includeBots, roomMode, team)}
          onJoinRoom={(code, name, team) => engineRef.current?.joinMultiplayerRoom(code, name, team)}
          onUpdateLobby={(updates) => engineRef.current?.updateMultiplayerLobby(updates)}
          onStartMultiplayer={() => engineRef.current?.startMultiplayerMatch()}
          onLeaveRoom={() => engineRef.current?.leaveMultiplayerRoom()}
          onResetNetwork={() => engineRef.current?.resetNetworkConnection()}
        />
      )}

      {hud.screen === 'playing' && (
        <GameHud
          hud={hud}
          onSelectSlot={(idx) => engineRef.current?.selectSlot(idx)}
          onCycleCameraMode={() => engineRef.current?.cycleCameraMode()}
          onToggleMute={() => engineRef.current?.toggleMute()}
          onPause={() => engineRef.current?.pauseGame()}
          onRestart={() => engineRef.current?.startGame()}
          onSendChat={(text) => engineRef.current?.sendChatMessage(text)}
          onMobileAttack={() => engineRef.current?.mobileAttack()}
          onMobileAttackHold={(pressed) => engineRef.current?.mobileAttackHold(pressed)}
          onMobileJump={(pressed) => engineRef.current?.mobileJump(pressed)}
          onMobileBlock={(pressed) => engineRef.current?.mobileBlock(pressed)}
          onMobileMove={(fwd, rt) => engineRef.current?.mobileMove(fwd, rt)}
          onMobileLook={(dx, dy) => engineRef.current?.mobileLook(dx, dy)}
        />
      )}

      {(hud.screen === 'paused' || hud.screen === 'gameover') && (
        <StatusModal
          hud={hud}
          account={account}
          onResume={() => engineRef.current?.resumeGame()}
          onRestart={() => engineRef.current?.startGame()}
          onTitle={() => engineRef.current?.returnToTitle()}
          onLeaveRoom={() => engineRef.current?.leaveMultiplayerRoom()}
        />
      )}

      <AuthModal
        open={authModalOpen}
        initialTab={authModalTab}
        account={account}
        selectedCharacter={hud.characterId}
        onClose={() => setAuthModalOpen(false)}
        onAccountUpdated={(profile) => setAccount(profile)}
      />
    </main>
  );
}

