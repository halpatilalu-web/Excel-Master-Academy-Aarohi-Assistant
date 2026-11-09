export interface DiplomaModule {
  id: string;
  code: string;
  emoji: string;
  titleEn: string;
  titleHi: string;
  descEn: string;
  descHi: string;
  image: string;
  color: string;
  chapters: number[];
  skills: string[];
  videoId: string;
  model3dId: string;
  sheetId: string;
}

export interface ChapterRichMeta {
  emoji: string;
  moduleId: string;
  enIntro: string;
  enPoints: string[];
  enTip: string;
  steps: { label: string; detailEn: string; detailHi: string }[];
  sampleTable: {
    headers: string[];
    rows: string[][];
    captionEn: string;
    captionHi: string;
  };
}

export const DIPLOMA_MODULES: DiplomaModule[] = [
  {
    id: "m1-basic",
    code: "MOD 01",
    emoji: "🟢",
    titleEn: "Basic Excel & Spreadsheet Foundation",
    titleHi: "Basic Excel aur Spreadsheet ki Neev",
    descEn: "Master the Excel interface, workbooks, data formatting, row/column operations, basic math formulas, and $A$1 cell locking.",
    descHi: "Excel ka interface, sheets, formatting, row/column kaam, SUM/AVERAGE aur $A$1 cell lock ekdum zero se seekho.",
    image: "/ai-gallery/basic-excel-grid.jpg",
    color: "#16a34a",
    chapters: [1, 2, 3, 4, 5, 6, 10],
    skills: ["Ribbon & Grid", "Formatting", "SUM/MIN/MAX", "$A$1 Locking", "Page Setup"],
    videoId: "vid-basic",
    model3dId: "sheet-stack",
    sheetId: "sheet-marks",
  },
  {
    id: "m2-cleaning",
    code: "MOD 02",
    emoji: "🧹",
    titleEn: "Data Cleaning, Text Functions & Preparation",
    titleHi: "Data Cleaning, Text Functions aur Data Taiyaari",
    descEn: "Turn messy office imports into spotless tables using Flash Fill, Sorting/Filtering, TRIM, CLEAN, PROPER, TEXTSPLIT, and Remove Duplicates.",
    descHi: "Gande office data ko Flash Fill, Filter, TRIM, CLEAN, PROPER, TEXTSPLIT aur Remove Duplicates se chamkao.",
    image: "/ai-gallery/data-cleaning.jpg",
    color: "#0d9488",
    chapters: [7, 8, 16, 33],
    skills: ["Flash Fill", "Sort & Filter", "TRIM & CLEAN", "Text to Columns", "IFERROR"],
    videoId: "vid-cleaning",
    model3dId: "pq-pipeline",
    sheetId: "sheet-cleaning",
  },
  {
    id: "m3-rules",
    code: "MOD 03",
    emoji: "🎨",
    titleEn: "Conditional Formatting & Data Validation",
    titleHi: "Conditional Formatting aur Data Validation",
    descEn: "Auto-highlight KPIs, overdue rows, and duplicates with visual rules, and prevent wrong entries using smart cascading dropdowns.",
    descHi: "Data Bars, Color Scales, Formula Row Highlight aur Dependent Dropdown Lists se smart error-free sheets banao.",
    image: "/ai-gallery/conditional-validation.jpg",
    color: "#d97706",
    chapters: [9, 21, 34, 35],
    skills: ["Color Scales", "Formula Row Rule", "Dropdown Lists", "INDIRECT Lists", "Duplicate Block"],
    videoId: "vid-cond-val",
    model3dId: "cityscape",
    sheetId: "sheet-validation",
  },
  {
    id: "m4-formulas",
    code: "MOD 04",
    emoji: "🧮",
    titleEn: "Logical, Conditional, Date & Financial Formulas",
    titleHi: "Logical, Shart wale, Date aur Financial Formulas",
    descEn: "Build automated grading, attendance, regional totals, age/working-day calculators, and loan EMI planners with IF, IFS, COUNTIFS, SUMIFS, and PMT.",
    descHi: "IF, IFS, AND/OR, COUNTIFS, SUMIFS, DATEDIF, NETWORKDAYS aur Loan EMI (Goal Seek) se smart calculation karo.",
    image: "/ai-gallery/diploma-hero.jpg",
    color: "#2563eb",
    chapters: [11, 12, 13, 14, 15, 17, 27],
    skills: ["IF & IFS", "AND / OR", "COUNTIFS", "SUMIFS", "DATEDIF & PMT"],
    videoId: "vid-logic",
    model3dId: "sheet-stack",
    sheetId: "sheet-sumifs",
  },
  {
    id: "m5-lookups",
    code: "MOD 05",
    emoji: "🔎",
    titleEn: "Advanced Lookups & Modern Dynamic Formulas",
    titleHi: "VLOOKUP, XLOOKUP, INDEX-MATCH aur Dynamic Arrays",
    descEn: "Connect multi-table workbooks using VLOOKUP, HLOOKUP, XLOOKUP, Two-Way INDEX-MATCH, Excel Tables, FILTER, UNIQUE, SORT, LET, and LAMBDA.",
    descHi: "VLOOKUP, XLOOKUP, 2-Way INDEX-MATCH, FILTER, UNIQUE, SORT, LET aur LAMBDA se pro-level data analyst bano.",
    image: "/ai-gallery/formulas-lookup.jpg",
    color: "#7c3aed",
    chapters: [18, 19, 20, 25, 28, 36, 38],
    skills: ["VLOOKUP", "XLOOKUP", "INDEX+MATCH", "FILTER & UNIQUE", "LET & LAMBDA"],
    videoId: "vid-xlookup",
    model3dId: "lookup-laser",
    sheetId: "sheet-lookup",
  },
  {
    id: "m6-pivot-dash",
    code: "MOD 06",
    emoji: "📊",
    titleEn: "Pivot Tables, Charts, Graphs & Dashboards",
    titleHi: "Pivot Tables, Charts, Graphs aur Executive Dashboards",
    descEn: "Summarize 100,000+ rows in seconds with Pivot Tables, Slicers, Timelines, 29+ chart types, and executive 1-page interactive dashboards.",
    descHi: "Hazaaron rows ka turant summary, Slicers, Timelines, 29+ Charts aur shandar Interactive MIS Dashboards banana seekho.",
    image: "/ai-gallery/pivot-dashboard.jpg",
    color: "#e11d48",
    chapters: [22, 23, 24, 29],
    skills: ["Pivot Tables", "Slicers & Timeline", "Combo & Waterfall", "KPI Cards", "Dashboard UX"],
    videoId: "vid-dashboard",
    model3dId: "pivot-cube",
    sheetId: "sheet-dashboard",
  },
  {
    id: "m7-powerquery",
    code: "MOD 07",
    emoji: "⚙️",
    titleEn: "Power Query ETL & Data Automation",
    titleHi: "Power Query ETL aur One-Click Data Refresh",
    descEn: "Automate monthly reporting without formulas or VBA — import folders, unpivot crosstabs, merge tables, and refresh with a single click.",
    descHi: "Bina formula aur bina copy-paste ke poora folder import karo, Unpivot aur Merge lagao, aur Refresh se report ready pao.",
    image: "/ai-gallery/power-query-etl.jpg",
    color: "#0284c7",
    chapters: [26, 37],
    skills: ["Get & Transform", "Folder Combine", "Unpivot Columns", "Merge Queries", "Auto Refresh"],
    videoId: "vid-powerquery",
    model3dId: "pq-pipeline",
    sheetId: "sheet-cleaning",
  },
  {
    id: "m8-vba",
    code: "MOD 08",
    emoji: "🤖",
    titleEn: "VBA Macros, Workbook Security & Capstone Project",
    titleHi: "VBA Macros, File Security aur Final Diploma Project",
    descEn: "Record macros, write VBA loops and events, export automated PDF reports, lock/encrypt sheets, and build your complete Diploma Capstone MIS.",
    descHi: "Macro Recorder, VBA Coding (Loops, MsgBox, Auto-PDF), Password Security aur End-to-End Corporate MIS Capstone Project.",
    image: "/ai-gallery/vba-macros.jpg",
    color: "#4f46e5",
    chapters: [30, 31, 32, 39, 40],
    skills: ["Macro Recorder", "VBA Loops", "Auto-PDF Export", "Sheet Protection", "Capstone MIS"],
    videoId: "vid-vba",
    model3dId: "vba-robot",
    sheetId: "sheet-dashboard",
  },
  {
    id: "m9-accounts-pro",
    code: "MOD 09",
    emoji: "🎨",
    titleEn: "Report Color Theory, 12-Error Auditing, GST Accounts & AI Automation",
    titleHi: "Color Theory, 12 Errors Ilaj, GST Accounts aur AI Automation",
    descEn: "Master executive report Color Theory palettes, diagnose all 12 Excel errors, use Database (DSUM/DGET) & Audit functions, build Indian GST/Payroll/Loan sheets, and engineer AI automation prompts.",
    descHi: "Executive report Color Theory, saare 12 Excel errors ka turant ilaj, DSUM/DGET database functions, GST Invoice/Salary Slip aur AI Prompt Automation!",
    image: "/ai-gallery/accounting-gst-mis.jpg",
    color: "#0d9488",
    chapters: [41, 42, 43, 44, 45],
    skills: ["Color Theory Palettes", "All 12 Errors Fix", "DSUM & DGET", "GST & Payroll MIS", "AI Prompt Builder"],
    videoId: "vid-dashboard",
    model3dId: "pivot-cube",
    sheetId: "sheet-gst",
  },
];

export const AI_GALLERY = [
  {
    src: "/ai-gallery/diploma-hero.jpg",
    titleEn: "Excel Diploma Academy — 3D Learning Campus",
    titleHi: "Excel Diploma Academy — 3D Digital Campus",
    descEn: "Complete Basic-to-Advanced curriculum combining live formulas, 3D visualizers, dashboards, and diploma certification.",
    descHi: "Basic se Advanced tak poora Excel safar — live formulas, 3D models, dashboards aur diploma practice ke saath.",
    tag: "Diploma Overview",
  },
  {
    src: "/ai-gallery/basic-excel-grid.jpg",
    titleEn: "Spreadsheet Grid, Shortcuts & Core Formulas",
    titleHi: "Excel Grid, Shortcuts aur Buniyadi Formulas",
    descEn: "Cells, rows, columns, shortcuts (Ctrl+T, Alt+=, F4) and foundational arithmetic.",
    descHi: "Cells, rows, columns, zaroori shortcuts (Ctrl+T, Alt+=, F4) aur basic hisaab-kitaab.",
    tag: "Basic Excel",
  },
  {
    src: "/ai-gallery/data-cleaning.jpg",
    titleEn: "Dirty Data → Clean Structured Table",
    titleHi: "Ganda Data → Chamakta Hua Clean Table",
    descEn: "Visualizing how TRIM, CLEAN, PROPER, Flash Fill, and Remove Duplicates purify messy office files.",
    descHi: "Dekho kaise TRIM, CLEAN, PROPER aur Remove Duplicates gande data ko saaf table mein badalte hain.",
    tag: "Data Cleaning",
  },
  {
    src: "/ai-gallery/conditional-validation.jpg",
    titleEn: "Conditional Formatting & Data Validation Rules",
    titleHi: "Conditional Formatting aur Dropdown Guardrails",
    descEn: "Smart color scales, progress bars, KPI icons, and dropdown lists keeping spreadsheets clean and readable.",
    descHi: "Color scales, data bars, KPI icons aur dropdown lists se sheet sundar aur galti-mukt banti hai.",
    tag: "Formatting & Validation",
  },
  {
    src: "/ai-gallery/formulas-lookup.jpg",
    titleEn: "XLOOKUP & INDEX-MATCH Laser Lookup Engine",
    titleHi: "XLOOKUP aur INDEX-MATCH Lookup Connection",
    descEn: "Connecting source tables and lookup reports dynamically in any direction without #N/A surprises.",
    descHi: "Do tables ke beech kisi bhi disha mein tezi se data dhundhne ka modern tareeka.",
    tag: "Advanced Lookups",
  },
  {
    src: "/ai-gallery/pivot-dashboard.jpg",
    titleEn: "Executive KPI Dashboard & Visual Analytics",
    titleHi: "Executive KPI Dashboard aur Interactive Charts",
    descEn: "Combining KPI cards, Pivot Charts, Donut rings, Trend waves, Waterfall bridges, and Slicers.",
    descHi: "KPI cards, Pivot Charts, Donut, Trend line, Waterfall aur Slicers ka professional sangam.",
    tag: "Dashboards & Charts",
  },
  {
    src: "/ai-gallery/power-query-etl.jpg",
    titleEn: "Power Query Automated ETL Pipeline",
    titleHi: "Power Query Automated ETL Machine",
    descEn: "Extract files from folders/CSV, Transform steps once, and Load clean data with one-click Refresh.",
    descHi: "Folder/CSV se data nikalo, ek baar steps set karo aur har mahine 1-click Refresh se kaam poora!",
    tag: "Power Query",
  },
  {
    src: "/ai-gallery/vba-macros.jpg",
    titleEn: "VBA Macros & One-Click Report Robot",
    titleHi: "VBA Macros aur One-Click Automation",
    descEn: "Automate repetitive office formatting, loops, and multi-city PDF exports with VBA code.",
    descHi: "Roz ke ghanton wale office kaam ko VBA Macro button se 2 second mein poora karo.",
    tag: "VBA & Macros",
  },
  {
    src: "/ai-gallery/color-theory-design.jpg",
    titleEn: "Report Color Theory & Corporate Palette Studio",
    titleHi: "Report Color Theory aur Executive Palette Design",
    descEn: "Harmonious 2-3 shade corporate palettes (Navy, Emerald, Teal), high contrast rules, and visual hierarchy.",
    descHi: "2-3 shades ka niyam, Complementary/Monochromatic harmonies aur high-contrast executive report colours.",
    tag: "Color Theory",
  },
  {
    src: "/ai-gallery/accounting-gst-mis.jpg",
    titleEn: "Accounts GST, Error Auditing & AI Prompt Automation",
    titleHi: "GST Billing, Payroll, Error Doctor aur AI Automation",
    descEn: "Indian GST CGST/SGST/IGST billing, 12-error diagnostic auditing, DSUM database queries, and AI prompt automation.",
    descHi: "GST Invoice, Salary Slip, 12 Excel Errors ka ilaj, DSUM aur AI Prompt se 10-second automation!",
    tag: "Accounts & AI Pro",
  },
] as const;

export function getModuleForChapter(chapterNumber: number): DiplomaModule {
  return DIPLOMA_MODULES.find((m) => m.chapters.includes(chapterNumber)) ?? DIPLOMA_MODULES[0];
}

/**
 * The per-chapter lesson content (rich notes, steps, sample tables) is ~75 kB of
 * hand-written bilingual material and is only needed by the chapter, notes and
 * video screens — never by the dashboard. It lives in its own module and is
 * re-exported here so every existing import keeps working unchanged.
 */
export { CHAPTER_RICH, getChapterRich } from "./diplomaChapterRich";
