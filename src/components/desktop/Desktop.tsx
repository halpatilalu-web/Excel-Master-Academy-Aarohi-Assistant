/**
 * @license MIT
 * "Windows mode" — a desktop shell that runs this course's Office apps.
 *
 * The brief was: a tab where the whole page turns into a PC, with Excel, Word,
 * PowerPoint, Paint and File Explorer inside it, working like the Windows apps.
 * This file is the window manager: wallpaper, desktop icons, draggable and
 * resizable windows, snap-to-maximise, a taskbar with a clock and a Start menu.
 *
 * Every app it hosts is the real thing from this repo (the same Excel engine
 * with its ribbon, the same Word editor), so nothing here is a screenshot.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Calculator,
  Calendar,
  ChevronRight,
  Download,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  Image as ImageIcon,
  LayoutGrid,
  LogOut,
  Maximize2,
  Minimize2,
  Monitor,
  Plus,
  Power,
  Presentation,
  Search,
  Settings,
  ShieldCheck,
  Table2,
  Wifi,
  X,
} from "lucide-react";
import { ExcelGrid } from "../ExcelGrid";
import { ExplorerApp, PaintApp, PowerPointApp, WordApp } from "./OfficeApps";
import type { DesktopFile, DocKind } from "../../lib/desktop/fs";
import { downloadText, saveDesktopFile, useDesktopFiles } from "../../lib/desktop/fs";
import { Bilingual } from "../../lib/lang";
import { SettingsPanel } from "../SettingsPanel";

export type AppId = "excel" | "word" | "powerpoint" | "paint" | "explorer" | "powerbi" | "notes" | "calc" | "calendar" | "settings";

interface AppMeta {
  id: AppId;
  name: string;
  /** Word-style icon: emoji keeps the bundle small and renders everywhere. */
  icon: string;
  colour: string;
  hint: string;
  hAccentText: string;
}

export const DESKTOP_APPS: AppMeta[] = [
  { id: "excel", name: "Excel", icon: "📊", colour: "#107c41", hint: "Spreadsheet — the same 400-formula engine with the full ribbon", hAccentText: "Workbook, formulas, charts" },
  { id: "word", name: "Word", icon: "📄", colour: "#2b579a", hint: "Document editor with styles, bullets and .doc export", hAccentText: "Letters, offer documents" },
  { id: "powerpoint", name: "PowerPoint", icon: "📽", colour: "#b7472a", hint: "Slides, thumbnails and a full-screen slide show", hAccentText: "Presentations" },
  { id: "paint", name: "Paint", icon: "🎨", colour: "#5b21b6", hint: "Draw with the mouse and save a PNG to the desktop", hAccentText: "Images, diagrams" },
  { id: "explorer", name: "File Explorer", icon: "🗂", colour: "#b45309", hint: "Every file the apps saved, with folders and delete", hAccentText: "Files on this PC" },
  { id: "powerbi", name: "Power BI", icon: "📈", colour: "#f2c811", hint: "Build a chart from a sheet and pin it to the desktop", hAccentText: "Dashboards" },
  { id: "notes", name: "Notepad", icon: "📝", colour: "#334155", hint: "Quick notes that save as .txt", hAccentText: "Scratch notes" },
  { id: "calc", name: "Calculator", icon: "🧮", colour: "#0f766e", hint: "A working calculator (keyboard included)", hAccentText: "Quick maths" },
  { id: "calendar", name: "Calendar", icon: "📅", colour: "#be123c", hint: "Month view with today highlighted", hAccentText: "Planning" },
  { id: "settings", name: "Settings", icon: "⚙️", colour: "#475569", hint: "Wallpaper, theme and what this desktop can do", hAccentText: "Personalise" },
];

interface WindowState {
  id: AppId;
  /** Cascade position so windows do not stack exactly. */
  x: number;
  y: number;
  w: number;
  h: number;
  min: boolean;
  max: boolean;
  z: number;
  openFileId?: string;
}

const WALLPAPERS = [
  { id: "green", label: "Excel green", css: "linear-gradient(135deg,#0b3d23 0%,#107c41 45%,#1f9d55 100%)" },
  { id: "blue", label: "Windows blue", css: "linear-gradient(135deg,#0b1f3a 0%,#123a6b 45%,#1e5aa8 100%)" },
  { id: "slate", label: "Office slate", css: "linear-gradient(135deg,#0f172a 0%,#1f2937 50%,#334155 100%)" },
  { id: "sunrise", label: "Sunrise", css: "linear-gradient(135deg,#4c1d95 0%,#9d174d 50%,#f59e0b 100%)" },
];

/**
 * The window's own pixel size, live. Chrome fires `resize` when the user drags
 * the window smaller or zooms; phones fire it when the address bar hides. Every
 * window is then clamped to what actually fits, so no app ever opens bigger
 * than the screen it is on (the "size automatically adjust" requirement).
 */
function useViewport() {
  const read = () => ({
    w: typeof window === "undefined" ? 1280 : window.innerWidth,
    h: typeof window === "undefined" ? 800 : window.innerHeight,
  });
  const [size, setSize] = useState(read);
  useEffect(() => {
    let frame = 0;
    const onResize = () => {
      // rAF-debounce: a drag-resize fires hundreds of events per second.
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setSize(read()));
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, []);
  return size;
}

export function Desktop({ onExit }: { onExit: () => void }) {
  const fileStore = useDesktopFiles();
  const { items: files, remove } = fileStore;
  const [windows, setWindows] = useState<WindowState[]>([]);
  const [startOpen, setStartOpen] = useState(false);
  const [wallpaper, setWallpaper] = useState(WALLPAPERS[0]);
  const [clock, setClock] = useState(() => new Date());
  const [status, setStatus] = useState("Welcome to Excel Master Academy Desktop — double-click an icon to open an app.");
  const [query, setQuery] = useState("");
  const zRef = useRef(10);
  const viewport = useViewport();

  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const openApp = useCallback(
    (id: AppId, openFileId?: string) => {
      setStartOpen(false);
      setWindows((current) => {
        const existing = current.find((item) => item.id === id);
        zRef.current += 1;
        if (existing) {
          return current.map((item) =>
            item.id === id ? { ...item, min: false, z: zRef.current, openFileId: openFileId ?? item.openFileId } : item,
          );
        }
        const step = current.length * 26;
        const wide = id === "excel" || id === "explorer";
        // Fit the viewport: phones get a near-full-screen window, desktops a
        // comfortable 980/860 px cascade.
        const availableW = viewport.w;
        const availableH = viewport.h;
        // Excel carries the ribbon, the formula bar, the sheet tabs and the
        // status bar, so a 560-620 px cascade window leaves almost no rows to
        // type in. It opens maximised, exactly like double-clicking a workbook
        // on a real PC; the student can still un-maximise it from the title bar.
        // Anything narrower than a tablet gets the whole screen: a cascade
        // window on a 400 px phone is unusable, so the app fills it instead.
        const startMax = id === "excel" || availableW < 720;
        return [
          ...current,
          {
            id,
            x: availableW < 720 ? 0 : 48 + step,
            y: availableW < 720 ? 0 : 32 + step,
            w: Math.min(wide ? 980 : 860, availableW - (availableW < 720 ? 0 : 24)),
            // Leave room for the taskbar (44 px) and the title/status bars.
            h: Math.min(wide ? 680 : 560, availableH - 64),
            min: false,
            max: startMax,
            z: zRef.current,
            openFileId,
          },
        ];
      });
    },
    [viewport.h, viewport.w],
  );

  const closeApp = (id: AppId) => setWindows((current) => current.filter((item) => item.id !== id));
  const focusApp = (id: AppId) =>
    setWindows((current) => {
      zRef.current += 1;
      return current.map((item) => (item.id === id ? { ...item, z: zRef.current, min: false } : item));
    });
  const toggleMax = (id: AppId) =>
    setWindows((current) => current.map((item) => (item.id === id ? { ...item, max: !item.max } : item)));

  /** Open a file in the app that owns its type. */
  const openFile = (file: DesktopFile) => {
    const app: AppId =
      file.kind === "sheet" ? "excel" : file.kind === "doc" ? "word" : file.kind === "slides" ? "powerpoint" : "paint";
    openApp(app, file.id);
    setStatus(`Opening ${file.name} in ${DESKTOP_APPS.find((item) => item.id === app)?.name}…`);
  };

  const saveFile = async (kind: DocKind, name: string, content: string, id?: string) => {
    const saved = await saveDesktopFile({ id, name, kind, content }, fileStore);
    setStatus(`Saved ${saved.name} to Desktop ▸ File Explorer.`);
    return saved;
  };

  const topZ = useMemo(() => windows.reduce((top, win) => Math.max(top, win.z), 0), [windows]);
  const openFileById = (id?: string) => (id ? files.find((file) => file.id === id) ?? null : null);

  return (
    <div
      id="eam-desktop-root"
      className="fixed inset-0 z-[45] flex flex-col overflow-hidden select-none"
      style={{ background: wallpaper.css }}
      role="application"
      aria-label="Windows desktop"
      /*
       * The desktop owns the mouse only for its own chrome. A drag started on the
       * wallpaper/panels must not be dispatched into the app window underneath,
       * otherwise taps in Excel look like drags and typing never starts.
       * (This also gives the window manager a capture root for drags.)
       */
      onDragStart={(event) => event.preventDefault()}
    >
      {/* Desktop icons */}
      <div className="flex-1 relative overflow-hidden">
        <div className="absolute inset-0 p-2 sm:p-4 grid grid-flow-col grid-rows-4 sm:grid-rows-5 gap-0.5 content-start justify-start overflow-auto">
          {DESKTOP_APPS.map((app) => (
            <button
              key={app.id}
              type="button"
              // One tap opens the app: double-click is undiscoverable on a phone
              // and was the reason students thought the desktop "didn't work".
              onClick={() => {
                openApp(app.id);
                setStatus(`${app.name} opened — ${app.hint}`);
              }}
              className="w-[76px] sm:w-[88px] h-[74px] rounded-lg text-white flex flex-col items-center justify-center gap-0.5 hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 active:scale-[0.97] transition select-none"
              title={`${app.name} — ${app.hint}`}
            >
              <span className="grid place-items-center h-9 w-9 sm:h-10 sm:w-10 rounded-lg bg-white/15 backdrop-blur-sm text-xl sm:text-2xl shadow-sm ring-1 ring-white/20" aria-hidden>
                {app.icon}
              </span>
              <span className="text-[10px] font-medium leading-tight text-center px-0.5 line-clamp-2 drop-shadow">{app.name}</span>
            </button>
          ))}
        </div>

        {/* A friendly "this is a PC" banner, dismissed by opening anything */}
        {windows.length === 0 && (
          <div className="absolute right-3 bottom-3 w-[min(92vw,340px)] rounded-xl bg-slate-950/70 backdrop-blur-md text-white p-3.5 shadow-2xl ring-1 ring-white/15">
            <div className="flex items-center gap-2 text-xs font-bold">
              <Monitor size={14} /> Excel Master Academy Desktop
            </div>
            <p className="text-[11px] mt-1 leading-relaxed text-white/80">
              Icon par <b className="text-white">ek tap</b> karo — app khul jaayega. Windows ko drag, resize, minimise ya
              maximise kar sakte ho; Start menu neeche hai. Sab free — koi activation nahi.
            </p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              <button
                type="button"
                onClick={() => openApp("excel")}
                className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold px-2.5 py-1"
              >
                Open Excel <ChevronRight size={12} />
              </button>
              <button
                type="button"
                onClick={() => openApp("word")}
                className="inline-flex items-center gap-1 rounded-lg bg-white/15 hover:bg-white/25 text-[11px] font-semibold px-2.5 py-1"
              >
                Word <ChevronRight size={12} />
              </button>
            </div>
          </div>
        )}

        {/* Windows */}
        {windows.map((win) => {
          const meta = DESKTOP_APPS.find((item) => item.id === win.id);
          if (!meta) return null;
          // Clamp to the *live* viewport rather than the size the window was
          // created with: shrinking the browser or rotating a phone must never
          // leave a window hanging off the screen.
          const phone = viewport.w < 720;
          const width = Math.min(win.max || phone ? viewport.w : win.w, viewport.w);
          const height = Math.min(win.max || phone ? viewport.h - 44 : win.h, viewport.h - 44);
          const left = Math.max(0, Math.min(win.max || phone ? 0 : win.x, viewport.w - width));
          const top = Math.max(0, Math.min(win.max || phone ? 0 : win.y, viewport.h - 44 - height));
          return (
            <div
              key={win.id}
              onMouseDown={() => focusApp(win.id)}
              style={{
                left,
                top,
                width,
                height,
                zIndex: win.z + (win.z === topZ ? 5 : 0),
                display: win.min ? "none" : undefined,
              }}
              className="absolute rounded-lg overflow-hidden shadow-2xl border border-slate-700/60 bg-(--color-surface) flex flex-col"
              role="dialog"
              aria-label={`${meta.name} window`}
            >
              {/* Title bar */}
              <div
                className="h-9 flex items-center justify-between px-1.5 text-white shrink-0 cursor-move select-none"
                style={{ backgroundColor: meta.colour }}
                onPointerDown={(event) => {
                  // Never start a drag on the window buttons.
                  if ((event.target as HTMLElement).closest("button")) return;
                  event.preventDefault();
                  focusApp(win.id);
                  const startX = event.clientX;
                  const startY = event.clientY;
                  // A maximised window has no free position, so dragging one
                  // *restores* it first (Windows snaps it back to a floating
                  // size and carries on dragging) — before this, dragging the
                  // title bar in full-screen mode did nothing at all.
                  const originX = win.max ? Math.max(0, startX - (win.w || 900) / 2) : win.x;
                  const originY = win.max ? 0 : win.y;
                  if (win.max) {
                    setWindows((current) =>
                      current.map((item) => (item.id === win.id ? { ...item, max: false, x: originX, y: originY } : item)),
                    );
                  }
                  (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
                  const move = (moveEvent: PointerEvent) => {
                    setWindows((current) =>
                      current.map((item) =>
                        item.id === win.id
                          ? {
                              ...item,
                              // Keep a grab-handle of the window on screen at all
                              // times, so it can never be dragged out of reach.
                              x: Math.max(-item.w + 160, Math.min(window.innerWidth - 160, originX + moveEvent.clientX - startX)),
                              y: Math.max(0, Math.min(window.innerHeight - 120, originY + moveEvent.clientY - startY)),
                            }
                          : item,
                      ),
                    );
                  };
                  const up = () => {
                    window.removeEventListener("pointermove", move);
                    window.removeEventListener("pointerup", up);
                    window.removeEventListener("pointercancel", up);
                  };
                  window.addEventListener("pointermove", move);
                  window.addEventListener("pointerup", up);
                  window.addEventListener("pointercancel", up);
                }}
                onDoubleClick={() => {
                  // Windows: double-click the title bar to maximise / restore.
                  toggleMax(win.id);
                }}
              >
                <div className="flex items-center gap-1.5 text-[11px] font-semibold truncate">
                  <span aria-hidden>{meta.icon}</span>
                  {meta.name}
                  {win.openFileId && (
                    <span className="opacity-80 font-normal truncate">— {openFileById(win.openFileId)?.name}</span>
                  )}
                </div>
                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    aria-label={`Minimise ${meta.name}`}
                    onClick={() => setWindows((current) => current.map((item) => (item.id === win.id ? { ...item, min: true } : item)))}
                    className="p-1.5 hover:bg-white/20 rounded"
                  >
                    <Minimize2 size={12} />
                  </button>
                  <button type="button" aria-label={`Maximise ${meta.name}`} onClick={() => toggleMax(win.id)} className="p-1.5 hover:bg-white/20 rounded">
                    <Maximize2 size={12} />
                  </button>
                  <button type="button" aria-label={`Close ${meta.name}`} onClick={() => closeApp(win.id)} className="p-1.5 hover:bg-rose-600 rounded">
                    <X size={12} />
                  </button>
                </div>
              </div>

              {/* App body */}
              <div className="flex-1 min-h-0 overflow-auto">
                {win.id === "excel" && (
                  <ExcelAppBody
                    file={openFileById(win.openFileId)}
                    files={files}
                    onOpenFile={(next) => openApp("excel", next.id)}
                    onSave={async (name, content) => {
                      const saved = await saveFile("sheet", name, content, win.openFileId);
                      if (saved && !win.openFileId) {
                        // First save of a brand-new book: bind the window to it so
                        // the next save updates the same file instead of a copy.
                        setWindows((current) =>
                          current.map((item) => (item.id === "excel" ? { ...item, openFileId: saved.id } : item)),
                        );
                      }
                      return saved;
                    }}
                    onStatus={setStatus}
                  />
                )}
                {win.id === "word" && (
                  <WordApp
                    file={openFileById(win.openFileId)}
                    onSave={(name, content) => void saveFile("doc", name, content, win.openFileId)}
                    onStatus={setStatus}
                  />
                )}
                {win.id === "powerpoint" && (
                  <PowerPointApp
                    file={openFileById(win.openFileId)}
                    onSave={(name, content) => void saveFile("slides", name, content, win.openFileId)}
                    onStatus={setStatus}
                  />
                )}
                {win.id === "paint" && (
                  <PaintApp onSave={(name, content) => void saveFile("image", name, content, win.openFileId)} onStatus={setStatus} />
                )}
                {win.id === "explorer" && (
                  <ExplorerApp
                    files={files}
                    onOpen={openFile}
                    onDelete={(id) => void remove(id).catch(() => undefined)}
                    onStatus={setStatus}
                  />
                )}
                {win.id === "notes" && (
                  <NotepadApp
                    initial={openFileById(win.openFileId)?.content ?? ""}
                    onSave={(name, content) => void saveFile("text", name, content, win.openFileId)}
                  />
                )}
                {win.id === "calc" && <CalculatorApp />}
                {win.id === "calendar" && <CalendarApp />}
                {win.id === "powerbi" && <PowerBiApp files={files} onStatus={setStatus} />}
                {win.id === "settings" && (
                  <SettingsApp wallpaperId={wallpaper.id} onWallpaper={(id) => setWallpaper(WALLPAPERS.find((item) => item.id === id) ?? WALLPAPERS[0])} />
                )}
              </div>

              {/* Status bar inside the window */}
              <div className="h-5 shrink-0 bg-(--color-canvas) border-t border-(--color-border) px-2 flex items-center text-[10px] text-(--color-muted)">
                {meta.hint}
              </div>

              {/* Resize grip */}
              {!win.max && (
                <span
                  aria-hidden
                  onMouseDown={(event) => {
                    event.stopPropagation();
                    const startX = event.clientX;
                    const startY = event.clientY;
                    const originW = win.w;
                    const originH = win.h;
                    const move = (moveEvent: MouseEvent) => {
                      setWindows((current) =>
                        current.map((item) =>
                          item.id === win.id
                            ? {
                                ...item,
                                w: Math.max(360, originW + moveEvent.clientX - startX),
                                h: Math.max(260, originH + moveEvent.clientY - startY),
                              }
                            : item,
                        ),
                      );
                    };
                    const up = () => {
                      window.removeEventListener("mousemove", move);
                      window.removeEventListener("mouseup", up);
                    };
                    window.addEventListener("mousemove", move);
                    window.addEventListener("mouseup", up);
                  }}
                  className="absolute bottom-0 right-0 w-3.5 h-3.5 cursor-nwse-resize"
                  style={{ background: "linear-gradient(135deg,transparent 45%,rgba(0,0,0,.35) 45%)" }}
                />
              )}
            </div>
          );
        })}

        {/* Start menu */}
        {startOpen && (
          <>
            <button
              type="button"
              aria-label="Close Start menu"
              onClick={() => setStartOpen(false)}
              className="absolute inset-0 z-[69] cursor-default"
            />
            <div className="absolute left-1/2 -translate-x-1/2 bottom-1 w-[min(96vw,560px)] rounded-xl bg-[#0f172a]/95 backdrop-blur-xl text-slate-100 shadow-2xl ring-1 ring-white/10 p-3 z-[70]">
              <div className="flex items-center gap-2 rounded-lg bg-white/10 px-2.5 py-1.5 mb-2.5 ring-1 ring-white/10">
                <Search size={13} className="text-white/60" />
                <input
                  autoFocus
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search apps and files"
                  aria-label="Search apps and files"
                  className="bg-transparent text-xs outline-none w-full placeholder:text-slate-400"
                />
              </div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-white/50 px-1 mb-1">All apps</div>
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-0.5">
                {DESKTOP_APPS.filter((app) => app.name.toLowerCase().includes(query.trim().toLowerCase())).map((app) => (
                  <button
                    key={app.id}
                    type="button"
                    onClick={() => openApp(app.id)}
                    className="flex flex-col items-center gap-1 rounded-lg p-2 hover:bg-white/10 active:scale-[0.97] transition"
                  >
                    <span className="text-xl" aria-hidden>
                      {app.icon}
                    </span>
                    <span className="text-[10px] text-center leading-tight">{app.name}</span>
                  </button>
                ))}
                {files
                  .filter((file) => file.name.toLowerCase().includes(query.trim().toLowerCase()) && query.trim() !== "")
                  .slice(0, 6)
                  .map((file) => (
                    <button
                      key={file.id}
                      type="button"
                      onClick={() => {
                        openFile(file);
                        setStartOpen(false);
                      }}
                      className="flex flex-col items-center gap-1 rounded-lg p-2 hover:bg-white/10"
                    >
                      <span className="text-xl" aria-hidden>
                        {file.kind === "sheet" ? "📊" : file.kind === "doc" ? "📄" : file.kind === "slides" ? "📽" : file.kind === "image" ? "🖼" : "📃"}
                      </span>
                      <span className="text-[9px] text-center leading-tight line-clamp-2">{file.name}</span>
                    </button>
                  ))}
              </div>
              <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between text-[11px]">
                <span className="inline-flex items-center gap-1.5 text-white/70">
                  <span className="grid place-items-center h-5 w-5 rounded-full bg-emerald-600 text-[9px] font-bold">S</span>
                  Student
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setStartOpen(false);
                    onExit();
                  }}
                  className="inline-flex items-center gap-1 rounded-md bg-white/10 px-2 py-1 hover:bg-white/20"
                >
                  <Power size={11} /> Exit desktop
                </button>
              </div>
            </div>
          </>
        )}


      </div>

      {/* Taskbar */}
      <div className="h-12 shrink-0 bg-[#0b1220]/85 backdrop-blur-xl border-t border-white/10 flex items-center px-2 gap-1.5 text-slate-100 z-[80] shadow-[0_-6px_28px_rgba(0,0,0,0.35)]">
        <button
          type="button"
          onClick={() => setStartOpen((open) => !open)}
          aria-label="Start menu"
          aria-expanded={startOpen}
          className={`grid place-items-center h-9 w-9 rounded-lg transition ${
            startOpen ? "bg-white/20" : "hover:bg-white/10"
          }`}
          title="Start"
        >
          <LayoutGrid size={17} />
        </button>
        <button
          type="button"
          onClick={() => openApp("explorer")}
          aria-label="File Explorer"
          title="File Explorer"
          className="grid place-items-center h-9 w-9 rounded-lg hover:bg-white/10 text-[15px]"
        >
          🗂
        </button>
        <span className="w-px h-6 bg-white/15 mx-0.5" aria-hidden />

        {/* Running apps — the taskbar's real job */}
        <div className="flex items-center gap-1 overflow-x-auto">
          {windows.map((window) => {
            const meta = DESKTOP_APPS.find((item) => item.id === window.id);
            if (!meta) return null;
            const active = !window.min && window.z === topZ;
            return (
              <button
                key={window.id}
                type="button"
                onClick={() =>
                  active
                    ? setWindows((current) => current.map((item) => (item.id === window.id ? { ...item, min: true } : item)))
                    : focusApp(window.id)
                }
                className={`relative h-9 px-2 rounded-lg flex items-center gap-1.5 text-[11px] whitespace-nowrap transition ${
                  active ? "bg-white/18" : "hover:bg-white/10"
                }`}
                title={meta.name}
              >
                <span aria-hidden className="text-[13px]">{meta.icon}</span>
                <span className="hidden sm:inline">{meta.name}</span>
                <span
                  aria-hidden
                  className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 h-0.5 rounded-full transition-all ${
                    active ? "w-4 bg-emerald-400" : "w-1.5 bg-white/40"
                  }`}
                />
              </button>
            );
          })}
        </div>

        {/* System tray */}
        <div className="ml-auto flex items-center gap-1.5 text-[11px] pr-0.5">
          <span className="hidden md:inline-flex items-center gap-1 rounded-full bg-emerald-500/15 text-emerald-300 px-2 py-0.5 text-[10px] font-semibold">
            <ShieldCheck size={11} /> Free · no activation
          </span>
          <Wifi size={13} className="text-white/70" aria-hidden />
          <div className="text-right leading-tight tabular-nums pr-1">
            <div className="text-[11px] font-semibold">{clock.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
            <div className="text-[9px] text-white/60">{clock.toLocaleDateString([], { day: "2-digit", month: "short" })}</div>
          </div>
          <button
            type="button"
            onClick={onExit}
            aria-label="Exit to the course"
            title="Exit to the course"
            className="h-9 px-2.5 rounded-lg hover:bg-rose-600/80 flex items-center gap-1 text-[11px] font-semibold"
          >
            <LogOut size={13} /> <span className="hidden md:inline">Exit</span>
          </button>
        </div>
      </div>

      {/*
       * Status line. It is pointer-events-none *and* sits above the taskbar, so
       * it can never eat a tap meant for a cell, the ribbon or a dialog.
       */}
      <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-14 z-[81] max-w-[92vw] rounded-full bg-black/70 text-white text-[11px] px-3 py-1.5 shadow-lg">
        {status}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------------
 * The apps that run inside desktop windows.
 *
 * These MUST live at module scope: when they were declared inside `Desktop`,
 * every parent re-render produced a brand-new component type, React remounted
 * the app, and the Excel sheet lost its state on each keystroke. Module scope
 * keeps their identity stable so typing, selection and editing all persist.
 * -------------------------------------------------------------------------- */

/** Floating status line callbacks are passed down instead of closed over. */
export interface AppStatus {
  setStatus: (message: string) => void;
}

/**
 * Excel inside a window.
 *
 * Two states, exactly like the real app:
 *  - **Start screen** when no saved workbook is open: "Blank workbook" plus the
 *    workbooks already on this PC. Without it the window showed a blank grid the
 *    student could not name, save or reopen — "workbook hi nahi hai".
 *  - **A real sheet** once a workbook exists: the full ribbon grid, saved to the
 *    desktop so File Explorer and a reload both find it.
 */
function ExcelAppBody({
  file,
  files,
  onOpenFile,
  onSave,
  onStatus,
}: {
  file: DesktopFile | null;
  files: DesktopFile[];
  onOpenFile: (file: DesktopFile) => void;
  onSave: (name: string, content: string) => Promise<DesktopFile | void> | void;
  onStatus: (message: string) => void;
}) {
  const [liveCells, setLiveCells] = useState<Record<string, string>>({});
  const [name, setName] = useState(file?.name ?? "Workbook1.xlsx");
  /** The workbook this window is editing (created on first save / New). */
  const [book, setBook] = useState<DesktopFile | null>(file);
  const [savingNow, setSavingNow] = useState(false);
  const initial = useMemo(() => {
    try {
      const parsed = file?.content ? (JSON.parse(file.content) as Record<string, string>) : {};
      return Object.keys(parsed).length ? parsed : {};
    } catch {
      return {};
    }
  }, [file?.content]);

  useEffect(() => {
    setName(file?.name ?? "Workbook1.xlsx");
    setBook(file);
  }, [file?.id, file?.name]);

  const sheets = files.filter((item) => item.kind === "sheet");

  /** Save the sheet now, and open a fresh workbook tab if this one is new. */
  const saveWorkbook = async () => {
    const fileName = name.trim() || "Workbook1.xlsx";
    setSavingNow(true);
    try {
      const saved = await onSave(fileName, JSON.stringify(liveCells));
      if (saved) setBook(saved);
      onStatus(`Excel: “${fileName}” saved to the desktop — File Explorer mein bhi dikhega.`);
    } finally {
      setSavingNow(false);
    }
  };

  /* ------------------------------ start screen ----------------------------- */

  if (!book) {
    return (
      <div className="h-full min-h-0 overflow-auto bg-(--color-surface) p-3 sm:p-4">
        <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-(--color-muted)">
          <FileSpreadsheet size={13} className="text-(--color-accent)" /> Excel · Start
        </div>
        <div className="mt-2 grid sm:grid-cols-2 gap-2">
          <button
            type="button"
            aria-label="New blank workbook"
            onClick={() => {
              const fresh: DesktopFile = {
                id: "new",
                name: `Workbook${sheets.length + 1}.xlsx`,
                kind: "sheet",
                content: "{}",
                folder: "Desktop",
                updatedAt: new Date().toISOString(),
              };
              setName(fresh.name);
              setBook(fresh);
              setLiveCells({});
              onStatus("Naya blank workbook khul gaya — cells mein type karo, phir Save dabao.");
            }}
            className="flex items-center gap-2.5 rounded-xl border border-(--color-accent)/50 bg-(--color-accent-soft)/40 px-3 py-3 text-left hover:border-(--color-accent)"
          >
            <span className="grid place-items-center h-10 w-10 rounded-lg bg-(--color-accent) text-white shrink-0">
              <Plus size={18} />
            </span>
            <span className="min-w-0">
              <span className="block text-xs font-bold text-(--color-ink)">Blank workbook</span>
              <span className="block text-[10px] text-(--color-muted)">Khaali sheet — 60 rows × 14 columns, poora ribbon</span>
            </span>
          </button>
          <button
            type="button"
            aria-label="Import a sheet from Excel"
            onClick={() => {
              const fresh: DesktopFile = {
                id: "new",
                name: `Imported${sheets.length + 1}.xlsx`,
                kind: "sheet",
                content: "{}",
                folder: "Desktop",
                updatedAt: new Date().toISOString(),
              };
              setName(fresh.name);
              setBook(fresh);
              onStatus("Naya workbook khula — File ▸ Open se .xlsx ya .csv import karo.");
            }}
            className="flex items-center gap-2.5 rounded-xl neu-btn px-3 py-3 text-left hover:border-(--color-accent)"
          >
            <span className="grid place-items-center h-10 w-10 rounded-lg bg-(--color-surface-2) text-(--color-ink) shrink-0">
              <FolderOpen size={17} />
            </span>
            <span className="min-w-0">
              <span className="block text-xs font-bold text-(--color-ink)">Open / import</span>
              <span className="block text-[10px] text-(--color-muted)">.xlsx ya .csv file apne device se</span>
            </span>
          </button>
        </div>

        <div className="mt-3 text-[11px] font-bold text-(--color-ink)">Recent workbooks on this PC</div>
        {sheets.length === 0 ? (
          <p className="text-[11px] text-(--color-muted) mt-1">
            Abhi koi workbook save nahi hua. “Blank workbook” par tap karo — phir Save, aur woh yahan aa jaayega.
          </p>
        ) : (
          <ul className="mt-1 grid sm:grid-cols-2 gap-1.5">
            {sheets.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => {
                    onOpenFile(item);
                    onStatus(`Opening ${item.name}…`);
                  }}
                  className="w-full flex items-center gap-2 rounded-lg neu-btn px-2.5 py-2 text-left hover:border-(--color-accent) hover:bg-(--color-accent-soft)/40"
                >
                  <FileSpreadsheet size={14} className="text-emerald-600 shrink-0" />
                  <span className="min-w-0">
                    <span className="block text-[11px] font-semibold text-(--color-ink) truncate">{item.name}</span>
                    <span className="block text-[10px] text-(--color-muted)">
                      {new Date(item.updatedAt).toLocaleDateString()} · {Object.keys(JSON.parse(item.content || "{}")).length} cell(s)
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="text-[10px] text-(--color-muted) mt-3 leading-relaxed">
          Yahi Excel tab hai jo real app mein khulta hai — File ▸ New, Open, Print aur Download .xlsx sab isi window ke ribbon mein hain.
        </p>
      </div>
    );
  }

  /* -------------------------------- the sheet ------------------------------ */

  return (
    <div className="h-full min-h-0 flex flex-col">
      <div className="flex items-center gap-1.5 border-b border-(--color-border) bg-(--color-surface-2) px-2 py-1 overflow-x-auto shrink-0">
        <FileSpreadsheet size={13} className="text-(--color-accent) shrink-0" />
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          aria-label="Workbook name"
          className="rounded-md neu-field bg-(--color-surface) px-2 py-0.5 text-[11px] text-(--color-ink) w-40 shrink-0"
        />
        <button
          type="button"
          onClick={() => void saveWorkbook()}
          className="inline-flex items-center gap-1 rounded-md bg-(--color-accent) text-white px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap shrink-0"
        >
          <FileSpreadsheet size={12} /> {savingNow ? "Saving…" : "Save to desktop"}
        </button>
        <button
          type="button"
          aria-label="New workbook"
          onClick={() => {
            setBook(null);
            setLiveCells({});
            onStatus("Naya workbook — naam likho aur Save dabao.");
          }}
          className="inline-flex items-center gap-1 rounded-md neu-btn px-2 py-0.5 text-[11px] font-semibold text-(--color-ink) whitespace-nowrap shrink-0"
        >
          <Plus size={12} /> New
        </button>
        <button
          type="button"
          onClick={() =>
            downloadText(
              name.replace(/\.xlsx?$/i, "") + ".csv",
              Object.entries(liveCells)
                .map(([key, value]) => `${key},${value}`)
                .join("\n"),
              "text/csv",
            )
          }
          className="inline-flex items-center gap-1 rounded-md neu-btn px-2 py-0.5 text-[11px] font-semibold text-(--color-ink) whitespace-nowrap shrink-0"
        >
          <Table2 size={12} /> Quick CSV
        </button>
        <span className="text-[10px] text-(--color-muted) ml-auto hidden md:inline whitespace-nowrap">
          Poora ribbon andar hai · sheet ko jagah dene ke liye Ctrl+F1
        </span>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden p-0">
        <ExcelGrid
          template={`desktop-${book.id === "new" ? `new-${name}` : book.id}`}
          title={name}
          sheets={[{ name: "Sheet1", cells: initial }]}
          rows={60}
          cols={14}
          compact
          fill
          onCellsChange={setLiveCells}
        />
      </div>
    </div>
  );
}

function NotepadApp({ initial, onSave }: { initial: string; onSave: (name: string, content: string) => void }) {
  const [name, setName] = useState("Note1.txt");
  const [text, setText] = useState(initial);
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-1.5 border-b border-(--color-border) bg-(--color-surface-2) px-2 py-1.5">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          aria-label="Note name"
          className="rounded-md neu-field bg-(--color-surface) px-2 py-1 text-[11px] w-44"
        />
        <button
          type="button"
          onClick={() => onSave(name, text)}
          className="inline-flex items-center gap-1 rounded-md bg-(--color-accent) text-white px-2.5 py-1 text-[11px] font-semibold"
        >
          <FileText size={12} /> Save .txt
        </button>
        <button
          type="button"
          onClick={() => downloadText(name, text)}
          className="inline-flex items-center gap-1 rounded-md neu-btn px-2.5 py-1 text-[11px] font-semibold text-(--color-ink)"
        >
          <Download size={12} /> Download
        </button>
      </div>
      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        aria-label="Notepad text"
        className="flex-1 w-full resize-none p-3 font-mono text-xs bg-(--color-surface) text-(--color-ink) outline-none"
        placeholder="Yahan kuch bhi likho…"
      />
    </div>
  );
}

function CalculatorApp() {
  const [display, setDisplay] = useState("0");
  const press = (key: string) => {
    if (key === "C") return setDisplay("0");
    if (key === "←") return setDisplay((current) => (current.length > 1 ? current.slice(0, -1) : "0"));
    if (key === "=") {
      try {
        // Only digits and operators reach eval — no letters, so this is safe.
        if (!/^[0-9+\-*/.() %]+$/.test(display)) return setDisplay("Error");
        const value = Function(`"use strict";return (${display.replace(/%/g, "/100")})`)() as number;
        return setDisplay(Number.isFinite(value) ? String(Number(value.toFixed(10))) : "Error");
      } catch {
        return setDisplay("Error");
      }
    }
    setDisplay((current) => (current === "0" && !"+-*/.".includes(key) ? key : current + key));
  };
  const keys = ["C", "←", "%", "/", "7", "8", "9", "*", "4", "5", "6", "-", "1", "2", "3", "+", "0", ".", "="];
  return (
    <div className="h-full flex flex-col p-3 bg-(--color-surface)">
      <div className="rounded-xl neu-btn bg-(--color-canvas) px-3 py-3 text-right font-mono text-xl text-(--color-ink) min-h-12 break-all">
        {display}
      </div>
      <div className="mt-2 grid grid-cols-4 gap-1.5 flex-1">
        {keys.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => press(key)}
            className={`rounded-lg border text-sm font-bold ${
              key === "="
                ? "bg-(--color-accent) text-white border-transparent"
                : "border-(--color-border) bg-(--color-surface-2) text-(--color-ink) hover:bg-(--color-accent-soft)"
            }`}
          >
            {key}
          </button>
        ))}
      </div>
    </div>
  );
}

function CalendarApp() {
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth());
  const [year, setYear] = useState(today.getFullYear());
  const first = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  return (
    <div className="h-full flex flex-col p-3 bg-(--color-surface)">
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={() => {
            const next = month - 1;
            if (next < 0) {
              setMonth(11);
              setYear(year - 1);
            } else setMonth(next);
          }}
          className="px-2 py-1 rounded neu-btn text-xs"
        >
          ←
        </button>
        <div className="text-sm font-bold text-(--color-ink)">
          {new Date(year, month, 1).toLocaleString([], { month: "long" })} {year}
        </div>
        <button
          type="button"
          onClick={() => {
            const next = month + 1;
            if (next > 11) {
              setMonth(0);
              setYear(year + 1);
            } else setMonth(next);
          }}
          className="px-2 py-1 rounded neu-btn text-xs"
        >
          →
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-(--color-muted)">
        {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
          <div key={`${day}-${index}`}>{day}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 flex-1 mt-1">
        {Array.from({ length: first }, (_, index) => (
          <div key={`pad-${index}`} />
        ))}
        {Array.from({ length: days }, (_, index) => {
          const day = index + 1;
          const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
          return (
            <div
              key={day}
              className={`rounded-lg flex items-center justify-center text-xs ${
                isToday ? "bg-(--color-accent) text-white font-bold" : "bg-(--color-canvas) text-(--color-ink)"
              }`}
            >
              {day}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PowerBiApp({ files: allFiles, onStatus }: { files: DesktopFile[]; onStatus: (message: string) => void }) {
  const [fileId, setFileId] = useState(allFiles.find((file) => file.kind === "sheet")?.id ?? "");
  const file = allFiles.find((item) => item.id === fileId);
  const numbers = useMemo(() => {
    if (!file) return [] as { label: string; value: number }[];
    try {
      const cells = JSON.parse(file.content) as Record<string, string>;
      return Object.entries(cells)
        .filter(([, value]) => /^-?\d+(\.\d+)?$/.test(value))
        .slice(0, 8)
        .map(([address, value]) => ({ label: address, value: Number(value) }));
    } catch {
      return [];
    }
  }, [file]);
  const max = numbers.length ? Math.max(...numbers.map((item) => item.value)) : 1;
  return (
    <div className="h-full flex flex-col p-3 gap-2 bg-(--color-surface)">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] font-bold text-(--color-ink)">Data source</span>
        <select
          aria-label="Dashboard data source"
          value={fileId}
          onChange={(event) => setFileId(event.target.value)}
          className="rounded-md neu-field bg-(--color-surface) px-2 py-1 text-[11px]"
        >
          <option value="">— choose a saved workbook —</option>
          {allFiles.filter((item) => item.kind === "sheet").map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => onStatus(`Power BI: ${numbers.length} numeric cells charted from ${file?.name ?? "—"}.`)}
          className="rounded-md bg-(--color-accent) text-white px-2.5 py-1 text-[11px] font-semibold"
        >
          Refresh visual
        </button>
      </div>
      <div className="flex-1 rounded-xl neu-btn bg-(--color-canvas) p-3">
        {numbers.length === 0 ? (
          <p className="text-xs text-(--color-muted)">
            Pehle Excel mein numbers wali sheet save karo, phir yahan chart banega.
          </p>
        ) : (
          <div className="space-y-1.5">
            {numbers.map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <span className="w-10 text-[10px] font-mono text-(--color-muted)">{item.label}</span>
                <div className="flex-1 h-4 rounded bg-(--color-surface-2) overflow-hidden">
                  <div className="h-full bg-(--color-accent)" style={{ width: `${(item.value / max) * 100}%` }} />
                </div>
                <span className="w-16 text-right text-[10px] font-mono text-(--color-ink)">{item.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="text-[10px] text-(--color-muted)">Charts readable from any saved workbook — free, no licence.</div>
    </div>
  );
}

function SettingsApp({ wallpaperId, onWallpaper }: { wallpaperId: string; onWallpaper: (id: string) => void }) {
  return (
    <div className="h-full space-y-3 overflow-y-auto bg-(--color-surface) p-3 pb-8">
      <div>
        <div className="text-[11px] font-bold uppercase tracking-wide text-(--color-muted)">Personalisation</div>
        <div className="flex flex-wrap gap-2 mt-1.5">
          {WALLPAPERS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onWallpaper(item.id)}
              className={`h-14 w-24 rounded-lg border-2 ${wallpaperId === item.id ? "border-(--color-accent)" : "border-transparent"}`}
              style={{ background: item.css }}
              title={item.label}
            >
              <span className="sr-only">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
      {/* The same switch board the rest of the app uses, so desktop Excel and
          the site can never disagree about what is on. */}
      <div className="rounded-xl bg-(--color-canvas) p-2.5">
        <SettingsPanel />
      </div>

      <Bilingual
        en="This desktop runs the course's own apps in the browser: Excel with the full 400-formula engine and ribbon, Word with styles and .doc export, PowerPoint with a real slide show, Paint with PNG export, File Explorer over your saved files, plus Notepad, Calculator, Calendar, Power BI-style charts and these settings. Nothing needs a Microsoft licence."
        hi="Yeh desktop course ke apne apps browser mein chalata hai: Excel (400 formulas + poora ribbon), Word (styles + .doc export), PowerPoint (asli slide show), Paint (PNG), File Explorer, Notepad, Calculator, Calendar, Power BI-style charts aur settings. Kisi Microsoft licence ki zaroorat nahi."
      />
      <ul className="text-[11px] text-(--color-muted) space-y-1">
        <li>• Windows ko drag, resize, minimise, maximise aur close kar sakte ho.</li>
        <li>• Har file Desktop ▸ File Explorer mein save hoti hai (aapke account mein).</li>
        <li>• Start menu se search karo, taskbar se switch karo.</li>
        <li>
          • VBA / Power Query jaise features browser mein nahi chalte — unke liye .xlsx download karke desktop Excel
          kholo.
        </li>
      </ul>
    </div>
  );
}
