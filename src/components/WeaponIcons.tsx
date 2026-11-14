import type { WeaponSlotId } from '../game/types';

export function UnstableCrest({ className = 'w-12 h-12' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
      <polygon
        points="32,4 58,18 58,46 32,60 6,46 6,18"
        fill="#151828"
        stroke="#c084fc"
        strokeWidth="2.5"
      />
      <polygon
        points="32,10 52,21 52,43 32,54 12,43 12,21"
        fill="#1e1b38"
        stroke="#f59e0b"
        strokeWidth="1.2"
      />
      <path d="M18 46 L45 19" stroke="#e2e8f0" strokeWidth="3.5" strokeLinecap="square" />
      <path d="M16 38 L26 48" stroke="#f59e0b" strokeWidth="3" strokeLinecap="square" />
      <path d="M46 46 L24 24" stroke="#7dd3fc" strokeWidth="3" strokeLinecap="square" />
      <rect x="15" y="15" width="13" height="13" rx="1.5" fill="#334155" stroke="#fbbf24" strokeWidth="2" />
      <circle cx="21.5" cy="21.5" r="2.5" fill="#38bdf8" />
    </svg>
  );
}

export function WeaponIcon({ id, className = 'w-6 h-6' }: { id: WeaponSlotId; className?: string }) {
  if (id === 'sword') {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <path d="M6 18L19 5" stroke="#a855f7" strokeWidth="3" strokeLinecap="square" />
        <path d="M7.5 16.5L18.5 5.5" stroke="#e2e8f0" strokeWidth="1.3" strokeLinecap="square" />
        <path d="M5 14L10 19" stroke="#f59e0b" strokeWidth="2.4" strokeLinecap="square" />
        <path d="M4 20L6.5 17.5" stroke="#78350f" strokeWidth="2.4" strokeLinecap="square" />
      </svg>
    );
  }
  if (id === 'fire_sword') {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <path d="M6 18L19 5" stroke="#ea580c" strokeWidth="3.4" strokeLinecap="square" />
        <path d="M7.5 16.5L18.5 5.5" stroke="#fef08a" strokeWidth="1.5" strokeLinecap="square" />
        <path d="M5 14L10 19" stroke="#fbbf24" strokeWidth="2.4" strokeLinecap="square" />
        <circle cx="15" cy="6" r="1.4" fill="#fb923c" />
      </svg>
    );
  }
  if (id === 'spear') {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <path d="M4 20L16 8" stroke="#92400e" strokeWidth="2.3" strokeLinecap="square" />
        <polygon points="15,6 20,4 18,9" fill="#c084fc" stroke="#f5f3ff" strokeWidth="1" />
        <path d="M13.5 8.5L15.5 10.5" stroke="#fbbf24" strokeWidth="2" />
      </svg>
    );
  }
  if (id === 'axe') {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <path d="M5 19L15 9" stroke="#78350f" strokeWidth="2.6" strokeLinecap="square" />
        <path d="M12 6C15 5 19 7 19 11C17 13 14 13 12 11Z" fill="#475569" stroke="#fbbf24" strokeWidth="1.6" />
      </svg>
    );
  }
  if (id === 'mace') {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <path d="M5 19L13 11" stroke="#38bdf8" strokeWidth="2.6" strokeLinecap="square" />
        <rect x="11" y="4" width="9" height="9" rx="1" fill="#334155" stroke="#0f172a" strokeWidth="1.5" />
        <rect x="12.5" y="5.5" width="6" height="6" fill="#475569" stroke="#fbbf24" strokeWidth="1.4" />
        <circle cx="15.5" cy="8.5" r="1.5" fill="#38bdf8" />
      </svg>
    );
  }
  if (id === 'trident') {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <path d="M5 19L15 9" stroke="#2dd4bf" strokeWidth="2.4" strokeLinecap="square" />
        <path d="M13 7L17 11" stroke="#5eead4" strokeWidth="2.2" strokeLinecap="square" />
        <path d="M16 8L20 4M13.5 6.5L16.5 3.5M17.5 10.5L20.5 7.5" stroke="#99f6e4" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  if (id === 'wind_charge') {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <circle cx="12" cy="12" r="7.5" fill="#0284c7" stroke="#0f172a" strokeWidth="1.6" />
        <circle cx="12" cy="12" r="4.5" fill="#e0f2fe" />
        <path d="M6 10C9 7 15 7 18 10" stroke="#7dd3fc" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M6 14C9 17 15 17 18 14" stroke="#38bdf8" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }
  if (id === 'cobweb') {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <circle cx="12" cy="12" r="8" stroke="#e2e8f0" strokeWidth="1.4" />
        <circle cx="12" cy="12" r="4.5" stroke="#cbd5e1" strokeWidth="1.2" />
        <path d="M4 12H20M12 4V20M6.3 6.3L17.7 17.7M17.7 6.3L6.3 17.7" stroke="#f8fafc" strokeWidth="1.3" />
      </svg>
    );
  }
  if (id === 'tnt_charge') {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <rect x="5" y="6" width="14" height="13" rx="1.5" fill="#dc2626" stroke="#0f172a" strokeWidth="1.5" />
        <rect x="5" y="10.5" width="14" height="4" fill="#f8fafc" />
        <path d="M12 6V3.5L14.5 2.5" stroke="#fbbf24" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  if (id === 'ender_pearl') {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <circle cx="12" cy="12" r="7.5" fill="#0f766e" stroke="#0f172a" strokeWidth="1.6" />
        <circle cx="12" cy="12" r="4" fill="#2dd4bf" />
        <ellipse cx="12" cy="12" rx="1.6" ry="3.2" fill="#a855f7" />
        <circle cx="10" cy="9.5" r="1.1" fill="#f0fdfa" />
      </svg>
    );
  }
  if (id === 'shadow_step') {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <path d="M12 4L18 10L16 19H8L6 10L12 4Z" fill="#4338ca" stroke="#a5b4fc" strokeWidth="1.5" />
        <circle cx="12" cy="11" r="2.2" fill="#e0e7ff" />
      </svg>
    );
  }
  if (id === 'potion') {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <rect x="9.5" y="3.5" width="5" height="3" rx="0.8" fill="#78350f" />
        <circle cx="12" cy="14" r="6" fill="#f43f5e" stroke="#0f172a" strokeWidth="1.5" />
        <circle cx="10" cy="12" r="1.6" fill="#fecdd3" />
      </svg>
    );
  }
  if (id === 'lava_bucket') {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <path d="M5 7H19L17 20H7L5 7Z" fill="#475569" stroke="#0f172a" strokeWidth="1.5" />
        <ellipse cx="12" cy="7.5" rx="6.5" ry="2.2" fill="#f97316" stroke="#fed7aa" strokeWidth="1" />
        <circle cx="10.5" cy="7.3" r="1.2" fill="#fef08a" />
        <path d="M15 8.5V13.5" stroke="#fb923c" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  if (id === 'water_bucket') {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <path d="M5 7H19L17 20H7L5 7Z" fill="#475569" stroke="#0f172a" strokeWidth="1.5" />
        <ellipse cx="12" cy="7.5" rx="6.5" ry="2.2" fill="#0ea5e9" stroke="#bae6fd" strokeWidth="1" />
        <circle cx="10" cy="7.4" r="1.1" fill="#e0f2fe" />
        <path d="M15 8.5V13.5" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  if (id === 'build_block') {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <polygon points="12,3 20,7.5 12,12 4,7.5" fill="#94a3b8" stroke="#0f172a" strokeWidth="1.2" />
        <polygon points="4,7.5 12,12 12,21 4,16.5" fill="#64748b" stroke="#0f172a" strokeWidth="1.2" />
        <polygon points="20,7.5 12,12 12,21 20,16.5" fill="#475569" stroke="#0f172a" strokeWidth="1.2" />
        <path d="M8 9.8L16 5.3" stroke="#e2e8f0" strokeWidth="0.9" strokeOpacity="0.55" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M12 6V3.5" stroke="#78350f" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M12 5.5C14 3.5 16.5 4 17 5.5C15 6.5 13.5 6.5 12 5.5Z" fill="#22c55e" />
      <rect x="6" y="7" width="12" height="12" rx="3" fill="#f59e0b" stroke="#0f172a" strokeWidth="1.6" />
      <rect x="8.5" y="9" width="3.5" height="4" rx="1" fill="#fef08a" />
    </svg>
  );
}
