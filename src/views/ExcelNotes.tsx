import { useMemo, useState } from "react";
import { BookOpen, Bookmark, CheckCircle2, Search, Zap } from "lucide-react";

type Tab = "cleaning" | "shortcuts";

const CLEANING = [
  { formula: "=TRIM(A1)", desc: "Extra spaces hatata hai — beginning/end ke aur beech ke repeated spaces.", example: '"  Ravi Kumar  " → "Ravi Kumar"' },
  { formula: "=PROPER(A1)", desc: "Har shabd ka pehla letter capital karta hai.", example: '"Ravi Kumar" → "Ravi Kumar"' },
  { formula: "=UPPER(A1) / =LOWER(A1)", desc: "Text ko poori tarah uppercase ya lowercase banata hai.", example: '"india" → "INDIA"' },
  { formula: '=A1 & " " & B1', desc: "Do ya zyada cells ko jodta hai (concatenation).", example: 'A1: Ravi, B1: Sharma → "Ravi Sharma"' },
  { formula: "=LEFT(A1, 6)", desc: "Left side se diye gaye characters nikalta hai.", example: '"396001-Gujarat" → "396001"' },
  { formula: '=IFERROR(VLOOKUP(...), "Not Found")', desc: "Lookup error ko saaf message se badalta hai.", example: '#N/A → "Not Found"' },
];

const SHORTCUTS = [
  { key: "Ctrl + C / Ctrl + V", action: "Copy & Paste", use: "Roz ke clipboard kaam ke liye." },
  { key: "Ctrl + Shift + L", action: "Toggle Filters", use: "Header row par turant filter lagata/hatata hai." },
  { key: "Alt + E, S, V", action: "Paste Special → Values", use: "Formula result ko sirf value ke roop mein paste karta hai." },
  { key: "Ctrl + T", action: "Create Table", use: "Selected range ko formatted Excel Table banata hai." },
  { key: "Alt + H, O, I", action: "AutoFit Column Width", use: "Column width content ke hisab se set karta hai." },
  { key: "F2", action: "Edit Cell", use: "Active cell ke andar edit mode kholta hai." },
];

const matches = (query: string, ...values: string[]) =>
  !query || values.join(" ").toLowerCase().includes(query);

export function ExcelNotes() {
  const [activeTab, setActiveTab] = useState<Tab>("cleaning");
  const [searchQuery, setSearchQuery] = useState("");
  const query = searchQuery.trim().toLowerCase();

  const cleaning = useMemo(
    () => CLEANING.filter((item) => matches(query, item.formula, item.desc, item.example)),
    [query],
  );
  const shortcuts = useMemo(
    () => SHORTCUTS.filter((item) => matches(query, item.key, item.action, item.use)),
    [query],
  );
  const results = activeTab === "cleaning" ? cleaning : shortcuts;

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 bg-(--color-surface) text-(--color-ink) rounded-2xl shadow-sm border border-(--color-border)">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-(--color-border)">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-(--color-accent-dark) bg-(--color-accent-soft) px-2.5 py-1 rounded-full">
            Quick revision notes
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold mt-2">Excel Data Cleaning & Shortcuts</h1>
          <p className="text-sm text-(--color-muted) mt-1">Chhote, kaam ke notes — full library ke liye Formulas & Shortcuts section dekho.</p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 text-(--color-muted)" size={18} />
          <label className="sr-only" htmlFor="excel-notes-search">Notes search karo</label>
          <input
            id="excel-notes-search"
            type="search"
            placeholder="Search formulas, shortcuts..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-(--color-canvas) border border-(--color-border) rounded-xl text-sm outline-none focus:ring-2 focus:ring-(--color-accent)"
          />
        </div>
      </div>

      <div className="flex gap-2 mt-6 overflow-x-auto pb-2" role="tablist" aria-label="Excel notes">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "cleaning"}
          onClick={() => setActiveTab("cleaning")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all shrink-0 ${
            activeTab === "cleaning"
              ? "bg-(--color-accent) text-white shadow-sm"
              : "bg-(--color-canvas) text-(--color-muted) hover:bg-(--color-accent-soft)"
          }`}
        >
          <BookOpen size={16} /> Data Cleaning ({cleaning.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "shortcuts"}
          onClick={() => setActiveTab("shortcuts")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all shrink-0 ${
            activeTab === "shortcuts"
              ? "bg-(--color-accent) text-white shadow-sm"
              : "bg-(--color-canvas) text-(--color-muted) hover:bg-(--color-accent-soft)"
          }`}
        >
          <Zap size={16} /> Keyboard Shortcuts ({shortcuts.length})
        </button>
      </div>

      <div className="mt-6">
        {results.length === 0 ? (
          <p className="rounded-xl border border-(--color-border) bg-(--color-canvas) p-4 text-sm text-(--color-muted)">
            “{searchQuery}” ke liye kuch nahi mila. Doosra shabd try karo.
          </p>
        ) : activeTab === "cleaning" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {cleaning.map((item) => (
              <article key={item.formula} className="p-4 rounded-xl border border-(--color-border) bg-(--color-surface) hover:shadow-md transition-all">
                <div className="flex items-center justify-between gap-2">
                  <code className="text-xs font-mono font-bold bg-(--color-accent-soft) text-(--color-accent-dark) px-2.5 py-1 rounded-md break-all">
                    {item.formula}
                  </code>
                  <CheckCircle2 size={16} className="text-(--color-good) shrink-0" />
                </div>
                <p className="text-sm mt-3 font-medium leading-relaxed">{item.desc}</p>
                <p className="mt-4 pt-3 border-t border-(--color-border) text-xs text-(--color-muted) font-mono bg-(--color-canvas) p-2 rounded-lg">
                  Ex: {item.example}
                </p>
              </article>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {shortcuts.map((item) => (
              <article key={item.key} className="p-4 rounded-xl border border-(--color-border) bg-(--color-surface) hover:shadow-md transition-all">
                <div className="flex items-center justify-between gap-2">
                  <kbd className="text-xs font-bold bg-(--color-accent-soft) text-(--color-accent-dark) border border-(--color-border) px-2.5 py-1 rounded-md">
                    {item.key}
                  </kbd>
                  <Bookmark size={16} className="text-(--color-warn) shrink-0" />
                </div>
                <h2 className="text-sm font-semibold mt-3">{item.action}</h2>
                <p className="text-xs text-(--color-muted) mt-1 leading-relaxed">{item.use}</p>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
