import { useId } from "react";

// The Twillboard mark: a swatch of 2/1 twill. Each white warp thread passes
// over two coral weft threads and under one, shifting a step per row, so the
// coral "under" points line up into twill's signature diagonal. Each "under"
// strand is drawn with a gap where the "over" strand crosses it, and threads
// run off the clipped edges like cut cloth. Keep in sync with public/favicon.svg.
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
      <g strokeWidth="4" fill="none" clipPath={`url(#${id}-clip)`}>
        <path d="M7 0V21.75M7 28.25V32M16 0V12.75M16 19.25V32M25 0V3.75M25 10.25V32" stroke="#fff" />
        <path
          d="M0 7H3.75M10.25 7H12.75M19.25 7H32M0 16H3.75M10.25 16H21.75M28.25 16H32M0 25H12.75M19.25 25H21.75M28.25 25H32"
          stroke="#ff8f6d"
        />
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
