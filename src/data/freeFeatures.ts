/**
 * @license MIT
 * FREE-version feature list.
 *
 * The brief was "everything Microsoft sells as a paid upgrade must be here, free".
 * This file is the honest inventory: what this app really does, what it does
 * with a documented limitation, and what needs the student's own Excel file.
 * A test asserts every row is rendered on the /free page, so the promise can
 * never quietly drift from reality.
 */
export type FreeStatus = "full" | "browser-limit" | "excel-only";

export interface FreeFeature {
  /** Excel name the student will recognise (XLOOKUP, Flash Fill, Power Pivot …). */
  name: string;
  /** Which Excel / Office area it belongs to. */
  group: string;
  status: FreeStatus;
  en: string;
  hi: string;
}

export const FREE_FEATURES: FreeFeature[] = [
  // ---------------------------------------------------------------- formulas
  { name: "400 worksheet functions", group: "Formulas", status: "full", en: "XLOOKUP, FILTER, SORT, UNIQUE, LET, LAMBDA, MAP, SCAN, TEXTSPLIT, TEXTBEFORE, SEQUENCE, RANDARRAY and every classic.", hi: "XLOOKUP, FILTER, SORT, UNIQUE, LET, LAMBDA, MAP, SCAN, TEXTSPLIT, SEQUENCE, RANDARRAY — sabhi classic formulas ke saath." },
  { name: "Dynamic arrays & spilling", group: "Formulas", status: "full", en: "FILTER/UNIQUE/SORT results spill into the neighbouring cells, exactly like 365.", hi: "FILTER/UNIQUE/SORT ka result bagal ki cells mein spill hota hai, 365 jaisa." },
  { name: "LAMBDA & LET", group: "Formulas", status: "full", en: "Write your own reusable function inside a formula, with nested MAP/REDUCE/SCAN.", hi: "Formula ke andar apna function banao — LAMBDA, LET, MAP/REDUCE/SCAN." },
  { name: "Flash Fill (Ctrl+E)", group: "Formulas", status: "full", en: "Type one example, press Ctrl+E: first/last name, e-mail domain, GSTIN, digits-only, date parts, joined columns.", hi: "Ek example likho, Ctrl+E dabao: naam, e-mail domain, GSTIN, sirf digits, date ke hisse, do column jodna." },
  { name: "AutoSum (Alt+=)", group: "Formulas", status: "full", en: "Detects the contiguous numbers above, else to the left, and writes SUM for you.", hi: "Upar ke ya baayein ke numbers khud pakad kar SUM likh deta hai." },
  { name: "AGGREGATE / SUBTOTAL", group: "Formulas", status: "full", en: "All 19 function codes and the ignore-errors options.", hi: "Saare 19 function codes aur ignore-errors options." },
  { name: "Evaluating formulas (F9)", group: "Formulas", status: "full", en: "Recalculate a sheet on demand; errors explain themselves in Hindi + English.", hi: "F9 se dobara calculate; error ka matlab Hindi + English mein." },

  // -------------------------------------------------------------- the grid
  { name: "Fill handle & Fill Down", group: "Grid", status: "full", en: "Drag the corner square to copy; relative references shift like Excel ($A$1, A$1, $A1).", hi: "Kone ka square kheencho — reference khud adjust hote hain ($A$1, A$1, $A1)." },
  { name: "Sort, Remove Duplicates & data bars", group: "Grid", status: "full", en: "Data ▸ Sort A→Z / Z→A moves whole rows so the other columns stay attached; Remove Duplicates keeps the first copy; conditional-formatting data bars paint behind the numbers.", hi: "Data ▸ Sort A→Z / Z→A poore row ko hilata hai taaki columns tootein nahi; Remove Duplicates pehli copy rakhta hai; data bars numbers ke peeche banti hain." },
  { name: "Column width & Split view", group: "Grid", status: "full", en: "Drag any column border to resize; Split freezes the header row like View ▸ Split.", hi: "Column border kheencho; Split se header row freeze ho jaata hai." },
  { name: "Undo / Redo, bold, number formats", group: "Grid", status: "full", en: "Ctrl+Z / Ctrl+Y, Ctrl+B, currency, %, dates and custom number formats.", hi: "Ctrl+Z / Ctrl+Y, Ctrl+B, ₹, %, date aur custom formats." },
  { name: "Multi-sheet workbooks", group: "Grid", status: "full", en: "Add, rename, delete and cross-reference sheets (Data!A1, SUM(Data!A:A)).", hi: "Sheets jodo, hatao aur cross-reference karo (Data!A1, SUM(Data!A:A))." },
  { name: "Paste a block from Excel", group: "Grid", status: "full", en: "Paste a whole table copied from desktop Excel or Google Sheets.", hi: "Desktop Excel ya Google Sheets se poori table paste karo." },
  { name: "Copy back to Excel", group: "Grid", status: "full", en: "One click copies the block as tab-separated text for a real Excel paste.", hi: "Ek click mein block tab-separated text ban jaata hai — Excel mein paste karo." },
  { name: "Virtual Excel keyboard", group: "Grid", status: "full", en: "Every key on screen: F1–F12, Ctrl/Alt chords, Insert, Home, End, PgUp/PgDn, Flash Fill. Ctrl+Shift+F1 shows/hides it.", hi: "Screen par saari keys: F1–F12, Ctrl/Alt, Insert, Home, End, PgUp/PgDn, Flash Fill. Ctrl+Shift+F1 se chhupta/dikhta hai." },
  { name: "Grade my practice sheet", group: "Grid", status: "full", en: "Check answers compares each target cell with the expected value and shows the model formula.", hi: "Check answers har cell ko expected value se milata hai aur model formula dikhata hai." },

  // --------------------------------------------------------------- files
  { name: ".xlsx import & export", group: "Files", status: "full", en: "Real OOXML: formulas travel as text, so desktop Excel, Excel mobile and Google Sheets recalculate them.", hi: "Asli OOXML: formulas text ke roop mein jaate hain, desktop Excel / mobile / Sheets unhe recalculate karte hain." },
  { name: "CSV import / export", group: "Files", status: "full", en: "For systems that only accept CSV.", hi: "Jahan sirf CSV chalta hai, un systems ke liye." },
  { name: "Print / PDF", group: "Files", status: "full", en: "Print any practice sheet or the certificate.", hi: "Practice sheet ya certificate print karo." },
  { name: "Autosave per student", group: "Files", status: "full", en: "Every workbook is stored on your own account (localStorage offline), never behind a paywall.", hi: "Har workbook aapke account mein save hota hai (offline localStorage), koi paywall nahi." },

  // ------------------------------------------------------- browser limits
  { name: "PivotTables", group: "Analytics", status: "browser-limit", en: "Pivot-style summaries are built with SUMIFS/COUNTIFS + the Charts dashboard. A draggable pivot canvas is on the roadmap.", hi: "Pivot jaisa summary SUMIFS/COUNTIFS aur Charts dashboard se banta hai. Draggable pivot canvas roadmap par hai." },
  { name: "Power Query / Get & Transform", group: "Analytics", status: "browser-limit", en: "Cleaning is done with formulas (TRIM, CLEAN, TEXTSPLIT, Flash Fill). The full M engine needs Excel.", hi: "Cleaning formulas se hoti hai (TRIM, CLEAN, TEXTSPLIT, Flash Fill). Poora M engine Excel mein chalta hai." },
  { name: "VBA macros", group: "Automation", status: "excel-only", en: "A browser cannot run VBA. The VBA vault gives you ready code with line-by-line Hindi notes, plus AI prompts to generate more.", hi: "Browser VBA nahi chala sakta. VBA vault mein taiyaar code + Hindi explanation hai, AI prompt se naya code bhi." },
  { name: "WEBSERVICE / RTD / STOCKHISTORY / IMAGE", group: "Formulas", status: "excel-only", en: "These need a COM server or an authenticated connection. They exist in the list, and the cell says why it cannot fetch.", hi: "Inhe COM server ya login chahiye. List mein hain, aur cell batata hai kyun fetch nahi hua." },
  { name: "Real-time co-authoring", group: "Collaboration", status: "excel-only", en: "Each student's workbook is private. Sharing a sheet is done by downloading the .xlsx.", hi: "Har student ka workbook private hai. Share karne ke liye .xlsx download karo." },
  { name: "Excel desktop itself", group: "Excel", status: "excel-only", en: "For 100% parity use the Download .xlsx button — the file opens in real Excel with every formula intact.", hi: "100% parity ke liye Download .xlsx dabao — file asli Excel mein sab formulas ke saath khulti hai." },
];

export const FREE_GROUPS = [...new Set(FREE_FEATURES.map((feature) => feature.group))];

export const STATUS_STYLE: Record<FreeStatus, { label: string; tone: "good" | "info" | "warn" }> = {
  full: { label: "Free here", tone: "good" },
  "browser-limit": { label: "Free, formula route", tone: "info" },
  "excel-only": { label: "Needs your Excel file", tone: "warn" },
};
