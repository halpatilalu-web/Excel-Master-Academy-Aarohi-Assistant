import { CHAPTERS } from "./chapters";

interface Entry { keys: string[]; a: string }
const KB: Entry[] = [
  { keys: ["vlookup"], a: "VLOOKUP table ke pehle column mein value dhundh kar usi row ka doosra column wapas deta hai.\n\nFormula: =VLOOKUP(A2, $F$2:$H$100, 3, 0)\n• A2 = jo dhundhna hai\n• $F$2:$H$100 = lookup table (F4 se lock)\n• 3 = table ka 3rd column\n• 0 = exact match\n\nAgar #N/A aaye to check karo: value table ke pehle column mein hai? Extra space to nahi? (TRIM use karo)." },
  { keys: ["xlookup"], a: "XLOOKUP naya aur aasaan hai:\n=XLOOKUP(A2, F:F, H:H, \"Not found\")\nIsme column number nahi dena padta aur left side lookup bhi chalta hai. Excel 2021/365 mein milta hai." },
  { keys: ["index", "match"], a: "INDEX-MATCH jodi: =INDEX(H:H, MATCH(A2, F:F, 0))\nMATCH position batata hai, INDEX us position ki value deta hai. Column insert-delete karne par bhi nahi tootta." },
  { keys: ["sumifs"], a: "SUMIFS: =SUMIFS(sum_range, criteria_range1, criteria1, criteria_range2, criteria2)\nExample: =SUMIFS(E:E, B:B, \"Delhi\", C:C, \"Pen\")\nYaad rakho: sum_range sabse PEHLE aata hai." },
  { keys: ["sumif"], a: "SUMIF: =SUMIF(range, criteria, sum_range)\nExample: =SUMIF(B2:B50, \"Delhi\", E2:E50) — Delhi ki total sale." },
  { keys: ["countif", "countifs"], a: "COUNTIF: =COUNTIF(range, criteria)\nExample: =COUNTIF(C2:C50, \">=33\") — 33 ya zyada marks wale kitne.\nKai shartein ho to COUNTIFS use karo." },
  { keys: ["nested", "ifs", "grade"], a: "Grade ke liye IFS:\n=IFS(B2>=80,\"A\", B2>=60,\"B\", B2>=33,\"C\", TRUE,\"F\")\nPurane Excel mein: =IF(B2>=80,\"A\",IF(B2>=60,\"B\",IF(B2>=33,\"C\",\"F\")))" },
  { keys: ["if", "condition", "agar"], a: "IF ka format: =IF(condition, sahi_hone_par, galat_hone_par)\nExample: =IF(B2>=33, \"Pass\", \"Fail\")\nEk se zyada condition ho to AND / OR use karo: =IF(AND(B2>=33,C2>=33),\"Pass\",\"Fail\")" },
  { keys: ["pivot"], a: "Pivot Table banane ke steps:\n1) Data select karo (ya Ctrl+T se table banao)\n2) Insert → PivotTable → OK\n3) Field ko Rows / Columns / Values mein drag karo\n4) Values mein Sum, Count ya Average chuno\nData badle to Alt+F5 se Refresh." },
  { keys: ["#n/a", "n/a"], a: "#N/A matlab value nahi mili. Check karo:\n• Spelling / extra spaces (TRIM lagao)\n• Number vs Text ka farak\n• VLOOKUP mein lookup value pehle column mein ho\nSafe karne ke liye: =IFERROR(VLOOKUP(...), \"Nahi mila\")" },
  { keys: ["#value", "value!"], a: "#VALUE! tab aata hai jab formula mein text aur number mix ho jaye (jaise \"abc\"+5). Cell ka data type check karo." },
  { keys: ["#div", "div/0", "zero"], a: "#DIV/0! matlab zero se divide. Fix: =IFERROR(A2/B2, 0) ya =IF(B2=0, 0, A2/B2)" },
  { keys: ["#ref"], a: "#REF! tab aata hai jab formula ka koi cell/column delete ho gaya ho. Ctrl+Z karo ya formula dobara banao." },
  { keys: ["absolute", "dollar", "$", "f4", "lock"], a: "$ reference ko lock karta hai. $A$1 = na row badle na column. Formula mein cell ke upar cursor rakh kar F4 dabao.\nExample: =B2*$E$1 (E1 mein tax rate)" },
  { keys: ["sum", "total", "jod"], a: "Total ke liye: =SUM(B2:B10)\nShortcut: cell select karke Alt + = dabao. Shart ke saath jodna ho to SUMIF/SUMIFS." },
  { keys: ["average", "ausat"], a: "Ausat ke liye: =AVERAGE(B2:B10). Shart ke saath: =AVERAGEIF(range, criteria, avg_range)" },
  { keys: ["duplicate", "dohra"], a: "Duplicates hatane ke liye: Data → Remove Duplicates.\nSirf dikhana ho to: Home → Conditional Formatting → Highlight Cells → Duplicate Values.\nFormula se: =UNIQUE(A2:A100)" },
  { keys: ["text", "naam", "left", "right", "mid", "concat", "join"], a: "Text functions:\n• =LEFT(A2,3) pehle 3 akshar\n• =MID(A2,2,4) beech se\n• =TRIM(A2) extra space hatao\n• =A2&\" \"&B2 ya =TEXTJOIN(\" \",TRUE,A2:B2) jodna\nFlash Fill ke liye Ctrl+E dabao." },
  { keys: ["date", "tarikh", "umar", "age", "datedif"], a: "Umar nikalne ke liye: =DATEDIF(B2, TODAY(), \"Y\")\nAaj ki date: =TODAY()\nKaam ke din: =NETWORKDAYS(start, end)" },
  { keys: ["chart", "graph"], a: "Chart banane ke liye data select karo aur Alt+F1 dabao. Trend ke liye Line, tulna ke liye Column, hissedari ke liye Pie use karo." },
  { keys: ["macro", "vba"], a: "Macro: View → Macros → Record Macro. Kaam karo, Stop dabao. File ko .xlsm mein save karo.\nCode dekhne ke liye Alt+F11. Chhota example:\nSub Hello()\n  MsgBox \"Namaste!\"\nEnd Sub" },
  { keys: ["filter", "unique", "dynamic"], a: "FILTER: =FILTER(A2:D100, C2:C100=\"Delhi\") — sirf Delhi ki rows.\nUNIQUE: =UNIQUE(C2:C100)\nSORT: =SORT(A2:B100, 2, -1). Neeche ke cells khali rakho warna #SPILL! aayega." },
  { keys: ["shortcut"], a: "Zaroori shortcuts:\n• Ctrl+C/V/Z/Y — copy, paste, undo, redo\n• Ctrl+Shift+L — filter\n• Ctrl+T — table\n• Alt+= — AutoSum\n• F4 — reference lock\n• Ctrl+E — Flash Fill\n• Ctrl+Arrow — data ke end tak" },
  { keys: ["interview roleplay", "mock interview", "roleplay shuru"], a: "Chalo, interview roleplay shuru karte hain. Main interviewer hoon aur ek-ek sawal poochhungi.\n\nSawal 1: VLOOKUP aur XLOOKUP me sabse bada farq kya hai?\n\nApna jawab chhota aur example ke saath do — phir me feedback dungi." },
  { keys: ["office roleplay", "monthly sales report", "sales report banana"], a: "Chalo, office roleplay karte hain. Main tumhari manager hoon: mujhe sheher-wise monthly sales report chahiye.\n\nStep 1: Data ko Ctrl+T se Excel Table banao.\nStep 2: Insert → PivotTable lagao.\nStep 3: City ko Rows me, Amount ko Values (Sum) me daalo.\n\nPehle batao: report me total sales ke liye SUMIF loge ya PivotTable? Kyun?" },
  { keys: ["selfie", "tumhari photo", "photo bhejo", "photo bhej", "flirt", "romantic", "seductive", "girlfriend"], a: "Main ek AI illustrated avatar hoon, isliye real selfies, personal photos ya romantic roleplay nahi karti. Upar diye Classroom, Study desk aur Office dashboard avatar scenes me se apna pasandeeda look chuno.\n\nChaho to hum Excel interview ya office-report roleplay karke practice kar sakte hain." },
  { keys: ["namaste", "hello", "hi", "hey"], a: "Namaste doston! Main Aarohi hoon — tumhari friendly Excel creator aur study saathi. Formula, error, chapter ya interview practice, jo chaho Hinglish me poochho. Jaise: 'VLOOKUP kaise lagayein?'" },
];

export const SUGGESTIONS = ["VLOOKUP kaise lagayein?", "#N/A error kyun aata hai?", "Pivot Table kaise banayein?", "SUMIFS samjhao", "Excel ke zaroori shortcuts"];

export function aarohiReply(input: string): string {
  const t = input.toLowerCase();
  const hit = KB.filter((e) => e.keys.some((k) => t.includes(k)));
  if (hit.length) {
    hit.sort((a, b) => Math.max(...b.keys.filter((k) => t.includes(k)).map((k) => k.length)) - Math.max(...a.keys.filter((k) => t.includes(k)).map((k) => k.length)));
    return hit[0].a;
  }
  const words = t.split(/\W+/).filter((w) => w.length > 3);
  const ch = CHAPTERS.find((c) => words.some((w) => c.title.toLowerCase().includes(w)));
  if (ch) return `Yeh topic Chapter ${ch.n}: ${ch.title} mein hai.\n\n${ch.intro}\n\n${ch.points.slice(0, 3).map((p) => "• " + p).join("\n")}\n\nPoora lesson Chapters section mein padho.`;
  return "Maaf kijiye, yeh sawal main abhi pakad nahi paayi. Kripya formula ka naam likhiye (jaise VLOOKUP, SUMIFS, IF, Pivot) ya error (#N/A, #VALUE!) batayiye — main step-by-step samjhaungi.";
}
