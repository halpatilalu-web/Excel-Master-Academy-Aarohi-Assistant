import { useEffect, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";

export const inputCls =
  "w-full rounded-xl border border-(--color-border) bg-(--color-surface) px-3.5 py-2.5 text-sm " +
  "text-(--color-ink) placeholder:text-(--color-muted) focus:outline-none focus:ring-2 focus:ring-(--color-accent)";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-(--color-surface) border border-(--color-border) rounded-2xl p-5 ${className}`}>
      {children}
    </div>
  );
}

export function Button({
  children,
  onClick,
  variant = "primary",
  type = "button",
  className = "",
  disabled = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  type?: "button" | "submit";
  className?: string;
  disabled?: boolean;
}) {
  const styles = {
    primary: "bg-(--color-accent) text-white hover:bg-(--color-accent-dark)",
    secondary: "bg-(--color-accent-soft) text-(--color-accent-dark) hover:brightness-95",
    ghost: "bg-transparent text-(--color-ink) hover:bg-(--color-accent-soft)",
    danger: "bg-(--color-danger) text-white hover:brightness-95",
  }[variant];
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-accent) disabled:opacity-50 disabled:cursor-not-allowed ${styles} ${className}`}
    >
      {children}
    </button>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block mb-3.5">
      <span className="block text-xs font-semibold text-(--color-muted) mb-1.5 uppercase tracking-wide">{label}</span>
      {children}
    </label>
  );
}

export function ProgressBar({ pct, tone = "accent" }: { pct: number; tone?: "accent" | "warn" | "danger" }) {
  const clamped = Math.min(100, Math.max(0, pct));
  const color = tone === "danger" ? "bg-(--color-danger)" : tone === "warn" ? "bg-(--color-warn)" : "bg-(--color-accent)";
  return (
    <div className="w-full h-2.5 rounded-full bg-(--color-accent-soft) overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${clamped}%` }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className={`h-full rounded-full ${color}`}
      />
    </div>
  );
}

export function Pill({ tone, children }: { tone: "good" | "warn" | "danger" | "info"; children: ReactNode }) {
  const cls = {
    good: "bg-(--color-accent-soft) text-(--color-good)",
    warn: "bg-(--color-accent-soft) text-(--color-warn)",
    danger: "bg-(--color-accent-soft) text-(--color-danger)",
    info: "bg-(--color-accent-soft) text-(--color-info)",
  }[tone];
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>{children}</span>;
}

export function EmptyState({ icon, title, subtitle }: { icon: ReactNode; title: string; subtitle: string }) {
  return (
    <div className="flex flex-col items-center text-center py-10 px-4">
      <div className="w-12 h-12 rounded-xl bg-(--color-accent-soft) text-(--color-accent-dark) flex items-center justify-center mb-4">
        {icon}
      </div>
      <p className="font-display font-bold">{title}</p>
      <p className="text-sm text-(--color-muted) mt-1 max-w-xs">{subtitle}</p>
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-(--color-surface) rounded-2xl p-6 shadow-xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-lg">{title}</h3>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-(--color-accent-soft) text-(--color-muted)"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
