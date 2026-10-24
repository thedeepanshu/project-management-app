import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

const GAP = 6;
const EDGE = 8;

/**
 * Anchored floating panel built on the native Popover API (popover="manual").
 * It renders in the browser's top layer, so it sits above modal dialogs and
 * is never clipped by a scrolling container. We position it under the anchor
 * (flipping above when there's no room) and handle outside clicks ourselves.
 *
 * Usage: <button ref={anchorRef}> … <div ref={popoverRef} popover="manual">
 */
export function usePopover({ matchWidth = true } = {}) {
  const anchorRef = useRef(null);
  const popoverRef = useRef(null);
  const [open, setOpen] = useState(false);

  const position = useCallback(() => {
    const anchor = anchorRef.current;
    const popover = popoverRef.current;
    if (!anchor || !popover) return;
    const rect = anchor.getBoundingClientRect();
    if (matchWidth) popover.style.minWidth = `${rect.width}px`;

    const height = popover.offsetHeight;
    const width = popover.offsetWidth;
    const spaceBelow = window.innerHeight - rect.bottom;
    const above = spaceBelow < height + GAP + EDGE && rect.top > spaceBelow;
    const top = above ? rect.top - height - GAP : rect.bottom + GAP;
    const left = Math.max(EDGE, Math.min(rect.left, window.innerWidth - width - EDGE));

    // On small screens there may be room neither above nor below: keep the
    // whole panel on screen, even if it overlaps the field a little.
    const maxTop = window.innerHeight - height - EDGE;
    popover.style.top = `${Math.max(EDGE, Math.min(top, maxTop))}px`;
    popover.style.left = `${left}px`;
    popover.dataset.side = above ? "top" : "bottom";
  }, [matchWidth]);

  const show = useCallback(() => {
    const popover = popoverRef.current;
    if (!popover || popover.matches(":popover-open")) return;
    popover.showPopover();
    position(); // layout is available right after showPopover(), so no flash
    setOpen(true);
  }, [position]);

  const hide = useCallback(({ focusAnchor = false } = {}) => {
    const popover = popoverRef.current;
    if (popover?.matches(":popover-open")) popover.hidePopover();
    setOpen(false);
    if (focusAnchor) anchorRef.current?.focus();
  }, []);

  const toggle = useCallback(() => (open ? hide() : show()), [open, hide, show]);

  // Keep it attached to the anchor while open; close on clicks elsewhere.
  useLayoutEffect(() => {
    if (!open) return;
    position();
    function onPointerDown(event) {
      if (anchorRef.current?.contains(event.target) || popoverRef.current?.contains(event.target)) return;
      hide();
    }
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, true); // capture: also scrolling inside a modal body
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      window.removeEventListener("resize", position);
      window.removeEventListener("scroll", position, true);
      document.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [open, position, hide]);

  // Never leave a popover in the top layer after unmount.
  useEffect(() => () => {
    if (popoverRef.current?.matches(":popover-open")) popoverRef.current.hidePopover();
  }, []);

  return { anchorRef, popoverRef, open, show, hide, toggle };
}

/** Tailwind classes for the floating panel shell (overrides the UA popover styles). */
export const POPOVER_PANEL =
  "fixed inset-auto m-0 rounded-2xl bg-surface p-1.5 text-ink shadow-lift ring-1 ring-line " +
  "opacity-0 transition-opacity transition-discrete duration-150 ease-out open:opacity-100 starting:open:opacity-0";
