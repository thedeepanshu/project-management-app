import { useId } from "react";

// The Loomwork mark: a swatch of plain-weave fabric. Two warp (white) and two
// weft (coral) threads cross over/under each other — clients and projects
// interlaced. Each "under" strand is drawn with a gap where the "over" strand
// crosses it, and threads run off the clipped edges like cut cloth.
// Keep in sync with public/favicon.svg.
export function LogoMark({ className = "size-8" }) {
  const id = useId();
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7b68ff" />
          <stop offset="1" stopColor="#4b36cf" />
        </linearGradient>
        <clipPath id={`${id}-clip`}>
          <rect width="32" height="32" rx="9" />
        </clipPath>
      </defs>
      <rect width="32" height="32" rx="9" fill={`url(#${id}-bg)`} />
      <g strokeWidth="5" fill="none" clipPath={`url(#${id}-clip)`}>
        <path d="M10 0v18.5M10 25.5V32M22 0v6.5M22 13.5V32" stroke="#fff" />
        <path d="M0 10h6.5M13.5 10H32M0 22h18.5M25.5 22H32" stroke="#ff8f6d" />
      </g>
    </svg>
  );
}

export function Logo({ className = "" }) {
  return (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <LogoMark />
      <span className="font-display text-[1.35rem] font-bold tracking-tight">Loomwork</span>
    </span>
  );
}
