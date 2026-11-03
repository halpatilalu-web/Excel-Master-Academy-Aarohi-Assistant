import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Award,
  BarChart3,
  BookOpen,
  ClipboardCheck,
  Coffee,
  FlaskConical,
  LayoutDashboard,
  Library,
  Moon,
  Search,
  Sparkles,
  StickyNote,
  Sun,
  UserRound,
} from "lucide-react";
import { AuthGate } from "./components/AuthGate";
import { BreakMode } from "./components/BreakMode";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Layout, type NavItem } from "./components/Layout";
import { SearchBox, type Hit } from "./components/SearchBox";
import { CHAPTERS } from "./data/chapters";
import { useAuth } from "./lib/auth";
import { useDark } from "./lib/prefs";
import { Aarohi } from "./views/Aarohi";
import { Account } from "./views/Account";
import { Certificate } from "./views/Certificate";
import { Chapters } from "./views/Chapters";
import { Dashboard } from "./views/Dashboard";
import { Exam } from "./views/Exam";
import { ExcelNotes } from "./views/ExcelNotes";
import { Lab } from "./views/Lab";
import { Reference, type RefTab } from "./views/Reference";

const ChartsDash = lazy(() => import("./views/ChartsDash"));

const APP_NAME = "Excel Master Academy";

type ViewKey =
  | "home"
  | "chapters"
  | "lab"
  | "exam"
  | "reference"
  | "charts"
  | "notes"
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
  "lab",
  "exam",
  "reference",
  "charts",
  "notes",
  "aarohi",
  "certificate",
  "account",
]);

const NAV: NavItem<ViewKey>[] = [
  { key: "home", label: "Dashboard", icon: LayoutDashboard },
  { key: "chapters", label: "Chapters", icon: BookOpen },
  { key: "lab", label: "Practical Lab", icon: FlaskConical },
  { key: "exam", label: "Practice Exam", icon: ClipboardCheck },
  { key: "reference", label: "Formulas & Shortcuts", icon: Library },
  { key: "charts", label: "Charts & Dashboards", icon: BarChart3 },
  { key: "notes", label: "Excel Notes", icon: StickyNote },
  { key: "aarohi", label: "Aarohi Excel Saathi", icon: Sparkles },
  { key: "certificate", label: "Practice Certificate", icon: Award },
  { key: "account", label: "Account", icon: UserRound },
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
                />
              )}
              {view === "lab" && <Lab />}
              {view === "exam" && <Exam />}
              {view === "reference" && (
                <Reference
                  tab={refTab}
                  onTab={setRefTab}
                  initialQuery={refQuery}
                  go={(chapterNumber) => navigate("chapters", chapterNumber ?? null)}
                />
              )}
              {view === "charts" && (
                <Suspense fallback={<p className="text-(--color-muted)">Loading…</p>}>
                  <ChartsDash />
                </Suspense>
              )}
              {view === "notes" && <ExcelNotes />}
              {view === "aarohi" && <Aarohi />}
              {view === "certificate" && <Certificate defaultName={displayName} />}
              {view === "account" && <Account auth={auth} />}
            </motion.div>
          </AnimatePresence>
        </ErrorBoundary>

        <div className="fixed bottom-4 right-4 z-40 flex gap-2">
          <button
            type="button"
            aria-label="Search (Ctrl+K)"
            onClick={() => setSearchOpen(true)}
            className="p-3 rounded-full bg-(--color-accent) text-white shadow-lg hover:scale-105 transition"
          >
            <Search size={18} />
          </button>
          <button
            type="button"
            aria-label="Dark mode"
            onClick={toggleDark}
            className="p-3 rounded-full bg-(--color-surface) border border-(--color-border) shadow-lg hover:scale-105 transition"
          >
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>

        {view !== "exam" && (
          <button
            type="button"
            aria-label="Take a break"
            onClick={() => setOnBreak(true)}
            className="fixed bottom-4 left-4 md:left-72 z-40 flex items-center gap-2 px-4 py-3 rounded-full bg-(--color-warn) text-black font-semibold text-sm shadow-lg hover:scale-105 transition"
          >
            <Coffee size={18} /> Break
          </button>
        )}

        <BreakMode open={onBreak} onDone={() => setOnBreak(false)} />
        <SearchBox open={searchOpen} onClose={() => setSearchOpen(false)} onPick={pickSearchResult} />
        <footer className="mt-10 pt-4 border-t border-(--color-border) text-xs text-(--color-muted)">
          © {new Date().getFullYear()} Excel Master Academy · Basic se Advanced Excel practice course
        </footer>
      </Layout>
    </AuthGate>
  );
}
