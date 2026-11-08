/**
 * @license MIT
 * Practice tasks written as instructions a student can follow, not as examples
 * they can copy.
 *
 * Every task says **what to do, in which cells, in which order** — the four-part
 * structure Excel teachers use in class:
 *   1. `write`   — the exact address + formula to type (the "how")
 *   2. `steps`   — the ordered clicks/keystrokes, numbered on screen
 *   3. `watchOut`— the mistake students actually make in this exercise
 *   4. `done`    — how they know the task is finished (what a correct sheet shows)
 *
 * The practice grid reads `steps` from here, so the brief under the toolbar is
 * instructions in Hindi + English — never a bare "example" formula.
 */
import type { PracticeSheetId } from "../components/LiveSpreadsheet";

/** One address → what the student must put there. */
export interface WriteLine {
  /** Cell or range, e.g. "E2" or "E2:E4". */
  at: string;
  /** The exact text/formula to type. */
  formula: string;
  /** Why this formula, in one short line. */
  why: string;
}

export interface PracticeTask {
  id: PracticeSheetId;
  /** Task headline — a verb, in both languages. */
  titleHi: string;
  titleEn: string;
  /** What the finished sheet must show. */
  goalHi: string;
  goalEn: string;
  /** Numbered instructions. First item is the setup, last is the check. */
  steps: { hi: string; en: string }[];
  /** Exactly what to type, cell by cell. */
  write: WriteLine[];
  /** The mistake this exercise is designed to catch. */
  watchOut: { hi: string; en: string };
  /** How the student knows it is right (values, not vibes). */
  result: { hi: string; en: string };
  /** Keyboard shortcuts used in this task. */
  shortcuts: string[];
}

export const PRACTICE_TASKS: PracticeTask[] = [
  /* ------------------------------- 1. marks ------------------------------- */
  {
    id: "sheet-marks",
    titleHi: "Student marksheet: Total, Average aur Pass/Fail banao",
    titleEn: "Build the student marksheet: Total, Average and Pass/Fail",
    goalHi:
      "E, F aur G columns khaali hain. Aapko unme formula likhna hai — Total, Average aur Result. Aakhir mein char students ke result apne aap sahi hone chahiye.",
    goalEn:
      "Columns E, F and G are empty. Write formulas in them for Total, Average and Result so all four rows fill in correctly.",
    steps: [
      { hi: "Sheet mein 4 students hain (rows 2-4) aur teen subject (B, C, D). E, F, G columns khaali chhodi gayi hain — vahin aapko kaam karna hai.", en: "The sheet has students in rows 2-4 and three subjects in B, C and D. Columns E, F and G are deliberately empty — that is your work." },
      { hi: "Cell E2 par tap karo aur likho: =SUM(B2:D2). Enter dabao. (Shortcut: Alt+= se AutoSum khud aa jaata hai.)", en: "Tap cell E2 and type =SUM(B2:D2), then Enter. (Shortcut: Alt+= inserts AutoSum for you.)" },
      { hi: "E2 ko copy karke E3 aur E4 mein paste karo — ya E2 ke neeche wale chhote handle ko kheench kar neeche tak chhodo.", en: "Copy E2 into E3 and E4 — or drag the small fill handle at the bottom-right of E2 down." },
      { hi: "Cell F2 par tap karo: =AVERAGE(B2:D2). Enter. Phir F3 aur F4 mein bhi neeche kheench do.", en: "Tap F2 and type =AVERAGE(B2:D2), Enter, then fill down to F3 and F4." },
      { hi: "Cell G2 par tap karo: =IF(F2>=40,\"Pass\",\"Fail\"). Enter, phir G3-G4 mein fill karo.", en: "Tap G2 and type =IF(F2>=40,\"Pass\",\"Fail\"), Enter, then fill down to G3 and G4." },
      { hi: "Upar “Check answers” dabao. Sab sahi ho to green tick aayega.", en: "Press “Check answers” at the top. A green tick means every cell is right." },
    ],
    write: [
      { at: "E2", formula: "=SUM(B2:D2)", why: "Teen subject ka jod" },
      { at: "E3", formula: "=SUM(B3:D3)", why: "Relative rows — neeche kheenchne par khud badalta hai" },
      { at: "E4", formula: "=SUM(B4:D4)", why: "Aakhri student" },
      { at: "F2", formula: "=AVERAGE(B2:D2)", why: "Total ÷ 3, sirf numbers ginti mein" },
      { at: "F3", formula: "=AVERAGE(B3:D3)", why: "Average bhi fill" },
      { at: "F4", formula: "=AVERAGE(B4:D4)", why: "Average bhi fill" },
      { at: "G2", formula: '=IF(F2>=40,"Pass","Fail")', why: "40 se kam par Fail" },
      { at: "G3", formula: '=IF(F3>=40,"Pass","Fail")', why: "Condition bhi neeche le jao" },
      { at: "G4", formula: '=IF(F4>=40,"Pass","Fail")', why: "Kabir fail hona chahiye" },
    ],
    watchOut: {
      hi: "Sabse aam galti: =SUM(B2,D2) likhna (comma) — yeh sirf do cells jodta hai. Range ke liye colon chahiye: B2:D2.",
      en: "The classic mistake is =SUM(B2,D2) with a comma — that adds only two cells. A range needs a colon: B2:D2.",
    },
    result: {
      hi: "Aarav: 240 / 80 / Pass · Diya: 270 / 90 / Pass · Kabir: 105 / 35 / Fail",
      en: "Aarav: 240 / 80 / Pass · Diya: 270 / 90 / Pass · Kabir: 105 / 35 / Fail",
    },
    shortcuts: ["Alt+=", "Ctrl+D", "Ctrl+Z"],
  },

  /* ------------------------------ 2. cleaning ----------------------------- */
  {
    id: "sheet-cleaning",
    titleHi: "Ganda data saaf karo: naam theek karo aur PIN nikalo",
    titleEn: "Clean messy data: fix the names and extract the PIN",
    goalHi:
      "Column A mein extra space aur galat capitalisation hai, column B mein “City-380001” ek hi cell mein hai. C aur D khaali hain — vahin saaf naam aur PIN likhna hai.",
    goalEn:
      "Column A has extra spaces and wrong capitalisation; column B packs “City-380001” into one cell. C and D are empty — that is where the clean name and the PIN go.",
    steps: [
      { hi: "Pehle A2 par tap karo aur formula bar dekho — shuru mein space hai. Wahi problem hai jo report mein dikhta hai.", en: "Tap A2 first and look at the formula bar — there is a leading space. That is exactly the problem this task fixes." },
      { hi: "C2 par jao aur likho: =PROPER(TRIM(A2)). Enter. TRIM space hatata hai, PROPER har word ka pehla letter capital karta hai.", en: "Go to C2 and type =PROPER(TRIM(A2)), Enter. TRIM removes extra spaces; PROPER capitalises each word." },
      { hi: "C2 ko C3 aur C4 mein fill karo (fill handle neeche kheench kar).", en: "Fill C2 down into C3 and C4 with the fill handle." },
      { hi: "D2 par jao aur likho: =RIGHT(B2,6). Yeh aakhri 6 characters deta hai — PIN code.", en: "Go to D2 and type =RIGHT(B2,6) — the last six characters, i.e. the PIN code." },
      { hi: "D2 ko D3 aur D4 mein fill karo.", en: "Fill D2 down into D3 and D4." },
      { hi: "Dhyan do: D column mein text hai, number nahi. Excel ka RIGHT hamesha text deta hai — ginti karni ho to VALUE() lagana padta hai.", en: "Notice D holds text, not numbers. Excel's RIGHT always returns text — wrap it in VALUE() if you need to calculate with it." },
    ],
    write: [
      { at: "C2", formula: "=PROPER(TRIM(A2))", why: "Space hatao + naam theek karo" },
      { at: "C3", formula: "=PROPER(TRIM(A3))", why: "Neeche fill" },
      { at: "C4", formula: "=PROPER(TRIM(A4))", why: "Neeche fill" },
      { at: "D2", formula: "=RIGHT(B2,6)", why: "PIN = aakhri 6 characters" },
      { at: "D3", formula: "=RIGHT(B3,6)", why: "Neeche fill" },
      { at: "D4", formula: "=RIGHT(B4,6)", why: "Neeche fill" },
    ],
    watchOut: {
      hi: "TRIM sirf normal space hatata hai, non-breaking space (web se copy kiya data) nahi — uske liye CLEAN() ya SUBSTITUTE(…,CHAR(160),\"\") chahiye.",
      en: "TRIM removes normal spaces only, not non-breaking spaces copied from the web — those need CLEAN() or SUBSTITUTE(…,CHAR(160),\"\").",
    },
    result: {
      hi: "C2 = “Aarav Sharma” (shuru mein space nahi) · D2 = “380001”",
      en: "C2 = “Aarav Sharma” (no leading space) · D2 = “380001”",
    },
    shortcuts: ["Ctrl+E (Flash Fill)", "Ctrl+D"],
  },

  /* ----------------------------- 3. validation ---------------------------- */
  {
    id: "sheet-validation",
    titleHi: "IF se status banao aur galat value rok kar dekho",
    titleEn: "Build the status with IF, then test that a wrong value is stopped",
    goalHi:
      "“Paid” column khaali hai. Aapko IF se Status nikalna hai aur Data Validation se sirf Paid/Overdue/Pending allowed rakhna hai.",
    goalEn:
      "The “Paid” column is empty. Use IF to derive the Status, then lock the column with Data Validation so only Paid/Overdue/Pending can be entered.",
    steps: [
      { hi: "C2 par tap karo aur likho: =IF(B2>=5000,\"Paid\",\"Overdue\"). Enter.", en: "Tap C2 and type =IF(B2>=5000,\"Paid\",\"Overdue\"), Enter." },
      { hi: "C2 ko C3-C5 mein fill karo.", en: "Fill C2 down to C3-C5." },
      { hi: "Ab validation lagao: Quick-access row se “Data Validation” dabao.", en: "Now add validation: press “Data Validation” in the quick-access row." },
      { hi: "Range mein likho C2:C5, type “List” chuno, aur items mein Paid, Overdue, Pending (comma se alag) daalo. Apply karo.", en: "Enter range C2:C5, choose type “List”, and put Paid, Overdue, Pending (comma-separated) as the items. Apply." },
      { hi: "C2 par tap karo — ab cell ke andar ▾ dikhega. Usse value chuno.", en: "Tap C2 — a ▾ appears inside the cell. Pick a value from it." },
      { hi: "Test karo: C3 mein “Paid” ki jagah “Done” type karo. Excel ka stop alert aana chahiye — yahi validation ka kaam hai.", en: "Test it: type “Done” instead of “Paid” in C3. Excel's stop alert must appear — that is what validation is for." },
    ],
    write: [
      { at: "C2", formula: '=IF(B2>=5000,"Paid","Overdue")', why: "5000 se upar = Paid" },
      { at: "C3", formula: '=IF(B3>=5000,"Paid","Overdue")', why: "Neeche fill" },
      { at: "C4", formula: '=IF(B4>=5000,"Paid","Overdue")', why: "Neeche fill" },
      { at: "C5", formula: '=IF(B5>=5000,"Paid","Overdue")', why: "Neeche fill" },
    ],
    watchOut: {
      hi: "IF mein text hamesha double quotes mein: \"Paid\". Bina quotes ke Excel #NAME? error deta hai.",
      en: "Text inside IF must be in double quotes: \"Paid\". Without quotes Excel throws #NAME?.",
    },
    result: {
      hi: "C column mein Paid/Overdue dikhna chahiye, aur galat value type karne par stop alert aana chahiye.",
      en: "Column C shows Paid/Overdue, and typing a value outside the list raises the stop alert.",
    },
    shortcuts: ["Ctrl+Shift+L", "Alt+A V V"],
  },

  /* ------------------------------- 4. SUMIFS ------------------------------ */
  {
    id: "sheet-sumifs",
    titleHi: "City-wise aur item-wise sale nikalo (SUMIF / SUMIFS)",
    titleEn: "Total the sales by city and by item (SUMIF / SUMIFS)",
    goalHi:
      "Neeche ka summary block khaali hai. Aapko har city ka total aur har item ka total SUMIF se nikalna hai.",
    goalEn:
      "The summary block at the bottom is empty. Use SUMIF to produce a total per city and a total per item.",
    steps: [
      { hi: "Pehle data range dekho: A = Date, B = City, C = Item, D = Qty, E = Amount.", en: "Look at the data first: A = Date, B = City, C = Item, D = Qty, E = Amount." },
      { hi: "Summary block ke city total waale cell par jao aur likho: =SUMIF($B$2:$B$60,A66,$E$2:$E$60).", en: "Go to the first city-total cell and type =SUMIF($B$2:$B$60,A66,$E$2:$E$60)." },
      { hi: "Formula mein $ lagana zaroori hai — warna neeche kheenchne par range khisak jaayegi.", en: "The $ signs matter — without them the range slides when you fill down." },
      { hi: "Formula ko baaki cities mein fill karo.", en: "Fill the formula down for the rest of the cities." },
      { hi: "Item total ke liye do condition chahiye, isliye SUMIFS: =SUMIFS($E$2:$E$60,$B$2:$B$60,\"Ahmedabad\",$C$2:$C$60,B70).", en: "Item totals need two conditions, so use SUMIFS: =SUMIFS($E$2:$E$60,$B$2:$B$60,\"Ahmedabad\",$C$2:$C$60,B70)." },
      { hi: "Har total ko ek baar haath se jod kar check karo (status bar ka Sum dekho) — SUMIFS galti nahi karta, par range galat ho sakti hai.", en: "Spot-check one total by eye (the status bar shows Sum) — SUMIFS is never wrong, but a wrong range is." },
    ],
    write: [
      { at: "Summary!B column", formula: "=SUMIF($B$2:$B$60,A66,$E$2:$E$60)", why: "Har city ka total" },
      { at: "Summary item totals", formula: '=SUMIFS($E$2:$E$60,$B$2:$B$60,"Ahmedabad",$C$2:$C$60,B70)', why: "Do condition: city + item" },
    ],
    watchOut: {
      hi: "SUMIF ka pehla range (criteria range) aur teesra range (sum range) ka size barabar hona chahiye. Ek row ka farak poora total galat kar deta hai.",
      en: "SUMIF's criteria range and sum range must be the same size. One row of difference makes the whole total wrong.",
    },
    result: {
      hi: "Saare 5 cities ke total ka jod poore E column ke jod ke barabar hona chahiye.",
      en: "The five city totals must add up to the sum of the whole E column.",
    },
    shortcuts: ["F4 (lock $)", "Ctrl+D"],
  },

  /* ------------------------------- 5. lookup ------------------------------ */
  {
    id: "sheet-lookup",
    titleHi: "Employee ID se Salary aur Department lao (XLOOKUP)",
    titleEn: "Pull Salary and Department from an Employee ID (XLOOKUP)",
    goalHi:
      "Neeche lookup block mein sirf EmpID diya hai. Aapko XLOOKUP (ya VLOOKUP) se Name, Department aur Salary bharni hai.",
    goalEn:
      "The lookup block below only has an EmpID. Fill Name, Department and Salary with XLOOKUP (or VLOOKUP).",
    steps: [
      { hi: "Data dekho: A = EmpID, B = Name, C = Department, D = Salary, rows 2-31.", en: "Look at the data: A = EmpID, B = Name, C = Department, D = Salary, rows 2-31." },
      { hi: "Lookup block ke Name cell par jao aur likho: =XLOOKUP($A$35,$A$2:$A$31,B$2:B$31).", en: "Go to the Name cell of the lookup block and type =XLOOKUP($A$35,$A$2:$A$31,B$2:B$31)." },
      { hi: "Yahan $A$35 lookup ID hai (fix), $A$2:$A$31 search range hai (fix), aur B$2:B$31 result column hai (row fix, column nahi) — isliye right kheenchne par column badalta hai.", en: "Here $A$35 is the lookup ID (fixed), $A$2:$A$31 the search range (fixed) and B$2:B$31 the result column (row fixed, column free) — so dragging right changes the column." },
      { hi: "Formula ko right mein kheench kar Department aur Salary tak le jao.", en: "Drag the formula right to reach Department and Salary." },
      { hi: "Agar aap VLOOKUP use karte ho to likho: =VLOOKUP($A$35,$A$2:$D$31,2,FALSE) — teesra number column index hai.", en: "If you use VLOOKUP instead: =VLOOKUP($A$35,$A$2:$D$31,2,FALSE) — the third number is the column index." },
      { hi: "Lookup ID badal kar dekho (jaise 1005) — teeno cell apne aap badalne chahiye.", en: "Change the lookup ID (say to 1005) — all three cells must update by themselves." },
    ],
    write: [
      { at: "Lookup block, Name cell", formula: "=XLOOKUP($A$35,$A$2:$A$31,B$2:B$31)", why: "EmpID se poora record" },
      { at: "VLOOKUP alternative", formula: "=VLOOKUP($A$35,$A$2:$D$31,2,FALSE)", why: "Purana tarika — index se column chuno" },
    ],
    watchOut: {
      hi: "VLOOKUP mein FALSE (ya 0) na dena — default TRUE approximate match hota hai aur galat employee ka salary laut aata hai.",
      en: "Never omit FALSE (or 0) in VLOOKUP — the default is an approximate match, which happily returns the wrong employee's salary.",
    },
    result: {
      hi: "ID 1000 par Name, Department aur Salary teeno bhare hone chahiye; ID badalne par teeno badalne chahiye.",
      en: "ID 1000 must fill Name, Department and Salary; changing the ID must change all three.",
    },
    shortcuts: ["F4 (lock $)", "Shift+F3"],
  },

  /* ------------------------------ 6. dashboard ---------------------------- */
  {
    id: "sheet-dashboard",
    titleHi: "KPI dashboard ke cells banao (SUM / MAX / COUNTIF)",
    titleEn: "Fill the KPI dashboard cells (SUM / MAX / COUNTIF)",
    goalHi:
      "Dashboard par 5 KPI boxes hain jo khaali hain. Aapko har box mein formula likhna hai — poora dashboard ek hi cell se update hona chahiye.",
    goalEn:
      "The dashboard shows five empty KPI boxes. Write a formula in each so the whole dashboard updates from the data.",
    steps: [
      { hi: "Data sheet dekho (Sales): B = Region, D = Amount. Dashboard ke KPI cells khaali hain.", en: "Look at the Sales sheet: B = Region, D = Amount. The dashboard KPI cells are empty." },
      { hi: "Total Sales box: =SUM(Sales!D2:D100).", en: "Total Sales box: =SUM(Sales!D2:D100)." },
      { hi: "Highest Sale box: =MAX(Sales!D2:D100).", en: "Highest Sale box: =MAX(Sales!D2:D100)." },
      { hi: "Orders box: =COUNT(Sales!D2:D100) — sirf numbers ginti hai, khaali cell nahi.", en: "Orders box: =COUNT(Sales!D2:D100) — counts numbers only, never blank cells." },
      { hi: "North Region box: =SUMIF(Sales!B2:B100,\"North\",Sales!D2:D100).", en: "North Region box: =SUMIF(Sales!B2:B100,\"North\",Sales!D2:D100)." },
      { hi: "Ab data mein ek amount badlo — dashboard ka number turant badalna chahiye. Yahi dashboard ka matlab hai.", en: "Now change one amount in the data — the dashboard number must change at once. That is the whole point of a dashboard." },
    ],
    write: [
      { at: "Total Sales", formula: "=SUM(Sales!D2:D100)", why: "Poora revenue" },
      { at: "Highest Sale", formula: "=MAX(Sales!D2:D100)", why: "Sabse badi single sale" },
      { at: "Orders", formula: "=COUNT(Sales!D2:D100)", why: "Numbers ki ginti" },
      { at: "North Region", formula: '=SUMIF(Sales!B2:B100,"North",Sales!D2:D100)', why: "Region ke hisaab se total" },
      { at: "Average Sale", formula: "=AVERAGE(Sales!D2:D100)", why: "Har order ka average" },
    ],
    watchOut: {
      hi: "Sheet ke naam mein space ho to usse quotes mein likhna padta hai: ='Sales 2026'!D2. Bina quotes ke Excel samajh nahi paata.",
      en: "A sheet name with a space needs quotes: ='Sales 2026'!D2. Without them Excel cannot parse the reference.",
    },
    result: {
      hi: "Paanch KPI boxes mein number dikhna chahiye, aur data badalne par woh apne aap badalne chahiye.",
      en: "All five KPI boxes show numbers, and they follow the data when you edit it.",
    },
    shortcuts: ["F3 (paste name)", "Ctrl+Page Down"],
  },

  /* -------------------------------- 7. GST -------------------------------- */
  {
    id: "sheet-gst",
    titleHi: "GST invoice banao: Amount, CGST, SGST aur Grand Total",
    titleEn: "Build the GST invoice: Amount, CGST, SGST and Grand Total",
    goalHi:
      "Item, Qty aur Rate diye hain. Aapko Amount (D), Taxable Value (F2), CGST 9% (F3), SGST 9% (F4) aur Grand Total (F5) nikalna hai.",
    goalEn:
      "Item, Qty and Rate are given. Fill Amount (D), Taxable Value (F2), CGST 9% (F3), SGST 9% (F4) and Grand Total (F5).",
    steps: [
      { hi: "D2 par tap karo: =B2*C2 (Qty × Rate). Enter, phir D3 aur D4 mein fill karo.", en: "Tap D2 and type =B2*C2 (Qty × Rate). Enter, then fill down to D3 and D4." },
      { hi: "F2 (Taxable) par jao: =SUM(D2:D4). Yeh tax lagane se pehle ka total hai.", en: "Go to F2 (Taxable): =SUM(D2:D4). This is the total before tax." },
      { hi: "F3 (CGST) par jao: =ROUND(F2*9%,2). 9% kyunki Gujarat mein intra-state GST 9% + 9% hota hai.", en: "Go to F3 (CGST): =ROUND(F2*9%,2). 9% because intra-state GST in Gujarat is 9% + 9%." },
      { hi: "F4 (SGST) par jao: =ROUND(F2*9%,2). CGST ke barabar hona chahiye.", en: "Go to F4 (SGST): =ROUND(F2*9%,2). It must equal CGST." },
      { hi: "F5 (Grand Total) par jao: =F2+F3+F4.", en: "Go to F5 (Grand Total): =F2+F3+F4." },
      { hi: "Check: F3 aur F4 barabar hone chahiye, aur F5 = taxable × 1.18 ke aas-paas (paise ke farak se).", en: "Check: F3 and F4 must be equal, and F5 must be taxable × 1.18 (within a paisa)." },
    ],
    write: [
      { at: "D2", formula: "=B2*C2", why: "Amount = Qty × Rate" },
      { at: "D3", formula: "=B3*C3", why: "Neeche fill" },
      { at: "D4", formula: "=B4*C4", why: "Neeche fill" },
      { at: "F2", formula: "=SUM(D2:D4)", why: "Taxable value" },
      { at: "F3", formula: "=ROUND(F2*9%,2)", why: "CGST 9%, 2 decimal tak" },
      { at: "F4", formula: "=ROUND(F2*9%,2)", why: "SGST 9%, CGST ke barabar" },
      { at: "F5", formula: "=F2+F3+F4", why: "Grand total" },
    ],
    watchOut: {
      hi: "ROUND na lagane se CGST+SGST aur IGST mein ek paisa ka farak aa jaata hai — aur invoice software reject kar deta hai. Hamesha =ROUND(...,2).",
      en: "Without ROUND, CGST+SGST can differ from IGST by one paisa — and invoicing software rejects the file. Always =ROUND(...,2).",
    },
    result: {
      hi: "Taxable 96,600 · CGST 8,694 · SGST 8,694 · Grand Total 1,13,988",
      en: "Taxable 96,600 · CGST 8,694 · SGST 8,694 · Grand Total 113,988",
    },
    shortcuts: ["Alt+=", "Ctrl+Shift+4 (₹)", "Ctrl+D"],
  },

  /* ---------------------------- 8. attendance ---------------------------- */
  {
    id: "sheet-attendance",
    titleHi: "Attendance register banao: present days, percentage aur shortage",
    titleEn: "Build the attendance register: present days, percentage and shortage",
    goalHi:
      "B se F tak hafte ke din hain jinme P (present) ya A (absent) likha hai. G, H, I khaali hain — vahin ginti, percentage aur status likhna hai.",
    goalEn:
      "B to F hold the days of the week with P (present) or A (absent). G, H and I are empty — that is where the count, the percentage and the status go.",
    steps: [
      { hi: "G2 par tap karo aur likho: =COUNTIF(B2:F2,\"P\"). Yeh “P” kitni baar aaya woh ginta hai.", en: "Tap G2 and type =COUNTIF(B2:F2,\"P\"). That counts how many times “P” appears." },
      { hi: "G2 ko G3 aur G4 mein fill karo.", en: "Fill G2 down into G3 and G4." },
      { hi: "H2 par jao aur likho: =G2/5. Paanch kaam ke din hain, isliye 5 se bhaag.", en: "Go to H2 and type =G2/5 — five working days, so divide by 5." },
      { hi: "H2 ko select karke Home ▸ % (ya Ctrl+Shift+5) dabao — 0.8 ki jagah 80% dikhega.", en: "Select H2 and press Home ▸ % (or Ctrl+Shift+5) so 0.8 shows as 80%." },
      { hi: "I2 par jao aur likho: =IF(H2<75%,\"Shortage\",\"OK\"). Enter, phir neeche fill karo.", en: "Go to I2 and type =IF(H2<75%,\"Shortage\",\"OK\"), Enter, then fill down." },
      { hi: "Diya ka percentage 40% aana chahiye — uski row “Shortage” dikhani chahiye.", en: "Diya's percentage must come out 40% — her row must show “Shortage”." },
    ],
    write: [
      { at: "G2", formula: '=COUNTIF(B2:F2,"P")', why: "Present days" },
      { at: "G3", formula: '=COUNTIF(B3:F3,"P")', why: "Neeche fill" },
      { at: "G4", formula: '=COUNTIF(B4:F4,"P")', why: "Neeche fill" },
      { at: "H2", formula: "=G2/5", why: "5 kaam ke din" },
      { at: "H3", formula: "=G3/5", why: "Neeche fill" },
      { at: "H4", formula: "=G4/5", why: "Neeche fill" },
      { at: "I2", formula: '=IF(H2<75%,"Shortage","OK")', why: "75% se kam par shortage" },
      { at: "I3", formula: '=IF(H3<75%,"Shortage","OK")', why: "Neeche fill" },
      { at: "I4", formula: '=IF(H4<75%,"Shortage","OK")', why: "Neeche fill" },
    ],
    watchOut: {
      hi: "COUNTIF text ko case-insensitive ginta hai, par “P” aur “Present” alag maanta hai. Ek hi style rakho — poore register mein sirf P ya A.",
      en: "COUNTIF ignores case but treats “P” and “Present” as different values. Keep one style — only P or A across the register.",
    },
    result: {
      hi: "Aarav 4 / 80% / OK · Diya 2 / 40% / Shortage · Kabir 5 / 100% / OK",
      en: "Aarav 4 / 80% / OK · Diya 2 / 40% / Shortage · Kabir 5 / 100% / OK",
    },
    shortcuts: ["Ctrl+Shift+5", "Ctrl+D"],
  },

  /* ---------------------------- 9. inventory ----------------------------- */
  {
    id: "sheet-inventory",
    titleHi: "Inventory alert lagao: stock value, reorder aur lowest rate",
    titleEn: "Set up the inventory alert: stock value, reorder and lowest rate",
    goalHi:
      "F (Stock Value) aur G (Action) khaali hain, aur F7 mein sabse kam rate nikalna hai. In Stock, Reorder Level se kam ho to “Reorder”.",
    goalEn:
      "F (Stock Value) and G (Action) are empty, and F7 must hold the lowest rate. When In Stock is at or below the Reorder Level, the action is “Reorder”.",
    steps: [
      { hi: "F2 par tap karo aur likho: =D2*E2 (In Stock × Rate). Enter, phir F3-F5 mein fill karo.", en: "Tap F2 and type =D2*E2 (In Stock × Rate), Enter, then fill down to F3-F5." },
      { hi: "G2 par jao aur likho: =IF(D2<=C2,\"Reorder\",\"OK\"). Enter, phir neeche fill karo.", en: "Go to G2 and type =IF(D2<=C2,\"Reorder\",\"OK\"), Enter, then fill down." },
      { hi: "F7 par jao aur likho: =MIN(E2:E5) — yeh sabse kam rate dikhata hai.", en: "Go to F7 and type =MIN(E2:E5) — that gives the lowest rate." },
      { hi: "Ab Pen Box ki In Stock 25 hai aur Reorder Level 40 — G2 mein “Reorder” aana chahiye.", en: "Pen Box has In Stock 25 against a Reorder Level of 40 — G2 must say “Reorder”." },
      { hi: "Bonus: G2:G5 select karo, Home ▸ Conditional Formatting ▸ Cell rules ▸ Equal to, aur “Reorder” likho — laal highlight lag jaayega.", en: "Bonus: select G2:G5, Home ▸ Conditional Formatting ▸ Cell rules ▸ Equal to, and type “Reorder” — the alert cells turn red." },
    ],
    write: [
      { at: "F2", formula: "=D2*E2", why: "Stock value" },
      { at: "F3", formula: "=D3*E3", why: "Neeche fill" },
      { at: "F4", formula: "=D4*E4", why: "Neeche fill" },
      { at: "F5", formula: "=D5*E5", why: "Neeche fill" },
      { at: "G2", formula: '=IF(D2<=C2,"Reorder","OK")', why: "Reorder level se compare" },
      { at: "G3", formula: '=IF(D3<=C3,"Reorder","OK")', why: "Neeche fill" },
      { at: "G4", formula: '=IF(D4<=C4,"Reorder","OK")', why: "Neeche fill" },
      { at: "G5", formula: '=IF(D5<=C5,"Reorder","OK")', why: "Neeche fill" },
      { at: "F7", formula: "=MIN(E2:E5)", why: "Sabse kam rate" },
    ],
    watchOut: {
      hi: "IF mein <= aur < ka farak: “at or below reorder level” mein <= lagta hai. Sirf < lagane se exactly 40 par alert nahi aayega.",
      en: "Mind <= versus < in IF: “at or below the reorder level” needs <=. With only <, a stock of exactly 40 never raises the alert.",
    },
    result: {
      hi: "Pen Box aur Stapler par “Reorder”, baaki “OK”; sabse kam rate 40.",
      en: "Pen Box and Stapler say “Reorder”, the rest “OK”; the lowest rate is 40.",
    },
    shortcuts: ["F4", "Alt+H L"],
  },

  /* ---------------------------- 10. datewise ----------------------------- */
  {
    id: "sheet-datewise",
    titleHi: "Date report banao: month ka naam, saal, month number aur month-end",
    titleEn: "Build the date report: month name, year, month number and month-end",
    goalHi:
      "A column mein dates hain. B se E khaali hain — wahan month ka naam, saal, month number aur us mahine ki aakhri tareekh chahiye.",
    goalEn:
      "Column A holds dates. B to E are empty — they need the month name, the year, the month number and the last date of that month.",
    steps: [
      { hi: "B2 par tap karo aur likho: =TEXT(A2,\"mmm\"). Enter — isse “Jan” jaisa chhota naam aata hai.", en: "Tap B2 and type =TEXT(A2,\"mmm\"), Enter — that gives a short name like “Jan”." },
      { hi: "C2 par jao: =YEAR(A2). Enter.", en: "Go to C2: =YEAR(A2), Enter." },
      { hi: "D2 par jao: =MONTH(A2). Enter — January ke liye 1 aata hai (naam nahi, number).", en: "Go to D2: =MONTH(A2), Enter — that returns 1 for January, a number, not a name." },
      { hi: "E2 par jao: =EOMONTH(A2,0). Enter. 0 ka matlab “isi mahine ka aakhri din”.", en: "Go to E2: =EOMONTH(A2,0), Enter. The 0 means “the last day of this same month”." },
      { hi: "B2:E2 select karke neeche fill karo — rows 3, 4, 5.", en: "Select B2:E2 and fill down to rows 3, 4 and 5." },
      { hi: "Agar E2 mein number (jaise 46053) dikhe to cell par right-click ▸ Format Cells ▸ Date chuno, ya Ctrl+Shift+3 dabao.", en: "If E2 shows a serial number (like 46053), right-click ▸ Format Cells ▸ Date, or press Ctrl+Shift+3." },
    ],
    write: [
      { at: "B2", formula: '=TEXT(A2,"mmm")', why: "Jan, Feb, Mar…" },
      { at: "C2", formula: "=YEAR(A2)", why: "Saal" },
      { at: "D2", formula: "=MONTH(A2)", why: "Month number 1-12" },
      { at: "E2", formula: "=EOMONTH(A2,0)", why: "Mahine ka aakhri din" },
      { at: "B3:E5", formula: "Fill down", why: "Baaki rows" },
    ],
    watchOut: {
      hi: "MONTH() naam nahi, number deta hai. Naam chahiye to TEXT(A2,\"mmm\") ya TEXT(A2,\"mmmm\") — bade naam ke liye mmmm.",
      en: "MONTH() returns a number, not a name. For a name use TEXT(A2,\"mmm\") or TEXT(A2,\"mmmm\") for the full month.",
    },
    result: {
      hi: "15-01-2026 → Jan / 2026 / 1 / 31-01-2026",
      en: "15-01-2026 → Jan / 2026 / 1 / 31-01-2026",
    },
    shortcuts: ["Ctrl+Shift+3", "Ctrl+D"],
  },

  /* ----------------------------- 11. budget ------------------------------ */
  {
    id: "sheet-budget",
    titleHi: "Budget vs Actual banao: SUMIF, variance aur over-budget flag",
    titleEn: "Build budget vs actual: SUMIF, variance and an over-budget flag",
    goalHi:
      "Upar budget table hai (rows 1-5) aur neeche transaction list (rows 7-13). C, D, E khaali hain — actual, variance aur flag bharna hai.",
    goalEn:
      "The budget table is rows 1-5 and the transaction list is rows 7-13. C, D and E are empty — fill actual, variance and the flag.",
    steps: [
      { hi: "C2 par tap karo aur likho: =SUMIF($A$8:$A$13,A2,$B$8:$B$13). $ ka matlab range fix — neeche kheenchne par khisakti nahi.", en: "Tap C2 and type =SUMIF($A$8:$A$13,A2,$B$8:$B$13). The $ fixes the range so it never slides when you fill down." },
      { hi: "C2 ko C3-C5 mein fill karo. Har row apne head ka actual khud utha legi.", en: "Fill C2 down to C3-C5. Each row picks up the actual for its own head." },
      { hi: "D2 par jao: =C2-B2 (Actual − Budget). Enter, phir neeche fill.", en: "Go to D2: =C2-B2 (Actual − Budget), Enter, then fill down." },
      { hi: "E2 par jao: =IF(D2>0,\"Over\",\"Under\"). Enter, phir neeche fill.", en: "Go to E2: =IF(D2>0,\"Over\",\"Under\"), Enter, then fill down." },
      { hi: "Check karo: Salary ka variance +2000 aur flag “Over” hona chahiye; Electricity “Under”.", en: "Check: Salary must show +2000 variance and “Over”; Electricity must be “Under”." },
    ],
    write: [
      { at: "C2", formula: "=SUMIF($A$8:$A$13,A2,$B$8:$B$13)", why: "Head ke saare transaction jodo" },
      { at: "C3", formula: "=SUMIF($A$8:$A$13,A3,$B$8:$B$13)", why: "Neeche fill" },
      { at: "C4", formula: "=SUMIF($A$8:$A$13,A4,$B$8:$B$13)", why: "Neeche fill" },
      { at: "C5", formula: "=SUMIF($A$8:$A$13,A5,$B$8:$B$13)", why: "Neeche fill" },
      { at: "D2", formula: "=C2-B2", why: "Variance" },
      { at: "D3", formula: "=C3-B3", why: "Neeche fill" },
      { at: "E2", formula: '=IF(D2>0,"Over","Under")', why: "Budget se upar?" },
      { at: "E3", formula: '=IF(D3>0,"Over","Under")', why: "Neeche fill" },
    ],
    watchOut: {
      hi: "$A$8:$A$13 fix na karne se har row ki range ek row neeche khisak jaati hai aur total galat aata hai — isliye absolute range zaroori hai.",
      en: "Without fixing $A$8:$A$13, the range slides one row down per row and the totals go wrong — the absolute range is not optional.",
    },
    result: {
      hi: "Salary: 47,000 actual, +2,000 variance, “Over” · Electricity: 2,800 actual, −200, “Under”",
      en: "Salary: 47,000 actual, +2,000 variance, “Over” · Electricity: 2,800 actual, −200, “Under”",
    },
    shortcuts: ["F4", "Ctrl+D", "Alt+="],
  },
];

/** The task for a practice sheet, in the same order as PRACTICE_SHEETS. */
export function taskFor(id: PracticeSheetId): PracticeTask {
  return PRACTICE_TASKS.find((task) => task.id === id) ?? PRACTICE_TASKS[0];
}
