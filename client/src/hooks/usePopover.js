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
  // Which side the panel opened on. Kept while open so it doesn't jump from
  // above to below when its content shrinks (e.g. while filtering a list).
  const sideRef = useRef(null);

  const position = useCallback(() => {
    const anchor = anchorRef.current;
    const popover = popoverRef.current;
    if (!anchor || !popover) return;
    const rect = anchor.getBoundingClientRect();
    if (matchWidth) popover.style.minWidth = `${rect.width}px`;

    const spaceBelow = window.innerHeight - rect.bottom - GAP - EDGE;
    const spaceAbove = rect.top - GAP - EDGE;
    if (!sideRef.current) {
      popover.style.maxHeight = "";
      const natural = popover.offsetHeight;
      // Below if it fits there; otherwise whichever side has more room.
      sideRef.current = natural <= spaceBelow || spaceBelow >= spaceAbove ? "bottom" : "top";
    }
    const above = sideRef.current === "top";

    // Never cover the field: cap the panel to the space on its side, and let
    // its content scroll inside when that isn't enough.
    popover.style.maxHeight = `${Math.max(120, above ? spaceAbove : spaceBelow)}px`;
    const height = popover.offsetHeight;
    const width = popover.offsetWidth;
    const top = above ? rect.top - GAP - height : rect.bottom + GAP;
    const left = Math.max(EDGE, Math.min(rect.left, window.innerWidth - width - EDGE));

    popover.style.top = `${Math.max(EDGE, top)}px`;
    popover.style.left = `${left}px`;
    popover.dataset.side = above ? "top" : "bottom";
  }, [matchWidth]);

  const show = useCallback(() => {
    const popover = popoverRef.current;
    if (!popover || popover.matches(":popover-open")) return;
    sideRef.current = null; // choose the side afresh each time it opens
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
    // Re-attach whenever the panel changes size (filtering, month change…).
    const resizeObserver = new ResizeObserver(() => position());
    resizeObserver.observe(popoverRef.current);
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, true); // capture: also scrolling inside a modal body
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      resizeObserver.disconnect();
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
  "fixed inset-auto m-0 overflow-y-auto overscroll-contain [scrollbar-width:thin] [scrollbar-color:var(--line-strong)_transparent] " +
  "rounded-2xl bg-surface p-1.5 text-ink shadow-lift ring-1 ring-line " +
  "opacity-0 transition-opacity transition-discrete duration-150 ease-out open:opacity-100 starting:open:opacity-0";
