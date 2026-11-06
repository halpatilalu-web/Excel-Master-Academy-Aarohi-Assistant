/**
 * @license MIT
 * The desktop's Office suite: Word, PowerPoint, Paint and File Explorer.
 *
 * Each app is a real editor, not a screenshot: Word renders headings, bold and
 * bullet lists from a tiny markdown subset and exports .doc; PowerPoint edits
 * real slides and exports .pptx-shaped HTML; Paint draws with the mouse and
 * saves a PNG; Explorer lists the same files every app writes. They all share
 * the desktop file system, so "Save" in Word puts the file on the desktop.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bold,
  Download,
  FileText,
  Folder,
  Image as ImageIcon,
  Italic,
  List,
  Plus,
  Presentation,
  Save,
  Trash2,
  Type,
  Underline,
} from "lucide-react";
import { Button } from "../ui";
import type { DesktopFile } from "../../lib/desktop/fs";
import { downloadText } from "../../lib/desktop/fs";

/* ================================ WORD ================================= */

const WORD_STYLES: { id: string; label: string; wrap: [string, string] }[] = [
  { id: "h1", label: "Heading 1", wrap: ["# ", ""] },
  { id: "h2", label: "Heading 2", wrap: ["## ", ""] },
  { id: "b", label: "Bold", wrap: ["**", "**"] },
  { id: "i", label: "Italic", wrap: ["_", "_"] },
  { id: "u", label: "Underline", wrap: ["<u>", "</u>"] },
  { id: "bullet", label: "Bullet", wrap: ["- ", ""] },
];

export function WordApp({
  file,
  onSave,
  onStatus,
}: {
  file: DesktopFile | null;
  onSave: (name: string, content: string) => void;
  onStatus: (message: string) => void;
}) {
  const [name, setName] = useState(file?.name ?? "Document1.docx");
  const [text, setText] = useState(file?.content ?? "");
  const area = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    setName(file?.name ?? "Document1.docx");
    setText(file?.content ?? "");
  }, [file?.id, file?.name, file?.content]);

  /** Wrap the selection in a markdown marker, like Word's Bold button. */
  const applyStyle = (wrap: [string, string]) => {
    const element = area.current;
    if (!element) return;
    const start = element.selectionStart;
    const end = element.selectionEnd;
    const selected = text.slice(start, end) || "text";
    const next = `${text.slice(0, start)}${wrap[0]}${selected}${wrap[1]}${text.slice(end)}`;
    setText(next);
    requestAnimationFrame(() => {
      element.focus();
      element.setSelectionRange(start + wrap[0].length, start + wrap[0].length + selected.length);
    });
  };

  return (
    <div className="h-full flex flex-col bg-(--color-surface)">
      {/* Word ribbon, simplified to the groups a student uses */}
      <div className="flex flex-wrap items-center gap-1 border-b border-(--color-border) bg-(--color-surface-2) px-2 py-1.5">
        {WORD_STYLES.map((style) => (
          <button
            key={style.id}
            type="button"
            onClick={() => applyStyle(style.wrap)}
            className="px-2 py-1 rounded-md text-[11px] font-semibold border border-(--color-border) bg-(--color-surface) text-(--color-ink) hover:bg-(--color-accent-soft)"
            title={`${style.label} — selection par lagao`}
          >
            {style.id === "b" ? <Bold size={13} /> : style.id === "i" ? <Italic size={13} /> : style.id === "u" ? <Underline size={13} /> : style.id === "bullet" ? <List size={13} /> : style.label}
          </button>
        ))}
        <span className="mx-1 h-4 w-px bg-(--color-border)" />
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          aria-label="Document name"
          className="rounded-md border border-(--color-border) bg-(--color-surface) px-2 py-1 text-[11px] w-52"
        />
        <Button
          onClick={() => {
            onSave(name, text);
            onStatus(`Word: “${name}” saved to the desktop.`);
          }}
          className="!px-2.5 !py-1 !text-[11px]"
        >
          <Save size={12} /> Save
        </Button>
        <Button
          variant="secondary"
          onClick={() => downloadText(name.replace(/\.docx?$/i, "") + ".doc", text, "application/msword")}
          className="!px-2.5 !py-1 !text-[11px]"
        >
          <Download size={12} /> .doc
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            setText("");
            onStatus("Word: new document started.");
          }}
          className="!px-2.5 !py-1 !text-[11px]"
        >
          <FileText size={12} /> New
        </Button>
      </div>

      <div className="flex-1 overflow-auto bg-(--color-canvas) p-4 sm:p-6">
        {/* Page preview — looks like a printed A4 sheet */}
        <div className="mx-auto max-w-3xl paper rounded-md shadow-md p-8 sm:p-12 min-h-[60vh]">
          <WordPreview text={text} />
          <textarea
            ref={area}
            value={text}
            onChange={(event) => setText(event.target.value)}
            aria-label="Word document text"
            placeholder="Yahan likho… markdown: # Heading, **bold**, - bullet"
            className="mt-4 w-full min-h-[30vh] resize-y rounded-lg border border-slate-300 bg-white p-3 font-mono text-xs text-slate-900"
          />
        </div>
      </div>
      <div className="px-3 py-1 border-t border-(--color-border) text-[10px] text-(--color-muted)">
        {text.trim() ? text.trim().split(/\s+/).length : 0} words · {text.length} characters · autosave on demand
      </div>
    </div>
  );
}

/** Render the markdown subset the Word editor understands. */
function WordPreview({ text }: { text: string }) {
  if (!text.trim()) {
    return <p className="text-slate-500 text-sm italic">Start typing below — the page preview updates live.</p>;
  }
  return (
    <div className="space-y-2 text-slate-900">
      {text.split("\n").map((line, index) => {
        const key = `${index}-${line.slice(0, 12)}`;
        if (line.startsWith("# ")) return <h1 key={key} className="text-2xl font-extrabold">{inline(line.slice(2))}</h1>;
        if (line.startsWith("## ")) return <h2 key={key} className="text-lg font-bold">{inline(line.slice(3))}</h2>;
        if (line.startsWith("- ")) return <li key={key} className="ml-5 list-disc text-sm">{inline(line.slice(2))}</li>;
        if (line.trim() === "") return <div key={key} className="h-2" />;
        return <p key={key} className="text-sm leading-relaxed">{inline(line)}</p>;
      })}
    </div>
  );
}

/** **bold**, _italic_, <u>underline</u> → real elements. */
function inline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|_[^_]+_|<u>[^<]+<\/u>)/g).filter(Boolean);
  return parts.map((part, index) => {
    if (part.startsWith("**")) return <b key={index}>{part.slice(2, -2)}</b>;
    if (part.startsWith("_")) return <i key={index}>{part.slice(1, -1)}</i>;
    if (part.startsWith("<u>")) return <u key={index}>{part.slice(3, -4)}</u>;
    return <span key={index}>{part}</span>;
  });
}

/* ============================== POWERPOINT ============================= */

export interface Slide {
  title: string;
  bullets: string[];
}

export function PowerPointApp({
  file,
  onSave,
  onStatus,
}: {
  file: DesktopFile | null;
  onSave: (name: string, content: string) => void;
  onStatus: (message: string) => void;
}) {
  const parse = (raw: string | undefined): Slide[] => {
    try {
      const parsed = JSON.parse(raw ?? "[]") as Slide[];
      return parsed.length ? parsed : [{ title: "Title slide", bullets: ["Your first bullet"] }];
    } catch {
      return [{ title: "Title slide", bullets: ["Your first bullet"] }];
    }
  };
  const [name, setName] = useState(file?.name ?? "Presentation1.pptx");
  const [slides, setSlides] = useState<Slide[]>(() => parse(file?.content));
  const [index, setIndex] = useState(0);
  const [presenting, setPresenting] = useState(false);

  useEffect(() => {
    setName(file?.name ?? "Presentation1.pptx");
    setSlides(parse(file?.content));
    setIndex(0);
  }, [file?.id, file?.name, file?.content]);

  const slide = slides[index] ?? slides[0];
  const patch = (next: Partial<Slide>) => {
    setSlides((current) => current.map((item, i) => (i === index ? { ...item, ...next } : item)));
  };

  return (
    <div className="h-full flex flex-col bg-(--color-surface)">
      <div className="flex flex-wrap items-center gap-1 border-b border-(--color-border) bg-(--color-surface-2) px-2 py-1.5">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          aria-label="Presentation name"
          className="rounded-md border border-(--color-border) bg-(--color-surface) px-2 py-1 text-[11px] w-52"
        />
        <Button onClick={() => { onSave(name, JSON.stringify(slides)); onStatus(`PowerPoint: “${name}” saved.`); }} className="!px-2.5 !py-1 !text-[11px]">
          <Save size={12} /> Save
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            const html = slides
              .map((s) => `<section><h1>${s.title}</h1><ul>${s.bullets.map((b) => `<li>${b}</li>`).join("")}</ul></section>`)
              .join("\n");
            downloadText(name.replace(/\.pptx?$/i, "") + ".html", `<!doctype html><meta charset="utf-8"><body>${html}</body>`, "text/html");
            onStatus("PowerPoint: slides exported as a printable HTML deck.");
          }}
          className="!px-2.5 !py-1 !text-[11px]"
        >
          <Download size={12} /> Export
        </Button>
        <Button variant="secondary" onClick={() => setPresenting(true)} className="!px-2.5 !py-1 !text-[11px]">
          <Presentation size={12} /> Slide show
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            setSlides((current) => [...current, { title: `Slide ${current.length + 1}`, bullets: ["New bullet"] }]);
            setIndex(slides.length);
          }}
          className="!px-2.5 !py-1 !text-[11px]"
        >
          <Plus size={12} /> New slide
        </Button>
        {slides.length > 1 && (
          <Button
            variant="ghost"
            onClick={() => {
              setSlides((current) => current.filter((_, i) => i !== index));
              setIndex(0);
            }}
            className="!px-2.5 !py-1 !text-[11px]"
          >
            <Trash2 size={12} /> Delete slide
          </Button>
        )}
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Slide thumbnails */}
        <div className="w-28 sm:w-36 border-r border-(--color-border) overflow-y-auto bg-(--color-canvas) p-1.5 space-y-1.5">
          {slides.map((item, i) => (
            <button
              key={`${item.title}-${i}`}
              type="button"
              onClick={() => setIndex(i)}
              className={`w-full aspect-video rounded border text-[9px] p-1 text-left overflow-hidden ${
                i === index ? "border-(--color-accent) ring-1 ring-(--color-accent) bg-(--color-surface)" : "border-(--color-border) bg-(--color-surface)"
              }`}
            >
              <div className="font-bold truncate text-(--color-ink)">{item.title}</div>
              <div className="text-(--color-muted) truncate">{item.bullets[0]}</div>
            </button>
          ))}
        </div>

        {/* Canvas */}
        <div className="flex-1 overflow-auto p-3">
          <div className="mx-auto max-w-2xl aspect-video paper rounded-lg shadow-md p-6 flex flex-col">
            <input
              value={slide.title}
              onChange={(event) => patch({ title: event.target.value })}
              aria-label="Slide title"
              className="w-full bg-transparent text-xl font-extrabold text-slate-900 outline-none border-b border-transparent focus:border-slate-300"
            />
            <textarea
              value={slide.bullets.join("\n")}
              onChange={(event) => patch({ bullets: event.target.value.split("\n") })}
              aria-label="Slide bullets"
              className="mt-3 flex-1 w-full resize-none bg-transparent text-sm text-slate-800 outline-none leading-relaxed"
              placeholder="Ek line mein ek bullet…"
            />
          </div>
        </div>
      </div>

      {presenting && (
        <div className="fixed inset-0 z-[60] bg-black flex items-center justify-center" role="dialog" aria-label="Slide show">
          <div className="paper rounded-xl w-[min(92vw,900px)] aspect-video p-10 relative">
            <h1 className="text-3xl font-extrabold text-slate-900">{slide.title}</h1>
            <ul className="mt-6 space-y-2 text-lg text-slate-800 list-disc ml-6">
              {slide.bullets.filter(Boolean).map((bullet, i) => (
                <li key={`${bullet}-${i}`}>{bullet}</li>
              ))}
            </ul>
            <div className="absolute bottom-4 right-5 text-xs text-slate-500">
              {index + 1} / {slides.length}
            </div>
            <div className="absolute bottom-4 left-5 flex gap-2">
              <button type="button" onClick={() => setIndex(Math.max(0, index - 1))} className="px-3 py-1 rounded bg-slate-900 text-white text-xs">
                Prev
              </button>
              <button type="button" onClick={() => setIndex(Math.min(slides.length - 1, index + 1))} className="px-3 py-1 rounded bg-slate-900 text-white text-xs">
                Next
              </button>
              <button type="button" onClick={() => setPresenting(false)} className="px-3 py-1 rounded border border-slate-400 text-xs">
                Esc
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================================ PAINT ================================ */

const PALETTE = ["#111827", "#b91c1c", "#c2410c", "#b45309", "#15803d", "#1d4ed8", "#6d28d9", "#db2777", "#ffffff"];

export function PaintApp({
  onSave,
  onStatus,
}: {
  onSave: (name: string, content: string) => void;
  onStatus: (message: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const [colour, setColour] = useState("#1d4ed8");
  const [width, setWidth] = useState(3);
  const [tool, setTool] = useState<"brush" | "eraser">("brush");
  const [name, setName] = useState("Drawing1.png");

  const point = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const start = (event: React.MouseEvent<HTMLCanvasElement>) => {
    drawing.current = true;
    const context = canvasRef.current?.getContext("2d");
    const position = point(event);
    if (!context || !position) return;
    context.beginPath();
    context.moveTo(position.x, position.y);
  };

  const move = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const context = canvasRef.current?.getContext("2d");
    const position = point(event);
    if (!context || !position) return;
    context.strokeStyle = tool === "eraser" ? "#ffffff" : colour;
    context.lineWidth = tool === "eraser" ? width * 4 : width;
    context.lineCap = "round";
    context.lineTo(position.x, position.y);
    context.stroke();
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
  };

  const save = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    onSave(name, dataUrl);
    onStatus(`Paint: “${name}” saved to the desktop (PNG).`);
  };

  return (
    <div className="h-full flex flex-col bg-(--color-surface)">
      <div className="flex flex-wrap items-center gap-1.5 border-b border-(--color-border) bg-(--color-surface-2) px-2 py-1.5">
        {(["brush", "eraser"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setTool(option)}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border ${
              tool === option ? "bg-(--color-accent) text-white border-transparent" : "border-(--color-border) bg-(--color-surface) text-(--color-ink)"
            }`}
          >
            {option === "brush" ? <Type size={12} className="inline" /> : null} {option === "brush" ? "Brush" : "Eraser"}
          </button>
        ))}
        <input
          type="range"
          min={1}
          max={24}
          value={width}
          onChange={(event) => setWidth(Number(event.target.value))}
          aria-label="Brush size"
          className="w-24"
        />
        <div className="flex items-center gap-1">
          {PALETTE.map((swatch) => (
            <button
              key={swatch}
              type="button"
              aria-label={`Colour ${swatch}`}
              onClick={() => setColour(swatch)}
              style={{ backgroundColor: swatch }}
              className={`w-5 h-5 rounded-full border ${colour === swatch ? "ring-2 ring-(--color-accent)" : "border-(--color-border-strong)"}`}
            />
          ))}
        </div>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          aria-label="Image name"
          className="rounded-md border border-(--color-border) bg-(--color-surface) px-2 py-1 text-[11px] w-40"
        />
        <Button onClick={save} className="!px-2.5 !py-1 !text-[11px]">
          <Save size={12} /> Save PNG
        </Button>
        <Button variant="ghost" onClick={clear} className="!px-2.5 !py-1 !text-[11px]">
          <Trash2 size={12} /> Clear
        </Button>
      </div>
      <div className="flex-1 overflow-auto bg-(--color-canvas) p-3 flex items-start justify-center">
        <canvas
          ref={canvasRef}
          width={900}
          height={520}
          onMouseDown={start}
          onMouseMove={move}
          onMouseUp={() => {
            drawing.current = false;
          }}
          onMouseLeave={() => {
            drawing.current = false;
          }}
          className="paper rounded-lg shadow-md cursor-crosshair touch-none max-w-full"
          aria-label="Paint canvas"
        />
      </div>
      <div className="px-3 py-1 border-t border-(--color-border) text-[10px] text-(--color-muted)">
        Mouse se draw karo · Save PNG desktop par chala jayega
      </div>
    </div>
  );
}

/* ============================== EXPLORER =============================== */

export function ExplorerApp({
  files,
  onOpen,
  onDelete,
  onStatus,
}: {
  files: DesktopFile[];
  onOpen: (file: DesktopFile) => void;
  onDelete: (id: string) => void;
  onStatus: (message: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [folder, setFolder] = useState("All");

  const folders = ["All", ...new Set(files.map((file) => file.folder))];
  const visible = files
    .filter((file) => (folder === "All" ? true : file.folder === folder))
    .filter((file) => file.name.toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  const icon = (kind: DesktopFile["kind"]) =>
    kind === "sheet" ? "📊" : kind === "doc" ? "📄" : kind === "slides" ? "📽" : kind === "image" ? "🖼" : "📃";

  return (
    <div className="h-full flex flex-col bg-(--color-surface)">
      <div className="flex flex-wrap items-center gap-1.5 border-b border-(--color-border) bg-(--color-surface-2) px-2 py-1.5">
        <Folder size={13} className="text-(--color-accent)" />
        <span className="text-[11px] font-bold text-(--color-ink)">This PC ▸ Desktop</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search files"
          aria-label="Search files"
          className="ml-2 rounded-md border border-(--color-border) bg-(--color-surface) px-2 py-1 text-[11px] w-44"
        />
        {folders.map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => setFolder(name)}
            className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
              folder === name ? "bg-(--color-accent) text-white border-transparent" : "border-(--color-border) text-(--color-muted)"
            }`}
          >
            {name}
          </button>
        ))}
        <span className="ml-auto text-[10px] text-(--color-muted)">{visible.length} item(s)</span>
      </div>

      <div className="flex-1 overflow-auto p-2">
        {visible.length === 0 ? (
          <p className="text-xs text-(--color-muted) p-4">Koi file nahi mili. Excel/Word/Paint se save karo — yahan aa jayegi.</p>
        ) : (
          <table className="w-full text-xs">
            <thead className="text-(--color-muted) text-[10px] uppercase tracking-wide">
              <tr>
                <th className="text-left py-1">Name</th>
                <th className="text-left py-1 hidden sm:table-cell">Type</th>
                <th className="text-left py-1">Modified</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {visible.map((file) => (
                <tr key={file.id} className="border-t border-(--color-border) hover:bg-(--color-accent-soft)/50">
                  <td className="py-1.5">
                    <button type="button" onClick={() => onOpen(file)} className="flex items-center gap-1.5 text-left">
                      <span aria-hidden>{icon(file.kind)}</span>
                      <span className="text-(--color-ink) font-medium">{file.name}</span>
                    </button>
                  </td>
                  <td className="py-1.5 hidden sm:table-cell text-(--color-muted)">{file.kind}</td>
                  <td className="py-1.5 text-(--color-muted)">{new Date(file.updatedAt).toLocaleDateString()}</td>
                  <td className="py-1.5 text-right">
                    <button
                      type="button"
                      aria-label={`Delete ${file.name}`}
                      onClick={() => {
                        onDelete(file.id);
                        onStatus(`Deleted ${file.name}.`);
                      }}
                      className="p-1 rounded hover:bg-(--color-danger)/15 text-(--color-danger)"
                    >
                      <Trash2 size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="px-3 py-1 border-t border-(--color-border) text-[10px] text-(--color-muted) flex items-center gap-3">
        <ImageIcon size={11} /> Images open in Paint · documents in Word · sheets in Excel
      </div>
    </div>
  );
}
