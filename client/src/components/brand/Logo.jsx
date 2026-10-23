import { useId } from "react";

// The Twillboard mark: a bold "T" cut from twill fabric. Diagonal cuts follow
// twill's signature rib (bottom-left → top-right); the coral band is the one
// thread you're working on, running through the heart of the board.
// Keep in sync with public/favicon.svg.
export function LogoMark({ className = "size-8" }) {
  const id = useId();
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7b68ff" />
          <stop offset="1" stopColor="#3d2ea6" />
        </linearGradient>
        <clipPath id={`${id}-t`}>
          <rect x="6" y="7" width="20" height="7" rx="1.8" />
          <rect x="12.5" y="7" width="7" height="18.5" rx="1.8" />
        </clipPath>
        <mask id={`${id}-cuts`}>
          <rect width="32" height="32" fill="#fff" />
          <path d="M-19 36L36-19M-11 36L36-11M-3 36L36-3M5 36L36 5" stroke="#000" strokeWidth="1.4" />
        </mask>
      </defs>
      <rect width="32" height="32" rx="8" fill={`url(#${id}-bg)`} />
      <g clipPath={`url(#${id}-t)`} mask={`url(#${id}-cuts)`}>
        <rect width="32" height="32" fill="#fff" />
        <path d="M-7 36L36-7" stroke="#ff8f6d" strokeWidth="4.26" />
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
