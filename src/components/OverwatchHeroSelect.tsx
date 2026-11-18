import {
  Crosshair,
  Play,
  Shield,
  Shuffle,
  Sparkles,
  Swords,
  Wind,
  X,
} from 'lucide-react';
import { CHARACTER_LIST, CHARACTER_MAP, hasDoubleJumpLoadout } from '../game/characters';
import type { CharacterId, CharacterProfile } from '../game/types';
import { WeaponIcon } from './WeaponIcons';

export type HeroRoleGroup = 'tank' | 'damage' | 'flex';

const HERO_ROLE_MAP: Record<CharacterId, HeroRoleGroup> = {
  manepear: 'tank',
  wemmbu: 'tank',
  flamefrags: 'tank',
  clownpierce: 'damage',
  princezam: 'damage',
  kestrel: 'damage',
  vexor: 'damage',
  jumperwho: 'flex',
  spokeishere: 'flex',
  parrotx2: 'flex',
  minutetech: 'flex',
};

const ROLE_GROUPS: Array<{
  id: HeroRoleGroup;
  label: string;
  accent: string;
  badgeBg: string;
}> = [
  { id: 'tank', label: '돌격', accent: '#38bdf8', badgeBg: 'bg-sky-500/20 border-sky-400/50 text-sky-300' },
  { id: 'damage', label: '공격', accent: '#f43f5e', badgeBg: 'bg-rose-500/20 border-rose-400/50 text-rose-300' },
  { id: 'flex', label: '기동 · 전술', accent: '#a855f7', badgeBg: 'bg-purple-500/20 border-purple-400/50 text-purple-300' },
];

function RoleBadgeIcon({ role, className = 'w-3.5 h-3.5' }: { role: HeroRoleGroup; className?: string }) {
  if (role === 'tank') return <Shield className={className} />;
  if (role === 'damage') return <Crosshair className={className} />;
  return <Wind className={className} />;
}

interface OverwatchHeroSelectProps {
  selectedCharacter: CharacterId;
  modeTitle: string;
  mapLabel: string;
  isQuickLaunch: boolean;
  countdownSec?: number;
  isLaunching?: boolean;
  onSelectCharacter: (id: CharacterId) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export function OverwatchHeroSelect({
  selectedCharacter,
  modeTitle,
  mapLabel,
  isQuickLaunch,
  countdownSec,
  isLaunching = false,
  onSelectCharacter,
  onConfirm,
  onCancel,
}: OverwatchHeroSelectProps) {
  const hero: CharacterProfile = CHARACTER_MAP[selectedCharacter] ?? CHARACTER_LIST[0];
  const heroRole = HERO_ROLE_MAP[hero.id] ?? 'damage';
  const roleMeta = ROLE_GROUPS.find((r) => r.id === heroRole) ?? ROLE_GROUPS[1];

  const hpPct = Math.min(100, Math.round((hero.maxHp / 155) * 100));
  const spdPct = Math.min(100, Math.round(((hero.speedMult - 0.9) / 0.3) * 100));
  const dmgPct = Math.min(100, Math.round(((hero.damageMult - 0.9) / 0.38) * 100));

  const handleRandom = () => {
    const pool = CHARACTER_LIST.filter((c) => c.id !== selectedCharacter);
    const pick = pool[Math.floor(Math.random() * pool.length)] ?? CHARACTER_LIST[0];
    onSelectCharacter(pick.id);
  };

  return (
    <div
      data-testid="overwatch-hero-select"
      className="fixed inset-0 z-40 flex flex-col justify-between pointer-events-none select-none text-white overflow-hidden"
      style={{
        background:
          'linear-gradient(180deg, rgba(8,12,24,0.82) 0%, rgba(8,12,24,0.16) 28%, rgba(8,12,24,0.12) 56%, rgba(8,12,24,0.92) 86%, rgba(8,12,24,0.98) 100%)',
      }}
    >
      {/* ==================== TOP OVERWATCH HEADER ==================== */}
      <header className="relative z-10 w-full px-4 sm:px-7 pt-3 sm:pt-4 flex items-center justify-between gap-3 pointer-events-auto">
        <div className="flex items-center gap-2.5">
          <div className="-skew-x-12 bg-amber-400 text-slate-950 px-3 py-1.5 rounded-xs shadow-md">
            <span className="skew-x-12 inline-block font-display text-xs sm:text-sm font-black tracking-tight">
              {modeTitle}
            </span>
          </div>
          <div className="-skew-x-12 bg-slate-900/85 border border-white/15 px-3 py-1.5 rounded-xs">
            <span className="skew-x-12 inline-block text-xs font-bold text-slate-200">
              {mapLabel}
            </span>
          </div>
        </div>

        {/* Center Selection Timer (when Quick Match Launch) */}
        <div className="flex items-center gap-3">
          {isQuickLaunch && typeof countdownSec === 'number' ? (
            <div className="flex items-center gap-2.5 bg-slate-950/90 border border-amber-400/50 rounded-md px-4 py-1.5 shadow-lg">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-xs font-bold text-slate-200 hidden sm:inline">영웅 선택</span>
              <span
                data-testid="hero-select-countdown"
                className={`font-mono-num text-xl sm:text-2xl font-black leading-none ${
                  countdownSec <= 5 ? 'text-rose-400 animate-pulse' : 'text-amber-400'
                }`}
              >
                00:{String(Math.max(0, countdownSec)).padStart(2, '0')}
              </span>
            </div>
          ) : (
            <div className="bg-slate-950/85 border border-white/15 rounded-md px-4 py-1.5 text-xs sm:text-sm font-display font-black tracking-wide text-amber-300">
              영웅 선택 &amp; 스킬 정보
            </div>
          )}
        </div>

        <button
          type="button"
          data-testid="hero-select-back-btn"
          onClick={onCancel}
          className="px-3 py-1.5 rounded-md bg-slate-900/85 hover:bg-slate-800 border border-white/20 text-xs font-bold text-slate-200 flex items-center gap-1.5 cursor-pointer transition-colors"
        >
          <X className="w-3.5 h-3.5" />
          <span>로비로</span>
        </button>
      </header>

      {/* ==================== MIDDLE STAGE: LEFT HERO BIO + OPEN 3D FIGHTER + RIGHT 6-SLOT ABILITY LIST ==================== */}
      <div className="relative z-10 flex-1 min-h-0 px-4 sm:px-7 py-1.5 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 overflow-hidden">
        {/* LEFT: OVERWATCH HERO IDENTITY & STATS */}
        <div className="pointer-events-auto w-full lg:w-[310px] xl:w-[340px] shrink-0 space-y-2.5 bg-slate-950/75 backdrop-blur-md border border-white/15 rounded-xl p-3.5 shadow-2xl">
          <div className="flex items-center justify-between gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-xs border text-[11px] font-black ${roleMeta.badgeBg}`}
            >
              <RoleBadgeIcon role={heroRole} className="w-3.5 h-3.5" />
              <span>{roleMeta.label}</span>
            </span>
            <span className="text-[11px] font-bold text-amber-300">{hero.titleKr}</span>
          </div>

          <div>
            <h2
              data-testid="selected-character-name"
              className="font-display text-2xl sm:text-3xl font-black italic tracking-tight text-white drop-shadow-sm"
            >
              {hero.name}
            </h2>
            <div
              className="mt-1 h-1 w-16 rounded-full"
              style={{ backgroundColor: hero.trimColor }}
            />
          </div>

          <p className="text-xs leading-relaxed text-slate-200 font-medium">
            {hero.summary}
          </p>

          {/* Compact Overwatch Stat Bars */}
          <div className="space-y-2 pt-2 border-t border-white/10">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] font-bold">
                <span className="text-slate-300">체력</span>
                <span className="font-mono-num text-emerald-300">{hero.maxHp} HP</span>
              </div>
              <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-400 transition-all duration-300"
                  style={{ width: `${hpPct}%` }}
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] font-bold">
                <span className="text-slate-300">기동력</span>
                <span className="font-mono-num text-sky-300">{Math.round(hero.speedMult * 100)}%</span>
              </div>
              <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-sky-400 transition-all duration-300"
                  style={{ width: `${spdPct}%` }}
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] font-bold">
                <span className="text-slate-300">화력</span>
                <span className="font-mono-num text-amber-300">{Math.round(hero.damageMult * 100)}%</span>
              </div>
              <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-400 transition-all duration-300"
                  style={{ width: `${dmgPct}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* CENTER OPEN SPACE FOR LIVE 3D CHARACTER */}
        <div className="hidden lg:block flex-1 min-w-[200px]" />

        {/* RIGHT: OVERWATCH F1-STYLE 6-SLOT ABILITY / WEAPON DESCRIPTIONS (2x3 NON-SCROLL GRID) */}
        <div className="pointer-events-auto w-full lg:w-[470px] xl:w-[530px] shrink-0 bg-slate-950/78 backdrop-blur-md border border-white/15 rounded-xl p-3 shadow-2xl space-y-2">
          <div className="flex items-center justify-between pb-1.5 border-b border-white/10">
            <div className="flex items-center gap-1.5 text-xs font-black tracking-wide text-amber-300">
              <Swords className="w-3.5 h-3.5" />
              <span>보유 무장 &amp; 스킬 설명</span>
            </div>
            <div className="flex items-center gap-1.5">
              {hasDoubleJumpLoadout(hero.loadout) && (
                <span className="px-1.5 py-0.5 rounded bg-sky-500/20 border border-sky-400/50 text-sky-300 font-mono-num text-[10px] font-bold">
                  더블점프 x2
                </span>
              )}
              <span className="text-[10px] font-mono-num text-slate-400">숫자키 1 ~ 6</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {hero.loadout.map((item, idx) => (
              <div
                key={`${hero.id}-skill-${item.id}-${idx}`}
                className="flex items-start gap-2 p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 border-l-4 transition-colors"
                style={{ borderLeftColor: item.accent }}
              >
                <div className="flex flex-col items-center gap-1 shrink-0">
                  <div className="w-7 h-7 rounded-md bg-slate-900 border border-white/15 flex items-center justify-center">
                    <WeaponIcon id={item.id} className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span className="px-1.5 py-0.2 rounded bg-white/10 font-mono-num text-[9px] font-black text-amber-300">
                    {idx + 1}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[11px] font-black text-white truncate">{item.name}</span>
                    <span className="px-1 py-0.2 rounded bg-slate-900 text-slate-300 border border-white/10 font-mono-num text-[9px] font-bold shrink-0">
                      {item.cooldown <= 0 ? '연속' : `${item.cooldown.toFixed(1)}s`}
                    </span>
                  </div>
                  {(item.damage ?? 0) > 0 && (
                    <div className="text-[9px] font-mono-num font-bold text-rose-300">
                      DMG {item.damage}
                    </div>
                  )}
                  <p className="text-[10px] text-slate-300 leading-snug mt-0.5 line-clamp-2">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ==================== BOTTOM: LOCK-IN BUTTON + OVERWATCH ROLE-GROUPED ROSTER BAR ==================== */}
      <div className="relative z-10 w-full px-3 sm:px-6 pb-2.5 sm:pb-3 pt-1 flex flex-col items-center gap-2 pointer-events-auto">
        <button
          type="button"
          data-testid="hero-select-confirm-btn"
          data-start="true"
          disabled={isLaunching}
          onClick={onConfirm}
          className="-skew-x-6 px-8 sm:px-11 py-2.5 sm:py-3 rounded-md bg-amber-400 hover:bg-amber-300 active:translate-y-0.5 text-slate-950 font-display text-base sm:text-lg font-black tracking-tight border-b-4 border-amber-600 shadow-2xl cursor-pointer transition-all flex items-center gap-2"
        >
          <span className="skew-x-6 flex items-center gap-2">
            <Play className="w-5 h-5 fill-slate-950 text-slate-950 shrink-0" />
            <span>
              {isLaunching
                ? '전장 입장 중...'
                : isQuickLaunch
                  ? `${hero.name} 선택 완료 · 전투 시작`
                  : `${hero.name} 선택 확정`}
            </span>
          </span>
        </button>

        {/* Role-Grouped Overwatch Hero Roster Strip */}
        <div
          data-testid="overwatch-hero-roster"
          className="w-full max-w-6xl bg-slate-950/85 backdrop-blur-md border border-white/15 rounded-xl px-2.5 sm:px-4 py-2 shadow-2xl flex flex-wrap items-end justify-center gap-2 sm:gap-3"
        >
          {ROLE_GROUPS.map((group) => {
            const groupHeroes = CHARACTER_LIST.filter(
              (c) => (HERO_ROLE_MAP[c.id] ?? 'damage') === group.id
            );
            return (
              <div key={group.id} className="flex flex-col gap-1">
                <div className="flex items-center gap-1 px-1 text-[10px] font-black uppercase tracking-wider text-slate-300">
                  <span style={{ color: group.accent }}>
                    <RoleBadgeIcon role={group.id} className="w-3 h-3" />
                  </span>
                  <span>{group.label}</span>
                </div>
                <div className="flex items-center gap-1 sm:gap-1.5">
                  {groupHeroes.map((c) => {
                    const active = selectedCharacter === c.id;
                    const primaryWeapon = c.loadout[0];
                    return (
                      <button
                        key={c.id}
                        type="button"
                        data-char-id={c.id}
                        data-testid={`char-card-${c.id}`}
                        onClick={() => onSelectCharacter(c.id)}
                        className={`group relative -skew-x-6 w-[62px] sm:w-[74px] h-[64px] sm:h-[72px] rounded-md border-2 transition-all cursor-pointer overflow-hidden flex flex-col justify-between p-1.5 ${
                          active
                            ? 'bg-amber-400/20 border-amber-400 ring-2 ring-amber-400/50 -translate-y-1.5 shadow-lg shadow-amber-500/20'
                            : 'bg-slate-900/90 border-white/20 hover:border-white/60 hover:-translate-y-0.5'
                        }`}
                      >
                        <div
                          className="absolute inset-x-0 top-0 h-1"
                          style={{ backgroundColor: c.trimColor }}
                        />
                        <div className="skew-x-6 flex items-center justify-between w-full pt-0.5">
                          <span
                            className="w-5 h-5 sm:w-6 sm:h-6 rounded-sm flex items-center justify-center border border-white/15"
                            style={{ backgroundColor: `${c.primaryColor}cc` }}
                          >
                            <WeaponIcon
                              id={primaryWeapon.id}
                              className="w-3.5 h-3.5 text-white"
                            />
                          </span>
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: active ? '#fbbf24' : c.trimColor }}
                          />
                        </div>
                        <div className="skew-x-6 w-full text-center">
                          <div
                            className={`text-[10px] sm:text-xs font-display font-black truncate ${
                              active ? 'text-amber-300' : 'text-white'
                            }`}
                          >
                            {c.name}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          <div className="flex flex-col gap-1">
            <div className="px-1 text-[10px] font-black text-slate-400">무작위</div>
            <button
              type="button"
              data-testid="random-character-btn"
              onClick={handleRandom}
              className="-skew-x-6 w-[58px] sm:w-[66px] h-[64px] sm:h-[72px] rounded-md border-2 border-white/20 bg-slate-900/90 hover:border-amber-400/70 hover:bg-slate-800 text-slate-200 cursor-pointer flex flex-col items-center justify-center gap-1 transition-all"
              title="랜덤 캐릭터"
            >
              <Shuffle className="skew-x-6 w-4 h-4 text-amber-400" />
              <span className="skew-x-6 text-[10px] font-bold">랜덤</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
