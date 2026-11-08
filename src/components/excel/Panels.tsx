/**
 * @license MIT
 * Side panels for the Review, Page Layout, Data and Help tabs.
 *
 * These are the "dialogs" Excel opens from those tabs. Each one is a working
 * tool — the spell checker writes corrections back, notes are stored per cell,
 * the accessibility check reports real problems in this sheet, and Print shows
 * the same settings that produce the @page CSS.
 */
import { useState } from "react";
import { Check, Printer, X } from "lucide-react";
import type { CellNote, DocProps, PrintSetup, SpellIssue } from "../../lib/excel/workbookTools";
import type { ChartKind, ShapeArt, SparkKind } from "../../lib/excel/insert";
import { CHART_KINDS, SHAPE_ART, SYMBOLS } from "../../lib/excel/insert";
import { pageCss, suggestionFor } from "../../lib/excel/workbookTools";

const field =
  "w-full rounded-lg neu-field bg-(--color-surface) px-2.5 py-1.5 text-xs text-(--color-ink) outline-none focus:ring-2 focus:ring-(--color-accent)";
const label = "block text-[11px] font-semibold text-(--color-muted) mb-0.5";

export function SidePanel({
  title,
  subtitle,
  onClose,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[92] bg-black/40 backdrop-blur-[2px] flex justify-end" role="presentation">
      <div
        role="dialog"
        aria-label={title}
        aria-modal="true"
        className="w-full sm:max-w-md h-full flex flex-col bg-(--color-canvas) shadow-2xl sm:m-2 sm:h-[calc(100%-1rem)] sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-2 px-3.5 py-3 border-b border-(--color-border)">
          <div>
            <h2 className="text-sm font-extrabold text-(--color-ink)">{title}</h2>
            {subtitle && <p className="text-[11px] text-(--color-muted) mt-0.5 leading-relaxed">{subtitle}</p>}
          </div>
          <button type="button" aria-label={`Close ${title}`} onClick={onClose} className="p-1.5 rounded-lg text-(--color-muted) hover:bg-(--color-accent-soft)">
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-3.5 py-3 space-y-2.5">{children}</div>
        {footer && <div className="px-3.5 py-2.5 border-t border-(--color-border) flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

/* ============================== notes ============================== */

export function NotesPanel({
  notes,
  active,
  onSave,
  onGoTo,
  onClose,
}: {
  notes: CellNote[];
  active: string;
  onSave: (address: string, text: string) => void;
  onGoTo: (address: string) => void;
  onClose: () => void;
}) {
  const existing = notes.find((note) => note.address === active);
  const [text, setText] = useState(existing?.text ?? "");
  const [address, setAddress] = useState(active);

  return (
    <SidePanel
      title="Comments & Notes"
      subtitle="Excel ke Review ▸ New Comment jaisa — har note usi cell ke saath save hota hai."
      onClose={onClose}
      footer={
        <button
          type="button"
          onClick={() => onSave(address, text)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-(--color-accent) text-white px-3 py-1.5 text-xs font-bold"
        >
          <Check size={13} /> Save note for {address}
        </button>
      }
    >
      <div>
        <label className={label} htmlFor="note-cell">
          Cell
        </label>
        <input id="note-cell" aria-label="Note cell" className={`${field} font-mono`} value={address} onChange={(event) => setAddress(event.target.value.toUpperCase())} />
      </div>
      <div>
        <label className={label} htmlFor="note-text">
          Note
        </label>
        <textarea
          id="note-text"
          aria-label="Note text"
          className={`${field} min-h-24`}
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Yahan likho — jaise “is cell ka formula check karna hai”."
        />
      </div>
      <div className="rounded-xl neu-pressed-sm divide-y divide-(--color-border)">
        <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-(--color-muted)">{notes.length} note(s) on this sheet</div>
        {notes.length === 0 && <p className="px-2.5 py-2 text-[11px] text-(--color-muted)">Koi note nahi. Naya note upar se likho.</p>}
        {notes.map((note) => (
          <div key={note.id} className="px-2.5 py-1.5">
            <button type="button" onClick={() => onGoTo(note.address)} className="text-[11px] font-bold font-mono text-(--color-accent-dark)">
              {note.address}
            </button>
            <p className="text-[11px] text-(--color-ink) leading-relaxed">{note.text}</p>
          </div>
        ))}
      </div>
    </SidePanel>
  );
}

/* ============================= spelling ============================= */

export function SpellPanel({
  issues,
  onFix,
  onIgnore,
  onGoTo,
  onClose,
}: {
  issues: SpellIssue[];
  onFix: (issue: SpellIssue) => void;
  onIgnore: () => void;
  onGoTo: (address: string) => void;
  onClose: () => void;
}) {
  return (
    <SidePanel
      title="Spelling"
      subtitle="Cell ka text check hota hai — GSTR, XLOOKUP jaise course words ko galti nahi maana jata (Review ▸ Spelling, F7)."
      onClose={onClose}
      footer={
        <button type="button" onClick={onIgnore} className="rounded-lg neu-btn px-3 py-1.5 text-xs font-semibold text-(--color-ink)">
          Ignore all
        </button>
      }
    >
      {issues.length === 0 ? (
        <p className="text-xs text-(--color-good) font-semibold">✓ Koi spelling mistake nahi mili — poora sheet saaf hai.</p>
      ) : (
        issues.map((issue) => (
          <div key={`${issue.address}-${issue.word}`} className="rounded-xl neu-btn p-2.5">
            <div className="flex items-center justify-between gap-2">
              <button type="button" onClick={() => onGoTo(issue.address)} className="text-[11px] font-bold font-mono text-(--color-accent-dark)">
                {issue.address}
              </button>
              <span className="text-[11px] font-bold text-(--color-danger)">{issue.word}</span>
            </div>
            <p className="text-[11px] text-(--color-muted) mt-0.5 leading-relaxed line-clamp-2">{issue.sentence}</p>
            <div className="flex gap-1.5 mt-1.5">
              <button
                type="button"
                onClick={() => onFix(issue)}
                className="rounded-lg bg-(--color-accent) text-white px-2 py-1 text-[10px] font-bold"
              >
                Change to “{suggestionFor(issue.word)}”
              </button>
              <button type="button" onClick={() => onGoTo(issue.address)} className="rounded-lg neu-btn px-2 py-1 text-[10px] font-semibold text-(--color-ink)">
                Go to cell
              </button>
            </div>
          </div>
        ))
      )}
    </SidePanel>
  );
}

/* ============================ document props ======================== */

export function PropsPanel({
  props,
  onSave,
  onClose,
}: {
  props: DocProps;
  onSave: (props: DocProps) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(props);
  const set = (key: keyof DocProps) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setDraft((current) => ({ ...current, [key]: event.target.value }));

  return (
    <SidePanel
      title="Document Properties"
      subtitle="Yeh details .xlsx file ke andar jaati hain — jaise Excel ki File ▸ Info."
      onClose={onClose}
      footer={
        <button
          type="button"
          onClick={() => {
            onSave(draft);
            onClose();
          }}
          className="inline-flex items-center gap-1.5 rounded-lg bg-(--color-accent) text-white px-3 py-1.5 text-xs font-bold"
        >
          <Check size={13} /> Save properties
        </button>
      }
    >
      {([
        ["title", "Title", "GST Invoice — January"],
        ["subject", "Subject", "Monthly tax working"],
        ["author", "Author", "Aarav Patel"],
        ["company", "Company", "Sharma Traders"],
        ["keywords", "Keywords", "gst, invoice, january"],
      ] as [keyof DocProps, string, string][]).map(([key, text, placeholder]) => (
        <div key={key}>
          <label className={label} htmlFor={`prop-${key}`}>
            {text}
          </label>
          <input id={`prop-${key}`} aria-label={text} className={field} value={draft[key]} onChange={set(key)} placeholder={placeholder} />
        </div>
      ))}
      <div>
        <label className={label} htmlFor="prop-comments">
          Comments
        </label>
        <textarea id="prop-comments" aria-label="Comments" className={`${field} min-h-16`} value={draft.comments} onChange={set("comments")} />
      </div>
    </SidePanel>
  );
}

/* ================================ print ============================= */

export function PrintPanel({
  setup,
  onSetup,
  onPrint,
  onClose,
}: {
  setup: PrintSetup;
  onSetup: (patch: Partial<PrintSetup>) => void;
  onPrint: () => void;
  onClose: () => void;
}) {
  return (
    <SidePanel
      title="Print"
      subtitle="Yeh settings browser ke print dialog par lagti hain — “Save as PDF” chuno to PDF file ban jaayegi."
      onClose={onClose}
      footer={
        <button
          type="button"
          onClick={() => {
            onPrint();
            onClose();
          }}
          className="inline-flex items-center gap-1.5 rounded-lg bg-(--color-accent) text-white px-3 py-1.5 text-xs font-bold"
        >
          <Printer size={13} /> Print / Save as PDF
        </button>
      }
    >
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={label} htmlFor="pr-orientation">
            Orientation
          </label>
          <select id="pr-orientation" aria-label="Orientation" className={field} value={setup.orientation} onChange={(event) => onSetup({ orientation: event.target.value as PrintSetup["orientation"] })}>
            <option value="portrait">Portrait (खड़ा)</option>
            <option value="landscape">Landscape (लेटा)</option>
          </select>
        </div>
        <div>
          <label className={label} htmlFor="pr-paper">
            Paper
          </label>
          <select id="pr-paper" aria-label="Paper size" className={field} value={setup.paper} onChange={(event) => onSetup({ paper: event.target.value as PrintSetup["paper"] })}>
            <option>A4</option>
            <option>Letter</option>
            <option>Legal</option>
          </select>
        </div>
        <div>
          <label className={label} htmlFor="pr-margins">
            Margins
          </label>
          <select id="pr-margins" aria-label="Margins" className={field} value={setup.margins} onChange={(event) => onSetup({ margins: event.target.value as PrintSetup["margins"] })}>
            <option value="normal">Normal</option>
            <option value="wide">Wide</option>
            <option value="narrow">Narrow</option>
          </select>
        </div>
        <div>
          <label className={label} htmlFor="pr-scale">
            Scale %
          </label>
          <input id="pr-scale" aria-label="Scale" type="number" min={10} max={400} className={field} value={setup.scale} onChange={(event) => onSetup({ scale: Number(event.target.value) })} />
        </div>
      </div>
      {([
        ["fitToPage", "Fit sheet to one page wide"],
        ["gridlines", "Print gridlines"],
        ["headers", "Print row & column headings"],
        ["centreHorizontally", "Centre on the page"],
      ] as [keyof PrintSetup, string][]).map(([key, text]) => (
        <label key={key} className="flex items-center gap-2 text-xs text-(--color-ink)">
          <input type="checkbox" checked={Boolean(setup[key])} onChange={(event) => onSetup({ [key]: event.target.checked } as Partial<PrintSetup>)} /> {text}
        </label>
      ))}
      <div>
        <label className={label} htmlFor="pr-area">
          Print area
        </label>
        <input id="pr-area" aria-label="Print area" className={`${field} font-mono`} value={setup.area} onChange={(event) => onSetup({ area: event.target.value.toUpperCase() })} placeholder="A1:F37 (blank = whole sheet)" />
      </div>
      <div>
        <label className={label} htmlFor="pr-titles">
          Print titles (rows)
        </label>
        <input id="pr-titles" aria-label="Print titles" className={`${field} font-mono`} value={setup.titleRows} onChange={(event) => onSetup({ titleRows: event.target.value })} placeholder="1:1" />
      </div>
      <details className="text-[11px] text-(--color-muted)">
        <summary className="cursor-pointer font-semibold text-(--color-ink)">The CSS this produces</summary>
        <pre className="mt-1 overflow-x-auto rounded-lg bg-(--color-canvas) p-2 text-[10px] leading-relaxed">{pageCss(setup)}</pre>
      </details>
    </SidePanel>
  );
}

/* ============================== help / about ======================== */

const TAB_HELP: { tab: string; hindi: string; what: string }[] = [
  { tab: "File", hindi: "फ़ाइल", what: "New sheet, open .xlsx/.csv, save, print, download .xlsx, document properties." },
  { tab: "Home", hindi: "होम", what: "Clipboard, font, alignment, number formats, cell styles, conditional formatting, insert/delete rows and columns, AutoSum, Flash Fill, sort, filter, find." },
  { tab: "Insert", hindi: "इन्सर्ट", what: "Tables, charts, sparklines, pictures, shapes, links, comments, symbols, functions." },
  { tab: "Page Layout", hindi: "पेज लेआउट", what: "Paper size, orientation, margins, print area, print titles, gridlines, fit to page, print." },
  { tab: "Formulas", hindi: "फ़ॉर्मूला", what: "Insert function, AutoSum, recalculate, name manager, trace precedents/dependents, show formulas, find references." },
  { tab: "Data", hindi: "डेटा", what: "Import a file, sort, filter, data validation, text-to-columns, Flash Fill, remove duplicates, data form, subtotals." },
  { tab: "Review", hindi: "रिव्यू", what: "Spelling, thesaurus, translate, comments/notes, protect sheet, document properties, accessibility and compatibility checks." },
  { tab: "View", hindi: "व्यू", what: "Freeze panes, split, virtual keyboard, gridlines, zoom, full screen, show formulas, sheet tabs." },
  { tab: "Help", hindi: "हेल्प", what: "This guide, keyboard shortcuts, what is new, contact the AI tutor, how the .xlsx hand-off works." },
];

export function HelpPanel({ onClose }: { onClose: () => void }) {
  return (
    <SidePanel title="Help — हर tab kya karta hai" subtitle="Excel ke 9 tabs, aur is app mein unke andar kya chalta hai." onClose={onClose}>
      {TAB_HELP.map((item) => (
        <div key={item.tab} className="rounded-xl neu-btn p-2.5">
          <div className="text-[11px] font-bold text-(--color-ink)">
            {item.tab} <span className="font-normal text-(--color-accent-dark)">{item.hindi}</span>
          </div>
          <p className="text-[11px] text-(--color-muted) mt-0.5 leading-relaxed">{item.what}</p>
        </div>
      ))}
    </SidePanel>
  );
}

const SHORTCUTS: [string, string][] = [
  ["Enter / Tab", "Commit the cell and move down / right"],
  ["Shift+Enter", "Commit and move up"],
  ["Escape", "Cancel the edit"],
  ["Ctrl+B / I / U", "Bold, italic, underline"],
  ["Ctrl+1", "Format Cells"],
  ["Alt+=", "AutoSum"],
  ["Ctrl+E", "Flash Fill"],
  ["Ctrl+F / Ctrl+H", "Find / Replace"],
  ["Ctrl+Z / Ctrl+Y", "Undo / Redo"],
  ["Ctrl+D", "Fill down"],
  ["Ctrl+Shift+L", "Filter"],
  ["F4", "Conditional formatting dialog"],
  ["F5", "Go To"],
  ["F7", "Spelling"],
  ["Shift+F2", "New note on this cell"],
  ["Ctrl+F1", "Fold or show the ribbon"],
  ["Shift+Click", "Extend the selection (range)"],
  ["Ctrl+Shift+F1", "Virtual keyboard"],
  ["Ctrl+`", "Show formulas"],
  ["Ctrl+P", "Print"],
];

export function ShortcutsPanel({ onClose }: { onClose: () => void }) {
  return (
    <SidePanel title="Keyboard shortcuts" subtitle="Yeh sab live hain — grid par focus karke try karo." onClose={onClose}>
      {SHORTCUTS.map(([keys, what]) => (
        <div key={keys} className="flex items-start justify-between gap-2 rounded-lg neu-btn px-2.5 py-1.5">
          <code className="text-[11px] font-bold text-(--color-accent-dark) whitespace-nowrap">{keys}</code>
          <span className="text-[11px] text-(--color-muted) text-right">{what}</span>
        </div>
      ))}
    </SidePanel>
  );
}

export function AboutPanel({ onClose, formulaCount }: { onClose: () => void; formulaCount: number }) {
  return (
    <SidePanel title="About this sheet" subtitle="Engine, limits aur .xlsx hand-off — saaf-saaf." onClose={onClose}>
      <p className="text-xs text-(--color-ink) leading-relaxed">
        Yeh ek asli spreadsheet hai: <b>{formulaCount}</b> formulas ka apna engine, conditional formatting, data
        validation, filter, notes aur print setup — sab browser mein, bina kisi subscription ke.
      </p>
      <ul className="text-[11px] text-(--color-muted) space-y-1.5">
        <li>• Engine aur grid MIT licence wale apne code hain — koi GPL SDK nahi.</li>
        <li>• Sheet har edit par aapke account mein autosave hoti hai (offline par is device mein).</li>
        <li>• <b>.xlsx</b> download mein formulas text ke roop mein jaate hain, isliye desktop Excel unhe khud recalculate karta hai.</li>
        <li>• VBA, Power Query, PivotTable aur co-authoring browser mein nahi chalte — unke liye .xlsx kholo.</li>
        <li>• Data Validation aur Conditional Formatting rules workbook ke saath save hote hain.</li>
      </ul>
    </SidePanel>
  );
}

export function AccessPanel({ issues, onClose }: { issues: string[]; onClose: () => void }) {
  return (
    <SidePanel title="Check accessibility" subtitle="Review ▸ Check Accessibility — jo cheezein padhne mein dikkat deti hain." onClose={onClose}>
      {issues.length === 0 ? (
        <p className="text-xs text-(--color-good) font-semibold">✓ Koi problem nahi mili — sheet accessible hai.</p>
      ) : (
        issues.map((issue) => (
          <div key={issue} className="rounded-xl border px-2.5 py-2 text-[11px] tone-warn">
            {issue}
          </div>
        ))
      )}
      <p className="text-[11px] text-(--color-muted)">
        Tip: header row par Home ▸ Cell Styles ▸ Header lagao, aur colour ke saath bold bhi rakho — colour-blind
        students ke liye zaroori hai.
      </p>
    </SidePanel>
  );
}

export function CompatPanel({ onClose }: { onClose: () => void }) {
  return (
    <SidePanel title="Check compatibility" subtitle="Kya .xlsx mein jaata hai aur kya desktop Excel mein dobara banana padega." onClose={onClose}>
      {[
        ["Formulas and values", "Travel with the file — Excel recalculates them."],
        ["Number formats, bold, fill, alignment", "Exported in the .xlsx."],
        ["Conditional formatting rules", "Kept in this app; re-apply in Excel with Home ▸ Conditional Formatting."],
        ["Data validation", "Kept in this app; Excel's own dropdown is set in Data ▸ Data Validation."],
        ["Notes / comments", "Stay in this app — Excel comments are a different format."],
        ["Charts", "Not embedded in the .xlsx; build them in Excel or use this app's chart view."],
      ].map(([item, detail]) => (
        <div key={item} className="rounded-xl neu-btn p-2.5">
          <div className="text-[11px] font-bold text-(--color-ink)">{item}</div>
          <p className="text-[11px] text-(--color-muted) mt-0.5">{detail}</p>
        </div>
      ))}
    </SidePanel>
  );
}

export function ReferencesPanel({
  hits,
  token,
  onToken,
  onGoTo,
  onClose,
}: {
  hits: { address: string; preview: string }[];
  token: string;
  onToken: (token: string) => void;
  onGoTo: (address: string) => void;
  onClose: () => void;
}) {
  return (
    <SidePanel title="Find references" subtitle="Formulas ▸ Show Formulas ▸ Find references — kaun sa formula kis cell ko use karta hai." onClose={onClose}>
      <input aria-label="Search formulas" className={field} value={token} onChange={(event) => onToken(event.target.value)} placeholder="SUM, B2, XLOOKUP…" />
      {token.trim() === "" && <p className="text-[11px] text-(--color-muted)">Kuch type karo — sirf woh formulas dikhenge jismein yeh text hai.</p>}
      {hits.map((hit) => (
        <button key={hit.address} type="button" onClick={() => onGoTo(hit.address)} className="block w-full text-left rounded-lg neu-btn px-2.5 py-1.5 hover:bg-(--color-accent-soft)">
          <span className="text-[11px] font-bold font-mono text-(--color-accent-dark)">{hit.address}</span>
          <span className="block text-[10px] text-(--color-muted) font-mono truncate">{hit.preview}</span>
        </button>
      ))}
    </SidePanel>
  );
}

export function SortPanel({
  headers,
  onSort,
  onClose,
}: {
  headers: { col: number; label: string }[];
  onSort: (col: number, direction: "asc" | "desc", header: boolean) => void;
  onClose: () => void;
}) {
  const [col, setCol] = useState(headers[0]?.col ?? 0);
  const [direction, setDirection] = useState<"asc" | "desc">("asc");
  const [header, setHeader] = useState(true);
  return (
    <SidePanel
      title="Sort"
      subtitle="Data ▸ Sort — poori rows saath mein rehti hain, jaise Excel mein."
      onClose={onClose}
      footer={
        <button
          type="button"
          onClick={() => {
            onSort(col, direction, header);
            onClose();
          }}
          className="inline-flex items-center gap-1.5 rounded-lg bg-(--color-accent) text-white px-3 py-1.5 text-xs font-bold"
        >
          <Check size={13} /> Sort
        </button>
      }
    >
      <div>
        <label className={label} htmlFor="sort-col">
          Sort by
        </label>
        <select id="sort-col" aria-label="Sort column" className={field} value={col} onChange={(event) => setCol(Number(event.target.value))}>
          {headers.map((item) => (
            <option key={item.col} value={item.col}>
              {item.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={label} htmlFor="sort-dir">
          Order
        </label>
        <select id="sort-dir" aria-label="Sort order" className={field} value={direction} onChange={(event) => setDirection(event.target.value as "asc" | "desc")}>
          <option value="asc">A → Z / smallest first</option>
          <option value="desc">Z → A / largest first</option>
        </select>
      </div>
      <label className="flex items-center gap-2 text-xs text-(--color-ink)">
        <input type="checkbox" checked={header} onChange={(event) => setHeader(event.target.checked)} /> My data has headers (row 1 stays on top)
      </label>
    </SidePanel>
  );
}

export function CalcOptionsPanel({ onClose }: { onClose: () => void }) {
  return (
    <SidePanel title="Calculation options" subtitle="Excel default: automatic — har edit par poora sheet dobara calculate hota hai." onClose={onClose}>
      <div className="rounded-xl border px-2.5 py-2 text-[11px] tone-good">
        <b>Automatic</b> — is app mein hamesha on hai. Formula likhte hi result aa jata hai.
      </div>
      <p className="text-[11px] text-(--color-muted) leading-relaxed">
        Manual calculation (F9 daba kar calculate karna) desktop Excel ka option hai — browser grid itna fast hai ki
        zaroorat nahi padti. Formulas ▸ Calculate now (F9) se aap manually bhi recalculate kar sakte ho.
      </p>
    </SidePanel>
  );
}

export function ThesaurusPanel({ onClose }: { onClose: () => void }) {
  return (
    <SidePanel title="Thesaurus & Translate" subtitle="Hindi ↔ English suggestions ke liye Aarohi AI tutor use karo." onClose={onClose}>
      {[
        ["total", "कुल, जोड़, योग"],
        ["amount", "रकम, राशि"],
        ["invoice", "बिल, चालान"],
        ["customer", "ग्राहक"],
        ["pending", "बाक़ी, लंबित"],
        ["overdue", "तारीख़ निकल गई"],
        ["profit", "मुनाफ़ा, लाभ"],
        ["loss", "घाटा, हानि"],
      ].map(([word, hindi]) => (
        <div key={word} className="flex items-center justify-between rounded-lg neu-btn px-2.5 py-1.5 text-[11px]">
          <span className="font-bold text-(--color-ink)">{word}</span>
          <span className="text-(--color-muted)">{hindi}</span>
        </div>
      ))}
      <p className="text-[11px] text-(--color-muted)">Poora vakya translate karne ke liye Help ▸ Contact support (Aarohi) kholo.</p>
    </SidePanel>
  );
}

export function ContactPanel({ onClose }: { onClose: () => void }) {
  return (
    <SidePanel title="Contact support" subtitle="Aarohi, is course ka AI tutor — Excel ke sawaal Hinglish mein poocho." onClose={onClose}>
      <p className="text-xs text-(--color-ink) leading-relaxed">
        Sidebar mein <b>Aarohi AI Tutor</b> kholo aur apna sawaal likho — jaise “VLOOKUP aur XLOOKUP mein kya farak
        hai?” ya “conditional formatting se top 5 kaise dikhayein?”.
      </p>
      <a href="#/aarohi" className="inline-flex items-center gap-1.5 rounded-lg bg-(--color-accent) text-white px-3 py-1.5 text-xs font-bold">
        Open Aarohi AI tutor
      </a>
      <p className="text-[11px] text-(--color-muted)">
        Har sawaal free hai — koi message limit ya paid plan nahi.
      </p>
    </SidePanel>
  );
}

const NEW_FEATURES: [string, string][] = [
  ["9-tab ribbon", "File, Home, Insert, Page Layout, Formulas, Data, Review, View, Help — Excel ke order mein."],
  ["Data Validation", "Dropdown, whole number, decimal, date, text-length and custom rules with Excel's stop alert."],
  ["Conditional Formatting dialog", "Greater/less/between, top N, duplicates, data bars, 3-colour scale."],
  ["Working AutoFilter", "Conditions hide rows instead of deleting them."],
  ["Trace precedents & dependents", "Auditing that reads the formula itself."],
  ["Spelling", "Course-aware: GST, XLOOKUP and city names are not flagged."],
  ["Notes", "Per-cell comments stored with the workbook."],
  ["Print setup", "A4/Legal, orientation, margins, print area and titles → real @page CSS."],
  ["Protect sheet", "A genuine read-only lock on the cells."],
  ["Full screen", "The sheet fills the screen with the ribbon still usable."],
];

export function WhatsNewPanel({ onClose }: { onClose: () => void }) {
  return (
    <SidePanel title="What's new" subtitle="Recently added Excel features." onClose={onClose}>
      {NEW_FEATURES.map(([title, detail]) => (
        <div key={title} className="rounded-xl neu-btn p-2.5">
          <div className="text-[11px] font-bold text-(--color-ink)">{title}</div>
          <p className="text-[11px] text-(--color-muted) mt-0.5 leading-relaxed">{detail}</p>
        </div>
      ))}
    </SidePanel>
  );
}

/* ============================== Insert tab ============================== */

/**
 * One panel for the whole Insert tab, with a tab row of its own — the same
 * grouping Excel puts in its Insert ▸ Chart / Link / Symbol / Shape dialogs.
 */
export function InsertPanel({
  mode,
  onMode,
  spark,
  onSpark,
  onInsertSpark,
  onDeleteSpark,
  chart,
  onChart,
  onInsertChart,
  onDeleteChart,
  onLink,
  onPicture,
  onSymbol,
  onShape,
  onClose,
}: {
  mode: "chart" | "sparkline" | "link" | "picture" | "symbol" | "shape";
  onMode: (mode: "chart" | "sparkline" | "link" | "picture" | "symbol" | "shape") => void;
  spark: { source: string; kind: SparkKind };
  onSpark: (patch: Partial<{ source: string; kind: SparkKind }>) => void;
  onInsertSpark: () => void;
  onDeleteSpark: () => void;
  chart: { source: string; kind: ChartKind };
  onChart: (patch: Partial<{ source: string; kind: ChartKind }>) => void;
  onInsertChart: () => void;
  onDeleteChart: () => void;
  onLink: (url: string, text: string) => void;
  onPicture: (url: string, alt: string) => void;
  onSymbol: (symbol: string) => void;
  onShape: (art: ShapeArt) => void;
  onClose: () => void;
}) {
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const modes: { id: typeof mode; label: string }[] = [
    { id: "chart", label: "Chart" },
    { id: "sparkline", label: "Sparkline" },
    { id: "link", label: "Link" },
    { id: "picture", label: "Picture" },
    { id: "symbol", label: "Symbol" },
    { id: "shape", label: "Shapes" },
  ];
  return (
    <SidePanel
      title="Insert"
      subtitle="Charts, sparklines, links, pictures, symbols and shapes — sab kuch cell ke andar hi rehta hai."
      onClose={onClose}
    >
      <div role="tablist" aria-label="Insert options" className="flex flex-wrap gap-1">
        {modes.map((entry) => (
          <button
            key={entry.id}
            type="button"
            role="tab"
            aria-selected={mode === entry.id}
            onClick={() => onMode(entry.id)}
            className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold border ${
              mode === entry.id
                ? "bg-(--color-accent) text-white border-(--color-accent)"
                : "border-(--color-border) text-(--color-ink) hover:bg-(--color-accent-soft)"
            }`}
          >
            {entry.label}
          </button>
        ))}
      </div>

      {mode === "chart" && (
        <div className="space-y-2.5">
          <div>
            <label className={label} htmlFor="chart-source">
              Data range
            </label>
            <input
              id="chart-source"
              className={field}
              value={chart.source}
              onChange={(event) => onChart({ source: event.target.value.toUpperCase() })}
              placeholder="A1:B10"
            />
          </div>
          <div>
            <span className={label}>Chart type</span>
            <div className="flex flex-wrap gap-1.5">
              {CHART_KINDS.map((entry) => (
                <button
                  key={entry.kind}
                  type="button"
                  aria-label={entry.label}
                  onClick={() => onChart({ kind: entry.kind })}
                  className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold ${
                    chart.kind === entry.kind
                      ? "bg-(--color-accent) text-white border-(--color-accent)"
                      : "border-(--color-border) text-(--color-ink)"
                  }`}
                >
                  {entry.label} <span className="font-normal opacity-70">{entry.hindi}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onInsertChart} className="rounded-lg bg-(--color-accent) text-white px-3 py-1.5 text-xs font-bold">
              Insert chart
            </button>
            <button type="button" onClick={onDeleteChart} className="rounded-lg neu-btn px-3 py-1.5 text-xs font-semibold text-(--color-ink)">
              Remove last chart
            </button>
          </div>
          <p className="text-[10px] text-(--color-muted) leading-relaxed">
            Chart sheet ke numbers se banta hai aur range badalne par aap ke saath update hota hai. .xlsx download mein numbers waise hi rehte hain.
          </p>
        </div>
      )}

      {mode === "sparkline" && (
        <div className="space-y-2.5">
          <div>
            <label className={label} htmlFor="spark-source">
              Data range (ek row ya column)
            </label>
            <input
              id="spark-source"
              className={field}
              value={spark.source}
              onChange={(event) => onSpark({ source: event.target.value.toUpperCase() })}
              placeholder="B2:G2"
            />
          </div>
          <div>
            <span className={label}>Type</span>
            <div className="flex gap-1.5">
              {(["column", "line", "winloss"] as SparkKind[]).map((kind) => (
                <button
                  key={kind}
                  type="button"
                  aria-label={kind === "winloss" ? "Win/Loss" : kind}
                  onClick={() => onSpark({ kind })}
                  className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold capitalize ${
                    spark.kind === kind ? "bg-(--color-accent) text-white border-(--color-accent)" : "border-(--color-border) text-(--color-ink)"
                  }`}
                >
                  {kind === "winloss" ? "Win/Loss" : kind}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onInsertSpark} className="rounded-lg bg-(--color-accent) text-white px-3 py-1.5 text-xs font-bold">
              Insert sparkline
            </button>
            <button type="button" onClick={onDeleteSpark} className="rounded-lg neu-btn px-3 py-1.5 text-xs font-semibold text-(--color-ink)">
              Clear from this cell
            </button>
          </div>
          <p className="text-[10px] text-(--color-muted) leading-relaxed">
            Sparkline active cell mein chhote blocks ke roop mein aata hai — Excel ke Line/Column/Win-Loss ki tarah. Data change karo, sparkline khud badal jaayega.
          </p>
        </div>
      )}

      {(mode === "link" || mode === "picture") && (
        <div className="space-y-2.5">
          <div>
            <label className={label} htmlFor="link-url">
              {mode === "link" ? "Address (https://…)" : "Picture address (https://… .png / .jpg)"}
            </label>
            <input
              id="link-url"
              className={field}
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://example.com/page"
            />
          </div>
          <div>
            <label className={label} htmlFor="link-text">
              {mode === "link" ? "Text to display" : "Alt text"}
            </label>
            <input id="link-text" className={field} value={text} onChange={(event) => setText(event.target.value)} placeholder={mode === "link" ? "Excel course" : "Logo"} />
          </div>
          <button
            type="button"
            onClick={() => {
              if (mode === "link") onLink(url, text);
              else onPicture(url, text);
              setUrl("");
              setText("");
            }}
            className="rounded-lg bg-(--color-accent) text-white px-3 py-1.5 text-xs font-bold"
          >
            {mode === "link" ? "Insert link" : "Insert picture"}
          </button>
          <p className="text-[10px] text-(--color-muted) leading-relaxed">
            Dono ek asli <span className="font-mono">HYPERLINK()</span> formula banate hain, isliye link Excel mein bhi chalta hai aur cell clickable rehti hai.
          </p>
        </div>
      )}

      {mode === "symbol" && (
        <div className="space-y-2">
          <p className="text-[11px] text-(--color-muted)">Active cell ke text ke saath symbol jodta hai (currency pehle, baaki baad mein).</p>
          <div className="grid grid-cols-6 gap-1.5">
            {SYMBOLS.map((entry) => (
              <button
                key={entry.name}
                type="button"
                aria-label={`Insert ${entry.name}`}
                title={entry.name}
                onClick={() => onSymbol(entry.symbol)}
                className="rounded-lg neu-btn py-1.5 text-base text-(--color-ink) hover:border-(--color-accent) hover:bg-(--color-accent-soft)"
              >
                {entry.symbol}
              </button>
            ))}
          </div>
        </div>
      )}

      {mode === "shape" && (
        <div className="space-y-2">
          <p className="text-[11px] text-(--color-muted)">Shape active cell par chipak jaata hai — cell move karo, shape saath aayega.</p>
          <div className="grid grid-cols-3 gap-1.5">
            {SHAPE_ART.map((entry) => (
              <button
                key={entry.art}
                type="button"
                aria-label={`Insert ${entry.label} shape`}
                onClick={() => onShape(entry.art)}
                className="rounded-lg neu-btn py-2 flex flex-col items-center gap-0.5 hover:border-(--color-accent) hover:bg-(--color-accent-soft)"
              >
                <span className="text-lg leading-none" style={{ color: entry.color }}>
                  {entry.glyph}
                </span>
                <span className="text-[10px] font-semibold text-(--color-ink)">{entry.label}</span>
                <span className="text-[9px] text-(--color-muted)">{entry.hindi}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </SidePanel>
  );
}
