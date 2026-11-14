import type { Concept } from "./types";

/** The fundamentals students trip over before they ever reach a lookup. */
export const EXCEL_BASICS: Concept[] = [
  {
    id: "cell-references",
    name: "Cell References ($A$1)",
    topic: "data",
    keys: ["cell reference", "absolute reference", "relative reference", "mixed reference", "$a$1", "dollar", "f4 lock", "reference lock"],
    related: ["vlookup"],
    chapter: 3,
    whatEn:
      "A reference is relative by default (A2). Adding $ freezes a part of it so dragging the formula does not move that part.",
    whatHi:
      "Reference by default relative hota hai (A2). $ lagane se woh hissa freeze ho jaata hai — formula drag karne par woh nahi hilta.",
    ideaEn:
      "A2 means \"same distance from me\". $A$2 means \"this exact cell, always\". $A2 freezes the column, A$2 freezes the row. That is the whole system.",
    ideaHi:
      "A2 ka matlab \"mere se utni door wali cell\". $A$2 ka matlab \"yahi cell, hamesha\". $A2 column freeze karta hai, A$2 row freeze karta hai. Bas itna hi system hai.",
    syntax: "A2 (relative) · $A$2 (absolute) · $A2 (column locked) · A$2 (row locked)",
    args: [
      { name: "A2", meaning: "Drag karne par dono badalte hain", example: "Ek column ka running total" },
      { name: "$A$2", meaning: "Kabhi nahi badalta", example: "Tax rate, home state" },
      { name: "$A2", meaning: "Column fix, row chalti hai", example: "VLOOKUP table $A$2:$C$100" },
      { name: "A$2", meaning: "Row fix, column chalta hai", example: "Header row ka reference" },
    ],
    stepsEn: [
      "Type the formula and click on a reference.",
      "Press F4 repeatedly: A2 → $A$2 → A$2 → $A2 → A2.",
      "Rule of thumb: the table/reference should not move → $A$2; the lookup value must move → A2.",
      "On a Mac without a function key, use Fn + F4 (or Cmd + T).",
    ],
    stepsHi: [
      "Formula likho aur reference par click karo.",
      "F4 baar-baar dabao: A2 → $A$2 → A$2 → $A2 → A2.",
      "Seedha niyam: jo cheez nahi hilni chahiye usse $A$2 karo, aur lookup value ko A2 hi rakho.",
      "Mac par Fn + F4 (ya Cmd + T).",
    ],
    examples: [
      {
        title: "18% GST ka rate ek hi cell se",
        table: [
          ["Rate", "18%"],
          ["Amount", "GST"],
          ["1000", ""],
        ],
        at: "B3",
        formula: "=A3*$B$1",
        result: "180",
        why: "B1 absolute hai, isliye neeche drag karne par rate wahi rehta hai. A3 relative hai, isliye har row apna amount leta hai.",
      },
    ],
    mistakes: [
      {
        symptom: "Formula neeche drag karte hi #REF! ya galat answer",
        cause: "Jo reference fix hona chahiye tha woh relative chhoot gaya.",
        fix: "Us reference par cursor rakho aur F4 dabao (`$A$2`).",
      },
      {
        symptom: "Ctrl+D se copy karte hi table shift ho gayi",
        cause: "Poori table relative thi.",
        fix: "Table ko `$A$2:$C$100` karo, sirf lookup value ko chalta rehne do.",
      },
    ],
    practice:
      "B1 mein 18% likho. A3:A10 mein amounts. B3 mein `=A3*$B$1` lagao aur neeche drag karo. Ab B1 ka rate 12% karo — saare answers ek saath badal jayenge.",
    shortcuts: [{ keys: "F4", what: "Reference cycle: A1 → $A$1 → A$1 → $A1" }],
    next: ["VLOOKUP mein table lock kyun karte hain?", "Mixed reference kab use karte hain?"],
  },

  {
    id: "sum-basics",
    name: "SUM / AVERAGE / COUNT",
    topic: "math",
    keys: ["sum", "average", "count", "counta", "max", "min", "total", "autosum", "average "],
    related: ["sumifs"],
    chapter: 4,
    whatEn:
      "The five functions that answer \"how much, on average, how many\" — and the difference between COUNT (numbers only) and COUNTA (anything not empty).",
    whatHi:
      "Paanch function jo \"kitna, average kitna, kitne\" ka jawab dete hain — aur COUNT (sirf numbers) versus COUNTA (kuch bhi khali na ho).",
    ideaEn:
      "\"Sum of the whole column\" is rarely what a manager wants — usually it is a total per group, which is SUMIFS or a Pivot. Know this difference early.",
    ideaHi:
      "\"Poori column ka total\" manager kabhi nahi maangta — woh group-wise total maangta hai, jo SUMIFS ya Pivot se aata hai. Ye farq shuru mein hi samajh lo.",
    syntax: "=SUM(range) · =AVERAGE(range) · =COUNT(range) · =COUNTA(range) · =MAX(range) · =MIN(range)",
    args: [
      { name: "SUM", meaning: "Numbers jodta hai", example: "=SUM(D2:D100)" },
      { name: "AVERAGE", meaning: "Sirf numbers ka average (khali cells ignore)", example: "=AVERAGE(D2:D100)" },
      { name: "COUNT", meaning: "Kitni cells mein number hai", example: "=COUNT(D2:D100)" },
      { name: "COUNTA", meaning: "Kitni cells khali nahi hain (text bhi ginti hai)", example: "=COUNTA(A2:A100)" },
    ],
    stepsEn: [
      "Alt + = puts AutoSum above the numbers automatically.",
      "AVERAGE ignores blank cells and text, but treats a text-number as text (not counted) — check with COUNT.",
      "COUNT vs COUNTA tells you whether a \"total\" column is really numbers.",
      "For group totals use SUMIFS, not several SUM formulas.",
    ],
    stepsHi: [
      "Alt + = dabaane se AutoSum khud upar ke numbers chun leta hai.",
      "AVERAGE khali cells aur text ignore karta hai — par text-number ko text maanta hai (count nahi hota), COUNT se check karo.",
      "COUNT vs COUNTA se pata chalta hai ki \"total\" column sach mein numbers hai ya nahi.",
      "Group-wise total ke liye SUMIFS use karo, alag-alag SUM nahi.",
    ],
    examples: [
      {
        title: "Total, average aur count — teen ek saath",
        table: [
          ["Amount"],
          ["1200"],
          ["800"],
          [""],
        ],
        at: "B1",
        formula: "=SUM(A2:A4) & \" / \" & AVERAGE(A2:A4) & \" / \" & COUNT(A2:A4)",
        result: "2000 / 1000 / 2",
        why: "Sum 2000, average sirf 2 numbers ka 1000, aur COUNT ne 2 bataya (khali cell nahi gina).",
      },
    ],
    mistakes: [
      {
        symptom: "Average galat aa raha hai",
        cause: "Khali cell ya text number average ko gol-gol kar raha hai, ya zero cells count ho rahe hain.",
        fix: "`=AVERAGEIF(range,\"<>0\")` ya `=SUM(range)/COUNT(range)` se cross-check karo.",
      },
      {
        symptom: "Total 0 aa raha hai par data dikh raha hai",
        cause: "Numbers text hain (left aligned, hara triangle).",
        fix: "`=COUNT(range)` chalao — agar 0 aaye to numbers text hain. `Data → Text to Columns → Finish`.",
      },
    ],
    practice: "Ek column mein 10 numbers aur 2 khali cells rakho. SUM, AVERAGE, COUNT, COUNTA chaaro chala kar likho ki kaun kitna daffar farq karta hai.",
    shortcuts: [
      { keys: "Alt + =", what: "AutoSum" },
      { keys: "Ctrl + Shift + T", what: "Total row (table ke andar)" },
    ],
    next: ["SUMIFS se group total kaise nikaalein?", "COUNT aur COUNTA mein kya farq hai?"],
  },

  {
    id: "text-functions",
    name: "TEXT functions (LEFT / MID / TEXTJOIN)",
    topic: "text",
    keys: ["left", "right", "mid", "find", "search", "len", "textjoin", "concat", "textsplit", "split name", "full name"],
    related: ["text-cleaning"],
    chapter: 6,
    whatEn: "Text functions cut, join and find inside text — the fastest way to split a full name or an address without Text to Columns.",
    whatHi: "Text functions text ko kaat-te, jod-te aur dhoondh-te hain — poora naam ya address todne ka sabse fast tarika, Text to Columns ke bina.",
    ideaEn:
      "Find the separator first (FIND), then take what is on either side (LEFT/RIGHT/MID). Almost every text formula is that pattern.",
    ideaHi:
      "Pehle separator dhoondho (FIND), phir uske dono taraf wala hissa lo (LEFT/RIGHT/MID). Lagbhag har text formula yahi pattern hai.",
    syntax: "=LEFT(text, n) · =MID(text, start, n) · =FIND(find, within) · =TEXTJOIN(delim, TRUE, range)",
    args: [
      { name: "LEFT(text, n)", meaning: "Shuru se n characters", example: "=LEFT(A2,5)" },
      { name: "MID(text, start, n)", meaning: "Beech se n characters", example: "=MID(A2,4,2)" },
      { name: "FIND(find, within)", meaning: "Kahan hai (case-sensitive, position)", example: "=FIND(\" \",A2)" },
      { name: "LEN(text)", meaning: "Kitne characters hain", example: "=LEN(A2)" },
      { name: "TEXTJOIN", meaning: "Range ko delimiter se jodna", example: "=TEXTJOIN(\", \",TRUE,A2:A10)" },
    ],
    stepsEn: [
      "Decide the separator: space for names, \",\" for addresses, \"-\" for codes.",
      "FIND the separator to get its position.",
      "LEFT for the part before it; MID with position + 1 for the part after it.",
      "TEXTJOIN replaces the old repeated & \" \" & trick in one call.",
    ],
    stepsHi: [
      "Separator tay karo: naam ke liye space, address ke liye \",\", code ke liye \"-\".",
      "FIND se separator ki position nikaalo.",
      "Pehle hisse ke liye LEFT; position + 1 se aage ke hisse ke liye MID.",
      "TEXTJOIN purane `& \" \" &` wale jod ko ek hi call mein badal deta hai.",
    ],
    examples: [
      {
        title: "Poora naam se first aur last name",
        table: [
          ["Full Name"],
          ["Amit Kumar Shah"],
        ],
        at: "B2",
        formula: "=LEFT(A2, FIND(\" \", A2) - 1)",
        result: "Amit",
        why: "FIND ne pehle space ki position 5 di, LEFT ne 4 characters liye.",
      },
      {
        title: "Middle name (beech ka hissa)",
        table: [
          ["Full Name"],
          ["Amit Kumar Shah"],
        ],
        at: "D2",
        formula: "=MID(A2, FIND(\" \",A2)+1, FIND(\" \",A2,FIND(\" \",A2)+1)-FIND(\" \",A2)-1)",
        result: "Kumar",
        why: "Doosra space dhoondh ke beech ka hissa nikaala. Lamba lagta hai, par pattern wahi hai: pehla space, doosra space, beech ka part.",
      },
    ],
    mistakes: [
      {
        symptom: "#VALUE! aa raha hai",
        cause: "FIND ko separator mila hi nahi (space nahi tha).",
        fix: "`=IFERROR(FIND(\" \",A2), 0)` se check karo; single-word names ka alag case handle karo.",
      },
      {
        symptom: "Result 1 se off aa raha hai",
        cause: "Position ki ginti bhool gaye (FIND 1 se shuru hota hai).",
        fix: "LEFT me `-1` karo (`FIND(\" \",A2)-1`), MID me `+1` karo.",
      },
    ],
    practice: "10 full names ka column banao. First name, middle name, last name — teen columns formulas se nikaalo. Phir TEXTJOIN se teeno wapas jod kar dekho.",
    next: ["TEXTSPLIT se ek hi formula mein kaise todein?", "TRIM aur text functions ek saath kaise use karein?"],
  },

  {
    id: "date-functions",
    name: "DATE functions (EOMONTH / DATEDIF / TEXT)",
    topic: "date",
    keys: ["date", "today", "eomonth", "datedif", "month", "year", "text date", "age calculate", "due date"],
    related: ["if-ifs"],
    chapter: 9,
    whatEn: "Excel stores a date as a number. Once you know that, EOMONTH, DATEDIF and TEXT(date, \"mmm-yy\") stop being mysterious.",
    whatHi: "Excel date ko ek number ki tarah rakhta hai. Ye samajh gaye to EOMONTH, DATEDIF aur TEXT(date,\"mmm-yy\") rahasyamay nahi rehte.",
    ideaEn:
      "1 Jan 1900 = 1. So 45000 is a real date. That is why a date shows a weird number when the format is General, and why subtraction of two dates gives days.",
    ideaHi:
      "1 Jan 1900 = 1. Isliye 45000 ek asli date hai. Isi wajah se date kabhi ajeeb number dikhata hai (General format) aur do dates ka minus din deta hai.",
    syntax: "=TODAY() · =EOMONTH(date, months) · =DATEDIF(start, end, \"y\") · =TEXT(date, \"mmm-yy\")",
    args: [
      { name: "TODAY()", meaning: "Aaj ki date (har khulne par badalti hai)", example: "=TODAY()" },
      { name: "EOMONTH(date, n)", meaning: "Mahine ka aakhri din", example: "=EOMONTH(TODAY(),0)" },
      { name: "DATEDIF(start, end, \"y\")", meaning: "Poore saal ki age", example: "=DATEDIF(DOB,TODAY(),\"y\")" },
      { name: "TEXT(date, \"mmm-yy\")", meaning: "Mahine ka naam", example: "=TEXT(A2,\"mmm-yy\") → Jan-26" },
    ],
    stepsEn: [
      "Check the cell is a real date (right aligned, not text): ISTEXT(A2).",
      "For month-end reports use EOMONTH to build the period end.",
      "DATEDIF needs \"y\", \"m\" or \"d\" as the third argument — in quotes.",
      "TEXT converts a date to a label for grouping; the value becomes text, so sort separately.",
    ],
    stepsHi: [
      "Pehle check karo cell asli date hai (right aligned, text nahi): `=ISTEXT(A2)`.",
      "Month-end report ke liye period end EOMONTH se banao.",
      "DATEDIF ka teesra argument \"y\", \"m\" ya \"d\" — quotes mein.",
      "TEXT date ko label banata hai (grouping ke liye); value text ban jaati hai, isliye sort alag se karo.",
    ],
    examples: [
      {
        title: "Age in years",
        table: [
          ["DOB", "Age"],
          ["15/08/1998", ""],
        ],
        at: "B2",
        formula: "=DATEDIF(A2, TODAY(), \"y\")",
        result: "28",
        why: "DATEDIF poore saal ginta hai (aadha saal nahi). years/month/days teeno isi function se milte hain.",
      },
      {
        title: "Mahine ka naam, grouping ke liye",
        table: [
          ["Invoice Date", "Month"],
          ["05/01/2026", ""],
        ],
        at: "B2",
        formula: "=TEXT(A2, \"mmm-yy\")",
        result: "Jan-26",
        why: "Pivot mein month-wise summary ke liye pehle aisa helper column banana sabse aasan tarika hai.",
      },
    ],
    mistakes: [
      {
        symptom: "Date 45000 jaisa number dikh raha hai",
        cause: "Cell ka format General hai, date nahi.",
        fix: "Cell select → Ctrl + 1 → Date format chuno.",
      },
      {
        symptom: "DATEDIF kaam nahi kar raha",
        cause: "Function ka naam galat case ya argument order galat.",
        fix: "`=DATEDIF(start, end, \"y\")` — Excel ise list mein suggest nahi karta, par chalta hai.",
      },
      {
        symptom: "Date filter/sort galat chal raha hai",
        cause: "Dates text hain (left aligned).",
        fix: "`Data → Text to Columns → Date → DMY` se asli date banao.",
      },
    ],
    practice: "10 dates ka column banao, unse month name (TEXT), month-end (EOMONTH) aur din (subtraction) nikaalo. Ek baar ye ho gaya to monthly report banana aasan ho jayega.",
    next: ["EOMONTH se monthly report kaise banayein?", "TEXT format codes samjhao"],
  },

  {
    id: "conditional-formatting",
    name: "Conditional Formatting",
    topic: "data",
    keys: ["conditional formatting", "highlight", "color scale", "data bar", "row highlight", "red color", "colour rule"],
    related: ["data-validation", "dashboard"],
    chapter: 11,
    whatEn: "Conditional formatting changes a cell's colour automatically when a rule is true — no macro, no manual painting.",
    whatHi: "Conditional formatting rule sach hote hi cell ka rang khud badal deta hai — na macro, na haath se colour karna.",
    ideaEn:
      "\"Highlight the whole row where Status = Overdue\" is one formula rule with a mixed reference: $E2. The $ locks the column so every column in the row looks at E; the 2 moves so each row checks itself.",
    ideaHi:
      "\"Jahan Status Overdue ho wahan poori row laal\" — ye ek formula rule hai mixed reference ke saath: `$E2`. `$` column fix karta hai taaki poori row E dekhe, aur `2` chalta hai taaki har row khud ko check kare.",
    syntax: "Home → Conditional Formatting → New Rule → Use a formula → =$E2=\"Overdue\"",
    args: [
      { name: "Formula rule", meaning: "TRUE/FALSE dene wala formula", example: "=$E2=\"Overdue\"" },
      { name: "Applies to", meaning: "Kis range par rule lage", example: "$A$2:$F$200" },
      { name: "Data bars", meaning: "Cell mein progress bar", example: "Number column par" },
      { name: "Color scales", meaning: "Value ke hisaab se gradient", example: "Low → High" },
    ],
    stepsEn: [
      "Select the FULL range you want coloured (A2:F200), starting at the top-left cell you will reference.",
      "New Rule → Use a formula to determine which cells to format.",
      "Write the rule for the FIRST cell only, with the right $: =$E2=\"Overdue\".",
      "Pick the fill/format, OK, then test by changing one row.",
    ],
    stepsHi: [
      "Poori range select karo (A2:F200), jahan se formula ka pehla cell shuru hoga wahin se.",
      "New Rule → Use a formula to determine which cells to format.",
      "Sirf PEHLI cell ke hisaab se rule likho, sahi $ ke saath: `=$E2=\"Overdue\"`.",
      "Fill colour chuno, OK, phir ek row badal kar test karo.",
    ],
    examples: [
      {
        title: "Poori row highlight jab status Pending ho",
        table: [
          ["Name", "Amount", "Status"],
          ["Amit", "1200", "Pending"],
          ["Priya", "800", "Paid"],
        ],
        at: "A2:F200",
        formula: "=$C2=\"Pending\"",
        result: "Amit wali row colour ho jayegi",
        why: "C column lock hai ($C) isliye poori row usi row ka C dekhti hai; 2 locked nahi hai isliye har row apna C check karti hai.",
      },
    ],
    mistakes: [
      {
        symptom: "Sirf ek cell colour ho raha hai, poori row nahi",
        cause: "Rule mein reference bilkul absolute tha ($E$2) — sabhi cells ek hi cell dekh rahe hain.",
        fix: "Row number ko unlock karo: `$E2` (sirf column lock).",
      },
      {
        symptom: "Rule lagaya par kuch nahi hua",
        cause: "Formula false hai — text mein extra space, ya case/format mismatch (\"pending \" vs \"Pending\").",
        fix: "Pehle kisi helper cell mein wahi formula likho aur TRUE/FALSE dekho, phir rule banao.",
      },
      {
        symptom: "Formatting copy karne se duplicates ban gaye",
        cause: "Same rule kai ranges par baar-baar laga hua hai.",
        fix: "Manage Rules kholo, duplicate hatao, aur ek hi rule ki range badlo.",
      },
    ],
    practice:
      "5-row table banao (Name, Amount, Status). Conditional formatting se: Status = Pending wali row peeli, Amount > 1000 wale cells laal, aur Amount column par data bar. Teen rules, 10 minute.",
    shortcuts: [{ keys: "Alt + H + L", what: "Conditional Formatting menu" }],
    next: ["$E2 mein sirf column lock kyun?", "Data bars se progress kaise dikhayein?"],
  },

  {
    id: "data-validation",
    name: "Data Validation & Dropdowns",
    topic: "data",
    keys: ["data validation", "dropdown", "drop down", "list", "indirect", "dependent dropdown", "cascading", "restrict entry"],
    related: ["conditional-formatting"],
    chapter: 11,
    whatEn: "Data validation stops wrong data at entry: a dropdown instead of free text, a number limit, or a rule that blocks duplicates.",
    whatHi: "Data validation galat data ko type hote waqt hi rok deta hai: free text ki jagah dropdown, number limit, ya duplicate rokne wala rule.",
    ideaEn:
      "Every validation is one question: \"what is allowed here?\". Answer it once in the dialog and nobody can break the sheet again.",
    ideaHi:
      "Har validation ek hi sawal hai: \"yahan kya allowed hai?\". Dialog mein ek baar jawab do, phir koi sheet nahi tod sakta.",
    syntax: "Data → Data Validation → Allow: List / Whole number / Custom",
    args: [
      { name: "List", meaning: "Dropdown se chunna", example: "Paid, Pending, Overdue" },
      { name: "Whole number", meaning: "Sirf poore number ek range mein", example: "1 se 100" },
      { name: "Custom formula", meaning: "Koi bhi TRUE/FALSE rule", example: "=COUNTIF($A$2:$A$100,A2)=1" },
      { name: "Input/Error message", meaning: "User ko batana kya bharna hai", example: "\"Sirf 1–100 allowed\"" },
    ],
    stepsEn: [
      "Select the column (not just one cell) where entries will be typed.",
      "Data → Data Validation → Allow: List → Source: Paid, Pending, Overdue (or a range).",
      "Add an Input Message so the user knows what to type.",
      "For dependent dropdowns, name each list and use =INDIRECT(A2).",
    ],
    stepsHi: [
      "Us column ko select karo jahan entry hogi (sirf ek cell nahi).",
      "Data → Data Validation → Allow: List → Source: Paid, Pending, Overdue (ya koi range).",
      "Input Message lagao taaki user ko pata rahe kya bharna hai.",
      "Dependent dropdown ke liye har list ko naam do aur `=INDIRECT(A2)` use karo.",
    ],
    examples: [
      {
        title: "Status dropdown",
        table: [
          ["Task", "Status"],
          ["GST filing", ""],
        ],
        at: "B2:B100",
        formula: "Allow: List → Source: Paid,Pending,Overdue",
        result: "Dropdown dikhega",
        why: "Ab koi \"Pendng\" spelling nahi likh sakta, isliye SUMIFS/IF ka COUNT reliable ho jata hai.",
      },
      {
        title: "Duplicate ID block karna",
        table: [
          ["EmpID"],
          ["101"],
        ],
        at: "A2:A100",
        formula: "Custom: =COUNTIF($A$2:$A$100, A2)=1",
        result: "Duplicate type karte hi error",
        why: "Count 1 matlab sirf ek hi baar allowed. A2 relative hai isliye har row khud ko check karti hai.",
      },
    ],
    mistakes: [
      {
        symptom: "Validation sirf ek cell par lag gaya",
        cause: "Column select nahi kiya tha.",
        fix: "Poora column select karke (ya range) validation lagao; phir Copy → Paste Special → Validation se aage badhao.",
      },
      {
        symptom: "Paste karke galat data aa gaya",
        cause: "Paste validation ko bypass kar deta hai.",
        fix: "Paste ke baad `Data → Circle Invalid Data` chalao — saari galat entries circle ho jayengi.",
      },
      {
        symptom: "Dependent dropdown khali dikh raha",
        cause: "Named ranges ke naam state names se match nahi karte (case/spacing).",
        fix: "Name Manager kholo; naam bilkul state spelling jaisa rakho (spaces ki jagah `_`).",
      },
    ],
    practice: "Status column par dropdown lagao, phir uske hisaab se ek conditional formatting rule. Ye do milakar aadha MIS sheet ready ho jaata hai.",
    shortcuts: [{ keys: "Alt + A + V + V", what: "Data Validation dialog" }],
    next: ["Dependent dropdown (State → City) kaise banayein?", "Duplicate entries kaise rokein?"],
  },

  {
    id: "sorting-filtering",
    name: "Sort / Filter / Tables",
    topic: "data",
    keys: ["sort", "filter", "table", "ctrl+t", "remove duplicates", "freeze pane", "subtotal", "slice data"],
    related: ["pivot", "data-validation"],
    chapter: 5,
    whatEn: "Ctrl+T turns a range into a Table: filters, banded rows, and auto-expanding formulas. Sort and Filter then work on named columns, not guessed ranges.",
    whatHi: "Ctrl+T range ko Table bana deta hai: filter, banded rows aur khud badhne wale formulas. Sort aur Filter phir named columns par chalta hai, andaze wali range par nahi.",
    ideaEn:
      "A Table is the cheapest upgrade in Excel: it fixes range-growth bugs for the rest of the file's life. Do it before anything else.",
    ideaHi:
      "Table Excel ka sabse sasta upgrade hai: file zindagi bhar range badhne wali galtiyan khatam. Sabse pehle yahi karo.",
    syntax: "Ctrl + T (Table) · Ctrl + Shift + L (Filter) · Alt + A + S + A (Sort A→Z)",
    args: [
      { name: "Ctrl + T", meaning: "Range ko Table banana (headers zaruri)", example: "tblSales" },
      { name: "Filter", meaning: "Column par dropdown se chhaantna", example: "Region = North" },
      { name: "Freeze panes", meaning: "Header ko fix rakhna", example: "View → Freeze Top Row" },
      { name: "Remove Duplicates", meaning: "Repeated rows hatana", example: "Data → Remove Duplicates" },
    ],
    stepsEn: [
      "Select any cell in the data → Ctrl + T → confirm \"My table has headers\".",
      "Rename the table on the Table Design tab (e.g. tblSales) — formulas can use it by name.",
      "Filter with Ctrl + Shift + L; sort from the same dropdown.",
      "For duplicates, select the key columns only in Remove Duplicates, otherwise near-duplicates survive.",
    ],
    stepsHi: [
      "Data ke kisi cell par click → Ctrl + T → \"My table has headers\" confirm karo.",
      "Table Design tab par naam do (jaise tblSales) — formulas naam se use kar sakte hain.",
      "Ctrl + Shift + L se filter; usi dropdown se sort.",
      "Duplicates ke liye Remove Duplicates mein sirf key columns chuno, warna paas-paas wale duplicate bach jayenge.",
    ],
    examples: [
      {
        title: "Filtered total (jo filter ke saath badalta hai)",
        table: [
          ["Region", "Amount"],
          ["North", "1200"],
          ["South", "800"],
        ],
        at: "F2",
        formula: "=SUBTOTAL(109, tblSales[Amount])",
        result: "1200 (sirf dikh rahi North row)",
        why: "SUBTOTAL 9 = sum, 109 = sum jo chhipi hui rows ko chhod deta hai. SUM use karte to 2000 aata.",
      },
    ],
    mistakes: [
      {
        symptom: "Filter lagane ke baad total nahi badla",
        cause: "SUM hidden rows ko bhi jodta hai.",
        fix: "`=SUBTOTAL(109, range)` use karo — 109 visible rows ka hi total deta hai.",
      },
      {
        symptom: "Sort karne se data mil gaya",
        cause: "Ek column select karke sort kiya, poori table nahi.",
        fix: "Table (Ctrl+T) banao ya poori range select karke sort karo; phir bhi undo (Ctrl+Z) se turant wapas.",
      },
    ],
    practice: "Data ko Ctrl+T karo, Region par filter lagao, SUBTOTAL se visible total nikaalo, aur Freeze Top Row karo. Ye chaar aadatein har report mein kaam aayengi.",
    shortcuts: [
      { keys: "Ctrl + T", what: "Table" },
      { keys: "Ctrl + Shift + L", what: "Filter toggle" },
      { keys: "Alt + A + S + S", what: "Custom sort" },
    ],
    next: ["SUBTOTAL aur SUM mein kya farq hai?", "Pivot Table table se behtar kab hai?"],
  },

  {
    id: "approximate-match",
    name: "Approximate Match (VLOOKUP TRUE / grades & slabs)",
    topic: "lookup",
    keys: ["approximate", "true", "range lookup", "grade lookup", "tax slab", "commission slab", "between values"],
    related: ["vlookup", "if-ifs"],
    chapter: 12,
    whatEn: "With TRUE (or 1) as the last argument, VLOOKUP finds the largest value that is not greater than yours — perfect for slabs and grades.",
    whatHi: "Aakhri argument TRUE (ya 1) hone par VLOOKUP aapki value se chhoti sabse badi value dhoondhta hai — slabs aur grades ke liye perfect.",
    ideaEn:
      "The table must be sorted ascending and must hold the LOWER bound of each slab (0, 31, 61, 81). Excel then walks down until it passes your number.",
    ideaHi:
      "Table ascending order mein honi chahiye aur usme har slab ki LOWER limit honi chahiye (0, 31, 61, 81). Excel neeche chalta jaata hai jab tak aapki value se aage na nikal jaye.",
    syntax: "=VLOOKUP(value, slab_table, 2, TRUE)",
    args: [
      { name: "value", meaning: "Jis number ka slab chahiye", example: "B2 (marks)" },
      { name: "slab_table", meaning: "Ascending table, pehle column mein lower bound", example: "$F$2:$G$5" },
      { name: "2", meaning: "Grade/label wala column", example: "2" },
      { name: "TRUE", meaning: "Approximate match — slab ka search", example: "TRUE" },
    ],
    stepsEn: [
      "Write the slab table with the LOWER bounds in the first column, ascending (0, 31, 61, 81).",
      "Sort the table ascending — approximate match requires it.",
      "Use TRUE (never leave it blank when the table is not sorted).",
      "Check the boundaries: exactly 60 should fall in the 31–60 slab, so the boundary numbers must be 0/31/61.",
    ],
    stepsHi: [
      "Slab table banao jisme pehle column mein LOWER limit ho, ascending (0, 31, 61, 81).",
      "Table ascending sort karo — approximate match ke liye zaruri hai.",
      "TRUE do (khali mat chhodo agar table sorted nahi hai).",
      "Boundary check karo: 60 exactly 31–60 wale slab mein aana chahiye, isliye numbers 0/31/61 hone chahiye.",
    ],
    examples: [
      {
        title: "Marks se grade",
        table: [
          ["Lower", "Grade"],
          ["0", "Fail"],
          ["33", "D"],
          ["60", "B"],
          ["80", "A"],
        ],
        at: "C2",
        formula: "=VLOOKUP(B2, $F$2:$G$5, 2, TRUE)",
        result: "B (marks 62 ke liye)",
        why: "62 se chhoti sabse badi lower bound 60 hai, isliye uska grade B. Exact match (0) yahan #N/A deta.",
      },
      {
        title: "Commission slab",
        table: [
          ["From", "Rate"],
          ["0", "0%"],
          ["100000", "2%"],
          ["500000", "5%"],
        ],
        at: "D2",
        formula: "=VLOOKUP(C2, $F$2:$G$4, 2, TRUE)",
        result: "5% (sales ₹5,20,000 par)",
        why: "5,20,000 >= 500000 hai, isliye 5% slab. Slab table ascending honi chahiye warna galat rate aayega.",
      },
    ],
    mistakes: [
      {
        symptom: "Galat slab/rate aa raha hai",
        cause: "Slab table ascending sort nahi hai.",
        fix: "Table ko pehle column par A→Z sort karo, phir formula check karo.",
      },
      {
        symptom: "Boundary par galat grade",
        cause: "Upper limits likh diye (30, 60, 80) jabki Excel lower limit maangta hai.",
        fix: "Lower limits likho: 0, 31, 61, 81 (ya 0, 30.0001… nahi — seedha 0/31/61/81).",
      },
    ],
    practice:
      "Ek slab table banao (0/33/60/80 par grade). 10 alag marks daal kar formula chalao, phir 32, 33, 59, 60, 79, 80 par boundary test karo — yahi interview ka favourite trap hai.",
    next: ["IFS se grade banana better hai ya VLOOKUP TRUE se?", "Tax slab wala complete sheet banao"],
  },

  {
    id: "where-to-start",
    name: "Where to start (learning path)",
    topic: "shortcut",
    keys: ["kahan se shuru", "where to start", "syllabus", "roadmap", "learning path", "beginner", "zero se"],
    related: ["career"],
    whatEn: "A four-week order that actually works: references and tables first, then lookups, then totals, then reports.",
    whatHi: "Chaar hafte ka order jo sach mein kaam karta hai: pehle references aur tables, phir lookups, phir totals, phir reports.",
    ideaEn:
      "Most students start with VLOOKUP and quit at #N/A. Start with $ references and Ctrl+T — every later topic becomes easier.",
    ideaHi:
      "Zyadatar log VLOOKUP se shuru karte hain aur #N/A par chhod dete hain. Pehle `$` references aur `Ctrl+T` seekho — aage ka har topic aasan ho jaata hai.",
    syntax: "Week 1: references + tables · Week 2: lookups · Week 3: totals · Week 4: dashboards",
    args: [
      { name: "Week 1", meaning: "$ references, Ctrl+T, sort/filter, number formats", example: "Chapter 3–5" },
      { name: "Week 2", meaning: "VLOOKUP, XLOOKUP, INDEX-MATCH, IFNA", example: "Chapter 12" },
      { name: "Week 3", meaning: "SUMIFS, COUNTIFS, IF/IFS, dates", example: "Chapter 7–9" },
      { name: "Week 4", meaning: "Pivot, chart, dashboard, Power Query", example: "Chapter 14–17" },
    ],
    stepsEn: [
      "Day 1–3: $ references and Ctrl+T tables. No formulas yet.",
      "Day 4–7: one lookup (VLOOKUP), then XLOOKUP; wrap every one in IFNA.",
      "Day 8–14: SUMIFS/COUNTIFS and IF/IFS; build one small invoice.",
      "Day 15–21: Pivot, one chart, one Slicer, one page.",
      "Day 22–30: Power Query from a folder, and one recorded macro.",
    ],
    stepsHi: [
      "Din 1–3: `$` references aur `Ctrl+T` table. Formula abhi nahi.",
      "Din 4–7: ek lookup (VLOOKUP), phir XLOOKUP; har ek par IFNA.",
      "Din 8–14: SUMIFS/COUNTIFS aur IF/IFS; ek chhoti invoice banao.",
      "Din 15–21: Pivot, ek chart, ek Slicer, ek page.",
      "Din 22–30: folder se Power Query, aur ek record kiya hua macro.",
    ],
    examples: [
      {
        title: "Pehla din: ek chhoti table",
        table: [
          ["Item", "Qty", "Rate"],
          ["Pen", "10", "15"],
        ],
        at: "D2",
        formula: "=B2*$C$2",
        result: "150",
        why: "Ek absolute reference (`$C$2`) aur ek relative (`B2`) — yahi poore Excel ka base hai.",
      },
    ],
    mistakes: [
      {
        symptom: "Course dekh kar lagta hai bahut bada hai",
        cause: "Sab kuch ek saath seekhne ki koshish.",
        fix: "Sirf chaar hafte ke chaar goals rakho; baaki topics flow mein aate rahenge.",
      },
    ],
    practice:
      "Aaj sirf do cheezein: ek table Ctrl+T banao aur ek formula mein F4 se lock karo. Kal se lookup shuru karo — bina jaldi.",
    next: ["Week 1 ka plan detail mein batao", "VLOOKUP kya hai?"],
  },
];
