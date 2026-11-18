import { useEffect, useRef, useState } from 'react';
import {
  Volume2,
  VolumeX,
  Pause,
  RotateCcw,
  Shield,
  Swords,
  ArrowUp,
  MessageSquare,
  Send,
  Gamepad2,
  Settings,
  Zap,
  Feather,
  ListOrdered,
  MapPin,
  DoorOpen,
  X,
  Hammer,
} from 'lucide-react';
import { CHARACTER_LIST, CHARACTERS } from '../game/characters';
import { computeMaceSmashPreview } from '../game/combatMath';
import { MAP_DEFINITIONS, MAP_ORDER } from '../game/maps';
import {
  ARENA_BUFF_DEFINITIONS,
  ARENA_BUFF_ORDER,
  ARENA_EVENT_ORDER,
  ARENA_SURGE_EVENTS,
} from '../game/partyModes';
import type {
  ArenaBuffKind,
  ArenaEventKind,
  CharacterId,
  HudSnapshot,
  MapCategory,
  MapId,
} from '../game/types';
import { WeaponIcon } from './WeaponIcons';

interface GameHudProps {
  hud: HudSnapshot;
  onSelectSlot: (idx: number) => void;
  onCycleCameraMode: () => void;
  onToggleMute: () => void;
  onOpenSettings: () => void;
  onPause: () => void;
  onRestart: () => void;
  onExitMatch?: () => void;
  onSendChat?: (text: string) => void;
  onToggleMobileSprint?: () => void;
  onMobileElytra?: () => void;
  onMobileAttack?: () => void;
  onMobileAttackHold?: (pressed: boolean) => void;
  onMobileJump?: (pressed: boolean) => void;
  onMobileBlock?: (pressed: boolean) => void;
  onMobileMove?: (forward: number, right: number) => void;
  onMobileLook?: (dx: number, dy: number) => void;
  onChangeCharacter?: (id: CharacterId) => void;
  onChangeMap?: (mapId: MapId) => void;
  onTriggerPracticeBuff?: (kind: ArenaBuffKind) => void;
  onTriggerPracticeEvent?: (kind: ArenaEventKind) => void;
  onSpectatorPrev?: () => void;
  onSpectatorNext?: () => void;
  onToggleSpectatorMode?: () => void;
}

export function GameHud({
  hud,
  onSelectSlot,
  onCycleCameraMode,
  onToggleMute,
  onOpenSettings,
  onPause,
  onRestart,
  onExitMatch,
  onSendChat,
  onToggleMobileSprint,
  onMobileElytra,
  onMobileAttack,
  onMobileAttackHold,
  onMobileJump,
  onMobileBlock,
  onMobileMove,
  onMobileLook,
  onChangeCharacter,
  onChangeMap,
  onTriggerPracticeBuff,
  onTriggerPracticeEvent,
  onSpectatorPrev,
  onSpectatorNext,
  onToggleSpectatorMode,
}: GameHudProps) {
  const prof = CHARACTERS[hud.characterId];
  const mapDef = MAP_DEFINITIONS[hud.currentMapId] ?? MAP_DEFINITIONS.container_yard;
  const mapRem = Math.max(0, Math.floor(hud.mapTimeRemaining));
  const mapClock = `${String(Math.floor(mapRem / 60)).padStart(2, '0')}:${String(mapRem % 60).padStart(2, '0')}`;
  const hpPct = Math.max(0, Math.min(100, (hud.hp / hud.maxHp) * 100));
  const absPct = Math.max(0, Math.min(100, (hud.absorption / 30) * 100));
  const activeWeapon = hud.loadout[hud.activeSlot] ?? hud.loadout.find((s) => s !== null) ?? null;
  const maceSlotIdx = hud.loadout.findIndex((s) => s?.id === 'mace');
  const hasMaceInLoadout = maceSlotIdx >= 0;
  const maceSelected = activeWeapon?.id === 'mace';
  const macePreview = hasMaceInLoadout
    ? computeMaceSmashPreview(
        28,
        hud.maceDamageMult || 1,
        hud.fallDistance ?? hud.fallHeightReady ?? 0,
        !hud.isAirborne
      )
    : null;
  const showMaceFlightHud =
    !hud.isSpectating &&
    hasMaceInLoadout &&
    macePreview !== null &&
    (hud.isAirborne || hud.isGliding || macePreview.fallDistance >= 0.2);
  const lowHp = hud.hp <= hud.maxHp * 0.3;

  const [showTouchControls, setShowTouchControls] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia?.('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
  });
  const [isCompactViewport, setIsCompactViewport] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 640;
  });
  const [mobileSprintOn, setMobileSprintOn] = useState(false);
  const [scoreboardHeld, setScoreboardHeld] = useState(false);
  const [scoreboardToggled, setScoreboardToggled] = useState(false);
  const [chatText, setChatText] = useState('');
  const [chatOpenMobile, setChatOpenMobile] = useState(false);
  const [worldChatHovered, setWorldChatHovered] = useState(false);
  const [worldChatFocused, setWorldChatFocused] = useState(false);
  const [practiceModalOpen, setPracticeModalOpen] = useState(false);
  const [practiceCatFilter, setPracticeCatFilter] = useState<'all' | MapCategory>('all');
  const chatInputRef = useRef<HTMLInputElement | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const worldChatExpanded = worldChatHovered || worldChatFocused;

  const [joystickCenter, setJoystickCenter] = useState<{ x: number; y: number } | null>(null);
  const [joystickOffset, setJoystickOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const lookTouchRef = useRef<{ id: number; x: number; y: number } | null>(null);

  useEffect(() => {
    const onResize = () => setIsCompactViewport(window.innerWidth < 640);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const el = chatScrollRef.current;
    if (!el) return;
    const pinBottom = () => {
      el.scrollTop = el.scrollHeight;
    };
    pinBottom();
    const timer = window.setTimeout(pinBottom, 220);
    const observer =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => {
            pinBottom();
          })
        : null;
    observer?.observe(el);
    return () => {
      window.clearTimeout(timer);
      observer?.disconnect();
    };
  }, [hud.chatMessages.length, worldChatExpanded]);

  const isPracticeOffline = Boolean(hud.isPractice) && !hud.multiplayer.roomCode && hud.mode === 'ffa';

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Tab') {
        if (document.activeElement !== chatInputRef.current) {
          e.preventDefault();
          setScoreboardHeld(true);
        }
      } else if (e.code === 'KeyM' && isPracticeOffline && document.activeElement !== chatInputRef.current) {
        e.preventDefault();
        setPracticeModalOpen((prev) => {
          const next = !prev;
          if (next) {
            document.exitPointerLock?.();
          }
          return next;
        });
      } else if (e.code === 'Enter') {
        const active = document.activeElement;
        if (active !== chatInputRef.current) {
          e.preventDefault();
          document.exitPointerLock?.();
          setChatOpenMobile(true);
          window.setTimeout(() => chatInputRef.current?.focus(), 10);
        }
      } else if (e.code === 'Escape') {
        if (document.activeElement === chatInputRef.current) {
          chatInputRef.current?.blur();
        } else {
          setPracticeModalOpen(false);
        }
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Tab') {
        setScoreboardHeld(false);
      }
    };
    const onBlur = () => setScoreboardHeld(false);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [isPracticeOffline]);

  const showScoreboard = scoreboardHeld || scoreboardToggled;
  const redBoard = hud.scoreboard.filter((s) => s.team === 'red');
  const blueBoard = hud.scoreboard.filter((s) => s.team === 'blue');

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = chatText.trim();
    if (cleaned && onSendChat) {
      onSendChat(cleaned);
    }
    setChatText('');
    chatInputRef.current?.blur();
  };

  const cameraLabel =
    hud.cameraMode === 'shiftlock'
      ? '시프트락 [V]'
      : hud.cameraMode === 'firstperson'
        ? '1인칭 [V]'
        : '자유 시점 [V]';

  const statusText = hud.isBurning
    ? '용암/화상 피해!'
    : hud.isInCobweb
      ? '거미줄 속박'
      : hud.isInWater
        ? '물 속'
        : hud.isStealthed
          ? '은신 중'
          : hud.isScoped
            ? '방패 스코프 조준'
            : hud.isBlocking
              ? '방어 중'
              : hud.isGliding
                ? '활공 중 · HP 회복 (우클릭: 폭죽)'
                : '전투 중';

  return (
    <div
      className="fixed inset-0 z-10 pointer-events-none select-none"
      onTouchMove={(e) => {
        if (!showTouchControls || !onMobileLook) return;
        for (let i = 0; i < e.changedTouches.length; i++) {
          const t = e.changedTouches[i];
          if (lookTouchRef.current && lookTouchRef.current.id === t.identifier) {
            const dx = t.clientX - lookTouchRef.current.x;
            const dy = t.clientY - lookTouchRef.current.y;
            onMobileLook(dx, dy);
            lookTouchRef.current.x = t.clientX;
            lookTouchRef.current.y = t.clientY;
          }
        }
      }}
      onTouchEnd={(e) => {
        for (let i = 0; i < e.changedTouches.length; i++) {
          const t = e.changedTouches[i];
          if (lookTouchRef.current && lookTouchRef.current.id === t.identifier) {
            lookTouchRef.current = null;
          }
        }
      }}
    >
      {lowHp && (
        <div
          className="fixed inset-0 pointer-events-none"
          style={{
            boxShadow: 'inset 0 0 90px rgba(220, 38, 38, 0.5)',
          }}
        />
      )}

      {!lowHp && hud.isBurning && (
        <div
          className="fixed inset-0 pointer-events-none"
          style={{
            boxShadow: 'inset 0 0 75px rgba(234, 88, 12, 0.48)',
          }}
        />
      )}

      {hud.isStealthed && (
        <div
          data-testid="stealth-vignette"
          className="fixed inset-0 pointer-events-none transition-opacity duration-200"
          style={{
            background:
              'radial-gradient(circle at center, rgba(15, 10, 40, 0) 44%, rgba(49, 46, 129, 0.36) 76%, rgba(17, 12, 46, 0.78) 100%)',
            boxShadow: 'inset 0 0 110px rgba(139, 92, 246, 0.52)',
          }}
        />
      )}

      {hud.isScoped && !hud.isSpectating && (
        <div
          data-testid="bow-scope-overlay"
          className="fixed inset-0 pointer-events-none transition-opacity duration-150"
          style={{
            background:
              'radial-gradient(circle at center, rgba(2, 6, 23, 0) 34%, rgba(2, 6, 23, 0.34) 68%, rgba(2, 6, 23, 0.76) 100%)',
          }}
        />
      )}

      {isPracticeOffline && (
        <div
          data-testid="practice-switcher-left"
          className="fixed top-[128px] sm:top-[154px] left-2.5 sm:left-4 z-20 flex flex-wrap sm:flex-nowrap items-center gap-1.5 pointer-events-auto bg-white/95 border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-sm text-xs max-w-[192px] sm:max-w-none"
        >
          <span className="font-bold text-slate-700 whitespace-nowrap">연습장</span>
          <select
            data-testid="practice-char-select"
            aria-label="연습장 캐릭터 변경"
            value={hud.characterId}
            onChange={(e) => {
              e.currentTarget.blur();
              onChangeCharacter?.(e.target.value as CharacterId);
            }}
            className="px-2 py-1 rounded-lg border border-slate-300 bg-white font-semibold text-slate-900 cursor-pointer text-[11px]"
            title="캐릭터 즉시 변경"
          >
            {CHARACTER_LIST.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            data-testid="practice-map-select"
            aria-label="연습장 맵 변경"
            value={hud.currentMapId}
            onChange={(e) => {
              e.currentTarget.blur();
              onChangeMap?.(e.target.value as MapId);
            }}
            className="px-2 py-1 rounded-lg border border-slate-300 bg-white font-semibold text-slate-900 cursor-pointer text-[11px]"
            title="맵 즉시 변경"
          >
            {MAP_ORDER.map((mId) => (
              <option key={mId} value={mId}>
                {MAP_DEFINITIONS[mId].name}
              </option>
            ))}
          </select>
          <button
            type="button"
            tabIndex={-1}
            data-testid="practice-quick-modal-btn"
            onClick={(e) => {
              e.currentTarget.blur();
              document.exitPointerLock?.();
              setPracticeModalOpen(true);
            }}
            className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-[11px] cursor-pointer whitespace-nowrap"
            title="전체 20종 맵·캐릭터 선택 [M]"
          >
            전체 20맵 [M]
          </button>
        </div>
      )}

      {/* Top-Left: Clean Light Vitality & Map Strip */}
      <div className="fixed top-2.5 left-2.5 sm:top-4 sm:left-4 z-20 w-[156px] sm:w-76 bg-white/95 border border-slate-200 rounded-xl px-2.5 sm:px-3.5 py-2 sm:py-2.5 shadow-sm text-slate-900">
        <div className="flex items-center justify-between gap-1.5 pb-1 mb-1 sm:pb-1.5 sm:mb-1.5 border-b border-slate-100 text-[10px] sm:text-[11px]">
          <div className="flex items-center gap-1 min-w-0">
            <MapPin className="w-3 h-3 text-blue-600 shrink-0" />
            <span className="font-display font-bold text-slate-900 truncate" data-testid="hud-map-name">
              {mapDef.name}
            </span>
            {hud.roomMode === 'team' && (hud.playerTeam === 'red' || hud.playerTeam === 'blue') && (
              <span
                className={`px-1 py-0.5 rounded text-[9px] sm:text-[10px] font-bold text-white shrink-0 ${
                  hud.playerTeam === 'red' ? 'bg-red-600' : 'bg-blue-600'
                }`}
              >
                {hud.playerTeam === 'red' ? '레드' : '블루'}
              </span>
            )}
          </div>
          <span
            data-testid="hud-map-timer"
            title="다음 오픈월드 4맵 추첨까지 남은 시간"
            className="font-mono-num font-bold text-slate-600 shrink-0"
          >
            {mapClock}
          </span>
        </div>

        <div className="flex items-baseline justify-between gap-1 mb-1 sm:mb-1.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-xs border border-black/20 shrink-0"
              style={{ backgroundColor: prof.trimColor }}
            />
            <span className="font-display text-xs sm:text-sm font-bold tracking-tight text-slate-950 truncate">
              {prof.name}
            </span>
          </div>
          <span className="font-mono-num text-[11px] sm:text-xs font-bold text-slate-800 shrink-0">
            {hud.hp}/{hud.maxHp}
            {hud.absorption > 0 ? <span className="text-amber-600"> +{hud.absorption}</span> : null}
          </span>
        </div>

        <div className="h-2 w-full bg-slate-200 rounded-xs overflow-hidden">
          <div
            className="h-full transition-all duration-100"
            style={{
              width: `${hpPct}%`,
              backgroundColor: lowHp ? '#dc2626' : hud.isBurning ? '#ea580c' : '#16a34a',
            }}
          />
        </div>

        {hud.absorption > 0 && (
          <div className="h-1.5 w-full bg-slate-200 rounded-xs overflow-hidden mt-1">
            <div
              className="h-full bg-amber-500 transition-all duration-100"
              style={{ width: `${absPct}%` }}
            />
          </div>
        )}

        <div className="flex items-center justify-between text-[11px] mt-2 gap-2">
          <button
            type="button"
            tabIndex={-1}
            data-testid="camera-mode-toggle"
            onClick={(e) => {
              e.currentTarget.blur();
              onCycleCameraMode();
            }}
            className="pointer-events-auto font-medium text-slate-700 hover:text-slate-950 underline-offset-2 hover:underline cursor-pointer whitespace-nowrap"
          >
            {cameraLabel}
          </button>
          <span
            className={`truncate font-semibold ${
              hud.isBurning
                ? 'text-orange-600'
                : hud.isInCobweb
                  ? 'text-red-600'
                  : hud.isInWater
                    ? 'text-sky-600'
                    : 'text-slate-500'
            }`}
          >
            {statusText}
          </span>
        </div>
      </div>

      {/* Top-Right: Counters + Compact Utility Buttons */}
      <div className="fixed top-2.5 right-2.5 sm:top-4 sm:right-4 z-20 flex flex-col sm:flex-row items-end sm:items-start gap-1.5 sm:gap-2 max-w-[202px] sm:max-w-none">
        <div className="bg-white/95 border border-slate-200 rounded-xl px-2.5 sm:px-3 py-1.5 sm:py-2 flex items-center gap-2.5 sm:gap-4 shadow-sm text-slate-900">
          {hud.settings.showFps && (
            <div>
              <div className="text-[10px] font-medium text-slate-500">FPS</div>
              <div className="font-display font-mono-num text-sm sm:text-lg font-bold text-slate-900 leading-tight">
                {hud.fps}
              </div>
            </div>
          )}

          {hud.mode === 'online_world' && (
            <div>
              <div className="text-[10px] font-medium text-slate-500">접속</div>
              <div className="font-display font-mono-num text-sm sm:text-lg font-bold text-emerald-700 leading-tight">
                {Math.max(1, hud.multiplayer.peers.length)}명
              </div>
            </div>
          )}

          {(hud.mode === 'multiplayer' || hud.mode === 'link_duel') && hud.multiplayer.roomCode && (
            <div>
              <div className="text-[10px] font-medium text-slate-500">코드</div>
              <div className="font-display font-mono-num text-sm sm:text-lg font-bold text-slate-900 leading-tight">
                {hud.multiplayer.roomCode}
              </div>
            </div>
          )}

          <div>
            <div className="text-[10px] font-medium text-slate-500">처치</div>
            <div className="font-display font-mono-num text-sm sm:text-lg font-bold text-slate-950 leading-tight">
              {hud.kills}
              {hud.mode !== 'online_world' && hud.partyMode !== 'knockout' && (
                <span className="text-[11px] sm:text-xs text-slate-400">/{hud.targetKills}</span>
              )}
            </div>
          </div>

          <div>
            <div className="text-[10px] font-medium text-slate-500">시간</div>
            <div className="font-display font-mono-num text-sm sm:text-lg font-bold text-slate-700 leading-tight">
              {hud.elapsedTime}s
            </div>
          </div>
        </div>

        <div className="flex flex-wrap justify-end items-center gap-1 sm:gap-1.5 pointer-events-auto">
          <button
            type="button"
            tabIndex={-1}
            data-testid="scoreboard-toggle-btn"
            aria-label="스코어보드 [Tab]"
            title="스코어보드 보기 (Tab)"
            onClick={(e) => {
              e.currentTarget.blur();
              setScoreboardToggled((v) => !v);
            }}
            className={`w-7.5 h-7.5 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg sm:rounded-xl border shadow-sm cursor-pointer transition-colors ${
              showScoreboard
                ? 'bg-slate-950 border-slate-950 text-white'
                : 'bg-white/95 border-slate-200 text-slate-700 hover:text-slate-950'
            }`}
          >
            <ListOrdered className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>

          <button
            type="button"
            tabIndex={-1}
            data-testid="hud-settings-btn"
            aria-label="환경설정"
            title="환경설정"
            onClick={(e) => {
              e.currentTarget.blur();
              onOpenSettings();
            }}
            className="w-7.5 h-7.5 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg sm:rounded-xl bg-white/95 border border-slate-200 text-slate-700 hover:text-slate-950 cursor-pointer shadow-sm"
          >
            <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>

          <button
            type="button"
            tabIndex={-1}
            aria-label="모바일 터치패드 전환"
            title="터치 조이스틱 켜기/끄기"
            onClick={(e) => {
              e.currentTarget.blur();
              setShowTouchControls((v) => !v);
            }}
            className={`w-7.5 h-7.5 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg sm:rounded-xl border shadow-sm cursor-pointer transition-colors ${
              showTouchControls
                ? 'bg-slate-950 border-slate-950 text-white'
                : 'bg-white/95 border-slate-200 text-slate-700 hover:text-slate-950'
            }`}
          >
            <Gamepad2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>

          <button
            type="button"
            tabIndex={-1}
            aria-label={hud.muted ? '소리 켜기 [M]' : '음소거 [M]'}
            title={hud.muted ? '소리 켜기 (M)' : '음소거 (M)'}
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleMute();
            }}
            className="w-7.5 h-7.5 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg sm:rounded-xl bg-white/95 border border-slate-200 text-slate-700 hover:text-slate-950 cursor-pointer shadow-sm"
          >
            {hud.muted ? <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
          </button>

          {hud.mode !== 'online_world' &&
            hud.mode !== 'multiplayer' &&
            !(hud.mode === 'link_duel' && hud.multiplayer.roomCode) && (
              <button
                type="button"
                tabIndex={-1}
                aria-label="재시작 [R]"
                title="재시작 (R)"
                onClick={(e) => {
                  e.currentTarget.blur();
                  onRestart();
                }}
                className="w-7.5 h-7.5 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg sm:rounded-xl bg-white/95 border border-slate-200 text-slate-700 hover:text-slate-950 cursor-pointer shadow-sm"
              >
                <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            )}

          <button
            type="button"
            tabIndex={-1}
            aria-label="일시정지 [P]"
            title="일시정지 (P / Esc)"
            onClick={(e) => {
              e.currentTarget.blur();
              onPause();
            }}
            className="w-7.5 h-7.5 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg sm:rounded-xl bg-white/95 border border-slate-200 text-slate-700 hover:text-slate-950 cursor-pointer shadow-sm"
          >
            <Pause className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>

          {onExitMatch && (
            <button
              type="button"
              tabIndex={-1}
              data-testid="hud-exit-match-btn"
              aria-label="게임 나가기"
              title="게임 나가기 (대기실/타이틀로 복귀)"
              onClick={(e) => {
                e.currentTarget.blur();
                onExitMatch();
              }}
              className="h-7.5 sm:h-10 px-2 sm:px-3 flex items-center justify-center gap-1 rounded-lg sm:rounded-xl bg-white/95 border border-red-200 text-red-700 hover:bg-red-50 text-[11px] font-bold cursor-pointer shadow-sm whitespace-nowrap"
            >
              <DoorOpen className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">게임 나가기</span>
            </button>
          )}
        </div>
      </div>

      {/* Active Arena Surge Event Banner */}
      {hud.activeArenaEvent && (
        <div
          data-testid="active-arena-event-banner"
          className={`fixed left-1/2 -translate-x-1/2 pointer-events-none z-15 bg-zinc-950/92 border border-white/15 rounded-xl px-3.5 py-1.5 shadow-lg flex items-center gap-2.5 text-white whitespace-nowrap ${
            hud.mode === 'multiplayer' ||
            hud.mode === 'link_duel' ||
            hud.roomMode === 'team' ||
            (hud.mode === 'ffa' && hud.partyMode !== 'classic')
              ? 'top-[168px] sm:top-14'
              : 'top-14 sm:top-3.5'
          }`}
        >
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: hud.activeArenaEvent.accent }}
          />
          <span className="font-display text-xs sm:text-sm font-bold" style={{ color: hud.activeArenaEvent.accent }}>
            ⚡ {hud.activeArenaEvent.title}
          </span>
          <span className="hidden sm:inline text-[11px] text-zinc-300">
            {hud.activeArenaEvent.subtitle}
          </span>
          <span className="font-mono-num text-xs font-bold px-1.5 py-0.5 rounded bg-white/10 text-white">
            {Math.ceil(hud.activeArenaEvent.remainingSec)}s
          </span>
        </div>
      )}

      {/* Top-Center Competitive & Party Mode Banner */}
      {(hud.mode === 'multiplayer' ||
        hud.mode === 'link_duel' ||
        hud.roomMode === 'team' ||
        (hud.mode === 'ffa' && hud.partyMode !== 'classic')) && (
        <div
          data-testid="top-center-score-banner"
          className="fixed top-[128px] sm:top-3 left-1/2 -translate-x-1/2 pointer-events-none z-15 bg-zinc-950/92 border border-white/15 rounded-xl px-3 sm:px-5 py-1.5 sm:py-2 shadow-lg flex items-center gap-3 sm:gap-4 text-white whitespace-nowrap"
        >
          {(hud.mode === 'multiplayer' || hud.mode === 'ffa') && hud.partyMode === 'boss_raid' ? (
            <div className="flex flex-col items-center gap-1 min-w-[200px] sm:min-w-[280px]">
              <div className="w-full flex items-center justify-between gap-3 text-xs font-display font-bold">
                <span className="text-rose-400">👹 {hud.bossName || '보스 레이드'}</span>
                <span className="font-mono-num text-white">
                  {hud.bossCurrentHp ?? 650} / {hud.bossMaxHp ?? 650}
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className="h-full bg-rose-500 transition-all duration-100"
                  style={{
                    width: `${Math.max(
                      0,
                      Math.min(100, ((hud.bossCurrentHp ?? 0) / Math.max(1, hud.bossMaxHp ?? 650)) * 100)
                    )}%`,
                  }}
                />
              </div>
            </div>
          ) : (hud.mode === 'multiplayer' || hud.mode === 'ffa') && hud.partyMode === 'knockout' ? (
            (() => {
              const koRem = Math.max(0, Math.ceil(hud.knockoutRemainingSec ?? 180));
              const koClock = `${String(Math.floor(koRem / 60)).padStart(2, '0')}:${String(koRem % 60).padStart(2, '0')}`;
              const urgent = koRem <= 20;
              const quotaMet = hud.kills >= (hud.knockoutQuota ?? 1);
              return (
                <div
                  data-testid="knockout-timer-hud"
                  className="flex flex-wrap items-center justify-center gap-2 sm:gap-3.5 text-xs sm:text-sm font-display font-bold"
                >
                  <span className="px-2 py-0.5 rounded bg-rose-600 text-white text-[11px] font-black tracking-wide">
                    {(hud.knockoutRound ?? 1) >= 3
                      ? `R${hud.knockoutRound} · 결승 녹아웃`
                      : `R${hud.knockoutRound ?? 1} / 3 녹아웃`}
                  </span>
                  <span
                    data-testid="knockout-clock"
                    className={`font-mono-num text-lg sm:text-2xl font-black px-2.5 py-0.5 rounded-lg border ${
                      urgent
                        ? 'bg-rose-600/25 border-rose-500 text-rose-300 animate-pulse'
                        : 'bg-white/10 border-white/15 text-amber-300'
                    }`}
                  >
                    {koClock}
                  </span>
                  <span className="text-zinc-200">
                    할당{' '}
                    <strong className={`font-mono-num ${quotaMet ? 'text-emerald-400' : 'text-white'}`}>
                      {hud.kills}/{hud.knockoutQuota ?? 1}킬
                    </strong>
                  </span>
                  <span className="text-zinc-400 text-[11px] hidden sm:inline">
                    생존 {hud.knockoutAliveCount ?? 1}명
                  </span>
                  {hud.knockoutMutatorTitle && (
                    <span
                      data-testid="knockout-mutator-badge"
                      title={hud.knockoutMutatorDesc}
                      className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white/10 border border-white/15 text-[11px] font-bold"
                      style={{ color: hud.knockoutMutatorAccent ?? '#fbbf24' }}
                    >
                      ⚡ {hud.knockoutMutatorTitle}
                    </span>
                  )}
                  {hud.bountyTargetName && (
                    <span
                      data-testid="bounty-target-badge"
                      className="hidden lg:inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/20 border border-amber-400/50 text-amber-300 text-[11px] font-bold"
                    >
                      👑 현상금: {hud.bountyTargetName}
                    </span>
                  )}
                </div>
              );
            })()
          ) : hud.roomMode === 'team' ? (
            <div className="flex items-center gap-3 text-xs sm:text-sm font-display font-bold">
              <span className="flex items-center gap-1.5 text-rose-400">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                레드팀
                <span className="font-mono-num text-base font-extrabold text-white ml-0.5">
                  {hud.scoreboard.filter((s) => s.team === 'red').reduce((acc, s) => acc + s.kills, 0)}
                </span>
              </span>
              <span className="text-zinc-500 font-normal text-xs">:</span>
              <span className="flex items-center gap-1.5 text-cyan-400">
                <span className="font-mono-num text-base font-extrabold text-white mr-0.5">
                  {hud.scoreboard.filter((s) => s.team === 'blue').reduce((acc, s) => acc + s.kills, 0)}
                </span>
                블루팀
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block" />
              </span>
              <span className="text-zinc-300 font-semibold text-[11px] ml-2 pl-2 border-l border-white/15">
                {hud.partyMode === 'random_arsenal'
                  ? '랜덤 무기'
                  : hud.partyMode === 'one_shot'
                    ? '원샷원킬'
                    : `목표 ${hud.targetKills}킬`}
              </span>
            </div>
          ) : hud.mode === 'link_duel' ? (
            <div className="flex items-center gap-3 text-xs sm:text-sm font-display font-bold">
              <span className="text-zinc-200">1v1 링크전</span>
              <span className="font-mono-num text-rose-400">
                {hud.kills} 승
              </span>
              <span className="text-zinc-500">/</span>
              <span className="font-mono-num text-cyan-400">
                3선승
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-3 text-xs sm:text-sm font-display font-bold">
              <span className="text-cyan-400">
                {hud.partyMode === 'random_arsenal'
                  ? '🎲 랜덤 무기'
                  : hud.partyMode === 'one_shot'
                    ? '⚡ 원샷원킬'
                    : '⚔️ 매치 킬 수'}
              </span>
              <span className="font-mono-num text-white text-base">
                {hud.kills} / {hud.targetKills} 킬
              </span>
            </div>
          )}
        </div>
      )}

      {/* Valorant-style Multi-Kill Streak Banner (1 Kill -> Ace -> Overkill) */}
      {hud.multiKillTimer > 0 && hud.multiKillText && (
        <div
          data-testid="multikill-banner"
          className="fixed top-[174px] sm:top-[68px] left-1/2 -translate-x-1/2 pointer-events-none z-25"
        >
          <div
            className={`flex items-center gap-3 px-6 py-2.5 rounded-2xl text-white border-2 shadow-2xl ${
              hud.multiKillStreak >= 5
                ? 'bg-gradient-to-r from-amber-600 via-rose-600 to-amber-600 border-amber-300'
                : hud.multiKillStreak >= 3
                  ? 'bg-zinc-950/95 border-amber-400'
                  : 'bg-zinc-950/95 border-rose-500'
            }`}
          >
            <span className="font-display font-mono-num text-lg sm:text-xl font-black text-amber-300">
              {hud.multiKillStreak} KILL{hud.multiKillStreak > 1 ? 'S' : ''}
            </span>
            <span className="font-display text-sm sm:text-base font-black tracking-wider">
              {hud.multiKillText}
            </span>
          </div>
        </div>
      )}

      {/* Victory / Defeat Ceremony Cutscene Banner */}
      {hud.ceremonyActive && hud.ceremonyTitle && (
        <div
          data-testid="ceremony-banner"
          className="fixed bottom-24 sm:bottom-28 left-1/2 -translate-x-1/2 pointer-events-none z-30 max-w-[calc(100vw-24px)]"
        >
          <div className="px-6 py-3 rounded-2xl bg-zinc-950/95 border-2 border-cyan-400 shadow-xl text-center">
            <div className="font-display text-lg sm:text-2xl font-extrabold text-white">
              {hud.ceremonyTitle}
            </div>
            {hud.ceremonySubtitle && (
              <div className="text-xs sm:text-sm font-semibold text-zinc-300 mt-0.5">
                {hud.ceremonySubtitle}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Transient Callout */}
      {hud.calloutTimer > 0 && hud.calloutText && !hud.ceremonyActive && (
        <div className="fixed top-[210px] sm:top-[108px] left-1/2 -translate-x-1/2 pointer-events-none z-20">
          <div className="font-display text-sm sm:text-base font-bold px-4 py-1.5 rounded-lg bg-white/95 border border-slate-200 text-slate-900 shadow-sm whitespace-nowrap">
            {hud.calloutText}
          </div>
        </div>
      )}

      {/* Kill Feed (Modern Competitive Shooter Style with Weapon Icons & Team Colored Names) */}
      {hud.killFeed.length > 0 && (
        <div className="fixed top-[174px] sm:top-20 right-2.5 sm:right-4 flex flex-col items-end gap-1.5 pointer-events-none z-20">
          {hud.killFeed.map((item) => {
            const redKiller = item.killerTeam === 'red';
            const blueKiller = item.killerTeam === 'blue';
            const redVictim = item.victimTeam === 'red';
            const blueVictim = item.victimTeam === 'blue';
            const killerClass = redKiller
              ? 'text-red-600 font-bold'
              : blueKiller
                ? 'text-blue-600 font-bold'
                : 'text-slate-900 font-semibold';
            const victimClass = redVictim
              ? 'text-red-600 font-bold'
              : blueVictim
                ? 'text-blue-600 font-bold'
                : 'text-slate-900 font-semibold';

            return (
              <div
                key={item.id}
                className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg bg-white/95 border border-slate-200 shadow-sm text-slate-800"
              >
                {item.killerName ? (
                  <>
                    <span className={killerClass}>{item.killerName}</span>
                    <span className="w-5 h-5 flex items-center justify-center shrink-0 bg-slate-100 rounded p-0.5">
                      <WeaponIcon id={item.weaponId ?? 'sword'} className="w-4 h-4" />
                    </span>
                    <span className={victimClass}>{item.victimName}</span>
                  </>
                ) : (
                  <span className="font-semibold text-slate-700">{item.text}</span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Center Crosshair + Hitmarker + 3s Cobweb Break Progress (hidden while spectating) */}
      {!hud.isSpectating && (
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center">
        <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
          <line x1="13" y1="3" x2="13" y2="9" stroke="#0f172a" strokeWidth="2.5" strokeOpacity="0.65" />
          <line x1="13" y1="17" x2="13" y2="23" stroke="#0f172a" strokeWidth="2.5" strokeOpacity="0.65" />
          <line x1="3" y1="13" x2="9" y2="13" stroke="#0f172a" strokeWidth="2.5" strokeOpacity="0.65" />
          <line x1="17" y1="13" x2="23" y2="13" stroke="#0f172a" strokeWidth="2.5" strokeOpacity="0.65" />
          <line x1="13" y1="3" x2="13" y2="9" stroke="#ffffff" strokeWidth="1.5" />
          <line x1="13" y1="17" x2="13" y2="23" stroke="#ffffff" strokeWidth="1.5" />
          <line x1="3" y1="13" x2="9" y2="13" stroke="#ffffff" strokeWidth="1.5" />
          <line x1="17" y1="13" x2="23" y2="13" stroke="#ffffff" strokeWidth="1.5" />
          <circle cx="13" cy="13" r="1.5" fill="#f59e0b" />
          {hud.hitmarkerTimer > 0 && (
            <g
              stroke={hud.hitmarkerCrit ? '#facc15' : '#ef4444'}
              strokeWidth={hud.hitmarkerCrit ? '3' : '2.2'}
              strokeLinecap="round"
            >
              <line x1={hud.hitmarkerCrit ? '2' : '4'} y1={hud.hitmarkerCrit ? '2' : '4'} x2="9" y2="9" />
              <line x1={hud.hitmarkerCrit ? '24' : '22'} y1={hud.hitmarkerCrit ? '2' : '4'} x2="17" y2="9" />
              <line x1={hud.hitmarkerCrit ? '2' : '4'} y1={hud.hitmarkerCrit ? '24' : '22'} x2="9" y2="17" />
              <line x1={hud.hitmarkerCrit ? '24' : '22'} y1={hud.hitmarkerCrit ? '24' : '22'} x2="17" y2="17" />
            </g>
          )}
        </svg>

        {hud.isScoped && (
          <>
            <svg
              width="96"
              height="96"
              viewBox="0 0 96 96"
              aria-hidden="true"
              className="absolute pointer-events-none"
            >
              <circle
                cx="48"
                cy="48"
                r="40"
                fill="none"
                stroke="#38bdf8"
                strokeWidth="1"
                strokeOpacity="0.45"
                strokeDasharray="4 6"
              />
              <line x1="48" y1="6" x2="48" y2="16" stroke="#e0f2fe" strokeWidth="1.2" strokeOpacity="0.75" />
              <line x1="48" y1="80" x2="48" y2="90" stroke="#e0f2fe" strokeWidth="1.2" strokeOpacity="0.75" />
              <line x1="6" y1="48" x2="16" y2="48" stroke="#e0f2fe" strokeWidth="1.2" strokeOpacity="0.75" />
              <line x1="80" y1="48" x2="90" y2="48" stroke="#e0f2fe" strokeWidth="1.2" strokeOpacity="0.75" />
            </svg>
            <div
              data-testid="bow-scope-readout"
              className="absolute -top-11 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-950/80 border border-sky-400/35 px-2 py-0.5 font-mono-num text-[10px] font-bold text-sky-300 shadow-sm"
            >
              {hud.scopeZoomFactor.toFixed(1)}x · 방패 스코프
            </div>
          </>
        )}

        {hud.hitmarkerTimer > 0 && hud.lastHitText && (
          <div
            className={`absolute left-7 -top-4 whitespace-nowrap font-display font-mono-num text-sm font-bold hud-text-stroke ${
              hud.hitmarkerCrit ? 'text-amber-300 scale-110' : 'text-white'
            }`}
          >
            {hud.lastHitText}
          </div>
        )}

        {showMaceFlightHud && macePreview && (() => {
          const arcR = 22;
          const arcCirc = 2 * Math.PI * arcR;
          const arcOffset = arcCirc * (1 - macePreview.progressPct / 100);
          const threshRad = -Math.PI / 2 + (macePreview.thresholdPct / 100) * Math.PI * 2;
          const tx1 = 28 + Math.cos(threshRad) * 18.5;
          const ty1 = 28 + Math.sin(threshRad) * 18.5;
          const tx2 = 28 + Math.cos(threshRad) * 25.5;
          const ty2 = 28 + Math.sin(threshRad) * 25.5;
          const tierColor =
            macePreview.tier === 'max' || macePreview.tier === 'overdrive'
              ? '#f59e0b'
              : macePreview.tier === 'ready'
                ? '#38bdf8'
                : '#cbd5e1';
          const tierLabel =
            macePreview.tier === 'max'
              ? '최대 배율 달성'
              : macePreview.tier === 'overdrive'
                ? '고출력 스매시'
                : macePreview.tier === 'ready'
                  ? '스매시 장전'
                  : '낙하 준비 · 2.0m+ 필요';
          return (
            <>
              <svg
                width="56"
                height="56"
                viewBox="0 0 56 56"
                aria-hidden="true"
                className="absolute pointer-events-none"
              >
                <circle
                  cx="28"
                  cy="28"
                  r={arcR}
                  fill="none"
                  stroke="rgba(15, 23, 42, 0.45)"
                  strokeWidth="2.5"
                />
                <circle
                  cx="28"
                  cy="28"
                  r={arcR}
                  fill="none"
                  stroke={tierColor}
                  strokeWidth="2.75"
                  strokeLinecap="round"
                  strokeDasharray={arcCirc}
                  strokeDashoffset={arcOffset}
                  transform="rotate(-90 28 28)"
                />
                <line
                  x1={tx1}
                  y1={ty1}
                  x2={tx2}
                  y2={ty2}
                  stroke="#ffffff"
                  strokeWidth="1.6"
                  strokeOpacity="0.9"
                />
              </svg>

              <div
                data-testid="mace-smash-hud"
                className={`absolute left-1/2 -translate-x-1/2 pointer-events-none min-w-[224px] rounded-xl bg-slate-950/84 backdrop-blur-sm border px-3 py-2 text-white shadow-lg transition-opacity duration-150 ${
                  hud.cobwebBreakProgress > 0 || hud.isInCobweb ? 'top-24' : 'top-10'
                } ${
                  macePreview.tier === 'max' || macePreview.tier === 'overdrive'
                    ? 'border-amber-400/55'
                    : macePreview.tier === 'ready'
                      ? 'border-sky-400/50'
                      : 'border-white/15'
                }`}
              >
                <div className="flex items-center justify-between gap-3 text-[11px] font-semibold whitespace-nowrap">
                  <span className="flex items-center gap-1.5" style={{ color: tierColor }}>
                    <Hammer className="w-3.5 h-3.5 shrink-0" />
                    <span>{tierLabel}</span>
                  </span>
                  <span className="font-mono-num text-[10px] text-slate-300">
                    {!maceSelected
                      ? `[${maceSlotIdx + 1}] 철퇴 스왑`
                      : macePreview.isSmashReady
                        ? `충격파 ${macePreview.shockwaveRadius.toFixed(1)}m`
                        : '공중 체공'}
                  </span>
                </div>

                <div className="mt-1 flex items-baseline justify-between gap-3 whitespace-nowrap">
                  <div className="flex items-baseline gap-1">
                    <span className="font-display font-mono-num text-base font-bold text-white">
                      {macePreview.fallDistance.toFixed(1)}m
                    </span>
                    <span className="text-[10px] text-slate-400">낙하</span>
                  </div>

                  <div className="flex items-baseline gap-1">
                    <span
                      data-testid="mace-smash-multiplier"
                      className="font-display font-mono-num text-base font-bold"
                      style={{ color: tierColor }}
                    >
                      x{macePreview.damageMultiplier.toFixed(1)}
                    </span>
                    <span className="text-[10px] text-slate-400">배율</span>
                  </div>

                  <div className="font-mono-num text-xs font-bold text-slate-200">
                    {macePreview.potentialDamage} DMG
                  </div>
                </div>

                <div className="relative mt-1.5 h-1.5 w-full rounded-xs bg-white/15 overflow-hidden">
                  <div
                    className="h-full w-full origin-left transition-transform duration-75"
                    style={{
                      transform: `scaleX(${macePreview.progressPct / 100})`,
                      backgroundColor: tierColor,
                    }}
                  />
                  <div
                    aria-hidden="true"
                    className="absolute top-0 bottom-0 w-0.5 bg-white/90"
                    style={{ left: `${macePreview.thresholdPct}%` }}
                  />
                </div>
              </div>
            </>
          );
        })()}

        {hud.cobwebBreakProgress > 0 && (
          <div className="absolute top-10 w-44 bg-white/95 border border-slate-200 rounded-lg px-2.5 py-1.5 shadow-sm text-center">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-800 mb-1">
              <span>거미줄 제거 중</span>
              <span className="font-mono-num">
                {(hud.cobwebBreakProgress * 3).toFixed(1)} / 3.0s
              </span>
            </div>
            <div className="h-1.5 w-full bg-slate-200 rounded-xs overflow-hidden">
              <div
                className="h-full bg-slate-900 transition-all duration-75"
                style={{ width: `${Math.min(100, hud.cobwebBreakProgress * 100)}%` }}
              />
            </div>
          </div>
        )}

        {hud.isInCobweb && hud.cobwebBreakProgress <= 0 && (
          <div className="absolute top-10 whitespace-nowrap bg-white/92 border border-slate-200 rounded-md px-2.5 py-1 text-[11px] font-semibold text-slate-800 shadow-xs">
            공격 키(좌클릭/J) 3초 꾹 눌러 거미줄 제거
          </div>
        )}
      </div>
      )}

      {/* Live Tab Scoreboard Overlay */}
      {showScoreboard && (
        <div
          data-testid="scoreboard-overlay"
          className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/45 p-4 pointer-events-auto"
        >
          <div className="w-full max-w-3xl bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden text-slate-900">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2">
                <span className="font-display text-sm font-bold text-slate-950">
                  실시간 스코어보드
                </span>
                <span className="text-xs text-slate-500">
                  {mapDef.name} · 다음 맵 {mapClock}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setScoreboardToggled(false);
                  setScoreboardHeld(false);
                }}
                className="text-xs font-semibold text-slate-500 hover:text-slate-950 cursor-pointer"
              >
                닫기 [Tab]
              </button>
            </div>

            {hud.roomMode === 'team' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
                {[
                  { title: 'RED TEAM', rows: redBoard, barColor: 'bg-red-600' },
                  { title: 'BLUE TEAM', rows: blueBoard, barColor: 'bg-blue-600' },
                ].map((col) => (
                  <div key={col.title}>
                    <div className={`px-3.5 py-2 ${col.barColor} text-white font-display text-xs font-bold flex justify-between`}>
                      <span>{col.title}</span>
                      <span className="font-mono-num">
                        {col.rows.reduce((acc, r) => acc + r.kills, 0)} K
                      </span>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {col.rows.length === 0 ? (
                        <div className="px-3.5 py-5 text-xs text-slate-400 text-center">참가자 없음</div>
                      ) : (
                        col.rows.map((entry) => {
                          const cProf = CHARACTERS[entry.characterId];
                          const eHpPct = Math.max(0, Math.min(100, (entry.hp / Math.max(1, entry.maxHp)) * 100));
                          return (
                            <div
                              key={entry.id}
                              className={`flex items-center justify-between px-3.5 py-2 text-xs ${
                                entry.isLocal ? 'bg-amber-50/70' : ''
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span
                                  className="w-2 h-2 rounded-xs shrink-0"
                                  style={{ backgroundColor: cProf?.trimColor ?? '#64748b' }}
                                />
                                <span className="font-semibold text-slate-900 truncate">
                                  {entry.name}
                                  {entry.isLocal ? ' (나)' : ''}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 shrink-0">
                                <div className="w-12 h-1.5 bg-slate-200 rounded-xs overflow-hidden">
                                  <div className="h-full bg-emerald-500" style={{ width: `${eHpPct}%` }} />
                                </div>
                                <span className="font-mono-num font-bold text-slate-900 w-10 text-right">
                                  {entry.kills}/{entry.deaths}
                                </span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div>
                <div className={`grid ${hud.scoreboard.length > 6 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'} bg-slate-50/60 border-b border-slate-100`}>
                  <div className="grid grid-cols-12 px-4 py-1.5 text-[11px] font-semibold text-slate-500">
                    <span className="col-span-5">플레이어</span>
                    <span className="col-span-3">캐릭터</span>
                    <span className="col-span-2">체력</span>
                    <span className="col-span-2 text-right">K / D</span>
                  </div>
                  {hud.scoreboard.length > 6 && (
                    <div className="hidden sm:grid grid-cols-12 px-4 py-1.5 text-[11px] font-semibold text-slate-500 border-l border-slate-200">
                      <span className="col-span-5">플레이어</span>
                      <span className="col-span-3">캐릭터</span>
                      <span className="col-span-2">체력</span>
                      <span className="col-span-2 text-right">K / D</span>
                    </div>
                  )}
                </div>
                <div className={`grid ${hud.scoreboard.length > 6 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'} divide-y divide-slate-100`}>
                  {hud.scoreboard.map((entry) => {
                    const cProf = CHARACTERS[entry.characterId];
                    return (
                      <div
                        key={entry.id}
                        className={`grid grid-cols-12 items-center px-4 py-1.5 text-xs ${
                          entry.isLocal ? 'bg-amber-50/70 font-semibold' : ''
                        }`}
                      >
                        <div className="col-span-5 flex items-center gap-1.5 min-w-0">
                          <span className="truncate text-slate-900">
                            {entry.name}
                            {entry.isLocal ? ' (나)' : ''}
                          </span>
                        </div>
                        <span className="col-span-3 text-slate-600 truncate">{cProf?.name ?? entry.characterId}</span>
                        <span className="col-span-2 font-mono-num text-slate-700">{Math.max(0, entry.hp)}</span>
                        <span className="col-span-2 font-mono-num font-bold text-slate-900 text-right">
                          {entry.kills}/{entry.deaths}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Real-time Chat Panel (Bottom-Left on desktop with smooth hover/focus upward expansion) */}
      <div
        data-testid="hud-chat-panel"
        onMouseEnter={() => setWorldChatHovered(true)}
        onMouseLeave={() => setWorldChatHovered(false)}
        className={`fixed pointer-events-auto transition-all duration-200 ease-out ${
          showTouchControls || isCompactViewport
            ? isPracticeOffline
              ? 'top-[224px] left-2.5 w-48 z-20'
              : 'top-[174px] left-2.5 w-48 z-20'
            : worldChatExpanded
              ? 'bottom-4 left-4 w-[420px] z-30'
              : 'bottom-4 left-4 w-80 z-20'
        }`}
      >
        {(showTouchControls || isCompactViewport) && !chatOpenMobile ? (
          <button
            type="button"
            onClick={() => setChatOpenMobile(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/95 border border-slate-200 text-[11px] font-semibold text-slate-800 shadow-sm cursor-pointer"
          >
            <MessageSquare className="w-3 h-3" />
            채팅 ({hud.chatMessages.length})
          </button>
        ) : (
          <div
            className={`border rounded-xl overflow-hidden text-slate-900 transition-all duration-200 ${
              worldChatExpanded && !showTouchControls && !isCompactViewport
                ? 'bg-white/98 border-slate-300 shadow-2xl'
                : 'bg-white/92 border-slate-200 shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-200/80 text-[11px] font-semibold text-slate-600">
              <span className="flex items-center gap-1.5">
                <MessageSquare className="w-3 h-3 text-rose-600" />
                월드 채팅
                {hud.chatMessages.length > 0 && (
                  <span className="font-mono-num text-[10px] text-slate-400">
                    {hud.chatMessages.length}
                  </span>
                )}
              </span>
              {(showTouchControls || isCompactViewport) && (
                <button
                  type="button"
                  onClick={() => setChatOpenMobile(false)}
                  className="text-slate-500 hover:text-slate-900 cursor-pointer"
                >
                  접기
                </button>
              )}
            </div>

            <div
              ref={chatScrollRef}
              className={`overflow-y-auto px-3 py-2 space-y-1 text-xs transition-all duration-200 ease-out ${
                showTouchControls || isCompactViewport
                  ? 'max-h-32'
                  : worldChatExpanded
                    ? 'h-[min(430px,calc(100vh-280px))]'
                    : 'h-24'
              }`}
            >
              {hud.chatMessages.length === 0 ? (
                <div className="text-slate-400 text-[11px]">Enter 키로 채팅 입력</div>
              ) : (
                hud.chatMessages.slice(-40).map((m) => (
                  <div key={m.id} className="leading-snug break-words">
                    <span className="font-semibold text-slate-950">{m.senderName}: </span>
                    <span className="text-slate-700">{m.text}</span>
                  </div>
                ))
              )}
            </div>

            <form
              onSubmit={handleChatSubmit}
              autoComplete="off"
              className="flex items-center border-t border-slate-200/80 bg-white/90"
            >
              <input
                ref={chatInputRef}
                type="text"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                data-testid="chat-input"
                maxLength={160}
                value={chatText}
                onFocus={() => setWorldChatFocused(true)}
                onBlur={() => setWorldChatFocused(false)}
                onChange={(e) => setChatText(e.target.value)}
                placeholder="메시지 입력 (Enter)"
                className="flex-1 min-w-0 px-3 py-1.5 bg-transparent text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none"
              />
              <button
                type="submit"
                tabIndex={-1}
                aria-label="전송"
                className="px-2.5 py-1.5 text-slate-600 hover:text-slate-950 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Mobile / Tablet Touch Controls (Shown on touch devices or toggled via HUD button) */}
      {showTouchControls && (
        <>
          <div
            className="fixed inset-y-0 right-0 w-1/2 pointer-events-auto z-10 touch-none"
            onTouchStart={(e) => {
              const t = e.targetTouches[0];
              lookTouchRef.current = { id: t.identifier, x: t.clientX, y: t.clientY };
            }}
          />

          <div className="fixed inset-x-0 bottom-24 pointer-events-none flex justify-between items-end px-4 z-20">
            {/* Virtual Joystick + Sprint Toggle */}
            <div className="flex flex-col items-start gap-2">
              <button
                type="button"
                data-testid="mobile-sprint-btn"
                onClick={() => {
                  setMobileSprintOn((v) => !v);
                  onToggleMobileSprint?.();
                }}
                className={`pointer-events-auto flex items-center gap-1 px-3 py-1.5 rounded-lg border text-[11px] font-bold shadow-sm cursor-pointer ${
                  mobileSprintOn || hud.settings.mobileAutoSprint
                    ? 'bg-sky-600 border-sky-700 text-white'
                    : 'bg-white/95 border-slate-300 text-slate-800'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                질주 {mobileSprintOn ? 'ON' : hud.settings.mobileAutoSprint ? '자동' : 'OFF'}
              </button>

              <div
                className="pointer-events-auto relative w-28 h-28 rounded-full bg-white/70 border-2 border-slate-900/25 flex items-center justify-center touch-none"
                onTouchStart={(e) => {
                  const touch = e.targetTouches[0];
                  const rect = e.currentTarget.getBoundingClientRect();
                  const cx = rect.left + rect.width / 2;
                  const cy = rect.top + rect.height / 2;
                  setJoystickCenter({ x: cx, y: cy });
                  const dx = touch.clientX - cx;
                  const dy = touch.clientY - cy;
                  const dist = Math.hypot(dx, dy);
                  const maxR = 40;
                  const nx = dist > maxR ? (dx / dist) * maxR : dx;
                  const ny = dist > maxR ? (dy / dist) * maxR : dy;
                  setJoystickOffset({ x: nx, y: ny });
                  onMobileMove?.(-ny / maxR, nx / maxR);
                }}
                onTouchMove={(e) => {
                  if (!joystickCenter) return;
                  const touch = e.targetTouches[0];
                  const dx = touch.clientX - joystickCenter.x;
                  const dy = touch.clientY - joystickCenter.y;
                  const dist = Math.hypot(dx, dy);
                  const maxR = 40;
                  const nx = dist > maxR ? (dx / dist) * maxR : dx;
                  const ny = dist > maxR ? (dy / dist) * maxR : dy;
                  setJoystickOffset({ x: nx, y: ny });
                  onMobileMove?.(-ny / maxR, nx / maxR);
                }}
                onTouchEnd={() => {
                  setJoystickCenter(null);
                  setJoystickOffset({ x: 0, y: 0 });
                  onMobileMove?.(0, 0);
                }}
              >
                <div
                  className="w-12 h-12 rounded-full bg-slate-950/90 border border-white/60 shadow-md"
                  style={{ transform: `translate(${joystickOffset.x}px, ${joystickOffset.y}px)` }}
                />
              </div>
            </div>

            {/* Action Buttons (Elytra, Block, Jump, Attack) */}
            <div className="pointer-events-auto flex flex-col items-end gap-2 touch-none">
              <button
                type="button"
                data-testid="mobile-elytra-btn"
                onClick={() => onMobileElytra?.()}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/95 border border-slate-300 text-slate-900 font-bold text-[11px] shadow-sm cursor-pointer active:scale-95"
              >
                <Feather className="w-3.5 h-3.5 text-sky-600" />
                {hud.isGliding
                  ? `비행 ${(hud.elytraFlightRemaining ?? 10).toFixed(1)}s`
                  : `겉날개 ${hud.elytraCooldown > 0.05 ? `${hud.elytraCooldown.toFixed(1)}s` : 'READY'}`}
              </button>

              <div className="flex items-end gap-2">
                <button
                  type="button"
                  onTouchStart={(e) => {
                    e.preventDefault();
                    onMobileBlock?.(true);
                  }}
                  onTouchEnd={() => onMobileBlock?.(false)}
                  onMouseDown={() => onMobileBlock?.(true)}
                  onMouseUp={() => onMobileBlock?.(false)}
                  className="w-13 h-13 rounded-full bg-white/95 border border-slate-300 flex flex-col items-center justify-center text-slate-900 font-semibold text-[11px] shadow-md cursor-pointer active:scale-95"
                >
                  <Shield className="w-4 h-4" />
                  방어
                </button>

                <button
                  type="button"
                  onTouchStart={(e) => {
                    e.preventDefault();
                    onMobileJump?.(true);
                  }}
                  onTouchEnd={() => onMobileJump?.(false)}
                  onMouseDown={() => onMobileJump?.(true)}
                  onMouseUp={() => onMobileJump?.(false)}
                  className="w-13 h-13 rounded-full bg-white/95 border border-slate-300 flex flex-col items-center justify-center text-slate-900 font-semibold text-[11px] shadow-md cursor-pointer active:scale-95"
                >
                  <ArrowUp className="w-4 h-4" />
                  점프
                </button>

                <button
                  type="button"
                  onTouchStart={(e) => {
                    e.preventDefault();
                    if (onMobileAttackHold) onMobileAttackHold(true);
                    else onMobileAttack?.();
                  }}
                  onTouchEnd={() => onMobileAttackHold?.(false)}
                  onTouchCancel={() => onMobileAttackHold?.(false)}
                  onMouseDown={() => {
                    if (onMobileAttackHold) onMobileAttackHold(true);
                    else onMobileAttack?.();
                  }}
                  onMouseUp={() => onMobileAttackHold?.(false)}
                  onMouseLeave={() => onMobileAttackHold?.(false)}
                  className="w-16 h-16 rounded-full bg-slate-950 border border-white/40 flex flex-col items-center justify-center text-white font-display text-xs font-bold shadow-lg cursor-pointer active:scale-95"
                >
                  <Swords className="w-5 h-5 mb-0.5 text-amber-400" />
                  공격
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Bottom-Center: Spectator Control Bar OR 6-Slot Hotbar */}
      {hud.isSpectating ? (
        <div
          data-testid="spectator-hud"
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-25 pointer-events-auto bg-slate-950/95 border border-slate-700 text-white rounded-2xl px-4 py-3 shadow-xl flex flex-wrap items-center justify-center gap-3 text-xs max-w-[calc(100vw-24px)]"
        >
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-bold">관전 모드</span>
            <span className="font-semibold text-slate-200">
              {hud.spectatorViewMode === 'follow'
                ? `대상: ${hud.spectatorTargetName || '생존자 탐색 중'} (${hud.spectatorTargetHp ?? 0}/${hud.spectatorTargetMaxHp ?? 100} HP · ${hud.spectatorTargetKills ?? 0}킬)`
                : '자유 비행 (WASD + Space/Shift)'}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {hud.spectatorViewMode === 'follow' && (
              <>
                <button
                  type="button"
                  onClick={() => onSpectatorPrev?.()}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 font-semibold cursor-pointer"
                >
                  &lt; 이전 (A)
                </button>
                <button
                  type="button"
                  onClick={() => onSpectatorNext?.()}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 font-semibold cursor-pointer"
                >
                  다음 (D) &gt;
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => onToggleSpectatorMode?.()}
              className="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 font-semibold cursor-pointer"
            >
              시점 전환 (V)
            </button>
            {onExitMatch && (
              <button
                type="button"
                onClick={onExitMatch}
                className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-500 font-semibold cursor-pointer"
              >
                게임 나가기
              </button>
            )}
          </div>
        </div>
      ) : (
      <div className="fixed bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 z-20 max-w-[calc(100vw-16px)]">
        {hud.activeBuffs && hud.activeBuffs.length > 0 && (
          <div
            data-testid="active-buffs-strip"
            className="flex flex-wrap items-center justify-center gap-1.5"
          >
            {hud.activeBuffs.map((buff) => (
              <div
                key={buff.kind}
                data-testid={`active-buff-${buff.kind}`}
                className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-slate-950/92 border border-white/15 text-white text-[11px] font-semibold shadow-sm"
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: buff.color }}
                />
                <span>{buff.label}</span>
                <span className="text-slate-300 text-[10px]">{buff.shortDesc}</span>
                <span className="font-mono-num font-bold text-amber-300">
                  {Math.ceil(buff.remainingSec)}s
                </span>
              </div>
            ))}
          </div>
        )}
        <div className="text-xs font-medium text-slate-900 bg-white/95 border border-slate-200 rounded-md px-2.5 py-0.5 shadow-xs whitespace-nowrap">
          {activeWeapon ? (
            <>
              {activeWeapon.name}
              {(hud.slotMaxCharges[hud.activeSlot] ?? 1) > 1 && (
                <span className="text-amber-700 font-mono-num ml-1.5 font-semibold">
                  x{hud.slotCharges[hud.activeSlot]}/{hud.slotMaxCharges[hud.activeSlot]}
                </span>
              )}
              <span className="text-slate-400 mx-1.5">·</span>
              <span className="text-slate-600">{activeWeapon.role}</span>
            </>
          ) : (
            <span className="text-slate-400">빈 슬롯</span>
          )}
        </div>

        <div className="flex items-center gap-1 sm:gap-1.5 bg-white/95 border border-slate-200 rounded-xl p-1.5 pointer-events-auto shadow-sm max-w-full">
          {hud.loadout.map((slot, idx) => {
            if (!slot) {
              return (
                <div
                  key={`empty-${idx}`}
                  data-slot-index={idx}
                  aria-label={`${idx + 1}번 빈 슬롯`}
                  className="relative w-9 h-9 sm:w-12 sm:h-12 rounded-lg border border-dashed border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center text-slate-300 select-none"
                >
                  <span className="absolute top-0.5 left-1 sm:left-1.5 font-mono-num text-[9px] sm:text-[10px]">
                    {idx + 1}
                  </span>
                  <span className="text-xs font-bold">-</span>
                </div>
              );
            }

            const active = hud.activeSlot === idx;
            const cd = hud.slotCooldowns[idx] ?? 0;
            const maxCd = hud.slotMaxCooldowns[idx] ?? 0;
            const charges = hud.slotCharges[idx] ?? 1;
            const maxCharges = hud.slotMaxCharges[idx] ?? 1;
            const isStackable = maxCharges > 1;
            const cdPct = maxCd > 0 ? Math.min(100, (cd / maxCd) * 100) : 0;
            const isBlocked = cd > 0.05 && (!isStackable || charges <= 0);
            const isRechargingWithStock = cd > 0.05 && isStackable && charges > 0;

            return (
              <button
                key={`${hud.characterId}-${slot.id}-${idx}`}
                type="button"
                tabIndex={-1}
                data-slot-index={idx}
                aria-label={`${idx + 1}번 ${slot.name}`}
                title={`${idx + 1}번 ${slot.name} — ${slot.role}`}
                onClick={(e) => {
                  e.currentTarget.blur();
                  onSelectSlot(idx);
                }}
                className={`relative w-9 h-9 sm:w-12 sm:h-12 rounded-lg border flex flex-col items-center justify-center transition-colors cursor-pointer overflow-hidden ${
                  active
                    ? 'bg-slate-900 border-slate-900 text-white'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-400'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-1 sm:left-1.5 font-mono-num text-[9px] sm:text-[10px] ${
                    active ? 'text-slate-300' : 'text-slate-400'
                  }`}
                >
                  {idx + 1}
                </span>

                {isStackable && (
                  <span
                    className={`absolute top-0.5 right-1 font-mono-num text-[9px] sm:text-[10px] font-bold leading-none ${
                      charges > 0
                        ? active
                          ? 'text-amber-300'
                          : 'text-amber-700'
                        : 'text-red-500'
                    }`}
                  >
                    {charges}
                  </span>
                )}

                <WeaponIcon id={slot.id} className="w-5 h-5 sm:w-6 sm:h-6" />

                {isRechargingWithStock && (
                  <div className="absolute inset-x-0 bottom-0 h-1 bg-slate-200">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-75"
                      style={{ width: `${Math.max(8, 100 - cdPct)}%` }}
                    />
                  </div>
                )}

                {isBlocked && (
                  <div
                    className="absolute inset-x-0 bottom-0 bg-slate-950/85 flex items-center justify-center font-mono-num text-[11px] font-bold text-amber-300 rounded-b-lg"
                    style={{ height: `${Math.max(40, cdPct)}%` }}
                  >
                    {cd.toFixed(1)}
                  </div>
                )}
              </button>
            );
          })}

          <div className="w-px h-8 bg-slate-200 mx-0.5" aria-hidden="true" />

          {hud.canDoubleJump && (
            <div
              data-testid="hud-double-jump-status"
              className={`px-2 py-1 rounded-lg border text-center min-w-14 ${
                (hud.jumpCount ?? 0) >= 2
                  ? 'bg-slate-100 border-slate-300'
                  : (hud.jumpCount ?? 0) === 1
                    ? 'bg-sky-50 border-sky-300'
                    : 'bg-emerald-50 border-emerald-300'
              }`}
            >
              <div className="text-[10px] font-medium text-slate-500">더블점프</div>
              <div
                className={`font-mono-num text-xs font-bold ${
                  (hud.jumpCount ?? 0) >= 2
                    ? 'text-slate-500'
                    : (hud.jumpCount ?? 0) === 1
                      ? 'text-sky-700'
                      : 'text-emerald-700'
                }`}
              >
                x{Math.min(2, hud.jumpCount ?? 0)}
              </div>
            </div>
          )}

          <div
            data-testid="hud-elytra-status"
            className={`px-2 py-1 rounded-lg border text-center min-w-16 ${
              hud.isGliding
                ? (hud.elytraFlightRemaining ?? 10) <= 2.5
                  ? 'bg-rose-50 border-rose-300'
                  : 'bg-sky-50 border-sky-300'
                : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="text-[10px] font-medium text-slate-500">겉날개 [F]</div>
            <div
              className={`font-mono-num text-xs font-bold ${
                hud.isGliding
                  ? (hud.elytraFlightRemaining ?? 10) <= 2.5
                    ? 'text-rose-600 animate-pulse'
                    : 'text-sky-700'
                  : 'text-slate-900'
              }`}
            >
              {hud.isGliding
                ? `비행 ${(hud.elytraFlightRemaining ?? 10).toFixed(1)}s`
                : hud.elytraCooldown > 0.05
                  ? `${hud.elytraCooldown.toFixed(1)}s`
                  : 'READY'}
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Practice 20-Map & Character Quick Switcher Modal ([M]) */}
      {isPracticeOffline && practiceModalOpen && (
        <div
          data-testid="practice-quick-modal"
          className="fixed inset-0 z-35 flex items-center justify-center bg-slate-950/50 p-4 pointer-events-auto"
        >
          <div className="w-full max-w-4xl bg-white border border-slate-200 rounded-2xl shadow-xl p-4 sm:p-5 space-y-3 text-slate-900 overflow-hidden">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-200">
              <div>
                <h2 className="font-display text-lg font-bold text-slate-950">
                  연습장 맵 &amp; 캐릭터 즉시 변경 [M]
                </h2>
                <p className="text-xs text-slate-500">
                  현재 맵: <strong className="text-slate-900">{mapDef.name}</strong> · 캐릭터:{' '}
                  <strong className="text-slate-900">{prof.name}</strong>
                </p>
              </div>
              <button
                type="button"
                data-testid="practice-quick-modal-close"
                onClick={() => setPracticeModalOpen(false)}
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                aria-label="닫기"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <div className="text-xs font-bold text-slate-800">캐릭터 변경 (11명)</div>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
                {CHARACTER_LIST.map((c) => {
                  const active = hud.characterId === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      data-testid={`practice-modal-char-${c.id}`}
                      onClick={() => onChangeCharacter?.(c.id)}
                      className={`px-2 py-1 rounded-lg border text-xs font-semibold text-left truncate cursor-pointer transition-colors ${
                        active
                          ? 'bg-slate-950 border-slate-950 text-white'
                          : 'bg-white border-slate-200 text-slate-800 hover:border-slate-400'
                      }`}
                    >
                      {c.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <div className="text-xs font-bold text-slate-800">보급 코어 버프 즉시 테스트</div>
                <div className="grid grid-cols-2 gap-1.5">
                  {ARENA_BUFF_ORDER.map((bKind) => {
                    const bDef = ARENA_BUFF_DEFINITIONS[bKind];
                    return (
                      <button
                        key={bKind}
                        type="button"
                        data-testid={`practice-buff-${bKind}`}
                        onClick={() => onTriggerPracticeBuff?.(bKind)}
                        className="px-2 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-left cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-900">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: bDef.color }}
                          />
                          <span className="truncate">{bDef.label}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 truncate">{bDef.shortDesc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-xs font-bold text-slate-800">돌발 아레나 서지 이벤트 발동</div>
                <div className="grid grid-cols-2 gap-1.5">
                  {ARENA_EVENT_ORDER.map((eKind) => {
                    const eDef = ARENA_SURGE_EVENTS[eKind];
                    return (
                      <button
                        key={eKind}
                        type="button"
                        data-testid={`practice-event-${eKind}`}
                        onClick={() => onTriggerPracticeEvent?.(eKind)}
                        className="px-2 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-left cursor-pointer transition-colors"
                      >
                        <div
                          className="text-[11px] font-bold truncate"
                          style={{ color: eDef.accent }}
                        >
                          {eDef.title}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate">{eDef.durationSec}초 지속</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-800">아레나 맵 변경 (전체 20종)</span>
                <div className="flex flex-wrap items-center gap-1">
                  {(
                    [
                      { id: 'all', label: '전체 20' },
                      { id: 'industrial', label: '산업·도시' },
                      { id: 'nature', label: '자연·유적' },
                      { id: 'citadel', label: '요새·용암' },
                      { id: 'cosmic', label: '우주·특수' },
                    ] as Array<{ id: 'all' | MapCategory; label: string }>
                  ).map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setPracticeCatFilter(cat.id)}
                      className={`px-2 py-0.5 rounded-md text-[11px] font-semibold cursor-pointer ${
                        practiceCatFilter === cat.id
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                {MAP_ORDER.filter(
                  (mId) =>
                    practiceCatFilter === 'all' ||
                    MAP_DEFINITIONS[mId].category === practiceCatFilter
                ).map((mId) => {
                  const def = MAP_DEFINITIONS[mId];
                  const active = hud.currentMapId === mId;
                  return (
                    <button
                      key={mId}
                      type="button"
                      data-testid={`practice-modal-map-${mId}`}
                      onClick={() => {
                        onChangeMap?.(mId);
                        setPracticeModalOpen(false);
                      }}
                      className={`px-2.5 py-1.5 rounded-xl border text-left transition-colors cursor-pointer ${
                        active
                          ? 'bg-slate-950 border-slate-950 text-white'
                          : 'bg-white border-slate-200 text-slate-800 hover:border-slate-400'
                      }`}
                    >
                      <span
                        className="text-[9px] font-bold px-1.5 py-0.5 rounded inline-block"
                        style={{
                          backgroundColor: active ? 'rgba(255,255,255,0.16)' : `${def.accentHex}18`,
                          color: active ? '#ffffff' : def.accentHex,
                        }}
                      >
                        {def.badge}
                      </span>
                      <div className="font-display text-xs font-bold mt-0.5 truncate">{def.name}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
