/**
 * @license MIT
 * The draggable shell that the on-screen keyboard lives in.
 *
 * Two modes, and the difference matters on a phone:
 *
 *  - **docked** (default) — the pad sits in the sheet's own column, exactly
 *    where it has always been. It moves nothing, so nothing can overlap.
 *  - **floating** — the student drags the pad by its grip and drops it wherever
 *    it is out of the way (over the frozen header, above the sheet, anywhere).
 *    The position is remembered in localStorage, because a student who moved
 *    the pad once means it.
 *
 * Dragging uses pointer events, so a finger and a mouse behave the same, and
 * it clamps to the viewport so the pad can never be dropped off-screen.
 */
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { GripVertical, Pin, X } from "lucide-react";

const STORAGE_KEY = "excel-academy:keyboard-position";

interface Position {
  /** Pixels from the left of the viewport. */
  x: number;
  /** Pixels from the top of the viewport. */
  y: number;
}

function readPosition(): Position | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Position;
    if (typeof parsed?.x !== "number" || typeof parsed?.y !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

function writePosition(position: Position | null) {
  try {
    if (position) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(position));
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* private mode */
  }
}

/** Keep the pad fully on screen, whatever the viewport is doing. */
function clampToViewport(x: number, y: number, width: number, height: number): Position {
  const maxX = Math.max(0, window.innerWidth - width - 4);
  const maxY = Math.max(0, window.innerHeight - Math.min(height, 260) - 4);
  return { x: Math.min(Math.max(0, x), maxX), y: Math.min(Math.max(0, y), maxY) };
}

export function FloatingKeyboard({
  children,
  onClose,
  /** Label shown on the grip, e.g. "Virtual keyboard". */
  title = "Virtual keyboard",
}: {
  children: ReactNode;
  onClose: () => void;
  title?: string;
}) {
  const [position, setPosition] = useState<Position | null>(() =>
    typeof window === "undefined" ? null : readPosition(),
  );
  const [dragging, setDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const panelRef = useRef<HTMLDivElement | null>(null);

  /** Floating mode = the student has moved it off its dock. */
  const floating = position !== null;

  const startDrag = useCallback(
    (event: React.PointerEvent) => {
      const panel = panelRef.current;
      if (!panel) return;
      event.preventDefault();
      const rect = panel.getBoundingClientRect();
      dragOffset.current = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      setDragging(true);
      (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
    },
    [],
  );

  useEffect(() => {
    if (!dragging) return;
    const move = (event: PointerEvent) => {
      const panel = panelRef.current;
      const width = panel?.offsetWidth ?? 320;
      const height = panel?.offsetHeight ?? 260;
      setPosition(clampToViewport(event.clientX - dragOffset.current.x, event.clientY - dragOffset.current.y, width, height));
    };
    const end = () => setDragging(false);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
    };
  }, [dragging]);

  // Remember where it was dropped, and re-clamp when the window shrinks.
  useEffect(() => {
    if (dragging) return;
    writePosition(position);
  }, [dragging, position]);

  useEffect(() => {
    if (!position) return;
    const onResize = () => {
      const panel = panelRef.current;
      setPosition((current) =>
        current ? clampToViewport(current.x, current.y, panel?.offsetWidth ?? 320, panel?.offsetHeight ?? 260) : current,
      );
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [position]);

  if (!floating) {
    // Docked: exactly the old layout, with a grip that promotes it to floating.
    return (
      <div className="border-b border-(--color-border) bg-(--color-surface) no-print">
        <button
          type="button"
          onClick={() => {
            const panel = panelRef.current;
            const rect = panel?.getBoundingClientRect();
            setPosition(
              clampToViewport(
                rect?.left ?? 12,
                (rect?.top ?? 120) + 40,
                rect?.width ?? 320,
                rect?.height ?? 260,
              ),
            );
          }}
          title="Float the keyboard — drag it anywhere"
          className="flex w-full items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-(--color-muted) hover:text-(--color-accent-dark)"
        >
          <GripVertical size={12} /> Drag to move the keyboard anywhere
        </button>
        <div ref={panelRef} className="px-2.5 pb-2">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label={`${title} (floating)`}
      style={{ left: position.x, top: position.y }}
      className={`fixed z-[60] w-[min(48rem,calc(100vw-1rem))] rounded-xl bg-(--color-surface) p-1.5 shadow-(--neu-raised-lg) ring-1 ring-(--color-border-strong) no-print ${
        dragging ? "cursor-grabbing" : ""
      }`}
    >
      {/* Grip: the whole header is the drag handle, like a window title bar. */}
      <div
        onPointerDown={startDrag}
        className={`mb-1 flex touch-none select-none items-center justify-between gap-2 rounded-lg bg-(--color-canvas) px-2 py-1 ${
          dragging ? "cursor-grabbing" : "cursor-grab"
        }`}
        title="Drag to move"
      >
        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-(--color-muted)">
          <GripVertical size={12} /> {title} · drag me
        </span>
        <span className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Dock the keyboard back under the formula bar"
            title="Dock it back in the sheet"
            onClick={() => setPosition(null)}
            className="rounded p-1 text-(--color-muted) hover:bg-(--color-accent-soft) hover:text-(--color-accent-dark)"
          >
            <Pin size={12} />
          </button>
          <button
            type="button"
            aria-label="Hide the virtual keyboard"
            onClick={onClose}
            className="rounded p-1 text-(--color-muted) hover:bg-(--color-accent-soft) hover:text-(--color-danger)"
          >
            <X size={12} />
          </button>
        </span>
      </div>
      <div
        // A tap on the pad must never steal the caret from the sheet.
        onMouseDown={(event) => event.stopPropagation()}
        className="max-h-[min(60vh,26rem)] overflow-auto"
      >
        {children}
      </div>
    </div>
  );
}
