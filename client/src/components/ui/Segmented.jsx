export function Segmented({ label, options, value, onChange, size = "md", className = "" }) {
  const height = size === "sm" ? "h-8 text-[13px]" : "h-10 text-sm";
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={`inline-flex rounded-xl bg-ink/5 p-1 ring-1 ring-line ring-inset ${className}`}
    >
      {options.map((option) => {
        const active = option.value === value;
        const Icon = option.icon;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            title={option.title}
            onClick={() => onChange(option.value)}
            className={`flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-3 font-medium whitespace-nowrap transition ${height} ${
              active ? "bg-surface text-ink shadow-soft ring-1 ring-line" : "text-muted hover:text-ink"
            }`}
          >
            {option.dot && <span className={`size-2 rounded-full ${option.dot}`} />}
            {Icon && <Icon className="size-4" />}
            {option.label && <span className={Icon ? "max-sm:sr-only" : undefined}>{option.label}</span>}
          </button>
        );
      })}
    </div>
  );
}
