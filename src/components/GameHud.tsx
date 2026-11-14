import { Volume2, VolumeX, Pause, RotateCcw } from 'lucide-react';
import { CHARACTERS } from '../game/characters';
import type { HudSnapshot } from '../game/types';
import { WeaponIcon } from './WeaponIcons';

interface GameHudProps {
  hud: HudSnapshot;
  onSelectSlot: (idx: number) => void;
  onCycleCameraMode: () => void;
  onToggleMute: () => void;
  onPause: () => void;
  onRestart: () => void;
}

export function GameHud({
  hud,
  onSelectSlot,
  onCycleCameraMode,
  onToggleMute,
  onPause,
  onRestart,
}: GameHudProps) {
  const prof = CHARACTERS[hud.characterId];
  const hpPct = Math.max(0, Math.min(100, (hud.hp / hud.maxHp) * 100));
  const absPct = Math.max(0, Math.min(100, (hud.absorption / 30) * 100));
  const activeWeapon = hud.loadout[hud.activeSlot] ?? hud.loadout[0];
  const lowHp = hud.hp <= hud.maxHp * 0.3;

  const cameraLabel =
    hud.cameraMode === 'shiftlock'
      ? '3인칭 시프트락 [R-Shift/V]'
      : hud.cameraMode === 'firstperson'
        ? '1인칭 시점 [R-Shift/V]'
        : '자유 3인칭 [R-Shift/V]';

  const cameraBtnTone =
    hud.cameraMode === 'shiftlock'
      ? 'bg-sky-500/20 border-sky-400/50 text-sky-200'
      : hud.cameraMode === 'firstperson'
        ? 'bg-amber-500/20 border-amber-400/55 text-amber-200'
        : 'bg-slate-800/80 border-white/15 text-slate-300';

  const statusText = hud.isBurning
    ? '화상 피해!'
    : hud.isInCobweb
      ? '거미줄 속박!'
      : hud.isInWater
        ? '물 속 (소화)'
        : hud.isStealthed
          ? '은신 중'
          : hud.isBlocking
            ? '방어 중'
            : hud.isGliding
              ? '활공 중'
              : '마우스 조준';

  return (
    <div className="fixed inset-0 z-10 pointer-events-none select-none">
      {lowHp && (
        <div
          className="fixed inset-0 pointer-events-none"
          style={{
            boxShadow: 'inset 0 0 90px rgba(220, 38, 38, 0.55)',
          }}
        />
      )}

      {!lowHp && hud.isBurning && (
        <div
          className="fixed inset-0 pointer-events-none"
          style={{
            boxShadow: 'inset 0 0 75px rgba(249, 115, 22, 0.42)',
          }}
        />
      )}

      {/* Top-Left: Vitality + 3-Way Camera Toggle */}
      <div className="fixed top-4 left-4 flex flex-col gap-2 w-80">
        <div className="bg-[#0e111d]/88 border border-white/15 rounded-lg px-3.5 py-2.5">
          <div className="flex items-baseline justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-xs border border-black/40"
                style={{ backgroundColor: prof.trimColor }}
              />
              <span className="font-display text-sm font-bold text-white tracking-wide">
                {prof.name}
              </span>
            </div>
            <span className="font-mono-num text-xs font-bold text-slate-200">
              {hud.hp} / {hud.maxHp}
              {hud.absorption > 0 ? <span className="text-amber-400"> +{hud.absorption}</span> : null}
            </span>
          </div>

          <div className="h-2.5 w-full bg-slate-900 rounded-xs overflow-hidden border border-white/10">
            <div
              className="h-full transition-all duration-150"
              style={{
                width: `${hpPct}%`,
                backgroundColor: lowHp ? '#ef4444' : hud.isBurning ? '#f97316' : '#22c55e',
              }}
            />
          </div>

          {hud.absorption > 0 && (
            <div className="h-1.5 w-full bg-slate-900 rounded-xs overflow-hidden mt-1">
              <div
                className="h-full bg-amber-400 transition-all duration-150"
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
              className={`pointer-events-auto px-2 py-0.5 rounded border text-[11px] font-medium cursor-pointer transition-colors whitespace-nowrap ${cameraBtnTone}`}
            >
              {cameraLabel}
            </button>
            <span
              className={`truncate font-medium ${
                hud.isBurning
                  ? 'text-orange-400'
                  : hud.isInCobweb
                    ? 'text-slate-200'
                    : hud.isInWater
                      ? 'text-sky-300'
                      : 'text-slate-400'
              }`}
            >
              {statusText}
            </span>
          </div>
        </div>
      </div>

      {/* Top-Right: Match Counter & Utility Buttons */}
      <div className="fixed top-4 right-4 flex items-start gap-2.5">
        <div className="bg-[#0e111d]/88 border border-white/15 rounded-lg px-4 py-2 flex items-center gap-5">
          {hud.mode === 'online_world' && (
            <div>
              <div className="text-[10px] font-semibold tracking-wider text-slate-400">ONLINE</div>
              <div className="font-display font-mono-num text-xl font-bold text-emerald-300 leading-tight">
                {Math.max(1, hud.multiplayer.peers.length)}명
              </div>
            </div>
          )}

          {(hud.mode === 'multiplayer' || hud.mode === 'link_duel') && hud.multiplayer.roomCode && (
            <div>
              <div className="text-[10px] font-semibold tracking-wider text-slate-400">
                {hud.mode === 'link_duel' ? 'LINK' : 'ROOM'}
              </div>
              <div className="font-display font-mono-num text-xl font-bold text-purple-300 leading-tight">
                {hud.multiplayer.roomCode}
              </div>
            </div>
          )}

          <div>
            <div className="text-[10px] font-semibold tracking-wider text-slate-400">KILLS</div>
            <div className="font-display font-mono-num text-xl font-bold text-white leading-tight">
              {hud.kills}
              {hud.mode !== 'online_world' && (
                <span className="text-sm text-slate-400">/{hud.targetKills}</span>
              )}
            </div>
          </div>

          <div>
            <div className="text-[10px] font-semibold tracking-wider text-slate-400">TIME</div>
            <div className="font-display font-mono-num text-xl font-bold text-amber-300 leading-tight">
              {hud.elapsedTime}s
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 pointer-events-auto">
          <button
            type="button"
            tabIndex={-1}
            aria-label={hud.muted ? '소리 켜기 [M]' : '음소거 [M]'}
            title={hud.muted ? '소리 켜기 (M)' : '음소거 (M)'}
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleMute();
            }}
            className="w-10 h-10 flex items-center justify-center rounded-lg bg-[#0e111d]/88 border border-white/15 text-slate-200 hover:border-white/35 hover:text-white cursor-pointer"
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
                className="w-10 h-10 flex items-center justify-center rounded-lg bg-[#0e111d]/88 border border-white/15 text-slate-200 hover:border-white/35 hover:text-white cursor-pointer"
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
            className="w-10 h-10 flex items-center justify-center rounded-lg bg-[#0e111d]/88 border border-white/15 text-slate-200 hover:border-white/35 hover:text-white cursor-pointer"
          >
            <Pause className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Transient Smash / Action Callout */}
      {hud.calloutTimer > 0 && hud.calloutText && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 pointer-events-none">
          <div
            className="font-display text-lg font-bold tracking-wide px-4 py-1.5 rounded-md bg-[#0e111d]/90 border border-white/15 hud-text-stroke"
            style={{ color: hud.calloutAccent }}
          >
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
              className="text-xs font-medium px-2.5 py-1 rounded bg-[#0e111d]/82 border border-white/10"
              style={{ color: item.color }}
            >
              {item.text}
            </div>
          ))}
        </div>
      )}

      {/* Center Crosshair + Hitmarker + Damage/CRIT Callout */}
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center">
        <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
          <line x1="13" y1="3" x2="13" y2="9" stroke="#ffffff" strokeWidth="2" strokeOpacity="0.9" />
          <line x1="13" y1="17" x2="13" y2="23" stroke="#ffffff" strokeWidth="2" strokeOpacity="0.9" />
          <line x1="3" y1="13" x2="9" y2="13" stroke="#ffffff" strokeWidth="2" strokeOpacity="0.9" />
          <line x1="17" y1="13" x2="23" y2="13" stroke="#ffffff" strokeWidth="2" strokeOpacity="0.9" />
          <circle cx="13" cy="13" r="1.5" fill="#fbbf24" />
          {hud.hitmarkerTimer > 0 && (
            <g stroke={hud.hitmarkerCrit ? '#fbbf24' : '#ef4444'} strokeWidth="2.5">
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
          <div className="absolute top-7 whitespace-nowrap font-mono-num text-xs font-bold text-sky-300 hud-text-stroke">
            SMASH +{hud.fallHeightReady}m
          </div>
        )}
      </div>

      {/* Bottom-Center: Dynamic Per-Character 6-Slot Combat Hotbar (Mouse Wheel / 1-6) */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5">
        <div className="text-xs font-medium text-slate-100 bg-[#0e111d]/82 border border-white/10 rounded px-2.5 py-0.5">
          {activeWeapon.name}
          {(hud.slotMaxCharges[hud.activeSlot] ?? 1) > 1 && (
            <span className="text-amber-300 font-mono-num ml-1.5">
              x{hud.slotCharges[hud.activeSlot]}/{hud.slotMaxCharges[hud.activeSlot]}
            </span>
          )}{' '}
          · <span className="text-slate-300">{activeWeapon.role}</span>
        </div>

        <div className="flex items-center gap-1.5 bg-[#0e111d]/90 border border-white/15 rounded-lg p-1.5 pointer-events-auto">
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
                className={`relative w-13 h-13 rounded-md border flex flex-col items-center justify-center transition-colors cursor-pointer overflow-hidden ${
                  active
                    ? 'bg-[#232844] border-amber-400 text-white'
                    : 'bg-[#141828] border-white/10 text-slate-300 hover:border-white/25'
                }`}
              >
                <span className="absolute top-0.5 left-1.5 font-mono-num text-[10px] text-slate-400">
                  {idx + 1}
                </span>

                {isStackable && (
                  <span
                    className={`absolute top-0.5 right-1 font-mono-num text-[10px] font-bold leading-none px-1 py-0.5 rounded-xs ${
                      charges > 0
                        ? 'text-amber-300 bg-slate-950/75'
                        : 'text-red-400 bg-slate-950/85'
                    }`}
                  >
                    {charges}
                  </span>
                )}

                <WeaponIcon id={slot.id} className="w-6 h-6" />

                {isRechargingWithStock && (
                  <div className="absolute inset-x-0 bottom-0 h-1 bg-slate-950/80">
                    <div
                      className="h-full bg-emerald-400 transition-all duration-75"
                      style={{ width: `${Math.max(8, 100 - cdPct)}%` }}
                    />
                  </div>
                )}

                {isBlocked && (
                  <div
                    className="absolute inset-x-0 bottom-0 bg-slate-950/82 flex items-center justify-center font-mono-num text-[11px] font-bold text-amber-300 rounded-b-md"
                    style={{ height: `${Math.max(40, cdPct)}%` }}
                  >
                    {cd.toFixed(1)}
                  </div>
                )}
              </button>
            );
          })}

          <div className="w-px h-9 bg-white/10 mx-1" aria-hidden="true" />

          <div className="px-2.5 py-1 rounded-md bg-[#141828] border border-white/10 text-center min-w-16">
            <div className="text-[10px] font-semibold text-sky-300">겉날개 [F]</div>
            <div className="font-mono-num text-xs font-bold text-white">
              {hud.elytraCooldown > 0.05 ? `${hud.elytraCooldown.toFixed(1)}s` : 'READY'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
