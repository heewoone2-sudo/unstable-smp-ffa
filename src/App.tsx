import { useEffect, useRef, useState } from 'react';
import { AuthModal } from './components/AuthModal';
import { GameHud } from './components/GameHud';
import { SettingsModal } from './components/SettingsModal';
import { StatusModal } from './components/StatusModal';
import { TitleScreen } from './components/TitleScreen';
import {
  ensureUserAccountProfile,
  recordAccountMatchResult,
  subscribeAuthState,
  type PlayerAccountProfile,
} from './firebase';
import { CHARACTERS, DEFAULT_GAME_SETTINGS, hasDoubleJumpLoadout } from './game/characters';
import { DASH_COOLDOWN_SEC, resolveUltimatePreset } from './game/combatMath';
import { UnstableArenaEngine } from './game/engine';
import { createEmptyMapVotes, getRotationWindow } from './game/maps';
import type { BotDifficulty, CharacterId, GameModeId, HudSnapshot } from './game/types';

export interface LocalSkillStats {
  wins: number;
  losses: number;
  kills: number;
  deaths: number;
  recentKd: number;
  winStreak: number;
  lossStreak: number;
}

const SKILL_STATS_STORAGE_KEY = 'skybox_clash_skill_stats_v1';

function loadLocalSkillStats(): LocalSkillStats {
  try {
    const raw = window.localStorage.getItem(SKILL_STATS_STORAGE_KEY);
    if (!raw) {
      return { wins: 0, losses: 0, kills: 0, deaths: 0, recentKd: 1.0, winStreak: 0, lossStreak: 0 };
    }
    const parsed = JSON.parse(raw) as Partial<LocalSkillStats>;
    return {
      wins: Number(parsed.wins) || 0,
      losses: Number(parsed.losses) || 0,
      kills: Number(parsed.kills) || 0,
      deaths: Number(parsed.deaths) || 0,
      recentKd: typeof parsed.recentKd === 'number' ? parsed.recentKd : 1.0,
      winStreak: Number(parsed.winStreak) || 0,
      lossStreak: Number(parsed.lossStreak) || 0,
    };
  } catch {
    return { wins: 0, losses: 0, kills: 0, deaths: 0, recentKd: 1.0, winStreak: 0, lossStreak: 0 };
  }
}

const INITIAL_ROTATION = getRotationWindow();

const INITIAL_HUD: HudSnapshot = {
  screen: 'title',
  mode: 'ffa',
  partyMode: 'knockout',
  botDifficulty: 'medium',
  isSpectating: false,
  spectatorViewMode: 'follow',
  characterId: 'wemmbu',
  roomMode: 'ffa',
  playerTeam: 'ffa',
  currentMapId: INITIAL_ROTATION.activeMaps[0],
  mapTimeRemaining: INITIAL_ROTATION.remainingSeconds,
  activeRotationMaps: INITIAL_ROTATION.activeMaps,
  rotationEndsAt: INITIAL_ROTATION.endsAtMs,
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
  elytraFlightRemaining: 0,
  dashCooldown: 0,
  dashMaxCooldown: DASH_COOLDOWN_SEC,
  ultimateCharge: 0,
  ultimateLabel: resolveUltimatePreset(CHARACTERS.wemmbu.archetype).shortLabel,
  ultimateAccent: resolveUltimatePreset(CHARACTERS.wemmbu.archetype).accent,
  ultimateReady: false,
  parryCount: 0,
  parryFlashTimer: 0,
  maxComboStreak: 0,
  damageIndicators: [],
  floatingDamageNumbers: [],
  jumpCount: 0,
  canDoubleJump: hasDoubleJumpLoadout(CHARACTERS.wemmbu.loadout),
  isGliding: false,
  isBlocking: false,
  isScoped: false,
  scopeZoomFactor: 1,
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
  multiKillStreak: 0,
  multiKillText: '',
  multiKillTimer: 0,
  ceremonyActive: false,
  ceremonyTitle: '',
  ceremonySubtitle: '',
  killFeed: [],
  chatMessages: [],
  scoreboard: [],
  hitmarkerTimer: 0,
  hitmarkerCrit: false,
  lastHitText: '',
  fallHeightReady: 0,
  fallDistance: 0,
  isAirborne: false,
  maceDamageMult: CHARACTERS.wemmbu.damageMult,
  muted: false,
  fps: 60,
  settings: DEFAULT_GAME_SETTINGS,
  isPractice: false,
  multiplayer: {
    status: 'idle',
    roomKind: 'global',
    roomMode: 'ffa',
    roomCode: null,
    selfId: null,
    isHost: false,
    playerName: 'Player',
    includeBots: false,
    customBots: [],
    botDifficulty: 'medium',
    partyMode: 'knockout',
    linkQueueing: false,
    quickQueueing: false,
    selectedMap: INITIAL_ROTATION.activeMaps[0],
    mapVotes: createEmptyMapVotes(),
    activeRotationMaps: INITIAL_ROTATION.activeMaps,
    rotationEndsAt: INITIAL_ROTATION.endsAtMs,
    targetKills: 15,
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
  const [skillStats, setSkillStats] = useState<LocalSkillStats>(() => loadLocalSkillStats());
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'auth' | 'leaderboard' | 'friends'>('auth');
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [initialRoomCode] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return (params.get('room') ?? '').trim().toUpperCase().slice(0, 12);
  });
  const [initialLinkCode] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return (params.get('link') ?? '').trim().toUpperCase().slice(0, 12);
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
      const matchKd = res.kills / Math.max(1, res.deaths);
      setSkillStats((prev) => {
        const next: LocalSkillStats = {
          wins: prev.wins + (res.won ? 1 : 0),
          losses: prev.losses + (res.won ? 0 : 1),
          kills: prev.kills + res.kills,
          deaths: prev.deaths + res.deaths,
          recentKd: Number((prev.recentKd * 0.45 + matchKd * 0.55).toFixed(2)),
          winStreak: res.won ? prev.winStreak + 1 : 0,
          lossStreak: res.won ? 0 : prev.lossStreak + 1,
        };
        try {
          window.localStorage.setItem(SKILL_STATS_STORAGE_KEY, JSON.stringify(next));
        } catch {
          // ignore storage quota errors
        }
        return next;
      });

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

  const handleLaunchMatchedGame = (skillDifficulty?: BotDifficulty) => {
    (document.activeElement as HTMLElement | null)?.blur?.();
    engineRef.current?.launchMatchedGame(skillDifficulty);
  };

  const activePlayerName = account?.nickname || hud.multiplayer.playerName || 'Player';

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-zinc-950">
      <div
        ref={canvasMountRef}
        data-testid="arena-canvas"
        className="absolute inset-0 w-full h-full"
      />

      {hud.screen === 'title' && (
        <TitleScreen
          selectedCharacter={hud.characterId}
          selectedMode={hud.mode}
          isPractice={Boolean(hud.isPractice)}
          currentMapId={hud.currentMapId}
          activeRotationMaps={hud.activeRotationMaps}
          rotationEndsAt={hud.rotationEndsAt}
          multiplayer={hud.multiplayer}
          settings={hud.settings}
          chatMessages={hud.chatMessages}
          account={account}
          skillStats={skillStats}
          initialRoomCode={initialRoomCode}
          initialLinkCode={initialLinkCode}
          onSelectCharacter={handleSelectCharacter}
          onSelectMode={handleSelectMode}
          onSetPracticeMode={(enabled) => engineRef.current?.setPracticeMode(enabled)}
          onSelectOpenWorldMap={(mapId) => engineRef.current?.setOpenWorldMap(mapId)}
          onSelectPracticeMap={(mapId) => engineRef.current?.voteMap(mapId)}
          onPlayUiSound={(kind, step) => engineRef.current?.playUiSound(kind, step)}
          onStart={handleStart}
          onLaunchMatchedGame={handleLaunchMatchedGame}
          onSetPlayerName={(name) => engineRef.current?.setPlayerName(name)}
          onOpenAuth={(tab) => {
            setAuthModalTab(tab);
            setAuthModalOpen(true);
          }}
          onOpenSettings={() => setSettingsOpen(true)}
          onCreateLinkDuel={(name, customCode) => engineRef.current?.createLinkDuelRoom(name, customCode)}
          onJoinLinkDuel={(code, name) => engineRef.current?.joinLinkDuelRoom(code, name)}
          onQueueLinkDuel={(name) => engineRef.current?.queueLinkDuel(name)}
          onCancelLinkQueue={() => engineRef.current?.cancelLinkQueue()}
          onQueueQuickMatch={(name) => engineRef.current?.queueQuickMatch(name)}
          onCancelQuickQueue={() => engineRef.current?.cancelQuickQueue()}
          onCreateRoom={(name, includeBots, roomMode, team, botDifficulty, partyMode, customBots, customCode) =>
            engineRef.current?.createMultiplayerRoom(name, includeBots, roomMode, team, botDifficulty, partyMode, customBots, customCode)
          }
          onJoinRoom={(code, name, team) => engineRef.current?.joinMultiplayerRoom(code, name, team)}
          onUpdateLobby={(updates) => engineRef.current?.updateMultiplayerLobby(updates)}
          onVoteMap={(mapId) => engineRef.current?.voteMap(mapId)}
          onPreviewMap={(mapId) => engineRef.current?.previewArenaMap(mapId)}
          onSendChat={(text) => engineRef.current?.sendChatMessage(text)}
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
          onOpenSettings={() => {
            document.exitPointerLock?.();
            setSettingsOpen(true);
          }}
          onPause={() => engineRef.current?.pauseGame()}
          onRestart={() => engineRef.current?.startGame()}
          onExitMatch={() => engineRef.current?.exitMatchToLobby()}
          onSendChat={(text) => engineRef.current?.sendChatMessage(text)}
          onToggleMobileSprint={() => engineRef.current?.toggleMobileSprint()}
          onMobileElytra={() => engineRef.current?.mobileElytra()}
          onMobileDash={() => engineRef.current?.mobileDash()}
          onMobileUltimate={() => engineRef.current?.mobileUltimate()}
          onMobileAttack={() => engineRef.current?.mobileAttack()}
          onMobileAttackHold={(pressed) => engineRef.current?.mobileAttackHold(pressed)}
          onMobileJump={(pressed) => engineRef.current?.mobileJump(pressed)}
          onMobileBlock={(pressed) => engineRef.current?.mobileBlock(pressed)}
          onMobileMove={(fwd, rt) => engineRef.current?.mobileMove(fwd, rt)}
          onMobileLook={(dx, dy) => engineRef.current?.mobileLook(dx, dy)}
          onChangeCharacter={(charId) => engineRef.current?.setCharacter(charId)}
          onChangeMap={(mapId) => engineRef.current?.voteMap(mapId)}
          onTriggerPracticeBuff={(kind) => engineRef.current?.triggerPracticeBuff(kind)}
          onTriggerPracticeEvent={(kind) => engineRef.current?.triggerPracticeArenaEvent(kind)}
          onSpectatorPrev={() => engineRef.current?.selectPrevSpectatorTarget()}
          onSpectatorNext={() => engineRef.current?.selectNextSpectatorTarget()}
          onToggleSpectatorMode={() => engineRef.current?.toggleSpectatorViewMode()}
        />
      )}

      {(hud.screen === 'paused' || hud.screen === 'gameover') && (
        <StatusModal
          hud={hud}
          account={account}
          onResume={() => engineRef.current?.resumeGame()}
          onRestart={() => engineRef.current?.startGame()}
          onTitle={() => engineRef.current?.returnToTitle()}
          onExitMatch={() => engineRef.current?.exitMatchToLobby()}
          onOpenSettings={() => setSettingsOpen(true)}
          onChangeCharacter={(charId) => engineRef.current?.setCharacter(charId)}
          onChangeMap={(mapId) => engineRef.current?.voteMap(mapId)}
        />
      )}

      <AuthModal
        open={authModalOpen}
        initialTab={authModalTab}
        account={account}
        selectedCharacter={hud.characterId}
        multiplayer={hud.multiplayer}
        onJoinRoomFromInvite={(code, mode) => {
          engineRef.current?.setMode('multiplayer');
          engineRef.current?.joinMultiplayerRoom(code, activePlayerName, mode === 'team' ? 'red' : 'ffa');
          setAuthModalOpen(false);
        }}
        onJoinLinkFromInvite={(code) => {
          engineRef.current?.setMode('link_duel');
          engineRef.current?.joinLinkDuelRoom(code, activePlayerName);
          setAuthModalOpen(false);
        }}
        onClose={() => setAuthModalOpen(false)}
        onAccountUpdated={(profile) => setAccount(profile)}
      />

      <SettingsModal
        open={settingsOpen}
        settings={hud.settings}
        onUpdate={(partial) => engineRef.current?.updateSettings(partial)}
        onReset={() => engineRef.current?.resetSettings()}
        onClose={() => setSettingsOpen(false)}
      />
    </main>
  );
}

