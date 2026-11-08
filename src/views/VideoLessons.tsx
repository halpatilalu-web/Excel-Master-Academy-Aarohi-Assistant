import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  FastForward,
  Image as ImageIcon,
  Pause,
  Play,
  RotateCcw,
  SkipBack,
  SkipForward,
  Video,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { AI_GALLERY } from "../data/diplomaModules";
import { canSpeak, speak, stopSpeaking } from "../lib/assistant";
import { Bilingual, LangSwitcher, useLang } from "../lib/lang";
import { Button, Card, Pill } from "../components/ui";

export type VideoId =
  | "vid-basic"
  | "vid-cleaning"
  | "vid-cond-val"
  | "vid-logic"
  | "vid-xlookup"
  | "vid-dashboard"
  | "vid-powerquery"
  | "vid-vba";

interface VideoScene {
  stepTitle: string;
  activeCell: string;
  formulaBar: string;
  captionEn: string;
  captionHi: string;
  headers: string[];
  rows: { cells: string[]; highlightCols?: number[]; badge?: string }[];
}

interface VideoLesson {
  id: VideoId;
  emoji: string;
  moduleCode: string;
  duration: string;
  chapterRef: number;
  thumbnail: string;
  titleEn: string;
  titleHi: string;
  scenes: VideoScene[];
}

export const VIDEO_LESSONS: VideoLesson[] = [
  {
    id: "vid-basic",
    emoji: "🟢",
    moduleCode: "MOD 01",
    duration: "04:20",
    chapterRef: 6,
    thumbnail: "/ai-gallery/basic-excel-grid.jpg",
    titleEn: "Basic Excel Formulas & $A$1 Locking Masterclass",
    titleHi: "Basic Formulas (SUM, AVG) aur $A$1 Cell Lock",
    scenes: [
      {
        stepTitle: "Step 1: Raw Invoice Table",
        activeCell: "D2",
        formulaBar: "=B2*C2",
        captionEn: "Start with Item, Qty (Col B), and Unit Price (Col C). In D2, multiply =B2*C2 to get Amount.",
        captionHi: "Sabse pehle Qty (B2) aur Price (C2) ko guna karne ke liye D2 mein =B2*C2 likho.",
        headers: ["A: Item", "B: Qty", "C: Price", "D: Amount", "E: GST (18%)"],
        rows: [
          { cells: ["Laptop", "2", "45000", "90,000", "—"], highlightCols: [1, 2, 3], badge: "Active" },
          { cells: ["Mouse", "5", "600", "—", "—"] },
          { cells: ["Tax Rate (G1)", "18%", "", "", ""] },
        ],
      },
      {
        stepTitle: "Step 2: Lock Tax Cell with F4 ($B$4)",
        activeCell: "E2",
        formulaBar: "=D2*$B$4",
        captionEn: "Press F4 on the 18% tax cell so $B$4 stays locked when we drag the formula down!",
        captionHi: "18% tax wale cell par F4 dabao taaki $B$4 lock ho jaye aur drag karne par khiske nahi!",
        headers: ["A: Item", "B: Qty", "C: Price", "D: Amount", "E: GST (18%)"],
        rows: [
          { cells: ["Laptop", "2", "45000", "90,000", "16,200"], highlightCols: [3, 4], badge: "Locked 🔒" },
          { cells: ["Mouse", "5", "600", "3,000", "540"], highlightCols: [3, 4] },
          { cells: ["Tax Rate", "18% ($B$4)", "", "", ""], highlightCols: [1] },
        ],
      },
      {
        stepTitle: "Step 3: Instant Grand Total with Alt + =",
        activeCell: "D5",
        formulaBar: "=SUM(D2:D3)",
        captionEn: "Click below the Amount column and press Alt + '=' to insert =SUM() automatically!",
        captionHi: "Amount ke neeche click karke Alt + '=' dabao — Excel khud =SUM() laga dega!",
        headers: ["A: Item", "B: Qty", "C: Price", "D: Amount", "E: GST (18%)"],
        rows: [
          { cells: ["Laptop", "2", "45000", "90,000", "16,200"] },
          { cells: ["Mouse", "5", "600", "3,000", "540"] },
          { cells: ["TOTAL", "7", "—", "₹93,000", "₹16,740"], highlightCols: [0, 3, 4], badge: "AutoSum ✨" },
        ],
      },
    ],
  },
  {
    id: "vid-cleaning",
    emoji: "🧹",
    moduleCode: "MOD 02",
    duration: "05:10",
    chapterRef: 33,
    thumbnail: "/ai-gallery/data-cleaning.jpg",
    titleEn: "Dirty-to-Clean Data: TRIM, PROPER & TEXTSPLIT",
    titleHi: "Data Cleaning: Gande Office Data ko Chamkao",
    scenes: [
      {
        stepTitle: "Step 1: Spot Dirty Spaces & Casing",
        activeCell: "A2",
        formulaBar: "   ravi   KUMAR  ",
        captionEn: "Notice messy leading spaces and inconsistent uppercase/lowercase letters in raw CRM data.",
        captionHi: "Dekho raw data mein naam ke aage-peeche kitne faltu space aur ulte-seedhe capital letters hain.",
        headers: ["A: Raw Name", "B: Clean Name", "C: City|Pin", "D: Pin Code"],
        rows: [
          { cells: ['"   ravi   KUMAR "', "—", "Surat|395007", "—"], highlightCols: [0], badge: "Dirty ⚠️" },
          { cells: ['" NEHA  sharma  "', "—", "Pune|411001", "—"], highlightCols: [0] },
        ],
      },
      {
        stepTitle: "Step 2: Apply =PROPER(TRIM(CLEAN(A2)))",
        activeCell: "B2",
        formulaBar: "=PROPER(TRIM(CLEAN(A2)))",
        captionEn: "CLEAN removes hidden breaks, TRIM strips extra spaces, and PROPER fixes Title Case!",
        captionHi: "CLEAN kachra hatata hai, TRIM extra space mita deta hai aur PROPER pehla akshar bada karta hai!",
        headers: ["A: Raw Name", "B: Clean Name", "C: City|Pin", "D: Pin Code"],
        rows: [
          { cells: ['"   ravi   KUMAR "', "Ravi Kumar", "Surat|395007", "—"], highlightCols: [1], badge: "Clean ✅" },
          { cells: ['" NEHA  sharma  "', "Neha Sharma", "Pune|411001", "—"], highlightCols: [1] },
        ],
      },
      {
        stepTitle: "Step 3: Extract PIN with RIGHT / TEXTAFTER",
        activeCell: "D2",
        formulaBar: '=RIGHT(C2, 6)',
        captionEn: "Use =RIGHT(C2,6) or =TEXTAFTER(C2,\"|\") to pull the 6-digit PIN code cleanly.",
        captionHi: "=RIGHT(C2,6) ya =TEXTAFTER(C2,\"|\") se 6-ankon ka PIN code turant alag nikal aata hai!",
        headers: ["A: Raw Name", "B: Clean Name", "C: City|Pin", "D: Pin Code"],
        rows: [
          { cells: ['"   ravi   KUMAR "', "Ravi Kumar", "Surat|395007", "395007"], highlightCols: [2, 3], badge: "Extracted 🎯" },
          { cells: ['" NEHA  sharma  "', "Neha Sharma", "Pune|411001", "411001"], highlightCols: [2, 3] },
        ],
      },
    ],
  },
  {
    id: "vid-cond-val",
    emoji: "🎨",
    moduleCode: "MOD 03",
    duration: "04:45",
    chapterRef: 34,
    thumbnail: "/ai-gallery/conditional-validation.jpg",
    titleEn: "Conditional Formatting Row Rules & Dropdowns",
    titleHi: "Conditional Formatting Row Highlight aur Dropdown",
    scenes: [
      {
        stepTitle: "Step 1: Add Status Dropdown (Data Validation)",
        activeCell: "D2",
        formulaBar: "Data Validation → Allow: List → Paid, Overdue, Pending",
        captionEn: "Select D2:D10 → Data Validation → List so nobody types spelling errors in Status.",
        captionHi: "D2:D10 mein List dropdown lagao taaki Status mein koi galat spelling type hi na kar sake.",
        headers: ["A: Invoice", "B: Client", "C: Amount", "D: Status ▼"],
        rows: [
          { cells: ["INV-101", "Apex Co", "₹42,000", "Paid ▼"], highlightCols: [3], badge: "Dropdown 📋" },
          { cells: ["INV-102", "Zenith", "₹85,000", "Overdue ▼"], highlightCols: [3] },
          { cells: ["INV-103", "Metro", "₹19,000", "Pending ▼"], highlightCols: [3] },
        ],
      },
      {
        stepTitle: "Step 2: Highlight Entire Overdue Row (=$D2=\"Overdue\")",
        activeCell: "A2:D4",
        formulaBar: '=$D2="Overdue"',
        captionEn: "Lock column D with '$' (=$D2=\"Overdue\") so the WHOLE row lights up when Status is Overdue!",
        captionHi: "Column D ke aage $ lagao (=$D2=\"Overdue\") — ab Overdue hote hi poori row laal chamkegi!",
        headers: ["A: Invoice", "B: Client", "C: Amount", "D: Status ▼"],
        rows: [
          { cells: ["INV-101", "Apex Co", "₹42,000", "Paid"] },
          { cells: ["INV-102", "Zenith", "₹85,000", "Overdue 🚨"], highlightCols: [0, 1, 2, 3], badge: "Full Row Alert" },
          { cells: ["INV-103", "Metro", "₹19,000", "Pending"] },
        ],
      },
    ],
  },
  {
    id: "vid-logic",
    emoji: "🧮",
    moduleCode: "MOD 04",
    duration: "05:30",
    chapterRef: 15,
    thumbnail: "/ai-gallery/diploma-hero.jpg",
    titleEn: "IFS Grading & Multi-Condition SUMIFS",
    titleHi: "IFS se Grade aur SUMIFS se Shart wala Total",
    scenes: [
      {
        stepTitle: "Step 1: Multi-Tier Grade with =IFS()",
        activeCell: "C2",
        formulaBar: '=IFS(B2>=80,"A", B2>=60,"B", B2>=33,"C", TRUE,"F")',
        captionEn: "IFS checks top-down from highest threshold (80) to lowest without messy nested brackets!",
        captionHi: "IFS bina uljhe hue brackets ke upar se neeche (80 → 60 → 33) check karke Grade deta hai!",
        headers: ["A: Student", "B: Marks", "C: Grade", "D: City"],
        rows: [
          { cells: ["Aarav", "86", "A 🏆", "Delhi"], highlightCols: [1, 2], badge: ">=80 → A" },
          { cells: ["Meera", "68", "B", "Mumbai"], highlightCols: [1, 2] },
          { cells: ["Kabir", "29", "F", "Delhi"], highlightCols: [1, 2] },
        ],
      },
      {
        stepTitle: "Step 2: Conditional Sum with =SUMIFS()",
        activeCell: "F2",
        formulaBar: '=SUMIFS(B2:B4, D2:D4, "Delhi", B2:B4, ">=33")',
        captionEn: "Remember: in SUMIFS, the column to add (B2:B4) ALWAYS comes FIRST!",
        captionHi: "Yaad rakho: SUMIFS mein jodne wala column (B2:B4) hamesha SABSE PEHLE likha jata hai!",
        headers: ["Filter 1", "Filter 2", "Matching Rows", "SUMIFS Result"],
        rows: [
          { cells: ["City = Delhi", "Marks >= 33", "Aarav (86)", "86"], highlightCols: [0, 1, 2, 3], badge: "Matched ✓" },
        ],
      },
    ],
  },
  {
    id: "vid-xlookup",
    emoji: "🔎",
    moduleCode: "MOD 05",
    duration: "06:15",
    chapterRef: 19,
    thumbnail: "/ai-gallery/formulas-lookup.jpg",
    titleEn: "VLOOKUP vs XLOOKUP & Two-Way INDEX-MATCH",
    titleHi: "VLOOKUP, XLOOKUP aur 2-Way INDEX-MATCH Live",
    scenes: [
      {
        stepTitle: "Step 1: Modern XLOOKUP in Action",
        activeCell: "G2",
        formulaBar: '=XLOOKUP(F2, B2:B4, D2:D4, "ID Not Found")',
        captionEn: "Select Lookup ID (F2), ID Column (B2:B4), and Return Column (D2:D4) — clean and unbreakable!",
        captionHi: "Sirf ID chuno, ID column chuno aur Salary column chuno — column ginne ki jhanjhat khatam!",
        headers: ["A: Dept", "B: EmpID", "C: Name", "D: Salary"],
        rows: [
          { cells: ["Sales", "E101", "Aarav", "₹48,000"] },
          { cells: ["Finance", "E102", "Diya", "₹72,000"], highlightCols: [1, 3], badge: "Found ₹72,000!" },
          { cells: ["IT", "E103", "Rohan", "₹65,000"] },
        ],
      },
      {
        stepTitle: "Step 2: Left-Lookup Superpower!",
        activeCell: "H2",
        formulaBar: '=XLOOKUP("E102", B2:B4, A2:A4)',
        captionEn: "Need Dept (Col A) located LEFT of EmpID (Col B)? VLOOKUP fails, XLOOKUP returns 'Finance'!",
        captionHi: "EmpID ke left side se Dept nikalna hai? VLOOKUP fail hoga par XLOOKUP turant 'Finance' dega!",
        headers: ["A: Dept (Return ⬅️)", "B: EmpID (Lookup)", "C: Name", "Result"],
        rows: [
          { cells: ["Finance", "E102", "Diya", "Finance ✅"], highlightCols: [0, 1, 3], badge: "Left Lookup!" },
        ],
      },
    ],
  },
  {
    id: "vid-dashboard",
    emoji: "📊",
    moduleCode: "MOD 06",
    duration: "06:40",
    chapterRef: 29,
    thumbnail: "/ai-gallery/pivot-dashboard.jpg",
    titleEn: "Pivot Tables, Slicers & Executive Dashboard",
    titleHi: "Pivot Table, Slicer aur 1-Page MIS Dashboard",
    scenes: [
      {
        stepTitle: "Step 1: Format as Excel Table (Ctrl + T)",
        activeCell: "tblSales",
        formulaBar: "Ctrl + T → Table Name: tblSales",
        captionEn: "Always press Ctrl+T first so future rows added at the bottom automatically feed your Pivot!",
        captionHi: "Pivot banane se pehle data ko Ctrl+T Table banao taaki naya data judte hi Pivot badh jaye!",
        headers: ["Date", "Region", "Category", "Revenue"],
        rows: [
          { cells: ["2026-10-05", "West", "Tech", "₹1,25,000"], highlightCols: [0, 1, 2, 3], badge: "tblSales" },
          { cells: ["2026-10-12", "North", "Office", "₹84,000"], highlightCols: [0, 1, 2, 3] },
        ],
      },
      {
        stepTitle: "Step 2: Build Pivot + Connect Slicers",
        activeCell: "Dashboard!B4",
        formulaBar: "Slicer → Right-Click → Report Connections → Check All Pivots",
        captionEn: "Link one Region Slicer to all 3 Pivot Charts — now 1 click updates the whole dashboard!",
        captionHi: "Report Connections se 1 Slicer ko saare charts se jodo — ab 1 click mein poora dashboard badlega!",
        headers: ["KPI: Revenue", "KPI: Margin", "Active Slicer", "Live Chart"],
        rows: [
          { cells: ["₹9,85,000", "24.6%", "Region: West ✓", "Combo + Donut Updated"], highlightCols: [0, 1, 2, 3], badge: "Live MIS 🚀" },
        ],
      },
    ],
  },
  {
    id: "vid-powerquery",
    emoji: "⚙️",
    moduleCode: "MOD 07",
    duration: "05:50",
    chapterRef: 37,
    thumbnail: "/ai-gallery/power-query-etl.jpg",
    titleEn: "Power Query: Unpivot Columns & Folder Combine",
    titleHi: "Power Query: Unpivot aur 50 Files 1-Click Combine",
    scenes: [
      {
        stepTitle: "Step 1: Wide Crosstab Problem",
        activeCell: "PowerQuery",
        formulaBar: "Data → From Table/Range → Power Query Editor",
        captionEn: "Wide tables with Jan, Feb, Mar across columns break Pivot Tables. Load into Power Query!",
        captionHi: "Jab Jan, Feb, Mar alag columns mein hon to Pivot sahi nahi banta — Power Query kholo!",
        headers: ["Product", "Jan", "Feb", "Mar"],
        rows: [
          { cells: ["Laptop", "120", "150", "180"], highlightCols: [1, 2, 3], badge: "Wide Format" },
        ],
      },
      {
        stepTitle: "Step 2: Unpivot Other Columns → Close & Load",
        activeCell: "tblClean",
        formulaBar: "Right-Click [Product] → Unpivot Other Columns",
        captionEn: "Boom! Wide columns turn into clean 'Month | Sales' rows ready for any Pivot or Chart!",
        captionHi: "Kamaal! Saare mahine seedhi 'Month | Sales' rows mein aa gaye — agle mahine sirf Refresh dabao!",
        headers: ["Product", "Month", "Sales"],
        rows: [
          { cells: ["Laptop", "Jan", "120"], highlightCols: [0, 1, 2], badge: "Tall Clean ✓" },
          { cells: ["Laptop", "Feb", "150"], highlightCols: [0, 1, 2] },
          { cells: ["Laptop", "Mar", "180"], highlightCols: [0, 1, 2] },
        ],
      },
    ],
  },
  {
    id: "vid-vba",
    emoji: "🤖",
    moduleCode: "MOD 08",
    duration: "05:40",
    chapterRef: 39,
    thumbnail: "/ai-gallery/vba-macros.jpg",
    titleEn: "VBA Macros: Loops & One-Click PDF Report",
    titleHi: "VBA Macro: 1-Click PDF Report aur Automation",
    scenes: [
      {
        stepTitle: "Step 1: Open VBA Editor (Alt + F11)",
        activeCell: "Module1",
        formulaBar: "Sub ExportDashboardPDF() ... End Sub",
        captionEn: "Press Alt+F11 → Insert Module, and write a 3-line Sub to export your Dashboard as PDF.",
        captionHi: "Alt+F11 daba kar Module jodo aur 3 line ka VBA code likho jo sheet ko PDF bana de.",
        headers: ["VBA Step", "Code Line", "Action"],
        rows: [
          { cells: ["1", 'Sheets("Dashboard").Select', "Focus dashboard sheet"], highlightCols: [1] },
          { cells: ["2", "ActiveSheet.ExportAsFixedFormat xlTypePDF", "Generate crisp PDF"], highlightCols: [1], badge: "Auto PDF 📄" },
          { cells: ["3", 'MsgBox "PDF Saved!"', "Show confirmation"], highlightCols: [1] },
        ],
      },
      {
        stepTitle: "Step 2: Assign to Button & Save as .xlsm",
        activeCell: "Dashboard",
        formulaBar: "Right-Click Button → Assign Macro → Save as Report.xlsm",
        captionEn: "Link your macro to a button on the Dashboard and save as .xlsm so anyone can click & export!",
        captionHi: "Sheet par ek sundar button bana kar Macro link karo aur .xlsm mein save karo!",
        headers: ["Workbook File", "Button Clicked", "Output Created"],
        rows: [
          { cells: ["Sales_MIS.xlsm", "[ 📄 Export PDF ]", "Executive_Report_Nov2026.pdf ✅"], highlightCols: [0, 1, 2], badge: "Done in 0.4s ⚡" },
        ],
      },
    ],
  },
];

export function VideoLessons({
  initialVideo = "vid-basic",
  onGoChapter,
}: {
  initialVideo?: VideoId;
  onGoChapter?: (chapter: number) => void;
}) {
  const { lang } = useLang();
  const [tab, setTab] = useState<"videos" | "gallery">("videos");
  const [selectedId, setSelectedId] = useState<VideoId>(initialVideo);
  const [sceneIdx, setSceneIdx] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState<1 | 1.5 | 0.75>(1);
  const [narrate, setNarrate] = useState(false);
  const [typedLen, setTypedLen] = useState(0);
  const [zoomedImg, setZoomedImg] = useState<(typeof AI_GALLERY)[number] | null>(null);

  useEffect(() => {
    setSelectedId(initialVideo);
    setSceneIdx(0);
  }, [initialVideo]);

  const video = VIDEO_LESSONS.find((v) => v.id === selectedId) ?? VIDEO_LESSONS[0];
  const scene = video.scenes[sceneIdx] ?? video.scenes[0];

  // Formula bar typing animation
  useEffect(() => {
    setTypedLen(0);
    const full = scene.formulaBar;
    const stepMs = Math.max(18, Math.round(35 / speed));
    const timer = setInterval(() => {
      setTypedLen((n) => {
        if (n >= full.length) {
          clearInterval(timer);
          return full.length;
        }
        return n + 1;
      });
    }, stepMs);
    return () => clearInterval(timer);
  }, [scene.formulaBar, selectedId, sceneIdx, speed]);

  // Optional voice narration when scene changes
  useEffect(() => {
    if (!narrate || !canSpeak) return;
    const text = lang === "en" ? scene.captionEn : scene.captionHi;
    speak(text, lang === "en" ? "en-IN" : "hi-IN");
    return () => stopSpeaking();
  }, [narrate, scene, lang]);

  // Auto-advance scenes while playing
  useEffect(() => {
    if (!playing || tab !== "videos") return;
    const ms = Math.round(5200 / speed);
    const id = setTimeout(() => {
      setSceneIdx((cur) => (cur + 1) % video.scenes.length);
    }, ms);
    return () => clearTimeout(id);
  }, [playing, sceneIdx, video.scenes.length, speed, tab]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-(--color-accent-soft) text-(--color-accent-dark)">
            🎬 Multimedia Learning Center
          </span>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold mt-2">
            Video Lessons & AI Excel Visuals 🎥✨
          </h1>
          <p className="text-sm text-(--color-muted) mt-1">
            Step-by-step animated Excel screen walkthroughs with voiceover + custom AI-generated 3D illustrations.
          </p>
        </div>
        <LangSwitcher />
      </div>

      {/* Mode Switcher */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setTab("videos")}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition ${
            tab === "videos"
              ? "bg-(--color-accent) text-white shadow-sm"
              : "bg-(--color-surface) neu-btn text-(--color-muted)"
          }`}
        >
          <Video size={16} /> Animated Video Lessons ({VIDEO_LESSONS.length})
        </button>
        <button
          type="button"
          onClick={() => {
            setPlaying(false);
            stopSpeaking();
            setTab("gallery");
          }}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition ${
            tab === "gallery"
              ? "bg-(--color-accent) text-white shadow-sm"
              : "bg-(--color-surface) neu-btn text-(--color-muted)"
          }`}
        >
          <ImageIcon size={16} /> AI-Generated Excel Visuals ({AI_GALLERY.length})
        </button>
      </div>

      {tab === "videos" ? (
        <div className="grid lg:grid-cols-3 gap-5">
          {/* Cinema Player Column */}
          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-2xl overflow-hidden neu-btn bg-slate-950 text-white shadow-xl">
              {/* Simulated Excel Window Title Bar */}
              <div className="px-4 py-2.5 bg-emerald-900/90 border-b border-emerald-700/60 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="flex gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-300" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  </span>
                  <span className="font-bold truncate">
                    {video.emoji} {video.titleEn} — {scene.stepTitle}
                  </span>
                </div>
                <span className="font-mono text-emerald-200 shrink-0">
                  Scene {sceneIdx + 1}/{video.scenes.length} · {video.duration}
                </span>
              </div>

              {/* Excel Formula Bar Simulation */}
              <div className="px-3 py-2 bg-slate-900 border-b border-slate-800 flex items-center gap-2 text-xs font-mono">
                <span className="px-2.5 py-1 rounded bg-slate-800 text-emerald-300 font-bold border border-slate-700">
                  {scene.activeCell}
                </span>
                <span className="text-emerald-400 font-extrabold italic px-1">fx</span>
                <div className="flex-1 bg-slate-950 border border-emerald-500/40 rounded px-3 py-1 text-emerald-200 overflow-x-auto whitespace-nowrap">
                  {scene.formulaBar.slice(0, typedLen)}
                  <span className="animate-pulse text-emerald-400">|</span>
                </div>
              </div>

              {/* Animated Excel Grid Stage */}
              <div className="p-4 sm:p-5 min-h-[250px] flex flex-col justify-between bg-gradient-to-b from-slate-950 to-slate-900">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`${video.id}-${sceneIdx}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-x-auto rounded-xl border border-slate-700 bg-slate-900/90"
                  >
                    <table className="w-full text-xs sm:text-sm border-collapse">
                      <thead>
                        <tr className="bg-slate-800 text-slate-200">
                          <th className="w-8 px-2 py-2 border-r border-slate-700 text-center text-slate-400">
                            #
                          </th>
                          {scene.headers.map((h) => (
                            <th
                              key={h}
                              className="px-3 py-2 text-left font-bold border-r border-slate-700 last:border-r-0"
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {scene.rows.map((r, ri) => (
                          <tr key={ri} className="border-t border-slate-800">
                            <td className="px-2 py-2.5 text-center font-mono text-xs text-slate-400 bg-slate-800/60 border-r border-slate-700">
                              {ri + 2}
                            </td>
                            {r.cells.map((cell, ci) => {
                              const hi = r.highlightCols?.includes(ci);
                              return (
                                <td
                                  key={ci}
                                  className={`px-3 py-2.5 border-r border-slate-800 last:border-r-0 font-mono transition-all ${
                                    hi
                                      ? "bg-(--color-accent)/20 text-white font-bold ring-1 ring-inset ring-(--color-accent-soft)"
                                      : "text-slate-200"
                                  }`}
                                >
                                  <span>{cell}</span>
                                  {hi && ci === r.cells.length - 1 && r.badge && (
                                    <span className="ml-2 inline-block rounded-full bg-emerald-400 text-slate-950 px-2 py-0.5 text-[10px] font-extrabold">
                                      {r.badge}
                                    </span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </motion.div>
                </AnimatePresence>

                {/* Bilingual Subtitle Box inside Player */}
                <div className="mt-4 rounded-xl bg-black/65 border border-white/15 px-4 py-3 text-xs sm:text-sm space-y-1">
                  {(lang === "both" || lang === "en") && (
                    <p className="text-white font-medium">🇬🇧 {scene.captionEn}</p>
                  )}
                  {(lang === "both" || lang === "hi") && (
                    <p className="text-emerald-300 font-medium">🇮🇳 {scene.captionHi}</p>
                  )}
                </div>
              </div>

              {/* Player Timeline & Transport Controls */}
              <div className="px-4 py-3 bg-slate-900 border-t border-slate-800 space-y-2.5">
                <div className="flex gap-1.5">
                  {video.scenes.map((s, idx) => (
                    <button
                      key={s.stepTitle}
                      type="button"
                      onClick={() => setSceneIdx(idx)}
                      className={`h-2 flex-1 rounded-full transition ${
                        idx === sceneIdx
                          ? "bg-emerald-400"
                          : idx < sceneIdx
                            ? "bg-(--color-accent)"
                            : "bg-slate-700"
                      }`}
                      title={s.stepTitle}
                    />
                  ))}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      aria-label="Previous step"
                      onClick={() =>
                        setSceneIdx((c) => (c - 1 + video.scenes.length) % video.scenes.length)
                      }
                      className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700"
                    >
                      <SkipBack size={15} />
                    </button>
                    <button
                      type="button"
                      aria-label={playing ? "Pause video" : "Play video"}
                      onClick={() => setPlaying((p) => !p)}
                      className="px-3.5 py-2 rounded-xl bg-(--color-accent) hover:bg-(--color-accent-dark) text-white font-extrabold text-xs inline-flex items-center gap-1.5"
                    >
                      {playing ? <Pause size={15} /> : <Play size={15} />}
                      {playing ? "Pause" : "Play"}
                    </button>
                    <button
                      type="button"
                      aria-label="Next step"
                      onClick={() => setSceneIdx((c) => (c + 1) % video.scenes.length)}
                      className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700"
                    >
                      <SkipForward size={15} />
                    </button>
                    <button
                      type="button"
                      aria-label="Replay"
                      onClick={() => {
                        setSceneIdx(0);
                        setPlaying(true);
                      }}
                      className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700"
                    >
                      <RotateCcw size={15} />
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setSpeed((s) => (s === 1 ? 1.5 : s === 1.5 ? 0.75 : 1))
                      }
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold inline-flex items-center gap-1"
                    >
                      <FastForward size={13} /> {speed}x
                    </button>
                    {canSpeak && (
                      <button
                        type="button"
                        onClick={() => {
                          setNarrate((n) => {
                            if (n) stopSpeaking();
                            return !n;
                          });
                        }}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1 ${
                          narrate ? "bg-amber-400 text-slate-950" : "bg-slate-800 hover:bg-slate-700"
                        }`}
                      >
                        {narrate ? <Volume2 size={14} /> : <VolumeX size={14} />}
                        {narrate ? "Voice ON" : "Voice Audio"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <Card className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-(--color-accent-dark)">
                  {video.moduleCode} · Chapter {video.chapterRef}
                </div>
                <div className="font-display font-bold">{video.titleEn}</div>
                <div className="text-xs text-(--color-muted)">{video.titleHi}</div>
              </div>
              {onGoChapter && (
                <Button variant="secondary" onClick={() => onGoChapter(video.chapterRef)}>
                  📘 Open Chapter {video.chapterRef} Notes
                </Button>
              )}
            </Card>
          </div>

          {/* Playlist Sidebar */}
          <div className="space-y-2.5">
            <h2 className="font-display font-bold text-sm uppercase tracking-wider text-(--color-muted)">
              📺 Diploma Video Playlist ({VIDEO_LESSONS.length})
            </h2>
            {VIDEO_LESSONS.map((item) => {
              const active = item.id === selectedId;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(item.id);
                    setSceneIdx(0);
                    setPlaying(true);
                  }}
                  className={`w-full text-left flex gap-3 rounded-2xl border p-2.5 transition ${
                    active
                      ? "border-(--color-accent) bg-(--color-accent-soft) shadow-sm"
                      : "border-(--color-border) bg-(--color-surface) hover:bg-(--color-accent-soft)/50"
                  }`}
                >
                  <img
                    src={item.thumbnail}
                    alt={item.titleEn}
                    className="w-20 h-14 rounded-xl object-cover shrink-0 neu-btn"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1 text-[11px] font-bold text-(--color-accent-dark)">
                      <span>{item.moduleCode}</span>
                      <span>{item.duration}</span>
                    </div>
                    <p className="text-xs font-bold truncate mt-0.5">{item.titleEn}</p>
                    <p className="text-[11px] text-(--color-muted) truncate">{item.titleHi}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        /* AI-Generated Excel Visuals Gallery */
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {AI_GALLERY.map((art) => (
            <Card key={art.src} className="!p-0 overflow-hidden flex flex-col">
              <button
                type="button"
                onClick={() => setZoomedImg(art)}
                className="group relative overflow-hidden block"
              >
                <img
                  src={art.src}
                  alt={art.titleEn}
                  className="w-full aspect-video object-cover group-hover:scale-105 transition duration-300"
                />
                <span className="absolute top-2.5 left-2.5">
                  <Pill tone="good">✨ AI Generated · {art.tag}</Pill>
                </span>
              </button>
              <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-display font-bold text-base">{art.titleEn}</h3>
                  <p className="text-xs font-semibold text-(--color-accent-dark)">{art.titleHi}</p>
                </div>
                <Bilingual compact en={art.descEn} hi={art.descHi} className="text-xs" />
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Lightbox Modal for AI Artwork */}
      <AnimatePresence>
        {zoomedImg && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setZoomedImg(null)}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.94 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.94 }}
              onClick={(e) => e.stopPropagation()}
              className="max-w-3xl w-full bg-(--color-surface) rounded-2xl overflow-hidden shadow-2xl neu-btn"
            >
              <img src={zoomedImg.src} alt={zoomedImg.titleEn} className="w-full max-h-[65vh] object-cover" />
              <div className="p-5 flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <h3 className="font-display font-extrabold text-xl">{zoomedImg.titleEn}</h3>
                  <Bilingual en={zoomedImg.descEn} hi={zoomedImg.descHi} />
                </div>
                <button
                  type="button"
                  aria-label="Close preview"
                  onClick={() => setZoomedImg(null)}
                  className="p-2 rounded-xl neu-btn hover:bg-(--color-accent-soft)"
                >
                  <X size={18} />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
