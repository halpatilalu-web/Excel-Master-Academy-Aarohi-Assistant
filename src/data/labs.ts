export interface Lab { id: string; chapter: number; title: string; task: string; file: string; header: string[]; rows: (i: number) => (string | number)[]; count: number; need: string[] }

const names = ["Aarav", "Diya", "Rohan", "Isha", "Kabir", "Meera", "Vikram", "Anaya", "Arjun", "Sara"];
const cities = ["Delhi", "Mumbai", "Pune", "Jaipur", "Patna"];
const items = ["Pen", "Notebook", "Bag", "Bottle", "Marker"];

export const LABS: Lab[] = [
  { id: "lab1", chapter: 5, title: "Marks Sheet Totals", task: "Har student ka Total aur Average nikalo (SUM, AVERAGE). Naye columns 'Total' aur 'Average' jodo.", file: "marks.csv", header: ["Name", "Maths", "Science", "English"], count: 20, rows: (i) => [names[i % 10] + (i + 1), 40 + ((i * 7) % 55), 35 + ((i * 11) % 60), 45 + ((i * 5) % 50)], need: ["Total", "Average"] },
  { id: "lab2", chapter: 12, title: "Grade Calculator", task: "IFS ya Nested IF se 'Grade' column banao (A ≥ 80, B ≥ 60, C ≥ 33, warna F) aur 'Result' column mein Pass/Fail.", file: "grades.csv", header: ["Name", "Percentage"], count: 25, rows: (i) => [names[i % 10] + (i + 1), 20 + ((i * 13) % 78)], need: ["Grade", "Result"] },
  { id: "lab3", chapter: 15, title: "Regional Sales Summary", task: "SUMIFS se har City ki total sale nikalo aur nayi sheet/summary mein 'City Total' column rakho.", file: "sales.csv", header: ["Date", "City", "Item", "Qty", "Amount"], count: 60, rows: (i) => [`2026-0${1 + (i % 9)}-${10 + (i % 18)}`, cities[i % 5], items[(i * 3) % 5], 1 + (i % 9), 100 + ((i * 37) % 900)], need: ["City Total"] },
  { id: "lab4", chapter: 18, title: "Employee Lookup", task: "Employee ID se VLOOKUP/XLOOKUP lagakar 'Salary' aur 'Department' nikalo (Lookup column jodo).", file: "employees.csv", header: ["EmpID", "Name", "Department", "Salary"], count: 30, rows: (i) => [1000 + i, names[i % 10] + (i + 1), ["HR", "IT", "Sales", "Accounts"][i % 4], 25000 + ((i * 1700) % 40000)], need: ["Lookup"] },
  { id: "lab5", chapter: 23, title: "Pivot Table Practice", task: "Sales data se Pivot Table banao: Rows = City, Columns = Item, Values = Sum of Amount. Sheet ka naam 'Pivot' rakho.", file: "sales-pivot.csv", header: ["Date", "City", "Item", "Qty", "Amount"], count: 80, rows: (i) => [`2026-0${1 + (i % 9)}-${10 + (i % 18)}`, cities[(i * 2) % 5], items[i % 5], 1 + (i % 7), 150 + ((i * 53) % 850)], need: ["Pivot"] },
  { id: "lab6", chapter: 27, title: "Loan EMI Planner", task: "PMT function se EMI nikalo, phir Goal Seek se batao ki 10,000 EMI ke liye maximum loan kitna hoga. 'EMI' column rakho.", file: "loans.csv", header: ["Customer", "Loan", "Rate %", "Months"], count: 12, rows: (i) => [names[i % 10] + (i + 1), 200000 + i * 50000, 8 + (i % 5), 36 + (i % 4) * 12], need: ["EMI"] },
  { id: "lab7", chapter: 29, title: "Final Project: Sales Dashboard", task: "Pivot + charts + slicers se 1-page Dashboard banao (.xlsx apne paas rakho; practice record yahan save karo).", file: "dashboard-data.csv", header: ["Date", "City", "Item", "Qty", "Amount", "Profit"], count: 120, rows: (i) => [`2026-0${1 + (i % 9)}-${10 + (i % 18)}`, cities[(i * 3) % 5], items[i % 5], 1 + (i % 8), 120 + ((i * 41) % 980), 20 + ((i * 17) % 200)], need: [] },
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
export function downloadText(name: string, text: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type: "text/csv" }));
  a.download = name; a.click(); URL.revokeObjectURL(a.href);
}
