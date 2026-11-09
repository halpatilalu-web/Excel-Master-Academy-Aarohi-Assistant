import { saveFile } from "../lib/saveFile";

export interface Lab {
  id: string;
  chapter: number;
  title: string;
  task: string;
  taskEn: string;
  file: string;
  header: string[];
  rows: (i: number) => (string | number)[];
  count: number;
  need: string[];
}

const names = ["Aarav", "Diya", "Rohan", "Isha", "Kabir", "Meera", "Vikram", "Anaya", "Arjun", "Sara"];
const cities = ["Delhi", "Mumbai", "Pune", "Jaipur", "Ahmedabad"];
const items = ["Pen", "Notebook", "Bag", "Bottle", "Marker"];

export const LABS: Lab[] = [
  {
    id: "lab1",
    chapter: 5,
    title: "Marks Sheet Totals",
    task: "Har student ka Total aur Average nikalo (SUM, AVERAGE). Naye columns 'Total' aur 'Average' jodo.",
    taskEn: "Calculate Total and Average for every student using SUM and AVERAGE. Add 'Total' and 'Average' columns.",
    file: "marks.csv",
    header: ["Name", "Maths", "Science", "English"],
    count: 20,
    rows: (i) => [names[i % 10] + (i + 1), 40 + ((i * 7) % 55), 35 + ((i * 11) % 60), 45 + ((i * 5) % 50)],
    need: ["Total", "Average"],
  },
  {
    id: "lab2",
    chapter: 12,
    title: "Grade Calculator (IF & IFS)",
    task: "IFS ya Nested IF se 'Grade' column banao (A ≥ 80, B ≥ 60, C ≥ 33, warna F) aur 'Result' column mein Pass/Fail.",
    taskEn: "Create a 'Grade' column using IFS (A ≥ 80, B ≥ 60, C ≥ 33, else F) and a 'Result' Pass/Fail column.",
    file: "grades.csv",
    header: ["Name", "Percentage"],
    count: 25,
    rows: (i) => [names[i % 10] + (i + 1), 20 + ((i * 13) % 78)],
    need: ["Grade", "Result"],
  },
  {
    id: "lab3",
    chapter: 15,
    title: "Regional Sales Summary (SUMIFS)",
    task: "SUMIFS se har City ki total sale nikalo aur nayi sheet/summary mein 'City Total' column rakho.",
    taskEn: "Summarize total revenue per City using SUMIFS and include a 'City Total' summary column.",
    file: "sales.csv",
    header: ["Date", "City", "Item", "Qty", "Amount"],
    count: 60,
    rows: (i) => [`2026-0${1 + (i % 9)}-${10 + (i % 18)}`, cities[i % 5], items[(i * 3) % 5], 1 + (i % 9), 100 + ((i * 37) % 900)],
    need: ["City Total"],
  },
  {
    id: "lab4",
    chapter: 18,
    title: "Employee Lookup (VLOOKUP / XLOOKUP)",
    task: "Employee ID se VLOOKUP/XLOOKUP lagakar 'Salary' aur 'Department' nikalo (Lookup column jodo).",
    taskEn: "Use VLOOKUP or XLOOKUP on EmpID to pull 'Salary' and 'Department' into a 'Lookup' report column.",
    file: "employees.csv",
    header: ["EmpID", "Name", "Department", "Salary"],
    count: 30,
    rows: (i) => [1000 + i, names[i % 10] + (i + 1), ["HR", "IT", "Sales", "Accounts"][i % 4], 25000 + ((i * 1700) % 40000)],
    need: ["Lookup"],
  },
  {
    id: "lab5",
    chapter: 23,
    title: "Pivot Table Practice",
    task: "Sales data se Pivot Table banao: Rows = City, Columns = Item, Values = Sum of Amount. Sheet ka naam 'Pivot' rakho.",
    taskEn: "Build a Pivot Table with Rows = City, Columns = Item, Values = Sum of Amount, named 'Pivot'.",
    file: "sales-pivot.csv",
    header: ["Date", "City", "Item", "Qty", "Amount"],
    count: 80,
    rows: (i) => [`2026-0${1 + (i % 9)}-${10 + (i % 18)}`, cities[(i * 2) % 5], items[i % 5], 1 + (i % 7), 150 + ((i * 53) % 850)],
    need: ["Pivot"],
  },
  {
    id: "lab6",
    chapter: 27,
    title: "Loan EMI Planner & Goal Seek",
    task: "PMT function se EMI nikalo, phir Goal Seek se batao ki 10,000 EMI ke liye maximum loan kitna hoga. 'EMI' column rakho.",
    taskEn: "Compute monthly 'EMI' using PMT(), then use Goal Seek to find max loan principal for ₹10,000 EMI.",
    file: "loans.csv",
    header: ["Customer", "Loan", "Rate %", "Months"],
    count: 12,
    rows: (i) => [names[i % 10] + (i + 1), 200000 + i * 50000, 8 + (i % 5), 36 + (i % 4) * 12],
    need: ["EMI"],
  },
  {
    id: "lab8-clean",
    chapter: 33,
    title: "Dirty CRM Data Cleaning Project",
    task: "Extra spaces aur casing ko =PROPER(TRIM(CLEAN())) se saaf karo aur 'CleanName' aur 'PinCode' columns banao.",
    taskEn: "Clean messy customer names using PROPER(TRIM(CLEAN())) and split City-PIN into 'CleanName' and 'PinCode'.",
    file: "dirty-crm-data.csv",
    header: ["RawCustomer", "City_PIN", "RawPhone", "OrderValue"],
    count: 35,
    rows: (i) => [
      `   ${names[i % 10].toLowerCase()}   sharma  `,
      `${cities[i % 5]}-${380001 + (i % 9) * 101}`,
      `98765${10000 + i * 37}`,
      1200 + ((i * 290) % 8500),
    ],
    need: ["CleanName", "PinCode"],
  },
  {
    id: "lab9-cond-val",
    chapter: 34,
    title: "Inventory Reorder Conditional & Dropdown Sheet",
    task: "Data Validation dropdown (OK / Reorder) aur Conditional Formatting row highlight ($C2<=$D2) lagao; 'ReorderStatus' column jodo.",
    taskEn: "Add a 'ReorderStatus' formula/dropdown column and apply formula-based Conditional Formatting ($C2<=$D2) to highlight low-stock rows.",
    file: "inventory-reorder.csv",
    header: ["SKU", "ItemName", "CurrentStock", "ReorderLevel", "UnitPrice"],
    count: 30,
    rows: (i) => [`SKU-${201 + i}`, `${items[i % 5]} Pro ${i + 1}`, (i * 9) % 60, 20, 120 + i * 25],
    need: ["ReorderStatus"],
  },
  {
    id: "lab10-pq",
    chapter: 37,
    title: "Power Query Crosstab Unpivot Dataset",
    task: "Jan se Jun ke wide columns ko Power Query 'Unpivot Other Columns' se 'Month' aur 'Sales' tall format mein badlo.",
    taskEn: "Load this wide monthly crosstab into Power Query and use 'Unpivot Other Columns' to output 'Month' and 'Sales' columns.",
    file: "wide-monthly-crosstab.csv",
    header: ["Branch", "Product", "Jan", "Feb", "Mar", "Apr", "May", "Jun"],
    count: 20,
    rows: (i) => [
      cities[i % 5],
      items[i % 5],
      4000 + i * 150,
      4500 + i * 120,
      4200 + i * 180,
      5100 + i * 160,
      5600 + i * 140,
      6000 + i * 190,
    ],
    need: ["Month", "Sales"],
  },
  {
    id: "lab7",
    chapter: 40,
    title: "Diploma Capstone: Executive MIS Dashboard",
    task: "Power Query/TRIM + XLOOKUP + Pivot + Charts + Slicers se 1-page Executive MIS Dashboard banao (.xlsx apne paas rakho; record yahan save karo).",
    taskEn: "Build your complete 1-page Diploma Capstone Dashboard combining Clean Table, Lookups, KPI Cards, PivotCharts & Slicers.",
    file: "capstone-mis-data.csv",
    header: ["Date", "City", "Salesperson", "Item", "Qty", "Amount", "Profit"],
    count: 140,
    rows: (i) => [
      `2026-0${1 + (i % 9)}-${10 + (i % 18)}`,
      cities[(i * 3) % 5],
      names[i % 10],
      items[i % 5],
      1 + (i % 8),
      120 + ((i * 41) % 980),
      20 + ((i * 17) % 200),
    ],
    need: [],
  },
  {
    id: "lab11-gst",
    chapter: 44,
    title: "GST Tax Invoice & Accounts Register",
    task: "HomeState 'Gujarat' ke hisaab se 'CGST', 'SGST', 'IGST' aur 'GrandTotal' columns formula se nikalo aur upload karke check karo!",
    taskEn: "Compute 'CGST', 'SGST', 'IGST', and 'GrandTotal' columns based on BuyerState vs HomeState ('Gujarat') at 18% GST.",
    file: "gst-invoice-register.csv",
    header: ["InvoiceNo", "BuyerName", "BuyerState", "HSN", "Qty", "UnitRate", "TaxableValue"],
    count: 35,
    rows: (i) => {
      const states = ["Gujarat", "Maharashtra", "Delhi", "Gujarat", "Rajasthan"];
      const qty = 2 + (i % 10);
      const rate = 500 + (i % 8) * 250;
      return [`INV-${202601 + i}`, `${names[i % 10]} Enterprises`, states[i % 5], `8471${i % 9}`, qty, rate, qty * rate];
    },
    need: ["CGST", "SGST", "IGST", "GrandTotal"],
  },
];

const csvCell = (value: string | number) => {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

export function datasetCSV(l: Lab) {
  const lines = [
    l.header.map(csvCell).join(","),
    ...Array.from({ length: l.count }, (_, i) => l.rows(i).map(csvCell).join(",")),
  ];
  return lines.join("\n");
}

/**
 * Save a CSV the student asked for. Goes through the shared saver so the APK's
 * WebView (which drops plain `<a download>` clicks) gets a real share sheet and
 * a clear failure instead of a silent nothing.
 */
export function downloadText(name: string, text: string): Promise<boolean> {
  return saveFile(name, [text], "text/csv;charset=utf-8").then((result) => result.ok);
}

const xmlEscape = (v: string | number) =>
  String(v)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

function buildSheetXml(name: string, rows: (string | number)[][]): string {
  const xmlRows = rows
    .map(
      (row) =>
        `<Row>${row
          .map((cell) => {
            const isNum = typeof cell === "number" && Number.isFinite(cell);
            return `<Cell><Data ss:Type="${isNum ? "Number" : "String"}">${xmlEscape(cell)}</Data></Cell>`;
          })
          .join("")}</Row>`,
    )
    .join("");
  return `<Worksheet ss:Name="${xmlEscape(name)}"><Table>${xmlRows}</Table></Worksheet>`;
}

export async function downloadLabXlsx(l: Lab) {
  const dataRows: (string | number)[][] = [
    l.header,
    ...Array.from({ length: l.count }, (_, i) => l.rows(i)),
  ];
  const instructionRows: (string | number)[][] = [
    ["Excel Master Academy — Diploma Project Dataset"],
    ["Project Title", l.title],
    ["Linked Chapter", `Chapter ${l.chapter}`],
    ["Instructions (English)", l.taskEn],
    ["Instructions (Hindi)", l.task],
    ["Required Check Columns", l.need.length ? l.need.join(", ") : "Open Dashboard Project"],
  ];

  const workbookXml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<?mso-application progid="Excel.Sheet"?>',
    '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">',
    buildSheetXml("Project_Data", dataRows),
    buildSheetXml("Instructions_HI_EN", instructionRows),
    "</Workbook>",
  ].join("");

  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([workbookXml], { type: "application/vnd.ms-excel;charset=utf-8" }));
  a.download = l.file.replace(/\.csv$/i, ".xls");
  a.click();
  URL.revokeObjectURL(a.href);
}
