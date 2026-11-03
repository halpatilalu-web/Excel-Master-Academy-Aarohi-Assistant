import { useState, type ReactNode } from "react";
import { Avatar } from "./Avatar";
import { motion } from "motion/react";
import { Download, LogOut, Menu, X, type LucideIcon } from "lucide-react";
import { exportJSON } from "../lib/store";

export interface NavItem<K extends string = string> {
  key: K;
  label: string;
  icon: LucideIcon;
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

  const navList = (onPick: () => void) => (
    <nav className="flex flex-col gap-1">
      {nav.map((item) => {
        const Icon = item.icon;
        const isActive = active === item.key;
        const badge = badges?.[item.key] ?? 0;
        return (
          <button
            key={item.key}
            onClick={() => {
              onNavigate(item.key);
              onPick();
            }}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
              isActive
                ? "bg-(--color-accent-soft) text-(--color-accent-dark)"
                : "text-(--color-muted) hover:bg-(--color-accent-soft) hover:text-(--color-ink)"
            }`}
          >
            <Icon size={18} />
            <span className="flex-1 text-left">{item.label}</span>
            {badge > 0 && (
              <span className="min-w-5 h-5 px-1.5 rounded-full bg-(--color-accent) text-white text-xs font-bold flex items-center justify-center">
                {badge}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );

  const footer = (
    <div className="mt-auto pt-6 space-y-1">
      <button
        onClick={() => void exportBackup()}
        className="w-full flex items-center gap-2 text-sm font-medium text-(--color-muted) hover:text-(--color-accent-dark) rounded-xl px-3 py-2.5 hover:bg-(--color-accent-soft) transition"
      >
        <Download size={16} /> Export backup
      </button>
      {exportError && <p className="px-3 text-xs text-(--color-danger)">{exportError}</p>}
      {onSignOut && (
        <button
          onClick={onSignOut}
          className="w-full flex items-center gap-2 text-sm font-medium text-(--color-muted) hover:text-(--color-danger) rounded-xl px-3 py-2.5 hover:bg-(--color-accent-soft) transition"
        >
          <LogOut size={16} /> Sign out
        </button>
      )}
      <div className="flex items-center gap-2.5 px-3 pt-2 min-w-0" title={userEmail}>
        <Avatar name={userName} email={userEmail} picture={userPicture} size={28} />
        <div className="min-w-0">
          {userName && <p className="text-xs font-medium truncate">{userName}</p>}
          <p className="text-xs text-(--color-muted) truncate">{userEmail}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex">
      <aside className="hidden md:flex md:flex-col w-64 shrink-0 border-r border-(--color-border) bg-(--color-surface) p-5">
        <Brand name={brand} />
        <div className="mt-8">{navList(() => undefined)}</div>
        {footer}
      </aside>

      <div className="md:hidden fixed top-0 inset-x-0 z-40 bg-(--color-surface) border-b border-(--color-border) flex items-center justify-between px-4 py-3">
        <Brand name={brand} compact />
        <button onClick={() => setMobileOpen(true)} className="p-2 rounded-lg hover:bg-(--color-accent-soft)" aria-label="Open menu">
          <Menu size={22} />
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/30" onClick={() => setMobileOpen(false)}>
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
            className="absolute right-0 top-0 h-full w-72 bg-(--color-surface) p-5 shadow-xl flex flex-col"
          >
            <div className="flex items-center justify-between mb-6">
              <Brand name={brand} compact />
              <button onClick={() => setMobileOpen(false)} className="p-2 rounded-lg hover:bg-(--color-accent-soft)" aria-label="Close menu">
                <X size={20} />
              </button>
            </div>
            {navList(() => setMobileOpen(false))}
            {footer}
          </motion.div>
        </div>
      )}

      <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-10 pt-20 md:pt-8 pb-16">
        <div className="max-w-5xl mx-auto">{children}</div>
      </main>
    </div>
  );
}

function Brand({ name, compact = false }: { name: string; compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="w-8 h-8 rounded-lg bg-(--color-accent) flex items-center justify-center text-white font-display font-extrabold">
        {name.slice(0, 1).toUpperCase()}
      </span>
      <span className={`font-display font-extrabold tracking-tight ${compact ? "text-base" : "text-lg"}`}>{name}</span>
    </div>
  );
}
