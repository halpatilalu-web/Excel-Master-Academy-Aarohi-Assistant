import type { Concept } from "./types";

/**
 * Lookup concepts. Every worked example uses the same tiny employee table so a
 * student can put it in a real sheet and follow along, and so the tests can
 * evaluate each formula with the app's own engine.
 */
export const LOOKUP_CONCEPTS: Concept[] = [
  {
    id: "vlookup",
    name: "VLOOKUP",
    topic: "lookup",
    keys: ["vlookup", "v lookup", "v-lookup", "vertical lookup"],
    related: ["xlookup", "index-match", "hlookup"],
    chapter: 12,
    whatEn:
      "VLOOKUP finds a value in the FIRST column of a table and brings back something from a column to its right.",
    whatHi:
      "VLOOKUP table ke pehle column mein value dhoondhta hai aur usi row ka daayen (right) wala column wapas laata hai.",
    ideaEn:
      "Think of it as a school register: you know the roll number (first column), and the register gives you the row — you then read the 3rd column of that row. Because it only searches column 1 and only reads rightwards, the lookup column can never be to the right of the first column.",
    ideaHi:
      "Isko school register ki tarah samjho: roll number pata hai (pehla column), register row dikha deta hai, aur us row ka teesra column aap padh lete ho. Isliye lookup column hamesha table ka pehla column hona chahiye, aur answer uske daayen hi milega — left nahi.",
    syntax: "=VLOOKUP(lookup_value, table_array, col_index_num, [range_lookup])",
    args: [
      { name: "lookup_value", meaning: "Kya dhoondhna hai", example: "A2 (Employee ID)" },
      { name: "table_array", meaning: "Poori table, lookup column sabse pehle", example: "$F$2:$H$100" },
      { name: "col_index_num", meaning: "Table ke andar kaunsa column chahiye (ginti 1 se)", example: "3" },
      { name: "range_lookup", meaning: "0 = exact match, 1 = approximate (sorted)", example: "0" },
    ],
    stepsEn: [
      "Excel takes the lookup value (say A2 = 102) and scans the first column of table_array top to bottom.",
      "The first exact hit stops the search — later duplicates are ignored, so duplicate IDs silently return the topmost row.",
      "It counts col_index_num - 1 columns to the right from that row (col 1 is the ID column itself).",
      "It returns the value in that cell. If nothing matched and range_lookup is 0, you get #N/A.",
    ],
    stepsHi: [
      "Excel lookup value (jaise A2 = 102) lekar table_array ke pehle column ko upar se neeche scan karta hai.",
      "Pehla exact match milte hi search ruk jaata hai — agar duplicate IDs hain to sabse upar wali row milti hai, baaki chup-chaap ignore ho jaati hain.",
      "Us row se col_index_num - 1 column daayen ginti karta hai (column 1 khud ID column hai).",
      "Us cell ki value return karta hai. Match na mile aur range_lookup 0 ho to #N/A aata hai.",
    ],
    examples: [
      {
        title: "Employee ID se salary nikaalni hai",
        table: [
          ["EmpID", "Name", "Salary"],
          ["101", "Amit", "42000"],
          ["102", "Priya", "48000"],
          ["103", "Rohit", "51000"],
        ],
        at: "F2",
        formula: "=VLOOKUP(E2, $A$2:$C$4, 3, 0)",
        result: "48000",
        why: "E2 mein 102 hai, 102 table ki row 3 mein mila, aur 3rd column = Salary. Isliye 48000.",
      },
      {
        title: "Naam se ID (ulta lookup) — yahan VLOOKUP fail hota hai",
        table: [
          ["EmpID", "Name", "Salary"],
          ["101", "Amit", "42000"],
          ["102", "Priya", "48000"],
        ],
        at: "F3",
        formula: "=VLOOKUP(\"Priya\", $A$2:$C$3, 3, 0)",
        result: "#N/A",
        why: "Table ka pehla column EmpID hai, Priya usme nahi hai. VLOOKUP kabhi left nahi dekhta — isliye #N/A. Yahan XLOOKUP ya INDEX-MATCH chahiye.",
      },
    ],
    mistakes: [
      {
        symptom: "#N/A aa raha hai jabki value table mein dikh rahi hai",
        cause: "Numbers vs text: ID sheet mein 102 (number) hai par table mein \"102\" (text, akela hara triangle) — ya extra space hai.",
        fix: "Dono ko ek type banao: `=VLOOKUP(A2*1, ...)` number ke liye, ya `=TRIM(A2)` text ke liye. `=ISTEXT(A2)` se check karo.",
      },
      {
        symptom: "Formula neeche drag karne par #N/A ya galat answer",
        cause: "table_array lock nahi hui — A2:C100 neeche jaate-jaate A9:C107 ban gayi.",
        fix: "Table ko `F4` se lock karo: `$A$2:$C$100`. Sirf lookup value (A2) chalti rahe.",
      },
      {
        symptom: "Galat value aa rahi hai, par error nahi",
        cause: "range_lookup chhoot gaya (default 1 = approximate) — Excel ne sabse kareeb value utha li.",
        fix: "Chautha argument hamesha `0` likho. `=VLOOKUP(A2,$A$2:$C$100,3,0)`.",
      },
      {
        symptom: "Column insert karne ke baad answer badal gaya",
        cause: "col_index_num ek fixed number hai; naya column aane par 3 ka matlab badal jaata hai.",
        fix: "Yahan XLOOKUP behtar hai kyunki woh column range deta hai, ginti nahi.",
      },
    ],
    practice:
      "A1:C5 mein 4 employee ki table banao, E2 mein koi ID likho, F2 mein `=VLOOKUP(E2,$A$2:$C$5,2,0)` lagao. Ab E2 badal kar dekho — naam turant badlega. Phir jaan-boojh kar galat ID daalo aur `IFERROR` se error chhupao.",
    shortcuts: [
      { keys: "F4", what: "Formula mein reference ko $A$2 (absolute) banana" },
      { keys: "Ctrl + ` (backtick)", what: "Sheet par formulas dikhana, values ki jagah" },
      { keys: "F9", what: "Formula ka ek hissa select karke uska result dekhna" },
    ],
    next: ["VLOOKUP aur XLOOKUP mein kya farq hai?", "INDEX-MATCH kaise lagayein?", "#N/A kaise theek karein?"],
  },

  {
    id: "xlookup",
    name: "XLOOKUP",
    topic: "lookup",
    keys: ["xlookup", "x lookup", "x-lookup"],
    related: ["vlookup", "index-match", "xmatch"],
    chapter: 12,
    whatEn:
      "XLOOKUP is the modern replacement for VLOOKUP: you name the lookup column and the return column separately, so it works in any direction.",
    whatHi:
      "XLOOKUP naya lookup hai: aap lookup column aur return column alag-alag dete ho, isliye left ya right kisi bhi taraf se value aa sakti hai.",
    ideaEn:
      "Instead of \"3rd column to the right\", you literally say \"look inside column F, give me the matching value from column D\". No counting, nothing breaks when a column is inserted.",
    ideaHi:
      "Yahan aap column number nahi ginte — seedha bolte ho \"F column mein dhoondho, D column se value do\". Column insert ho jaye to bhi formula nahi tootta.",
    syntax: "=XLOOKUP(lookup_value, lookup_array, return_array, [if_not_found], [match_mode], [search_mode])",
    args: [
      { name: "lookup_value", meaning: "Kya dhoondhna hai", example: "A2" },
      { name: "lookup_array", meaning: "Kis column/row mein dhoondhna hai", example: "$F$2:$F$100" },
      { name: "return_array", meaning: "Kis column/row se value laani hai", example: "$D$2:$D$100" },
      { name: "if_not_found", meaning: "Match na mile to kya dikhe", example: "\"Not Found\"" },
      { name: "match_mode", meaning: "0 exact, -1 exact ya chhota, 1 exact ya bada, 2 wildcard", example: "0" },
      { name: "search_mode", meaning: "1 pehla, -1 aakhri (latest), 2 binary asc, -2 binary desc", example: "1" },
    ],
    stepsEn: [
      "Excel walks lookup_array in the direction you chose (search_mode 1 = top to bottom).",
      "It compares each item with lookup_value using match_mode (0 = must be identical, no fuzzy luck).",
      "On a hit it takes the item at the SAME position in return_array — the two arrays must be the same size.",
      "If nothing hit, it returns if_not_found instead of #N/A. search_mode -1 finds the LAST match, which is how you get the latest invoice for a customer.",
    ],
    stepsHi: [
      "Excel lookup_array ko chuni hui disha mein chalata hai (search_mode 1 = upar se neeche).",
      "match_mode ke hisaab se har item compare karta hai (0 = bilkul same hona chahiye).",
      "Match milte hi return_array ki USI position se value uthati hai — dono arrays ka size barabar hona chahiye.",
      "Match na mile to #N/A ki jagah if_not_found dikhta hai. search_mode -1 se AAKHRI match milta hai — customer ka latest invoice isi trick se nikalta hai.",
    ],
    examples: [
      {
        title: "Naam se ID (left lookup) — jo VLOOKUP nahi kar sakta",
        table: [
          ["EmpID", "Name", "Salary"],
          ["101", "Amit", "42000"],
          ["102", "Priya", "48000"],
        ],
        at: "F2",
        formula: "=XLOOKUP(\"Priya\", $B$2:$B$3, $A$2:$A$3, \"Not Found\")",
        result: "102",
        why: "Priya B column (row 3) mein mili, return_array A ka row 3 = 102. Left lookup bilkul allowed hai.",
      },
      {
        title: "Missing ID par friendly message",
        table: [
          ["EmpID", "Name"],
          ["101", "Amit"],
          ["102", "Priya"],
        ],
        at: "F3",
        formula: "=XLOOKUP(999, $A$2:$A$3, $B$2:$B$3, \"ID not in list\")",
        result: "ID not in list",
        why: "999 kahin nahi mila, aur chautha argument diya hua hai, isliye #N/A ki jagah woh text aaya. IFERROR ki zarurat nahi.",
      },
      {
        title: "Do sharten: Multi-criteria (region + product)",
        table: [
          ["Region", "Product", "Amount"],
          ["North", "Pen", "500"],
          ["South", "Pen", "300"],
          ["North", "Book", "800"],
        ],
        at: "F4",
        formula: "=XLOOKUP(1, ($A$2:$A$4=\"North\")*($B$2:$B$4=\"Book\"), $C$2:$C$4, \"No match\")",
        result: "800",
        why: "Har row ke liye do TRUE/FALSE ko multiply kiya — sirf North+Book wali row 1 banai aur uski Amount 800 mili. Ye hi multi-criteria XLOOKUP ka asli trick hai.",
      },
    ],
    mistakes: [
      {
        symptom: "#VALUE! ya galat result aata hai",
        cause: "lookup_array aur return_array ka size alag hai (ek 10 rows, doosri 11).",
        fix: "Dono ko same rows par select karo: `$F$2:$F$100` aur `$D$2:$D$100`.",
      },
      {
        symptom: "#NAME? aa jaata hai",
        cause: "Purana Excel (2019 ya pehle) XLOOKUP nahi jaanta, ya Microsoft 365 nahi hai.",
        fix: "Wahan INDEX-MATCH use karo — woh 1997 se har version mein chalta hai.",
      },
      {
        symptom: "Duplicate ID par purani entry aati hai, nayi nahi",
        cause: "search_mode default 1 hai (pehla match).",
        fix: "Aakhri entry ke liye 6th argument `-1` karo: `=XLOOKUP(A2,$A:$A,$D:$D,,,-1)`.",
      },
    ],
    practice:
      "VLOOKUP wali table banao aur usi par XLOOKUP lagao. Phir A aur C column ke beech ek naya column insert karke dono formulas ko dekho — VLOOKUP ka answer badal jayega, XLOOKUP waisa hi rahega. Ye farq ek baar aankhon se dekh lo, kabhi nahi bhoologe.",
    shortcuts: [{ keys: "Ctrl + Shift + Enter", what: "Bahut purane Excel mein array formula banane ke liye (365 par zarurat nahi)" }],
    next: ["Multi-criteria XLOOKUP samjhao", "XLOOKUP aur INDEX-MATCH mein kya behtar hai?", "Latest entry kaise nikaalein?"],
  },

  {
    id: "index-match",
    name: "INDEX + MATCH",
    topic: "lookup",
    keys: ["index", "match", "index match", "index-match", "index+match", "xmatch"],
    related: ["vlookup", "xlookup"],
    chapter: 12,
    whatEn:
      "MATCH tells you the POSITION of a value; INDEX reads the value at a position. Together they look up in any direction and work in every Excel version.",
    whatHi:
      "MATCH batata hai value kis number par hai, aur INDEX us number se value utha leta hai. Jodi banakar kisi bhi direction mein lookup ho jaata hai — har Excel version mein.",
    ideaEn:
      "Two small tools beat one big one. INDEX(column, k) = \"that column ka k-th item\". MATCH(x, column, 0) = \"x is at position k\". Nest karo: INDEX(return, MATCH(find, lookup, 0)).",
    ideaHi:
      "Do chhote tools ek bade se behtar hain. INDEX(D:D, 4) ka matlab \"D column ka chautha item\". MATCH(\"Priya\", B:B, 0) ka matlab \"Priya 3rd position par hai\". Dono ko jodo — bas wahi lookup hai.",
    syntax: "=INDEX(return_array, MATCH(lookup_value, lookup_array, 0))",
    args: [
      { name: "return_array", meaning: "INDEX ko kaunsi list/range se value deni hai", example: "$A$2:$A$100" },
      { name: "lookup_value", meaning: "MATCH kya dhoondhe", example: "\"Priya\"" },
      { name: "lookup_array", meaning: "MATCH kis column mein dhoondhe (single column/row)", example: "$B$2:$B$100" },
      { name: "0 (MATCH ka)", meaning: "Exact match — hamesha 0, warna sorted data chahiye", example: "0" },
    ],
    stepsEn: [
      "MATCH scans lookup_array and returns the position (1, 2, 3 …) of the first exact hit.",
      "INDEX takes return_array and returns the item at that position.",
      "Because the two ranges are separate, the return range can sit to the LEFT of the lookup range.",
      "For a 2-way lookup add a second MATCH for the column: INDEX(data, MATCH(row), MATCH(col)).",
    ],
    stepsHi: [
      "MATCH lookup_array ko scan karke pehla exact match ka number (1, 2, 3 …) deta hai.",
      "INDEX us number par return_array ki value de deta hai.",
      "Dono ranges alag hain, isliye return range lookup range ke LEFT bhi ho sakti hai.",
      "2-way lookup ke liye doosra MATCH column ke liye lagao: INDEX(data, MATCH(row), MATCH(col)).",
    ],
    examples: [
      {
        title: "Left lookup — ID from name",
        table: [
          ["EmpID", "Name"],
          ["101", "Amit"],
          ["102", "Priya"],
          ["103", "Rohit"],
        ],
        at: "F2",
        formula: "=INDEX($A$2:$A$4, MATCH(\"Priya\", $B$2:$B$4, 0))",
        result: "102",
        why: "MATCH ne Priya ko position 2 diya, INDEX ne A column ka 2nd item = 102 diya.",
      },
      {
        title: "2-way matrix lookup (row aur column dono se)",
        table: [
          ["Item", "Q1", "Q2", "Q3"],
          ["Pen", "500", "620", "580"],
          ["Book", "800", "760", "910"],
        ],
        at: "G2",
        formula: "=INDEX($B$2:$D$3, MATCH(\"Book\",$A$2:$A$3,0), MATCH(\"Q3\",$B$1:$D$1,0))",
        result: "910",
        why: "Pehla MATCH ne row 2 (Book) di, doosre ne column 3 (Q3) di — dono ke intersection par 910 hai.",
      },
    ],
    mistakes: [
      {
        symptom: "#N/A har baar",
        cause: "INDEX range aur MATCH range ka starting row alag hai (INDEX A2:A100, MATCH B1:B100) — position off-by-one ho jaati hai.",
        fix: "Dono ranges ka pehla row same rakho. Check karo dono `2` se shuru ho rahi hain.",
      },
      {
        symptom: "Range insert karne par answer shift ho gaya",
        cause: "Ranges lock nahi hain.",
        fix: "`F4` se dono ko lock karo: `$A$2:$A$100`, `$B$2:$B$100`.",
      },
      {
        symptom: "#REF! aa gaya",
        cause: "INDEX ko poora column diya aur MATCH ne aisi position di jo us range se bahar hai (jaise sheet row 5 se shuru hui).",
        fix: "Ranges sheet ke top (row 1 ya 2) se shuru karo, ya same start row rakho.",
      },
    ],
    practice:
      "3x3 ka chhota matrix banao (items x quarters) aur ek cell mein `=INDEX($B$2:$D$4, MATCH(item,$A$2:$A$4,0), MATCH(quarter,$B$1:$D$1,0))` lagao. Item aur quarter badalte raho — intersection badalta rahega.",
    shortcuts: [{ keys: "F4", what: "Range lock karna (INDEX-MATCH ke liye zaruri)" }],
    next: ["INDEX-MATCH aur XLOOKUP mein kya behtar hai?", "2-way lookup step by step samjhao"],
  },

  {
    id: "hlookup",
    name: "HLOOKUP",
    topic: "lookup",
    keys: ["hlookup", "h lookup"],
    related: ["vlookup"],
    whatEn: "HLOOKUP is VLOOKUP sideways: it searches the FIRST ROW and returns a value from a row below it.",
    whatHi: "HLOOKUP VLOOKUP ka ulta (sideways) version hai — pehli ROW mein dhoondhta hai aur neeche wali row se value deta hai.",
    ideaEn:
      "Use it only when your data is laid out horizontally (months across the top, one product per row). Most real sheets are vertical, so most answers should be VLOOKUP or XLOOKUP.",
    ideaHi:
      "Jab data horizontal ho (upar mahine, har row mein ek product) tabhi use karo. 90% office sheets vertical hoti hain, isliye zyadatar cases mein VLOOKUP/XLOOKUP hi sahi hai.",
    syntax: "=HLOOKUP(lookup_value, table_array, row_index_num, [range_lookup])",
    args: [
      { name: "lookup_value", meaning: "Pehli row mein kya dhoondhna hai", example: "\"Mar\"" },
      { name: "table_array", meaning: "Table jiski pehli row mein lookup values hain", example: "$B$1:$E$4" },
      { name: "row_index_num", meaning: "Upar se kaunsi row (ginti 1 se)", example: "3" },
      { name: "range_lookup", meaning: "0 = exact", example: "0" },
    ],
    stepsEn: [
      "Excel scans the first ROW left to right for the lookup value.",
      "From the matching column it counts row_index_num - 1 rows down.",
      "It returns that cell; no match with 0 gives #N/A.",
    ],
    stepsHi: [
      "Excel pehli ROW ko left se right scan karta hai.",
      "Match wale column se row_index_num - 1 rows neeche ginti karta hai.",
      "Us cell ki value deta hai; 0 ke saath match na mile to #N/A.",
    ],
    examples: [
      {
        title: "Month ke hisaab se total nikaalna (data upar-neeche nahi, side me hai)",
        table: [
          ["", "Jan", "Feb", "Mar"],
          ["Pen", "500", "620", "580"],
          ["Book", "800", "760", "910"],
        ],
        at: "G2",
        formula: "=HLOOKUP(\"Mar\", $B$1:$D$3, 3, 0)",
        result: "910",
        why: "Mar column 3 mein hai; 3rd row = Book; Book ka Mar = 910.",
      },
    ],
    mistakes: [
      {
        symptom: "#N/A jabki column dikh raha hai",
        cause: "Lookup value pehli ROW mein nahi hai (data ulta hai).",
        fix: "Table ko aisa select karo ki lookup row sabse upar ho, warna TRANSPOSE karke vertical banao.",
      },
    ],
    practice: "Chhota 3x3 horizontal table banao aur HLOOKUP se alag-alag month ki value nikaalo. Phir usi table ko TRANSPOSE karke VLOOKUP se wahi kaam karo.",
    shortcuts: [{ keys: "Ctrl + Shift + V", what: "Paste Special → transpose ki taraf jaldi" }],
    next: ["VLOOKUP aur HLOOKUP kab use karte hain?"],
  },

  {
    id: "xmatch",
    name: "XMATCH",
    topic: "lookup",
    keys: ["xmatch", "x match"],
    related: ["index-match"],
    whatEn: "XMATCH is the modern MATCH: it can search from the end, use wildcards, and said in a friendlier way which position it found.",
    whatHi: "XMATCH naya MATCH hai — aakhri se bhi dhoondh sakta hai, wildcard chalta hai, aur position batata hai (INDEX ke saath use hota hai).",
    ideaEn: "Same mental model as MATCH — \"where is it?\" — with a search-mode switch (1 first, -1 last, 2 bisection) and wildcard mode (2).",
    ideaHi: "MATCH jaisa hi — \"kahan hai?\" — bas search_mode (-1 = aakhri) aur match_mode 2 = wildcard ka extra control milta hai.",
    syntax: "=XMATCH(lookup_value, lookup_array, [match_mode], [search_mode])",
    args: [
      { name: "lookup_value", meaning: "Kya dhoondhna hai", example: "\"Pen\"" },
      { name: "lookup_array", meaning: "Kis single row/column mein", example: "$A$2:$A$100" },
      { name: "match_mode", meaning: "0 exact, -1 exact/chhota, 1 exact/bada, 2 wildcard", example: "2" },
      { name: "search_mode", meaning: "1 pehla, -1 aakhri, 2/-2 binary", example: "-1" },
    ],
    stepsEn: [
      "Searches lookup_array in the chosen direction.",
      "Returns the POSITION, not the value — always pair it with INDEX.",
      "Wildcard mode lets you pass \"Pen*\" to find any item starting with Pen.",
    ],
    stepsHi: [
      "Chuni hui disha mein lookup_array search karta hai.",
      "Value nahi, POSITION deta hai — isliye INDEX ke saath use karo.",
      "Wildcard mode mein \"Pen*\" likh kar Pen se shuru hone wala koi bhi item mil jaata hai.",
    ],
    examples: [
      {
        title: "Aakhri entry dhoondhna (latest invoice)",
        table: [
          ["Invoice", "Amount"],
          ["INV-1", "500"],
          ["INV-2", "700"],
          ["INV-1", "900"],
        ],
        at: "F2",
        formula: "=INDEX($B$2:$B$4, XMATCH(\"INV-1\", $A$2:$A$4, 0, -1))",
        result: "900",
        why: "search_mode -1 ne aakhri INV-1 (row 4) dhoondha, INDEX ne uski Amount 900 di.",
      },
    ],
    mistakes: [
      {
        symptom: "Position aa rahi hai, value nahi",
        cause: "XMATCH sirf position deta hai — akela use kiya.",
        fix: "INDEX ke andar wrap karo: `=INDEX(range, XMATCH(...))`.",
      },
    ],
    practice: "Duplicate IDs wali chhoti table banao aur XMATCH ke 4th argument ko 1 aur -1 karke dekho — pehli aur aakhri entry ka position badlega.",
    next: ["MATCH aur XMATCH mein kya farq hai?"],
  },
];
