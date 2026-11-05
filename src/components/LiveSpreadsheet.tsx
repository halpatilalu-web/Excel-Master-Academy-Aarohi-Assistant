import { useMemo, useState } from "react";
import { CheckCircle2, Download, HelpCircle, RotateCcw, Sparkles } from "lucide-react";
import { Bilingual } from "../lib/lang";
import { Button, Card, Pill } from "./ui";

export type PracticeSheetId =
  | "sheet-marks"
  | "sheet-cleaning"
  | "sheet-validation"
  | "sheet-sumifs"
  | "sheet-lookup"
  | "sheet-dashboard"
  | "sheet-gst";

interface PracticeTask {
  id: PracticeSheetId;
  emoji: string;
  titleEn: string;
  titleHi: string;
  goalEn: string;
  goalHi: string;
  hintFormula: string;
  cols: string[]; // e.g. ["A","B","C","D","E","F"]
  initialGrid: Record<string, string>;
  dropdownCells?: Record<string, string[]>;
  checks: { cell: string; expected: string; formulaSample: string; label: string }[];
}

export const PRACTICE_SHEETS: PracticeTask[] = [
  {
    id: "sheet-marks",
    emoji: "📊",
    titleEn: "1. Student Marksheet (SUM, AVERAGE & IF)",
    titleHi: "1. Student Marksheet (Total, Average aur Pass/Fail)",
    goalEn: "Calculate Total in E2:E4 (=SUM(B2:D2)), Average in F2:F4 (=AVERAGE(B2:D2)), and Pass/Fail in G2:G4 (=IF(F2>=40,\"Pass\",\"Fail\")).",
    goalHi: "E2:E4 mein =SUM(B2:D2) se Total, F2:F4 mein =AVERAGE(B2:D2) se Average, aur G2:G4 mein =IF(F2>=40,\"Pass\",\"Fail\") likho!",
    hintFormula: '=SUM(B2:D2)  |  =AVERAGE(B2:D2)  |  =IF(F2>=40,"Pass","Fail")',
    cols: ["A", "B", "C", "D", "E", "F", "G"],
    initialGrid: {
      A1: "Student", B1: "Maths", C1: "Science", D1: "English", E1: "Total", F1: "Average", G1: "Result",
      A2: "Aarav", B2: "78", C2: "82", D2: "80", E2: "=SUM(B2:D2)", F2: "", G2: "",
      A3: "Diya", B3: "90", C3: "85", D3: "95", E3: "", F3: "", G3: "",
      A4: "Kabir", B4: "32", C4: "38", D4: "35", E4: "", F4: "", G4: "",
    },
    checks: [
      { cell: "E2", expected: "240", formulaSample: "=SUM(B2:D2)", label: "Aarav Total" },
      { cell: "F2", expected: "80", formulaSample: "=AVERAGE(B2:D2)", label: "Aarav Average" },
      { cell: "G2", expected: "Pass", formulaSample: '=IF(F2>=40,"Pass","Fail")', label: "Aarav Result" },
      { cell: "E3", expected: "270", formulaSample: "=SUM(B3:D3)", label: "Diya Total" },
      { cell: "F3", expected: "90", formulaSample: "=AVERAGE(B3:D3)", label: "Diya Average" },
      { cell: "G3", expected: "Pass", formulaSample: '=IF(F3>=40,"Pass","Fail")', label: "Diya Result" },
      { cell: "E4", expected: "105", formulaSample: "=SUM(B4:D4)", label: "Kabir Total" },
      { cell: "F4", expected: "35", formulaSample: "=AVERAGE(B4:D4)", label: "Kabir Average" },
      { cell: "G4", expected: "Fail", formulaSample: '=IF(F4>=40,"Pass","Fail")', label: "Kabir Result" },
    ],
  },
  {
    id: "sheet-cleaning",
    emoji: "🧹",
    titleEn: "2. Data Cleaning Lab (TRIM, PROPER & RIGHT)",
    titleHi: "2. Data Cleaning Practice (TRIM, PROPER aur Pin Code)",
    goalEn: "Clean messy names in C2:C4 using =PROPER(TRIM(A2)) and extract the 6-digit PIN code in D2:D4 using =RIGHT(B2,6).",
    goalHi: "C2:C4 mein =PROPER(TRIM(A2)) likh kar gande naam saaf karo aur D2:D4 mein =RIGHT(B2,6) se 6-digit PIN nikalo!",
    hintFormula: "=PROPER(TRIM(A2))   |   =RIGHT(B2,6)",
    cols: ["A", "B", "C", "D"],
    initialGrid: {
      A1: "Dirty Name", B1: "City-PIN", C1: "Clean Name", D1: "PIN Code",
      A2: "   ravi   sharma ", B2: "Ahmedabad-380001", C2: "=PROPER(TRIM(A2))", D2: "",
      A3: " NEHA   verma  ", B3: "Mumbai-400001", C3: "", D3: "",
      A4: "  ankit  PATEL ", B4: "Surat-395007", C4: "", D4: "",
    },
    checks: [
      { cell: "C2", expected: "Ravi Sharma", formulaSample: "=PROPER(TRIM(A2))", label: "Clean Name Row 2" },
      { cell: "D2", expected: "380001", formulaSample: "=RIGHT(B2,6)", label: "PIN Row 2" },
      { cell: "C3", expected: "Neha Verma", formulaSample: "=PROPER(TRIM(A3))", label: "Clean Name Row 3" },
      { cell: "D3", expected: "400001", formulaSample: "=RIGHT(B3,6)", label: "PIN Row 3" },
      { cell: "C4", expected: "Ankit Patel", formulaSample: "=PROPER(TRIM(A4))", label: "Clean Name Row 4" },
      { cell: "D4", expected: "395007", formulaSample: "=RIGHT(B4,6)", label: "PIN Row 4" },
    ],
  },
  {
    id: "sheet-validation",
    emoji: "🎨",
    titleEn: "3. Invoice Validation & Conditional Alert",
    titleHi: "3. Dropdown Validation aur Alert Formula",
    goalEn: "Compute Amount in D2:D4 (=B2*C2), pick Status from dropdown in E2:E4, and write Alert in F2:F4 (=IF(E2=\"Overdue\",\"Action!\",\"OK\")).",
    goalHi: "D2:D4 mein =B2*C2 likho, E column mein Dropdown chuno, aur F2:F4 mein =IF(E2=\"Overdue\",\"Action!\",\"OK\") lagao!",
    hintFormula: '=B2*C2   |   =IF(E2="Overdue","Action!","OK")',
    cols: ["A", "B", "C", "D", "E", "F"],
    initialGrid: {
      A1: "Item", B1: "Qty", C1: "Price", D1: "Amount", E1: "Status ▼", F1: "Alert",
      A2: "Monitor", B2: "3", C2: "12000", D2: "=B2*C2", E2: "Paid", F2: "",
      A3: "Printer", B3: "2", C3: "15000", D3: "", E3: "Overdue", F3: "",
      A4: "Keyboard", B4: "10", C4: "800", D4: "", E4: "Paid", F4: "",
    },
    dropdownCells: {
      E2: ["Paid", "Overdue", "Pending"],
      E3: ["Paid", "Overdue", "Pending"],
      E4: ["Paid", "Overdue", "Pending"],
    },
    checks: [
      { cell: "D2", expected: "36000", formulaSample: "=B2*C2", label: "Monitor Amount" },
      { cell: "D3", expected: "30000", formulaSample: "=B3*C3", label: "Printer Amount" },
      { cell: "D4", expected: "8000", formulaSample: "=B4*C4", label: "Keyboard Amount" },
      { cell: "F2", expected: "OK", formulaSample: '=IF(E2="Overdue","Action!","OK")', label: "Row 2 Alert" },
      { cell: "F3", expected: "Action!", formulaSample: '=IF(E3="Overdue","Action!","OK")', label: "Row 3 Alert" },
      { cell: "F4", expected: "OK", formulaSample: '=IF(E4="Overdue","Action!","OK")', label: "Row 4 Alert" },
    ],
  },
  {
    id: "sheet-sumifs",
    emoji: "🧮",
    titleEn: "4. Regional Summary (SUMIF & COUNTIF)",
    titleHi: "4. Shart ke saath Jodna (SUMIF aur COUNTIF)",
    goalEn: "Find North Total Sales in E2 (=SUMIF(A2:A5,\"North\",C2:C5)) and North Order Count in E3 (=COUNTIF(A2:A5,\"North\")).",
    goalHi: "E2 mein North ki kul bikri =SUMIF(A2:A5,\"North\",C2:C5) aur E3 mein North ke orders =COUNTIF(A2:A5,\"North\") nikalo!",
    hintFormula: '=SUMIF(A2:A5,"North",C2:C5)   |   =COUNTIF(A2:A5,"North")',
    cols: ["A", "B", "C", "D", "E"],
    initialGrid: {
      A1: "Region", B1: "Item", C1: "Sales", D1: "Metric", E1: "Result",
      A2: "North", B2: "Laptop", C2: "45000", D2: "North Sales", E2: "",
      A3: "West", B3: "Mouse", C3: "8000", D3: "North Count", E3: "",
      A4: "North", B4: "Monitor", C4: "25000", D4: "West Sales", E4: "",
      A5: "South", B5: "Desk", C5: "18000", D5: "", E5: "",
    },
    checks: [
      { cell: "E2", expected: "70000", formulaSample: '=SUMIF(A2:A5,"North",C2:C5)', label: "North Sales" },
      { cell: "E3", expected: "2", formulaSample: '=COUNTIF(A2:A5,"North")', label: "North Count" },
      { cell: "E4", expected: "8000", formulaSample: '=SUMIF(A2:A5,"West",C2:C5)', label: "West Sales" },
    ],
  },
  {
    id: "sheet-lookup",
    emoji: "🔎",
    titleEn: "5. XLOOKUP & VLOOKUP Employee Finder",
    titleHi: "5. XLOOKUP aur VLOOKUP se Salary Dhundho",
    goalEn: "Use =XLOOKUP(E2,A2:A5,C2:C5) or =VLOOKUP(E2,A2:C5,3,0) in F2 to fetch Salary and in F3 to fetch Name for the ID in E2!",
    goalHi: "E2 mein likhe EmpID (E103) ke liye F2 mein Salary (=XLOOKUP(E2,A2:A5,C2:C5)) aur F3 mein Name nikalo!",
    hintFormula: "=XLOOKUP(E2,A2:A5,C2:C5)   |   =XLOOKUP(E2,A2:A5,B2:B5)",
    cols: ["A", "B", "C", "D", "E", "F"],
    initialGrid: {
      A1: "EmpID", B1: "Name", C1: "Salary", D1: "", E1: "Search ID", F1: "Lookup Output",
      A2: "E101", B2: "Aarav", C2: "48000", D2: "", E2: "E103", F2: "",
      A3: "E102", B3: "Diya", C3: "72000", D3: "", E3: "Name →", F3: "",
      A4: "E103", B4: "Rohan", C4: "65000", D4: "", E4: "", F4: "",
      A5: "E104", B5: "Meera", C5: "54000", D5: "", E5: "", F5: "",
    },
    dropdownCells: {
      E2: ["E101", "E102", "E103", "E104"],
    },
    checks: [
      { cell: "F2", expected: "65000", formulaSample: "=XLOOKUP(E2,A2:A5,C2:C5)", label: "Salary Lookup" },
      { cell: "F3", expected: "Rohan", formulaSample: "=XLOOKUP(E2,A2:A5,B2:B5)", label: "Name Lookup" },
    ],
  },
  {
    id: "sheet-dashboard",
    emoji: "🏆",
    titleEn: "6. Executive KPI Summary Sheet",
    titleHi: "6. Mini MIS Dashboard KPI Calculation",
    goalEn: "Compute Profit in D2:D4 (=B2-C2), Total Revenue in F2 (=SUM(B2:B4)), and Highest Revenue in F3 (=MAX(B2:B4)).",
    goalHi: "D2:D4 mein Profit (=B2-C2), F2 mein Total Revenue (=SUM(B2:B4)), aur F3 mein Highest Sale (=MAX(B2:B4)) nikalo!",
    hintFormula: "=B2-C2   |   =SUM(B2:B4)   |   =MAX(B2:B4)",
    cols: ["A", "B", "C", "D", "E", "F"],
    initialGrid: {
      A1: "Branch", B1: "Revenue", C1: "Cost", D1: "Profit", E1: "KPI", F1: "Value",
      A2: "Ahmedabad", B2: "150000", C2: "95000", D2: "=B2-C2", E2: "Total Rev", F2: "",
      A3: "Mumbai", B3: "240000", C3: "160000", D3: "", E3: "Max Rev", F3: "",
      A4: "Delhi", B4: "190000", C4: "120000", D4: "", E4: "Total Profit", F4: "",
    },
    checks: [
      { cell: "D2", expected: "55000", formulaSample: "=B2-C2", label: "Ahmedabad Profit" },
      { cell: "D3", expected: "80000", formulaSample: "=B3-C3", label: "Mumbai Profit" },
      { cell: "D4", expected: "70000", formulaSample: "=B4-C4", label: "Delhi Profit" },
      { cell: "F2", expected: "580000", formulaSample: "=SUM(B2:B4)", label: "Total Revenue" },
      { cell: "F3", expected: "240000", formulaSample: "=MAX(B2:B4)", label: "Max Revenue" },
      { cell: "F4", expected: "205000", formulaSample: "=SUM(D2:D4)", label: "Total Profit" },
    ],
  },
  {
    id: "sheet-gst",
    emoji: "🧾",
    titleEn: "7. GST Tax Invoice (CGST, SGST, IGST & Grand Total)",
    titleHi: "7. GST Tax Invoice (CGST 9%, SGST 9%, IGST 18% aur Bill Total)",
    goalEn: 'Home State is "Gujarat". If Buyer State (B2:B4) = "Gujarat", charge 9% CGST in D & 9% SGST in E, else 18% IGST in F, and Invoice Total in G (=SUM(C2:F2))!',
    goalHi: 'Home State "Gujarat" hai. Agar State (B2:B4) = "Gujarat" ho to D mein 9% CGST aur E mein 9% SGST lagao, warna F mein 18% IGST aur G mein =SUM(C2:F2) se Bill Total nikalo!',
    hintFormula: '=IF(B2="Gujarat",C2*0.09,0)  |  =IF(B2="Gujarat",0,C2*0.18)  |  =SUM(C2:F2)',
    cols: ["A", "B", "C", "D", "E", "F", "G"],
    dropdownCells: {
      B2: ["Gujarat", "Maharashtra", "Delhi"],
      B3: ["Gujarat", "Maharashtra", "Delhi"],
      B4: ["Gujarat", "Maharashtra", "Delhi"],
    },
    initialGrid: {
      A1: "Client", B1: "BuyerState", C1: "Taxable", D1: "CGST_9%", E1: "SGST_9%", F1: "IGST_18%", G1: "BillTotal",
      A2: "Surat Textiles", B2: "Gujarat", C2: "10000", D2: '=IF(B2="Gujarat",C2*0.09,0)', E2: "", F2: "", G2: "",
      A3: "Mumbai Traders", B3: "Maharashtra", C3: "20000", D3: "", E3: "", F3: "", G3: "",
      A4: "Rajkot Mart", B4: "Gujarat", C4: "15000", D4: "", E4: "", F4: "", G4: "",
    },
    checks: [
      { cell: "D2", expected: "900", formulaSample: '=IF(B2="Gujarat",C2*0.09,0)', label: "Row 2 CGST" },
      { cell: "E2", expected: "900", formulaSample: '=IF(B2="Gujarat",C2*0.09,0)', label: "Row 2 SGST" },
      { cell: "F2", expected: "0", formulaSample: '=IF(B2="Gujarat",0,C2*0.18)', label: "Row 2 IGST" },
      { cell: "G2", expected: "11800", formulaSample: "=SUM(C2:F2)", label: "Row 2 Total" },
      { cell: "D3", expected: "0", formulaSample: '=IF(B3="Gujarat",C3*0.09,0)', label: "Row 3 CGST" },
      { cell: "E3", expected: "0", formulaSample: '=IF(B3="Gujarat",C3*0.09,0)', label: "Row 3 SGST" },
      { cell: "F3", expected: "3600", formulaSample: '=IF(B3="Gujarat",0,C3*0.18)', label: "Row 3 IGST" },
      { cell: "G3", expected: "23600", formulaSample: "=SUM(C3:F3)", label: "Row 3 Total" },
      { cell: "G4", expected: "17700", formulaSample: '=IF(B4="Gujarat",C4*1.18,C4*1.18)', label: "Row 4 Total" },
    ],
  },
];

function colIndex(col: string): number {
  return col.toUpperCase().charCodeAt(0) - 65;
}

function expandRange(rangeStr: string): string[] {
  const clean = rangeStr.replace(/\$/g, "").trim().toUpperCase();
  const m = /^([A-Z])(\d+):([A-Z])(\d+)$/.exec(clean);
  if (!m) return [clean];
  const c1 = colIndex(m[1]);
  const r1 = Number(m[2]);
  const c2 = colIndex(m[3]);
  const r2 = Number(m[4]);
  const cells: string[] = [];
  for (let r = Math.min(r1, r2); r <= Math.max(r1, r2); r++) {
    for (let c = Math.min(c1, c2); c <= Math.max(c1, c2); c++) {
      cells.push(`${String.fromCharCode(65 + c)}${r}`);
    }
  }
  return cells;
}

function splitTopArgs(inside: string): string[] {
  const out: string[] = [];
  let cur = "";
  let depth = 0;
  let inQuotes = false;
  for (let i = 0; i < inside.length; i++) {
    const ch = inside[i];
    if (ch === '"') inQuotes = !inQuotes;
    if (!inQuotes) {
      if (ch === "(") depth++;
      if (ch === ")") depth--;
      if (ch === "," && depth === 0) {
        out.push(cur.trim());
        cur = "";
        continue;
      }
    }
    cur += ch;
  }
  if (cur.trim() || inside.endsWith(",")) out.push(cur.trim());
  return out;
}

function evalExpr(
  rawExpr: string,
  getCell: (addr: string) => string,
): string {
  const expr = rawExpr.trim();
  if (!expr) return "";
  if (expr.startsWith('"') && expr.endsWith('"')) return expr.slice(1, -1);
  if (/^-?\d+(\.\d+)?$/.test(expr)) return String(Number(expr));

  // Function call NAME(...)
  const fnMatch = /^([A-Z0-9._]+)\(([\s\S]*)\)$/i.exec(expr);
  if (fnMatch) {
    const fn = fnMatch[1].toUpperCase();
    const args = splitTopArgs(fnMatch[2]);

    const numList = (a: string) =>
      expandRange(a)
        .map((c) => Number(getCell(c)))
        .filter((n) => !Number.isNaN(n));

    if (fn === "SUM") {
      return String(args.flatMap(numList).reduce((a, b) => a + b, 0));
    }
    if (fn === "AVERAGE") {
      const nums = args.flatMap(numList);
      return nums.length ? String(Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 100) / 100) : "#DIV/0!";
    }
    if (fn === "MIN") {
      const nums = args.flatMap(numList);
      return nums.length ? String(Math.min(...nums)) : "0";
    }
    if (fn === "MAX") {
      const nums = args.flatMap(numList);
      return nums.length ? String(Math.max(...nums)) : "0";
    }
    if (fn === "COUNT") {
      return String(args.flatMap(numList).length);
    }
    if (fn === "COUNTA") {
      return String(
        args
          .flatMap(expandRange)
          .map(getCell)
          .filter((v) => v !== "").length,
      );
    }
    if (fn === "TRIM") {
      const v = evalExpr(args[0] ?? "", getCell);
      return v.trim().replace(/\s+/g, " ");
    }
    if (fn === "UPPER") return evalExpr(args[0] ?? "", getCell).toUpperCase();
    if (fn === "LOWER") return evalExpr(args[0] ?? "", getCell).toLowerCase();
    if (fn === "PROPER") {
      return evalExpr(args[0] ?? "", getCell)
        .toLowerCase()
        .replace(/\b\w/g, (c) => c.toUpperCase());
    }
    if (fn === "LEN") return String(evalExpr(args[0] ?? "", getCell).length);
    if (fn === "LEFT") {
      const s = evalExpr(args[0] ?? "", getCell);
      const n = Number(evalExpr(args[1] ?? "1", getCell));
      return s.slice(0, n);
    }
    if (fn === "RIGHT") {
      const s = evalExpr(args[0] ?? "", getCell);
      const n = Number(evalExpr(args[1] ?? "1", getCell));
      return s.slice(Math.max(0, s.length - n));
    }
    if (fn === "CONCAT") {
      return args.map((a) => evalExpr(a, getCell)).join("");
    }
    if (fn === "IF") {
      const cond = args[0] ?? "";
      const cmp = /^(.*?)(>=|<=|<>|=|>|<)(.*)$/.exec(cond);
      let ok = false;
      if (cmp) {
        const lv = evalExpr(cmp[1], getCell);
        const op = cmp[2];
        const rv = evalExpr(cmp[3], getCell);
        const ln = Number(lv);
        const rn = Number(rv);
        const bothNum = lv !== "" && rv !== "" && !Number.isNaN(ln) && !Number.isNaN(rn);
        if (op === "=") ok = lv.toLowerCase() === rv.toLowerCase();
        else if (op === "<>") ok = lv.toLowerCase() !== rv.toLowerCase();
        else if (op === ">=") ok = bothNum ? ln >= rn : lv >= rv;
        else if (op === "<=") ok = bothNum ? ln <= rn : lv <= rv;
        else if (op === ">") ok = bothNum ? ln > rn : lv > rv;
        else if (op === "<") ok = bothNum ? ln < rn : lv < rv;
      }
      return evalExpr(ok ? (args[1] ?? "") : (args[2] ?? ""), getCell);
    }
    if (fn === "COUNTIF") {
      const cells = expandRange(args[0] ?? "");
      const crit = evalExpr(args[1] ?? "", getCell).toLowerCase();
      return String(cells.filter((c) => getCell(c).toLowerCase() === crit).length);
    }
    if (fn === "SUMIF") {
      const critCells = expandRange(args[0] ?? "");
      const crit = evalExpr(args[1] ?? "", getCell).toLowerCase();
      const sumCells = args[2] ? expandRange(args[2]) : critCells;
      let total = 0;
      critCells.forEach((c, idx) => {
        if (getCell(c).toLowerCase() === crit) {
          total += Number(getCell(sumCells[idx] ?? "")) || 0;
        }
      });
      return String(total);
    }
    if (fn === "XLOOKUP") {
      const needle = evalExpr(args[0] ?? "", getCell).toLowerCase();
      const lookArr = expandRange(args[1] ?? "");
      const retArr = expandRange(args[2] ?? "");
      const fallback = args[3] ? evalExpr(args[3], getCell) : "#N/A";
      const idx = lookArr.findIndex((c) => getCell(c).toLowerCase() === needle);
      return idx >= 0 ? getCell(retArr[idx] ?? "") : fallback;
    }
    if (fn === "VLOOKUP") {
      const needle = evalExpr(args[0] ?? "", getCell).toLowerCase();
      const cleanTbl = (args[1] ?? "").replace(/\$/g, "").toUpperCase();
      const m = /^([A-Z])(\d+):([A-Z])(\d+)$/.exec(cleanTbl);
      const colOffset = Number(evalExpr(args[2] ?? "1", getCell)) - 1;
      if (!m) return "#REF!";
      const startCol = colIndex(m[1]);
      const r1 = Number(m[2]);
      const r2 = Number(m[4]);
      for (let r = r1; r <= r2; r++) {
        const firstAddr = `${String.fromCharCode(65 + startCol)}${r}`;
        if (getCell(firstAddr).toLowerCase() === needle) {
          const retAddr = `${String.fromCharCode(65 + startCol + colOffset)}${r}`;
          return getCell(retAddr);
        }
      }
      return "#N/A";
    }
    if (fn === "MATCH") {
      const needle = evalExpr(args[0] ?? "", getCell).toLowerCase();
      const arr = expandRange(args[1] ?? "");
      const idx = arr.findIndex((c) => getCell(c).toLowerCase() === needle);
      return idx >= 0 ? String(idx + 1) : "#N/A";
    }
    if (fn === "INDEX") {
      const arr = expandRange(args[0] ?? "");
      const pos = Number(evalExpr(args[1] ?? "1", getCell)) - 1;
      return pos >= 0 && pos < arr.length ? getCell(arr[pos]) : "#REF!";
    }
  }

  // Single cell reference like B2 or $B$2
  const refClean = expr.replace(/\$/g, "").toUpperCase();
  if (/^[A-Z]\d+$/.test(refClean)) {
    return getCell(refClean);
  }

  // Simple binary arithmetic A2*B2, B2-C2, B2+C2, B2/C2
  for (const op of ["+", "-", "*", "/"] as const) {
    const idx = expr.lastIndexOf(op);
    if (idx > 0) {
      const left = Number(evalExpr(expr.slice(0, idx), getCell));
      const right = Number(evalExpr(expr.slice(idx + 1), getCell));
      if (!Number.isNaN(left) && !Number.isNaN(right)) {
        if (op === "+") return String(left + right);
        if (op === "-") return String(left - right);
        if (op === "*") return String(Math.round(left * right * 100) / 100);
        if (op === "/") return right === 0 ? "#DIV/0!" : String(Math.round((left / right) * 100) / 100);
      }
    }
  }

  return "#NAME?";
}

export function LiveSpreadsheet({ initialSheet = "sheet-marks" }: { initialSheet?: PracticeSheetId }) {
  const [sheetId, setSheetId] = useState<PracticeSheetId>(initialSheet);
  const sheet = PRACTICE_SHEETS.find((s) => s.id === sheetId) ?? PRACTICE_SHEETS[0];

  const [grids, setGrids] = useState<Record<PracticeSheetId, Record<string, string>>>(() =>
    Object.fromEntries(PRACTICE_SHEETS.map((s) => [s.id, { ...s.initialGrid }])) as Record<
      PracticeSheetId,
      Record<string, string>
    >,
  );
  const [activeCell, setActiveCell] = useState("E2");
  const [showHint, setShowHint] = useState(false);
  const [gradeMsg, setGradeMsg] = useState<{ passed: boolean; text: string } | null>(null);

  const grid = grids[sheetId];

  const setCellRaw = (addr: string, val: string) => {
    setGradeMsg(null);
    setGrids((cur) => ({
      ...cur,
      [sheetId]: { ...cur[sheetId], [addr]: val },
    }));
  };

  const evaluated = useMemo(() => {
    const cache = new Map<string, string>();
    const visiting = new Set<string>();
    const getVal = (addr: string): string => {
      if (cache.has(addr)) return cache.get(addr)!;
      if (visiting.has(addr)) return "#CYCLE!";
      visiting.add(addr);
      const raw = grid[addr] ?? "";
      const out = raw.startsWith("=") ? evalExpr(raw.slice(1), getVal) : raw;
      visiting.delete(addr);
      cache.set(addr, out);
      return out;
    };
    const res: Record<string, string> = {};
    for (let r = 1; r <= 5; r++) {
      for (const c of sheet.cols) {
        const addr = `${c}${r}`;
        res[addr] = getVal(addr);
      }
    }
    return res;
  }, [grid, sheet.cols]);

  function checkWork() {
    const wrong = sheet.checks.filter(
      (chk) => (evaluated[chk.cell] ?? "").trim().toLowerCase() !== chk.expected.toLowerCase(),
    );
    if (wrong.length === 0) {
      setGradeMsg({
        passed: true,
        text: `🎉 Shandar / Perfect! All ${sheet.checks.length}/${sheet.checks.length} target cells are 100% accurate!`,
      });
    } else {
      const sample = wrong
        .slice(0, 3)
        .map((w) => `${w.cell} (${w.label}: expected ${w.expected})`)
        .join(", ");
      setGradeMsg({
        passed: false,
        text: `Almost there! Check ${wrong.length} cell(s): ${sample}`,
      });
    }
  }

  function fillSolution() {
    const next = { ...grid };
    // Restore E2 if lookup sheet changed dropdown
    if (sheet.id === "sheet-lookup") next.E2 = "E103";
    for (const chk of sheet.checks) {
      next[chk.cell] = chk.formulaSample;
    }
    setGrids((cur) => ({ ...cur, [sheetId]: next }));
    setGradeMsg({
      passed: true,
      text: "✨ Solution formulas filled! Click any green cell to inspect its formula in the fx bar above.",
    });
  }

  function resetSheet() {
    setGrids((cur) => ({ ...cur, [sheetId]: { ...sheet.initialGrid } }));
    setGradeMsg(null);
  }

  function downloadWorkbook() {
    const esc = (v: string) =>
      v.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
    const toXmlSheet = (name: string, rows: string[][]) =>
      `<Worksheet ss:Name="${esc(name)}"><Table>${rows
        .map(
          (row) =>
            `<Row>${row
              .map((cell) => {
                if (cell.startsWith("=")) {
                  return `<Cell ss:Formula="${esc(cell)}"><Data ss:Type="String"></Data></Cell>`;
                }
                const num = Number(cell);
                const isNum = cell !== "" && Number.isFinite(num);
                return `<Cell><Data ss:Type="${isNum ? "Number" : "String"}">${esc(cell)}</Data></Cell>`;
              })
              .join("")}</Row>`,
        )
        .join("")}</Table></Worksheet>`;

    const aoa: string[][] = [];
    for (let r = 1; r <= 5; r++) {
      aoa.push(sheet.cols.map((c) => grid[`${c}${r}`] ?? ""));
    }
    const guideAoa: string[][] = [
      ["Excel Diploma Practice Workbook", sheet.titleEn],
      ["English Goal", sheet.goalEn],
      ["Hindi Goal", sheet.goalHi],
      ["Formula Hints", sheet.hintFormula],
      [""],
      ["Target Cell", "Expected Value", "Model Formula"],
      ...sheet.checks.map((c) => [c.cell, c.expected, c.formulaSample]),
    ];

    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<?mso-application progid="Excel.Sheet"?>',
      '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">',
      toXmlSheet("Practice_Sheet", aoa),
      toXmlSheet("Instructions_Key", guideAoa),
      "</Workbook>",
    ].join("");

    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([xml], { type: "application/vnd.ms-excel;charset=utf-8" }));
    a.download = `${sheet.id}-diploma-practice.xls`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="space-y-4">
      {/* Worksheet Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {PRACTICE_SHEETS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => {
              setSheetId(s.id);
              setActiveCell(s.checks[0]?.cell ?? "B2");
              setGradeMsg(null);
              setShowHint(false);
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap border transition ${
              s.id === sheetId
                ? "bg-(--color-accent) text-white border-transparent shadow-sm"
                : "bg-(--color-surface) border-(--color-border) text-(--color-muted) hover:bg-(--color-accent-soft)"
            }`}
          >
            {s.emoji} {s.titleEn}
          </button>
        ))}
      </div>

      {/* Task Prompt */}
      <Card className="!p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-display font-extrabold text-lg">
              {sheet.emoji} {sheet.titleEn}
            </h2>
            <p className="text-xs text-(--color-muted)">{sheet.titleHi}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setShowHint((h) => !h)}>
              <HelpCircle size={15} /> {showHint ? "Hide Hint" : "Formula Hint"}
            </Button>
            <Button variant="secondary" onClick={() => void downloadWorkbook()}>
              <Download size={15} /> Download .xlsx
            </Button>
          </div>
        </div>

        <Bilingual en={sheet.goalEn} hi={sheet.goalHi} />

        {showHint && (
          <div className="rounded-xl bg-amber-500/10 border border-amber-400/40 px-3.5 py-2 text-xs font-mono">
            💡 Hint: <b>{sheet.hintFormula}</b>
          </div>
        )}
      </Card>

      {/* Live Spreadsheet Grid */}
      <div className="rounded-2xl overflow-hidden border border-(--color-border) bg-(--color-surface) shadow-sm">
        {/* Formula Bar */}
        <div className="px-3 py-2.5 bg-(--color-canvas) border-b border-(--color-border) flex items-center gap-2">
          <span className="w-14 text-center font-mono text-xs font-extrabold rounded-lg bg-(--color-accent-soft) text-(--color-accent-dark) py-1.5 border border-(--color-border)">
            {activeCell}
          </span>
          <span className="font-serif italic font-bold text-(--color-accent-dark) px-1">fx</span>
          <input
            aria-label="Formula Bar"
            value={grid[activeCell] ?? ""}
            onChange={(e) => setCellRaw(activeCell, e.target.value)}
            placeholder="Type a value or formula starting with = (e.g., =SUM(B2:D2))"
            className="flex-1 rounded-lg border border-(--color-border) bg-(--color-surface) px-3 py-1.5 font-mono text-xs sm:text-sm outline-none focus:ring-2 focus:ring-(--color-accent)"
          />
        </div>

        {/* Cells Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-(--color-canvas) text-(--color-muted)">
                <th className="w-10 py-2 border-r border-b border-(--color-border) text-center font-mono text-xs">
                  ◢
                </th>
                {sheet.cols.map((col) => (
                  <th
                    key={col}
                    className="min-w-[115px] py-2 border-r border-b border-(--color-border) text-center font-mono text-xs font-bold"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5].map((r) => (
                <tr key={r}>
                  <td className="py-2 text-center font-mono text-xs font-bold bg-(--color-canvas) text-(--color-muted) border-r border-b border-(--color-border)">
                    {r}
                  </td>
                  {sheet.cols.map((c) => {
                    const addr = `${c}${r}`;
                    const isHeader = r === 1;
                    const isSelected = activeCell === addr;
                    const isTarget = sheet.checks.some((chk) => chk.cell === addr);
                    const raw = grid[addr] ?? "";
                    const val = evaluated[addr] ?? "";
                    const dropdown = sheet.dropdownCells?.[addr];

                    // Live Conditional Formatting colors!
                    const low = val.toLowerCase();
                    const condCls =
                      low === "pass" || low === "paid" || low === "ok"
                        ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 font-bold"
                        : low === "fail" || low === "overdue" || low === "action!"
                          ? "bg-rose-500/15 text-rose-800 dark:text-rose-200 font-bold"
                          : isHeader
                            ? "bg-(--color-accent-soft)/70 font-bold"
                            : isTarget && raw === ""
                              ? "bg-amber-500/10"
                              : "";

                    return (
                      <td
                        key={addr}
                        onClick={() => setActiveCell(addr)}
                        className={`p-0 border-r border-b border-(--color-border) transition ${condCls} ${
                          isSelected ? "ring-2 ring-inset ring-(--color-accent)" : ""
                        }`}
                      >
                        {dropdown ? (
                          <select
                            aria-label={`Cell ${addr}`}
                            value={raw}
                            onChange={(e) => setCellRaw(addr, e.target.value)}
                            className="w-full px-2.5 py-2 bg-transparent outline-none text-xs sm:text-sm font-semibold"
                          >
                            {dropdown.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        ) : isSelected && !isHeader ? (
                          <input
                            aria-label={`Cell ${addr}`}
                            value={raw}
                            onChange={(e) => setCellRaw(addr, e.target.value)}
                            className="w-full px-2.5 py-2 bg-transparent font-mono text-xs sm:text-sm outline-none"
                          />
                        ) : (
                          <div className="px-2.5 py-2 min-h-[36px] flex items-center justify-between gap-1">
                            <span className="truncate">{val}</span>
                            {raw.startsWith("=") && (
                              <Pill tone="good">fx</Pill>
                            )}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Grading Bar */}
        <div className="p-3.5 bg-(--color-canvas) flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            <Button onClick={checkWork}>
              <CheckCircle2 size={16} /> Check My Sheet
            </Button>
            <Button variant="secondary" onClick={fillSolution}>
              <Sparkles size={16} /> Auto-Fill Formulas
            </Button>
            <Button variant="ghost" onClick={resetSheet}>
              <RotateCcw size={15} /> Reset
            </Button>
          </div>
          <span className="text-xs text-(--color-muted)">
            Yellow-tinted cells are formula targets · Click any cell to type!
          </span>
        </div>
      </div>

      {gradeMsg && (
        <div
          role="status"
          className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${
            gradeMsg.passed
              ? "border-emerald-400/50 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200"
              : "border-amber-400/50 bg-amber-500/10 text-amber-900 dark:text-amber-200"
          }`}
        >
          {gradeMsg.text}
        </div>
      )}
    </div>
  );
}
