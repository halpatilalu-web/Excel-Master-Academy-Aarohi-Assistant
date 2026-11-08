/**
 * @license MIT
 * Seeded worksheets used by the formula practice lab.
 *
 * Every formula in the app needs a worksheet on which its example actually
 * calculates — SUM needs numbers, FIND needs text with a separator, HLOOKUP
 * needs a horizontal table. These are those worksheets. They are plain data so
 * the generator script and the UI seed the *same* cells (a check would be
 * meaningless otherwise).
 */
export type Cells = Record<string, string>;

export interface FormulaDataset {
  id: string;
  /** What the student sees at the top of the sheet. */
  label: string;
  /** One line describing the columns, in Hinglish. */
  tell: string;
  cells: Cells;
}

const LETTERS = ["A", "B", "C", "D", "E", "F"];

/** Where the student types their answer. Column H is kept empty in every sheet. */
export const ANSWER_CELL = "H1";

/** Fill A:H with whatever the callback returns for (column, row). */
function block(fill: (col: string, row: number, ci: number, ri: number) => string, rows = 60): Cells {
  const cells: Cells = {};
  LETTERS.forEach((col, ci) => {
    for (let row = 1; row <= rows; row++) {
      const value = fill(col, row, ci, row - 1);
      if (value !== "") cells[`${col}${row}`] = value;
    }
  });
  return cells;
}

/* ------------------------------- datasets ------------------------------- */

const numeric = block((col, row, ci) => {
  if (ci === 4) return ["Delhi", "Mumbai", "North", "South", "East"][(row - 1) % 5];
  if (ci === 5) return `2026-0${1 + ((row - 1) % 9)}-${String(1 + ((row - 1) % 27)).padStart(2, "0")}`;
  return String(10 + ((row - 1) * 7 + ci * 3) % 90);
});

const text = block((col, row, ci) => {
  if (ci === 0) return ["aarav.sharma@mail.com", "diya-patel@work.in", "Rohan Mehta", "isha@site.org"][(row - 1) % 4];
  if (ci === 1) return ["Sharma, Aarav", "Patel, Diya", "Mehta, Rohan", "Khan, Isha"][(row - 1) % 4];
  if (ci === 2) return ["  extra  spaces  ", "  padded ", "Clean text", "  x "][(row - 1) % 4];
  if (ci === 3) return ["ABCDE1234F", "PQRSX9876Z", "LMNOP4567Q", "RSTUV1122W"][(row - 1) % 4];
  return String(10 + ((row - 1) * 3 + ci) % 80);
});

const dates = block((col, row, ci) => {
  if (ci === 0) return `2026-0${1 + ((row - 1) % 9)}-${String(1 + ((row - 1) % 27)).padStart(2, "0")}`;
  if (ci === 1) return `2026-${String(1 + ((row - 1) % 12)).padStart(2, "0")}-${String(1 + ((row + 10) % 27)).padStart(2, "0")}`;
  return String(1000 + ((row - 1) * 137 + ci * 11) % 9000);
});

/** A horizontal table: IDs across row 1, payload in the rows below. */
const horizontal: Cells = (() => {
  const cells: Cells = {};
  for (let c = 0; c < 6; c++) {
    cells[`${LETTERS[c]}1`] = String(1000 + c);
    cells[`${LETTERS[c]}2`] = ["Aarav", "Diya", "Rohan", "Isha", "Kabir", "Meera"][c];
    cells[`${LETTERS[c]}3`] = String(25000 + c * 1500);
    cells[`${LETTERS[c]}4`] = String(10 + c * 3);
  }
  return cells;
})();

/** Vertical lookup table: IDs in A, payload in E/F. */
const lookup: Cells = (() => {
  const cells: Cells = {};
  for (let r = 1; r <= 50; r++) {
    cells[`A${r}`] = String(1000 + r);
    cells[`E${r}`] = ["Aarav", "Diya", "Rohan", "Isha", "Kabir"][r % 5];
    cells[`F${r}`] = String(25000 + r * 700);
  }
  return cells;
})();

/**
 * Database-functions table with real criteria blocks, like Excel's Advanced
 * Filter form: E1:E2 = Sales > 100, F1:F2 = Name = "Aarav", G1:G2 = ID = 7.
 * The ID column is unique, which is exactly what DGET needs — it returns #NUM!
 * when the criteria match more than one row.
 */
const database: Cells = (() => {
  const cells: Cells = {
    A1: "ID", B1: "Name", C1: "Sales", D1: "Qty",
    E1: "Sales", E2: ">100",
    F1: "Name", F2: "Aarav",
    G1: "ID", G2: "7",
  };
  for (let r = 2; r <= 50; r++) {
    cells[`A${r}`] = String(r - 1);
    cells[`B${r}`] = ["Aarav", "Diya", "Rohan"][r % 3];
    cells[`C${r}`] = String(100 + (r * 37) % 900);
    cells[`D${r}`] = String(1 + (r % 20));
  }
  return cells;
})();

/** A small block, for array-shape functions. */
const array: Cells = (() => {
  const cells: Cells = {};
  for (let r = 1; r <= 12; r++) {
    for (let c = 0; c < 3; c++) cells[`${LETTERS[c]}${r}`] = String(r * 10 + c);
  }
  return cells;
})();

/** Cash flows: money out in B1, money in after that, dates in A. */
const cashflow: Cells = (() => {
  // Twelve monthly dates so every cash-flow function sees equal-length lists.
  const cells: Cells = {};
  const months = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];
  months.forEach((month, index) => {
    cells[`A${index + 1}`] = `2026-${month}-01`;
    cells[`B${index + 1}`] = index === 0 ? "-600000" : "56000";
  });
  return cells;
})();

/** Repeating values + a stable list, for MODE / RANK / MEDIAN style work. */
const repeated = block((col, row, ci) => {
  if (ci === 0) return String([5, 7, 7, 9, 7, 11, 13, 7][(row - 1) % 8]);
  if (ci === 1) return String(20 + ((row - 1) % 6) * 5);
  return String(1 + ((row - 1) * 3) % 50);
});

/** One cell already holding a formula, so FORMULATEXT/FORMULA can read it. */
const withFormula: Cells = { ...numeric, D1: "=SUM(A1:A10)" };

/** Nothing here: the web functions are blocked by design, so the sheet is empty. */
const web: Cells = { A1: "NSE:RELIANCE", B1: "GST report" };

export const FORMULA_DATASETS: FormulaDataset[] = [
  {
    id: "numeric",
    label: "Numbers + region + date",
    tell: "A, B, C, D = numbers, E = city ka naam, F = date (rows 1-60).",
    cells: numeric,
  },
  {
    id: "text",
    label: "Text / emails / PAN",
    tell: "A = email id, B = “Sharma, Aarav” style naam, C = extra spaces wala text, D = PAN number.",
    cells: text,
  },
  {
    id: "dates",
    label: "Dates + amounts",
    tell: "A = start date, B = end date, C, D, E = amounts (rows 1-60).",
    cells: dates,
  },
  {
    id: "horizontal",
    label: "Horizontal table (HLOOKUP)",
    tell: "Row 1 = ID (1000-1005), row 2 = name, row 3 = salary, row 4 = qty.",
    cells: horizontal,
  },
  {
    id: "lookup",
    label: "Lookup table",
    tell: "A = EmpID (1001-1050), E = name, F = salary.",
    cells: lookup,
  },
  {
    id: "database",
    label: "Database + criteria",
    tell: "A1:D50 = table (ID / Name / Sales / Qty), E1:E2 = Sales > 100, F1:F2 = Name Aarav, G1:G2 = ID 7.",
    cells: database,
  },
  {
    id: "array",
    label: "Small block",
    tell: "A1:C12 = 10,11,12 … 120 — array functions ke liye chhota block.",
    cells: array,
  },
  {
    id: "cashflow",
    label: "Cash flows",
    tell: "A1:A12 = har mahine ki date, B1 = −6,00,000 (investment), B2:B12 = 56,000 mahina.",
    cells: cashflow,
  },
  {
    id: "repeated",
    label: "Repeating values",
    tell: "A = 5,7,7,9,7,… (repeat), B = 20,25,30…, C = 1-50.",
    cells: repeated,
  },
  {
    id: "web",
    label: "Web functions",
    tell: "Khaali sheet — WEBSERVICE / IMAGE / STOCKHISTORY browser mein band hain, isliye jawab #BLOCKED! hi aata hai.",
    cells: web,
  },
  {
    id: "formula-cell",
    label: "Sheet with a formula",
    tell: "A, B, C = numbers, aur D1 mein pehle se formula =SUM(A1:A10) hai.",
    cells: withFormula,
  },
];

export const DATASET_BY_ID: Record<string, FormulaDataset> = Object.fromEntries(
  FORMULA_DATASETS.map((set) => [set.id, set]),
);
