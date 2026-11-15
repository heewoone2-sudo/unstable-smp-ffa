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
} from 'lucide-react';
import { CHARACTERS } from '../game/characters';
import { MAP_DEFINITIONS } from '../game/maps';
import type { HudSnapshot } from '../game/types';
import { WeaponIcon } from './WeaponIcons';

interface GameHudProps {
  hud: HudSnapshot;
  onSelectSlot: (idx: number) => void;
  onCycleCameraMode: () => void;
  onToggleMute: () => void;
  onOpenSettings: () => void;
  onPause: () => void;
  onRestart: () => void;
  onSendChat?: (text: string) => void;
  onToggleMobileSprint?: () => void;
  onMobileElytra?: () => void;
  onMobileAttack?: () => void;
  onMobileAttackHold?: (pressed: boolean) => void;
  onMobileJump?: (pressed: boolean) => void;
  onMobileBlock?: (pressed: boolean) => void;
  onMobileMove?: (forward: number, right: number) => void;
  onMobileLook?: (dx: number, dy: number) => void;
}

export function GameHud({
  hud,
  onSelectSlot,
  onCycleCameraMode,
  onToggleMute,
  onOpenSettings,
  onPause,
  onRestart,
  onSendChat,
  onToggleMobileSprint,
  onMobileElytra,
  onMobileAttack,
  onMobileAttackHold,
  onMobileJump,
  onMobileBlock,
  onMobileMove,
  onMobileLook,
}: GameHudProps) {
  const prof = CHARACTERS[hud.characterId];
  const mapDef = MAP_DEFINITIONS[hud.currentMapId] ?? MAP_DEFINITIONS.container_yard;
  const mapRem = Math.max(0, Math.floor(hud.mapTimeRemaining));
  const mapClock = `${String(Math.floor(mapRem / 60)).padStart(2, '0')}:${String(mapRem % 60).padStart(2, '0')}`;
  const hpPct = Math.max(0, Math.min(100, (hud.hp / hud.maxHp) * 100));
  const absPct = Math.max(0, Math.min(100, (hud.absorption / 30) * 100));
  const activeWeapon = hud.loadout[hud.activeSlot] ?? hud.loadout[0];
  const lowHp = hud.hp <= hud.maxHp * 0.3;

  const [showTouchControls, setShowTouchControls] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia?.('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
  });
  const [mobileSprintOn, setMobileSprintOn] = useState(false);
  const [scoreboardHeld, setScoreboardHeld] = useState(false);
  const [scoreboardToggled, setScoreboardToggled] = useState(false);
  const [chatText, setChatText] = useState('');
  const [chatOpenMobile, setChatOpenMobile] = useState(false);
  const chatInputRef = useRef<HTMLInputElement | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  const [joystickCenter, setJoystickCenter] = useState<{ x: number; y: number } | null>(null);
  const [joystickOffset, setJoystickOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const lookTouchRef = useRef<{ id: number; x: number; y: number } | null>(null);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [hud.chatMessages.length]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Tab') {
        if (document.activeElement !== chatInputRef.current) {
          e.preventDefault();
          setScoreboardHeld(true);
        }
      } else if (e.code === 'Enter') {
        const active = document.activeElement;
        if (active !== chatInputRef.current) {
          e.preventDefault();
          document.exitPointerLock?.();
          setChatOpenMobile(true);
          window.setTimeout(() => chatInputRef.current?.focus(), 10);
        }
      } else if (e.code === 'Escape' && document.activeElement === chatInputRef.current) {
        chatInputRef.current?.blur();
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
  }, []);

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

      {/* Top-Left: Clean Light Vitality & Map Strip */}
      <div className="fixed top-3 left-3 sm:top-4 sm:left-4 w-64 sm:w-76 bg-white/95 border border-slate-200 rounded-xl px-3.5 py-2.5 shadow-sm text-slate-900">
        <div className="flex items-center justify-between gap-2 pb-1.5 mb-1.5 border-b border-slate-100 text-[11px]">
          <div className="flex items-center gap-1.5 min-w-0">
            <MapPin className="w-3 h-3 text-blue-600 shrink-0" />
            <span className="font-display font-bold text-slate-900 truncate" data-testid="hud-map-name">
              {mapDef.name}
            </span>
            {hud.roomMode === 'team' && (hud.playerTeam === 'red' || hud.playerTeam === 'blue') && (
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold text-white shrink-0 ${
                  hud.playerTeam === 'red' ? 'bg-red-600' : 'bg-blue-600'
                }`}
              >
                {hud.playerTeam === 'red' ? '레드팀' : '블루팀'}
              </span>
            )}
          </div>
          <span
            data-testid="hud-map-timer"
            title="다음 맵 전환까지 남은 시간"
            className="font-mono-num font-bold text-slate-600 shrink-0"
          >
            {mapClock}
          </span>
        </div>

        <div className="flex items-baseline justify-between mb-1.5">
          <div className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-xs border border-black/20"
              style={{ backgroundColor: prof.trimColor }}
            />
            <span className="font-display text-sm font-bold tracking-tight text-slate-950">
              {prof.name}
            </span>
          </div>
          <span className="font-mono-num text-xs font-bold text-slate-800">
            {hud.hp} / {hud.maxHp}
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
      <div className="fixed top-3 right-3 sm:top-4 sm:right-4 flex flex-col sm:flex-row items-end sm:items-start gap-2">
        <div className="bg-white/95 border border-slate-200 rounded-xl px-3 py-2 flex items-center gap-3 sm:gap-4 shadow-sm text-slate-900">
          {hud.settings.showFps && (
            <div>
              <div className="text-[10px] font-medium text-slate-500">FPS</div>
              <div className="font-display font-mono-num text-base sm:text-lg font-bold text-slate-900 leading-tight">
                {hud.fps}
              </div>
            </div>
          )}

          {hud.mode === 'online_world' && (
            <div>
              <div className="text-[10px] font-medium text-slate-500">접속</div>
              <div className="font-display font-mono-num text-base sm:text-lg font-bold text-emerald-700 leading-tight">
                {Math.max(1, hud.multiplayer.peers.length)}명
              </div>
            </div>
          )}

          {(hud.mode === 'multiplayer' || hud.mode === 'link_duel') && hud.multiplayer.roomCode && (
            <div>
              <div className="text-[10px] font-medium text-slate-500">코드</div>
              <div className="font-display font-mono-num text-base sm:text-lg font-bold text-slate-900 leading-tight">
                {hud.multiplayer.roomCode}
              </div>
            </div>
          )}

          <div>
            <div className="text-[10px] font-medium text-slate-500">처치</div>
            <div className="font-display font-mono-num text-base sm:text-lg font-bold text-slate-950 leading-tight">
              {hud.kills}
              {hud.mode !== 'online_world' && (
                <span className="text-xs text-slate-400">/{hud.targetKills}</span>
              )}
            </div>
          </div>

          <div>
            <div className="text-[10px] font-medium text-slate-500">시간</div>
            <div className="font-display font-mono-num text-base sm:text-lg font-bold text-slate-700 leading-tight">
              {hud.elapsedTime}s
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 pointer-events-auto">
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
            className={`w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl border shadow-sm cursor-pointer transition-colors ${
              showScoreboard
                ? 'bg-slate-950 border-slate-950 text-white'
                : 'bg-white/95 border-slate-200 text-slate-700 hover:text-slate-950'
            }`}
          >
            <ListOrdered className="w-4 h-4" />
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
            className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl bg-white/95 border border-slate-200 text-slate-700 hover:text-slate-950 cursor-pointer shadow-sm"
          >
            <Settings className="w-4 h-4" />
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
            className={`w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl border shadow-sm cursor-pointer transition-colors ${
              showTouchControls
                ? 'bg-slate-950 border-slate-950 text-white'
                : 'bg-white/95 border-slate-200 text-slate-700 hover:text-slate-950'
            }`}
          >
            <Gamepad2 className="w-4 h-4" />
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
            className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl bg-white/95 border border-slate-200 text-slate-700 hover:text-slate-950 cursor-pointer shadow-sm"
          >
            {hud.muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
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
                className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl bg-white/95 border border-slate-200 text-slate-700 hover:text-slate-950 cursor-pointer shadow-sm"
              >
                <RotateCcw className="w-4 h-4" />
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
            className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl bg-white/95 border border-slate-200 text-slate-700 hover:text-slate-950 cursor-pointer shadow-sm"
          >
            <Pause className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Transient Callout */}
      {hud.calloutTimer > 0 && hud.calloutText && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 pointer-events-none">
          <div className="font-display text-sm sm:text-base font-bold px-4 py-1.5 rounded-lg bg-white/95 border border-slate-200 text-slate-900 shadow-sm">
            {hud.calloutText}
          </div>
        </div>
      )}

      {/* Kill Feed */}
      {hud.killFeed.length > 0 && (
        <div className="fixed top-20 right-4 flex flex-col items-end gap-1 pointer-events-none">
          {hud.killFeed.map((item) => (
            <div
              key={item.id}
              className="text-xs font-semibold px-2.5 py-1 rounded-md bg-white/90 border border-slate-200 text-slate-800 shadow-xs"
            >
              {item.text}
            </div>
          ))}
        </div>
      )}

      {/* Center Crosshair + Hitmarker + 3s Cobweb Break Progress */}
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
            <g stroke={hud.hitmarkerCrit ? '#d97706' : '#dc2626'} strokeWidth="2.5">
              <line x1="4" y1="4" x2="9" y2="9" />
              <line x1="22" y1="4" x2="17" y2="9" />
              <line x1="4" y1="22" x2="9" y2="17" />
              <line x1="22" y1="22" x2="17" y2="17" />
            </g>
          )}
        </svg>

        {hud.hitmarkerTimer > 0 && hud.lastHitText && (
          <div
            className={`absolute left-7 -top-4 whitespace-nowrap font-display font-mono-num text-sm font-bold hud-text-stroke ${
              hud.hitmarkerCrit ? 'text-amber-300 scale-110' : 'text-white'
            }`}
          >
            {hud.lastHitText}
          </div>
        )}

        {activeWeapon.id === 'mace' && hud.fallHeightReady >= 2 && (
          <div className="absolute top-7 whitespace-nowrap font-mono-num text-xs font-bold text-white hud-text-stroke">
            SMASH +{hud.fallHeightReady}m
          </div>
        )}

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

      {/* Live Tab Scoreboard Overlay */}
      {showScoreboard && (
        <div
          data-testid="scoreboard-overlay"
          className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/45 p-4 pointer-events-auto"
        >
          <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden text-slate-900">
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
                                {entry.isBot && (
                                  <span className="px-1 py-0.5 rounded bg-slate-200 text-slate-600 text-[9px] font-bold">
                                    BOT
                                  </span>
                                )}
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
              <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                <div className="grid grid-cols-12 px-4 py-2 text-[11px] font-semibold text-slate-500 bg-slate-50/60">
                  <span className="col-span-5">플레이어</span>
                  <span className="col-span-3">캐릭터</span>
                  <span className="col-span-2">체력</span>
                  <span className="col-span-2 text-right">K / D</span>
                </div>
                {hud.scoreboard.map((entry) => {
                  const cProf = CHARACTERS[entry.characterId];
                  return (
                    <div
                      key={entry.id}
                      className={`grid grid-cols-12 items-center px-4 py-2 text-xs ${
                        entry.isLocal ? 'bg-amber-50/70 font-semibold' : ''
                      }`}
                    >
                      <div className="col-span-5 flex items-center gap-1.5 min-w-0">
                        <span className="truncate text-slate-900">
                          {entry.name}
                          {entry.isLocal ? ' (나)' : ''}
                        </span>
                        {entry.isBot && (
                          <span className="px-1 py-0.5 rounded bg-slate-200 text-slate-600 text-[9px] font-bold shrink-0">
                            BOT
                          </span>
                        )}
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
            )}
          </div>
        </div>
      )}

      {/* Real-time Chat Panel (Bottom-Left on desktop, collapsible top-left on mobile) */}
      <div
        data-testid="hud-chat-panel"
        className={`fixed pointer-events-auto z-20 ${
          showTouchControls ? 'top-36 left-3 w-60' : 'bottom-4 left-4 w-76'
        }`}
      >
        {showTouchControls && !chatOpenMobile ? (
          <button
            type="button"
            onClick={() => setChatOpenMobile(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/95 border border-slate-200 text-xs font-semibold text-slate-800 shadow-sm cursor-pointer"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            채팅 ({hud.chatMessages.length})
          </button>
        ) : (
          <div className="bg-white/95 border border-slate-200 rounded-xl shadow-sm overflow-hidden text-slate-900">
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-200/80 text-[11px] font-semibold text-slate-600">
              <span className="flex items-center gap-1.5">
                <MessageSquare className="w-3 h-3" />
                월드 채팅
              </span>
              {showTouchControls && (
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
              className="max-h-32 overflow-y-auto px-3 py-2 space-y-1 text-xs"
            >
              {hud.chatMessages.length === 0 ? (
                <div className="text-slate-400 text-[11px]">Enter 키로 채팅 입력</div>
              ) : (
                hud.chatMessages.slice(-20).map((m) => (
                  <div key={m.id} className="leading-snug break-words">
                    <span className="font-semibold text-slate-950">{m.senderName}: </span>
                    <span className="text-slate-700">{m.text}</span>
                  </div>
                ))
              )}
            </div>

            <form
              onSubmit={handleChatSubmit}
              className="flex items-center border-t border-slate-200/80 bg-white/80"
            >
              <input
                ref={chatInputRef}
                type="text"
                data-testid="chat-input"
                maxLength={160}
                value={chatText}
                onChange={(e) => setChatText(e.target.value)}
                placeholder="메시지 입력 (Enter)"
                className="flex-1 min-w-0 px-3 py-1.5 bg-transparent text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none"
              />
              <button
                type="submit"
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
                겉날개 {hud.elytraCooldown > 0.05 ? `${hud.elytraCooldown.toFixed(1)}s` : 'READY'}
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

      {/* Bottom-Center: Clean 6-Slot Hotbar */}
      <div className="fixed bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 z-20 max-w-[calc(100vw-16px)]">
        <div className="text-xs font-medium text-slate-900 bg-white/95 border border-slate-200 rounded-md px-2.5 py-0.5 shadow-xs whitespace-nowrap">
          {activeWeapon.name}
          {(hud.slotMaxCharges[hud.activeSlot] ?? 1) > 1 && (
            <span className="text-amber-700 font-mono-num ml-1.5 font-semibold">
              x{hud.slotCharges[hud.activeSlot]}/{hud.slotMaxCharges[hud.activeSlot]}
            </span>
          )}
          <span className="text-slate-400 mx-1.5">·</span>
          <span className="text-slate-600">{activeWeapon.role}</span>
        </div>

        <div className="flex items-center gap-1 sm:gap-1.5 bg-white/95 border border-slate-200 rounded-xl p-1.5 pointer-events-auto shadow-sm overflow-x-auto max-w-full">
          {hud.loadout.map((slot, idx) => {
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
                className={`relative w-12 h-12 sm:w-13 sm:h-13 rounded-lg border flex flex-col items-center justify-center transition-colors cursor-pointer overflow-hidden ${
                  active
                    ? 'bg-slate-900 border-slate-900 text-white'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-400'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-1.5 font-mono-num text-[10px] ${
                    active ? 'text-slate-300' : 'text-slate-400'
                  }`}
                >
                  {idx + 1}
                </span>

                {isStackable && (
                  <span
                    className={`absolute top-0.5 right-1 font-mono-num text-[10px] font-bold leading-none ${
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

                <WeaponIcon id={slot.id} className="w-6 h-6" />

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

          <div className="px-2 py-1 rounded-lg bg-slate-50 border border-slate-200 text-center min-w-14">
            <div className="text-[10px] font-medium text-slate-500">겉날개 [F]</div>
            <div className="font-mono-num text-xs font-bold text-slate-900">
              {hud.elytraCooldown > 0.05 ? `${hud.elytraCooldown.toFixed(1)}s` : 'READY'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
