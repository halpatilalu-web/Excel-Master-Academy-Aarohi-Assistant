import type { Concept } from "./types";

/** Maths, logic, text and error concepts. */
export const CORE_CONCEPTS: Concept[] = [
  {
    id: "sumifs",
    name: "SUMIFS / COUNTIFS",
    topic: "math",
    keys: ["sumifs", "sumif", "countifs", "countif", "averageifs", "multiple condition sum"],
    related: ["filter", "pivot"],
    chapter: 8,
    whatEn:
      "SUMIFS adds numbers only where EVERY condition is true. COUNTIFS counts the rows that match. SUMIF/COUNTIF are the one-condition versions.",
    whatHi:
      "SUMIFS sirf unhi numbers ko jodta hai jahan SAARI sharten sach ho. COUNTIFS ginti karta hai. SUMIF/COUNTIF ek shart wale purane bhai hain.",
    ideaEn:
      "Order matters: in SUMIFS the sum_range comes FIRST, then pairs of (range, criteria). In SUMIF the sum_range comes LAST. That swap is the number-one reason students get 0.",
    ideaHi:
      "Order yaad rakho: SUMIFS mein sum_range SABSE PEHLE aata hai, phir (range, criteria) ki jodi. Purane SUMIF mein sum_range aakhir mein. Isi ulti-pulti wajah se 90% log 0 answer paate hain.",
    syntax: "=SUMIFS(sum_range, criteria_range1, criteria1, [criteria_range2, criteria2], …)",
    args: [
      { name: "sum_range", meaning: "Jo numbers jodne hain", example: "$D$2:$D$500" },
      { name: "criteria_range1", meaning: "Pehli shart kis column par", example: "$B$2:$B$500" },
      { name: "criteria1", meaning: "Us shart ki value ya pattern", example: "\"North\"" },
      { name: "criteria_range2, criteria2 …", meaning: "Aur sharten", example: "\">=10000\"" },
    ],
    stepsEn: [
      "Excel checks row 2 against condition 1; if true, condition 2; and so on.",
      "Only rows where all conditions pass contribute their sum_range value.",
      "Text is not case-sensitive (\"north\" = \"North\"); comparisons like \">=1000\" must be in quotes.",
      "Wildcards work in criteria: \"Pen*\" matches Pen, Pencil, Pen-Refill.",
    ],
    stepsHi: [
      "Excel row 2 ko pehli shart se check karta hai, phir doosri, phir teesri.",
      "Sirf woh rows jud jaati hain jahan saari sharten sach hon.",
      "Text case-sensitive nahi hai (\"north\" = \"North\"); \">=1000\" jaisi comparison quotes mein likhni padti hai.",
      "Criteria mein wildcard chalta hai: \"Pen*\" Pen, Pencil, Pen-Refill sab pakadta hai.",
    ],
    examples: [
      {
        title: "North region mein Pen ki total bikri",
        table: [
          ["Region", "Product", "Amount"],
          ["North", "Pen", "1200"],
          ["South", "Pen", "800"],
          ["North", "Pen", "1300"],
          ["North", "Book", "500"],
        ],
        at: "F2",
        formula: "=SUMIFS($C$2:$C$5, $A$2:$A$5, \"North\", $B$2:$B$5, \"Pen\")",
        result: "2500",
        why: "North + Pen wali do rows (1200 + 1300) hi match hui; Book wali row shart doosri par fail ho gayi.",
      },
      {
        title: "10,000 se zyada kitne orders?",
        table: [
          ["Order", "Amount"],
          ["A", "9000"],
          ["B", "15000"],
          ["C", "24000"],
        ],
        at: "F3",
        formula: "=COUNTIFS($B$2:$B$4, \">=10000\")",
        result: "2",
        why: "15000 aur 24000 qualify karte hain. Comparison operator quotes ke andar hona chahiye.",
      },
    ],
    mistakes: [
      {
        symptom: "Answer 0 aa raha hai jabki data hai",
        cause: "SUMIFS me sum_range aur criteria range ulte ho gaye, ya criteria range ka size alag hai.",
        fix: "Sabhi ranges ka size SAME rakho. Pehla argument hamesha numbers wala column.",
      },
      {
        symptom: "Numbers text ban gaye hain to 0 milta hai",
        cause: "Amount column text hai (left aligned).",
        fix: "`=ISTEXT(C2)` se check karo, phir `Data → Text to Columns → Finish` ya `=VALUE(C2)` se number banao.",
      },
      {
        symptom: "Date ki condition chal nahi rahi",
        cause: "Date text hai ya operator string mein hai.",
        fix: "`\">=\"&DATE(2026,1,1)` ya `\">=\"&H2` (jahan H2 me date ho) — seedha date quote me na likho.",
      },
    ],
    practice:
      "4 column ka data banao (Region, Product, Month, Amount) aur 3 conditions wala SUMIFS lagao. Phir ek condition hata kar dekho answer kaise badalta hai — isse pata chalega kaunsa filter kitna kaam kar raha hai.",
    shortcuts: [{ keys: "F4", what: "Ranges lock karna (dragging ke liye)" }],
    next: ["SUMIF aur SUMIFS mein kya farq hai?", "Pivot Table se same kaam kaise karein?"],
  },

  {
    id: "if-ifs",
    name: "IF / IFS / AND / OR",
    topic: "logical",
    keys: ["if", "ifs", "nested if", "and(", "or(", "logical", "iferror", "ifna"],
    related: ["sumifs"],
    chapter: 7,
    whatEn: "IF asks a yes/no question and picks one of two answers. IFS chains several questions. AND/OR combine conditions.",
    whatHi: "IF ek haan/naan sawal poochh kar do mein se ek jawab chunta hai. IFS kai sawal ek saath. AND/OR sharten jodte hain.",
    ideaEn:
      "\"If marks >= 33 then Pass else Fail.\" Every IF is that sentence. Nested IFs get unreadable after three levels — that is exactly when IFS (or a lookup table) should take over.",
    ideaHi:
      "\"Agar marks 33 se zyada to Pass warna Fail.\" Har IF yahi vaakya hai. Teen se zyada IF ek ke andar ek rakhoge to formula padhna mushkil ho jayega — wahan IFS use karo.",
    syntax: "=IF(test, value_if_true, [value_if_false])   |   =IFS(test1, value1, test2, value2, …)",
    args: [
      { name: "test", meaning: "TRUE/FALSE dene wali koi bhi shart", example: "B2>=33" },
      { name: "value_if_true", meaning: "Shart sach ho to kya", example: "\"Pass\"" },
      { name: "value_if_false", meaning: "Jhoot ho to kya", example: "\"Fail\"" },
      { name: "IFS ka aakhri TRUE", meaning: "Sab fail ho jayein to default", example: "TRUE, \"Fail\"" },
    ],
    stepsEn: [
      "Excel evaluates the test to TRUE or FALSE.",
      "TRUE → it returns the second argument; FALSE → the third.",
      "Text answers must be quoted; numbers are not. TRUE/FALSE are keywords, never \"TRUE\" in quotes.",
      "IFS checks in order and stops at the FIRST true test, so put the strictest condition on top.",
    ],
    stepsHi: [
      "Excel test ko TRUE ya FALSE banata hai.",
      "TRUE → doosra argument, FALSE → teesra.",
      "Text jawab quotes mein, numbers bina quotes. TRUE/FALSE keyword hain, unhe quote mat karo.",
      "IFS upar se check karta hai aur PEHLI sach shart par ruk jaata hai — isliye sabse sakht shart sabse upar rakho.",
    ],
    examples: [
      {
        title: "Pass / Fail",
        table: [
          ["Name", "Marks", "Result"],
          ["Amit", "45", ""],
          ["Priya", "28", ""],
        ],
        at: "C2",
        formula: "=IF(B2>=33, \"Pass\", \"Fail\")",
        result: "Pass",
        why: "45 >= 33 sach hai, isliye \"Pass\". C3 me wahi formula 28 par \"Fail\" dega.",
      },
      {
        title: "Grade with IFS (ek hi formula, 4 levels)",
        table: [
          ["Name", "Marks"],
          ["Amit", "85"],
          ["Priya", "62"],
        ],
        at: "C2",
        formula: "=IFS(B2>=80,\"A\", B2>=60,\"B\", B2>=40,\"C\", TRUE,\"Fail\")",
        result: "A",
        why: "85 pehli shart (>=80) par hi sach ho gaya, isliye \"A\" aur baaki check hi nahi hue.",
      },
      {
        title: "AND — dono sharten chahiye",
        table: [
          ["Name", "Attendance", "Marks"],
          ["Amit", "90", "80"],
          ["Priya", "60", "85"],
        ],
        at: "D2",
        formula: "=IF(AND(B2>=75, C2>=75), \"Eligible\", \"Not eligible\")",
        result: "Eligible",
        why: "Amit ki attendance 90 aur marks 80 — dono 75+ hain. Priya attendance 60 par fail ho gayi.",
      },
    ],
    mistakes: [
      {
        symptom: "Answer TRUE/FALSE aa raha hai, \"Pass\" nahi",
        cause: "Doosra/teesra argument nahi diya, ya quotes chhoot gaye.",
        fix: "`=IF(B2>=33,\"Pass\",\"Fail\")` — dono jawab do aur text ko quote karo.",
      },
      {
        symptom: "#NAME? IF ke saath",
        cause: "Excel mein comma ki jagah semicolon wali locale, ya IF ke andar sheet name mein space.",
        fix: "Argument separator check karo; sheet naam quote karo: `'My Sheet'!A1`.",
      },
      {
        symptom: "IFS mein #N/A",
        cause: "Koi bhi shart sach nahi hui aur fallback nahi diya.",
        fix: "Aakhir mein `TRUE, \"Fail\"` daalo — woh hamesha sach hota hai.",
      },
      {
        symptom: "Sab answer \"Fail\" aa raha hai",
        cause: "Marks text hain, isliye 45 >= 33 comparison galat hua.",
        fix: "Marks ko number banao: `=IF(VALUE(B2)>=33,...)`, ya column ko Text to Columns se number karo.",
      },
    ],
    practice:
      "Ek chhoti marks table banao. Pehle simple IF, phir IFS se grade, phir AND se 'Eligible' wali shart. Teen jawab ek hi sheet par dekh kar difference yaad rahega.",
    shortcuts: [{ keys: "Ctrl + ` ", what: "Saare formulas ek saath dekhna (values ki jagah)" }],
    next: ["IFS mein TRUE kyun likhte hain?", "IFERROR aur IFNA mein kya farq hai?"],
  },

  {
    id: "iferror",
    name: "IFERROR / IFNA",
    topic: "error",
    keys: ["iferror", "ifna", "iserror", "error handling", "hide error"],
    related: ["vlookup", "if-ifs"],
    whatEn: "IFERROR replaces ANY error with a value you choose; IFNA replaces only #N/A.",
    whatHi: "IFERROR kisi bhi error ko aapke diye value se badal deta hai; IFNA sirf #N/A ko badalta hai.",
    ideaEn:
      "IFERROR is a blanket: it hides #N/A, but also hides #REF! and #VALUE! — i.e. it hides YOUR bugs too. IFNA only hides \"not found\", which is a real situation, not a mistake.",
    ideaHi:
      "IFERROR ek blanket hai — #N/A to chhupata hai, par apni galtiyan (#REF!, #VALUE!) bhi chhupa deta hai. IFNA sirf \"nahi mila\" chhupata hai, jo galti nahi situation hai. Isliye lookup ke saath IFNA better hai.",
    syntax: "=IFERROR(value, value_if_error)   |   =IFNA(value, value_if_na)",
    args: [
      { name: "value", meaning: "Formula jise chalana hai", example: "VLOOKUP(A2,$A$2:$C$100,3,0)" },
      { name: "value_if_error", meaning: "Error aane par kya dikhe", example: "\"Not found\"" },
    ],
    stepsEn: [
      "Excel evaluates the inner formula.",
      "If it returns an error value, the whole IFERROR returns the second argument instead.",
      "If it returns anything else (including 0 and \"\"), it is passed through untouched.",
    ],
    stepsHi: [
      "Excel andar wala formula chalata hai.",
      "Error value aaye to poora IFERROR doosra argument de deta hai.",
      "Baaki kuch bhi aaye (0 ya \"\" bhi) to waisa hi aage jaata hai.",
    ],
    examples: [
      {
        title: "Missing ID par \"Not found\"",
        table: [
          ["EmpID", "Name"],
          ["101", "Amit"],
        ],
        at: "D2",
        formula: "=IFNA(VLOOKUP(999,$A$2:$B$3,2,0), \"Not found\")",
        result: "Not found",
        why: "999 nahi mila to VLOOKUP #N/A deta, IFNA ne usse \"Not found\" bana diya.",
      },
    ],
    mistakes: [
      {
        symptom: "Galat answer chhup gaya, pata hi nahi chala",
        cause: "Poora formula IFERROR mein lipta hua hai, isliye #VALUE! bhi chhup gaya.",
        fix: "Lookup ke liye IFNA use karo; IFERROR sirf wahan jahan aap har error ko jaan-boojh kar chhupana chahte ho.",
      },
    ],
    practice: "Kisi lookup par pehle IFERROR lagao, phir IFNA. Galat ID daal kar dono ka behaviour compare karo — farq turant samajh aayega.",
    next: ["Excel ke 12 errors ka matlab kya hai?"],
  },

  {
    id: "text-cleaning",
    name: "Data Cleaning (TRIM / CLEAN / PROPER)",
    topic: "text",
    keys: ["trim", "clean", "proper", "data cleaning", "extra space", "textsplit", "text to columns", "dirty data", "duplicate"],
    related: ["sumifs", "power-query"],
    chapter: 5,
    whatEn: "TRIM removes extra spaces, CLEAN removes invisible characters, PROPER fixes CaPiTaLiSaTiOn — and together they fix 80% of messy exports.",
    whatHi: "TRIM faltu spaces hatata hai, CLEAN chhupe hue invisible characters, aur PROPER galat capitalisation theek karta hai — teeno milkar export ka 80% kachra saaf kar dete hain.",
    ideaEn:
      "\"Amit \" and \"Amit\" look identical and are different values. That is why VLOOKUP fails on data that looks correct, why duplicates survive Remove Duplicates, and why SUMIFS returns 0.",
    ideaHi:
      "\"Amit \" aur \"Amit\" dekhne mein same lagte hain par Excel ke liye alag hain. Isi wajah se VLOOKUP galat #N/A deta hai, duplicate nahi hate, aur SUMIFS 0 deta hai — jabki data sahi dikh raha hota hai.",
    syntax: "=PROPER(TRIM(CLEAN(A2)))",
    args: [
      { name: "CLEAN(text)", meaning: "Non-printable characters (line break, tab) hatata hai", example: "=CLEAN(A2)" },
      { name: "TRIM(text)", meaning: "Aage-peeche aur beech ke extra spaces hatata hai", example: "=TRIM(A2)" },
      { name: "PROPER(text)", meaning: "Pehla letter capital, baaki small", example: "=PROPER(\"amit kumar\") → Amit Kumar" },
      { name: "UPPER / LOWER", meaning: "Poora capital / poora small", example: "=UPPER(A2)" },
    ],
    stepsEn: [
      "CLEAN first — it removes characters you cannot see, so later steps are not confused.",
      "TRIM second — removes leading/trailing spaces and collapses double spaces to one.",
      "PROPER last — standardises names so grouping and sorting behave.",
      "Then: Text to Columns for splitting, Remove Duplicates for repeats, and a Ctrl+T table so the cleanup stays with the data.",
    ],
    stepsHi: [
      "Pehle CLEAN — jo characters dikhte nahi unhe hatao, warna aage ke steps confuse honge.",
      "Phir TRIM — aage-peeche ke space hatao aur double space ko single banao.",
      "Phir PROPER — naam standardise hote hain, sorting aur grouping sahi chalti hai.",
      "Uske baad: Text to Columns se todna, Remove Duplicates se duplicate hatana, aur Ctrl+T table banane se data ke saath rehna.",
    ],
    examples: [
      {
        title: "Ek hi formula, teeno problems",
        table: [
          ["Raw name", "Cleaned"],
          ["  amit   kumar ", ""],
          ["PRIYA sharma", ""],
        ],
        at: "B2",
        formula: "=PROPER(TRIM(CLEAN(A2)))",
        result: "Amit Kumar",
        why: "TRIM ne extra spaces hataye, PROPER ne capitalisation theek ki. Ab ye \" Amit Kumar\" se match karega.",
      },
      {
        title: "Duplicate IDs pehchanne ke liye helper column",
        table: [
          ["EmpID", "Count"],
          ["101", ""],
          ["101 ", ""],
        ],
        at: "B2",
        formula: "=COUNTIF($A$2:$A$3, TRIM(A2))",
        result: "2",
        why: "TRIM ke bina ye 1 aur 1 deta — dono alag dikhte hain. Ab pata chala dono same ID hain.",
      },
    ],
    mistakes: [
      {
        symptom: "TRIM se bhi space nahi hata",
        cause: "Space normal nahi, non-breaking space (CHAR(160)) hai — TRIM usse nahi hatata.",
        fix: "`=TRIM(SUBSTITUTE(A2, CHAR(160), \" \"))`.",
      },
      {
        symptom: "Formula se data theek hua par original column me change nahi",
        cause: "Formula naya column banata hai, purana nahi badalta.",
        fix: "Formula column select → Copy → Paste Special → Values → purane column par paste.",
      },
    ],
    practice:
      "Kisi download ki hui CSV ka naam column lo aur teen helper columns banao: CLEAN, TRIM, PROPER. Phir teeno ko ek saath nest karke ek final clean column banao. CountIF se check karo kitne duplicates chhupe the.",
    shortcuts: [
      { keys: "Ctrl + H", what: "Find & Replace — space ko khali se replace karna" },
      { keys: "Alt + A + M", what: "Remove Duplicates" },
      { keys: "Ctrl + T", what: "Data ko Table banana (cleanup saath chalta hai)" },
    ],
    next: ["Power Query se cleaning kaise automate karein?", "Text to Columns kab use karein?"],
  },

  {
    id: "filter",
    name: "FILTER / UNIQUE / SORT",
    topic: "dynamic",
    keys: ["filter", "unique", "sort", "dynamic array", "spill", "#spill", "spill error"],
    related: ["sumifs", "pivot"],
    chapter: 8,
    whatEn: "FILTER returns only the rows that match a condition. UNIQUE removes repeats. SORT orders the result. They are the modern, formula-based answer to Pivot Tables.",
    whatHi: "FILTER sirf match hone wali rows deta hai, UNIQUE duplicate hataata hai, SORT order lagata hai. Ye Pivot Table ka formula-wala modern version hai.",
    ideaEn:
      "One formula produces a whole block of rows and \u201cspills\u201d into the cells below. So the cells below and to the right must be EMPTY — that is what #SPILL! means.",
    ideaHi:
      "Ek formula poora block bana kar neeche ke cells mein \u201cspill\u201d ho jaata hai. Isliye neeche-daayen ke cells khaali hone chahiye — #SPILL! ka matlab exactly yahi hai.",
    syntax: "=FILTER(array, include, [if_empty])",
    args: [
      { name: "array", meaning: "Poora data block", example: "$A$2:$D$500" },
      { name: "include", meaning: "TRUE/FALSE wali condition", example: "$A$2:$A$500=\"North\"" },
      { name: "if_empty", meaning: "Kuch match na ho to kya dikhe", example: "\"No records\"" },
    ],
    stepsEn: [
      "Excel checks the include condition for each row of array.",
      "Rows that evaluate TRUE are kept, in their original order.",
      "The result spills down; if those cells are not empty you get #SPILL!.",
      "Chain it: SORT(FILTER(...)) or UNIQUE(FILTER(...)) to build a live report.",
    ],
    stepsHi: [
      "Excel array ki har row par include condition check karta hai.",
      "Jo rows TRUE deti hain woh apne order mein rakhi jaati hain.",
      "Result neeche spill hota hai; agar wahan cells bhare hue hain to #SPILL! aata hai.",
      "Chain karo: SORT(FILTER(...)) ya UNIQUE(FILTER(...)) se live report banti hai.",
    ],
    examples: [
      {
        title: "Sirf North ke orders, amount se sorted",
        table: [
          ["Region", "Product", "Amount"],
          ["North", "Pen", "1200"],
          ["South", "Pen", "800"],
          ["North", "Book", "500"],
        ],
        at: "F2",
        formula: "=SORT(FILTER($A$2:$C$4, $A$2:$A$4=\"North\", \"No records\"), 3, -1)",
        result: "North | Pen | 1200\nNorth | Book | 500",
        why: "FILTER ne dono North rows rakhi, SORT ne teesre column (Amount) par 1200 pehle rakha.",
      },
      {
        title: "Kitne unique regions hain?",
        table: [
          ["Region"],
          ["North"],
          ["South"],
          ["North"],
        ],
        at: "C2",
        formula: "=UNIQUE($A$2:$A$4)",
        result: "North\nSouth",
        why: "Duplicate North hata kar sirf pehli baar aane wali values spill hoti hain.",
      },
    ],
    mistakes: [
      {
        symptom: "#SPILL!",
        cause: "Spill hone wali jagah mein pehle se data hai (ya merged cells hain).",
        fix: "Neeche-daayen ke cells khaali karo. Formula baar baar #SPILL! de to usse alag naye sheet par rakho.",
      },
      {
        symptom: "#CALC!",
        cause: "FILTER ko kuch bhi match nahi mila aur if_empty nahi diya.",
        fix: "Teesra argument do: `=FILTER(range, condition, \"No records\")`.",
      },
      {
        symptom: "#VALUE!",
        cause: "Include array ka size data ke rows se match nahi kar raha.",
        fix: "Same rows par dono select karo — 499 rows ka data, 499 rows ki condition.",
      },
    ],
    practice:
      "Apni 10-row table par FILTER lagao with a region condition, phir usi ko SORT aur UNIQUE mein wrap karo. Ek hi formula se live mini-report ban jayegi — data badlo, report apne aap badal jaayegi.",
    next: ["FILTER aur Pivot Table mein kya behtar hai?", "#SPILL! kaise theek karein?"],
  },

  {
    id: "errors",
    name: "Excel Errors (12)",
    topic: "error",
    keys: [
      "#n/a",
      "#value!",
      "#ref!",
      "#div/0!",
      "#name?",
      "#num!",
      "#null!",
      "#spill",
      "#calc!",
      "#connect!",
      "#blocked!",
      "error",
      "error kaise theek karein",
    ],
    related: ["iferror", "vlookup", "filter"],
    chapter: 10,
    whatEn: "Each Excel error is a specific complaint, not a generic failure. Reading the code tells you which of five things went wrong.",
    whatHi: "Har Excel error ek specific shikayat hai, generic failure nahi. Code padh lo to pata chal jaata hai ki paanch cheezon mein se kaunsi galat hui.",
    ideaEn:
      "Group them: (1) nothing found → #N/A, (2) wrong type → #VALUE!, (3) reference is gone or invalid → #REF!/#NULL!, (4) maths is impossible → #DIV/0!/#NUM!, (5) don't know this name/space → #NAME?/#SPILL!.",
    ideaHi:
      "Group bana lo: (1) kuch mila nahi → #N/A, (2) type galat → #VALUE!, (3) reference gaya/galat → #REF!/#NULL!, (4) maths namumkin → #DIV/0!/#NUM!, (5) naam/jagah pata nahi → #NAME?/#SPILL!.",
    syntax: "Read the code → fix the cause → only then wrap with IFERROR",
    args: [
      { name: "#N/A", meaning: "Lookup value nahi mili", example: "VLOOKUP ka data type check karo" },
      { name: "#VALUE!", meaning: "Galat type — text par maths", example: "`=A2*2` jahan A2 mein \"500 km\" hai" },
      { name: "#REF!", meaning: "Reference delete ho gaya", example: "Column delete karne se formula toota" },
      { name: "#DIV/0!", meaning: "Zero se divide", example: "`=A2/B2` jahan B2 = 0" },
      { name: "#NAME?", meaning: "Excel function/naam nahi jaanta", example: "`XLOOKUP` purane Excel mein" },
      { name: "#SPILL!", meaning: "Dynamic array ki jagah bhara hui hai", example: "Neeche ke cells khaali karo" },
    ],
    stepsEn: [
      "Click the cell and read the error code — never guess.",
      "Use Evaluate Formula (Formulas → Evaluate Formula) to walk the calculation step by step.",
      "Fix the cause: type, reference, zero-divisor, or name.",
      "Only after fixing, wrap with IFNA so a genuine \"not found\" looks friendly.",
    ],
    stepsHi: [
      "Cell par click karke code padho — andaza mat lagao.",
      "Formulas → Evaluate Formula se calculation step by step chala kar dekho.",
      "Cause theek karo: type, reference, zero, ya naam.",
      "Theek hone ke baad hi IFNA lagao taaki sirf asli \"not found\" friendly dikhe.",
    ],
    examples: [
      {
        title: "Sabse common: zero se divide",
        table: [
          ["Sales", "Target", "Achievement %"],
          ["5000", "0", ""],
        ],
        at: "C2",
        formula: "=IF(B2=0, \"No target\", A2/B2)",
        result: "No target",
        why: "B2 zero hai, isliye division hi nahi hui. IFERROR lagane se bhi kaam chalta, par causa yahan saaf dikh raha hai.",
      },
      {
        title: "Text jaisa number",
        table: [
          ["Qty", "Price", "Total"],
          ["2", "150", ""],
        ],
        at: "C2",
        formula: "=VALUE(A2)*B2",
        result: "300",
        why: "A2 text tha; VALUE ne number banaya aur multiply chal gaya.",
      },
    ],
    mistakes: [
      {
        symptom: "#N/A aa raha hai",
        cause: "Lookup value mili nahi — ya to data type alag hai (number vs text), ya extra space hai, ya lookup column galat hai.",
        fix: "`=ISTEXT(A2)` se type check karo, `=TRIM(A2)` lagao, aur table ka pehla column sahi karo. `=IFNA(formula, \"Not found\")` se friendly message do.",
      },
      {
        symptom: "#VALUE! aa raha hai",
        cause: "Text par maths — jaise `A2*2` jahan A2 mein \"500 km\" ya khali cell hai.",
        fix: "`=VALUE(A2)` ya `=NUMBERVALUE(A2)` se number banao; khali cells ke liye `=IF(A2=\"\",0,A2*2)`.",
      },
      {
        symptom: "#DIV/0! aa raha hai",
        cause: "Zero (ya khali cell) se divide ho raha hai.",
        fix: "`=IF(B2=0, \"\", A2/B2)` — pehle zero handle karo, phir divide.",
      },
      {
        symptom: "#REF! aa raha hai",
        cause: "Jis column/cell ka reference formula mein tha, woh delete ho gaya (ya sheet delete hui).",
        fix: "`Ctrl + Z` se undo karo. Permanent fix: formula ko `Ctrl + \`` se dekho aur reference dobara do; poori column ki jagah named table use karo.",
      },
      {
        symptom: "#SPILL! aa raha hai",
        cause: "Dynamic array (FILTER/SORT/UNIQUE) ko neeche jagah nahi mili — cells bhare hue hain ya merged hain.",
        fix: "Spill area khaali karo: `Ctrl + G → Special → Blanks` se check karo, merged cells todo, warna formula ko alag sheet par rakho.",
      },
      {
        symptom: "#SPILL! ke saath #CALC!",
        cause: "#CALC! ka matlab FILTER ko kuch match nahi mila aur `if_empty` argument nahi diya.",
        fix: "Teesra argument do: `=FILTER(range, condition, \"No records\")`.",
      },
      {
        symptom: "#NAME? aa raha hai",
        cause: "Function ka naam galat hai (jaise `VLOOKUP` ki jagah `VLOOKUP ` ya `VLUKUP`), ya Excel ka purana version naya function nahi jaanta.",
        fix: "Naam spell check karo; purane Excel par `XLOOKUP`/`FILTER` ki jagah `INDEX-MATCH`/`IF` use karo.",
      },
      {
        symptom: "IFERROR lagane ke baad bhi galat answer",
        cause: "Error chhup gaya par cause reh gaya (jaise galat range).",
        fix: "Pehle Evaluate Formula se asli wajah dekho, phir chhupao.",
      },
    ],
    practice:
      "Jaan-boojh kar 5 errors banao (zero divide, text*number, deleted reference, galat name, FILTER bina if_empty). Har ek ko Evaluate Formula se kholo — 10 minute mein errors se darr khatam ho jayega.",
    shortcuts: [{ keys: "Ctrl + ` ", what: "Formulas dikhana" }, { keys: "F9", what: "Selected part ka result dekhna" }],
    next: ["#N/A kaise theek karein?", "#SPILL! kyun aata hai?"],
  },
];
