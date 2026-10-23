// Shared button styles, for <Button>, <ButtonLink> and plain <a> download links.

const base =
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-xl font-medium whitespace-nowrap transition " +
  "active:scale-[0.98] disabled:pointer-events-none disabled:opacity-55 cursor-pointer [&_svg]:size-4 [&_svg]:shrink-0";

const variants = {
  primary:
    "bg-ink text-canvas shadow-soft hover:bg-ink/88 dark:bg-twill-500 dark:text-white dark:hover:bg-twill-400",
  brand:
    "bg-linear-to-br from-twill-500 to-twill-700 text-white shadow-[0_6px_20px_-6px] shadow-twill-600/60 hover:brightness-110",
  secondary: "bg-surface text-ink ring-1 ring-line-strong shadow-soft hover:bg-elevated hover:ring-subtle/60",
  ghost: "text-muted hover:bg-ink/5 hover:text-ink",
  danger: "bg-red-600 text-white shadow-soft hover:bg-red-500",
};

const sizes = {
  sm: "h-8 px-3 text-[13px]",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-5 text-[15px]",
  icon: "size-9",
};

export function buttonClasses({ variant = "primary", size = "md", className = "" } = {}) {
  return `${base} ${variants[variant]} ${sizes[size]} ${className}`;
}
