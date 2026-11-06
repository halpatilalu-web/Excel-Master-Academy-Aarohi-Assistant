import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Bot,
  Briefcase,
  Check,
  Copy,
  Keyboard,
  Palette,
  RotateCcw,
  Sparkles,
  Wand2,
  Zap,
} from "lucide-react";
import { SHORTCUTS, SHORTCUT_CATS, shortcutCatLabel } from "../data/shortcuts";
import { Bilingual, useLang } from "../lib/lang";
import { Button, Card, Pill } from "../components/ui";

function ChipBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-xs font-semibold border transition ${
        active
          ? "bg-emerald-700 text-white border-emerald-700"
          : "bg-(--color-surface) text-(--color-ink) border-(--color-border-strong) hover:bg-(--color-accent-soft)"
      }`}
    >
      {children}
    </button>
  );
}

type ToolkitTab = "prompt" | "colors" | "errors" | "trainer" | "interview";

interface PromptPreset {
  id: string;
  badge: string;
  titleEn: string;
  titleHi: string;
  workbook: string;
  sheet: string;
  range: string;
  columns: string;
  mode: "Formula" | "VBA Macro" | "Power Query";
  requirement: string;
  output: string;
  instantCode: string;
  stepsHi: string;
}

const PROMPT_PRESETS: PromptPreset[] = [
  {
    id: "sumif-sales",
    badge: "Formula",
    titleEn: "1. Summarize Sales by Category",
    titleHi: "1. Category के हिसाब से कुल Sales जोड़ना",
    workbook: "Sales_Report.xlsx",
    sheet: "Monthly_Data",
    range: "A1:D100",
    columns: "Col A = Category, Col B = Product, Col C = Qty, Col D = Sales Amount",
    mode: "Formula",
    requirement: "Calculate total sales for each unique product category listed in F2:F10",
    output: "G2:G10",
    instantCode: '=SUMIF($A$2:$A$100, F2, $D$2:$D$100)',
    stepsHi: "G2 में फॉर्मूला लिखें और G10 तक नीचे ड्रैग करें ($ साइन रेंज को लॉक रखता है)।",
  },
  {
    id: "low-stock-vba",
    badge: "VBA Macro",
    titleEn: "2. Highlight Low-Stock Rows (< 10) in Red",
    titleHi: "2. कम स्टॉक (< 10) वाली पूरी Row को लाल करना",
    workbook: "Inventory_Tracker.xlsm",
    sheet: "Stock",
    range: "A1:E500",
    columns: "Col A = SKU, Col B = Item Name, Col C = Stock Quantity, Col D = Price",
    mode: "VBA Macro",
    requirement: "Highlight the entire row in soft red whenever Stock Quantity in Column C is less than 10",
    output: "Same sheet rows A2:E500",
    instantCode: `Sub HighlightLowStock()
    Dim ws As Worksheet, cell As Range
    Set ws = ThisWorkbook.Sheets("Stock")
    For Each cell In ws.Range("C2:C500")
        If IsNumeric(cell.Value) And cell.Value <> "" And cell.Value < 10 Then
            cell.EntireRow.Interior.Color = RGB(255, 205, 210)
        End If
    Next cell
End Sub`,
    stepsHi: "Alt + F11 दबाएं → Insert Module → कोड पेस्ट करें → Alt + F8 दबाकर HighlightLowStock रन करें!",
  },
  {
    id: "dedup-latest",
    badge: "Dynamic Array",
    titleEn: "3. Deduplicate IDs & Keep Latest Date Only",
    titleHi: "3. Duplicate हटाकर सिर्फ सबसे नई तारीख वाला रिकॉर्ड रखना",
    workbook: "Employee_Data.xlsx",
    sheet: "HR_Records",
    range: "A1:G500",
    columns: "Col A = Employee ID, Col B = Name, Col C = Dept, Col G = Last Update Date",
    mode: "Formula",
    requirement: "Remove duplicate Employee IDs and keep ONLY the latest entry for each employee based on Column G date",
    output: "Sheet 'Cleaned_Records' cell A2",
    instantCode: `=SORT(FILTER(HR_Records!A2:G500, HR_Records!G2:G500 = MAXIFS(HR_Records!G2:G500, HR_Records!A2:A500, HR_Records!A2:A500)), 7, -1)`,
    stepsHi: "MAXIFS हर Employee ID की सबसे लेटेस्ट तारीख निकालता है और FILTER सिर्फ वही पंक्तियां बाहर लाता है!",
  },
  {
    id: "auto-pivot-vba",
    badge: "VBA Macro",
    titleEn: "4. Auto-Create Revenue & Expense Pivot Table",
    titleHi: "4. एक क्लिक में Revenue और Expense का Pivot Table बनाना",
    workbook: "Financial_Summary.xlsm",
    sheet: "Annual_Report",
    range: "A1:D365",
    columns: "Col A = Month, Col B = Category, Col C = Revenue, Col D = Expense",
    mode: "VBA Macro",
    requirement: "Create a new sheet 'Summary' with a Pivot Table showing Revenue and Expense by Category (rows) and Month (columns)",
    output: "New sheet 'Summary' starting at A3",
    instantCode: `Sub CreatePivotTable()
    Dim wsData As Worksheet, wsSummary As Worksheet
    Dim pCache As PivotCache, pTable As PivotTable
    Set wsData = ThisWorkbook.Sheets("Annual_Report")
    Set wsSummary = ThisWorkbook.Sheets.Add
    wsSummary.Name = "Summary"
    Set pCache = ThisWorkbook.PivotCaches.Create(xlDatabase, wsData.Range("A1:D365"))
    Set pTable = pCache.CreatePivotTable(wsSummary.Range("A3"), "SummaryPivot")
    With pTable
        .PivotFields("Category").Orientation = xlRowField
        .PivotFields("Month").Orientation = xlColumnField
        .AddDataField .PivotFields("Revenue"), "Sum of Revenue", xlSum
        .AddDataField .PivotFields("Expense"), "Sum of Expense", xlSum
    End With
End Sub`,
    stepsHi: "फाइल को .xlsm में सेव करें और यह मैक्रो चलाएं — 1 सेकंड में नया Summary Pivot तैयार!",
  },
  {
    id: "email-deadline-vba",
    badge: "VBA + Outlook",
    titleEn: "5. 3-Day Task Deadline Email Reminder",
    titleHi: "5. 3 दिन के अंदर आने वाली Deadline पर ऑटो ईमेल भेजना",
    workbook: "Task_Schedule.xlsm",
    sheet: "Deadlines",
    range: "A1:D100",
    columns: "Col A = Task Name, Col B = Due Date, Col C = Owner Name, Col D = Email",
    mode: "VBA Macro",
    requirement: "Send an Outlook email reminder for every task whose Due Date in Column B is within the next 3 days",
    output: "Automated Outlook Email Draft/Send",
    instantCode: `Sub SendReminderEmails()
    Dim OutApp As Object, OutMail As Object, ws As Worksheet, i As Long
    Set ws = ThisWorkbook.Sheets("Deadlines")
    Set OutApp = CreateObject("Outlook.Application")
    For i = 2 To ws.Cells(ws.Rows.Count, "A").End(xlUp).Row
        If ws.Cells(i, 2).Value - Date <= 3 And ws.Cells(i, 2).Value >= Date Then
            Set OutMail = OutApp.CreateItem(0)
            With OutMail
                .To = ws.Cells(i, 4).Value
                .Subject = "Task Deadline Reminder: " & ws.Cells(i, 1).Value
                .Body = "Dear " & ws.Cells(i, 3).Value & ", '" & ws.Cells(i, 1).Value & "' is due on " & ws.Cells(i, 2).Value
                .Display 'Change to .Send after testing
            End With
        End If
    Next i
End Sub`,
    stepsHi: "टेस्टिंग के लिए .Display रखा गया है ताकि भेजने से पहले आप ईमेल देख सकें; लाइव करने के लिए .Send लिखें।",
  },
  {
    id: "gst-invoice-formula",
    badge: "Accounts GST",
    titleEn: "6. Auto CGST/SGST vs IGST Tax Split",
    titleHi: "6. State देखकर अपने-आप CGST+SGST या IGST लगाना",
    workbook: "GST_Billing_FY26.xlsx",
    sheet: "Invoices",
    range: "A1:H200",
    columns: "Cell G1 = Seller Home State ('Gujarat'), Col C = Buyer State, Col D = Taxable Amount",
    mode: "Formula",
    requirement: "Split 18% GST into 9% CGST + 9% SGST when Buyer State equals Home State ($G$1), otherwise apply 18% IGST",
    output: "Col E (CGST), Col F (SGST), Col G (IGST), Col H (Total)",
    instantCode: `CGST (E2): =IF(C2=$G$1, ROUND(D2*9%, 2), 0)
SGST (F2): =IF(C2=$G$1, ROUND(D2*9%, 2), 0)
IGST (G2): =IF(C2<>$G$1, ROUND(D2*18%, 2), 0)
Total (H2): =SUM(D2:G2)`,
    stepsHi: "ROUND(..., 2) लगाने से पैसे का मिलान GST पोर्टल पर हमेशा 100% सटीक बैठता है!",
  },
];

interface ReportPalette {
  id: string;
  nameEn: string;
  nameHi: string;
  harmony: "Minimal Corporate" | "Complementary" | "Analogous" | "Monochromatic";
  vibeEn: string;
  vibeHi: string;
  headerBg: string;
  headerText: string;
  accent: string;
  accentSoft: string;
  canvasBg: string;
  zebraBg: string;
  bodyText: string;
  swatches: { role: string; hex: string; rgb: string }[];
}

const REPORT_PALETTES: ReportPalette[] = [
  {
    id: "navy-exec",
    nameEn: "Palette 1: Navy Blue + Light Gray + White",
    nameHi: "पैलेट 1: नेवी ब्लू + लाइट ग्रे + व्हाइट (Minimal Boardroom)",
    harmony: "Minimal Corporate",
    vibeEn: "Clean, authoritative, and trusted by CFOs & banks.",
    vibeHi: "बैंकों और CFO मीटिंग्स के लिए सबसे भरोसेमंद और साफ पैलेट।",
    headerBg: "#1B4F72",
    headerText: "#FFFFFF",
    accent: "#2E86C1",
    accentSoft: "#D6EAF8",
    canvasBg: "#FFFFFF",
    zebraBg: "#F4F6F7",
    bodyText: "#1C2833",
    swatches: [
      { role: "Primary Header", hex: "#1B4F72", rgb: "RGB(27, 79, 114)" },
      { role: "Chart Accent", hex: "#2E86C1", rgb: "RGB(46, 134, 193)" },
      { role: "Neutral Row", hex: "#F4F6F7", rgb: "RGB(244, 246, 247)" },
      { role: "Canvas White", hex: "#FFFFFF", rgb: "RGB(255, 255, 255)" },
    ],
  },
  {
    id: "emerald-classic",
    nameEn: "Palette 2: Dark Green + Warm Beige + Charcoal",
    nameHi: "पैलेट 2: डार्क ग्रीन + बेज + चारकोल (Classic Accounting)",
    harmony: "Analogous",
    vibeEn: "Classic Excel elegance ideal for P&L, Audit, and GST reports.",
    vibeHi: "P&L, बैलेंस शीट और ऑडिट रिपोर्ट्स के लिए क्लासिक अकाउंटिंग लुक।",
    headerBg: "#145A32",
    headerText: "#FFFFFF",
    accent: "#1E8449",
    accentSoft: "#D4EFDF",
    canvasBg: "#FDFBF7",
    zebraBg: "#F5F0E6",
    bodyText: "#1C2833",
    swatches: [
      { role: "Primary Header", hex: "#145A32", rgb: "RGB(20, 90, 50)" },
      { role: "Growth Accent", hex: "#1E8449", rgb: "RGB(30, 132, 73)" },
      { role: "Warm Beige", hex: "#F5F0E6", rgb: "RGB(245, 240, 230)" },
      { role: "Ink Text", hex: "#1C2833", rgb: "RGB(28, 40, 51)" },
    ],
  },
  {
    id: "charcoal-teal",
    nameEn: "Palette 3: Charcoal Gray + Teal + Silver",
    nameHi: "पैलेट 3: चारकोल ग्रे + टील + सिल्वर (Modern Analytics)",
    harmony: "Analogous",
    vibeEn: "Sleek modern SaaS dashboard aesthetic for Sales & Operations.",
    vibeHi: "आधुनिक सेल्स और ऑपरेशंस डैशबोर्ड के लिए स्टाइलिश लुक।",
    headerBg: "#2C3E50",
    headerText: "#FFFFFF",
    accent: "#0E9AA7",
    accentSoft: "#D1F2EB",
    canvasBg: "#FFFFFF",
    zebraBg: "#EAEDED",
    bodyText: "#212F3D",
    swatches: [
      { role: "Charcoal Header", hex: "#2C3E50", rgb: "RGB(44, 62, 80)" },
      { role: "Teal KPI Accent", hex: "#0E9AA7", rgb: "RGB(14, 154, 167)" },
      { role: "Silver Zebra", hex: "#EAEDED", rgb: "RGB(234, 237, 237)" },
      { role: "Soft Highlight", hex: "#D1F2EB", rgb: "RGB(209, 242, 235)" },
    ],
  },
  {
    id: "blue-orange-comp",
    nameEn: "Palette 4: Deep Blue + Warm Amber (Complementary)",
    nameHi: "पैलेट 4: डीप ब्लू + अंबर ऑरेंज (Target vs Actual)",
    harmony: "Complementary",
    vibeEn: "Opposite-wheel contrast perfect for Actual vs Budget comparisons.",
    vibeHi: "Target बनाम Actual तुलना दिखाने के लिए सबसे ज़बरदस्त कंट्रास्ट!",
    headerBg: "#1E3A8A",
    headerText: "#FFFFFF",
    accent: "#D97706",
    accentSoft: "#FEF3C7",
    canvasBg: "#FFFFFF",
    zebraBg: "#EFF6FF",
    bodyText: "#1E293B",
    swatches: [
      { role: "Deep Blue", hex: "#1E3A8A", rgb: "RGB(30, 58, 138)" },
      { role: "Amber Contrast", hex: "#D97706", rgb: "RGB(217, 119, 6)" },
      { role: "Ice Tint", hex: "#EFF6FF", rgb: "RGB(239, 246, 255)" },
      { role: "Amber Soft", hex: "#FEF3C7", rgb: "RGB(254, 243, 199)" },
    ],
  },
  {
    id: "mono-indigo",
    nameEn: "Palette 5: Monochromatic Royal Indigo",
    nameHi: "पैलेट 5: मोनोक्रोमैटिक रॉयल इंडिगो (Single-Hue Harmony)",
    harmony: "Monochromatic",
    vibeEn: "Zero visual clutter — uses dark, medium, and pale tints of one single hue.",
    vibeHi: "एक ही रंग के गहरे और हल्के शेड्स — आंखों को सबसे सुकून देने वाला डिज़ाइन।",
    headerBg: "#312E81",
    headerText: "#FFFFFF",
    accent: "#4F46E5",
    accentSoft: "#E0E7FF",
    canvasBg: "#FFFFFF",
    zebraBg: "#F5F3FF",
    bodyText: "#1E1B4B",
    swatches: [
      { role: "Indigo 900", hex: "#312E81", rgb: "RGB(49, 46, 129)" },
      { role: "Indigo 600", hex: "#4F46E5", rgb: "RGB(79, 70, 229)" },
      { role: "Indigo 100", hex: "#E0E7FF", rgb: "RGB(224, 231, 255)" },
      { role: "Indigo 50", hex: "#F5F3FF", rgb: "RGB(245, 243, 255)" },
    ],
  },
];

interface ExcelErrorGuide {
  code: string;
  category: "Classic" | "Range & Format" | "Modern 365";
  meaningEn: string;
  meaningHi: string;
  brokenFormula: string;
  whyEn: string;
  whyHi: string;
  fixedFormula: string;
  stepsHi: string;
}

const ALL_12_ERRORS: ExcelErrorGuide[] = [
  {
    code: "#DIV/0!",
    category: "Classic",
    meaningEn: "Division by Zero or Blank Cell",
    meaningHi: "शून्य (0) या खाली सेल से भाग देना",
    brokenFormula: "=A2 / B2   (where B2 is 0 or empty)",
    whyEn: "Denominator cell B2 contains 0 or is empty, which is mathematically undefined.",
    whyHi: "नीचे वाले सेल (B2) में 0 है या वह खाली है।",
    fixedFormula: '=IFERROR(A2 / B2, 0)',
    stepsHi: "IFERROR लगाएं या चेक करें कि B2 खाली क्यों है।",
  },
  {
    code: "#N/A",
    category: "Classic",
    meaningEn: "Value Not Available in Lookup",
    meaningHi: "Lookup में ढूंढी गई वैल्यू नहीं मिली",
    brokenFormula: '=VLOOKUP("EMP-999", A2:C50, 3, FALSE)',
    whyEn: "Lookup ID does not exist in column A, or extra spaces / text-vs-number mismatch exists.",
    whyHi: "या तो ID लिस्ट में नहीं है, या आगे-पीछे फालतू स्पेस है, या एक जगह नंबर और दूसरी जगह टेक्स्ट है।",
    fixedFormula: '=IFNA(XLOOKUP(TRIM(E2), A2:A50, C2:C50), "Not Found")',
    stepsHi: "TRIM() से स्पेस हटाएं और IFNA या XLOOKUP का [if_not_found] इस्तेमाल करें।",
  },
  {
    code: "#VALUE!",
    category: "Classic",
    meaningEn: "Wrong Data Type in Operation",
    meaningHi: "गलत डेटा टाइप (टेक्स्ट के साथ गणित)",
    brokenFormula: '="Rs. 500" + 100',
    whyEn: "Arithmetic operator (+, -, *, /) tried to calculate a text string instead of a pure number.",
    whyHi: "सेल में नंबर के साथ 'Rs.' या स्पेस लिखा है इसलिए + काम नहीं कर रहा।",
    fixedFormula: '=SUM(A2:B2)   or   =VALUE(SUBSTITUTE(A2,"Rs. ","")) + 100',
    stepsHi: "रुपये का चिन्ह टाइप करने की जगह Number Formatting (Ctrl+Shift+$) से लगाएं!",
  },
  {
    code: "#REF!",
    category: "Classic",
    meaningEn: "Invalid / Deleted Cell Reference",
    meaningHi: "रेफर किया गया सेल या कॉलम डिलीट हो गया",
    brokenFormula: "=A2 + #REF!",
    whyEn: "A row, column, or sheet referenced by the formula was permanently deleted.",
    whyHi: "जिस कॉलम या शीट से फॉर्मूला जुड़ा था, उसे किसी ने Delete कर दिया।",
    fixedFormula: "Press Ctrl + Z immediately, or use =SUM(A2:C2) / XLOOKUP instead of brittle offsets",
    stepsHi: "तुरंत Ctrl+Z दबाएं और भविष्य में कॉलम इंडेक्स की जगह XLOOKUP इस्तेमाल करें।",
  },
  {
    code: "#NAME?",
    category: "Classic",
    meaningEn: "Unrecognized Function Name or Missing Quotes",
    meaningHi: "फॉर्मूले की स्पेलिंग गलत या टेक्स्ट पर कोट्स छूटे",
    brokenFormula: "=SUMM(A1:A10)   or   =IF(A2=Pass, 1, 0)",
    whyEn: "Misspelled function (`SUMM`, `VLOKUP`) or forgot double quotes around text (`\"Pass\"`).",
    whyHi: "SUM की जगह SUMM लिख दिया या टेक्स्ट \"Pass\" को डबल कोट्स में बंद नहीं किया।",
    fixedFormula: '=SUM(A1:A10)   and   =IF(A2="Pass", 1, 0)',
    stepsHi: "Tab दबाकर Excel की लिस्ट से फॉर्मूला चुनें ताकि स्पेलिंग कभी गलत न हो!",
  },
  {
    code: "#NUM!",
    category: "Classic",
    meaningEn: "Impossible Numeric Calculation or Duplicate DGET",
    meaningHi: "असंभव गणितीय मान (जैसे नेगेटिव का वर्गमूल या DGET डुप्लीकेट)",
    brokenFormula: "=SQRT(-16)   or   =LARGE(A2:A5, 10)",
    whyEn: "Negative square root, k larger than list size in LARGE/SMALL, or duplicate matches in DGET.",
    whyHi: "नेगेटिव नंबर का SQRT निकाला या 5 नंबरों की लिस्ट में 10वां सबसे बड़ा नंबर मांगा।",
    fixedFormula: "=SQRT(ABS(A2))",
    stepsHi: "इनपुट नंबर की रेंज जांचें या ABS() से नेगेटिव हटाएं।",
  },
  {
    code: "#NULL!",
    category: "Range & Format",
    meaningEn: "Missing Range Separator (Space Instead of : or ,)",
    meaningHi: "रेंज में कोलोन (:) या कॉमा (,) की जगह स्पेस लग गया",
    brokenFormula: "=SUM(A1 A10)",
    whyEn: "Space is Excel's range intersection operator. Since A1 and A10 don't overlap, Excel throws #NULL!.",
    whyHi: "A1 और A10 के बीच ':' छूट गया और गलती से स्पेस दब गया!",
    fixedFormula: "=SUM(A1:A10)   (continuous)   or   =SUM(A1, A10)   (separate cells)",
    stepsHi: "स्पेस हटाकर रेंज के लिए कोलोन (:) या अलग सेल्स के लिए कॉमा (,) लगाएं।",
  },
  {
    code: "#######",
    category: "Range & Format",
    meaningEn: "Column Too Narrow or Negative Date/Time",
    meaningHi: "कॉलम छोटा पड़ गया है या तारीख/समय माइनस में है",
    brokenFormula: "Column width 4px showing ₹12,50,000.00   or   =-50 formatted as Date",
    whyEn: "Not a broken formula! Either the column is too narrow to display the number, or a date subtraction is negative.",
    whyHi: "यह असली एरर नहीं है! बस कॉलम की चौड़ाई कम है (या तारीख नेगेटिव है)।",
    fixedFormula: "Double-click column header border or press Alt + H, O, I to AutoFit!",
    stepsHi: "कॉलम की बॉर्डर पर डबल-क्लिक करें या Alt + H + O + I दबाएं — नंबर तुरंत दिखने लगेगा!",
  },
  {
    code: "#SPILL!",
    category: "Modern 365",
    meaningEn: "Dynamic Array Spill Area is Blocked",
    meaningHi: "Dynamic Array के फैलने की जगह नीचे रुकी हुई है",
    brokenFormula: "=UNIQUE(A2:A50)   (while cell below contains 'Total' or Merged Cells)",
    whyEn: "Dynamic array functions (FILTER, UNIQUE, SORT, SEQUENCE) need empty cells below/right to spill results.",
    whyHi: "नीचे किसी सेल में पहले से कुछ लिखा है या सेल्स Merge किए हुए हैं।",
    fixedFormula: "Clear blocking cells / unmerge cells in the dashed blue spill border",
    stepsHi: "सेल पर क्लिक करके नीली डॉटेड लाइन देखें और बीच में आ रहे टेक्स्ट को हटा दें।",
  },
  {
    code: "#CALC!",
    category: "Modern 365",
    meaningEn: "Empty Array or Unsupported Calculation Engine Scenario",
    meaningHi: "FILTER खाली आया या नेस्टेड Array सपोर्ट नहीं है",
    brokenFormula: '=FILTER(A2:C20, B2:B20="Atlantis")',
    whyEn: "FILTER found 0 matching rows and no [if_empty] fallback argument was provided.",
    whyHi: "FILTER को एक भी मैचिंग पंक्ति नहीं मिली और आपने 3rd argument नहीं दिया।",
    fixedFormula: '=FILTER(A2:C20, B2:B20="Atlantis", "No Matching Records")',
    stepsHi: "FILTER फॉर्मूले के अंत में हमेशा अल्पविराम लगाकर \"No Match\" लिखें!",
  },
  {
    code: "#CONNECT!",
    category: "Modern 365",
    meaningEn: "Broken External Data Source / Network Connection",
    meaningHi: "बाहरी डेटा सर्वर या इंटरनेट कनेक्शन टूट गया",
    brokenFormula: "Stock / Geography Linked Data Type or SQL/Web Power Query offline",
    whyEn: "Excel cannot reach Microsoft Data Types server, SharePoint, or SQL database.",
    whyHi: "इंटरनेट बंद है या बाहरी डेटाबेस सर्वर से संपर्क टूट गया है।",
    fixedFormula: "Check internet/VPN → Click Data → Refresh All (Ctrl + Alt + F5)",
    stepsHi: "नेटवर्क जांचें और Data → Queries & Connections में जाकर Ctrl + Alt + F5 से रिफ्रेश करें।",
  },
  {
    code: "#BLOCKED!",
    category: "Modern 365",
    meaningEn: "Blocked by Trust Center Security Policy",
    meaningHi: "Trust Center सिक्योरिटी ने फंक्शन या लिंक रोक दिया है",
    brokenFormula: "External workbook link, Python/Script, or untrusted macro function",
    whyEn: "Excel Trust Center privacy/security settings blocked external links, macros, or linked data types.",
    whyHi: "फाइल इंटरनेट से डाउनलोड हुई है इसलिए Excel की सुरक्षा ने इसे ब्लॉक किया है।",
    fixedFormula: "File → Options → Trust Center → Trust Center Settings → Enable trusted content",
    stepsHi: "पीली Security Warning बार में 'Enable Content' तभी दबाएं जब फाइल भरोसेमंद स्रोत से हो।",
  },
];

interface InterviewQA {
  cat: "Lookups" | "Pivot & MIS" | "Cleaning" | "Accounts & GST" | "Power Query & VBA";
  qEn: string;
  qHi: string;
  aEn: string;
  aHi: string;
}

const INTERVIEW_QA: InterviewQA[] = [
  {
    cat: "Lookups",
    qEn: "1. Why is XLOOKUP (or INDEX-MATCH) better than VLOOKUP in corporate MIS?",
    qHi: "1. ऑफिस MIS में VLOOKUP से बेहतर XLOOKUP या INDEX-MATCH क्यों माना जाता है?",
    aEn: "Three reasons: (1) VLOOKUP cannot look left, while XLOOKUP/INDEX-MATCH look in any direction; (2) Inserting a column breaks VLOOKUP's hardcoded col_index_num; (3) XLOOKUP has built-in [if_not_found] and reverse bottom-up search.",
    aHi: "तीन मुख्य कारण: (1) VLOOKUP बाईं तरफ नहीं देख सकता; (2) बीच में नया कॉलम जोड़ने पर VLOOKUP का कॉलम नंबर बिगड़ जाता है; (3) XLOOKUP में इन-बिल्ट एरर मैसेज और नीचे-से-ऊपर ढूंढने की सुविधा है।",
  },
  {
    cat: "Lookups",
    qEn: "2. How do you perform a Lookup based on TWO criteria (e.g., EmpID + Month)?",
    qHi: "2. दो शर्तों (जैसे EmpID + Month) के आधार पर Lookup कैसे करोगे?",
    aEn: "Use boolean multiplication inside XLOOKUP: `=XLOOKUP(1, (A2:A500=G1)*(B2:B500=G2), C2:C500, \"Not Found\")`.",
    aHi: "XLOOKUP में बूलियन गुणा लगाएं: `=XLOOKUP(1, (A2:A500=G1)*(B2:B500=G2), C2:C500, \"Not Found\")`।",
  },
  {
    cat: "Cleaning",
    qEn: "3. VLOOKUP is returning #N/A even though the ID visibly exists! How do you debug it?",
    qHi: "3. ID सामने दिख रही है फिर भी VLOOKUP #N/A दे रहा है — इसे कैसे ठीक करोगे?",
    aEn: "Check 3 culprits: (1) Leading/trailing spaces → fix with `TRIM()`; (2) Non-printable characters → `CLEAN()`; (3) One ID is Text and the other is Number → check with `ISTEXT()`/`ISNUMBER()` and coerce using `--A2` or `VALUE()`.",
    aHi: "3 कारण जांचें: (1) फालतू स्पेस → `TRIM()`; (2) छुपे कैरेक्टर → `CLEAN()`; (3) एक जगह Text और दूसरी जगह Number → `VALUE()` या `Data → Text to Columns → Finish` से नंबर बनाएं!",
  },
  {
    cat: "Cleaning",
    qEn: "4. What is the difference between `FIND` and `SEARCH`, and `SUBSTITUTE` vs `REPLACE`?",
    qHi: "4. `FIND` बनाम `SEARCH` और `SUBSTITUTE` बनाम `REPLACE` में क्या अंतर है?",
    aEn: "`FIND` is case-sensitive and doesn't allow wildcards; `SEARCH` is case-insensitive and supports `*` and `?`. `SUBSTITUTE` swaps known text anywhere, while `REPLACE` swaps characters by numeric start position.",
    aHi: "`FIND` बड़े/छोटे अक्षर का फर्क मानता है जबकि `SEARCH` नहीं मानता और वाइल्डकार्ड (`*`) चलाता है। `SUBSTITUTE` शब्द बदलता है जबकि `REPLACE` पोजीशन देखकर बदलता है।",
  },
  {
    cat: "Pivot & MIS",
    qEn: "5. What is the difference between `SUM`, `SUBTOTAL(9,...)`, and `AGGREGATE(9,6,...)`?",
    qHi: "5. `SUM`, `SUBTOTAL` और `AGGREGATE` में क्या अंतर है?",
    aEn: "`SUM` adds hidden/filtered rows too; `SUBTOTAL(109, range)` sums ONLY visible filtered rows; `AGGREGATE(9, 6, range)` sums visible rows AND ignores `#DIV/0!` or `#N/A` errors inside the range!",
    aHi: "`SUM` छुपे हुए सेल्स भी जोड़ देता है; `SUBTOTAL` सिर्फ फिल्टर के बाद दिख रहे सेल्स जोड़ता है; और `AGGREGATE(9,6,...)` फिल्टर के साथ-साथ बीच में आए एरर को भी अनदेखा कर देता है!",
  },
  {
    cat: "Pivot & MIS",
    qEn: "6. How do you connect ONE Slicer to control 4 different Pivot Charts on a Dashboard?",
    qHi: "6. एक ही Slicer से डैशबोर्ड के 4 अलग Pivot Charts को कैसे कंट्रोल करते हैं?",
    aEn: "Build all 4 Pivot Tables from the same Excel Table (`Ctrl+T` source), insert the Slicer, right-click the Slicer → **Report Connections**, and tick all 4 Pivot Tables!",
    aHi: "चारों Pivot एक ही Excel Table (`Ctrl+T`) से बनाएं, फिर Slicer पर राइट-क्लिक → **Report Connections** में जाकर चारों Pivot पर टिक लगा दें!",
  },
  {
    cat: "Accounts & GST",
    qEn: "7. How do you extract Taxable Value & GST from a GST-inclusive amount of ₹5,900 (18% GST)?",
    qHi: "7. ₹5,900 (18% GST सहित) में से Taxable कीमत और GST राशि कैसे निकालोगे?",
    aEn: "Never multiply 5900 by 18%! Correct formula: `Taxable = 5900 / (1 + 18%) = ₹5,000`, and `GST = 5900 - 5000 = ₹900`.",
    aHi: "कभी भी 5900*18% मत करें! सही फॉर्मूला है: `=5900 / 1.18` जिससे ₹5,000 बेस कीमत और ₹900 GST निकलता है।",
  },
  {
    cat: "Accounts & GST",
    qEn: "8. Explain `PMT`, `IPMT`, `PPMT`, and `CUMIPMT` in loan schedules.",
    qHi: "8. लोन शेड्यूल में `PMT`, `IPMT`, `PPMT` और `CUMIPMT` का क्या काम है?",
    aEn: "`PMT` gives fixed monthly EMI; `IPMT` gives the interest portion of a specific month; `PPMT` gives principal repaid in that month (`IPMT + PPMT = PMT`); `CUMIPMT` gives total interest paid between two periods (e.g., April–March FY for tax certificate).",
    aHi: "`PMT` कुल मासिक किस्त देता है; `IPMT` उस महीने का ब्याज; `PPMT` मूलधन; और `CUMIPMT` पूरे वित्तीय वर्ष में चुकाया गया कुल ब्याज निकालता है!",
  },
  {
    cat: "Power Query & VBA",
    qEn: "9. When should you use Power Query instead of Formulas or VBA?",
    qHi: "9. फॉर्मूला या VBA की जगह Power Query कब इस्तेमाल करना चाहिए?",
    aEn: "Use Power Query whenever importing CSVs/folders, unpivoting wide monthly columns, splitting/trimming messy exports, or merging 100k+ rows — zero volatile formulas and 1-click Refresh!",
    aHi: "जब भी फोल्डर की 12 फाइलें जोड़नी हों, चौड़े महीनों को Unpivot करना हो या लाखों पंक्तियों का गंदा डेटा साफ करना हो — Power Query सबसे तेज़ और बिना कोड का तरीका है!",
  },
  {
    cat: "Power Query & VBA",
    qEn: "10. Which two lines make any slow VBA macro run up to 20x faster?",
    qHi: "10. कौन सी 2 लाइनें किसी भी धीमे VBA Macro को 20 गुना तेज़ बना देती हैं?",
    aEn: "Disable screen redraw and auto-calc at start: `Application.ScreenUpdating = False` and `Application.Calculation = xlCalculationManual` (and restore both to `True` / `xlCalculationAutomatic` at the end!).",
    aHi: "शुरू में `Application.ScreenUpdating = False` और `Application.Calculation = xlCalculationManual` लिखें, और अंत में वापस चालू कर दें!",
  },
];

export function ProToolkit({
  onAskAarohi,
}: {
  onAskAarohi?: (prompt: string) => void;
}) {
  const { t } = useLang();
  const [tab, setTab] = useState<ToolkitTab>("prompt");
  const [copiedKey, setCopiedKey] = useState("");

  // 1. AI Prompt Builder state
  const [workbook, setWorkbook] = useState(PROMPT_PRESETS[0].workbook);
  const [sheet, setSheet] = useState(PROMPT_PRESETS[0].sheet);
  const [range, setRange] = useState(PROMPT_PRESETS[0].range);
  const [columns, setColumns] = useState(PROMPT_PRESETS[0].columns);
  const [mode, setMode] = useState<"Formula" | "VBA Macro" | "Power Query">(PROMPT_PRESETS[0].mode);
  const [requirement, setRequirement] = useState(PROMPT_PRESETS[0].requirement);
  const [outputCell, setOutputCell] = useState(PROMPT_PRESETS[0].output);
  const [selectedPreset, setSelectedPreset] = useState<PromptPreset>(PROMPT_PRESETS[0]);

  // 2. Color Theory state
  const [activePalette, setActivePalette] = useState<ReportPalette>(REPORT_PALETTES[0]);

  // 3. 12-Error Doctor state
  const [activeError, setActiveError] = useState<ExcelErrorGuide>(ALL_12_ERRORS[6]); // Start on #NULL! or clickable

  // 4. Shortcut Speed Trainer state
  const [trainerCat, setTrainerCat] = useState<string>("All");
  const [osMode, setOsMode] = useState<"win" | "mac">("win");
  const [qSeed, setQSeed] = useState(0);
  const [pickedOpt, setPickedOpt] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);

  // 5. Interview QA state
  const [qaCat, setQaCat] = useState<string>("All");

  const copyText = (key: string, val: string) => {
    navigator.clipboard?.writeText(val);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(""), 1600);
  };

  const applyPreset = (p: PromptPreset) => {
    setSelectedPreset(p);
    setWorkbook(p.workbook);
    setSheet(p.sheet);
    setRange(p.range);
    setColumns(p.columns);
    setMode(p.mode);
    setRequirement(p.requirement);
    setOutputCell(p.output);
  };

  const generatedPrompt = useMemo(
    () =>
      `I have an Excel workbook named '${workbook}'. In the sheet '${sheet}', I have data in the range '${range}' (${columns}). I need an Excel ${mode} that will: ${requirement}. The output should be displayed in '${outputCell}'. Provide the exact ready-to-paste ${mode}, edge-case error handling, and step-by-step instructions in both English and Hindi.`,
    [workbook, sheet, range, columns, mode, requirement, outputCell]
  );

  // Shortcut trainer generator
  const trainerPool = useMemo(() => {
    const base = SHORTCUTS.filter((s) => (osMode === "mac" ? s.mac !== "-" : true));
    const filtered = trainerCat === "All" ? base : base.filter((s) => s.cat === trainerCat);
    return filtered.length >= 4 ? filtered : base;
  }, [trainerCat, osMode]);

  const currentQuestion = useMemo(() => {
    const idx = (qSeed * 17 + 5) % trainerPool.length;
    const correct = trainerPool[idx];
    const distractors: string[] = [];
    for (let step = 1; distractors.length < 3 && step < trainerPool.length; step++) {
      const cand = trainerPool[(idx + step * 7) % trainerPool.length];
      const key = osMode === "win" ? cand.win : cand.mac;
      const rightKey = osMode === "win" ? correct.win : correct.mac;
      if (key !== rightKey && !distractors.includes(key)) {
        distractors.push(key);
      }
    }
    const rightKey = osMode === "win" ? correct.win : correct.mac;
    const allOpts = [...distractors, rightKey];
    // Deterministic shuffle
    const rotated = allOpts.map((_, i) => allOpts[(i + qSeed) % allOpts.length]);
    return { item: correct, rightKey, options: rotated };
  }, [trainerPool, qSeed, osMode]);

  const answerTrainer = (opt: string) => {
    if (pickedOpt) return;
    setPickedOpt(opt);
    if (opt === currentQuestion.rightKey) {
      setScore((s) => s + 10);
      setStreak((st) => st + 1);
    } else {
      setStreak(0);
    }
  };

  const nextTrainerQ = () => {
    setPickedOpt(null);
    setQSeed((s) => s + 1);
  };

  const filteredQA = useMemo(
    () => (qaCat === "All" ? INTERVIEW_QA : INTERVIEW_QA.filter((q) => q.cat === qaCat)),
    [qaCat]
  );

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <Card className="p-6 bg-gradient-to-br from-teal-950 via-emerald-900 to-slate-900 text-white border-0 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-semibold mb-2">
              <Wand2 className="w-3.5 h-3.5 text-amber-300" />
              <Bilingual
                en="ACCOUNTS EXPERT & PRO DIPLOMA TOOLKIT • 5 POWER TOOLS"
                hi="अकाउंट्स एक्सपर्ट और डिप्लोमा प्रो टूलकिट • 5 इंटरैक्टिव टूल्स"
              />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              🧰{" "}
              <Bilingual
                en="AI Prompt Builder, Color Theory Studio, 12-Error Doctor & Career Prep"
                hi="AI प्रॉम्प्ट बिल्डर, कलर थ्योरी स्टूडियो, 12-एरर डॉक्टर और इंटरव्यू तैयारी"
              />
            </h1>
            <div className="text-sm text-emerald-100 mt-1.5 leading-relaxed">
              <Bilingual
                en="Generate structured Excel automation prompts, preview corporate report color palettes with HEX/RGB codes, fix all 12 Excel errors instantly, train 400 shortcuts, and ace MIS interviews!"
                hi="सटीक AI ऑटोमेशन प्रॉम्प्ट बनाएं, कॉर्पोरेट कलर पैलेट्स लाइव देखें, 12 एरर्स का इलाज सीखें, 400 शॉर्टकट्स का गेम खेलें और MIS इंटरव्यू क्रैक करें!"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-5">
          {(
            [
              ["prompt", "🤖 AI Prompt Builder", "🤖 AI प्रॉम्प्ट बिल्डर"],
              ["colors", "🎨 Color Theory Studio", "🎨 कलर थ्योरी स्टूडियो"],
              ["errors", "🚑 All 12 Errors Doctor", "🚑 12 एरर डॉक्टर"],
              ["trainer", "⌨️ 400-Shortcut Trainer", "⌨️ 400-शॉर्टकट ट्रेनर"],
              ["interview", "💼 MIS Interview Q&A", "💼 इंटरव्यू प्रश्न-उत्तर"],
            ] as const
          ).map(([id, en, hi]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition ${
                tab === id
                  ? "bg-(--color-surface) text-(--color-ink) shadow-md"
                  : "bg-white/10 text-white hover:bg-white/20"
              }`}
            >
              {t(en, hi)}
            </button>
          ))}
        </div>
      </Card>

      {/* ==================== TAB 1: AI PROMPT BUILDER ==================== */}
      {tab === "prompt" && (
        <div className="space-y-5">
          <div className="grid md:grid-cols-3 gap-3">
            {PROMPT_PRESETS.map((p) => (
              <button
                key={p.id}
                onClick={() => applyPreset(p)}
                className={`text-left p-4 rounded-2xl border transition ${
                  selectedPreset.id === p.id
                    ? "border-emerald-600 bg-(--color-accent-soft)/70 shadow-sm ring-2 ring-emerald-500/20"
                    : "border-(--color-border) bg-(--color-surface) hover:border-(--color-accent)"
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <Pill tone="good">{p.badge}</Pill>
                  <span className="text-[11px] text-slate-400 font-mono">{p.workbook}</span>
                </div>
                <div className="font-bold text-sm text-(--color-ink)">
                  <Bilingual en={p.titleEn} hi={p.titleHi} />
                </div>
                <div className="text-xs text-(--color-muted) mt-1 line-clamp-2">{p.requirement}</div>
              </button>
            ))}
          </div>

          <div className="grid lg:grid-cols-12 gap-5">
            <Card className="lg:col-span-6 p-5 space-y-3.5">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-(--color-ink) flex items-center gap-2">
                  <Wand2 className="w-4 h-4 text-emerald-700" />
                  <Bilingual
                    en="Customize Your 5-Part Excel Automation Prompt"
                    hi="अपना 5-पार्ट Excel ऑटोमेशन प्रॉम्प्ट तैयार करें"
                  />
                </h2>
                <div className="flex gap-1">
                  {(["Formula", "VBA Macro", "Power Query"] as const).map((m) => (
                    <ChipBtn key={m} active={mode === m} onClick={() => setMode(m)}>
                      {m}
                    </ChipBtn>
                  ))}
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3 text-xs">
                <label className="space-y-1">
                  <span className="font-semibold text-(--color-muted)">Workbook Name</span>
                  <input
                    value={workbook}
                    onChange={(e) => setWorkbook(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-(--color-border) font-mono text-xs focus:outline-none focus:border-(--color-accent)"
                  />
                </label>
                <label className="space-y-1">
                  <span className="font-semibold text-(--color-muted)">Sheet Name</span>
                  <input
                    value={sheet}
                    onChange={(e) => setSheet(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-(--color-border) font-mono text-xs focus:outline-none focus:border-(--color-accent)"
                  />
                </label>
                <label className="space-y-1">
                  <span className="font-semibold text-(--color-muted)">Data Range</span>
                  <input
                    value={range}
                    onChange={(e) => setRange(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-(--color-border) font-mono text-xs focus:outline-none focus:border-(--color-accent)"
                  />
                </label>
                <label className="space-y-1">
                  <span className="font-semibold text-(--color-muted)">Output Cell / Sheet</span>
                  <input
                    value={outputCell}
                    onChange={(e) => setOutputCell(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-(--color-border) font-mono text-xs focus:outline-none focus:border-(--color-accent)"
                  />
                </label>
              </div>

              <label className="block space-y-1 text-xs">
                <span className="font-semibold text-(--color-muted)">Columns Description</span>
                <input
                  value={columns}
                  onChange={(e) => setColumns(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-(--color-border) text-xs focus:outline-none focus:border-(--color-accent)"
                />
              </label>

              <label className="block space-y-1 text-xs">
                <span className="font-semibold text-(--color-muted)">Exact Requirement / Business Rule</span>
                <textarea
                  rows={3}
                  value={requirement}
                  onChange={(e) => setRequirement(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-(--color-border) text-xs focus:outline-none focus:border-(--color-accent)"
                />
              </label>
            </Card>

            <div className="lg:col-span-6 space-y-4">
              <Card className="p-5 bg-slate-900 text-white border-0">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                    ✨ Structured AI Prompt (Ready to Copy or Run)
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      className="!text-white hover:!bg-white/10 !py-1.5 !px-3 !text-xs"
                      onClick={() => copyText("prompt", generatedPrompt)}
                    >
                      {copiedKey === "prompt" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedKey === "prompt" ? "Copied!" : "Copy Prompt"}
                    </Button>
                    {onAskAarohi && (
                      <Button className="!py-1.5 !px-3 !text-xs" onClick={() => onAskAarohi(generatedPrompt)}>
                        <Bot className="w-3.5 h-3.5" />
                        <Bilingual en="Run in Aarohi AI" hi="Aarohi AI से बनवाएं" />
                      </Button>
                    )}
                  </div>
                </div>
                <p className="text-xs sm:text-sm font-mono text-slate-200 bg-slate-950/80 p-3.5 rounded-xl border border-white/10 leading-relaxed">
                  {generatedPrompt}
                </p>
              </Card>

              <Card className="p-5 border-emerald-200 bg-(--color-accent-soft)/50">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="font-bold text-sm text-emerald-950 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-700" />
                    <Bilingual
                      en={`Blueprint Reference Solution (${selectedPreset.titleEn})`}
                      hi={`रेडीमेड समाधान (${selectedPreset.titleHi})`}
                    />
                  </div>
                  <button
                    onClick={() => copyText("preset-code", selectedPreset.instantCode)}
                    className="text-xs font-semibold text-(--color-accent-dark) hover:underline inline-flex items-center gap-1"
                  >
                    {copiedKey === "preset-code" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    Copy Code
                  </button>
                </div>
                <pre className="text-xs font-mono bg-slate-900 text-emerald-300 p-3.5 rounded-xl overflow-x-auto leading-relaxed">
                  {selectedPreset.instantCode}
                </pre>
                <p className="text-xs text-(--color-accent-dark) mt-2.5 font-medium">💡 {selectedPreset.stepsHi}</p>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB 2: COLOR THEORY STUDIO ==================== */}
      {tab === "colors" && (
        <div className="space-y-5">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              {
                icon: "1️⃣",
                titleEn: "2–3 Main Shades Rule",
                titleHi: "सिर्फ 2–3 मुख्य रंग",
                descEn: "Stick to 1 primary header shade + 1 chart accent + neutral backgrounds.",
                descHi: "पूरी रिपोर्ट में 1 मुख्य ब्रांड रंग, 1 एक्सेंट और हल्का बैकग्राउंड रखें।",
              },
              {
                icon: "2️⃣",
                titleEn: "High Text Contrast",
                titleHi: "मज़बूत कंट्रास्ट",
                descEn: "Dark header (#1B4F72) needs crisp white text; light cells need dark charcoal text.",
                descHi: "गहरे हेडर पर सफेद बोल्ड अक्षर और हल्के सेल पर गहरे अक्षर रखें।",
              },
              {
                icon: "3️⃣",
                titleEn: "Purposeful Alerts Only",
                titleHi: "लाल/पीला सिर्फ अलर्ट के लिए",
                descEn: "Save bright Red & Amber strictly for KPI warnings or negative variances.",
                descHi: "चमकीला लाल और पीला रंग सिर्फ खतरे या कम स्टॉक दिखाने के लिए बचाकर रखें।",
              },
              {
                icon: "4️⃣",
                titleEn: "Color Wheel Harmonies",
                titleHi: "कलर व्हील सामंजस्य",
                descEn: "Complementary = opposite (Blue+Amber); Analogous = neighbors (Blue+Teal); Monochromatic = 1 hue.",
                descHi: "Complementary = आमने-सामने; Analogous = पड़ोसी रंग; Monochromatic = एक ही रंग के शेड्स।",
              },
            ].map((rule, i) => (
              <Card key={i} className="p-4">
                <div className="text-lg mb-1">{rule.icon}</div>
                <div className="font-bold text-sm text-(--color-ink)">
                  <Bilingual en={rule.titleEn} hi={rule.titleHi} />
                </div>
                <div className="text-xs text-(--color-muted) mt-1 leading-relaxed">
                  <Bilingual en={rule.descEn} hi={rule.descHi} />
                </div>
              </Card>
            ))}
          </div>

          <div className="grid lg:grid-cols-12 gap-5 items-start">
            {/* Palette Selector */}
            <div className="lg:col-span-5 space-y-2.5">
              {REPORT_PALETTES.map((pal) => (
                <button
                  key={pal.id}
                  onClick={() => setActivePalette(pal)}
                  className={`w-full text-left p-4 rounded-2xl border transition ${
                    activePalette.id === pal.id
                      ? "border-emerald-600 bg-(--color-accent-soft)/60 ring-2 ring-emerald-500/20"
                      : "border-(--color-border) bg-(--color-surface) hover:border-(--color-border-strong)"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <Pill tone="info">{pal.harmony}</Pill>
                    <div className="flex items-center gap-1.5">
                      {pal.swatches.map((s) => (
                        <span
                          key={s.hex}
                          className="w-5 h-5 rounded-md border border-(--color-border-strong) shadow-inner"
                          style={{ backgroundColor: s.hex }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="font-bold text-sm text-(--color-ink) mt-1.5">
                    <Bilingual en={pal.nameEn} hi={pal.nameHi} />
                  </div>
                  <div className="text-xs text-(--color-muted) mt-0.5">
                    <Bilingual en={pal.vibeEn} hi={pal.vibeHi} />
                  </div>
                </button>
              ))}
            </div>

            {/* Live Excel Report Preview */}
            <Card className="lg:col-span-7 p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Palette className="w-4 h-4 text-emerald-700" />
                  <span className="font-bold text-sm text-(--color-ink)">
                    <Bilingual
                      en="Live Excel Executive Report Preview (Click Swatch to Copy HEX/RGB)"
                      hi="लाइव Excel रिपोर्ट प्रीव्यू (रंग कॉपी करने के लिए नीचे क्लिक करें)"
                    />
                  </span>
                </div>
              </div>

              {/* Swatches copy bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {activePalette.swatches.map((sw) => (
                  <button
                    key={sw.role}
                    onClick={() => copyText(sw.hex, `${sw.hex} | ${sw.rgb}`)}
                    className="p-2.5 rounded-xl border border-(--color-border) bg-(--color-surface-2) hover:bg-(--color-accent-soft) text-left transition"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-6 h-6 rounded-lg border border-(--color-border-strong) shrink-0"
                        style={{ backgroundColor: sw.hex }}
                      />
                      <div className="min-w-0">
                        <div className="text-[11px] font-bold text-(--color-ink) truncate">{sw.role}</div>
                        <div className="text-[10px] font-mono text-(--color-muted)">
                          {copiedKey === sw.hex ? "✓ Copied!" : sw.hex}
                        </div>
                      </div>
                    </div>
                    <div className="text-[10px] font-mono text-(--color-muted) mt-1">{sw.rgb}</div>
                  </button>
                ))}
              </div>

              {/* Simulated Excel Sheet Canvas */}
              <div
                className="rounded-2xl border border-(--color-border) p-4 space-y-4 shadow-inner transition-colors"
                style={{ backgroundColor: activePalette.canvasBg, color: activePalette.bodyText }}
              >
                <div
                  className="rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-2"
                  style={{ backgroundColor: activePalette.headerBg, color: activePalette.headerText }}
                >
                  <div>
                    <div className="text-[10px] uppercase tracking-widest opacity-80">FY 2026-27 EXECUTIVE MIS</div>
                    <div className="font-extrabold text-base">Regional Revenue & Margin Summary</div>
                  </div>
                  <span
                    className="px-2.5 py-1 rounded-lg text-xs font-bold"
                    style={{ backgroundColor: activePalette.accentSoft, color: activePalette.headerBg }}
                  >
                    Harmony: {activePalette.harmony}
                  </span>
                </div>

                {/* KPI Strip */}
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { k: "Total Revenue", v: "₹48.6 L", sub: "+14.2% YoY" },
                    { k: "Net Profit", v: "₹11.4 L", sub: "23.4% Margin" },
                    { k: "Low-Stock Alerts", v: "2 SKUs", sub: "Action Needed", alert: true },
                  ].map((kpi) => (
                    <div
                      key={kpi.k}
                      className="rounded-xl p-3 border border-(--color-border)/80"
                      style={{ backgroundColor: kpi.alert ? "#FEF2F2" : activePalette.zebraBg }}
                    >
                      <div className="text-[11px] opacity-75">{kpi.k}</div>
                      <div
                        className="text-lg font-extrabold mt-0.5"
                        style={{ color: kpi.alert ? "#DC2626" : activePalette.headerBg }}
                      >
                        {kpi.v}
                      </div>
                      <div className="text-[10px] font-semibold opacity-80">{kpi.sub}</div>
                    </div>
                  ))}
                </div>

                {/* Styled Excel Table */}
                <div className="overflow-x-auto rounded-xl border border-(--color-border)">
                  <table className="w-full text-xs">
                    <thead>
                      <tr style={{ backgroundColor: activePalette.headerBg, color: activePalette.headerText }}>
                        <th className="text-left px-3 py-2">Region</th>
                        <th className="text-right px-3 py-2">Target</th>
                        <th className="text-right px-3 py-2">Actual</th>
                        <th className="text-left px-3 py-2 w-36">Achievement Bar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { r: "West (Surat & Mumbai)", t: "₹18.0 L", a: "₹20.4 L", pct: 95 },
                        { r: "North (Delhi NCR)", t: "₹14.0 L", a: "₹14.8 L", pct: 82 },
                        { r: "South (Bengaluru)", t: "₹12.0 L", a: "₹13.4 L", pct: 88 },
                      ].map((row, idx) => (
                        <tr
                          key={row.r}
                          style={{ backgroundColor: idx % 2 === 1 ? activePalette.zebraBg : activePalette.canvasBg }}
                        >
                          <td className="px-3 py-2 font-semibold">{row.r}</td>
                          <td className="px-3 py-2 text-right font-mono">{row.t}</td>
                          <td className="px-3 py-2 text-right font-mono font-bold">{row.a}</td>
                          <td className="px-3 py-2">
                            <div className="h-2.5 rounded-full bg-slate-200 overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{ width: `${row.pct}%`, backgroundColor: activePalette.accent }}
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ==================== TAB 3: ALL 12 EXCEL ERRORS DOCTOR ==================== */}
      {tab === "errors" && (
        <div className="grid lg:grid-cols-12 gap-5 items-start">
          <div className="lg:col-span-5 grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {ALL_12_ERRORS.map((err) => (
              <button
                key={err.code}
                onClick={() => setActiveError(err)}
                className={`p-3.5 rounded-2xl border text-left transition ${
                  activeError.code === err.code
                    ? "border-rose-600 bg-rose-50 shadow-sm ring-2 ring-rose-500/20"
                    : "border-(--color-border) bg-(--color-surface) hover:border-(--color-danger)"
                }`}
              >
                <div className="font-mono font-extrabold text-sm text-rose-700">{err.code}</div>
                <div className="text-[11px] font-semibold text-(--color-ink) mt-1 line-clamp-2">
                  {t(err.meaningEn, err.meaningHi)}
                </div>
                <div className="mt-1.5">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-(--color-surface-2) text-(--color-muted) font-medium">
                    {err.category}
                  </span>
                </div>
              </button>
            ))}
          </div>

          <Card className="lg:col-span-7 p-6 space-y-4 border-rose-200">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="px-3.5 py-2 rounded-xl bg-rose-100 text-rose-800 font-mono font-black text-xl">
                  {activeError.code}
                </div>
                <div>
                  <Pill tone="warn">{activeError.category}</Pill>
                  <h2 className="font-extrabold text-lg text-(--color-ink) mt-0.5">
                    <Bilingual en={activeError.meaningEn} hi={activeError.meaningHi} />
                  </h2>
                </div>
              </div>
              {onAskAarohi && (
                <Button
                  variant="secondary"
                  className="!py-1.5 !px-3 !text-xs"
                  onClick={() =>
                    onAskAarohi(`Explain Excel error ${activeError.code} with a real office example and how to fix it in Hindi and English.`)
                  }
                >
                  <Bot className="w-3.5 h-3.5" />
                  <Bilingual en="Ask Aarohi" hi="Aarohi से पूछें" />
                </Button>
              )}
            </div>

            <div className="p-4 rounded-xl bg-rose-50/80 border border-rose-200">
              <div className="text-xs font-bold uppercase tracking-wider text-rose-800 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                <Bilingual en="Broken Formula / Trigger" hi="गलत फॉर्मूला / कारण" />
              </div>
              <code className="block font-mono text-sm text-rose-950 mt-1.5 font-semibold">
                {activeError.brokenFormula}
              </code>
              <div className="text-xs text-(--color-ink) mt-2 leading-relaxed">
                <Bilingual en={activeError.whyEn} hi={activeError.whyHi} />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-(--color-accent-soft) border border-emerald-200">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-bold uppercase tracking-wider text-(--color-accent-dark) flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-emerald-700" />
                  <Bilingual en="Exact Fix / Safe Formula" hi="सही और सुरक्षित फॉर्मूला" />
                </div>
                <button
                  onClick={() => copyText("err-fix", activeError.fixedFormula)}
                  className="text-xs font-bold text-(--color-accent-dark) hover:underline inline-flex items-center gap-1"
                >
                  {copiedKey === "err-fix" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedKey === "err-fix" ? "Copied" : "Copy Fix"}
                </button>
              </div>
              <code className="block font-mono text-sm text-emerald-950 mt-1.5 font-bold">
                {activeError.fixedFormula}
              </code>
              <p className="text-xs text-(--color-accent-dark) mt-2 font-medium">🩺 {activeError.stepsHi}</p>
            </div>
          </Card>
        </div>
      )}

      {/* ==================== TAB 4: 400-SHORTCUT SPEED TRAINER ==================== */}
      {tab === "trainer" && (
        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <Keyboard className="w-5 h-5 text-emerald-700" />
                <div>
                  <h2 className="font-extrabold text-base text-(--color-ink)">
                    <Bilingual
                      en={`400 Excel Shortcut Keys — Speed Flashcard Trainer (${SHORTCUTS.length} Keys)`}
                      hi={`400 Excel शॉर्टकट्स — स्पीड प्रैक्टिस गेम (${SHORTCUTS.length} शॉर्टकट्स)`}
                    />
                  </h2>
                  <div className="text-xs text-(--color-muted)">
                    <Bilingual
                      en="Pick the right keyboard shortcut to build muscle memory and boost your streak!"
                      hi="सही शॉर्टकट चुनें और अपनी ऑफिस स्पीड 5 गुना बढ़ाएं!"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Pill tone="good">Score: {score}</Pill>
                <Pill tone="warn">🔥 Streak: {streak}</Pill>
                <div className="flex rounded-lg border border-(--color-border) overflow-hidden text-xs font-bold">
                  <button
                    onClick={() => {
                      setOsMode("win");
                      setPickedOpt(null);
                    }}
                    className={`px-2.5 py-1 ${osMode === "win" ? "bg-(--color-accent) text-white" : "bg-(--color-surface) text-(--color-muted)"}`}
                  >
                    Windows
                  </button>
                  <button
                    onClick={() => {
                      setOsMode("mac");
                      setPickedOpt(null);
                    }}
                    className={`px-2.5 py-1 ${osMode === "mac" ? "bg-(--color-accent) text-white" : "bg-(--color-surface) text-(--color-muted)"}`}
                  >
                    Mac
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 mb-5">
              <ChipBtn
                active={trainerCat === "All"}
                onClick={() => {
                  setTrainerCat("All");
                  setPickedOpt(null);
                }}
              >
                All ({SHORTCUTS.length})
              </ChipBtn>
              {SHORTCUT_CATS.map((cat) => (
                <ChipBtn
                  key={cat}
                  active={trainerCat === cat}
                  onClick={() => {
                    setTrainerCat(cat);
                    setPickedOpt(null);
                  }}
                >
                  {shortcutCatLabel(cat)}
                </ChipBtn>
              ))}
            </div>

            <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-emerald-950 text-white text-center space-y-4">
              <span className="inline-block text-[11px] uppercase tracking-widest px-3 py-0.5 rounded-full bg-white/10 text-emerald-300">
                Category: {shortcutCatLabel(currentQuestion.item.cat)} ({osMode === "win" ? "Windows" : "Mac"})
              </span>
              <div className="text-lg sm:text-2xl font-extrabold max-w-xl mx-auto">
                “{currentQuestion.item.desc}”
              </div>

              <div className="grid sm:grid-cols-2 gap-3 max-w-xl mx-auto pt-2">
                {currentQuestion.options.map((opt) => {
                  const isCorrect = opt === currentQuestion.rightKey;
                  const isChosen = pickedOpt === opt;
                  let cls = "bg-white/10 hover:bg-white/20 border-white/15 text-white";
                  if (pickedOpt) {
                    if (isCorrect) cls = "bg-emerald-500 border-(--color-accent) text-slate-950 font-black";
                    else if (isChosen) cls = "bg-rose-600 border-rose-400 text-white";
                    else cls = "bg-white/5 border-white/10 text-white/50";
                  }
                  return (
                    <button
                      key={opt}
                      onClick={() => answerTrainer(opt)}
                      className={`px-4 py-3 rounded-xl border font-mono text-sm font-bold transition ${cls}`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>

              {pickedOpt && (
                <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                  <span className="text-xs sm:text-sm font-semibold text-emerald-200">
                    {pickedOpt === currentQuestion.rightKey
                      ? "✅ Shabash! +10 Points!"
                      : `💡 Sahi jawab: ${currentQuestion.rightKey}`}
                  </span>
                  <Button className="!py-1.5 !px-3 !text-xs" onClick={nextTrainerQ}>
                    <RotateCcw className="w-3.5 h-3.5" />
                    <Bilingual en="Next Shortcut →" hi="अगला शॉर्टकट →" />
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* ==================== TAB 5: MIS INTERVIEW Q&A ==================== */}
      {tab === "interview" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1.5">
              {["All", "Lookups", "Cleaning", "Pivot & MIS", "Accounts & GST", "Power Query & VBA"].map((c) => (
                <ChipBtn key={c} active={qaCat === c} onClick={() => setQaCat(c)}>
                  {c}
                </ChipBtn>
              ))}
            </div>
            <Pill tone="info">
              <Briefcase className="w-3 h-3 inline mr-1" />
              {filteredQA.length} Corporate Viva Questions
            </Pill>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {filteredQA.map((item, idx) => (
              <Card key={idx} className="p-5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <Pill tone="good">{item.cat}</Pill>
                  <span className="text-[11px] text-slate-400 font-semibold">HR / MIS Round</span>
                </div>
                <h3 className="font-extrabold text-sm sm:text-base text-(--color-ink)">
                  <Bilingual en={item.qEn} hi={item.qHi} compact />
                </h3>
                <div className="p-3.5 rounded-xl bg-(--color-accent-soft)/70 border border-emerald-200/70 text-xs text-(--color-ink) leading-relaxed">
                  <Bilingual en={item.aEn} hi={item.aHi} compact />
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
