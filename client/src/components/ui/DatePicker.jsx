import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useRef, useState } from "react";

import { POPOVER_PANEL, usePopover } from "../../hooks/usePopover";

// Dates are plain calendar days ("YYYY-MM-DD"), handled in UTC so a due date
// never shifts by a day because of the viewer's time zone.
const DAY = 86_400_000;
const toKey = (ms) => new Date(ms).toISOString().slice(0, 10);
const fromKey = (key) => Date.parse(`${key}T00:00:00Z`);
const todayKey = () => {
  const now = new Date();
  return toKey(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
};
const addDays = (key, days) => toKey(fromKey(key) + days * DAY);
function addMonths(key, months) {
  const date = new Date(fromKey(key));
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(date.getUTCDate(), lastDay));
  return toKey(target.getTime());
}

const locale = typeof navigator === "undefined" ? undefined : navigator.language;
// Locale's first day of the week (1 = Monday … 7 = Sunday); Monday if unknown.
const firstDay = (() => {
  try {
    const info = new Intl.Locale(locale).getWeekInfo?.() ?? new Intl.Locale(locale).weekInfo;
    return (info?.firstDay ?? 1) % 7;
  } catch {
    return 1;
  }
})();
const monthFormat = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" });
const longFormat = new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const labelFormat = new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const weekdayFormat = new Intl.DateTimeFormat(locale, { weekday: "narrow", timeZone: "UTC" });
// 2023-01-01 was a Sunday; use it to label weekday columns.
const WEEKDAYS = Array.from({ length: 7 }, (_, i) => weekdayFormat.format(Date.UTC(2023, 0, 1 + ((firstDay + i) % 7))));

/** 6×7 grid of day keys covering the month that contains `monthKey`. */
function monthGrid(monthKey) {
  const first = new Date(fromKey(monthKey));
  first.setUTCDate(1);
  const offset = (first.getUTCDay() - firstDay + 7) % 7;
  const start = first.getTime() - offset * DAY;
  return Array.from({ length: 42 }, (_, i) => toKey(start + i * DAY));
}

const QUICK_PICKS = [
  { label: "Today", get: () => todayKey() },
  { label: "Tomorrow", get: () => addDays(todayKey(), 1) },
  { label: "Next week", get: () => addDays(todayKey(), 7) },
  { label: "In a month", get: () => addMonths(todayKey(), 1) },
];

/**
 * Themed date field with a calendar popover. value/onChange use "YYYY-MM-DD" ("" = none).
 * Keyboard: arrows move by day/week, PageUp/PageDown by month, Enter picks, Esc closes.
 */
export function DatePicker({ value, onChange, placeholder = "No date", ...triggerProps }) {
  const { anchorRef, popoverRef, open, show, hide } = usePopover({ matchWidth: false });
  const gridRef = useRef(null);
  const [focused, setFocused] = useState(value || todayKey());
  const today = todayKey();
  const month = focused.slice(0, 7);
  const days = monthGrid(focused);

  function focusDay(key) {
    setFocused(key);
    requestAnimationFrame(() => gridRef.current?.querySelector(`[data-day="${key}"]`)?.focus());
  }

  function openCalendar() {
    show();
    focusDay(value || today);
  }

  function pick(key) {
    onChange(key);
    hide({ focusAnchor: true });
  }

  function onGridKeyDown(event) {
    const moves = {
      ArrowLeft: () => addDays(focused, -1),
      ArrowRight: () => addDays(focused, 1),
      ArrowUp: () => addDays(focused, -7),
      ArrowDown: () => addDays(focused, 7),
      PageUp: () => addMonths(focused, -1),
      PageDown: () => addMonths(focused, 1),
      Home: () => addDays(focused, -((new Date(fromKey(focused)).getUTCDay() - firstDay + 7) % 7)),
      End: () => addDays(focused, 6 - ((new Date(fromKey(focused)).getUTCDay() - firstDay + 7) % 7)),
    };
    if (moves[event.key]) {
      event.preventDefault();
      focusDay(moves[event.key]());
    } else if (event.key === "Escape") {
      // Close only the calendar, not the surrounding dialog.
      event.preventDefault();
      event.stopPropagation();
      hide({ focusAnchor: true });
    }
  }

  return (
    <div className="relative">
      <button
        ref={anchorRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => (open ? hide() : openCalendar())}
        className="group flex h-11 w-full cursor-pointer items-center gap-2.5 rounded-xl bg-elevated px-3.5 pr-10 text-left text-[15px] ring-1 ring-line-strong transition hover:ring-subtle/70 focus-visible:ring-2 focus-visible:ring-twill-500 focus-visible:outline-none aria-expanded:ring-2 aria-expanded:ring-twill-500 aria-invalid:ring-red-500/70"
        {...triggerProps}
      >
        <CalendarDays className="size-4 shrink-0 text-subtle" />
        <span className={`truncate ${value ? "" : "text-subtle"}`}>
          {value ? longFormat.format(fromKey(value)) : placeholder}
        </span>
      </button>
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute top-1/2 right-2 grid size-7 -translate-y-1/2 cursor-pointer place-items-center rounded-lg text-subtle transition hover:bg-ink/6 hover:text-ink"
          aria-label="Clear date"
          title="Clear date"
        >
          <X className="size-4" />
        </button>
      )}

      <div
        ref={popoverRef}
        popover="manual"
        role="dialog"
        aria-label="Choose a date"
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            hide({ focusAnchor: true });
          }
        }}
        className={`${POPOVER_PANEL} w-[19.5rem] p-3`}
      >
        <div className="mb-2 flex items-center justify-between">
          <button
            type="button"
            onClick={() => focusDay(addMonths(focused, -1))}
            className="grid size-8 cursor-pointer place-items-center rounded-lg text-muted transition hover:bg-ink/6 hover:text-ink"
            aria-label="Previous month"
          >
            <ChevronLeft className="size-4" />
          </button>
          <p className="font-display text-[15px] font-bold tracking-tight" aria-live="polite">
            {monthFormat.format(fromKey(focused))}
          </p>
          <button
            type="button"
            onClick={() => focusDay(addMonths(focused, 1))}
            className="grid size-8 cursor-pointer place-items-center rounded-lg text-muted transition hover:bg-ink/6 hover:text-ink"
            aria-label="Next month"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>

        <div role="grid" ref={gridRef} onKeyDown={onGridKeyDown}>
          <div role="row" className="grid grid-cols-7">
            {WEEKDAYS.map((label, i) => (
              <span key={i} role="columnheader" className="grid h-8 place-items-center text-[11px] font-semibold text-subtle uppercase">
                {label}
              </span>
            ))}
          </div>
          {Array.from({ length: 6 }, (_, week) => (
            <div role="row" key={week} className="grid grid-cols-7">
              {days.slice(week * 7, week * 7 + 7).map((key) => {
                const inMonth = key.startsWith(month);
                const isSelected = key === value;
                const isToday = key === today;
                return (
                  <button
                    key={key}
                    type="button"
                    role="gridcell"
                    data-day={key}
                    tabIndex={key === focused ? 0 : -1}
                    aria-selected={isSelected}
                    aria-current={isToday ? "date" : undefined}
                    aria-label={labelFormat.format(fromKey(key))}
                    onClick={() => pick(key)}
                    className={`m-0.5 grid aspect-square cursor-pointer place-items-center rounded-xl text-sm transition focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-twill-500 ${
                      isSelected
                        ? "bg-linear-to-br from-twill-500 to-twill-700 font-semibold text-white shadow-[0_4px_12px_-4px] shadow-twill-600/60"
                        : isToday
                          ? "font-semibold text-twill-600 ring-1 ring-twill-500/40 ring-inset hover:bg-twill-500/10 dark:text-twill-300"
                          : inMonth
                            ? "hover:bg-ink/6"
                            : "text-subtle/60 hover:bg-ink/4"
                    }`}
                  >
                    {Number(key.slice(8))}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5 border-t border-line pt-3">
          {QUICK_PICKS.map((quick) => (
            <button
              key={quick.label}
              type="button"
              onClick={() => pick(quick.get())}
              className="cursor-pointer rounded-full bg-ink/5 px-2.5 py-1 text-xs font-medium text-muted transition hover:bg-twill-500/12 hover:text-twill-700 dark:hover:text-twill-200"
            >
              {quick.label}
            </button>
          ))}
          {value && (
            <button
              type="button"
              onClick={() => pick("")}
              className="ml-auto cursor-pointer rounded-full px-2.5 py-1 text-xs font-medium text-red-600 transition hover:bg-red-500/10 dark:text-red-400"
            >
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
