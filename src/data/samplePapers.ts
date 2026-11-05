export interface SamplePaper {
  id: string;
  code: string;
  emoji: string;
  titleEn: string;
  titleHi: string;
  duration: string;
  marks: number;
  mcqs: {
    qEn: string;
    qHi: string;
    opts: [string, string, string, string];
    ans: number;
    expEn: string;
    expHi: string;
  }[];
  formulaTasks: {
    scenarioEn: string;
    scenarioHi: string;
    sampleRef: string;
    modelFormula: string;
    explanationEn: string;
    explanationHi: string;
  }[];
  vivaQuestions: {
    qEn: string;
    qHi: string;
    aEn: string;
    aHi: string;
  }[];
}

export const SAMPLE_PAPERS: SamplePaper[] = [
  {
    id: "sp-1",
    code: "PAPER 01",
    emoji: "🟢",
    titleEn: "Diploma Semester 1 — Basic Excel & Office Executive",
    titleHi: "Sample Paper 1 — Basic Excel aur Office Foundation",
    duration: "60 Mins",
    marks: 100,
    mcqs: [
      {
        qEn: "Which key toggles a cell reference from A1 to $A$1 while editing a formula?",
        qHi: "Formula likhte waqt A1 ko $A$1 (Absolute Lock) karne ki shortcut key kaun si hai?",
        opts: ["F2", "F4", "F5", "F9"],
        ans: 1,
        expEn: "F4 cycles through $A$1 → A$1 → $A1 → A1.",
        expHi: "F4 dabane se cell par $ lock lagta aur badalta hai.",
      },
      {
        qEn: "What shortcut inserts a line break inside the SAME Excel cell?",
        qHi: "Ek hi cell ke andar nayi line shuru karne ka shortcut kya hai?",
        opts: ["Ctrl + Enter", "Shift + Enter", "Alt + Enter", "Ctrl + E"],
        ans: 2,
        expEn: "Alt + Enter wraps onto a new line within the same cell.",
        expHi: "Alt + Enter ek hi cell mein doosri line banata hai.",
      },
      {
        qEn: "Which Page Layout feature repeats Row 1 headers on every printed page?",
        qHi: "Har print hone wale page par upar ki Header Row repeat karne ka option kaun sa hai?",
        opts: ["Freeze Panes", "Print Titles", "Merge & Center", "Wrap Text"],
        ans: 1,
        expEn: "Freeze Panes is for screen scrolling; Print Titles ($1:$1) is for printed pages/PDF.",
        expHi: "Screen ke liye Freeze Panes aur Print/PDF ke liye Print Titles ($1:$1) lagta hai.",
      },
      {
        qEn: "What does Ctrl + E trigger in Excel 2013 and newer?",
        qHi: "Excel mein Ctrl + E dabane se kya chalta hai?",
        opts: ["Center Align", "Flash Fill", "Export PDF", "Erase Sheet"],
        ans: 1,
        expEn: "Ctrl + E runs Flash Fill to auto-complete text patterns from your example.",
        expHi: "Ctrl + E se Flash Fill chalta hai jo aapke example ka pattern seekh kar baaki cells bhar deta hai.",
      },
    ],
    formulaTasks: [
      {
        scenarioEn: "Cells B2:B25 contain Invoice Amounts, and G1 holds the fixed GST rate (18%). Write the GST formula in C2 so it can be dragged down safely.",
        scenarioHi: "B2:B25 mein Bill Amount hai aur G1 mein fixed 18% GST likha hai. C2 ke liye aisa formula likho jo neeche drag karne par bilkul sahi chale.",
        sampleRef: "B2 = 15000  |  G1 = 18%",
        modelFormula: "=B2*$G$1",
        explanationEn: "B2 stays relative (becomes B3, B4…) while $G$1 stays locked on the GST cell.",
        explanationHi: "B2 har row ke saath badlega, lekin $G$1 tax rate par pakka lock rahega.",
      },
      {
        scenarioEn: "Find the average marks of cells C2 to C50, ignoring empty cells.",
        scenarioHi: "C2 se C50 tak ke marks ka ausat (Average) nikalne ka formula likho.",
        sampleRef: "C2:C50 = Student Marks",
        modelFormula: "=AVERAGE(C2:C50)",
        explanationEn: "AVERAGE automatically ignores blank and text cells while computing the mean.",
        explanationHi: "AVERAGE khali cells ko chhod kar sahi ausat nikalta hai.",
      },
    ],
    vivaQuestions: [
      {
        qEn: "Why should we avoid 'Merge & Center' inside raw data tables?",
        qHi: "Data table ke andar 'Merge & Center' kyun nahi karna chahiye?",
        aEn: "Merged cells break Sorting, Filtering, Column Selection, and Pivot Tables. Use 'Center Across Selection' or 'Wrap Text' instead.",
        aHi: "Merge kiye hue cells Sort, Filter aur Pivot Table ko tod dete hain. Heading ke alawa table ke andar kabhi Merge mat karo.",
      },
    ],
  },
  {
    id: "sp-2",
    code: "PAPER 02",
    emoji: "🧹",
    titleEn: "Data Cleaning, Conditional Formatting & Validation Paper",
    titleHi: "Sample Paper 2 — Data Cleaning, Formatting aur Validation",
    duration: "60 Mins",
    marks: 100,
    mcqs: [
      {
        qEn: "Which formula removes BOTH non-printable line breaks AND extra spaces while capitalizing names?",
        qHi: "Kaun sa formula chhupa kachra aur faltu space dono hata kar naam ko Title Case mein badalta hai?",
        opts: ["=UPPER(A2)", "=PROPER(TRIM(CLEAN(A2)))", "=LEN(A2)", "=LEFT(A2,5)"],
        ans: 1,
        expEn: "CLEAN strips ASCII control chars, TRIM removes extra spaces, PROPER capitalizes each word.",
        expHi: "CLEAN + TRIM + PROPER data cleaning ki sabse taakatwar jodi hai.",
      },
      {
        qEn: "To highlight an ENTIRE row A2:F2 when Status in E2 is 'Overdue', what Conditional Formatting formula is needed?",
        qHi: "Jab E2 mein 'Overdue' ho to poori row A2:F2 ko laal karne ke liye kaun sa formula rule lagega?",
        opts: ['=E2="Overdue"', '=$E$2="Overdue"', '=$E2="Overdue"', '=E$2="Overdue"'],
        ans: 2,
        expEn: "Lock ONLY column E ($E2) so columns A..F all inspect column E of their own row.",
        expHi: "Sirf E ke aage $ lagane ($E2) se poori row A se F tak usi row ka Status dekhti hai.",
      },
      {
        qEn: "Which function powers dependent (cascading) State → City dropdown lists?",
        qHi: "State chunte hi sirf usi State ke Cities dikhane wale Dependent Dropdown mein kaun sa function lagta hai?",
        opts: ["INDIRECT", "ROUND", "TODAY", "ABS"],
        ans: 0,
        expEn: "=INDIRECT(A2) converts the State text in A2 into the matching Named Range of cities.",
        expHi: "=INDIRECT(A2) State ke naam ko Named Range mein badal kar cities dikhata hai.",
      },
      {
        qEn: "Which Error Alert style in Data Validation strictly blocks saving invalid input?",
        qHi: "Data Validation mein kaun sa Error Alert galat entry ko kisi haal mein save nahi hone deta?",
        opts: ["Information", "Warning", "Stop", "Note"],
        ans: 2,
        expEn: "Stop blocks invalid entry completely; Warning and Information allow override.",
        expHi: "Stop mode galat value ko bilkul enter nahi hone deta.",
      },
    ],
    formulaTasks: [
      {
        scenarioEn: "Write a Custom Data Validation formula for range A2:A100 that blocks duplicate Employee IDs.",
        scenarioHi: "A2:A100 mein duplicate Employee ID type hote hi rokne ke liye Custom Data Validation formula likho.",
        sampleRef: "Selection = A2:A100",
        modelFormula: "=COUNTIF($A$2:$A$100, A2)=1",
        explanationEn: "As soon as an ID appears a 2nd time, COUNTIF becomes 2 (not =1), triggering the Stop alert!",
        explanationHi: "Jaise hi koi ID dobara likhi jayegi, ginti 2 ho jayegi aur Excel turant rok dega!",
      },
    ],
    vivaQuestions: [
      {
        qEn: "Numbers imported from ERP are left-aligned and SUM() gives 0. How do you fix 5,000 rows in 5 seconds?",
        qHi: "ERP se aaye numbers left side chipke hain aur SUM zero aa raha hai — 5 second mein kaise theek karoge?",
        aEn: "Select the column → Data → Text to Columns → click Finish immediately (or multiply by 1 using Paste Special → Multiply).",
        aHi: "Column select karke Data → Text to Columns → seedha Finish daba do! Saare text-numbers turant asli number ban jayenge.",
      },
    ],
  },
  {
    id: "sp-3",
    code: "PAPER 03",
    emoji: "🔎",
    titleEn: "MIS Analyst Paper — Logical Functions & Advanced Lookups",
    titleHi: "Sample Paper 3 — IF, SUMIFS, VLOOKUP, XLOOKUP & INDEX-MATCH",
    duration: "75 Mins",
    marks: 100,
    mcqs: [
      {
        qEn: "Where is the sum_range placed inside a SUMIFS formula?",
        qHi: "SUMIFS formula mein jodne wala column (sum_range) kahan rakha jata hai?",
        opts: ["At the very end", "As the 1st argument", "Optional", "Inside quotes"],
        ans: 1,
        expEn: "Unlike SUMIF, SUMIFS puts sum_range FIRST, followed by criteria_range1, criteria1...",
        expHi: "SUMIF ke ulta, SUMIFS mein sum_range SABSE PEHLE aata hai!",
      },
      {
        qEn: "Why does XLOOKUP outperform VLOOKUP in corporate MIS models?",
        qHi: "Office MIS reports mein XLOOKUP ko VLOOKUP se behtar kyun maana jata hai?",
        opts: [
          "Can look left, doesn't break on column insert, has built-in if_not_found",
          "Only works on numbers",
          "Requires sorted data",
          "Cannot use exact match",
        ],
        ans: 0,
        expEn: "XLOOKUP selects lookup & return columns independently, looks in any direction, and handles missing IDs natively.",
        expHi: "XLOOKUP left bhi dekh sakta hai, column insert hone par tootta nahi aur error message khud sambhalta hai.",
      },
      {
        qEn: "What does MATCH(\"Pune\", A2:A50, 0) return?",
        qHi: "MATCH(\"Pune\", A2:A50, 0) result mein kya deta hai?",
        opts: [
          "Total sales of Pune",
          "Relative row position of 'Pune' inside A2:A50",
          "Cell color",
          "Sheet name",
        ],
        ans: 1,
        expEn: "MATCH returns the numeric position (1, 2, 3…), which INDEX then uses to fetch the value.",
        expHi: "MATCH batata hai ki 'Pune' list mein kaun se number par hai.",
      },
      {
        qEn: "What causes a #SPILL! error on FILTER() or UNIQUE()?",
        qHi: "FILTER ya UNIQUE lagane par #SPILL! error kyun aata hai?",
        opts: [
          "Non-empty cells are blocking the output range below",
          "Internet is off",
          "Font is too small",
          "Sheet is zoomed out",
        ],
        ans: 0,
        expEn: "Dynamic arrays spill into neighboring cells; clear any text/formulas in the spill zone.",
        expHi: "Dynamic formula ke neeche agar pehle se kuch likha ho to list failne ki jagah nahi milti aur #SPILL! aata hai.",
      },
    ],
    formulaTasks: [
      {
        scenarioEn: "Fetch Salary (Col D) where EmpName (Col A) equals F2 AND Month (Col B) equals G2 using XLOOKUP.",
        scenarioHi: "XLOOKUP se woh Salary (Col D) nikalo jahan EmpName (Col A) = F2 AUR Month (Col B) = G2 dono match hon.",
        sampleRef: "A2:A100=Name, B2:B100=Month, D2:D100=Salary",
        modelFormula: '=XLOOKUP(1, (A2:A100=F2)*(B2:B100=G2), D2:D100, "Not Found")',
        explanationEn: "Boolean multiplication produces 1 ONLY on the row where both conditions are TRUE.",
        explanationHi: "Dono TRUE guna hokar 1 banate hain aur XLOOKUP usi row ki Salary le aata hai.",
      },
      {
        scenarioEn: "Write a 2-way INDEX-MATCH to find sales for Product in G2 (listed in A2:A20) and Month in H1 (headers B1:M1).",
        scenarioHi: "Row mein Product (G2) aur Column mein Month (H1) dono match karke B2:M20 se bikri nikalne ka INDEX-MATCH likho.",
        sampleRef: "Data = B2:M20, Products = A2:A20, Months = B1:M1",
        modelFormula: "=INDEX(B2:M20, MATCH(G2,A2:A20,0), MATCH(H1,B1:M1,0))",
        explanationEn: "First MATCH finds the row number, second MATCH finds the column number!",
        explanationHi: "Pehla MATCH row dhundhta hai aur doosra MATCH mahine ka column!",
      },
    ],
    vivaQuestions: [
      {
        qEn: "VLOOKUP is returning #N/A even though the ID visibly exists in the table. Give 3 reasons!",
        qHi: "ID samne dikh rahi hai phir bhi VLOOKUP #N/A de raha hai — 3 mukhya kaaran batao!",
        aEn: "1) Trailing/leading spaces (fix with TRIM), 2) One ID is stored as Text and the other as Number, 3) Table range wasn't locked with F4 ($F$2:$H$100) before dragging down.",
        aHi: "1) Naam/ID ke peeche extra space hona (TRIM lagao), 2) Ek jagah ID Text aur doosri jagah Number hona, 3) Table ko F4 ($ sign) se lock na karna.",
      },
    ],
  },
  {
    id: "sp-4",
    code: "PAPER 04",
    emoji: "📊",
    titleEn: "BI & Analytics Paper — Pivot Tables, Dashboards & Power Query",
    titleHi: "Sample Paper 4 — Pivot Table, Dashboard aur Power Query",
    duration: "75 Mins",
    marks: 100,
    mcqs: [
      {
        qEn: "How do you connect ONE Slicer so it filters 4 different Pivot Charts simultaneously?",
        qHi: "Ek hi Slicer se 4 alag-alag Pivot Charts ko ek saath kaise filter karte hain?",
        opts: [
          "Right-click Slicer → Report Connections → check all 4 Pivot Tables",
          "Copy-paste Slicer 4 times",
          "Use Merge Cells",
          "Press Ctrl+P",
        ],
        ans: 0,
        expEn: "Report Connections binds one Slicer to every Pivot sharing the same PivotCache/Table.",
        expHi: "Report Connections mein saare Pivots tick karne se 1 Slicer poore dashboard ko chalata hai.",
      },
      {
        qEn: "Which Power Query command converts wide month columns (Jan, Feb, Mar…) into tall 'Month | Sales' rows?",
        qHi: "Jan, Feb, Mar wale chaudi columns ko seedhi 'Month | Sales' rows mein kaun badalta hai?",
        opts: ["Unpivot Other Columns", "Keep Top Rows", "Split by Space", "Promote Headers"],
        ans: 0,
        expEn: "Select key columns (like Branch/Product) → Right-click → Unpivot Other Columns.",
        expHi: "Product column select karke 'Unpivot Other Columns' dabane se table Pivot-ready ban jati hai.",
      },
      {
        qEn: "Which chart best illustrates how Opening Revenue steps up/down via expenses into Net Profit?",
        qHi: "Revenue se kharche ghatne ke baad Net Profit kaise bacha — yeh dikhane ke liye best chart?",
        opts: ["Pie Chart", "Waterfall Chart", "Radar Chart", "Scatter Plot"],
        ans: 1,
        expEn: "Waterfall charts visualize positive and negative bridges from starting to ending value (remember 'Set as Total'!).",
        expHi: "Plus-minus ka safar (Profit Bridge) dikhane ke liye Waterfall Chart sabse shandar hai.",
      },
      {
        qEn: "What is the keyboard shortcut to Refresh a Pivot Table or Power Query output?",
        qHi: "Pivot Table ya Power Query ko Refresh karne ka shortcut kya hai?",
        opts: ["Alt + F5 (or Ctrl + Alt + F5 for Refresh All)", "Ctrl + D", "Shift + F3", "Alt + F4"],
        ans: 0,
        expEn: "Alt+F5 refreshes the active Pivot/Query; Ctrl+Alt+F5 refreshes the entire workbook.",
        expHi: "Alt+F5 active Pivot ko aur Ctrl+Alt+F5 poori file ke saare Pivots/Queries ko refresh karta hai.",
      },
    ],
    formulaTasks: [
      {
        scenarioEn: "Calculate dynamic filtered total of visible rows in D2:D500 so hidden filtered-out rows are excluded.",
        scenarioHi: "Filter lagane ke baad sirf dikhne wali (visible) rows ka jod nikalne ka formula likho.",
        sampleRef: "Filtered Amount Range = D2:D500",
        modelFormula: "=SUBTOTAL(9, D2:D500)",
        explanationEn: "SUM() adds hidden filtered rows too, whereas SUBTOTAL(9, ...) sums ONLY visible filtered rows!",
        explanationHi: "SUM chhupi hui rows bhi jod leta hai, jabki SUBTOTAL(9, ...) sirf filter ke baad dikh rahi rows jodata hai!",
      },
    ],
    vivaQuestions: [
      {
        qEn: "What are the 4 golden design rules of an Executive Excel Dashboard?",
        qHi: "Ek shandar Executive Excel Dashboard banane ke 4 mukhya niyam batao!",
        aEn: "1) Separate sheets for Raw Data, Pivots, and Dashboard, 2) 4–5 clear KPI Cards at top, 3) Hide gridlines & limit palette to 2–3 cohesive colors, 4) Add Slicers & Timelines so managers can explore interactively on 1 screen.",
        aHi: "1) Raw Data, Pivot aur Dashboard ki alag sheets rakho, 2) Upar 4-5 bade KPI Cards dikhao, 3) Gridlines band karke saaf colours rakho, 4) Slicers aur Timeline lagao taaki 1 page par sab interactive ho.",
      },
    ],
  },
  {
    id: "sp-5",
    code: "PAPER 05",
    emoji: "🎓",
    titleEn: "Grand Diploma Final Mock Paper (All Modules + VBA Macros)",
    titleHi: "Sample Paper 5 — Complete Excel Diploma Mock Paper (Basic to VBA)",
    duration: "90 Mins",
    marks: 100,
    mcqs: [
      {
        qEn: "Which file extension MUST be used to preserve VBA Macros inside an Excel workbook?",
        qHi: "VBA Macros ko surakshit rakhne ke liye file ko kis extension mein save karna zaroori hai?",
        opts: [".xlsx", ".csv", ".xlsm", ".pdf"],
        ans: 2,
        expEn: ".xlsm (or binary .xlsb) retains VBA modules; .xlsx strips all macro code.",
        expHi: ".xlsm mein save karne par hi Macro code bachta hai, .xlsx mein udd jata hai.",
      },
      {
        qEn: "In Excel 365, which function defines reusable local variables inside a single formula to boost speed and readability?",
        qHi: "Ek hi formula ke andar variable bana kar calculation tez aur saaf karne wala Excel 365 function kaun sa hai?",
        opts: ["LET", "TRIM", "PROPER", "DAY"],
        ans: 0,
        expEn: "=LET(sales, SUM(B:B), ...) computes 'sales' once and reuses it multiple times.",
        expHi: "LET function se bada formula ek hi baar calculate hota hai aur padhne mein behad aasaan lagta hai.",
      },
      {
        qEn: "What does `Cells(Rows.Count, 1).End(xlUp).Row` find in VBA?",
        qHi: "VBA mein `Cells(Rows.Count, 1).End(xlUp).Row` kya pata lagata hai?",
        opts: [
          "Last filled row number in Column A dynamically",
          "Font size of A1",
          "Total worksheets",
          "Workbook password",
        ],
        ans: 0,
        expEn: "Starts at bottom of Column A (1,048,576) and jumps up (Ctrl+Up) to hit the last populated row.",
        expHi: "Yeh sheet ke sabse neeche se upar aakar Column A ki aakhri bhari hui row ka number batata hai.",
      },
      {
        qEn: "How do you allow users to edit Input cells B2:B10 while locking Formula cells C2:C10?",
        qHi: "B2:B10 mein user type kar sake par C2:C10 ke formulas koi mita na sake — kaise karoge?",
        opts: [
          "Uncheck 'Locked' on B2:B10 (Ctrl+1 → Protection), then enable Review → Protect Sheet",
          "Hide Column C",
          "Change font color to white",
          "Use Print Preview",
        ],
        ans: 0,
        expEn: "Unlock editable input cells first, then activate Protect Sheet to lock everything else!",
        expHi: "Pehle B2:B10 ko Ctrl+1 se Unlock karo, phir Review → Protect Sheet on kar do!",
      },
    ],
    formulaTasks: [
      {
        scenarioEn: "Write a LET formula that calculates total sales of B2:B100, and returns 10% bonus if sales >= 100000, else 0.",
        scenarioHi: "LET function se B2:B100 ka total nikalo, aur agar woh 100000 ya zyada ho to 10% bonus do warna 0.",
        sampleRef: "Sales = B2:B100",
        modelFormula: "=LET(total, SUM(B2:B100), IF(total>=100000, total*0.1, 0))",
        explanationEn: "'total' is calculated once and referenced cleanly twice.",
        explanationHi: "'total' variable ek baar nikalta hai aur shart + bonus dono mein kaam aata hai.",
      },
    ],
    vivaQuestions: [
      {
        qEn: "Write a clean 4-line VBA macro to export the 'Dashboard' sheet as a PDF file.",
        qHi: "'Dashboard' sheet ko ek click mein PDF banane ka chhota VBA code likho.",
        aEn: 'Sub ExportDashPDF()\n  Sheets("Dashboard").ExportAsFixedFormat Type:=xlTypePDF, Filename:="MIS_Dashboard.pdf"\n  MsgBox "PDF Exported Successfully!"\nEnd Sub',
        aHi: 'Sub ExportDashPDF()\n  Sheets("Dashboard").ExportAsFixedFormat Type:=xlTypePDF, Filename:="MIS_Dashboard.pdf"\n  MsgBox "PDF Taiyaar Hai!"\nEnd Sub',
      },
    ],
  },
  {
    id: "paper-6",
    code: "DIPLOMA-P6",
    emoji: "🧾",
    titleEn: "Paper 6: Accounts Expert, 12-Error Auditing, DSUM & Color Theory",
    titleHi: "पेपर 6: GST अकाउंटिंग, 12 एरर इलाज, DSUM और कलर थ्योरी",
    duration: "75 Mins",
    marks: 100,
    mcqs: [
      {
        qEn: "Which error appears if you write `=SUM(A1 A10)` with a space instead of a colon `:`?",
        qHi: "अगर आप `=SUM(A1:A10)` की जगह स्पेस देकर `=SUM(A1 A10)` लिख दें तो कौन सा एरर आएगा?",
        opts: ["#NULL!", "#DIV/0!", "#SPILL!", "#CONNECT!"],
        ans: 0,
        expEn: "Space is Excel's range intersection operator; since A1 and A10 do not intersect, Excel throws #NULL!.",
        expHi: "Excel में स्पेस का मतलब इंटरसेक्शन होता है — कोलोन (:) छूटने पर तुरंत #NULL! आता है।",
      },
      {
        qEn: "How do you extract the base taxable price from a GST-inclusive MRP of ₹1,180 (at 18% GST)?",
        qHi: "₹1,180 (18% GST सहित) में से असली बेस कीमत (Taxable Value) निकालने का सही फॉर्मूला क्या है?",
        opts: ["=1180 / (1 + 18%)", "=1180 - (1180 * 18%)", "=1180 * 82%", "=1180 / 18%"],
        ans: 0,
        expEn: "1180 / 1.18 = ₹1,000 base price + ₹180 GST. Subtracting 18% directly gives ₹967.60 which is wrong!",
        expHi: "1180 / 1.18 करने से सही ₹1,000 निकलता है। सीधा 18% घटाना अकाउंटिंग की सबसे आम गलती है!",
      },
      {
        qEn: "Why do auditors prefer `DGET` over `VLOOKUP` when checking unique Employee IDs?",
        qHi: "यूनिक Employee ID चेक करते समय ऑडिटर VLOOKUP से ज़्यादा `DGET` क्यों पसंद करते हैं?",
        opts: [
          "DGET returns #NUM! if duplicate IDs exist, exposing duplicate entries immediately",
          "DGET changes font size",
          "DGET deletes rows",
          "DGET works without headers",
        ],
        ans: 0,
        expEn: "VLOOKUP silently returns the first match even if duplicates exist, whereas DGET flags duplicates with #NUM!.",
        expHi: "अगर गलती से एक ID दो बार दर्ज है तो DGET तुरंत #NUM! देकर डुप्लीकेट पकड़वा देता है!",
      },
      {
        qEn: "According to Excel Report Color Theory, how many main shades should a professional dashboard stick to?",
        qHi: "प्रोफेशनल Excel रिपोर्ट Color Theory के अनुसार मुख्य रूप से कितने रंगों (main shades) का उपयोग करना चाहिए?",
        opts: ["2 to 3 harmonious shades + neutral background", "10 bright rainbow colors", "All neon backgrounds", "Red text on green fill"],
        ans: 0,
        expEn: "2–3 cohesive colors (e.g., Navy + Slate + White) create executive clarity and reserve Red/Amber strictly for alerts.",
        expHi: "2 से 3 मुख्य शेड्स और हल्का बैकग्राउंड रखने से रिपोर्ट साफ और बोर्डरूम-रेडी दिखती है।",
      },
    ],
    formulaTasks: [
      {
        scenarioEn: "Write a formula to deduplicate A2:D500 (Col A = EmpID, Col D = UpdateDate) keeping ONLY the latest date row per Employee ID.",
        scenarioHi: "A2:D500 (Col A = EmpID, Col D = UpdateDate) में से हर Employee की सिर्फ सबसे लेटेस्ट तारीख वाली एंट्री निकालने का फॉर्मूला लिखो।",
        sampleRef: "A2:A500 = EmpID, D2:D500 = Last Update Date",
        modelFormula: "=SORT(FILTER(A2:D500, D2:D500=MAXIFS(D2:D500, A2:A500, A2:A500)), 4, -1)",
        explanationEn: "MAXIFS finds each ID's latest date, FILTER keeps only rows matching that date, and SORT orders newest first.",
        explanationHi: "MAXIFS हर ID की सबसे नई तारीख ढूंढता है और FILTER सिर्फ वही लेटेस्ट रिकॉर्ड बाहर निकालता है!",
      },
      {
        scenarioEn: "Sum 'Revenue' in database A1:E500 matching the multi-column criteria box in G1:H2.",
        scenarioHi: "G1:H2 क्राइटेरिया बॉक्स की शर्तों के अनुसार A1:E500 डेटाबेस के 'Revenue' कॉलम का जोड़ निकालो।",
        sampleRef: "Database = A1:E500, Criteria = G1:H2",
        modelFormula: '=DSUM(A1:E500, "Revenue", G1:H2)',
        explanationEn: "DSUM reads column headers in G1:H1 and sums matching Revenue rows cleanly.",
        explanationHi: "DSUM अलग बने Criteria टेबल को पढ़कर तुरंत सटीक जोड़ दे देता है।",
      },
    ],
    vivaQuestions: [
      {
        qEn: "Explain the difference between `#SPILL!`, `#CALC!`, `#CONNECT!`, and `#BLOCKED!` in modern Excel.",
        qHi: "नए Excel में आने वाले `#SPILL!`, `#CALC!`, `#CONNECT!` और `#BLOCKED!` एरर में क्या अंतर है?",
        aEn: "#SPILL! = cells below dynamic array aren't empty; #CALC! = empty FILTER or unsupported array calc; #CONNECT! = broken external data/network link; #BLOCKED! = Trust Center security blocked macro/link.",
        aHi: "#SPILL! = नीचे सेल भरे हैं; #CALC! = FILTER खाली आया; #CONNECT! = डेटा कनेक्शन टूटा; #BLOCKED! = Trust Center सिक्योरिटी ने फाइल/मैक्रो रोका है।",
      },
    ],
  },
];
