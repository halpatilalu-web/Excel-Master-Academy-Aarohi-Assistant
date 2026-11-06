import { useMemo, useState } from "react";
import { BookOpen, Layers, Search, Sparkles, Table2 } from "lucide-react";
import { ExcelGrid } from "../components/ExcelGrid";
import { Card, Pill, inputCls } from "../components/ui";
import { Bilingual } from "../lib/lang";
import { CATALOG_BY_NAME, CATALOG_CATS, CATALOG_NAMES, M365_COUNT, type CatalogCat } from "../data/formulaCatalog";
import { knownFunctions } from "../lib/excel/formula/engine";
import { PRACTICE_SHEETS } from "../components/LiveSpreadsheet";

interface Template {
  id: string;
  emoji: string;
  name: string;
  en: string;
  hi: string;
  sheets: { name: string; cells: Record<string, string> }[];
}

const EMPTY = (): Record<string, string> => ({});

const REGIONS = ["North", "West", "South", "East"];
const ITEMS = ["Laptop", "Mouse", "Monitor", "Keyboard", "Printer", "Desk"];

const TEMPLATES: Template[] = [
  {
    id: "blank",
    emoji: "📄",
    name: "Blank workbook",
    en: "An empty grid — start anything.",
    hi: "Khali grid — kuch bhi shuru karo.",
    sheets: [
      { name: "Sheet1", cells: EMPTY() },
      { name: "Sheet2", cells: EMPTY() },
    ],
  },
  {
    id: "sales-mis",
    emoji: "📈",
    name: "Sales MIS (50 rows)",
    en: "A monthly sales register with Region, Qty and Amount plus a summary block that already has SUMIFS/COUNTIF formulas.",
    hi: "Mahine ki sales register — Region, Qty, Amount aur SUMIFS/COUNTIF wala summary block.",
    sheets: [
      {
        name: "Sales",
        cells: buildSalesRegister(),
      },
    ],
  },
  {
    id: "emi",
    emoji: "🏦",
    name: "Loan / EMI schedule",
    en: "PMT, IPMT and PPMT for a 5-year loan — the fastest way to see how EMI splits into interest and principal.",
    hi: "5 saal ke loan ke liye PMT, IPMT aur PPMT — EMI ka byaaj aur mool kaise bat-ta hai.",
    sheets: [{ name: "EMI", cells: buildEmi() }],
  },
  {
    id: "gst-invoice",
    emoji: "🧾",
    name: "GST tax invoice",
    en: "CGST/SGST/IGST with ROUND, plus a formula-driven grand total.",
    hi: "CGST/SGST/IGST ROUND ke saath, aur formula se grand total.",
    sheets: [{ name: "Invoice", cells: buildGstInvoice() }],
  },
  {
    id: "attendance",
    emoji: "🗓️",
    name: "Attendance & salary",
    en: "COUNTIF/SUMIF for present days and salary, with TEXT for the pay period.",
    hi: "Present days aur salary ke liye COUNTIF/SUMIF, pay period ke liye TEXT.",
    sheets: [{ name: "Attendance", cells: buildAttendance() }],
  },
  {
    id: "dashboard",
    emoji: "📊",
    name: "KPI dashboard data",
    en: "Branch-wise figures feeding SUM/MAX/AVERAGE KPI cells.",
    hi: "Branch-wise figures jo SUM/MAX/AVERAGE KPI cells ko feed karte hain.",
    sheets: [{ name: "KPI", cells: buildKpi() }],
  },
];

export function Workbook() {
  const [templateId, setTemplateId] = useState("blank");
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<CatalogCat | "All">("All");
  const template = TEMPLATES.find((t) => t.id === templateId) ?? TEMPLATES[0];

  const hits = useMemo(() => {
    const q = query.trim().toLowerCase();
    return Object.values(CATALOG_BY_NAME)
      .filter((entry) => (cat === "All" ? true : entry.cat === cat))
      .filter((entry) => !q || `${entry.name} ${entry.en} ${entry.hi} ${entry.syntax}`.toLowerCase().includes(q));
  }, [query, cat]);

  const engineCount = knownFunctions().length;

  return (
    <div className="space-y-5">
      <Card className="!p-5 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display font-extrabold text-xl flex items-center gap-2">
              <Table2 size={20} /> Free Excel Workbook — every formula, no subscription
            </h1>
            <p className="text-sm text-(--color-muted) mt-1">
              Isi jagah practice karo: <b>{engineCount} functions</b> live calculate hote hain, .xlsx import/export
              chalta hai, aur jo formulas Office 365 mein paise leke milte hain (XLOOKUP, FILTER, LET, LAMBDA,
              TEXTSPLIT, PMT, XIRR, DSUM…) wo yahan <b>free</b> hain.
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Pill tone="good">✅ {engineCount} formulas</Pill>
            <Pill tone="good">✅ {M365_COUNT} Office-365-only</Pill>
            <Pill tone="good">✅ .xlsx import / export</Pill>
            <Pill tone="info">✅ Auto-saved to your account</Pill>
          </div>
        </div>
        <Bilingual
          compact
          en="This grid is a real spreadsheet: type =XLOOKUP(...) or =FILTER(...) and it calculates instantly. Download the .xlsx to continue in desktop Excel, Excel mobile or Google Sheets — the formulas travel with the file."
          hi="Yeh asli spreadsheet hai: =XLOOKUP(...) ya =FILTER(...) likho, turant calculate hoga. .xlsx download karke desktop Excel, Excel mobile ya Google Sheets mein aage kaam karo — formulas file ke saath jaate hain."
        />
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-wide text-(--color-muted) flex items-center gap-1">
          <Layers size={13} /> Start from
        </span>
        {TEMPLATES.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTemplateId(t.id)}
            title={t.hi}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
              t.id === templateId
                ? "bg-(--color-accent) text-white border-transparent"
                : "bg-(--color-surface) border-(--color-border) text-(--color-muted) hover:bg-(--color-accent-soft)"
            }`}
          >
            {t.emoji} {t.name}
          </button>
        ))}
      </div>

      <ExcelGrid
        key={template.id}
        template={`workbook-${template.id}`}
        title={template.name}
        sheets={template.sheets}
        rows={40}
        cols={12}
      />

      <Card className="!p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display font-extrabold text-base flex items-center gap-2">
            <BookOpen size={17} /> Function library — {CATALOG_NAMES.length} formulas with Hindi help
          </h2>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-(--color-muted)" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search XLOOKUP, EMI, GST, date…"
              className={`${inputCls} !pl-8 !py-2 !text-xs w-56`}
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(["All", ...CATALOG_CATS] as (CatalogCat | "All")[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setCat(option)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition ${
                cat === option
                  ? "bg-(--color-accent) text-white border-transparent"
                  : "border-(--color-border) text-(--color-muted) hover:bg-(--color-accent-soft)"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[28rem] overflow-auto pr-1">
          {hits.map((entry) => (
            <div
              key={`${entry.name}-${entry.cat}`}
              className="rounded-xl border border-(--color-border) bg-(--color-canvas) px-3 py-2"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs font-bold">{entry.name}</span>
                {entry.m365 && <Pill tone="info">365 free</Pill>}
              </div>
              <div className="text-[11px] mt-0.5">{entry.hi}</div>
              <div className="text-[10px] text-(--color-muted)">{entry.en}</div>
              <code className="block mt-1 text-[10px] font-mono text-(--color-accent-dark) break-all">
                {entry.example}
              </code>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-(--color-muted) flex items-center gap-1">
          <Sparkles size={12} /> Copy any example into a cell above and press Enter — it calculates immediately.
        </p>
      </Card>
    </div>
  );
}

/* --------------------------- template builders --------------------------- */

function buildSalesRegister(): Record<string, string> {
  const cells: Record<string, string> = {
    A1: "Date", B1: "Region", C1: "Item", D1: "Qty", E1: "Rate", F1: "Amount", G1: "Status",
  };
  for (let i = 0; i < 50; i++) {
    const row = i + 2;
    const qty = (i % 7) + 1;
    const rate = 500 + ((i * 137) % 4000);
    cells[`A${row}`] = `=DATE(2026,${(i % 12) + 1},${(i % 27) + 1})`;
    cells[`B${row}`] = REGIONS[i % REGIONS.length];
    cells[`C${row}`] = ITEMS[i % ITEMS.length];
    cells[`D${row}`] = String(qty);
    cells[`E${row}`] = String(rate);
    cells[`F${row}`] = `=D${row}*E${row}`;
    cells[`G${row}`] = i % 3 === 0 ? "Pending" : "Paid";
  }
  const last = 51;
  cells.I1 = "Region";
  cells.J1 = "Total Sales";
  cells.K1 = "Orders";
  cells.L1 = "Avg Order";
  REGIONS.forEach((region, index) => {
    const row = index + 2;
    cells[`I${row}`] = region;
    cells[`J${row}`] = `=SUMIF($B$2:$B$${last},I${row},$F$2:$F$${last})`;
    cells[`K${row}`] = `=COUNTIF($B$2:$B$${last},I${row})`;
    cells[`L${row}`] = `=IFERROR(J${row}/K${row},0)`;
  });
  cells.I7 = "Grand total";
  cells.J7 = `=SUM(F2:F${last})`;
  cells.I8 = "Pending orders";
  cells.J8 = '=COUNTIF(G2:G51,"Pending")';
  cells.I9 = "Highest bill";
  cells.J9 = `=MAX(F2:F${last})`;
  cells.I10 = "Top item";
  cells.J10 = `=INDEX(C2:C${last},MATCH(MAX(F2:F${last}),F2:F${last},0))`;
  return cells;
}

function buildEmi(): Record<string, string> {
  const cells: Record<string, string> = {
    A1: "Loan EMI Calculator", A3: "Loan amount", B3: "500000",
    A4: "Interest rate (annual)", B4: "9%",
    A5: "Years", B5: "5",
    A6: "Monthly rate", B6: "=B4/12",
    A7: "Total months", B7: "=B5*12",
    A8: "EMI (monthly)", B8: "=ROUND(-PMT(B6,B7,B3),2)",
    A9: "Total payment", B9: "=B8*B7",
    A10: "Total interest", B10: "=B9-B3",
    A12: "Month", B12: "EMI", C12: "Interest", D12: "Principal", E12: "Balance",
  };
  for (let m = 1; m <= 60; m++) {
    const row = 12 + m;
    cells[`A${row}`] = String(m);
    cells[`B${row}`] = "=$B$8";
    cells[`C${row}`] = `=ROUND(IPMT($B$6,A${row},$B$7,-$B$3),2)`;
    cells[`D${row}`] = `=ROUND(PPMT($B$6,A${row},$B$7,-$B$3),2)`;
    cells[`E${row}`] = `=MAX(0,ROUND($B$3-SUM($D$13:D${row}),2))`;
  }
  return cells;
}

function buildGstInvoice(): Record<string, string> {
  return {
    A1: "Tax Invoice", A2: "GSTIN", B2: "24ABCDE1234F1Z5",
    A3: "Invoice date", B3: "=TODAY()",
    A5: "Item", B5: "HSN", C5: "Qty", D5: "Rate", E5: "Amount", F5: "GST %",
    A6: "Laptop", B6: "8471", C6: "2", D6: "45000", E6: "=C6*D6", F6: "18%",
    A7: "Mouse", B7: "8471", C7: "5", D7: "600", E7: "=C7*D7", F7: "18%",
    A8: "Desk", B8: "9403", C8: "3", D8: "7200", E8: "=C8*D8", F8: "18%",
    A9: "Printer", B9: "8443", C9: "1", D9: "18500", E9: "=C9*D9", F9: "18%",
    E10: "=SUM(E6:E9)",
    D12: "Taxable value", E12: "=E10",
    D13: "CGST 9%", E13: "=ROUND(E12*9%,2)",
    D14: "SGST 9%", E14: "=ROUND(E12*9%,2)",
    D15: "Invoice total", E15: "=E12+E13+E14",
    D16: "Amount in words", E16: '=TEXT(E15,"#,##0")&" Rupees only"',
    A18: "Round-off total", B18: "=ROUND(E15,0)",
  };
}

function buildAttendance(): Record<string, string> {
  const names = ["Aarav", "Diya", "Rohan", "Isha", "Kabir", "Meera", "Vikram", "Anaya"];
  const cells: Record<string, string> = {
    A1: "Employee", B1: "Present days", C1: "Leave", D1: "Rate/day", E1: "Salary", F1: "Pay month",
  };
  names.forEach((name, index) => {
    const row = index + 2;
    cells[`A${row}`] = name;
    cells[`B${row}`] = String(18 + ((index * 3) % 8));
    cells[`C${row}`] = String((index * 2) % 4);
    cells[`D${row}`] = "850";
    cells[`E${row}`] = `=B${row}*D${row}`;
    cells[`F${row}`] = '=TEXT(DATE(2026,10,1),"mmm-yyyy")';
  });
  cells.A11 = "Total";
  cells.E11 = "=SUM(E2:E9)";
  cells.A12 = "Average salary";
  cells.E12 = "=ROUND(AVERAGE(E2:E9),0)";
  cells.A13 = "Highest paid";
  cells.E13 = "=INDEX(A2:A9,MATCH(MAX(E2:E9),E2:E9,0))";
  cells.A14 = "Total present days";
  cells.E14 = "=SUM(B2:B9)";
  cells.A15 = "Leave taken";
  cells.E15 = "=SUM(C2:C9)";
  return cells;
}

function buildKpi(): Record<string, string> {
  const branches = ["Ahmedabad", "Mumbai", "Delhi", "Pune", "Jaipur"];
  const cells: Record<string, string> = {
    A1: "Branch", B1: "Revenue", C1: "Cost", D1: "Profit", E1: "Margin %",
  };
  branches.forEach((branch, index) => {
    const row = index + 2;
    const revenue = 150000 + index * 45000;
    const cost = 95000 + index * 28000;
    cells[`A${row}`] = branch;
    cells[`B${row}`] = String(revenue);
    cells[`C${row}`] = String(cost);
    cells[`D${row}`] = `=B${row}-C${row}`;
    cells[`E${row}`] = `=IFERROR(D${row}/B${row},0)`;
  });
  cells.G1 = "KPI";
  cells.H1 = "Value";
  cells.G2 = "Total revenue";
  cells.H2 = "=SUM(B2:B6)";
  cells.G3 = "Total profit";
  cells.H3 = "=SUM(D2:D6)";
  cells.G4 = "Best branch";
  cells.H4 = "=INDEX(A2:A6,MATCH(MAX(D2:D6),D2:D6,0))";
  cells.G5 = "Average margin";
  cells.H5 = "=AVERAGE(E2:E6)";
  cells.G6 = "Branches above ₹1,50,000";
  cells.H6 = '=COUNTIF(B2:B6,">150000")';
  cells.G7 = "Profit share of top branch";
  cells.H7 = "=MAX(D2:D6)/SUM(D2:D6)";
  return cells;
}

export default Workbook;
