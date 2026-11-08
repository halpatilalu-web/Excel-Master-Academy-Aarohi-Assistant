/**
 * Dev generator — builds `src/data/formulaPractice.ts`.
 *
 * For every unique catalogue formula it plugs the example into each seeded
 * dataset, keeps the first dataset on which the example returns a real value,
 * and writes that value down as `expected`. The output is therefore *computed*
 * by the same engine the browser runs — no hand-typed answers.
 *
 * Run: `npx tsx scripts/gen-formula-practice.ts`
 */
import { writeFileSync } from "node:fs";
import { FORMULA_CATALOG, CATALOG_CATS, type CatalogCat, type CatalogEntry } from "../src/data/formulaCatalog";
import { ANSWER_CELL, FORMULA_DATASETS } from "../src/data/formulaDatasets";
import { Workbook } from "../src/lib/excel/formula/engine";
import { displayValue } from "../src/lib/excel/useWorkbook";

interface Row {
  name: string;
  cat: CatalogCat;
  en: string;
  hi: string;
  syntax: string;
  formula: string;
  dataset: string;
  expected: string;
  /** "value" = a real answer, "error" = a documented Excel error (NA, WEBSERVICE…). */
  kind: "value" | "error";
}

/** Errors a formula is *supposed* to return — Excel does the same. */
const EXPECTED_ERRORS = new Set(["#N/A", "#BLOCKED!"]);
/** Per-formula errors that are the correct answer, not an engine gap. */
const EXPECTED_ERROR_BY_NAME: Record<string, string> = {
  GETPIVOTDATA: "#REF!", // no PivotTable exists in the lab, so Excel's answer is #REF!
  RTD: "#N/A", // no real-time data server is registered, exactly like Excel without the add-in
};

/** Overrides where the catalogue example needs a workbook that does not exist. */
const FIXUPS: Record<string, { formula?: string; dataset?: string }> = {
  INDIRECT: { formula: '=INDIRECT("A1")' },
  HLOOKUP: { formula: "=HLOOKUP(1002,A1:F4,2,FALSE)", dataset: "horizontal" },
  VLOOKUP: { formula: "=VLOOKUP(1005,A1:F50,5,FALSE)", dataset: "lookup" },
  XLOOKUP: { formula: "=XLOOKUP(1005,A1:A50,E1:E50)", dataset: "lookup" },
  INDEX: { formula: "=INDEX(A1:F50,5,1)", dataset: "numeric" },
  MATCH: { formula: "=MATCH(38,A1:A50,0)", dataset: "numeric" },
  MODE_SNGL: { formula: "=MODE.SNGL(A1:A20,7,7,7)" },
  "MODE.SNGL": { formula: "=MODE.SNGL(A1:A20,7,7,7)" },
  DGET: { formula: '=DGET(A1:D50,"ID",G1:G2)', dataset: "database" },
  DSUM: { formula: '=DSUM(A1:D50,"Sales",E1:E2)', dataset: "database" },
  DAVERAGE: { formula: '=DAVERAGE(A1:D50,"Sales",E1:E2)', dataset: "database" },
  DCOUNT: { formula: '=DCOUNT(A1:D50,"Sales",E1:E2)', dataset: "database" },
  DCOUNTA: { formula: '=DCOUNTA(A1:D50,"Sales",E1:E2)', dataset: "database" },
  DMAX: { formula: '=DMAX(A1:D50,"Sales",E1:E2)', dataset: "database" },
  DMIN: { formula: '=DMIN(A1:D50,"Sales",E1:E2)', dataset: "database" },
  DPRODUCT: { formula: '=DPRODUCT(A1:D50,"Qty",F1:F2)', dataset: "database" },
  DSTDEV: { formula: '=DSTDEV(A1:D50,"Sales",E1:E2)', dataset: "database" },
  DSTDEVP: { formula: '=DSTDEVP(A1:D50,"Sales",E1:E2)', dataset: "database" },
  DVAR: { formula: '=DVAR(A1:D50,"Sales",E1:E2)', dataset: "database" },
  DVARP: { formula: '=DVARP(A1:D50,"Sales",E1:E2)', dataset: "database" },
  /* Spilling functions: the drill asks for one deterministic number/text, so a
     saved answer is checkable (RANDARRAY's first cell would change every edit). */
  SEQUENCE: { formula: "=SUM(SEQUENCE(1,5,10,10))", dataset: "array" },
  RANDARRAY: { formula: "=COUNT(RANDARRAY(3,2,1,100,TRUE))", dataset: "array" },
  SORTBY: { formula: "=INDEX(SORTBY(A1:A10,B1:B10,-1),1)", dataset: "numeric" },
  /* Volatile functions: a bare =RAND() / =NOW() drill has a different answer on
     every edit, so the drill asks for something that IS stable (the count of
     random values, the hour of a fixed timestamp) — Excel computes it the same
     way, and the check can still fail honestly. */
  RAND: { formula: "=COUNT(RAND(),RAND(),RAND())", dataset: "numeric" },
  RANDBETWEEN: { formula: "=COUNT(RANDBETWEEN(1,100),RANDBETWEEN(1,100))", dataset: "numeric" },
  NOW: { formula: "=HOUR(NOW())>=0", dataset: "numeric" },
  TODAY: { formula: "=TODAY()>DATE(2020,1,1)", dataset: "numeric" },
  TEXT: { formula: '=TEXT(DATE(2026,11,6),"dd-mm-yyyy")', dataset: "numeric" },
  HOUR: { formula: '=HOUR("9:30:26 AM")', dataset: "numeric" },
  MINUTE: { formula: '=MINUTE("9:30:26 AM")', dataset: "numeric" },
  SECOND: { formula: '=SECOND("9:30:26 AM")', dataset: "numeric" },
  TIMEVALUE: { formula: '=TIMEVALUE("9:30 AM")', dataset: "numeric" },
  TEXTSPLIT: { formula: '=INDEX(TEXTSPLIT("Ravi-Sharma-Pune","-"),3)', dataset: "array" },
  FORMULATEXT: { dataset: "formula-cell" },
  AVERAGEIF: { formula: "=AVERAGEIF(A1:A20,\">40\")", dataset: "numeric" },
  AVERAGEIFS: { formula: "=AVERAGEIFS(A1:A20,B1:B20,\">40\")", dataset: "numeric" },
  /* --- criteria functions: the criterion must exist in the seeded column --- */
  SUMIF: { formula: '=SUMIF($E$1:$E$60,"Delhi",$B$1:$B$60)', dataset: "numeric" },
  SUMIFS: { formula: '=SUMIFS($B$1:$B$60,$E$1:$E$60,"Delhi",$A$1:$A$60,">40")', dataset: "numeric" },
  COUNTIF: { formula: '=COUNTIF($E$1:$E$60,"Delhi")', dataset: "numeric" },
  COUNTIFS: { formula: '=COUNTIFS($E$1:$E$60,"Delhi",$A$1:$A$60,">40")', dataset: "numeric" },
  MAXIFS: { formula: '=MAXIFS($B$1:$B$60,$E$1:$E$60,"Delhi")', dataset: "numeric" },
  MINIFS: { formula: '=MINIFS($B$1:$B$60,$E$1:$E$60,"Delhi")', dataset: "numeric" },
  COUNTBLANK: { formula: "=COUNTBLANK(H2:H11)", dataset: "numeric" },
  /* --- lookups against a real table --- */
  LOOKUP: { formula: "=LOOKUP(1020,A1:A50,E1:E50)", dataset: "lookup" },
  /* --- spilled arrays: ask for one deterministic cell --- */
  EXPAND: { formula: "=INDEX(EXPAND(A1:B3,4,3,0),4,3)", dataset: "array" },
  WRAPROWS: { formula: "=INDEX(WRAPROWS(A1:A12,4),2,2)", dataset: "array" },
  WRAPCOLS: { formula: "=INDEX(WRAPCOLS(A1:A12,4),2,2)", dataset: "array" },
  FORMULATEXT: { formula: "=FORMULATEXT(D1)", dataset: "formula-cell" },
  TREND: { formula: "=INDEX(TREND(B2:B20,A2:A20),5)", dataset: "numeric" },
  /* --- correlation needs data that is NOT a perfect straight line --- */
  CORREL: { formula: "=ROUND(CORREL(A1:A40,B1:B40),4)", dataset: "repeated" },
  PEARSON: { formula: "=ROUND(PEARSON(A1:A40,B1:B40),4)", dataset: "repeated" },
  RSQ: { formula: "=ROUND(RSQ(A1:A40,B1:B40),4)", dataset: "repeated" },
  SLOPE: { formula: "=ROUND(SLOPE(A1:A40,B1:B40),4)", dataset: "repeated" },
  INTERCEPT: { formula: "=ROUND(INTERCEPT(A1:A40,B1:B40),4)", dataset: "repeated" },
  COVARIANCE_P: { formula: "=ROUND(COVARIANCE.P(A1:A40,B1:B40),4)", dataset: "repeated" },
  COVARIANCE_S: { formula: "=ROUND(COVARIANCE.S(A1:A40,B1:B40),4)", dataset: "repeated" },
  /* --- info functions should inspect the cell their answer is about --- */
  ISBLANK: { formula: "=ISBLANK(H2)", dataset: "numeric" },
  ISNUMBER: { formula: "=ISNUMBER(A1)", dataset: "numeric" },
  ISTEXT: { formula: "=ISTEXT(E1)", dataset: "numeric" },
  ISFORMULA: { formula: "=ISFORMULA(D1)", dataset: "formula-cell" },
  ISLOGICAL: { formula: "=ISLOGICAL(TRUE)", dataset: "numeric" },
  ISEVEN: { formula: "=ISEVEN(A1)", dataset: "numeric" },
  ISODD: { formula: "=ISODD(B1)", dataset: "numeric" },
  ISNONTEXT: { formula: "=ISNONTEXT(A1)", dataset: "numeric" },
  ISREF: { formula: "=ISREF(A1)", dataset: "numeric" },
  ISERROR: { formula: "=ISERROR(NA())", dataset: "numeric" },
  ISERR: { formula: "=ISERR(NA())", dataset: "numeric" },
  ISNA: { formula: "=ISNA(NA())", dataset: "numeric" },
  "ERROR.TYPE": { formula: "=ERROR.TYPE(NA())", dataset: "numeric" },
  AND: { formula: "=AND(A1>5,B1>5)", dataset: "numeric" },
  OR: { formula: "=OR(A1>100,B1>5)", dataset: "numeric" },
  /* --- text drills on the cell whose content the task names --- */
  LEFT: { formula: "=LEFT(A2,3)", dataset: "numeric" },
  RIGHT: { formula: "=RIGHT(A2,6)", dataset: "numeric" },
  MID: { formula: "=MID(A2,2,3)", dataset: "numeric" },
  LEN: { formula: "=LEN(A2)", dataset: "numeric" },
  TRIM: { formula: "=TRIM(C2)", dataset: "text" },
  CLEAN: { formula: "=CLEAN(C2)", dataset: "text" },
  UPPER: { formula: "=UPPER(B2)", dataset: "text" },
  LOWER: { formula: "=LOWER(B2)", dataset: "text" },
  PROPER: { formula: "=PROPER(B2)", dataset: "text" },
  SUBSTITUTE: { formula: '=SUBSTITUTE(B2,", "," ")', dataset: "text" },
  REPLACE: { formula: '=REPLACE(A1,1,5,"AARAV")', dataset: "text" },
  EXACT: { formula: "=EXACT(A1,UPPER(A1))", dataset: "text" },
  FIND: { formula: '=FIND("@",A2)', dataset: "text" },
  SEARCH: { formula: '=SEARCH("WORK",A2)', dataset: "text" },
  /* --- volatility: show the *count* of random numbers, not a random number --- */
  RANDARRAY: { formula: "=COUNT(RANDARRAY(3,4,1,100,TRUE))", dataset: "array" },
  /* --- dates: pin the day-of-month functions to a fixed date --- */
  DAY: { formula: "=DAY(DATE(2026,8,15))", dataset: "numeric" },
  MONTH: { formula: "=MONTH(DATE(2026,8,15))", dataset: "numeric" },
  YEAR: { formula: "=YEAR(DATE(2026,8,15))", dataset: "numeric" },
  WEEKNUM: { formula: "=WEEKNUM(DATE(2026,8,15))", dataset: "numeric" },
  ISOWEEKNUM: { formula: "=ISOWEEKNUM(DATE(2026,8,15))", dataset: "numeric" },
  DAYS: { formula: "=DAYS(DATE(2026,12,31),DATE(2026,1,1))", dataset: "numeric" },
  DATEDIF: { formula: '=DATEDIF(DATE(2024,1,15),DATE(2026,8,15),"Y")', dataset: "numeric" },
  EDATE: { formula: "=EDATE(DATE(2026,1,31),1)", dataset: "numeric" },
  EOMONTH: { formula: "=EOMONTH(DATE(2026,2,10),0)", dataset: "numeric" },
  WEEKDAY: { formula: "=WEEKDAY(DATE(2026,8,15),2)", dataset: "numeric" },
  YEARFRAC: { formula: "=ROUND(YEARFRAC(DATE(2026,1,1),DATE(2026,7,1),1),4)", dataset: "numeric" },
  DAYS360: { formula: "=DAYS360(DATE(2026,1,1),DATE(2026,7,1))", dataset: "numeric" },
    NETWORKDAYS: { formula: "=NETWORKDAYS(DATE(2026,1,1),DATE(2026,1,31))", dataset: "numeric" },
  "NETWORKDAYS.INTL": { formula: "=NETWORKDAYS.INTL(DATE(2026,1,1),DATE(2026,1,31),7)", dataset: "numeric" },
  WORKDAY: { formula: "=WORKDAY(DATE(2026,1,1),10)", dataset: "numeric" },
  "WORKDAY.INTL": { formula: "=WORKDAY.INTL(DATE(2026,1,1),10,7)", dataset: "numeric" },
  RTD: { formula: '=RTD("MyAddin.ProgId",,"price")', dataset: "web" },
  /* Cash flows live in B (dates in A) on the “cashflow” sheet. */
  IRR: { formula: "=IRR(B1:B12)", dataset: "cashflow" },
  MIRR: { formula: "=MIRR(B1:B12,8%,10%)", dataset: "cashflow" },
  XIRR: { formula: "=XIRR(B1:B12,A1:A12)", dataset: "cashflow" },
  XNPV: { formula: "=XNPV(10%,B1:B12,A1:A12)", dataset: "cashflow" },
  NPV: { formula: "=NPV(10%,B2:B12)+B1", dataset: "cashflow" },
};

/** Aliases in the catalogue (MODE_SNGL vs MODE.SNGL) must share one override. */
const aliasOf = (name: string) => name.replace(/_/g, ".");

function fixFor(name: string) {
  return FIXUPS[name] ?? FIXUPS[aliasOf(name)] ?? {};
}

/** The one canonical entry per name (first occurrence wins). */
const unique: CatalogEntry[] = [];
const seen = new Set<string>();
for (const entry of FORMULA_CATALOG) {
  if (seen.has(entry.name)) continue;
  seen.add(entry.name);
  unique.push(entry);
}

const rows: Row[] = [];
const failures: { name: string; example: string; errors: string[] }[] = [];

for (const entry of unique) {
  const fix = fixFor(entry.name);
  const formula = fix.formula ?? entry.example;
  const order = fix.dataset
    ? [fix.dataset, ...FORMULA_DATASETS.map((set) => set.id).filter((id) => id !== fix.dataset)]
    : FORMULA_DATASETS.map((set) => set.id);

  let solved: Row | null = null;
  const errors: string[] = [];
  for (const id of order) {
    const dataset = FORMULA_DATASETS.find((set) => set.id === id)!;
    const cells = { ...dataset.cells, [ANSWER_CELL]: formula };
    const book = new Workbook({ sheets: [{ name: "Practice", cells }] });
    const value = book.value("Practice", 0, 7);
    const text = displayValue(value);
    if (text === "") continue;
    const isError = typeof value === "object" && value !== null && "err" in value;
    const allowed = EXPECTED_ERROR_BY_NAME[entry.name];
    if (isError && text !== allowed && !EXPECTED_ERRORS.has(text)) {
      errors.push(`${id}:${text}`);
      continue;
    }
    solved = {
      name: entry.name,
      cat: entry.cat,
      en: entry.en,
      hi: entry.hi,
      syntax: entry.syntax,
      formula,
      dataset: id,
      expected: text,
      kind: isError ? "error" : "value",
    };
    break;
  }
  if (solved) rows.push(solved);
  else failures.push({ name: entry.name, example: formula, errors });
}

/* ------------------------------- wording ------------------------------- */

/**
 * Wording per function where the engine's answer alone reads badly:
 * "ISNA se number ki ummeed mat karo" is not a task a student can do — but
 * "check whether the cell holds #N/A" is.
 */
const GOALS: Record<string, { hi: string; en: string; watchHi: string; watchEn: string }> = {
  ISBLANK: { hi: "Khaali cell check karna", en: "check whether a cell is empty", watchHi: "H2 khaali hai — isliye jawab TRUE aata hai; H2 mein kuch likh do to FALSE ho jaayega.", watchEn: "H2 is empty, so the answer is TRUE; type anything into H2 and it flips to FALSE." },
  ISNUMBER: { hi: "Number hai ya nahi, yeh check karna", en: "test whether a value is a number", watchHi: "Numbers aur text ko aankh se na dekho — ISNUMBER hi sach batata hai.", watchEn: "Never eyeball a column for numbers; ISNUMBER is the honest test." },
  ISTEXT: { hi: "Text hai ya nahi, yeh check karna", en: "test whether a value is text", watchHi: "E1 mein city ka naam hai, isliye TRUE; A1 number hota to FALSE aata.", watchEn: "E1 holds a city name so the answer is TRUE; a number would give FALSE." },
  ISERROR: { hi: "Koi bhi error check karna", en: "catch any error value", watchHi: "ISERROR har error pakadta hai (#N/A, #VALUE!, #DIV/0!) — ISERR sirf #N/A chhodkar.", watchEn: "ISERROR catches every error (#N/A, #VALUE!, #DIV/0!); ISERR leaves #N/A out on purpose." },
  ISERR: { hi: "Error check karna, #N/A ko chhodkar", en: "catch errors except #N/A", watchHi: "Yahan jawab FALSE hai — kyunki #N/A ISERR ki nazar mein error nahi hai. Yahi ISERR aur ISERROR ka farak hai.", watchEn: "The answer is FALSE because #N/A is not an error for ISERR — that is the whole difference from ISERROR." },
  ISNA: { hi: "Sirf #N/A check karna", en: "test specifically for #N/A", watchHi: "ISNA sirf #N/A pakadta hai; #DIV/0! par FALSE deta hai.", watchEn: "ISNA only matches #N/A; a #DIV/0! would be FALSE." },
  ISLOGICAL: { hi: "TRUE/FALSE check karna", en: "test for a TRUE/FALSE value", watchHi: "TRUE() ek logical value hai, isliye jawab TRUE; 1 number hota to FALSE.", watchEn: "TRUE() is a logical value, so the answer is TRUE; the number 1 would be FALSE." },
  ISEVEN: { hi: "Even (sam) number check karna", en: "test whether a number is even", watchHi: "ISEVEN number se poochta hai, text se nahi — A1 mein number hone se hi jawab milta hai.", watchEn: "ISEVEN asks about a number, not text — it only works because A1 holds a number." },
  ISODD: { hi: "Odd (visham) number check karna", en: "test whether a number is odd", watchHi: "Ek hi row mein ISEVEN TRUE aur ISODD TRUE dono nahi aa sakte.", watchEn: "ISEVEN and ISODD can never both be TRUE for the same value." },
  ISFORMULA: { hi: "Cell ke andar formula hai ya nahi, yeh dekhna", en: "check whether a cell contains a formula", watchHi: "D1 mein pehle se =SUM(A1:A10) hai, isliye TRUE. A1 mein number hai, uspar FALSE aata.", watchEn: "D1 already holds =SUM(A1:A10), so TRUE; the same check on A1 would say FALSE." },
  ISREF: { hi: "Reference valid hai ya nahi, yeh dekhna", en: "test whether a value is a valid reference", watchHi: "ISREF ko reference chahiye — number ya text dene par FALSE aata hai.", watchEn: "ISREF wants a reference; hand it a number or text and it says FALSE." },
  ISNONTEXT: { hi: "Text ke alawa kuch hai ya nahi, yeh dekhna", en: "test that a value is not text", watchHi: "ISNONTEXT, ISTEXT ka ulta hai — ek TRUE to doosra FALSE.", watchEn: "ISNONTEXT is the opposite of ISTEXT — if one is TRUE the other is FALSE." },
  N: { hi: "Value ko number mein badalna", en: "convert a value to a number", watchHi: "N(TRUE) = 1 aur N(FALSE) = 0; text par N 0 deta hai, error nahi.", watchEn: "N(TRUE) is 1 and N(FALSE) is 0; N of text is 0, not an error." },
  NA: { hi: "#N/A error banana", en: "produce an #N/A error", watchHi: "Yeh #N/A jaan-boojhkar deta hai — chart/table mein 'data nahi hai' dikhane ka tarika.", watchEn: "It returns #N/A on purpose — it is how you say 'no data' in a chart or lookup." },
  TYPE: { hi: "Value ka type number pata karna", en: "read a value's type number", watchHi: "1 = number, 2 = text, 4 = logical, 16 = error. A2 number hai isliye 1.", watchEn: "1 = number, 2 = text, 4 = logical, 16 = error. A2 is a number, so 1." },
  "ERROR.TYPE": { hi: "Error ka code number pata karna", en: "look up an error's code number", watchHi: "#N/A ka code 7 hai; #DIV/0! ka 2, #VALUE! ka 3. Error na ho to #N/A.", watchEn: "#N/A is code 7, #DIV/0! is 2, #VALUE! is 3; with no error at all it returns #N/A." },
  CELL: { hi: "Cell ki jankari (address) nikalna", en: "read a cell's address", watchHi: 'CELL("address") dollar ke saath $A$1 deta hai — yeh reference hai, text nahi.', watchEn: 'CELL("address") gives $A$1 with dollar signs — it is a reference, not plain text.' },
  INFO: { hi: "Workbook ki jankari nikalna", en: "read workbook information", watchHi: "INFO ke numfile mode se khuli hui files ginti hain — is lab mein woh 1 hai.", watchEn: "INFO with numfile counts the open workbooks — in this lab that is 1." },
  SHEET: { hi: "Is sheet ka number pata karna", en: "find the current sheet number", watchHi: "Pehli sheet ka number 1 hota hai, naam nahi.", watchEn: "The first sheet is number 1 — it returns the index, not the name." },
  SHEETS: { hi: "Workbook mein kitni sheets hain, yeh ginti", en: "count the sheets in the workbook", watchHi: "Practice sheet akeli hai, isliye 1 — nayi sheet add karo to 2 ho jaayega.", watchEn: "The Practice sheet is alone, so 1; add a sheet and it becomes 2." },
  XOR: { hi: "XOR se sirf ek condition TRUE hona chahiye", en: "check that exactly one condition is TRUE", watchHi: "Yahan dono conditions TRUE hain, isliye XOR FALSE deta hai — XOR 'sirf ek' par zid karta hai.", watchEn: "Both conditions are TRUE here, so XOR says FALSE — XOR insists on exactly one." },
  FALSE: { hi: "FALSE value likhna", en: "write the logical value FALSE", watchHi: "FALSE() ek value hai, text nahi — ISLOGICAL ispar TRUE deta hai.", watchEn: 'FALSE() is a real logical value, not the text "FALSE" — ISLOGICAL says TRUE.' },
  EXACT: { hi: "Do text bilkul same hain ya nahi, case samet", en: "compare two strings including upper/lower case", watchHi: "EXACT case-sensitive hai — UPPER(A1) A1 se alag hai, isliye FALSE. A1=A1 (bina EXACT) TRUE deta.", watchEn: "EXACT is case-sensitive, so UPPER(A1) differs from A1 and the answer is FALSE; plain A1=A1 would be TRUE." },
  FORMULATEXT: { hi: "Kisi cell ka formula padhna", en: "read another cell's formula as text", watchHi: "D1 ke andar =SUM(A1:A10) likha hai; FORMULATEXT wahi text lauta deta hai, uska jawab nahi.", watchEn: "D1 contains =SUM(A1:A10); FORMULATEXT returns that text, not its result." },
  EXPAND: { hi: "Array ko bada karna (khaali jagah bhar kar)", en: "pad an array out to a bigger size", watchHi: "Jo cell data se bahar hai wahi pad value dikhati hai — is drill mein woh 0 hai.", watchEn: "The padded cell outside the original data shows the pad value — 0 in this drill." },
  WRAPROWS: { hi: "Ek column ko chaudi rows mein lapetna", en: "wrap a single column into wider rows", watchHi: "Wrap karne ke baad row/column number badal jaate hain — INDEX se ek cell pakdo.", watchEn: "Wrapping changes the row/column numbering — use INDEX to pin down one cell." },
  WRAPCOLS: { hi: "Ek column ko multi-column grid mein lapetna", en: "wrap a single column into a grid of columns", watchHi: "WRAPCOLS column bhar-bhar ke neeche jaata hai, WRAPROWS row bhar-bhar ke.", watchEn: "WRAPCOLS fills down each column; WRAPROWS fills across each row." },
  RAND: { hi: "Random number banana (0 se 1 ke beech)", en: "produce a random number between 0 and 1", watchHi: "RAND har edit par badalta hai — isliye humne COUNT(RAND(),RAND(),RAND()) poocha, jawab pakka 3 aata hai.", watchEn: "RAND changes on every edit, so the drill counts three of them — the answer is a steady 3." },
  RANDBETWEEN: { hi: "Do numbers ke beech random number lena", en: "pick a random whole number in a range", watchHi: "RANDBETWEEN bhi har edit par badalta hai; COUNT use karne se jawab 2 pakka rehta hai.", watchEn: "RANDBETWEEN changes on every edit too; counting two calls keeps the answer at 2." },
  RANDARRAY: { hi: "Random numbers ka array banana", en: "build an array of random numbers", watchHi: "Array badalta rehta hai — COUNT se poocha to 3×4 = 12 cells ka jawab 12 aata hai.", watchEn: "The array keeps changing; counting it gives 3×4 = 12 cells." },
  NOW: { hi: "Abhi ka date-time lena", en: "read the current date and time", watchHi: "NOW() har second badalta hai — isliye jawab ko condition mein daala hai, seedha number nahi.", watchEn: "NOW() changes every second, so the drill tests it with a condition instead of printing it." },
  TODAY: { hi: "Aaj ki date lena", en: "read today's date", watchHi: "TODAY() ko date ki tarah format karo, warna serial number dikhega.", watchEn: "Format TODAY() as a date, otherwise you see a serial number." },
};

const KIND_HI: Record<string, string> = {
  "Math & Trig": "ganit ka formula",
  Statistical: "statistics ka formula",
  Logical: "condition wala formula",
  Text: "text saaf karne / todne ka formula",
  "Date & Time": "date aur time ka formula",
  "Lookup & Reference": "table se value dhoondhne ka formula",
  Financial: "paisa / loan ka formula",
  Information: "cell ki jankari nikaalne ka formula",
  Engineering: "engineering (number base) ka formula",
  Database: "list + criteria se hisaab ka formula",
  "Dynamic Array": "array (multi-cell) formula",
  Web: "internet se data laane wala formula",
};

const KIND_EN: Record<string, string> = {
  "Math & Trig": "a maths function",
  Statistical: "a statistics function",
  Logical: "a logical test",
  Text: "a text function",
  "Date & Time": "a date/time function",
  "Lookup & Reference": "a lookup function",
  Financial: "a finance function",
  Information: "an information function",
  Engineering: "an engineering function",
  Database: "a database function",
  "Dynamic Array": "a dynamic-array function",
  Web: "a web function",
};

function goalHi(row: Row, label: string, tell: string): string {
  const custom = GOALS[row.name];
  const what = custom ? `Kaam: ${custom.hi}.` : `${row.name} ${KIND_HI[row.cat]} hai.`;
  if (row.kind === "error") {
    return `${what} Sheet “${label}” kholo (${tell}) aur ${ANSWER_CELL} mein ${row.formula} likho. Is formula ka jawab Excel mein bhi ${row.expected} hi aata hai — galti nahi hai, isi kaam ke liye bana hai.`;
  }
  return `${what} Sheet “${label}” kholo (${tell}) aur ${ANSWER_CELL} mein ${row.formula} likho — jawab ${row.expected} aana chahiye.`;
}

function goalEn(row: Row, label: string, tell: string): string {
  const custom = GOALS[row.name];
  const what = custom ? `Your job: ${custom.en}.` : `${row.name} is ${KIND_EN[row.cat]}.`;
  if (row.kind === "error") {
    return `${what} Open the “${label}” sheet (${tell}) and type ${row.formula} in ${ANSWER_CELL}. Excel also answers ${row.expected} here — that is the function's job, not a mistake.`;
  }
  return `${what} Open the “${label}” sheet (${tell}) and type ${row.formula} in ${ANSWER_CELL}; the answer should be ${row.expected}.`;
}

function watchHi(row: Row): string {
  const custom = GOALS[row.name];
  if (custom) return custom.watchHi;
  if (row.kind === "error") return `${row.name} se number ki ummeed mat karo — ${row.expected} iska sahi jawab hai.`;
  return `Formula ${ANSWER_CELL} mein hi likhna hai. Sheet ka data delete mat karo — ${row.name} usi data par kaam karta hai.`;
}

function watchEn(row: Row): string {
  const custom = GOALS[row.name];
  if (custom) return custom.watchEn;
  if (row.kind === "error") return `Expect ${row.expected} from ${row.name} — that is correct Excel behaviour.`;
  return `Type the formula in ${ANSWER_CELL} and keep the seeded data as it is.`;
}

/* ------------------------------- emit ------------------------------- */

const byCat = new Map<CatalogCat, Row[]>();
CATALOG_CATS.forEach((cat) => byCat.set(cat, []));
rows.forEach((row) => byCat.get(row.cat)!.push(row));

const entryLines = rows
  .map((row) => {
    const dataset = FORMULA_DATASETS.find((set) => set.id === row.dataset)!;
    return `  {
    name: ${JSON.stringify(row.name)},
    cat: ${JSON.stringify(row.cat)},
    syntax: ${JSON.stringify(row.syntax)},
    formula: ${JSON.stringify(row.formula)},
    dataset: ${JSON.stringify(row.dataset)},
    expected: ${JSON.stringify(row.expected)},
    kind: ${JSON.stringify(row.kind)},
    goalHi: ${JSON.stringify(goalHi(row, dataset.label, dataset.tell))},
    goalEn: ${JSON.stringify(goalEn(row, dataset.label, dataset.tell))},
    watchOutHi: ${JSON.stringify(watchHi(row))},
    watchOutEn: ${JSON.stringify(watchEn(row))},
    hintHi: ${JSON.stringify(row.hi)},
    hintEn: ${JSON.stringify(row.en)},
  },`;
  })
  .join("\n");

const counts = [...byCat.entries()].map(([cat, list]) => `  ${JSON.stringify(cat)}: ${list.length},`).join("\n");

const file = `/**
 * @license MIT
 * GENERATED FILE — do not edit by hand.
 * Regenerate with \`npx tsx scripts/gen-formula-practice.ts\`.
 *
 * One practice drill for every worksheet function this app knows
 * (${rows.length} of ${unique.length} catalogue names). Each drill names the seeded
 * worksheet, the exact formula the student must type, and the answer the engine
 * actually returns — the answers are computed, never typed by hand.
 */
import { ANSWER_CELL, DATASET_BY_ID, FORMULA_DATASETS, type FormulaDataset } from "./formulaDatasets";
import type { CatalogCat } from "./formulaCatalog";

export type { FormulaDataset };
export { ANSWER_CELL, FORMULA_DATASETS };

/** Where the student's answer goes: always H1, clear of the seeded data. */
export const PRACTICE_ANSWER_CELL = ANSWER_CELL;

export interface FormulaDrill {
  /** Function name, e.g. "SUMIFS". */
  name: string;
  cat: CatalogCat;
  /** Official argument list. */
  syntax: string;
  /** The exact text to type into H1. */
  formula: string;
  /** Which seeded sheet the drill runs on. */
  dataset: string;
  /** Locale-independent string of the engine's answer. */
  expected: string;
  /** "error" means a documented Excel error is the right answer (#N/A etc.). */
  kind: "value" | "error";
  /** Hinglish task wording — what to do, where, and what should appear. */
  goalHi: string;
  goalEn: string;
  watchOutHi: string;
  watchOutEn: string;
  /** One-line purpose from the catalogue. */
  hintHi: string;
  hintEn: string;
}

export const FORMULA_DRILLS: FormulaDrill[] = [
${entryLines}
];

/** How many drills each Excel category has. */
export const DRILL_COUNTS: Record<CatalogCat, number> = {
${counts}
};

export const DRILL_BY_NAME: Record<string, FormulaDrill> = Object.fromEntries(
  FORMULA_DRILLS.map((drill) => [drill.name, drill]),
);

/** The drill's worksheet, ready to seed a grid. */
export function drillSheet(drill: FormulaDrill): FormulaDataset {
  return DATASET_BY_ID[drill.dataset] ?? FORMULA_DATASETS[0];
}
`;

writeFileSync("src/data/formulaPractice.ts", file);
console.log(`drills: ${rows.length}/${unique.length}  errors-expected: ${rows.filter((r) => r.kind === "error").length}`);
console.log("by category:", Object.fromEntries([...byCat.entries()].map(([c, l]) => [c, l.length])));
if (failures.length) {
  console.log(`\nUNSOLVED (${failures.length}):`);
  failures.forEach((f) => console.log(` - ${f.name.padEnd(16)} ${f.example}\n     ${f.errors.slice(0, 3).join("  ")}`));
}
