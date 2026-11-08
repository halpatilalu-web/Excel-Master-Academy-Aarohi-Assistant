import { useMemo, useState } from "react";
import { BookOpen, Bookmark, CheckCircle2, Layers, Printer, Search, Sparkles, Zap } from "lucide-react";
import { CHAPTERS, LEVEL_STYLE } from "../data/chapters";
import { DIPLOMA_MODULES, getChapterRich } from "../data/diplomaModules";
import { Bilingual, LangSwitcher, useLang } from "../lib/lang";
import { Button, Card, Pill } from "../components/ui";

type Tab = "handwritten" | "infographics" | "quick";

const CLEANING = [
  { formula: "=TRIM(A1)", descEn: "Removes leading, trailing, and repeated spaces between words.", descHi: "Extra spaces hatata hai — shuru, aakhir aur beech ke double spaces.", example: '"  Ravi   Kumar  " → "Ravi Kumar"' },
  { formula: "=CLEAN(A1)", descEn: "Strips non-printable line breaks and hidden ASCII garbage.", descHi: "Imported data ke chhupe non-printable characters hatata hai.", example: '"ankit\\nverma" → "ankitverma"' },
  { formula: "=PROPER(TRIM(A1))", descEn: "Trims spaces AND converts text to neat Title Case.", descHi: "Faltu space hata kar har shabd ka pehla letter Capital banata hai.", example: '"  ravi SHARMA " → "Ravi Sharma"' },
  { formula: '=TEXTSPLIT(A1, ",")', descEn: "Splits comma/pipe separated text dynamically across columns.", descHi: "Delimiter (comma/pipe) se text ko alag cells mein baant deta hai.", example: '"Pen,50,North" → Pen | 50 | North' },
  { formula: "=LEFT(A1, 6) / =RIGHT(A1, 6)", descEn: "Extracts N characters from the start or end of a code.", descHi: "Left ya Right side se diye gaye akshar/PIN code nikalta hai.", example: '"380001-Gujarat" → "380001"' },
  { formula: '=IFERROR(XLOOKUP(...), "Not Found")', descEn: "Replaces #N/A or #VALUE! errors with a clean business label.", descHi: "Error aane par gande #N/A ki jagah saaf message dikhata hai.", example: '#N/A → "Not Found"' },
];

const SHORTCUTS = [
  { key: "Ctrl + T", action: "Create Excel Table", useEn: "Converts raw range into an auto-expanding structured Table.", useHi: "Selected range ko smart auto-expanding Table banata hai." },
  { key: "Ctrl + Shift + L", action: "Toggle Filters", useEn: "Adds or removes filter dropdowns on header row instantly.", useHi: "Header row par turant Filter on/off karta hai." },
  { key: "Ctrl + E", action: "Flash Fill", useEn: "Detects your example pattern and fills 1,000 rows in 1 click.", useHi: "Ek example dekh kar baaki rows khud pattern se bharta hai." },
  { key: "Alt + =", action: "Instant AutoSum", useEn: "Inserts =SUM() automatically below or beside numeric columns.", useHi: "Numbers ke neeche turant =SUM() laga deta hai." },
  { key: "F4", action: "Lock Cell ($A$1)", useEn: "Cycles A1 → $A$1 → A$1 → $A1 inside formulas.", useHi: "Formula mein $ lock lagata aur badalta hai." },
  { key: "Alt + E, S, V", action: "Paste Values Only", useEn: "Pastes calculated results without formulas or formatting.", useHi: "Formula hata kar sirf pakki value paste karta hai." },
  { key: "Alt + F1", action: "Instant Chart", useEn: "Creates a clean Column chart right on the active worksheet.", useHi: "Selected data ka turant sheet par Chart banata hai." },
  { key: "Alt + F11", action: "Open VBA Editor", useEn: "Opens Visual Basic editor to write or inspect Macros.", useHi: "Macro code likhne ke liye VBA Editor kholta hai." },
];

interface InfographicPoster {
  id: string;
  badge: string;
  emoji: string;
  titleEn: string;
  titleHi: string;
  accent: string;
  summaryEn: string;
  summaryHi: string;
  blocks: { head: string; tag: string; detailEn: string; detailHi: string }[];
}

const INFOGRAPHICS: InfographicPoster[] = [
  {
    id: "inf-formula",
    badge: "POSTER 01",
    emoji: "🧬",
    titleEn: "Anatomy of an Excel Formula & PEMDAS Order",
    titleHi: "Excel Formula ki Banawat aur Calculation ka Kram",
    accent: "#059669",
    summaryEn: "Every formula starts with '=' and evaluates Brackets () → Exponents ^ → Multiply/Divide * / → Add/Subtract + - → Comparisons = > <.",
    summaryHi: "Har formula '=' se shuru hota hai aur sabse pehle Bracket (), phir Power ^, phir Guna/Bhaag, aur aakhir mein Jod/Ghataav solve karta hai.",
    blocks: [
      { head: "1. Equals (=)", tag: "=IF(...)", detailEn: "Activates calculation mode", detailHi: "Excel ko batata hai ki formula shuru hua" },
      { head: "2. Function", tag: "XLOOKUP / SUMIFS", detailEn: "Built-in engine name", detailHi: "Kaam karne wali machine ka naam" },
      { head: "3. References", tag: "B2:B50, $G$1", detailEn: "Dynamic or F4-locked cells", detailHi: "Cells ka pata ($ se lock)" },
      { head: "4. Operators", tag: "() → ^ → */ → +-", detailEn: "Strict PEMDAS evaluation order", detailHi: "Bracket sabse pehle calculate hota hai!" },
    ],
  },
  {
    id: "inf-lookup",
    badge: "POSTER 02",
    emoji: "🔎",
    titleEn: "VLOOKUP vs HLOOKUP vs XLOOKUP vs INDEX+MATCH",
    titleHi: "Chaaron Lookup Functions ka Master Comparison",
    accent: "#7c3aed",
    summaryEn: "Choose XLOOKUP on Excel 2021/365 for simplicity and power, or INDEX+MATCH when sharing files with older Excel 2010–2019 users.",
    summaryHi: "Naye Excel mein XLOOKUP sabse best hai; purane Excel versions ke saath file share karni ho to INDEX+MATCH hamesha kaam karega.",
    blocks: [
      { head: "VLOOKUP", tag: "Right Only ➡️", detailEn: "Simple, breaks if column inserted", detailHi: "Aasaan hai, par left lookup nahi kar sakta" },
      { head: "HLOOKUP", tag: "Down Only ⬇️", detailEn: "Searches top horizontal row", detailHi: "Row mein dhundh kar neeche se value lata hai" },
      { head: "INDEX + MATCH", tag: "Any Way 🧭", detailEn: "Works in ALL Excel versions, 2D matrix ready", detailHi: "Har Excel version mein left/right/2D sab chalta hai" },
      { head: "XLOOKUP", tag: "Modern King 👑", detailEn: "Left/Right, built-in Not Found, reverse search", detailHi: "Sabse aasaan, safe aur bina IFERROR ke chalta hai" },
    ],
  },
  {
    id: "inf-cleaning",
    badge: "POSTER 03",
    emoji: "🧼",
    titleEn: "6-Step Dirty-to-Clean Data Pipeline",
    titleHi: "Gande Data ko Saaf Karne ke 6 Golden Steps",
    accent: "#0d9488",
    summaryEn: "80% of real-world MIS work is cleaning messy imports BEFORE building formulas or Pivot Tables.",
    summaryHi: "Office mein Pivot ya Dashboard banane se pehle in 6 steps se data saaf karna sabse zaroori hai.",
    blocks: [
      { head: "Step 1: Unmerge", tag: "Alt+H+M+U", detailEn: "Unmerge all merged cells & fill blanks", detailHi: "Saare Merged cells hatao" },
      { head: "Step 2: CLEAN+TRIM", tag: "=TRIM(CLEAN(A2))", detailEn: "Strip hidden line breaks & extra spaces", detailHi: "Faltu space aur chhupa kachra mitao" },
      { head: "Step 3: Split & Case", tag: "PROPER / Split", detailEn: "Standardize Title Case & split combined cols", detailHi: "Naam sahi Case mein aur jude columns alag karo" },
      { head: "Step 4: Ctrl + T", tag: "Dedupe + Table", detailEn: "Remove Duplicates & convert to structured Table", detailHi: "Duplicates hata kar Ctrl+T Table banao" },
    ],
  },
  {
    id: "inf-condval",
    badge: "POSTER 04",
    emoji: "🎨",
    titleEn: "Conditional Formatting & Data Validation Guardrails",
    titleHi: "Visual Highlighting aur Galat Entry Rokne ke Niyam",
    accent: "#d97706",
    summaryEn: "Data Validation stops bad inputs BEFORE entry; Conditional Formatting highlights key patterns AFTER entry.",
    summaryHi: "Data Validation galat data daalne se rokta hai, aur Conditional Formatting zaroori data ko chamkata hai!",
    blocks: [
      { head: "Dropdown List", tag: "Allow: List", detailEn: "Standardize Region/Status picks", detailHi: "Spelling mistake 100% band" },
      { head: "Dependent List", tag: "=INDIRECT(A2)", detailEn: "State selects matching Cities list", detailHi: "State ke hisaab se City list badle" },
      { head: "Full Row Rule", tag: '=$E2="Overdue"', detailEn: "Lock column ($) only to color whole row", detailHi: "$E2 se poori row ek saath laal rang" },
      { head: "Data Bars & Scales", tag: "Visual KPIs", detailEn: "Instant in-cell mini progress bars", detailHi: "Cell ke andar hi sundar progress bar" },
    ],
  },
  {
    id: "inf-pivot",
    badge: "POSTER 05",
    emoji: "🌪️",
    titleEn: "Pivot Table 4-Quadrant & Dashboard Blueprint",
    titleHi: "Pivot Table ke 4 Khane aur Dashboard Architecture",
    accent: "#e11d48",
    summaryEn: "Drag text/date fields to Rows/Columns/Filters and numeric columns to Values — summarize 100k rows in 5 seconds!",
    summaryHi: "Naam/Sheher ko Rows mein, Mahino ko Columns mein aur Rupaye/Numbers ko Values mein daalo — report taiyaar!",
    blocks: [
      { head: "1. FILTERS", tag: "Top Dropdown", detailEn: "Global filter (e.g., Year = 2026)", detailHi: "Poori report ka main filter" },
      { head: "2. COLUMNS", tag: "Across Top", detailEn: "Short groups (Q1, Q2, Q3, Q4)", detailHi: "Upar dikhne wale headers" },
      { head: "3. ROWS", tag: "Down Left", detailEn: "Main breakdown (Branch / Product)", detailHi: "Neeche aane wali list" },
      { head: "4. VALUES (Σ)", tag: "Math Engine", detailEn: "Sum, Count, Average, % of Total", detailHi: "Jod, ginti, ausat aur % share" },
    ],
  },
  {
    id: "inf-errors",
    badge: "POSTER 06",
    emoji: "🚑",
    titleEn: "All 12 Excel Errors — Meaning & Instant Doctor Fix",
    titleHi: "Excel ke Saare 12 Errors — Kyun Aate Hain aur Turant Ilaj",
    accent: "#dc2626",
    summaryEn: "Never panic at an error code! Every '#' code — from #DIV/0! & #NULL! to #CALC! & #BLOCKED! — points to the exact root cause.",
    summaryHi: "Har '#' error khud batata hai ki galti kahan hui hai — bas yeh 12-error chart yaad rakho!",
    blocks: [
      { head: "#N/A, #DIV/0!, #VALUE!", tag: "Classic Core", detailEn: "#N/A = missing ID (IFNA); #DIV/0! = /0 (IFERROR); #VALUE! = text+math", detailHi: "#N/A = ID nahi mili; #DIV/0! = zero se bhaag; #VALUE! = text+number" },
      { head: "#REF!, #NAME?, #NUM!", tag: "Ref / Typo", detailEn: "#REF! = col deleted; #NAME? = typo/quotes; #NUM! = SQRT(-16) / DGET dup", detailHi: "#REF! = cell delete; #NAME? = spelling galat; #NUM! = galat ganit" },
      { head: "#NULL! & #######", tag: "Range / Width", detailEn: "#NULL! = space instead of ':' (=SUM(A1 A10)); ##### = widen column!", detailHi: "#NULL! = colon ':' chhoota; ####### = column border double-click karo!" },
      { head: "#SPILL!, #CALC!, #CONNECT!, #BLOCKED!", tag: "Modern 365", detailEn: "#SPILL! = clear below; #CALC! = empty FILTER; #CONNECT!/#BLOCKED! = link/Trust Center", detailHi: "#SPILL! = neeche khali karo; #CALC! = FILTER khali; #BLOCKED! = security block" },
    ],
  },
  {
    id: "inf-pq",
    badge: "POSTER 07",
    emoji: "⚙️",
    titleEn: "Power Query Automated ETL Workflow",
    titleHi: "Power Query: Extract → Transform → Load Machine",
    accent: "#0284c7",
    summaryEn: "Build your cleaning pipeline once in Power Query Editor; refresh monthly reports in 2 seconds forever!",
    summaryHi: "Ek baar Power Query mein safai sikha do — zindagi bhar har mahine sirf Refresh button dabana padega!",
    blocks: [
      { head: "1. EXTRACT", tag: "Get Data", detailEn: "CSV, XLSX, PDF, Web, SQL, Entire Folder", detailHi: "File ya poore Folder se data kheecho" },
      { head: "2. TRANSFORM", tag: "Applied Steps", detailEn: "Trim, Split, Unpivot, Merge, Group By", detailHi: "Unpivot aur Merge bina formula ke" },
      { head: "3. LOAD", tag: "Output", detailEn: "Clean Table, Pivot Cache, or Data Model", detailHi: "Sheet ya seedha Pivot mein utaro" },
      { head: "4. REFRESH", tag: "Alt + F5", detailEn: "New files auto-processed in 1 click!", detailHi: "Nayi file folder mein daalo → Refresh!" },
    ],
  },
  {
    id: "inf-vba",
    badge: "POSTER 08",
    emoji: "🤖",
    titleEn: "VBA Object Model & Automation Architecture",
    titleHi: "VBA ka Object Model (Application se Cell tak)",
    accent: "#4f46e5",
    summaryEn: "VBA addresses Excel like a postal address: Application → Workbook → Worksheet → Range/Cells → Property/Method.",
    summaryHi: "VBA bilkul ghar ke pate ki tarah chalta hai: Excel → File → Sheet → Cell → Value ya Colour!",
    blocks: [
      { head: "Application", tag: "Excel App", detailEn: "Application.ScreenUpdating = False", detailHi: "Poore Excel software ki settings" },
      { head: "ThisWorkbook", tag: ".xlsm File", detailEn: "ThisWorkbook.Save / Worksheets.Count", detailHi: "Jis macro file mein code likha hai" },
      { head: "Worksheets(1)", tag: "Sheet Tab", detailEn: 'Sheets("Dashboard").ExportAsFixedFormat', detailHi: "Kisi khaas Sheet par kaam ya PDF" },
      { head: 'Range("A1")', tag: "Cells(r, c)", detailEn: ".Value, .Interior.Color, .Font.Bold", detailHi: "Cell ki value padhna, likhna aur rangna" },
    ],
  },
  {
    id: "inf-colors",
    badge: "POSTER 09",
    emoji: "🎨",
    titleEn: "Color Theory & Corporate Palettes for Excel Reports",
    titleHi: "Excel Reports ke liye Color Theory aur 3 Corporate Palettes",
    accent: "#0d9488",
    summaryEn: "Follow the 2–3 main shade rule with high text contrast and neutral backgrounds for CFO-ready spreadsheets.",
    summaryHi: "Rainbow sheet mat banao! 2-3 shades, high contrast aur neutral background se report boardroom-ready banti hai.",
    blocks: [
      { head: "1. SIMPLICITY", tag: "2–3 Shades Max", detailEn: "1 Brand Header + 1 Chart Accent + Light Gray/White canvas", detailHi: "1 गहरा ब्रांड रंग + 1 चार्ट रंग + हल्का बैकग्राउंड" },
      { head: "2. HARMONIES", tag: "Color Wheel", detailEn: "Complementary (Blue+Amber), Analogous (Blue+Teal), Monochromatic", detailHi: "Complementary = तुलना; Monochromatic = एक रंग के शेड्स" },
      { head: "3. TOP PALETTES", tag: "HEX Ready", detailEn: "Navy #1B4F72 + Gray | Emerald #145A32 + Beige | Charcoal + Teal #0E9AA7", detailHi: "नेवी+ग्रे | डार्क ग्रीन+बेज | चारकोल+टील" },
      { head: "4. ALERT RULE", tag: "Red / Amber", detailEn: "Reserve bright Red & Yellow strictly for KPI exceptions & low stock!", detailHi: "चमकीला लाल/पीला रंग सिर्फ अलर्ट के लिए बचाकर रखो!" },
    ],
  },
  {
    id: "inf-gst-ai",
    badge: "POSTER 10",
    emoji: "🧾",
    titleEn: "Indian GST Billing, Database DSUM & AI Prompt Formula",
    titleHi: "GST Invoice नियम, DSUM/DGET और 5-Part AI Prompt सूत्र",
    accent: "#b45309",
    summaryEn: "Daily Accounts Expert formulas for CGST/SGST/IGST, audited DGET lookups, and structured AI automation prompts.",
    summaryHi: "Accounts ऑफिस में रोज़ काम आने वाले GST फॉर्मूले, DGET ऑडिट और AI प्रॉम्प्ट टेम्पलेट!",
    blocks: [
      { head: "1. GST SPLIT", tag: "CGST/SGST/IGST", detailEn: "Same State → 9% CGST + 9% SGST; Inter-State → 18% IGST (ROUND 2)", detailHi: "सेम स्टेट = CGST+SGST; अलग स्टेट = IGST" },
      { head: "2. REVERSE GST", tag: "From MRP", detailEn: "Taxable Base = Inclusive_Total / (1 + GST%) — never Total*18%!", detailHi: "MRP से बेस कीमत = Total / 1.18" },
      { head: "3. DSUM & DGET", tag: "Database Audit", detailEn: '=DSUM(A1:E500,"Sales",G1:H2); DGET flags duplicate IDs with #NUM!', detailHi: "DGET डुप्लीकेट ID होने पर तुरंत #NUM! अलर्ट देता है" },
      { head: "4. AI PROMPT", tag: "5-Part Blueprint", detailEn: "[Workbook] + [Sheet] + [Range & Cols] + [Logic] + [Output Cell]", detailHi: "फाइल + शीट + रेंज + नियम + आउटपुट सेल = सटीक कोड!" },
    ],
  },
];

export function ExcelNotes({ onGoChapter }: { onGoChapter?: (chapter: number) => void } = {}) {
  const { lang } = useLang();
  const [tab, setTab] = useState<Tab>("handwritten");
  const [moduleFilter, setModuleFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const query = searchQuery.trim().toLowerCase();

  const filteredChapters = useMemo(() => {
    return CHAPTERS.filter((ch) => {
      const rich = getChapterRich(ch.n);
      if (moduleFilter !== "ALL" && rich.moduleId !== moduleFilter) return false;
      if (!query) return true;
      const hay = [
        ch.title,
        ch.intro,
        ...ch.points,
        rich.enIntro,
        ...rich.enPoints,
        ch.formula?.f ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(query);
    });
  }, [moduleFilter, query]);

  const cleaning = useMemo(
    () =>
      CLEANING.filter(
        (i) => !query || `${i.formula} ${i.descEn} ${i.descHi} ${i.example}`.toLowerCase().includes(query),
      ),
    [query],
  );
  const shortcuts = useMemo(
    () =>
      SHORTCUTS.filter(
        (i) => !query || `${i.key} ${i.action} ${i.useEn} ${i.useHi}`.toLowerCase().includes(query),
      ),
    [query],
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-(--color-accent-dark) bg-(--color-accent-soft) px-3 py-1 rounded-full">
            <Sparkles size={13} /> Bilingual Diploma Study Vault
          </span>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold mt-2">
            Handwritten Notes & Professional Infographics 📒🎨
          </h1>
          <p className="text-sm text-(--color-muted) mt-1">
            All {CHAPTERS.length} chapters of colorful handwritten notebook pages + 8 visual infographic posters in Hindi & English!
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <LangSwitcher />
          <Button variant="secondary" onClick={() => window.print()}>
            <Printer size={15} /> Print / PDF
          </Button>
        </div>
      </div>

      {/* Search + Mode Tabs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Excel study vault">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "handwritten"}
            onClick={() => setTab("handwritten")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition ${
              tab === "handwritten"
                ? "bg-(--color-accent) text-white shadow-sm"
                : "bg-(--color-surface) border border-(--color-border) text-(--color-muted)"
            }`}
          >
            <BookOpen size={16} /> Handwritten Notes ({filteredChapters.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "infographics"}
            onClick={() => setTab("infographics")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition ${
              tab === "infographics"
                ? "bg-(--color-accent) text-white shadow-sm"
                : "bg-(--color-surface) border border-(--color-border) text-(--color-muted)"
            }`}
          >
            <Layers size={16} /> Professional Infographics ({INFOGRAPHICS.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "quick"}
            onClick={() => setTab("quick")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition ${
              tab === "quick"
                ? "bg-(--color-accent) text-white shadow-sm"
                : "bg-(--color-surface) border border-(--color-border) text-(--color-muted)"
            }`}
          >
            <Zap size={16} /> Quick Cheat Cards
          </button>
        </div>

        <div className="relative sm:w-64">
          <Search className="absolute left-3 top-2.5 text-(--color-muted)" size={17} />
          <label className="sr-only" htmlFor="excel-notes-search">
            Search notes
          </label>
          <input
            id="excel-notes-search"
            type="search"
            placeholder="Search VLOOKUP, Pivot, TRIM..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-(--color-surface) border border-(--color-border) rounded-xl text-sm outline-none focus:ring-2 focus:ring-(--color-accent)"
          />
        </div>
      </div>

      {/* TAB 1: ALL 40 HANDWRITTEN NOTEBOOK PAGES */}
      {tab === "handwritten" && (
        <div className="space-y-5 print-area">
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setModuleFilter("ALL")}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border ${
                moduleFilter === "ALL"
                  ? "bg-(--color-ink) text-(--color-canvas)"
                  : "border-(--color-border) text-(--color-muted)"
              }`}
            >
              All 8 Diploma Modules ({CHAPTERS.length})
            </button>
            {DIPLOMA_MODULES.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setModuleFilter(m.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border ${
                  moduleFilter === m.id
                    ? "bg-(--color-accent) text-white border-transparent"
                    : "border-(--color-border) text-(--color-muted) hover:bg-(--color-accent-soft)"
                }`}
              >
                {m.emoji} {m.code}: {m.titleEn.split(" ")[0]}
              </button>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            {filteredChapters.map((ch) => {
              const rich = getChapterRich(ch.n);
              const paperColors = ["#fffbeb", "#fff1f5", "#f0fdf4", "#eff6ff"];
              const paperBg = paperColors[(ch.n - 1) % paperColors.length];
              return (
                <article
                  key={ch.n}
                  style={{ background: paperBg }}
                  className="note relative rounded-2xl border border-amber-900/15 p-5 pl-9 shadow-sm text-(--color-ink) overflow-hidden"
                >
                  {/* Red Notebook Margin Line */}
                  <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-rose-400/60" aria-hidden="true" />

                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span
                        className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full"
                        style={{
                          background: LEVEL_STYLE[ch.level].bg,
                          color: LEVEL_STYLE[ch.level].fg,
                        }}
                      >
                        Ch {ch.n} · {ch.level}
                      </span>
                      <h2 className="hand text-2xl sm:text-3xl font-bold text-(--color-ink) mt-1 leading-tight">
                        {rich.emoji} {ch.title}
                      </h2>
                    </div>
                    {onGoChapter && (
                      <button
                        type="button"
                        onClick={() => onGoChapter(ch.n)}
                        className="text-xs font-bold px-2.5 py-1 rounded-lg bg-(--color-surface) hover:bg-(--color-accent-soft) border border-(--color-border-strong) text-(--color-accent-dark) shrink-0"
                      >
                        Open →
                      </button>
                    )}
                  </div>

                  {(lang === "both" || lang === "en") && (
                    <div className="mt-2">
                      <span className="inline-block text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-200/80 text-emerald-950">
                        🇬🇧 English Handwritten Notes
                      </span>
                      <ul className="hand text-xl leading-7 mt-1 space-y-0.5 text-indigo-950">
                        {rich.enPoints.map((pt, idx) => (
                          <li key={idx} className="flex gap-1.5">
                            <span className="text-emerald-700">✓</span>
                            <span>{pt}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {(lang === "both" || lang === "hi") && (
                    <div className="mt-2.5">
                      <span className="inline-block text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-200/90 text-amber-950">
                        🇮🇳 Hindi / Hinglish Mere Notes
                      </span>
                      <ul className="hand text-xl leading-7 mt-1 space-y-0.5 text-rose-950">
                        {ch.points.map((pt, idx) => (
                          <li key={idx} className="flex gap-1.5">
                            <span className="text-rose-600">✦</span>
                            <span>{pt}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {ch.formula && (
                    <div className="mt-3 rounded-xl bg-slate-900 text-emerald-300 px-3 py-2 font-mono text-xs overflow-x-auto">
                      fx: {ch.formula.f}
                    </div>
                  )}

                  <div className="mt-3 rounded-xl bg-yellow-200/75 border border-yellow-500/30 px-3 py-1.5 hand text-lg text-(--color-ink)">
                    📌 <b>Exam Tip:</b> {lang === "en" ? rich.enTip : lang === "hi" ? ch.tip : `${rich.enTip} (${ch.tip})`}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: PROFESSIONAL EXCEL INFOGRAPHICS */}
      {tab === "infographics" && (
        <div className="space-y-5 print-area">
          {INFOGRAPHICS.map((poster) => (
            <Card key={poster.id} className="!p-0 overflow-hidden shadow-sm">
              <div
                style={{ background: poster.accent }}
                className="px-5 py-4 text-white flex flex-wrap items-center justify-between gap-2"
              >
                <div>
                  <span className="text-[11px] font-extrabold tracking-widest uppercase bg-white/20 px-2.5 py-0.5 rounded-full">
                    {poster.badge} · Professional Infographic
                  </span>
                  <h2 className="font-display text-xl sm:text-2xl font-extrabold mt-1.5">
                    {poster.emoji} {poster.titleEn}
                  </h2>
                  <p className="text-xs sm:text-sm text-white/90">{poster.titleHi}</p>
                </div>
              </div>

              <div className="p-5 space-y-4">
                <Bilingual en={poster.summaryEn} hi={poster.summaryHi} />

                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {poster.blocks.map((blk, i) => (
                    <div
                      key={blk.head}
                      className="relative neu-card p-4 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span
                            style={{ background: poster.accent }}
                            className="w-6 h-6 rounded-full text-white text-xs font-extrabold grid place-items-center"
                          >
                            {i + 1}
                          </span>
                          <code className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-(--color-accent-soft) text-(--color-accent-dark)">
                            {blk.tag}
                          </code>
                        </div>
                        <h3 className="font-display font-extrabold text-sm mt-2.5">{blk.head}</h3>
                        {(lang === "both" || lang === "en") && (
                          <p className="text-xs text-(--color-ink) mt-1.5 leading-relaxed">
                            🇬🇧 {blk.detailEn}
                          </p>
                        )}
                        {(lang === "both" || lang === "hi") && (
                          <p className="text-xs text-(--color-muted) mt-1 leading-relaxed">
                            🇮🇳 {blk.detailHi}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* TAB 3: QUICK REVISION CARDS */}
      {tab === "quick" && (
        <div className="space-y-6">
          <section className="space-y-3">
            <h2 className="font-display font-bold text-lg flex items-center gap-2">
              <Pill tone="good">Data Cleaning</Pill> Top Cleaning Formulas
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              {cleaning.map((item) => (
                <Card key={item.formula} className="!p-4">
                  <div className="flex items-center justify-between gap-2">
                    <code className="text-xs font-mono font-bold bg-(--color-accent-soft) text-(--color-accent-dark) px-2.5 py-1 rounded-md">
                      {item.formula}
                    </code>
                    <CheckCircle2 size={16} className="text-(--color-good) shrink-0" />
                  </div>
                  <Bilingual compact en={item.descEn} hi={item.descHi} className="text-sm mt-2.5" />
                  <p className="mt-3 text-xs font-mono bg-(--color-canvas) p-2 rounded-lg border border-(--color-border)">
                    Ex: {item.example}
                  </p>
                </Card>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="font-display font-bold text-lg flex items-center gap-2">
              <Pill tone="warn">Shortcuts</Pill> High-Speed Keyboard Shortcuts
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              {shortcuts.map((item) => (
                <Card key={item.key} className="!p-4">
                  <div className="flex items-center justify-between gap-2">
                    <kbd className="text-xs font-bold bg-(--color-accent-soft) text-(--color-accent-dark) border border-(--color-border) px-2.5 py-1 rounded-md">
                      {item.key}
                    </kbd>
                    <Bookmark size={16} className="text-(--color-warn) shrink-0" />
                  </div>
                  <h3 className="text-sm font-bold mt-2.5">{item.action}</h3>
                  <Bilingual compact en={item.useEn} hi={item.useHi} className="text-xs mt-1" />
                </Card>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
