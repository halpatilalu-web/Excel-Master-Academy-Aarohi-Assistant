import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  Download,
  ExternalLink,
  FileSpreadsheet,
  HelpCircle,
  RotateCcw,
  Sparkles,
  Table2,
} from "lucide-react";
import { Bilingual } from "../lib/lang";
import { Button, Card, Pill } from "./ui";
import { ExcelGrid, type GridCheck } from "./ExcelGrid";
import { TaskBrief } from "./excel/TaskBrief";
import { FormulaPracticeLab } from "./FormulaPracticeLab";
import { FORMULA_DRILLS } from "../data/formulaPractice";
import { taskFor } from "../data/practiceTasks";
import { useWorkbooks, type WorkbookDoc } from "../lib/excel/useWorkbook";
import { buildXlsx, type ExportSheet } from "../lib/excel/xlsx";

/** File name of the .xlsx hand-off for one practice sheet. */
const xlsxName = (id: string) => `Excel-Practice-${id.replace(/^sheet-/, "")}-${new Date().toISOString().slice(0, 10)}.xlsx`;

/**
 * Turn a saved practice sheet into a real .xlsx download. Formulas stay text so
 * desktop Excel / Excel mobile recalculates them with its own engine — that is
 * the "use every function in real Excel" path.
 */
export function downloadPracticeXlsx(title: string, cells: Record<string, string>, template: string) {
  const sheet: ExportSheet = { name: "Practice", cells };
  const bytes = buildXlsx([sheet]);
  const blob = new Blob([bytes as unknown as BlobPart], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = xlsxName(template);
  link.title = title;
  link.click();
  URL.revokeObjectURL(url);
}

export type PracticeSheetId =
  | "sheet-marks"
  | "sheet-cleaning"
  | "sheet-validation"
  | "sheet-sumifs"
  | "sheet-lookup"
  | "sheet-dashboard"
  | "sheet-gst"
  | "sheet-attendance"
  | "sheet-inventory"
  | "sheet-datewise"
  | "sheet-budget";

interface PracticeTask {
  id: PracticeSheetId;
  emoji: string;
  titleEn: string;
  titleHi: string;
  goalEn: string;
  goalHi: string;
  hintFormula: string;
  cols: string[];
  initialGrid: Record<string, string>;
  dropdownCells?: Record<string, string[]>;
  checks: GridCheck[];
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
      A2: "Aarav", B2: "78", C2: "82", D2: "80", E2: "", F2: "", G2: "",
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
      A2: "   ravi   sharma ", B2: "Ahmedabad-380001", C2: "", D2: "",
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
    goalEn: "Compute Amount in D2:D4 (=B2*C2), then write Alerts in F2:F4 (=IF(E2=\"Overdue\",\"Action!\",\"OK\")).",
    goalHi: "D2:D4 mein =B2*C2 likho, E column mein status chuno, aur F2:F4 mein =IF(E2=\"Overdue\",\"Action!\",\"OK\") lagao!",
    hintFormula: '=B2*C2   |   =IF(E2="Overdue","Action!","OK")',
    cols: ["A", "B", "C", "D", "E", "F"],
    initialGrid: {
      A1: "Item", B1: "Qty", C1: "Price", D1: "Amount", E1: "Status", F1: "Alert",
      A2: "Monitor", B2: "3", C2: "12000", D2: "", E2: "Paid", F2: "",
      A3: "Printer", B3: "2", C3: "15000", D3: "", E3: "Overdue", F3: "",
      A4: "Keyboard", B4: "10", C4: "800", D4: "", E4: "Paid", F4: "",
    },
    dropdownCells: { "E2:E4": ["Paid", "Overdue", "Pending"] },
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
    goalEn: "Find North Total Sales in E2 (=SUMIF(A2:A5,\"North\",C2:C5)), North Order Count in E3 (=COUNTIF(A2:A5,\"North\")), and West Sales in E4.",
    goalHi: "E2 mein North ki kul bikri =SUMIF(A2:A5,\"North\",C2:C5), E3 mein orders =COUNTIF(A2:A5,\"North\"), aur E4 mein West ki bikri nikalo!",
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
    goalEn: "For the ID in E2 (E103), fetch the Salary in F2 with =XLOOKUP(E2,A2:A5,C2:C5) and the Name in F3 with =XLOOKUP(E2,A2:A5,B2:B5).",
    goalHi: "E2 mein likhe EmpID (E103) ke liye F2 mein Salary (=XLOOKUP(E2,A2:A5,C2:C5)) aur F3 mein Name nikalo!",
    hintFormula: "=XLOOKUP(E2,A2:A5,C2:C5)   |   =XLOOKUP(E2,A2:A5,B2:B5)",
    cols: ["A", "B", "C", "D", "E", "F"],
    initialGrid: {
      A1: "EmpID", B1: "Name", C1: "Salary", D1: "", E1: "Search ID", F1: "Lookup Output",
      A2: "E101", B2: "Aarav", C2: "48000", D2: "", E2: "E103", F2: "",
      A3: "E102", B3: "Diya", C3: "72000", D3: "", E3: "", F3: "",
      A4: "E103", B4: "Rohan", C4: "65000", D4: "", E4: "", F4: "",
      A5: "E104", B5: "Meera", C5: "54000", D5: "", E5: "", F5: "",
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
    goalEn: "Compute Profit in D2:D4 (=B2-C2), Total Revenue in F2 (=SUM(B2:B4)), Highest Revenue in F3 (=MAX(B2:B4)) and Total Profit in F4 (=SUM(D2:D4)).",
    goalHi: "D2:D4 mein Profit (=B2-C2), F2 mein Total Revenue (=SUM(B2:B4)), F3 mein Highest Sale (=MAX(B2:B4)) aur F4 mein Total Profit nikalo!",
    hintFormula: "=B2-C2   |   =SUM(B2:B4)   |   =MAX(B2:B4)",
    cols: ["A", "B", "C", "D", "E", "F"],
    initialGrid: {
      A1: "Branch", B1: "Revenue", C1: "Cost", D1: "Profit", E1: "KPI", F1: "Value",
      A2: "Ahmedabad", B2: "150000", C2: "95000", D2: "", E2: "Total Rev", F2: "",
      A3: "Mumbai", B3: "240000", C3: "160000", D3: "", E3: "Max Rev", F3: "",
      A4: "Delhi", B4: "190000", C4: "120000", D4: "", E4: "Total Profit", F4: "",
    },
    dropdownCells: { "B2:B8": ["Electronics", "Furniture", "Stationery"] },
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
    goalEn: "Amount D2:D4 = Qty × Rate. Taxable in F2 (=SUM(D2:D4)), CGST in F3 (=ROUND(F2*9%,2)), SGST in F4 (=ROUND(F2*9%,2)) and Grand Total in F5 (=F2+F3+F4).",
    goalHi: "D2:D4 mein Amount (Qty × Rate), F2 mein Taxable Value, F3/F4 mein CGST/SGST 9% (ROUND ke saath) aur F5 mein Grand Total nikalo!",
    hintFormula: "=D2  ...  =SUM(D2:D4)   |   =ROUND(F2*9%,2)   |   =F2+F3+F4",
    cols: ["A", "B", "C", "D", "E", "F"],
    initialGrid: {
      A1: "Item", B1: "Qty", C1: "Rate", D1: "Amount", E1: "GST Head", F1: "Value",
      A2: "Laptop", B2: "2", C2: "45000", D2: "", E2: "Taxable", F2: "",
      A3: "Mouse", B3: "5", C3: "600", D3: "", E3: "CGST 9%", F3: "",
      A4: "Keyboard", B4: "3", C4: "1200", D4: "", E4: "SGST 9%", F4: "",
      E5: "Grand Total", F5: "",
    },
    dropdownCells: { "D2:D6": ["Gujarat (18%)", "Maharashtra (18%)", "Delhi (18%)", "Kerala (5%)"] },
    checks: [
      { cell: "D2", expected: "90000", formulaSample: "=B2*C2", label: "Laptop Amount" },
      { cell: "D3", expected: "3000", formulaSample: "=B3*C3", label: "Mouse Amount" },
      { cell: "D4", expected: "3600", formulaSample: "=B4*C4", label: "Keyboard Amount" },
      { cell: "F2", expected: "96600", formulaSample: "=SUM(D2:D4)", label: "Taxable Value" },
      { cell: "F3", expected: "8694", formulaSample: "=ROUND(F2*9%,2)", label: "CGST" },
      { cell: "F4", expected: "8694", formulaSample: "=ROUND(F2*9%,2)", label: "SGST" },
      { cell: "F5", expected: "113988", formulaSample: "=F2+F3+F4", label: "Grand Total" },
    ],
  },
  {
    id: "sheet-attendance",
    emoji: "🗓",
    titleEn: "8. Attendance Register (COUNTIF & Percentage)",
    titleHi: "8. Attendance Register (COUNTIF se Present aur Percentage)",
    goalEn:
      "Count how many days each student was present with =COUNTIF(B2:F2,\"P\"), then the percentage with =G2/5, and flag shortage with =IF(H2<75%,\"Shortage\",\"OK\").",
    goalHi:
      "Har student ke present days =COUNTIF(B2:F2,\"P\") se gino, percentage =G2/5 se nikalo, aur shortage =IF(H2<75%,\"Shortage\",\"OK\") se dikhao!",
    hintFormula: '=COUNTIF(B2:F2,"P")   |   =G2/5   |   =IF(H2<75%,"Shortage","OK")',
    cols: ["A", "B", "C", "D", "E", "F", "G", "H", "I"],
    initialGrid: {
      A1: "Student", B1: "Mon", C1: "Tue", D1: "Wed", E1: "Thu", F1: "Fri",
      G1: "Present", H1: "Percent", I1: "Status",
      A2: "Aarav", B2: "P", C2: "P", D2: "A", E2: "P", F2: "P",
      A3: "Diya", B3: "P", C3: "A", D3: "A", E3: "A", F3: "P",
      A4: "Kabir", B4: "P", C4: "P", D4: "P", E4: "P", F4: "P",
    },
    checks: [
      { cell: "G2", expected: "4", formulaSample: '=COUNTIF(B2:F2,"P")', label: "Aarav present days" },
      { cell: "H2", expected: "0.8", formulaSample: "=G2/5", label: "Aarav percentage (0.8 = 80%)" },
      { cell: "I2", expected: "OK", formulaSample: '=IF(H2<75%,"Shortage","OK")', label: "Aarav status" },
      { cell: "G3", expected: "2", formulaSample: '=COUNTIF(B3:F3,"P")', label: "Diya present days" },
      { cell: "I3", expected: "Shortage", formulaSample: '=IF(H3<75%,"Shortage","OK")', label: "Diya status" },
      { cell: "G4", expected: "5", formulaSample: '=COUNTIF(B4:F4,"P")', label: "Kabir present days" },
      { cell: "H4", expected: "1", formulaSample: "=G4/5", label: "Kabir percentage (1 = 100%)" },
    ],
  },
  {
    id: "sheet-inventory",
    emoji: "📦",
    titleEn: "9. Inventory Reorder Alert (MIN, IF & Conditional Formatting)",
    titleHi: "9. Inventory Reorder Alert (MIN aur IF se stock check)",
    goalEn:
      "Value the stock with =D2*E2, flag reorder with =IF(D2<=C2,\"Reorder\",\"OK\"), and find the lowest price with =MIN(E2:E5).",
    goalHi:
      "Stock value =D2*E2 se nikalo, reorder =IF(D2<=C2,\"Reorder\",\"OK\") se lagao, aur sabse kam rate =MIN(E2:E5) se dhoondo!",
    hintFormula: '=D2*E2   |   =IF(D2<=C2,"Reorder","OK")   |   =MIN(E2:E5)',
    cols: ["A", "B", "C", "D", "E", "F", "G"],
    initialGrid: {
      A1: "Item", B1: "Qty In", C1: "Reorder Level", D1: "In Stock", E1: "Rate", F1: "Stock Value", G1: "Action",
      A2: "Pen Box", B2: "100", C2: "40", D2: "25", E2: "120",
      A3: "Notebook", B3: "200", C3: "60", D3: "90", E3: "65",
      A4: "Marker", B4: "150", C4: "50", D4: "120", E4: "40",
      A5: "Stapler", B5: "80", C5: "30", D5: "18", E5: "210",
    },
    checks: [
      { cell: "F2", expected: "3000", formulaSample: "=D2*E2", label: "Pen Box stock value" },
      { cell: "G2", expected: "Reorder", formulaSample: '=IF(D2<=C2,"Reorder","OK")', label: "Pen Box action" },
      { cell: "F3", expected: "5850", formulaSample: "=D3*E3", label: "Notebook stock value" },
      { cell: "G3", expected: "OK", formulaSample: '=IF(D3<=C3,"Reorder","OK")', label: "Notebook action" },
      { cell: "G4", expected: "OK", formulaSample: '=IF(D4<=C4,"Reorder","OK")', label: "Marker action" },
      { cell: "G5", expected: "Reorder", formulaSample: '=IF(D5<=C5,"Reorder","OK")', label: "Stapler action" },
      { cell: "F7", expected: "40", formulaSample: "=MIN(E2:E5)", label: "Lowest rate" },
    ],
  },
  {
    id: "sheet-datewise",
    emoji: "📅",
    titleEn: "10. Date & Month Report (TEXT, MONTH & EOMONTH)",
    titleHi: "10. Date Report (TEXT se month, EOMONTH se month-end)",
    goalEn:
      "Pull the month name with =TEXT(A2,\"mmm\"), the year with =YEAR(A2), the month number with =MONTH(A2) and the month-end date with =EOMONTH(A2,0).",
    goalHi:
      "Month ka naam =TEXT(A2,\"mmm\") se, saal =YEAR(A2), month number =MONTH(A2), aur month-end date =EOMONTH(A2,0) se nikalo!",
    hintFormula: '=TEXT(A2,"mmm")   |   =YEAR(A2)   |   =MONTH(A2)   |   =EOMONTH(A2,0)',
    cols: ["A", "B", "C", "D", "E", "F"],
    initialGrid: {
      A1: "Sale Date", B1: "Month", C1: "Year", D1: "Month No", E1: "Month End", F1: "Amount",
      A2: "2026-01-15", F2: "12500",
      A3: "2026-02-03", F3: "9800",
      A4: "2026-02-27", F4: "15600",
      A5: "2026-03-09", F5: "7400",
    },
    checks: [
      { cell: "B2", expected: "Jan", formulaSample: '=TEXT(A2,"mmm")', label: "Month name" },
      { cell: "C2", expected: "2026", formulaSample: "=YEAR(A2)", label: "Year" },
      { cell: "D2", expected: "1", formulaSample: "=MONTH(A2)", label: "Month number" },
      { cell: "E2", expected: "46053", formulaSample: "=EOMONTH(A2,0)", label: "Month end (serial; Ctrl+Shift+3 for a date)" },
      { cell: "B3", expected: "Feb", formulaSample: '=TEXT(A3,"mmm")', label: "Month name 2" },
      { cell: "D4", expected: "2", formulaSample: "=MONTH(A4)", label: "Month number 2" },
    ],
  },
  {
    id: "sheet-budget",
    emoji: "💰",
    titleEn: "11. Monthly Budget vs Actual (SUMIF & Variance)",
    titleHi: "11. Budget vs Actual (SUMIF se actual, IF se over-budget)",
    goalEn:
      "Fill Actual with =SUMIF($A$8:$A$13,A2,$B$8:$B$13), Variance with =Actual-Budget, and Flag with =IF(E2>0,\"Over\",\"Under\").",
    goalHi:
      "Actual =SUMIF($A$8:$A$13,A2,$B$8:$B$13) se, Variance =Actual-Budget se, aur Flag =IF(E2>0,\"Over\",\"Under\") se nikalo!",
    hintFormula: '=SUMIF($A$8:$A$13,A2,$B$8:$B$13)   |   =C2-B2   |   =IF(E2>0,"Over","Under")',
    cols: ["A", "B", "C", "D", "E"],
    initialGrid: {
      A1: "Head", B1: "Budget", C1: "Actual", D1: "Variance", E1: "Flag",
      A2: "Rent", B2: "12000",
      A3: "Salary", B3: "45000",
      A4: "Electricity", B4: "3000",
      A5: "Stationery", B5: "2500",
      A7: "Date", A8: "Rent", B8: "12000",
      A9: "Salary", B9: "47000",
      A10: "Electricity", B10: "2800",
      A11: "Rent", B11: "0",
      A12: "Stationery", B12: "3100",
      A13: "Salary", B13: "0",
    },
    checks: [
      { cell: "C2", expected: "12000", formulaSample: "=SUMIF($A$8:$A$13,A2,$B$8:$B$13)", label: "Rent actual" },
      { cell: "C3", expected: "47000", formulaSample: "=SUMIF($A$8:$A$13,A3,$B$8:$B$13)", label: "Salary actual" },
      { cell: "C4", expected: "2800", formulaSample: "=SUMIF($A$8:$A$13,A4,$B$8:$B$13)", label: "Electricity actual" },
      { cell: "D3", expected: "2000", formulaSample: "=C3-B3", label: "Salary variance" },
      { cell: "E3", expected: "Over", formulaSample: '=IF(D3>0,"Over","Under")', label: "Salary flag" },
      { cell: "E4", expected: "Under", formulaSample: '=IF(D4>0,"Over","Under")', label: "Electricity flag" },
    ],
  },
];

const NOTES: Record<PracticeSheetId, { en: string; hi: string }> = {
  "sheet-marks": {
    en: "Excel's SUM ignores text in a range, so one dirty cell never breaks a total. AVERAGE divides by the count of numbers only.",
    hi: "Excel ka SUM range ke text ko chhod deta hai, isliye ek ganda cell total nahi todta. AVERAGE sirf numbers ki ginti se bhaag karta hai.",
  },
  "sheet-cleaning": {
    en: "TRIM removes extra spaces, PROPER fixes capitalisation, RIGHT/LEFT/MID extract part of the text — the 3-step data-cleaning ritual of every MIS job.",
    hi: "TRIM faaltu space hatata hai, PROPER capitalisation theek karta hai, RIGHT/LEFT/MID text ka hissa nikaalte hain — har MIS job ka cleaning mantra.",
  },
  "sheet-validation": {
    en: "If you type a status that is not allowed, Excel's Data Validation shows a dropdown instead. Our grid accepts anything — try breaking the IF and see the result flip.",
    hi: "Galat status type karne par Excel ka Data Validation dropdown dikhata hai. Yahan kuch bhi likh sakte ho — IF todkar dekho, result palat jaayega.",
  },
  "sheet-sumifs": {
    en: "SUMIF's third argument is optional: leave it out and Excel adds the criteria range itself. Wildcards like \"*o*\" work inside the criteria string.",
    hi: "SUMIF ka teesra argument optional hai: chhod do to Excel khud criteria range jodta hai. Criteria mein \"*o*\" jaise wildcard chalte hain.",
  },
  "sheet-lookup": {
    en: "XLOOKUP replaces VLOOKUP+HLOOKUP+IFERROR: it searches in any direction and its 4th argument is the 'not found' message.",
    hi: "XLOOKUP, VLOOKUP+HLOOKUP+IFERROR ka replacement hai: kisi bhi direction mein dhoondhta hai aur chautha argument 'nahi mila' ka message hai.",
  },
  "sheet-dashboard": {
    en: "A dashboard is just sums of sums. Build the KPI cells with SUM/MAX/COUNTIF, then any filter or slicer updates them automatically.",
    hi: "Dashboard matlab sums ka sum. KPI cells SUM/MAX/COUNTIF se banao, phir koi bhi filter ya slicer unhe khud update karega.",
  },
  "sheet-gst": {
    en: "Always ROUND the tax to 2 decimals — otherwise CGST+SGST can be one paisa different from IGST and your invoice gets rejected.",
    hi: "Tax ko hamesha 2 decimal tak ROUND karo — warna CGST+SGST aur IGST mein ek paisa ka farak aata hai aur invoice reject ho jaata hai.",
  },
  "sheet-attendance": {
    en: "COUNTIF counts cells that match one criterion — it is the fastest attendance register in Excel. The count is a number, so percentage is simply count ÷ working days.",
    hi: "COUNTIF ek hi condition wale cells ginta hai — attendance register ka sabse tez tarika. Ginti ek number hai, isliye percentage = ginti ÷ kaam ke din.",
  },
  "sheet-inventory": {
    en: "Stock value is quantity × rate, not purchase value; a reorder flag compares closing stock to the reorder level, never to the ordered quantity.",
    hi: "Stock value = quantity × rate hoti hai, purchase value nahi; reorder flag closing stock ko reorder level se compare karta hai, order ki quantity se nahi.",
  },
  "sheet-datewise": {
    en: "Excel stores a date as a serial number: TEXT/MONTH/YEAR just format that number, and EOMONTH(A2,0) returns the last day of the same month.",
    hi: "Excel date ko ek serial number ki tarah rakhta hai: TEXT/MONTH/YEAR usi number ko format karte hain, aur EOMONTH(A2,0) usi mahine ka aakhri din deta hai.",
  },
  "sheet-budget": {
    en: "SUMIF with an absolute range ($A$8:$A$13) and a relative criterion (A2) is the pattern behind every budget sheet: fill down, and each row picks its own head.",
    hi: "Absolute range ($A$8:$A$13) aur relative criterion (A2) wala SUMIF har budget sheet ka pattern hai: neeche fill karo, har row apna head khud chun leti hai.",
  },
};

export function LiveSpreadsheet({
  initialSheet = "sheet-marks",
  initialFormula,
}: {
  initialSheet?: PracticeSheetId;
  /** Open the Lab with this formula's drill selected (e.g. from the catalog). */
  initialFormula?: string;
}) {
  const [sheetId, setSheetId] = useState<PracticeSheetId>(initialSheet);
  /**
   * Two modes inside the Lab: the eleven scenario sheets (marksheet, GST, stock…)
   * and a drill for every function in the catalogue. The formula drills are only
   * mounted when chosen, so the scenario sheet still opens instantly.
   */
  const [mode, setMode] = useState<"sheets" | "formulas">(
    () => (initialFormula && FORMULA_DRILLS.some((drill) => drill.name === initialFormula) ? "formulas" : "sheets"),
  );
  // The goal/hint panel is collapsed on phones so the sheet is visible straight
  // away — on a desktop there is room, so it starts open.
  const [briefOpen, setBriefOpen] = useState(
    () => typeof window === "undefined" || window.innerWidth >= 768,
  );
  const [showHint, setShowHint] = useState(true);
  const [showNotes, setShowNotes] = useState(false);
  /** Cell the task table asked the grid to jump to. */
  const [jumpTo, setJumpTo] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const sheet = PRACTICE_SHEETS.find((s) => s.id === sheetId) ?? PRACTICE_SHEETS[0];
  const toolbarRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setSheetId(initialSheet);
  }, [initialSheet]);

  const savedWorkbooks = useWorkbooks().items;
  const saved = useMemo(
    () => savedWorkbooks.find((doc: WorkbookDoc) => doc.template === sheet.id),
    [savedWorkbooks, sheet.id],
  );

  /**
   * The practice sheets declare dropdowns (e.g. Status = Paid / Overdue). They
   * become real Data Validation list rules, so the student taps the cell and
   * picks a value instead of typing it — exactly like Excel's dropdown.
   */
  const validationRules = useMemo(() => {
    const entries = Object.entries(sheet.dropdownCells ?? {});
    return entries.map(([range, items], index) => ({
      id: `${sheet.id}-dv-${index}`,
      range,
      type: "list" as const,
      items,
      allowBlank: true,
      showDropdown: true,
      message: `Is cell ke liye allowed: ${items.join(", ")}`,
    }));
  }, [sheet]);

  const gridSheets = useMemo(
    () => [{ name: "Practice", cells: { ...(saved?.sheets[0]?.cells ?? sheet.initialGrid) } }],
    [sheet, saved],
  );

  const openInExcel = useCallback(() => {
    const cells: Record<string, string> = {};
    Object.entries(sheet.initialGrid).forEach(([address, text]) => {
      if (text !== "") cells[address] = text;
    });
    downloadPracticeXlsx(sheet.titleEn, cells, sheet.id);
  }, [sheet]);

  const notes = NOTES[sheet.id];

  return (
    <div className="space-y-4">
      {/* Mode switch: scenario sheets vs. a drill for every function. */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setMode("sheets")}
          aria-pressed={mode === "sheets"}
          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
            mode === "sheets" ? "bg-(--color-accent) text-white shadow-(--neu-raised-sm)" : "neu-btn text-(--color-muted)"
          }`}
        >
          <Table2 size={14} /> Scenario sheets ({PRACTICE_SHEETS.length})
        </button>
        <button
          type="button"
          onClick={() => setMode("formulas")}
          aria-pressed={mode === "formulas"}
          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
            mode === "formulas" ? "bg-(--color-accent) text-white shadow-(--neu-raised-sm)" : "neu-btn text-(--color-muted)"
          }`}
        >
          <Sparkles size={14} /> Har formula ki practice ({FORMULA_DRILLS.length})
        </button>
      </div>

      {mode === "formulas" && (
        <FormulaPracticeLab initialFormula={initialFormula} />
      )}

      <div className={mode === "formulas" ? "hidden" : "space-y-4"}>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {PRACTICE_SHEETS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => {
              setSheetId(s.id);
              setShowNotes(false);
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

      <div ref={toolbarRef} id="practice-toolbar" className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" onClick={() => setShowHint((h) => !h)}>
          <HelpCircle size={15} /> {showHint ? "Hide hint" : "Formula hint"}
        </Button>
        <Button variant="secondary" onClick={() => setShowNotes((v) => !v)}>
          <BookOpen size={15} /> {showNotes ? "Hide note" : "Why it works"}
        </Button>
        <Button variant="ghost" onClick={() => window.print()}>
          <Download size={15} /> Print / PDF
        </Button>
        <a
          href="#/workbook"
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold bg-(--color-surface) neu-btn hover:bg-(--color-accent-soft)"
        >
          <ExternalLink size={15} /> Open full workbook
        </a>
      </div>

      {/* The work order: numbered steps, exact cells, the mistake to avoid. */}
      <TaskBrief
        task={taskFor(sheet.id)}
        startOpen={briefOpen}
        onApplyStep={(at) => {
          // Tapping "E2" in the table jumps the grid to that cell, so the
          // student never has to hunt for the address.
          const first = at.split(":")[0].replace(/[^A-Z0-9$]/gi, "");
          if (/^\$?[A-Z]{1,3}\$?\d+$/i.test(first)) {
            setJumpTo(first.replace(/\$/g, ""));
            setStatus(`Task step: ${first} par jao aur likho.`);
          } else {
            setStatus(`${at} — yeh summary block ka hissa hai, sheet mein usi jagah likho.`);
          }
        }}
      />

      {briefOpen && (
        <div className="flex flex-wrap gap-1.5 text-[11px]">
          {sheet.checks.map((check) => (
            <Pill key={check.cell} tone="info">
              {check.cell} · {check.label}
            </Pill>
          ))}
        </div>
      )}

      {showNotes && (
        <div className="rounded-xl neu-pressed-sm px-3.5 py-2 text-xs">
          <div>{notes.en}</div>
          <div className="text-(--color-muted) mt-1">{notes.hi}</div>
        </div>
      )}

      {status && (
        <p role="status" className="text-[11px] font-semibold text-(--color-accent-dark)">
          {status}
        </p>
      )}

      <ExcelGrid
        key={sheet.id}
        template={sheet.id}
        title={sheet.titleEn}
        sheets={gridSheets}
        rows={Math.max(26, Object.keys(sheet.initialGrid).length + 12)}
        cols={Math.max(8, sheet.cols.length + 2)}
        validation={validationRules}
        jumpTo={jumpTo}
        brief={{
          title: `${sheet.emoji} ${sheet.titleEn}`,
          hint: sheet.titleHi,
          formulaHint: sheet.hintFormula,
          checks: sheet.checks,
        }}
        headerActions={
          <Button onClick={openInExcel}>
            <FileSpreadsheet size={15} /> Open this sheet in Excel
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2 text-xs text-(--color-muted)">
        <CheckCircle2 size={14} /> Type any formula — the same engine behind the free workbook calculates it.
        <span className="inline-flex items-center gap-1">
          <RotateCcw size={13} /> Reset sheet restores the practice data.
        </span>
        <span className="inline-flex items-center gap-1">
          <Sparkles size={13} /> Show solution fills the model formulas.
        </span>
      </div>
      </div>
    </div>
  );
}
