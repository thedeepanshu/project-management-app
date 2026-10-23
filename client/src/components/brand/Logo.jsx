import { useId } from "react";

// The Twillboard mark: three twill "wales" — the diagonal ribs that define a
// twill weave — rising from bottom-left to top-right like progress. The long
// coral rib is the active project thread. Keep in sync with public/favicon.svg.
export function LogoMark({ className = "size-8" }) {
  const id = useId();
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7b68ff" />
          <stop offset="1" stopColor="#3d2ea6" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill={`url(#${id}-bg)`} />
      <g strokeWidth="5.4" strokeLinecap="round" fill="none">
        <path d="M7 17.5L14.5 10" stroke="#fff" />
        <path d="M8.5 23.5L23.5 8.5" stroke="#ff8f6d" />
        <path d="M17.5 25L25 17.5" stroke="#fff" />
      </g>
    </svg>
  );
}

export function Logo({ className = "" }) {
  return (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <LogoMark />
      <span className="font-display text-[1.35rem] font-bold tracking-tight">Twillboard</span>
    </span>
  );
}
