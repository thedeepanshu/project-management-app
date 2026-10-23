import { initials } from "../../lib/format";

const GRADIENTS = [
  "from-loom-400 to-loom-700",
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

export function Avatar({ name, size = "md" }) {
  const sizes = { sm: "size-7 text-[11px]", md: "size-10 text-sm", lg: "size-14 text-lg" };
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full bg-linear-to-br font-semibold text-white ring-2 ring-surface ${sizes[size]} ${GRADIENTS[hash(name) % GRADIENTS.length]}`}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}
