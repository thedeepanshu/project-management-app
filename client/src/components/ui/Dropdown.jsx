import { Check, ChevronDown, Search } from "lucide-react";
import { useId, useRef, useState } from "react";

import { POPOVER_PANEL, usePopover } from "../../hooks/usePopover";

const TRIGGER_SIZES = {
  md: "h-11 rounded-xl px-3.5 text-[15px]",
  sm: "h-10 rounded-xl px-3 text-sm shadow-soft bg-surface",
};

/**
 * Themed replacement for <select>: a button that opens a listbox.
 * options: [{ value, label, description?, icon?: ReactNode, disabled? }]
 * Keyboard: ↑/↓, Home/End, type a letter to jump, Enter/Space to pick, Esc to close.
 */
export function Dropdown({
  value,
  onChange,
  options,
  placeholder = "Select…",
  size = "md",
  searchable = false,
  className = "",
  ...triggerProps // id, aria-label, aria-invalid, aria-describedby from <Field>
}) {
  const { anchorRef, popoverRef, open, show, hide } = usePopover();
  const listId = useId();
  const listRef = useRef(null);
  const [active, setActive] = useState(-1);
  const [query, setQuery] = useState("");
  const typeahead = useRef({ text: "", timer: null });

  const selected = options.find((option) => option.value === value);
  const visible = query
    ? options.filter((option) =>
        `${option.label} ${option.description ?? ""}`.toLowerCase().includes(query.trim().toLowerCase())
      )
    : options;

  function openList() {
    setQuery("");
    const index = options.findIndex((option) => option.value === value);
    setActive(index >= 0 ? index : options.findIndex((option) => !option.disabled));
    show();
    // Focus after the popover is in the top layer.
    requestAnimationFrame(() => (searchable ? popoverRef.current?.querySelector("input") : listRef.current)?.focus());
  }

  function pick(option) {
    if (!option || option.disabled) return;
    onChange(option.value);
    hide({ focusAnchor: true });
  }

  function move(step) {
    if (visible.length === 0) return;
    let index = active;
    for (let i = 0; i < visible.length; i++) {
      index = (index + step + visible.length) % visible.length;
      if (!visible[index].disabled) break;
    }
    setActive(index);
    listRef.current?.querySelector(`[data-index="${index}"]`)?.scrollIntoView({ block: "nearest" });
  }

  function onListKeyDown(event) {
    const keys = {
      ArrowDown: () => move(1),
      ArrowUp: () => move(-1),
      Home: () => setActive(visible.findIndex((option) => !option.disabled)),
      End: () => setActive(visible.findLastIndex((option) => !option.disabled)),
      Enter: () => pick(visible[active]),
      " ": () => !searchable && pick(visible[active]),
      Escape: () => hide({ focusAnchor: true }),
      Tab: () => hide(),
    };
    if (keys[event.key]) {
      // Keep Esc from also closing the surrounding dialog.
      if (event.key !== "Tab" && !(event.key === " " && searchable)) event.preventDefault();
      event.stopPropagation();
      keys[event.key]();
      return;
    }
    // Type-ahead: jump to the next option starting with the typed letters.
    if (!searchable && event.key.length === 1 && !event.metaKey && !event.ctrlKey) {
      clearTimeout(typeahead.current.timer);
      typeahead.current.text += event.key.toLowerCase();
      typeahead.current.timer = setTimeout(() => (typeahead.current.text = ""), 600);
      const index = visible.findIndex(
        (option) => !option.disabled && option.label.toLowerCase().startsWith(typeahead.current.text)
      );
      if (index >= 0) setActive(index);
    }
  }

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => (open ? hide() : openList())}
        onKeyDown={(event) => {
          if ((event.key === "ArrowDown" || event.key === "ArrowUp") && !open) {
            event.preventDefault();
            openList();
          }
        }}
        className={`group flex w-full cursor-pointer items-center gap-2.5 bg-elevated text-left ring-1 ring-line-strong transition hover:ring-subtle/70 focus-visible:ring-2 focus-visible:ring-twill-500 focus-visible:outline-none aria-expanded:ring-2 aria-expanded:ring-twill-500 aria-invalid:ring-red-500/70 ${TRIGGER_SIZES[size]} ${className}`}
        {...triggerProps}
      >
        {selected?.icon && <span className="flex shrink-0 items-center">{selected.icon}</span>}
        <span className={`min-w-0 flex-1 truncate ${selected ? "" : "text-subtle"}`}>
          {selected ? selected.label : placeholder}
          {selected?.description && size === "md" && <span className="text-subtle"> · {selected.description}</span>}
        </span>
        <ChevronDown className="size-4 shrink-0 text-subtle transition-transform duration-200 group-aria-expanded:rotate-180" />
      </button>

      {/* Column layout: when space is tight the search stays put and only the list scrolls. */}
      <div ref={popoverRef} popover="manual" className={`${POPOVER_PANEL} max-w-[calc(100vw-1rem)] open:flex open:flex-col`}>
        {searchable && (
          <label className="relative mb-1.5 block shrink-0">
            <span className="sr-only">Filter options</span>
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle" />
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActive(0);
              }}
              onKeyDown={onListKeyDown}
              placeholder="Search…"
              aria-controls={listId}
              aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
              className="h-9 w-full rounded-lg bg-ink/5 pr-3 pl-9 text-sm placeholder:text-subtle focus:outline-none"
            />
          </label>
        )}
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          tabIndex={-1}
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          onKeyDown={onListKeyDown}
          className="scroll-soft max-h-72 min-h-0 flex-1 overflow-y-auto focus:outline-none"
        >
          {visible.length === 0 && <li className="px-3 py-6 text-center text-sm text-subtle">No matches</li>}
          {visible.map((option, index) => {
            const isSelected = option.value === value;
            return (
              <li
                key={option.value}
                id={`${listId}-${index}`}
                data-index={index}
                role="option"
                aria-selected={isSelected}
                aria-disabled={option.disabled || undefined}
                onPointerMove={() => !option.disabled && setActive(index)}
                onClick={() => pick(option)}
                className={`flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-colors ${
                  index === active ? "bg-ink/6" : ""
                } ${option.disabled ? "cursor-default opacity-45" : ""}`}
              >
                {option.icon && <span className="flex shrink-0 items-center">{option.icon}</span>}
                <span className="min-w-0 flex-1">
                  <span className={`block truncate ${isSelected ? "font-semibold" : ""}`}>{option.label}</span>
                  {option.description && <span className="block truncate text-xs text-subtle">{option.description}</span>}
                </span>
                <Check className={`size-4 shrink-0 text-twill-600 dark:text-twill-300 ${isSelected ? "" : "invisible"}`} />
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}
