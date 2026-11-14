import type { Concept } from "./types";

/** Pivot, dashboard, Power Query, VBA, GST, shortcuts and career concepts. */
export const DATA_CONCEPTS: Concept[] = [
  {
    id: "pivot",
    name: "Pivot Table",
    topic: "pivot",
    keys: ["pivot", "pivot table", "slicer", "timeline", "group by", "summary table"],
    related: ["sumifs", "filter", "dashboard"],
    chapter: 14,
    whatEn:
      "A Pivot Table summarises thousands of rows by dragging fields into Rows, Columns and Values — no formulas, and it re-summarises instantly.",
    whatHi:
      "Pivot Table hazaaron rows ka summary banata hai — bas fields ko Rows, Columns, Values mein drag karo. Koi formula nahi, aur filter badalte hi summary turant badal jaati hai.",
    ideaEn:
      "\"For each Region (rows), for each Product (columns), sum the Amount (values).\" Every pivot is that one sentence. That is why the four drop zones are named exactly that.",
    ideaHi:
      "\"Har Region (rows) ke liye, har Product (columns) ke hisaab se, Amount (values) ka total.\" Har pivot yahi ek vaakya hai — isliye chaar drop zones ke naam bilkul wahi hain.",
    syntax: "Ctrl + T → Insert → PivotTable → drag Region to Rows, Product to Columns, Amount to Values",
    args: [
      { name: "Rows", meaning: "Kis hisaab se group ho (jaise Region)", example: "Region" },
      { name: "Columns", meaning: "Dusra grouping level", example: "Month" },
      { name: "Values", meaning: "Kya calculate ho — Sum, Count, Average", example: "Sum of Amount" },
      { name: "Filters", meaning: "Poori pivot par ek overall filter", example: "Year" },
    ],
    stepsEn: [
      "Select the raw data and press Ctrl + T so the source is a real Table (pivot expands with new rows).",
      "Insert → PivotTable → New Worksheet.",
      "Drag Region to Rows, Product to Columns, Amount to Values.",
      "Add a Slicer for interactive filtering, then right-click → Report Connections so one slicer controls several pivots.",
      "Refresh with Alt + F5 when source data changes; a pivot does not auto-refresh.",
    ],
    stepsHi: [
      "Poora data select karke Ctrl + T dabao — source ko asli Table banao (naye rows add hone par pivot khud badhta hai).",
      "Insert → PivotTable → New Worksheet.",
      "Region ko Rows, Product ko Columns, Amount ko Values mein drag karo.",
      "Slicer lagao, phir right-click → Report Connections se ek slicer se kai pivots chalao.",
      "Data badle to Alt + F5 se refresh karo — pivot apne aap refresh nahi hota.",
    ],
    examples: [
      {
        title: "Region × Product ka total sales",
        table: [
          ["Region", "Product", "Amount"],
          ["North", "Pen", "1200"],
          ["South", "Pen", "800"],
          ["North", "Book", "500"],
        ],
        at: "Pivot (naya sheet)",
        formula: "Rows: Region, Columns: Product, Values: Sum of Amount",
        result: "North | Pen 1200 | Book 500\nSouth | Pen 800",
        why: "Pivot ne har Region × Product combination ka total khud calculate kiya — ek bhi formula likhe bina.",
      },
    ],
    mistakes: [
      {
        symptom: "Pivot mein naya data nahi aa raha",
        cause: "Pivot auto-refresh nahi hota.",
        fix: "Alt + F5 (ya Data → Refresh All). Source ko Ctrl+T table banao taaki range khud badhe.",
      },
      {
        symptom: "Sum ki jagah Count aa raha hai",
        cause: "Amount column mein text hai (khali cells ya text numbers).",
        fix: "Values field par click → Value Field Settings → Sum. Data ko pehle number banao.",
      },
      {
        symptom: "Blank row/column dikh raha hai",
        cause: "Source mein khali cells hain.",
        fix: "Source data ki khali cells bharo, ya pivot option \"For empty cells show 0\" set karo.",
      },
      {
        symptom: "\"Data source reference is not valid\"",
        cause: "Source sheet ka naam badal gaya ya range delete hui.",
        fix: "Pivot par click → Change Data Source → naya range do.",
      },
    ],
    practice:
      "Apna 20-row sales data lo, Ctrl+T karo, Pivot banao aur teen tarah se dekho: Region ke hisaab se, Month ke hisaab se, aur dono ek saath. Phir ek Slicer lagao — dashboard ka basic dhancha ready ho jayega.",
    shortcuts: [
      { keys: "Alt + F5", what: "Pivot refresh" },
      { keys: "Ctrl + Alt + F5", what: "Refresh All (Power Query sameth)" },
      { keys: "Alt + N + V", what: "Insert PivotTable" },
    ],
    next: ["Pivot Table aur SUMIFS mein kya behtar hai?", "Slicer se dashboard kaise banayein?"],
  },

  {
    id: "dashboard",
    name: "Dashboard / Charts",
    topic: "pivot",
    keys: ["dashboard", "chart", "graph", "kpi", "waterfall", "combo chart", "visual"],
    related: ["pivot", "filter"],
    chapter: 15,
    whatEn:
      "A dashboard answers one manager question in five seconds: the big number first (KPI), the trend second (chart), the detail third (table).",
    whatHi:
      "Dashboard ka kaam ek hi sawal 5 second mein jawab karna hai: bada number pehle (KPI), trend uske baad (chart), detail sabse aakhir (table).",
    ideaEn:
      "\"Data → Pivots → Dashboard\" as three sheets. Never chart raw data directly — chart the pivot, so one refresh updates everything.",
    ideaHi:
      "\"Data → Pivots → Dashboard\" — teen sheets ka dhancha. Kabhi raw data par seedha chart mat banao; pivot par banao, taaki ek refresh se sab update ho jaye.",
    syntax: "Data sheet → Pivot sheet → Dashboard sheet (charts + Slicers on the dashboard)",
    args: [
      { name: "KPI card", meaning: "Ek bada number + label + change %", example: "Total Sales ₹12.4L (+8%)" },
      { name: "Combo chart", meaning: "Bar + line ek saath (sales + growth)", example: "Bar: Sales, Line: % growth" },
      { name: "Slicer", meaning: "Dashboard par clickable filter", example: "Region, Year" },
      { name: "Waterfall", meaning: "Kaise ek total se doosra total bana (bridge)", example: "Opening → Sales → Returns → Closing" },
    ],
    stepsEn: [
      "Clean data and make one Table (Ctrl + T).",
      "Build two or three pivots on a separate sheet.",
      "On the dashboard sheet, hide gridlines (View → uncheck Gridlines).",
      "Add 4–5 KPI cards at the top-left, charts on the right, a table at the bottom.",
      "Insert Slicers on the dashboard and connect them to every pivot (Report Connections).",
      "Pick 2–3 colours total; use red/amber only for alerts.",
    ],
    stepsHi: [
      "Data saaf karo aur ek Table banao (Ctrl + T).",
      "Alag sheet par do-teen Pivot banao.",
      "Dashboard sheet par gridlines chhupao (View → Gridlines off).",
      "Upar-baayen 4–5 KPI cards, daayen charts, neeche table.",
      "Slicers dashboard par lagao aur Report Connections se sab pivots se jodo.",
      "Total 2–3 colours rakho; laal/peela sirf alert ke liye.",
    ],
    examples: [
      {
        title: "Ek line ka KPI (sales vs target)",
        table: [
          ["Month", "Sales", "Target"],
          ["Jan", "120000", "100000"],
        ],
        at: "Dashboard!B4",
        formula: "=TEXT((Sales-Target)/Target, \"+0%;-0%\")",
        result: "+20%",
        why: "Custom number format se ek hi TEXT formula me plus aur minus dono case handle ho gaye.",
      },
    ],
    mistakes: [
      {
        symptom: "Dashboard slow ya freeze",
        cause: "100+ charts, poori column references aur volatile formulas (TODAY, OFFSET, INDIRECT) ek saath.",
        fix: "Table ranges use karo, volatile functions kam karo, aur chart ko pivot se feed karo.",
      },
      {
        symptom: "Numbers sahi par dashboard gandha lagta hai",
        cause: "6+ colours, borders har cell par, gridlines on.",
        fix: "2–3 colours, borders sirf key jagahen, gridlines off, numbers right-aligned.",
      },
    ],
    practice:
      "Ek page par: 4 KPI card (Total, Average, Max, Count), 1 bar chart, 1 line chart aur 2 slicer. Ye ek asli MIS dashboard ka poora skeleton hai — interview me bhi yahi poochha jaata hai.",
    shortcuts: [
      { keys: "Alt + F1", what: "Selected data ka chart ek click me" },
      { keys: "F11", what: "Naya sheet par chart" },
      { keys: "Ctrl + Shift + L", what: "Filter toggle (table ke saath)" },
    ],
    next: ["Combo chart kaise banayein?", "Waterfall chart kab use karte hain?"],
  },

  {
    id: "power-query",
    name: "Power Query",
    topic: "data",
    keys: ["power query", "unpivot", "etl", "merge queries", "append", "from folder", "refresh"],
    related: ["text-cleaning", "pivot"],
    chapter: 16,
    whatEn:
      "Power Query records your cleaning steps once. Next month you replace the file and press Refresh — the steps replay automatically.",
    whatHi:
      "Power Query aapke cleaning steps ek baar record karta hai. Agle mahine nayi file daalo aur Refresh dabao — saare steps apne aap dobara chal jaate hain.",
    ideaEn:
      "\"Excel me kaam karo\" ki jagah \"kaam ko record karo\". Har step ek applied step hai, isliye galti ho to usi step par wapas jaakar theek kar sakte ho — formula dobara nahi likhna.",
    ideaHi:
      "\"Excel mein kaam karna\" nahi, \"kaam ko record karna\". Har step applied step hota hai, isliye galti par usi step par wapas jaakar sudhaar sakte ho — formula dobara nahi likhna padta.",
    syntax: "Data → Get Data → From File / From Folder → transform in editor → Close & Load",
    args: [
      { name: "From Folder", meaning: "Ek folder ki saari CSV/Excel files ek saath combine", example: "12 monthly files" },
      { name: "Unpivot Columns", meaning: "Wide table (Jan|Feb|Mar) ko tall table banana", example: "Month | Amount" },
      { name: "Merge Queries", meaning: "VLOOKUP jaisa join, par permanent", example: "Sales + Master by EmpID" },
      { name: "Append Queries", meaning: "Neeche-neeche jodna (rows add)", example: "Jan file + Feb file" },
    ],
    stepsEn: [
      "Select the data → Data → From Table/Range (or From Folder for many files).",
      "In the Power Query Editor every change becomes an Applied Step on the right.",
      "Select the Product/Date columns → right-click → Unpivot Other Columns to go from wide to tall.",
      "Close & Load To → Existing worksheet, on the sheet you choose.",
      "Next time: just Refresh All (Ctrl + Alt + F5).",
    ],
    stepsHi: [
      "Data select karo → Data → From Table/Range (kai files ke liye From Folder).",
      "Power Query Editor mein har badlav daayen taraf Applied Step ban jaata hai.",
      "Product/Date jaisi columns select karke right-click → Unpivot Other Columns (wide se tall).",
      "Close & Load To → Existing worksheet, apni chuni hui jagah.",
      "Agli baar sirf Refresh All (Ctrl + Alt + F5).",
    ],
    examples: [
      {
        title: "Wide se tall (Unpivot) — dashboard ki pehli zarurat",
        table: [
          ["Product", "Jan", "Feb", "Mar"],
          ["Pen", "500", "620", "580"],
        ],
        at: "Power Query output",
        formula: "Select Jan,Feb,Mar → Right-click → Unpivot Columns",
        result: "Pen | Jan | 500\nPen | Feb | 620\nPen | Mar | 580",
        why: "3 columns ki jagah 3 rows ban gayi. Pivot aur chart sirf tall data par theek kaam karte hain.",
      },
    ],
    mistakes: [
      {
        symptom: "Refresh ke baad column ka naam badal gaya",
        cause: "Source file mein header badal gaya (\"Amount\" → \"Amount \").",
        fix: "Query ke steps check karo; header rename step mein purana naam hard-coded hota hai — usse theek karo.",
      },
      {
        symptom: "Nayi file folder mein daali par data nahi aaya",
        cause: "From Folder query purani list par bani thi.",
        fix: "Refresh All dabao — From Folder har baar folder scan karta hai.",
      },
      {
        symptom: "Query chalti hai par Excel slow",
        cause: "Poore column reference aur har refresh par dobara load.",
        fix: "Query ko \"Only Create Connection\" par load karo aur pivot se use karo.",
      },
    ],
    practice:
      "Ek folder mein 2-3 CSV rakho, From Folder se combine karo, ek column unpivot karo aur Table banakar load karo. Phir folder mein ek CSV aur daal kar Refresh All — magic dekhne layak hai aur interview me strong answer.",
    shortcuts: [
      { keys: "Ctrl + Alt + F5", what: "Refresh All (Power Query + Pivot)" },
      { keys: "Alt + A + P", what: "Power Query menu" },
    ],
    next: ["Unpivot kab use karte hain?", "VLOOKUP ki jagah Merge Query kab behtar hai?"],
  },

  {
    id: "vba",
    name: "VBA Macros",
    topic: "vba",
    keys: ["vba", "macro", "xlsm", "alt+f11", "sub ", "loop", "automation"],
    related: ["power-query"],
    chapter: 17,
    whatEn: "VBA is the code inside Excel. A macro replays a click sequence — or does things Excel cannot do at all, like export every sheet to PDF and email it.",
    whatHi: "VBA Excel ke andar ka code hai. Macro aapke clicks dobara chala deta hai — ya woh kaam karta hai jo Excel khud nahi kar sakta, jaise sabhi sheets ko PDF bana kar email karna.",
    ideaEn:
      "Record first, then read the code. Every macro is: turn off screen updates → loop over rows/sheets → do something → turn screen updates back on.",
    ideaHi:
      "Pehle record karo, phir code padho. Har macro ka dhancha wahi hai: screen update band → rows/sheets par loop → kaam → screen update wapas on.",
    syntax: "Alt + F11 → Insert → Module → Sub Name() … End Sub → F5 to run",
    args: [
      { name: "Dim", meaning: "Variable declare karna", example: "Dim r As Long" },
      { name: "For r = 2 To 100", meaning: "Har row par kaam dohrana", example: "Loop" },
      { name: "Application.ScreenUpdating", meaning: "Fast chalane ke liye screen freeze", example: "False / True" },
      { name: "MsgBox", meaning: "Kaam ke baad confirmation", example: "MsgBox \"Done\"" },
    ],
    stepsEn: [
      "Save the workbook as .xlsm — macros need that extension.",
      "Press Alt + F11, Insert → Module, paste the code.",
      "F8 runs one line at a time (the best teacher), F5 runs the whole macro.",
      "Always set ScreenUpdating = False at the start and True at the end for speed.",
      "If the file will be shared, add a button (Insert → Shapes → Assign Macro).",
    ],
    stepsHi: [
      "File ko .xlsm mein save karo — macro ke liye yahi extension chahiye.",
      "Alt + F11 dabao, Insert → Module, code paste karo.",
      "F8 se ek-ek line chalao (sabse achha teacher), F5 se poora macro.",
      "Speed ke liye shuru mein ScreenUpdating = False aur aakhir mein True rakho.",
      "File share karni ho to button lagao (Insert → Shapes → Assign Macro).",
    ],
    examples: [
      {
        title: "Blank rows ke liye loop, phir PDF export",
        table: [
          ["Name", "Amount"],
          ["Amit", "500"],
          ["", ""],
        ],
        at: "Module1",
        formula: "Sub Quick()\n  Application.ScreenUpdating = False\n  ActiveSheet.Range(\"A1:D100\").Columns.AutoFit\n  ActiveSheet.ExportAsFixedFormat 0, \"Report.pdf\"\n  Application.ScreenUpdating = True\n  MsgBox \"PDF saved\"\nEnd Sub",
        result: "Report.pdf",
        why: "ScreenUpdating off karne se 10 second ka kaam 1 second me hota hai; AutoFit har print ke liye columns theek karta hai.",
      },
    ],
    mistakes: [
      {
        symptom: "Macro chal hi nahi raha / disabled",
        cause: "File .xlsx hai, ya Trust Center ne macros block kiye hain.",
        fix: "Save as .xlsm, aur File → Options → Trust Center → Macro Settings se apni file wali folder trusted banao.",
      },
      {
        symptom: "Macro sahi par bahut slow",
        cause: "ScreenUpdating/Calculation on hai aur har keystroke par screen draw hoti hai.",
        fix: "`Application.ScreenUpdating = False` + `Application.Calculation = xlCalculationManual`.",
      },
      {
        symptom: "\"Subscript out of range\"",
        cause: "Sheet ka naam code me galat likha hai (space/case).",
        fix: "`Worksheets(\"Sales Data\")` exact naam do, ya sheet index (1) use karo.",
      },
    ],
    practice:
      "Ek macro record karo jo column width set kare aur PDF export kare. Phir Alt+F11 me usse padho, ScreenUpdating lines jodo, aur ek button lagao. Ye pehla automation project hai.",
    shortcuts: [
      { keys: "Alt + F11", what: "VBA editor" },
      { keys: "F8", what: "Step by step run" },
      { keys: "Ctrl + Break", what: "Chalte macro ko rokna" },
    ],
    next: ["Har sheet ka PDF ek saath kaise banayein?", "VBA loop se low stock highlight karo"],
  },

  {
    id: "gst",
    name: "GST Invoice (CGST / SGST / IGST)",
    topic: "math",
    keys: ["gst", "cgst", "sgst", "igst", "invoice", "reverse gst", "mrp to base", "tax"],
    related: ["if-ifs", "sumifs"],
    chapter: 19,
    whatEn: "Same state = CGST + SGST (9% + 9%). Different states = IGST 18%. That is the entire logic; everything else is formatting.",
    whatHi: "Same state = CGST + SGST (9% + 9%). Alag state = IGST 18%. Bas itni si logic hai; baaki sab formatting hai.",
    ideaEn:
      "Compare buyer state with your state once (a helper cell), then every tax cell uses IF. 18% is always the same total — only the split changes.",
    ideaHi:
      "Buyer state ko apne state se ek baar compare karo (helper cell), phir har tax cell IF use kare. Total 18% hamesha same hai — sirf batewara badalta hai.",
    syntax: "=IF(buyer_state = home_state, …CGST+SGST…, …IGST…)",
    args: [
      { name: "Base amount", meaning: "Tax ke bina value", example: "=Qty * Rate" },
      { name: "CGST / SGST", meaning: "Same state par aadha-aadha (9% + 9%)", example: "=ROUND(Base*9%,2)" },
      { name: "IGST", meaning: "Alag state par poora 18%", example: "=ROUND(Base*18%,2)" },
      { name: "Reverse GST", meaning: "MRP se base nikaalna", example: "=1180/1.18" },
    ],
    stepsEn: [
      "Compute Base = Qty × Rate in one cell; never repeat the calculation.",
      "Put your state in a fixed cell (say G1) as the home state.",
      "CGST: =IF(buyer_state=$G$1, ROUND(Base*9%,2), 0). SGST: same formula.",
      "IGST: =IF(buyer_state<>$G$1, ROUND(Base*18%,2), 0).",
      "Total = Base + CGST + SGST + IGST. Add a check column so total = Base × 1.18.",
    ],
    stepsHi: [
      "Base = Qty × Rate ek hi cell mein nikaalo; calculation dobara mat likho.",
      "Apna state ek fixed cell (jaise G1) mein rakho.",
      "CGST: =IF(buyer_state=$G$1, ROUND(Base*9%,2), 0). SGST bhi wahi.",
      "IGST: =IF(buyer_state<>$G$1, ROUND(Base*18%,2), 0).",
      "Total = Base + CGST + SGST + IGST. Ek check column rakho ki total = Base × 1.18.",
    ],
    examples: [
      {
        title: "Intra-state invoice (Gujarat → Gujarat)",
        table: [
          ["Home", "Buyer State", "Base"],
          ["GJ", "GJ", "10000"],
        ],
        at: "D2",
        formula: "=IF(B2=$A$2, ROUND(C2*9%,2), 0)",
        result: "900",
        why: "Buyer state home state ke barabar hai, isliye CGST 9% = 900. IGST wala cell is case me 0 dega.",
      },
      {
        title: "MRP se base nikaalna (reverse GST)",
        table: [
          ["MRP", "Base"],
          ["1180", ""],
        ],
        at: "B2",
        formula: "=ROUND(A2/1.18, 2)",
        result: "1000",
        why: "MRP mein 18% shaamil hai, isliye 1180 / 1.18 = 1000. Tax = 180.",
      },
    ],
    mistakes: [
      {
        symptom: "Invoice total 18% se match nahi karta",
        cause: "Har jagah alag rounding, ya CGST aur IGST dono lag gaye.",
        fix: "CGST/SGST/IGST teeno par ROUND(...,2) lagao aur IF ki condition ulti na karo (= vs <>).",
      },
      {
        symptom: "Alag state par bhi CGST aa raha hai",
        cause: "State spelling alag hai (\"Gujarat\" vs \"GJ\").",
        fix: "State ka ek master list (Data Validation dropdown) banao; free text mat lo.",
      },
    ],
    practice:
      "3 column ki invoice table banao: Buyer State, Base, Tax Type (formula se). Phir state badal kar dekho — tax ka split apne aap CGST/SGST se IGST ho jayega.",
    next: ["GST wali invoice ka poora template banao", "SUMIFS se month ka GST total nikaalo"],
  },

  {
    id: "shortcuts",
    name: "Excel Shortcuts",
    topic: "shortcut",
    keys: ["shortcut", "ctrl", "keyboard", "f4", "alt", "speed"],
    related: [],
    whatEn: "Shortcuts are not decoration: they are the difference between 20 minutes and 2 minutes on the same report.",
    whatHi: "Shortcut sirf shauk nahi — ek hi report 20 minute mein ya 2 minute mein, farq yahi padta hai.",
    ideaEn: "Learn five at a time and use them for a week. Ten shortcuts you actually use beat 400 you have read.",
    ideaHi: "Ek baar mein paanch seekho aur ek hafta unhi ko use karo. Jo 10 aadat ban jaayein woh 400 padhe hue shortcuts se behtar hain.",
    syntax: "Ctrl + Arrow (data ke kinare tak) · Ctrl + Shift + L (filter) · F4 ($ lock) · Alt + = (AutoSum)",
    args: [
      { name: "F4", meaning: "Reference lock ($A$2) formula editing me", example: "$A$2:$C$100" },
      { name: "Ctrl + T", meaning: "Data ko Table banana", example: "Pivot ka source" },
      { name: "Alt + =", meaning: "AutoSum", example: "=SUM(A1:A9)" },
      { name: "Ctrl + Shift + L", meaning: "Filter on/off", example: "Table header" },
    ],
    stepsEn: [
      "F4 while editing a formula cycles A1 → $A$1 → A$1 → $A1.",
      "Ctrl + Shift + Arrow selects to the edge of the data block.",
      "Ctrl + Page Up/Down moves between sheets.",
      "Ctrl + ` shows every formula on the sheet at once — perfect for auditing a file someone sent you.",
    ],
    stepsHi: [
      "Formula editing ke waqt F4 dabate raho: A1 → $A$1 → A$1 → $A1.",
      "Ctrl + Shift + Arrow data block ke kinare tak select karta hai.",
      "Ctrl + Page Up/Down se sheets badalti hain.",
      "Ctrl + ` se sheet ke saare formulas ek saath dikhte hain — kisi ki bheji file check karne ke liye best.",
    ],
    examples: [
      {
        title: "100 rows ko ek second mein select karna",
        table: [
          ["A", "B"],
          ["1", "2"],
        ],
        at: "A1",
        formula: "Ctrl + Shift + Down Arrow",
        result: "A1:A100 selected",
        why: "Mouse se drag karne ki zarurat nahi; ye 100000 rows par bhi ek click hai.",
      },
    ],
    mistakes: [
      {
        symptom: "F4 dabaya par $ nahi aaya",
        cause: "Aap formula edit mode mein nahi the (cell select tha).",
        fix: "F2 dabao ya formula bar par click karo, phir reference ke paas cursor rakhkar F4.",
      },
    ],
    practice: "Aaj sirf paanch: F4, Ctrl+T, Alt+=, Ctrl+Shift+L, Ctrl+`. Ek hafta inhi ko use karo — phir agle paanch.",
    shortcuts: [
      { keys: "F2", what: "Cell edit mode" },
      { keys: "Ctrl + Enter", what: "Same value saari selected cells me" },
      { keys: "Ctrl + D / Ctrl + R", what: "Upar/baayen se fill down/right" },
      { keys: "Alt + E + S + V", what: "Paste Special → Values" },
    ],
    next: ["Top 10 shortcuts jo interview me poochhte hain", "Paste Special ke saare options samjhao"],
  },

  {
    id: "career",
    name: "Excel Career / Interview",
    topic: "career",
    keys: ["interview", "job", "career", "salary", "resume", "mock", "roleplay", "mis executive"],
    related: ["pivot", "dashboard"],
    whatEn: "Interviews almost never ask you to define VLOOKUP; they give you a messy file and a question. Practice the file, not the definition.",
    whatHi: "Interview mein VLOOKUP ki definition nahi poochhi jaati — ek ganda file aur ek sawal diya jaata hai. Definition nahi, file practice karo.",
    ideaEn:
      "Four things get asked in every MIS/Data interview: (1) a lookup that must work left, (2) a two-condition total, (3) a duplicate/cleanup task, (4) a one-page summary. Prepare those four and you are ready.",
    ideaHi:
      "MIS/Data interview mein chaar cheezein har baar aati hain: (1) left lookup, (2) do shart wala total, (3) duplicate saaf karna, (4) ek page ka summary. Ye chaar taiyaar ho to interview ke liye ready ho.",
    syntax: "Practice, not definitions",
    args: [
      { name: "Round 1", meaning: "Lookup + IFERROR", example: "XLOOKUP/INDEX-MATCH se left lookup" },
      { name: "Round 2", meaning: "SUMIFS with 2 conditions", example: "Region + Month ka total" },
      { name: "Round 3", meaning: "Data cleaning", example: "TRIM + Remove Duplicates + check" },
      { name: "Round 4", meaning: "One-page dashboard", example: "Pivot + chart + slicer" },
    ],
    stepsEn: [
      "Say the formula out loud before writing it — interviewers score the thinking.",
      "For every lookup mention errors: \"main IFNA lagaunga taaki missing ID par friendly text aaye\".",
      "For cleaning, mention the ORDER: TRIM first, then duplicates, then validation.",
      "End with a check: \"total rows before = total rows after + duplicates removed\".",
    ],
    stepsHi: [
      "Formula likhne se pehle use bolkar batao — interviewer sochne ka tarika dekhta hai.",
      "Har lookup me error handling bolo: \"IFNA lagaunga taaki missing ID par friendly text aaye\".",
      "Cleaning me ORDER bolo: pehle TRIM, phir duplicates, phir validation.",
      "Aakhir me check bolo: \"pehle kitni rows thi = baad ki rows + hate hue duplicates\".",
    ],
    examples: [
      {
        title: "Classic interview task",
        table: [
          ["EmpID", "Name", "Dept"],
          ["101", "Amit", "Sales"],
        ],
        at: "Interview",
        formula: "Dept se EmpID nikaalo (left lookup) — VLOOKUP kyun nahi chalega?",
        result: "XLOOKUP ya INDEX-MATCH",
        why: "Dept table ka pehla column nahi hai, isliye VLOOKUP left nahi dekh sakta. Yehi sawal 70% interviews me aata hai.",
      },
    ],
    mistakes: [
      {
        symptom: "Sab answers aate hain par select nahi hote",
        cause: "Sirf formula yaad hai, error handling aur validation ka jawab nahi hai.",
        fix: "Har jawab ke saath ek line: IFNA kyun, range kyun lock ki, result kaise verify karoge.",
      },
    ],
    practice:
      "Aaj ek file lo aur usme chaar kaam karo: left lookup, do-shart SUMIFS, duplicate cleanup, aur ek page ka pivot summary. Wahi chaar interview rounds hain.",
    next: ["Mujhse interview roleplay karo", "MIS Executive ke liye kaun se topics zaruri hain?"],
  },
];
