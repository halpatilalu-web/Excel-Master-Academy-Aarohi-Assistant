import type { ChartKind } from "./charts";

export interface Kpi { label: string; value: number; prefix?: string; suffix?: string; emoji: string }
export interface DashTemplate {
  id: string; name: string; emoji: string; kpis: Kpi[];
  chart1: { kind: ChartKind; title: string; labels: string[]; series: number[][] };
  chart2: { kind: ChartKind; title: string; labels: string[]; series: number[][] };
  steps: string[]; headers: string[]; rows: (string | number)[][];
}

const M = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
const dates = (i: number) => `2026-0${1 + (i % 6)}-${10 + (i % 18)}`;

export const DASHBOARDS: DashTemplate[] = [
  { id: "sales", name: "Sales Dashboard", emoji: "💰",
    kpis: [{ label: "Total Sales", value: 985000, prefix: "₹", emoji: "💰" }, { label: "Orders", value: 1240, emoji: "🛒" }, { label: "Profit %", value: 24, suffix: "%", emoji: "📈" }, { label: "Customers", value: 560, emoji: "🙋" }],
    chart1: { kind: "combo", title: "Monthly Sales & Profit", labels: M, series: [[120, 150, 135, 180, 210, 190], [20, 32, 25, 44, 58, 47]] },
    chart2: { kind: "doughnut", title: "Region Share", labels: ["North", "South", "East", "West"], series: [[35, 28, 20, 17]] },
    steps: ["Raw data ko Table (Ctrl+T) banayein", "PivotTable: Month × Sales, Region × Sales", "KPI cells mein SUMIFS / COUNTA likhein", "Column + Doughnut chart lagayein", "Slicer (Region, Month) jodein aur sab charts se connect karein", "Gridlines hatayein, ek page par arrange karein"],
    headers: ["Date", "Region", "Product", "Qty", "Sales"],
    rows: Array.from({ length: 40 }, (_, i) => [dates(i), ["North", "South", "East", "West"][i % 4], ["Pen", "Book", "Bag"][i % 3], 5 + ((i * 7) % 20), 500 + ((i * 137) % 4000)]) },
  { id: "hr", name: "HR / Attendance Dashboard", emoji: "🧑‍💼",
    kpis: [{ label: "Employees", value: 120, emoji: "👥" }, { label: "Present Today", value: 108, emoji: "✅" }, { label: "Attendance %", value: 90, suffix: "%", emoji: "📅" }, { label: "On Leave", value: 12, emoji: "🏖️" }],
    chart1: { kind: "line", title: "Attendance % (6 months)", labels: M, series: [[88, 91, 89, 93, 90, 92]] },
    chart2: { kind: "bar", title: "Department Headcount", labels: ["HR", "IT", "Sales", "Ops"], series: [[10, 35, 40, 35]] },
    steps: ["Attendance sheet mein P/A/L codes rakhein", "COUNTIF se present/absent nikalein", "Attendance % = Present ÷ Working days", "Conditional Formatting se laal/hara dikhayein", "Department slicer lagayein"],
    headers: ["Employee", "Dept", "Month", "Present", "Absent", "Leave"],
    rows: Array.from({ length: 30 }, (_, i) => [`Emp ${i + 1}`, ["HR", "IT", "Sales", "Ops"][i % 4], M[i % 6], 18 + (i % 5), i % 3, i % 2]) },
  { id: "fin", name: "Finance / Expense Dashboard", emoji: "🧾",
    kpis: [{ label: "Income", value: 450000, prefix: "₹", emoji: "💵" }, { label: "Expense", value: 310000, prefix: "₹", emoji: "💸" }, { label: "Savings", value: 140000, prefix: "₹", emoji: "🏦" }, { label: "Budget Used", value: 78, suffix: "%", emoji: "🎯" }],
    chart1: { kind: "waterfall", title: "Income to Savings", labels: ["Income", "Rent", "Food", "Other", "Savings"], series: [[100, -30, -25, -15, 30]] },
    chart2: { kind: "pie", title: "Expense Split", labels: ["Rent", "Food", "Travel", "Other"], series: [[40, 30, 15, 15]] },
    steps: ["Income aur Expense ki alag tables", "Category-wise SUMIFS", "Savings = Income − Expense", "Waterfall + Pie chart", "Budget vs Actual ke liye Bullet chart jodein"],
    headers: ["Date", "Category", "Type", "Amount"],
    rows: Array.from({ length: 36 }, (_, i) => [dates(i), ["Rent", "Food", "Travel", "Other"][i % 4], i % 9 === 0 ? "Income" : "Expense", 300 + ((i * 211) % 5000)]) },
  { id: "inv", name: "Inventory Dashboard", emoji: "📦",
    kpis: [{ label: "Total Items", value: 850, emoji: "📦" }, { label: "Stock Value", value: 1250000, prefix: "₹", emoji: "💎" }, { label: "Low Stock", value: 23, emoji: "⚠️" }, { label: "Out of Stock", value: 5, emoji: "🚫" }],
    chart1: { kind: "column", title: "Stock by Category", labels: ["Elec", "Cloth", "Food", "Toys"], series: [[320, 210, 180, 140]] },
    chart2: { kind: "pareto", title: "Top Moving Items", labels: ["A", "B", "C", "D", "E"], series: [[50, 30, 12, 5, 3]] },
    steps: ["Stock register Table mein rakhein", "Low stock flag: =IF(Stock<=Reorder,\"Reorder\",\"OK\")", "Conditional Formatting se laal highlight", "Category-wise Pivot + Pareto", "Dropdown filter (Category)"],
    headers: ["Item", "Category", "Stock", "Reorder Level", "Price"],
    rows: Array.from({ length: 30 }, (_, i) => [`Item ${i + 1}`, ["Elec", "Cloth", "Food", "Toys"][i % 4], (i * 13) % 90, 20, 50 + i * 15]) },
  { id: "stu", name: "Student Result Dashboard", emoji: "🎓",
    kpis: [{ label: "Students", value: 150, emoji: "🎓" }, { label: "Pass %", value: 87, suffix: "%", emoji: "✅" }, { label: "Average", value: 68, emoji: "📝" }, { label: "Toppers", value: 12, emoji: "🏆" }],
    chart1: { kind: "histogram", title: "Marks Distribution", labels: ["0-40", "40-50", "50-60", "60-70", "70-80", "80+"], series: [[8, 14, 28, 40, 38, 22]] },
    chart2: { kind: "radar", title: "Subject Average", labels: ["Math", "Sci", "Eng", "Hindi", "SST"], series: [[72, 65, 70, 78, 60]] },
    steps: ["Marks sheet mein total = SUM, % = total/max", "Result: =IF(MIN(B2:F2)>=35,\"Pass\",\"Fail\")", "Rank: =RANK.EQ()", "Histogram + Radar", "Class slicer lagayein"],
    headers: ["Student", "Class", "Math", "Sci", "Eng", "Hindi"],
    rows: Array.from({ length: 30 }, (_, i) => [`Student ${i + 1}`, `${9 + (i % 3)}th`, 30 + ((i * 7) % 70), 30 + ((i * 11) % 70), 35 + ((i * 5) % 65), 40 + ((i * 3) % 60)]) },
  { id: "prj", name: "Project Tracker Dashboard", emoji: "🗂️",
    kpis: [{ label: "Tasks", value: 64, emoji: "📋" }, { label: "Completed", value: 41, emoji: "✅" }, { label: "Delayed", value: 7, emoji: "⏰" }, { label: "Progress", value: 64, suffix: "%", emoji: "🚀" }],
    chart1: { kind: "gantt", title: "Timeline", labels: ["Plan", "Design", "Build", "Test"], series: [[0, 3, 6, 11], [3, 4, 5, 3]] },
    chart2: { kind: "gauge", title: "Overall Progress", labels: ["done"], series: [[64]] },
    steps: ["Task, Owner, Start, End, Status columns", "% Complete = Done ÷ Total (COUNTIF)", "Gantt (stacked bar trick)", "Status par Data Validation dropdown", "Overdue: =IF(AND(End<TODAY(),Status<>\"Done\"),\"Delayed\",\"\")"],
    headers: ["Task", "Owner", "Start", "End", "Status"],
    rows: Array.from({ length: 24 }, (_, i) => [`Task ${i + 1}`, ["Asha", "Ravi", "Meena"][i % 3], dates(i), dates(i + 5), ["Done", "In Progress", "Todo"][i % 3]]) },
];

export const DASH_RULES = [
  "⏱️ 5-second rule: 5 second mein samajh aa jaana chahiye ki kya ho raha hai.",
  "📄 Ek page: scroll na karna pade, sab kuch ek screen/page par.",
  "🎨 Consistent colours: 3-4 rang hi, ek meaning ke liye ek rang.",
  "🔝 KPI sabse upar, phir trend, phir detail.",
  "🧹 Gridlines, extra borders aur 3D effects hatayein.",
];

export const DASH_PARTS = [
  { t: "KPI Cards", d: "Bade number ek cell mein, formula se (=SUM, =SUMIFS). Upar chhota label, neeche badi font." },
  { t: "Slicers", d: "Pivot/Table select → Insert → Slicer. Button dabate hi sab charts filter ho jaate hain." },
  { t: "Timelines", d: "Date wale Pivot par Insert → Timeline. Mahina/Quarter/Saal slide karke chunein." },
  { t: "Dropdown Filters", d: "Data → Data Validation → List. Formulas us cell ko refer karein." },
  { t: "Pivot-based", d: "Pivot Tables + Pivot Charts + Slicers. Banana aasaan, Refresh karna zaroori (Alt+F5)." },
  { t: "Formula-based", d: "FILTER / XLOOKUP / SUMIFS se live. Zyada flexible, auto-update, Pivot refresh ki zaroorat nahi." },
];
