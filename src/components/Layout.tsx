import { useState, type ReactNode } from "react";
import { motion } from "motion/react";
import { Coffee, Download, LogOut, Menu, Moon, Search, Settings, Sun, X, type LucideIcon } from "lucide-react";
import { Avatar } from "./Avatar";
import { BottomNav, PHONE_PRIMARY, type BottomNavItem } from "./BottomNav";
import { LangSwitcher } from "../lib/lang";
import { exportJSON } from "../lib/store";
import { SettingsPanel } from "./SettingsPanel";

export interface NavItem<K extends string = string> {
  key: K;
  label: string;
  icon: LucideIcon;
  group?: string;
}

export function Layout<K extends string>({
  brand,
  nav,
  active,
  onNavigate,
  userEmail,
  userName,
  userPicture,
  onSignOut,
  badges,
  onOpenSearch,
  dark,
  onToggleDark,
  onOpenBreak,
  children,
}: {
  brand: string;
  nav: NavItem<K>[];
  active: K;
  onNavigate: (key: K) => void;
  userEmail: string;
  /** Display name and avatar URL (set for Google sign-ins). */
  userName?: string;
  userPicture?: string;
  onSignOut?: () => void;
  badges?: Partial<Record<K, number>>;
  onOpenSearch?: () => void;
  dark?: boolean;
  onToggleDark?: () => void;
  onOpenBreak?: () => void;
  children: ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  async function exportBackup() {
    setExportError(null);
    try {
      await exportJSON();
    } catch (error) {
      setExportError(error instanceof Error ? error.message : "Export failed");
    }
  }

  /** The settings sheet. Local: it is a sheet over the page, not a route. */
  const [settingsOpen, setSettingsOpen] = useState(false);

  const groups: { title: string | null; items: NavItem<K>[] }[] = [];
  for (const item of nav) {
    const g = item.group ?? null;
    const last = groups[groups.length - 1];
    if (last && last.title === g) {
      last.items.push(item);
    } else {
      groups.push({ title: g, items: [item] });
    }
  }

  const navList = (onPick: () => void) => (
    <nav className="space-y-4">
      {groups.map((grp, gi) => (
        <div key={grp.title ?? `g-${gi}`} className="space-y-0.5">
          {grp.title && (
            <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-(--color-muted)/80">
              {grp.title}
            </div>
          )}
          {grp.items.map((item) => {
            const Icon = item.icon;
            const isActive = active === item.key;
            const badge = badges?.[item.key] ?? 0;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  onNavigate(item.key);
                  onPick();
                }}
                aria-current={isActive ? "page" : undefined}
                className={`w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium transition cursor-pointer ${
                  isActive
                    ? "neu-nav-active text-(--color-accent-dark) font-bold"
                    : "text-(--color-muted) hover:text-(--color-ink) hover:shadow-(--neu-raised-sm) hover:bg-(--color-surface)/60"
                }`}
              >
                <Icon size={16} className={isActive ? "text-(--color-accent)" : "opacity-80"} />
                <span className="flex-1 text-left truncate">{item.label}</span>
                {badge > 0 && (
                  <span className="min-w-5 h-5 px-1.5 rounded-full bg-(--color-accent) text-white text-[11px] font-bold flex items-center justify-center">
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      ))}
    </nav>
  );

  const footer = (
    <div className="mt-auto pt-4 border-t border-(--color-border) space-y-1">
      {/*
        Settings lives at the *bottom* of the navigation, not in the header.
        A header button sat right next to Save/Undo while a student was typing,
        so a mis-tap opened a panel over the sheet. Down here it is out of the
        way of the task and still one tap from anywhere.
      */}
      {/* Same shape as every other nav tab, so it reads as part of the app. */}
      <button
        type="button"
        aria-label={settingsOpen ? "Close settings" : "Open settings"}
        aria-expanded={settingsOpen}
        onClick={() => {
          setSettingsOpen((value) => !value);
          // Phones open settings from the drawer; close the drawer with it.
          setMobileOpen(false);
        }}
        className={`w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium transition cursor-pointer ${
          settingsOpen
            ? "neu-nav-active text-(--color-accent-dark) font-bold"
            : "text-(--color-muted) hover:text-(--color-ink) hover:shadow-(--neu-raised-sm) hover:bg-(--color-surface)/60"
        }`}
      >
        <Settings size={16} className={settingsOpen ? "text-(--color-accent)" : "opacity-80"} />
        <span className="flex-1 text-left truncate">Settings</span>
        <span className="rounded-md bg-(--color-accent-soft) px-1.5 py-0.5 text-[9px] font-bold text-(--color-accent-dark)">
          ON/OFF
        </span>
      </button>
      {/* Phones fold the header's language switch in here, where the full
          labels ("Hindi + English") fit. */}
      <div className="md:hidden px-3 pb-1.5">
        <p className="pb-1 text-[10px] font-bold uppercase tracking-widest text-(--color-muted)/80">Explanation language</p>
        <LangSwitcher />
      </div>
      <button
        type="button"
        onClick={() => void exportBackup()}
        className="w-full flex items-center gap-2 text-xs font-medium text-(--color-muted) hover:text-(--color-accent-dark) rounded-xl px-3 py-2 hover:shadow-(--neu-raised-sm) transition cursor-pointer"
      >
        <Download size={14} /> Export Backup (JSON)
      </button>
      {exportError && <p className="px-3 text-xs text-(--color-danger)">{exportError}</p>}
      {onSignOut && (
        <button
          type="button"
          onClick={onSignOut}
          className="w-full flex items-center gap-2 text-xs font-medium text-(--color-muted) hover:text-(--color-danger) rounded-xl px-3 py-2 hover:shadow-(--neu-raised-sm) transition cursor-pointer"
        >
          <LogOut size={14} /> Sign out
        </button>
      )}
      <div className="flex items-center gap-2.5 px-3 pt-2 min-w-0" title={userEmail}>
        <Avatar name={userName} email={userEmail} picture={userPicture} size={28} />
        <div className="min-w-0">
          {userName && <p className="text-xs font-semibold truncate">{userName}</p>}
          <p className="text-[11px] text-(--color-muted) truncate">{userEmail}</p>
        </div>
      </div>
    </div>
  );

  const activeItem = nav.find((n) => n.key === active);

  /**
   * Phones get five thumb-reachable destinations (Android bottom bar) plus
   * "More" for everything else. The list is derived from `nav`, so a new
   * section never has to be registered twice.
   */
  const phoneItems: BottomNavItem<K>[] = PHONE_PRIMARY.map((entry) => {
    const found = nav.find((item) => String(item.key) === entry.key);
    return {
      key: (found?.key ?? (entry.key as K)) as K,
      label: found?.label ?? entry.short,
      short: entry.short,
      icon: found?.icon ?? nav[0].icon,
    };
  }).filter((item) => nav.some((navItem) => navItem.key === item.key));

  return (
    <div className="relative min-h-screen flex bg-(--color-canvas)">
      {/* Two huge, very soft colour pools: they give the flat canvas depth
          without a single extra request. Purely decorative. */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-(--color-accent)/12 blur-3xl" />
        <div className="absolute -bottom-32 right-0 h-80 w-80 rounded-full bg-rose-300/20 blur-3xl" />
        <div className="absolute left-1/2 top-1/3 h-96 w-96 -translate-x-1/2 rounded-full bg-sky-300/15 blur-3xl" />
      </div>
      {/* Desktop Sticky Sidebar */}
      <aside className="hidden md:flex md:flex-col md:sticky md:top-0 md:h-screen w-[15.5rem] shrink-0 bg-(--color-canvas) px-4 py-5 overflow-y-auto lg:w-64">
        <button
          type="button"
          onClick={() => onNavigate(nav[0].key)}
          className="text-left cursor-pointer"
        >
          <Brand name={brand} />
        </button>
        {/*
          On a desktop Settings *becomes* the sidebar: the navigation is
          swapped for the switch board, so opening it covers the sheet for
          nothing at all. The bottom Settings tab brings it back and closes it.
        */}
        <div className="mt-6 flex-1">
          {settingsOpen ? <SettingsPanel onClose={() => setSettingsOpen(false)} /> : navList(() => undefined)}
        </div>
        {footer}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/40 backdrop-blur-xs" onClick={() => setMobileOpen(false)}>
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
            className="absolute left-0 top-0 h-full w-[80vw] max-w-xs bg-(--color-surface) p-5 flex flex-col overflow-y-auto rounded-r-3xl shadow-(--neu-raised-lg)"
          >
            <div className="flex items-center justify-between mb-5">
              <Brand name={brand} compact />
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="neu-btn p-2 text-(--color-ink)"
                aria-label="Close menu"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1">{navList(() => setMobileOpen(false))}</div>
            {footer}
          </motion.div>
        </div>
      )}

      {/* Main Content Area with Clean Sticky Top Header */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="glass-bar sticky top-0 z-30 px-3 sm:px-6 lg:px-10 h-16 md:h-16 flex items-center justify-between gap-3 md:mt-2 md:rounded-2xl md:mx-2 lg:mx-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="md:hidden neu-btn p-2 -ml-2 text-(--color-ink)"
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>
            <div className="md:hidden shrink-0">
              <Brand name={brand} compact markOnly />
            </div>
            <span className="md:hidden min-w-0 flex-1 truncate text-[13px] font-bold text-(--color-ink)">
              {activeItem?.label ?? brand}
            </span>
            {activeItem && (
              <div className="hidden md:flex items-center gap-2 text-sm font-semibold text-(--color-ink) truncate">
                {activeItem.group && (
                  <>
                    <span className="text-(--color-muted) font-normal text-xs">{activeItem.group}</span>
                    <span className="text-(--color-muted)/50">/</span>
                  </>
                )}
                <span>{activeItem.label}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {onOpenSearch && (
              <button
                type="button"
                aria-label="Search (Ctrl+K)"
                onClick={onOpenSearch}
                className="neu-btn inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-(--color-muted) transition cursor-pointer"
              >
                <Search size={14} />
                <span className="hidden sm:inline">Search formulas, chapters…</span>
                <kbd className="hidden lg:inline font-mono text-[10px] px-1.5 py-0.5 rounded bg-(--color-surface) shadow-(--neu-raised-sm)">
                  Ctrl K
                </kbd>
              </button>
            )}

            <span className="hidden md:inline-flex">
              <LangSwitcher compact />
            </span>

            {onOpenBreak && (
              <button
                type="button"
                aria-label="Take a break"
                title="Take a study break"
                onClick={onOpenBreak}
                className="neu-btn hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-(--color-muted) hover:text-(--color-ink) transition cursor-pointer"
              >
                <Coffee size={14} />
                <span className="hidden lg:inline">Break</span>
              </button>
            )}

            {onToggleDark && (
              <button
                type="button"
                aria-label="Dark mode"
                title={dark ? "Switch to Light Mode" : "Switch to Dark Mode"}
                onClick={onToggleDark}
                className="neu-btn p-2 text-(--color-muted) hover:text-(--color-ink) transition cursor-pointer"
              >
                {dark ? <Sun size={15} /> : <Moon size={15} />}
              </button>
            )}
          </div>
        </header>

        {/* Settings sheet: one place for every ON/OFF switch, reachable from
            every page. It overlays the header instead of pushing the page, so
            opening it never moves the sheet a student is typing in. */}
        {settingsOpen && (
          <>
            <button
              type="button"
              aria-label="Close settings"
              onClick={() => setSettingsOpen(false)}
              className="fixed inset-0 z-40 cursor-default bg-black/25 no-print"
            />
            {/* Bottom sheet on phones (thumb-reachable, and the sheet above it
                stays visible), a right-hand drawer from md up — never over the
                formula bar or the cell a student is working in. */}
            <div
              role="dialog"
              aria-label="Settings"
              className="fixed inset-x-0 bottom-0 z-50 mx-auto md:hidden max-h-[80dvh] w-full overflow-y-auto overscroll-contain rounded-t-3xl bg-(--color-surface) p-3 pb-24 shadow-(--neu-raised-lg) no-print md:inset-x-auto md:right-4 md:bottom-4 md:max-h-[calc(100dvh-7rem)] md:w-[24rem] md:rounded-3xl md:pb-4"
            >
              <SettingsPanel onClose={() => setSettingsOpen(false)} />
            </div>
          </>
        )}

        {/* Phones: one centred column with generous breathing room.
            Desktop: the sidebar stays, the content area widens to a spacious
            grid, and the padding scales with the viewport. */}
        <main className="flex-1 px-3 sm:px-6 lg:px-10 xl:px-12 py-5 sm:py-8 pb-28 md:pb-10">
          <div className="mx-auto w-full max-w-[42rem] lg:max-w-none xl:max-w-[86rem]">
            <div className="space-y-5 sm:space-y-6 lg:space-y-8">{children}</div>
          </div>
        </main>
      </div>

      <BottomNav items={phoneItems} active={active} onNavigate={onNavigate} onMore={() => setMobileOpen(true)} />
    </div>
  );
}

function Brand({
  name,
  compact = false,
  markOnly = false,
}: {
  name: string;
  compact?: boolean;
  /** Just the X tile — for a header with no room for the wordmark. */
  markOnly?: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="w-9 h-9 rounded-xl neu-btn-accent grid place-items-center font-display font-extrabold text-sm">
        X
      </span>
      <div className={`leading-tight ${markOnly ? "hidden" : ""}`}>
        <span
          className={`font-display font-extrabold tracking-tight block truncate ${compact ? "text-sm max-w-[7.5rem]" : "text-base"}`}
        >
          {name}
        </span>
        {!compact && (
          <span className="text-[10px] text-(--color-muted) font-medium block">
            Diploma Course · HI + EN
          </span>
        )}
      </div>
    </div>
  );
}
