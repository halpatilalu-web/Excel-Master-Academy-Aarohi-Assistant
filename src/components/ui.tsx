import { useEffect, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";

/**
 * Neumorphic input: pressed into the surface rather than drawn on top of it.
 * The ring on focus keeps it keyboard-accessible.
 */
export const inputCls =
  "w-full neu-field px-3.5 py-2.5 text-sm " +
  "text-(--color-ink) placeholder:text-(--color-muted) focus:outline-none";

/**
 * The neumorphic card: same colour as the page, lifted out of it by one soft
 * light and one soft shadow. No border — a border plus a shadow is what makes
 * soft UI look like a 2010 box.
 */
export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`neu-card p-5 ${className}`}>{children}</div>;
}

/** A card that is deliberately flat — for content that must read like paper. */
export function PaperCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`neu-paper p-5 ${className}`}>{children}</div>;
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
    // Accent fill with a soft lift; secondary is the classic extruded surface;
    // ghost stays flat (it lives inside other neumorphic chrome).
    primary: "neu-btn-accent",
    secondary: "neu-btn text-(--color-accent-dark) hover:text-(--color-ink)",
    ghost: "bg-transparent text-(--color-ink) hover:bg-(--color-surface)/70",
    danger: "neu-btn text-white bg-(--color-danger)",
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
      <span className="block text-[11px] font-bold text-(--color-muted) mb-1.5 uppercase tracking-widest">{label}</span>
      {children}
    </label>
  );
}

export function ProgressBar({ pct, tone = "accent" }: { pct: number; tone?: "accent" | "warn" | "danger" }) {
  const clamped = Math.min(100, Math.max(0, pct));
  const color = tone === "danger" ? "bg-(--color-danger)" : tone === "warn" ? "bg-(--color-warn)" : "bg-(--color-accent)";
  return (
    <div className="w-full h-2.5 rounded-full bg-(--color-surface) neu-pressed-sm overflow-hidden">
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
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold shadow-(--neu-raised-sm) ${cls}`}>{children}</span>
  );
}

export function EmptyState({ icon, title, subtitle }: { icon: ReactNode; title: string; subtitle: string }) {
  return (
    <div className="flex flex-col items-center text-center py-10 px-4">
      <div className="w-14 h-14 rounded-2xl bg-(--color-surface) neu-raised text-(--color-accent-dark) grid place-items-center mb-4">
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
            className="w-full max-w-md neu-card p-6 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-lg">{title}</h3>
              <button
                onClick={onClose}
                className="neu-btn p-2 text-(--color-muted) hover:text-(--color-ink)"
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
