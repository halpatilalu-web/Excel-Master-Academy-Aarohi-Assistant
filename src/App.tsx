import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Award,
  BarChart3,
  BookOpen,
  Box,
  ClipboardCheck,
  FlaskConical,
  LayoutDashboard,
  Library,
  Monitor,
  Sparkles,
  StickyNote,
  Table2,
  BadgeCheck,
  UserRound,
  Video,
  Wand2,
} from "lucide-react";
import { AuthGate } from "./components/AuthGate";
import { BreakMode } from "./components/BreakMode";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { FloatingAssistant } from "./components/FloatingAssistant";
import { Layout, type NavItem } from "./components/Layout";
import type { PracticeSheetId } from "./components/LiveSpreadsheet";
import { SearchBox, type Hit } from "./components/SearchBox";
import { CHAPTERS } from "./data/chapters";
import { useAuth } from "./lib/auth";
import { LangProvider } from "./lib/lang";
import { useDark } from "./lib/prefs";
import { Account } from "./views/Account";
import { Certificate } from "./views/Certificate";
import { Chapters } from "./views/Chapters";
import { Dashboard } from "./views/Dashboard";
import type { RefTab } from "./views/Reference";
import type { Lesson3DId } from "./views/Studio3D";
import type { VideoId } from "./views/VideoLessons";

const ChartsDash = lazy(() => import("./views/ChartsDash"));
const Studio3D = lazy(() =>
  import("./views/Studio3D").then((m) => ({ default: m.Studio3D })),
);
const VideoLessons = lazy(() =>
  import("./views/VideoLessons").then((m) => ({ default: m.VideoLessons })),
);
const ExcelNotesLazy = lazy(() =>
  import("./views/ExcelNotes").then((m) => ({ default: m.ExcelNotes })),
);
const LabLazy = lazy(() =>
  import("./views/Lab").then((m) => ({ default: m.Lab })),
);
const ExamLazy = lazy(() =>
  import("./views/Exam").then((m) => ({ default: m.Exam })),
);
const ReferenceLazy = lazy(() =>
  import("./views/Reference").then((m) => ({ default: m.Reference })),
);
const AarohiLazy = lazy(() =>
  import("./views/Aarohi").then((m) => ({ default: m.Aarohi })),
);
const ProToolkitLazy = lazy(() =>
  import("./views/ProToolkit").then((m) => ({ default: m.ProToolkit })),
);
const WorkbookLazy = lazy(() =>
  import("./views/Workbook").then((m) => ({ default: m.Workbook })),
);
const FreeLazy = lazy(() => import("./views/Free").then((m) => ({ default: m.Free })));
const WindowsLazy = lazy(() => import("./views/Windows").then((m) => ({ default: m.Windows })));

const APP_NAME = "Excel Diploma Academy";

type ViewKey =
  | "home"
  | "chapters"
  | "videos"
  | "studio3d"
  | "notes"
  | "lab"
  | "workbook"
  | "free"
  | "windows"
  | "charts"
  | "toolkit"
  | "reference"
  | "exam"
  | "aarohi"
  | "certificate"
  | "account";

interface Route {
  view: ViewKey;
  chapter: number | null;
}

const VIEWS = new Set<ViewKey>([
  "home",
  "chapters",
  "videos",
  "studio3d",
  "notes",
  "lab",
  "workbook",
  "free",
  "windows",
  "charts",
  "toolkit",
  "reference",
  "exam",
  "aarohi",
  "certificate",
  "account",
]);

const NAV: NavItem<ViewKey>[] = [
  { key: "home", label: "Dashboard", icon: LayoutDashboard, group: "Overview" },
  { key: "chapters", label: "45 Chapters", icon: BookOpen, group: "Overview" },
  { key: "notes", label: "Notes & Infographics", icon: StickyNote, group: "Learn" },
  { key: "videos", label: "Video & AI Visuals", icon: Video, group: "Learn" },
  { key: "studio3d", label: "3D Visual Studio", icon: Box, group: "Learn" },
  { key: "charts", label: "Charts & Dashboards", icon: BarChart3, group: "Learn" },
  { key: "lab", label: "Live Practice Lab", icon: FlaskConical, group: "Practice & Tools" },
  { key: "workbook", label: "Free Excel Workbook", icon: Table2, group: "Practice & Tools" },
  { key: "free", label: "Everything Free", icon: BadgeCheck, group: "Practice & Tools" },
  { key: "windows", label: "Windows Desktop", icon: Monitor, group: "Practice & Tools" },
  { key: "toolkit", label: "Pro Toolkit & AI", icon: Wand2, group: "Practice & Tools" },
  { key: "reference", label: "Formulas & 400 Keys", icon: Library, group: "Practice & Tools" },
  { key: "exam", label: "Exams & Sample Papers", icon: ClipboardCheck, group: "Certification" },
  { key: "aarohi", label: "Aarohi AI Tutor", icon: Sparkles, group: "Certification" },
  { key: "certificate", label: "Diploma Certificate", icon: Award, group: "Certification" },
  { key: "account", label: "Account", icon: UserRound, group: "Certification" },
];

function parseHash(): Route {
  if (typeof window === "undefined") return { view: "home", chapter: null };
  const parts = window.location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  const candidate = parts[0] as ViewKey | undefined;
  const view = candidate && VIEWS.has(candidate) ? candidate : "home";

  let chapter: number | null = null;
  if (view === "chapters" && parts[1]) {
    const parsed = Number(parts[1]);
    if (Number.isInteger(parsed) && parsed >= 1 && parsed <= CHAPTERS.length) chapter = parsed;
  }
  return { view, chapter };
}

export default function App() {
  const auth = useAuth();
  const [route, setRoute] = useState<Route>(parseHash);
  const [refTab, setRefTab] = useState<RefTab>("formulas");
  const [refQuery, setRefQuery] = useState("");
  const [activeVideo, setActiveVideo] = useState<VideoId>("vid-basic");
  const [active3D, setActive3D] = useState<Lesson3DId>("pivot-cube");
  const [activeSheet, setActiveSheet] = useState<PracticeSheetId>("sheet-marks");
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);
  const [queuedAiPrompt, setQueuedAiPrompt] = useState<string | null>(null);
  const [dark, toggleDark] = useDark();
  const [searchOpen, setSearchOpen] = useState(false);
  const [onBreak, setOnBreak] = useState(false);

  const { view, chapter } = route;

  useEffect(() => {
    const syncRoute = () => setRoute(parseHash());
    window.addEventListener("hashchange", syncRoute);
    return () => window.removeEventListener("hashchange", syncRoute);
  }, []);

  const navigate = useCallback((nextView: ViewKey, nextChapter: number | null = null) => {
    const nextHash =
      nextView === "chapters" && nextChapter ? `#/chapters/${nextChapter}` : `#/${nextView}`;
    if (window.location.hash === nextHash) {
      setRoute({ view: nextView, chapter: nextChapter });
    } else {
      window.location.hash = nextHash;
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const pickSearchResult = (hit: Hit) => {
    if (hit.kind === "chapter") {
      navigate("chapters", hit.chapter ?? null);
      return;
    }
    setRefTab(hit.kind === "formula" ? "formulas" : "shortcuts");
    setRefQuery(hit.query ?? hit.title);
    navigate("reference");
  };

  const isGuest = auth.user?.provider === "guest";
  const displayName =
    !auth.user || isGuest
      ? "Student"
      : auth.user.name?.trim() || auth.user.email.split("@")[0] || "Student";
  const userEmail = isGuest ? "Guest · this device" : (auth.user?.email ?? "");
  const handleSignOut = isGuest
    ? undefined
    : () => {
        void auth.logout().catch(() => undefined);
      };

  return (
    <LangProvider>
      <AuthGate auth={auth} appName={APP_NAME} mode="guest">
        <Layout
          brand={APP_NAME}
          nav={NAV}
          active={view}
          onNavigate={(key) => navigate(key)}
          userEmail={userEmail}
          userName={displayName}
          userPicture={auth.user?.picture || undefined}
          onSignOut={handleSignOut}
          onOpenSearch={() => setSearchOpen(true)}
          dark={dark}
          onToggleDark={toggleDark}
          onOpenBreak={view !== "exam" ? () => setOnBreak(true) : undefined}
        >
          <ErrorBoundary>
            <AnimatePresence mode="wait">
              <motion.div
                key={`${view}:${chapter ?? ""}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                {view === "home" && (
                  <Dashboard
                    name={displayName}
                    onOpenChapter={(ch) => navigate("chapters", ch)}
                    go={(next) => {
                      if (next === "reference") {
                        setRefTab("shortcuts");
                        setRefQuery("");
                      }
                      navigate(next);
                    }}
                  />
                )}
                {view === "chapters" && (
                  <Chapters
                    openChapter={chapter}
                    onOpenChapter={(nextChapter) => navigate("chapters", nextChapter)}
                    onJumpAction={(target) => {
                      if (target.kind === "video") {
                        setActiveVideo(target.id as VideoId);
                        navigate("videos");
                      } else if (target.kind === "3d") {
                        setActive3D(target.id as Lesson3DId);
                        navigate("studio3d");
                      } else if (target.kind === "sheet") {
                        setActiveSheet(target.id as PracticeSheetId);
                        navigate("lab");
                      } else if (target.kind === "ai") {
                        setQueuedAiPrompt(target.prompt);
                        setAiDrawerOpen(true);
                      }
                    }}
                  />
                )}
                {view === "videos" && (
                  <Suspense fallback={<p className="text-(--color-muted)">Loading Video Studio…</p>}>
                    <VideoLessons
                      initialVideo={activeVideo}
                      onGoChapter={(ch) => navigate("chapters", ch)}
                    />
                  </Suspense>
                )}
                {view === "studio3d" && (
                  <Suspense fallback={<p className="text-(--color-muted)">Loading 3D Studio…</p>}>
                    <Studio3D
                      initialLesson={active3D}
                      onGoChapter={(ch) => navigate("chapters", ch)}
                    />
                  </Suspense>
                )}
                {view === "lab" && (
                  <Suspense fallback={<p className="text-(--color-muted)">Loading Lab…</p>}>
                    <LabLazy initialSheet={activeSheet} />
                  </Suspense>
                )}
                {view === "workbook" && (
                  <Suspense fallback={<p className="text-(--color-muted)">Loading the free workbook…</p>}>
                    <WorkbookLazy />
                  </Suspense>
                )}
                {view === "free" && (
                  <Suspense fallback={<p className="text-(--color-muted)">Loading the free feature list…</p>}>
                    <FreeLazy onOpenDesktop={() => navigate("windows")} />
                  </Suspense>
                )}
                {view === "windows" && (
                  <Suspense fallback={<p className="text-(--color-muted)">Starting the desktop…</p>}>
                    <WindowsLazy onExit={() => navigate("home")} />
                  </Suspense>
                )}
                {view === "exam" && (
                  <Suspense fallback={<p className="text-(--color-muted)">Loading Exam Hub…</p>}>
                    <ExamLazy />
                  </Suspense>
                )}
                {view === "reference" && (
                  <Suspense fallback={<p className="text-(--color-muted)">Loading Reference…</p>}>
                    <ReferenceLazy
                      tab={refTab}
                      onTab={setRefTab}
                      initialQuery={refQuery}
                      go={(chapterNumber) => navigate("chapters", chapterNumber ?? null)}
                    />
                  </Suspense>
                )}
                {view === "charts" && (
                  <Suspense fallback={<p className="text-(--color-muted)">Loading Charts…</p>}>
                    <ChartsDash />
                  </Suspense>
                )}
                {view === "notes" && (
                  <Suspense fallback={<p className="text-(--color-muted)">Loading Notes…</p>}>
                    <ExcelNotesLazy onGoChapter={(ch) => navigate("chapters", ch)} />
                  </Suspense>
                )}
                {view === "toolkit" && (
                  <Suspense fallback={<p className="text-(--color-muted)">Loading Pro Toolkit…</p>}>
                    <ProToolkitLazy
                      onAskAarohi={(prompt) => {
                        setQueuedAiPrompt(prompt);
                        setAiDrawerOpen(true);
                      }}
                    />
                  </Suspense>
                )}
                {view === "aarohi" && (
                  <Suspense fallback={<p className="text-(--color-muted)">Loading Aarohi AI…</p>}>
                    <AarohiLazy />
                  </Suspense>
                )}
                {view === "certificate" && <Certificate defaultName={displayName} />}
                {view === "account" && <Account auth={auth} />}
              </motion.div>
            </AnimatePresence>
          </ErrorBoundary>

          {/* Floating Live AI Assistant on every page except full-screen Aarohi & active exam */}
          {view !== "aarohi" && view !== "exam" && (
            <FloatingAssistant
              open={aiDrawerOpen}
              onOpenChange={setAiDrawerOpen}
              queuedPrompt={queuedAiPrompt}
              onClearQueuedPrompt={() => setQueuedAiPrompt(null)}
              onExpandFull={() => navigate("aarohi")}
            />
          )}

          <BreakMode open={onBreak} onDone={() => setOnBreak(false)} />
          <SearchBox open={searchOpen} onClose={() => setSearchOpen(false)} onPick={pickSearchResult} />
          <footer className="mt-12 pt-5 border-t border-(--color-border) flex flex-wrap items-center justify-between gap-2 text-xs text-(--color-muted)">
            <span>© {new Date().getFullYear()} Excel Diploma Academy</span>
            <span>Complete Basic-to-Advanced Excel Curriculum · Hindi & English</span>
          </footer>
        </Layout>
      </AuthGate>
    </LangProvider>
  );
}
