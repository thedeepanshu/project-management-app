import { useState } from "react";

import { initials } from "../../lib/format";

const GRADIENTS = [
  "from-twill-400 to-twill-700",
  "from-thread-400 to-rose-600",
  "from-amber-400 to-orange-600",
  "from-emerald-400 to-teal-700",
  "from-sky-400 to-indigo-600",
  "from-fuchsia-400 to-purple-700",
];

// Same name → same colour, every time.
function hash(text) {
  let h = 0;
  for (const char of text) h = (h * 31 + char.charCodeAt(0)) >>> 0;
  return h;
}

const SIZES = { sm: "size-7 text-[11px]", md: "size-10 text-sm", lg: "size-14 text-lg", xl: "size-20 text-2xl" };

/** Shows the photo when there is one (and it loads), otherwise coloured initials. */
export function Avatar({ name, src, size = "md" }) {
  const [failedSrc, setFailedSrc] = useState(null);
  const showPhoto = src && failedSrc !== src;

  if (showPhoto) {
    return (
      <img
        src={src}
        alt=""
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setFailedSrc(src)}
        className={`shrink-0 rounded-full bg-ink/6 object-cover ring-2 ring-surface ${SIZES[size]}`}
      />
    );
  }
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full bg-linear-to-br font-semibold text-white ring-2 ring-surface ${SIZES[size]} ${GRADIENTS[hash(name) % GRADIENTS.length]}`}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}
