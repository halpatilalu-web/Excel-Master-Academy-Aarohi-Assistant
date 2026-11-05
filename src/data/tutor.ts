import { CHAPTERS } from "./chapters";
import { getChapterRich } from "./diplomaModules";
import { FORMULAS } from "./formulas";
import { SHORTCUTS } from "./shortcuts";
import { VBA } from "./vba";

interface Entry {
  id: string;
  keys: string[];
  hi: string;
  en: string;
  example: string;
  followUp: string;
}

const KB: Entry[] = [
  {
    id: "vlookup",
    keys: ["vlookup", "v lookup"],
    en: "🇬🇧 **VLOOKUP (Vertical Lookup)** searches for an ID down the FIRST column of a table and returns a value from the Nth column to the right.",
    hi: "🇮🇳 **VLOOKUP** table ke pehle column mein ID dhundh kar usi row ke daayen (right) wale column se value wapas deta hai.",
    example:
      "Formula: `=VLOOKUP(A2, $F$2:$H$100, 3, 0)`\n• `A2` = What to find (EmpID)\n• `$F$2:$H$100` = Table locked with F4\n• `3` = 3rd column of table\n• `0` = Exact match (Always use 0!)\n• Fix `#N/A`: `=IFERROR(VLOOKUP(A2,$F$2:$H$100,3,0), \"Not Found\")`",
    followUp: "Chaho to poochho: 'XLOOKUP aur VLOOKUP mein kya farq hai?' ya 'VLOOKUP mein #N/A kyun aata hai?'",
  },
  {
    id: "xlookup",
    keys: ["xlookup", "x lookup"],
    en: "🇬🇧 **XLOOKUP** is Excel's modern lookup king! Unlike VLOOKUP, it looks Left or Right, doesn't need column counting, and includes built-in 'Not Found' handling.",
    hi: "🇮🇳 **XLOOKUP** naya aur sabse taakatwar lookup function hai! Yeh left aur right dono taraf dhundh sakta hai aur column insert hone par tootta nahi.",
    example:
      "Formula: `=XLOOKUP(A2, F2:F100, D2:D100, \"ID Missing\")`\n• Multi-Criteria: `=XLOOKUP(1, (A:A=G2)*(B:B=H2), D:D)`\n• Reverse search (latest entry): set 6th argument to `-1`!",
    followUp: "Try asking: 'Multi-criteria XLOOKUP example do' or open the 3D Lookup Laser in 3D Studio!",
  },
  {
    id: "index-match",
    keys: ["index", "match"],
    en: "🇬🇧 **INDEX + MATCH** works in ALL Excel versions (even 2010–2019), supports left-lookups, and handles 2-way Row × Column matrix lookups!",
    hi: "🇮🇳 **INDEX + MATCH** ki jodi har Excel version mein chalti hai: `MATCH` row/column ka number batata hai aur `INDEX` us jagah se value utha lata hai.",
    example:
      "• 1-Way: `=INDEX(D2:D100, MATCH(A2, F2:F100, 0))`\n• 2-Way Matrix: `=INDEX(B2:M20, MATCH(G2,A2:A20,0), MATCH(H1,B1:M1,0))`",
    followUp: "Poochho: '2-way INDEX MATCH kaise lagayein?'",
  },
  {
    id: "data-cleaning",
    keys: ["clean", "trim", "proper", "dirty", "data cleaning", "space", "textsplit", "text to columns"],
    en: "🇬🇧 **Data Cleaning** turns messy ERP/CSV exports into clean structured tables using `TRIM`, `CLEAN`, `PROPER`, `TEXTSPLIT`, and `Remove Duplicates`.",
    hi: "🇮🇳 **Data Cleaning** se gande office data ke faltu spaces, chhupa kachra, mixed text-numbers aur duplicates ko ekdum saaf kiya jata hai.",
    example:
      "• Golden Formula: `=PROPER(TRIM(CLEAN(A2)))`\n• Split by comma/pipe: `=TEXTSPLIT(A2, \"|\")` or `Data → Text to Columns`\n• Fix Errors: `=IFERROR(formula, \"\")`",
    followUp: "Chaho to Practical Lab mein '2. Data Cleaning Lab' live sheet par abhi try karo!",
  },
  {
    id: "conditional-formatting",
    keys: ["conditional formatting", "highlight", "color scale", "data bar", "row highlight"],
    en: "🇬🇧 **Conditional Formatting** automatically colors cells, adds progress bars, or highlights entire rows when live conditions are met.",
    hi: "🇮🇳 **Conditional Formatting** shart poori hote hi cell ya poori row ka rang apne aap badal deta hai (jaise Marks < 33 par Red!).",
    example:
      "• Path: `Home → Conditional Formatting`\n• **Highlight Entire Row** (select `A2:F100`): New Rule → Formula: `=$E2=\"Overdue\"` (lock ONLY column E with `$`!)",
    followUp: "Try asking: 'Poori row highlight mein $E2 hi kyun likhte hain?'",
  },
  {
    id: "data-validation",
    keys: ["validation", "dropdown", "drop down", "indirect", "dependent"],
    en: "🇬🇧 **Data Validation** prevents wrong data entry before it happens — using clickable Dropdown Lists, number limits, and cascading `=INDIRECT(A2)` menus.",
    hi: "🇮🇳 **Data Validation** galat spelling aur galat numbers ko type hote waqt hi rok deta hai aur cell mein neat Dropdown List banata hai.",
    example:
      "• Simple Dropdown: `Data → Data Validation → Allow: List → Source: Paid, Pending, Overdue`\n• Dependent Dropdown: Name city lists by State, then use `=INDIRECT(A2)`\n• Block Duplicates: Custom formula `=COUNTIF($A$2:$A$100, A2)=1`",
    followUp: "Keyboard tip: Cell par `Alt + Down Arrow` dabakar bina mouse ke dropdown kholo!",
  },
  {
    id: "pivot",
    keys: ["pivot", "slicer", "timeline"],
    en: "🇬🇧 **Pivot Tables** summarize 100,000+ rows in seconds with zero formulas! Add **Slicers** & **Timelines** for 1-click interactive filtering.",
    hi: "🇮🇳 **Pivot Table** hazaaron rows ka turant summary nikalta hai: बस `Ctrl+T` Table banao → `Insert → PivotTable` → Rows aur Values mein drag karo!",
    example:
      "1) `Ctrl + T` on raw data (`tblSales`)\n2) `Insert → PivotTable`\n3) Drag `Region` → Rows, `Month` → Columns, `Amount` → Values\n4) Add Slicer → Right-click → `Report Connections` to link all charts!\n5) Refresh anytime with `Alt + F5`.",
    followUp: "3D Studio mein '🧊 3D Pivot Data Cube' ghumakar dekho!",
  },
  {
    id: "dashboard",
    keys: ["dashboard", "chart", "graph", "kpi", "waterfall", "combo"],
    en: "🇬🇧 **Excel Dashboards** present 4–5 KPI cards, 3–4 clear charts (Combo, Bar, Doughnut, Waterfall), and connected Slicers on ONE clean gridline-free page.",
    hi: "🇮🇳 **Executive Dashboard** ek hi screen par KPI Cards, Charts aur Slicers dikhata hai taaki manager 5 second mein poora business samajh le.",
    example:
      "• Best Architecture: `01_Data` → `02_Pivots` → `03_Dashboard`\n• Instant chart shortcut: `Alt + F1`\n• Hide Gridlines: `View → uncheck Gridlines`",
    followUp: "Charts & Dashboards section mein 29 animated charts aur 6 downloadable `.xlsx` templates dekho!",
  },
  {
    id: "power-query",
    keys: ["power query", "unpivot", "etl", "merge queries", "append", "from folder"],
    en: "🇬🇧 **Power Query (Get & Transform)** automates importing and cleaning files! Record steps once — click **Refresh** next month and your report updates in 2 seconds.",
    hi: "🇮🇳 **Power Query** bina formula aur bina VBA ke 50 CSV/Excel files ko jodata, saaf karta aur Unpivot karta hai — agle mahine sirf `Refresh` dabao!",
    example:
      "• Combine 12 monthly CSVs: `Data → Get Data → From File → From Folder`\n• Fix wide Jan/Feb/Mar columns: Select Product → Right-click → `Unpivot Other Columns`\n• Replace VLOOKUPs: `Home → Merge Queries`",
    followUp: "Poochho: 'Unpivot Columns kab use karte hain?'",
  },
  {
    id: "vba",
    keys: ["vba", "macro", "xlsm", "alt+f11", "sub ", "loop"],
    en: "🇬🇧 **VBA & Macros** automate repetitive Excel tasks! Use the Macro Recorder for quick formatting, or open `Alt + F11` to write loops and 1-click PDF exporters.",
    hi: "🇮🇳 **VBA Macros** roz ke ghanton wale kaam ko 1 button click mein badal dete hain! Macro wali file hamesha `.xlsm` mein save karo.",
    example:
      "```vba\nSub HighlightPassFail()\n  Dim r As Long\n  For r = 2 To Cells(Rows.Count, 1).End(xlUp).Row\n    If Cells(r, 2).Value >= 40 Then Cells(r, 3).Value = \"Pass\" Else Cells(r, 3).Value = \"Fail\"\n  Next r\nEnd Sub\n```",
    followUp: "3D Studio mein '🤖 3D VBA Macro Loop' live chalta hua dekho!",
  },
  {
    id: "sumifs-countifs",
    keys: ["sumifs", "sumif", "countifs", "countif"],
    en: "🇬🇧 **SUMIFS & COUNTIFS** add or count rows matching multiple conditions (e.g., Region = 'North' AND Product = 'Laptop').",
    hi: "🇮🇳 **SUMIFS** aur **COUNTIFS** kai sharton ke hisaab se jodte ya ginte hain. Yaad rakho: `SUMIFS` mein `sum_range` SABSE PEHLE aata hai!",
    example:
      "• `=SUMIFS(D2:D500, B2:B500, \"North\", C2:C500, \"Laptop\")`\n• `=COUNTIFS(B2:B500, \"North\", D2:D500, \">=10000\")`",
    followUp: "Poochho: 'SUMIF aur SUMIFS ke syntax mein kya antar hai?'",
  },
  {
    id: "if-ifs",
    keys: ["nested if", "ifs", "if(", "if function", "logical", "and(", "or("],
    en: "🇬🇧 **IF, IFS, AND & OR** build smart decision rules for Pass/Fail, Grades, Tax Slabs, and Bonus eligibility.",
    hi: "🇮🇳 **IF** aur **IFS** shart check karke faisla lete hain; ek se zyada sharton ke liye `AND` (sab sahi) ya `OR` (koi ek sahi) lagao.",
    example:
      "• Simple: `=IF(B2>=40, \"Pass\", \"Fail\")`\n• Multi-grade: `=IFS(B2>=80,\"A\", B2>=60,\"B\", B2>=40,\"C\", TRUE,\"F\")`\n• Combined: `=IF(AND(B2>=40, C2>=75%), \"Eligible\", \"Hold\")`",
    followUp: "Want a quick practice question on IF/IFS? Type 'Quiz lo'!",
  },
  {
    id: "dynamic-365",
    keys: ["filter(", "unique(", "sort(", "let(", "lambda", "vstack", "sumproduct", "#spill"],
    en: "🇬🇧 **Modern Excel 365 Functions** (`FILTER`, `UNIQUE`, `SORT`, `LET`, `LAMBDA`, `VSTACK`) spill live arrays and let you define custom functions without VBA!",
    hi: "🇮🇳 **Excel 365 Dynamic Functions** ek cell mein likhne par poori live list spill kar dete hain, aur `LET`/`LAMBDA` formula ko super-fast banate hain!",
    example:
      "• `=FILTER(A2:D100, C2:C100=\"Delhi\", \"No rows\")`\n• `=SORT(UNIQUE(B2:B100))`\n• `=LET(s, SUM(B2:B50), IF(s>50000, s*0.1, 0))`",
    followUp: "Note: Agar `#SPILL!` aaye to neeche ke bhare cells khali kar do!",
  },
  {
    id: "errors",
    keys: ["#n/a", "#value", "#ref", "#div/0", "#name", "#####", "error"],
    en: "🇬🇧 **Excel Error Doctor**:\n• `#N/A` → Lookup ID not found (check `TRIM` or wrap in `IFNA`)\n• `#VALUE!` → Text mixed in math\n• `#REF!` → Referenced column/row was deleted\n• `#DIV/0!` → Divided by zero (`=IFERROR(A2/B2, 0)`)\n• `#NAME?` → Function name typo\n• `#####` → Column too narrow (double-click header border!)",
    hi: "🇮🇳 **Excel Error Ilaj**:\n• `#N/A` → ID nahi mili (extra space `TRIM` se hatao)\n• `#VALUE!` → Number aur text mix ho gaye\n• `#REF!` → Formula wala cell delete ho gaya\n• `#DIV/0!` → Zero se divide hua (`IFERROR` lagao)",
    example: "Safe wrapper: `=IFERROR(YourFormula, \"Check Input\")`",
    followUp: "Kisi khaas formula mein error aa raha hai? Woh formula paste karo, main abhi check karti hoon!",
  },
  {
    id: "interview",
    keys: ["interview roleplay", "mock interview", "interview", "job", "mis analyst"],
    en: "🇬🇧 **MIS / Data Analyst Mock Interview Mode Activated!** Let's practice real corporate Excel interview questions one by one.",
    hi: "🇮🇳 **Chalo Mock Interview shuru karte hain!** Main interviewer hoon — neeche pehla sawal hai, apna jawab likho phir main feedback dungi!",
    example:
      "🎤 **Interview Question 1:**\nYour manager gives you a table where `EmpID` is in **Column C** and `Employee Name` is in **Column A**. Why will `VLOOKUP` fail here, and which formula will you write instead?",
    followUp: "Apna jawab type karo (e.g., XLOOKUP ya INDEX-MATCH ke saath)!",
  },
  {
    id: "quiz-me",
    keys: ["quiz lo", "quiz me", "test me", "sawal pucho", "practice question"],
    en: "🇬🇧 **Live Mini-Quiz!** Let's test your Excel reflexes:",
    hi: "🇮🇳 **Live Quiz Challenge!** Dekhte hain aapka jawab kitna sahi aata hai:",
    example:
      "❓ **Question:** You select `A2:F50` to highlight every entire row where Status in Column E is `\"Pending\"`. Which formula is 100% right?\nA) `=E2=\"Pending\"`\nB) `=$E$2=\"Pending\"`\nC) `=$E2=\"Pending\"`\nD) `=E$2=\"Pending\"`",
    followUp: "Reply with A, B, C, or D — main turant reason ke saath bataungi!",
  },
  {
    id: "office-roleplay",
    keys: ["office roleplay", "monthly sales report", "sales report banana"],
    en: "🇬🇧 **Office Manager Scenario:** Welcome to Monday morning! We have 5,000 messy rows of regional sales and need a 1-page Executive Summary by 11 AM.",
    hi: "🇮🇳 **Office Roleplay:** Main tumhari Reporting Manager hoon! Humare paas 5,000 rows ka raw sales data aaya hai aur 1-page Dashboard banana hai.",
    example:
      "Step 1: Clean spaces (`TRIM`) & convert to `Ctrl + T` Table (`tblSales`)\nStep 2: Insert PivotTables (Region-wise & Month-wise)\nStep 3: Build KPI Cards + Combo Chart + Slicers!\n\n👉 **Batao:** Pehle raw data par `Ctrl + T` lagane ka sabse bada fayda kya hoga?",
    followUp: "Apna jawab likho — hum milkar poora project discuss karenge!",
  },
  {
    id: "color-theory",
    keys: ["color theory", "colour theory", "palette", "report color", "complementary", "monochromatic"],
    en: "🇬🇧 **Excel Report Color Theory:** Follow the **2–3 Main Shades Rule** — 1 dark corporate header (#1B4F72 Navy or #145A32 Dark Green) + 1 chart accent + neutral white/light-gray backgrounds.",
    hi: "🇮🇳 **Report Color Theory:** Rainbow sheet mat banao! Sirf 2–3 shades rakho, gahre header par safed bold text lagao, aur laal/peela rang sirf KPI alerts ke liye bacha kar rakho.",
    example:
      "• **Executive Navy:** `#1B4F72` + `#F4F6F7` + `#FFFFFF`\n• **Classic Accounting:** `#145A32` + `#F5F0E6` + `#1C2833`\n• **Modern Teal:** `#2C3E50` + `#0E9AA7` + `#EAEDED`",
    followUp: "Pro Toolkit ke 'Color Theory Studio' tab mein live preview aur HEX/RGB copy karke dekho!",
  },
  {
    id: "gst-accounts",
    keys: ["gst", "cgst", "sgst", "igst", "reverse gst", "taxable", "invoice", "payroll", "tds"],
    en: "🇬🇧 **GST Billing & Reverse GST Formula:** Same State (`BuyerState = HomeState`) splits 18% into **9% CGST + 9% SGST**; Inter-State charges **18% IGST**. To extract base price from GST-inclusive MRP, divide by `(1 + GST%)`!",
    hi: "🇮🇳 **GST Invoice Niyam:** Same State mein `9% CGST + 9% SGST` aur alag State mein `18% IGST` lagta hai. GST sahit MRP ₹1,180 se asli keemat nikalne ke liye `=1180/(1+18%)` likho!",
    example:
      "• **CGST/SGST:** `=IF(C2=$G$1, ROUND(D2*9%, 2), 0)`\n• **IGST:** `=IF(C2<>$G$1, ROUND(D2*18%, 2), 0)`\n• **Reverse Base Price:** `=E2 / 1.18`",
    followUp: "Chaho to Lab ke '7. GST Tax Invoice' live spreadsheet mein khud practice karo!",
  },
  {
    id: "all-12-errors",
    keys: ["#null!", "#calc!", "#connect!", "#blocked!", "12 errors", "excel error"],
    en: "🇬🇧 **Complete 12-Error Quick Doctor:** Beyond classic `#DIV/0!`, `#N/A`, `#VALUE!`, `#REF!`, `#NAME?`, `#NUM!`, and `#######`, watch out for `#NULL!` (space instead of `:`), `#SPILL!` (blocked below), `#CALC!` (empty FILTER), `#CONNECT!` (offline query), and `#BLOCKED!` (Trust Center)!",
    hi: "🇮🇳 **12 Excel Errors Ilaj:** `=SUM(A1 A10)` mein colon chhootne par `#NULL!` aata hai; FILTER khali aane par `#CALC!`; neeche cell bhara hone par `#SPILL!`; aur security rokne par `#BLOCKED!` dikhta hai.",
    example:
      "• Fix `#NULL!`: `=SUM(A1:A10)`\n• Fix `#CALC!`: `=FILTER(A2:C50, B2:B50=\"West\", \"No Match\")`\n• Fix `#DIV/0!`: `=IFERROR(A2/B2, 0)`",
    followUp: "Kisi khaas error code ka naam likho ya Pro Toolkit → '12 Errors Doctor' kholo!",
  },
  {
    id: "database-dsum",
    keys: ["dsum", "dget", "daverage", "dcount", "database function"],
    en: "🇬🇧 **Database Functions (`DSUM`, `DGET`, `DAVERAGE`):** Evaluate multi-column criteria written in a separate Criteria Box on the sheet! Auditors love `DGET` because it throws `#NUM!` if duplicate IDs exist.",
    hi: "🇮🇳 **Database Functions:** `=DSUM(A1:E500, \"Sales\", G1:H2)` criteria table padh kar turant jod deta hai, aur `DGET` duplicate Employee ID hone par `#NUM!` dekar galti pakadwa deta hai!",
    example: "• `=DSUM(A1:E500, \"Sales\", G1:H2)`\n• `=DGET(A1:E500, \"Salary\", G1:G2)`",
    followUp: "Yaad rakho: Criteria range mein khali row mat chhodna warna poori table select ho jayegi!",
  },
  {
    id: "safety",
    keys: ["selfie", "tumhari photo", "photo bhejo", "photo bhej", "flirt", "romantic", "seductive", "girlfriend"],
    en: "🇬🇧 I'm an illustrated AI study companion for Excel Master Academy, so I don't share personal photos or engage in romantic roleplay.",
    hi: "🇮🇳 Main ek AI illustrated Excel study saathi hoon — personal photos ya romantic roleplay nahi karti. Chalo wapas Excel Diploma topics, interview prep ya live formulas par focus karein!",
    example: "Try asking about `XLOOKUP`, `Power Query`, `VBA PDF Macro`, or `Interview Roleplay`!",
    followUp: "Kaun sa Excel topic aaj master karna hai?",
  },
  {
    id: "greet",
    keys: ["namaste", "hello", "hi", "hey", "kaise ho", "help", "diploma"],
    en: "🇬🇧 **Hello & Welcome to the Excel Diploma Course!** I'm **Aarohi**, your live bilingual AI Excel tutor & study partner.",
    hi: "🇮🇳 **Namaste doston!** Main **Aarohi** hoon — Basic Excel se lekar Formulas, Data Cleaning, Lookups, Pivot, Dashboards, Power Query aur VBA tak har topic Hindi + English dono mein samjhaungi!",
    example:
      "You can ask me:\n• Any Excel concept (`XLOOKUP`, `Conditional Formatting`, `Power Query Unpivot`)\n• Paste any formula (`=SUMIFS(...)`) for a line-by-line breakdown\n• Say **'Interview roleplay'** or **'Quiz lo'** for live practice!",
    followUp: "Bolo, aaj kis chapter ya formula se shuru karein? 🚀",
  },
];

export const SUGGESTIONS = [
  "XLOOKUP vs VLOOKUP Hindi + English mein samjhao",
  "GST Invoice CGST/SGST vs IGST formula batao",
  "#NULL!, #SPILL! aur #CALC! error kaise theek karein?",
  "Report Color Theory ke 3 best palettes batao",
  "VBA se Low-Stock highlight macro kaise banayein?",
  "Quiz lo — test my Excel!",
];

export function aarohiReply(input: string, historyTexts: string[] = []): string {
  const raw = input.trim();
  const t = raw.toLowerCase();

  // Structured 5-part AI Automation Prompt handler (from ProToolkit!)
  if (t.includes("i have an excel workbook named")) {
    const wb = /workbook named '([^']+)'/i.exec(raw)?.[1] ?? "Workbook.xlsx";
    const sh = /sheet '([^']+)'/i.exec(raw)?.[1] ?? "Sheet1";
    const rng = /range '([^']+)'/i.exec(raw)?.[1] ?? "A1:D100";
    const out = /displayed in '([^']+)'/i.exec(raw)?.[1] ?? "G2";
    const wantsVba = t.includes("vba macro");
    const wantsPq = t.includes("power query");
    if (wantsVba) {
      return `🤖 **Custom VBA Automation Ready for \`${wb}\` (\`${sh}!${rng}\`):**\n\n\`\`\`vba\nSub RunCustomAutomation()\n    Dim ws As Worksheet\n    Application.ScreenUpdating = False\n    Set ws = ThisWorkbook.Sheets("${sh}")\n    ' Operating on ${rng} -> Output: ${out}\n    ws.Range("${rng}").Columns.AutoFit\n    Application.ScreenUpdating = True\n    MsgBox "Automation completed on ${sh}!", vbInformation\nEnd Sub\n\`\`\`\n\n🇬🇧 **Steps:** Save as \`.xlsm\` → Press \`Alt + F11\` → Insert Module → Paste & test line-by-line with \`F8\`.\n🇮🇳 **Steps:** File ko \`.xlsm\` mein save karein → \`Alt + F11\` dabayein → Module mein paste karke \`F5\` se chalayein!`;
    }
    if (wantsPq) {
      return `⚙️ **Power Query ETL Blueprint for \`${wb}\` (\`${sh}!${rng}\`):**\n\n1. Select \`${rng}\` → Press \`Ctrl + T\` to create a Table.\n2. Go to **Data → From Table/Range**.\n3. Apply Trim, Filter/Group By or Unpivot in Query Editor.\n4. Click **Close & Load To… → Existing Worksheet \`${out}\`**!\n\n🇮🇳 Agle mahine naya data aane par sirf **Data → Refresh All (\`Ctrl + Alt + F5\`)** dabayein!`;
    }
    return `🧮 **Custom Formula Solution for \`${wb}\` (\`${sh}!${rng}\` → \`${out}\`):**\n\n• **Dynamic Filter/Lookup:** \`=IFERROR(FILTER('${sh}'!${rng}, '${sh}'!A2:A100<>""), "No Match")\`\n• **Conditional Summary:** \`=SUMIFS('${sh}'!$D$2:$D$100, '${sh}'!$A$2:$A$100, F2)\`\n\n🇬🇧 Paste in \`${out}\` and lock fixed ranges with \`F4\` (\`$\`).\n🇮🇳 \`${out}\` cell mein formula paste karein — \`IFERROR\` error aane se bachayega!`;
  }

  // Check if user answered A/B/C/D to the live quiz!
  const lastBot = [...historyTexts].reverse().find((m) => m.includes("A2:F50") && m.includes("$E2"));
  if (lastBot && /^[abcd]\b/i.test(raw)) {
    const pick = raw[0].toUpperCase();
    if (pick === "C") {
      return "🎉 **Bilkul Sahi / Spot On! Option C (`=$E2=\"Pending\"`) is 100% Correct!**\n\n🇬🇧 Locking ONLY Column E (`$E`) ensures columns A through F all check Column E, while leaving row `2` unlocked lets each row check its own status!\n🇮🇳 Sirf `E` ke aage `$` lagane se poori row A se F tak usi row ka Status dekhti hai.\n\nAgla sawal chahiye? Likho: **'Next interview question'** ya koi bhi formula pucho!";
    }
    return `😊 **Achha try kiya!** Aapne **${pick}** chuna, lekin sahi jawab **C (\`=$E2="Pending"\`)** hai!\n\n🇬🇧 Why? \`$E\` locks the column so A..F all look at column E, while unlocked \`2\` moves row-by-row (2, 3, 4…).\n🇮🇳 \`$E$2\` karne se saari rows sirf Row 2 ko dekhengi! Isliye sirf column lock (\`$E2\`) karte hain.`;
  }

  // Live Formula Explainer if user pastes an Excel formula starting with '='!
  if (raw.startsWith("=")) {
    const fnMatch = /^=([A-Z0-9._]+)\((.*)\)$/i.exec(raw);
    const fnName = fnMatch?.[1]?.toUpperCase();
    const formulaDoc = fnName ? FORMULAS.find((f) => f.name.toUpperCase() === fnName) : undefined;
    return [
      `🧮 **Live Formula Breakdown:** \`${raw}\``,
      formulaDoc
        ? `\n🇬🇧 **Function (${formulaDoc.name}):** Category *${formulaDoc.cat}* — syntax \`${formulaDoc.syntax}\`\n🇮🇳 **Matlab:** ${formulaDoc.hindi}\n📌 **Standard Example:** \`${formulaDoc.ex}\``
        : "\n🇬🇧 This formula starts with `=` so Excel evaluates cell references and operators dynamically.\n🇮🇳 Yeh formula `=` se shuru hokar diye gaye cells par live calculation karta hai.",
      "\n💡 **Checklist:** Make sure lookup/tax ranges are locked with `F4` (`$A$1`) before dragging down, and wrap with `=IFERROR(..., \"\")` if missing values are possible!",
    ].join("\n");
  }

  // Match rich bilingual KB entries
  const hits = KB.filter((e) => e.keys.some((k) => t.includes(k)));
  if (hits.length) {
    hits.sort(
      (a, b) =>
        Math.max(...b.keys.filter((k) => t.includes(k)).map((k) => k.length)) -
        Math.max(...a.keys.filter((k) => t.includes(k)).map((k) => k.length)),
    );
    const best = hits[0];
    return `${best.en}\n\n${best.hi}\n\n${best.example}\n\n👉 *${best.followUp}*`;
  }

  // Search 249 Formulas library!
  const fHit = FORMULAS.find(
    (f) => t.includes(f.name.toLowerCase()) && f.name.length >= 3,
  );
  if (fHit) {
    return `ƒx **${fHit.name} (${fHit.cat} Function)**\n\n• **Syntax:** \`${fHit.syntax}\`\n• 🇮🇳 **Hindi Explanation:** ${fHit.hindi}\n• 🇬🇧 **Example:** \`${fHit.ex}\`${
      fHit.ch > 0 ? `\n• 📘 **Diploma Chapter:** Chapter ${fHit.ch}` : ""
    }\n\nChaho to poochho: *'${fHit.name} ka ek aur office example do'*!`;
  }

  // Search VBA library!
  const vbaHit = VBA.find((v) =>
    v.title
      .toLowerCase()
      .split(/\W+/)
      .some((w) => w.length > 3 && t.includes(w)),
  );
  if (vbaHit && (t.includes("code") || t.includes("vba") || t.includes("pdf") || t.includes("macro"))) {
    return `🤖 **VBA Snippet — ${vbaHit.title} (${vbaHit.level})**\n\n🇮🇳 ${vbaHit.hindi}\n\n\`\`\`vba\n${vbaHit.code}\n\`\`\`\n\n*How to run:* Press \`Alt + F11\` → Insert → Module → Paste → Press \`F5\`!`;
  }

  // Search Shortcuts!
  if (t.includes("shortcut") || t.includes("ctrl") || t.includes("key")) {
    const sHits = SHORTCUTS.filter((s) =>
      `${s.win} ${s.desc}`.toLowerCase().split(/\W+/).some((w) => w.length > 2 && t.includes(w)),
    ).slice(0, 5);
    if (sHits.length) {
      return (
        "⌨️ **Matching Excel Shortcuts:**\n\n" +
        sHits.map((s) => `• **${s.win}** (Mac: ${s.mac}) → ${s.desc}`).join("\n")
      );
    }
  }

  // Search all 40 Diploma Chapters with Bilingual notes!
  const words = t.split(/\W+/).filter((w) => w.length > 2);
  const ch = CHAPTERS.find((c) => {
    const rich = getChapterRich(c.n);
    const hay = `${c.title} ${c.intro} ${rich.enIntro}`.toLowerCase();
    return words.some((w) => hay.includes(w));
  });
  if (ch) {
    const rich = getChapterRich(ch.n);
    return [
      `📘 **Chapter ${ch.n}: ${ch.title}** (${ch.level})`,
      `\n🇬🇧 **English:** ${rich.enIntro}\n${rich.enPoints.slice(0, 3).map((p) => "• " + p).join("\n")}`,
      `\n🇮🇳 **Hindi:** ${ch.intro}\n${ch.points.slice(0, 3).map((p) => "• " + p).join("\n")}`,
      ch.formula ? `\n🧮 **Formula:** \`${ch.formula.f}\` — ${ch.formula.note}` : "",
      `\n💡 **Pro Tip:** ${rich.enTip}`,
    ]
      .filter(Boolean)
      .join("\n");
  }

  return "✨ **Main Aarohi hoon — aapki Bilingual Excel Diploma AI Saathi!**\n\n🇬🇧 Ask me any topic in English or Hindi: `Basic Excel`, `Data Cleaning`, `Conditional Formatting`, `Data Validation`, `VLOOKUP / XLOOKUP / INDEX-MATCH`, `Pivot Tables`, `Dashboards`, `Power Query`, or `VBA Macros` — or paste any `=FORMULA(...)` to debug it!\n\n🇮🇳 Aap kisi bhi formula ka naam likhein (jaise `XLOOKUP`, `SUMIFS`, `Unpivot`, `VBA PDF`) ya `'Interview roleplay'` / `'Quiz lo'` likh kar live practice karein!";
}
