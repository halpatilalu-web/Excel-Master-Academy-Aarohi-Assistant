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
 *
 * **It is also resizable**, because "kitna marji chahe utna bad ya chhota": the
 * bottom-right corner is a resize grip (pointer drag, 8px steps), and the
 * header carries three preset sizes (small / medium / large) for the times a
 * student just wants it out of the way or wants big keys. Size is remembered
 * with the position, and the whole thing is clamped to the viewport.
 */
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { GripVertical, Maximize2, Minimize2, Pin, Scaling, X } from "lucide-react";

const STORAGE_KEY = "excel-academy:keyboard-position";
/** Width/height of the floating pad, kept separately so docking does not lose it. */
const SIZE_KEY = "excel-academy:keyboard-size";

interface Position {
  /** Pixels from the left of the viewport. */
  x: number;
  /** Pixels from the top of the viewport. */
  y: number;
}

interface Size {
  w: number;
  h: number;
}

/** The three preset sizes the header offers. Widths in px, height by row count. */
const PRESETS = {
  small: { w: 380, h: 210 },
  medium: { w: 620, h: 330 },
  large: { w: 900, h: 430 },
} as const;

const MIN_W = 300;
const MIN_H = 170;

function readJSON<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function readPosition(): Position | null {
  const parsed = readJSON<Position>(STORAGE_KEY);
  if (!parsed || typeof parsed.x !== "number" || typeof parsed.y !== "number") return null;
  return parsed;
}

function readSize(): Size | null {
  const parsed = readJSON<Size>(SIZE_KEY);
  if (!parsed || typeof parsed.w !== "number" || typeof parsed.h !== "number") return null;
  return parsed;
}

function writeJSON(key: string, value: unknown | null) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private mode */
  }
}

/** Clamp a requested size to the viewport, keeping keys usable. */
function clampSize(w: number, h: number): Size {
  const maxW = Math.max(MIN_W, window.innerWidth - 8);
  const maxH = Math.max(MIN_H, window.innerHeight - 120);
  return { w: Math.min(Math.max(MIN_W, w), maxW), h: Math.min(Math.max(MIN_H, h), maxH) };
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
  const [size, setSize] = useState<Size>(() =>
    typeof window === "undefined" ? PRESETS.medium : clampSize(readSize()?.w ?? PRESETS.medium.w, readSize()?.h ?? PRESETS.medium.h),
  );
  const [dragging, setDragging] = useState(false);
  /** Resizing with the corner grip — kept apart from dragging so the cursor is right. */
  const [resizing, setResizing] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const resizeStart = useRef({ x: 0, y: 0, w: 0, h: 0 });
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

  // Remember where it was dropped and how big it was made.
  useEffect(() => {
    if (dragging || resizing) return;
    writeJSON(STORAGE_KEY, position);
    writeJSON(SIZE_KEY, size);
  }, [dragging, position, resizing, size]);

  /**
   * The corner grip. Pointer events with capture, so a thumb works the same as
   * a mouse, and the step is rounded to 8px so the size never becomes an odd
   * number that breaks the key grid.
   */
  const startResize = useCallback((event: React.PointerEvent) => {
    event.preventDefault();
    event.stopPropagation();
    resizeStart.current = { x: event.clientX, y: event.clientY, w: panelRef.current?.offsetWidth ?? 320, h: panelRef.current?.offsetHeight ?? 260 };
    setResizing(true);
    (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
  }, []);

  useEffect(() => {
    if (!resizing) return;
    const move = (event: PointerEvent) => {
      const dx = event.clientX - resizeStart.current.x;
      const dy = event.clientY - resizeStart.current.y;
      const next = clampSize(
        Math.round((resizeStart.current.w + dx) / 8) * 8,
        Math.round((resizeStart.current.h + dy) / 8) * 8,
      );
      setSize(next);
      // A wider pad may no longer fit where it stands.
      setPosition((current) => (current ? clampToViewport(current.x, current.y, next.w, next.h) : current));
    };
    const end = () => setResizing(false);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
    };
  }, [resizing]);

  /** Preset sizes, plus "fit to the screen" for a projector or a phone. */
  const applyPreset = useCallback((preset: keyof typeof PRESETS | "fit") => {
    const next =
      preset === "fit"
        ? clampSize(window.innerWidth - 16, window.innerHeight - 160)
        : clampSize(PRESETS[preset].w, PRESETS[preset].h);
    setSize(next);
    setPosition((current) => (current ? clampToViewport(current.x, current.y, next.w, next.h) : current));
  }, []);

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
          aria-label="Float the keyboard — drag it anywhere"
          title="Float the keyboard — drag it anywhere"
          className="flex w-full items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-(--color-muted) hover:text-(--color-accent-dark)"
        >
          <GripVertical size={12} /> Drag to move the keyboard anywhere
        </button>
        {/* Docked, the pad fills the sheet's column — drag the grip below to
            pull it out and resize it freely. */}
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
      style={{ left: position.x, top: position.y, width: size.w, height: size.h }}
      className={`fixed z-[60] flex flex-col rounded-xl bg-(--color-surface) p-1.5 shadow-(--neu-raised-lg) ring-1 ring-(--color-border-strong) no-print ${
        dragging ? "cursor-grabbing" : resizing ? "cursor-nwse-resize" : ""
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
        <span className="flex min-w-0 items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-(--color-muted)">
          <GripVertical size={12} /> <span className="truncate">{title} · drag me</span>
        </span>
        <span className="flex shrink-0 items-center gap-0.5">
          {/* Size presets — "kitna marji chahe utna bad ya chhota". */}
          <button
            type="button"
            aria-label="Make the keyboard smaller"
            title="Chhota karo"
            onClick={() => applyPreset("small")}
            className="rounded p-1 text-(--color-muted) hover:bg-(--color-accent-soft) hover:text-(--color-accent-dark)"
          >
            <Minimize2 size={12} />
          </button>
          <button
            type="button"
            aria-label="Make the keyboard bigger"
            title="Bada karo"
            onClick={() => applyPreset("large")}
            className="rounded p-1 text-(--color-muted) hover:bg-(--color-accent-soft) hover:text-(--color-accent-dark)"
          >
            <Maximize2 size={12} />
          </button>
          <button
            type="button"
            aria-label="Fit the keyboard to the screen"
            title="Poori screen jitna"
            onClick={() => applyPreset("fit")}
            className="rounded p-1 text-(--color-muted) hover:bg-(--color-accent-soft) hover:text-(--color-accent-dark)"
          >
            <Scaling size={12} />
          </button>
          <span className="mx-0.5 h-3 w-px bg-(--color-border-strong)" aria-hidden />
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
        className="min-h-0 flex-1 overflow-auto"
      >
        {children}
      </div>

      {/* Resize grip: drag the corner to any size. */}
      <span
        role="button"
        aria-label="Resize the keyboard"
        title="Drag the corner — jitna bada ya chhota chahiye"
        onPointerDown={startResize}
        className="absolute bottom-0 right-0 h-5 w-5 cursor-nwse-resize touch-none rounded-br-xl text-(--color-muted) hover:text-(--color-accent-dark)"
        style={{ background: "linear-gradient(135deg,transparent 55%,currentColor 55%,currentColor 62%,transparent 62%,transparent 74%,currentColor 74%,currentColor 81%,transparent 81%)" }}
      >
        <span className="sr-only">Resize</span>
      </span>
    </div>
  );
}
