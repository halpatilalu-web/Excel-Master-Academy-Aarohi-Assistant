/**
 * @license MIT
 * The phone layout: an Android-style bottom navigation bar.
 *
 * A desktop gets a sidebar; a phone gets a thumb-reachable floating bar with
 * five destinations, the current one pressed into the surface (neumorphism's
 * pressed state is the natural "selected" cue). Anything beyond the five lives
 * behind "More", which opens the full drawer — so nothing is lost on a phone,
 * it is just one tap deeper, like Android's own overflow.
 */
import type { LucideIcon } from "lucide-react";
import { MoreHorizontal } from "lucide-react";

export interface BottomNavItem<K extends string> {
  key: K;
  label: string;
  icon: LucideIcon;
  /** Short label for the bar — five labels must fit on a 360 px phone. */
  short?: string;
}

export function BottomNav<K extends string>({
  items,
  active,
  onNavigate,
  onMore,
}: {
  items: BottomNavItem<K>[];
  active: K;
  onNavigate: (key: K) => void;
  onMore: () => void;
}) {
  return (
    <nav
      aria-label="Primary"
      className="md:hidden fixed inset-x-0 bottom-0 z-40 neu-bottom-bar px-2 pt-1.5 bg-(--color-canvas)/92 backdrop-blur-md"
    >
      <div className="flex items-stretch justify-between gap-1 rounded-2xl neu-raised bg-(--color-surface) px-1 py-1">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onNavigate(item.key)}
              aria-current={isActive ? "page" : undefined}
              aria-label={item.label}
              className={`flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] font-bold transition ${
                isActive
                  ? "neu-pressed-sm text-(--color-accent-dark)"
                  : "text-(--color-muted) active:shadow-(--neu-pressed-sm)"
              }`}
            >
              <span className={`grid place-items-center h-6 w-6 rounded-lg ${isActive ? "text-(--color-accent)" : ""}`}>
                <Icon size={19} />
              </span>
              <span className="truncate max-w-full leading-none">{item.short ?? item.label}</span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={onMore}
          aria-label="More sections"
          className="flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] font-bold text-(--color-muted) transition active:shadow-(--neu-pressed-sm)"
        >
          <span className="grid place-items-center h-6 w-6 rounded-lg">
            <MoreHorizontal size={19} />
          </span>
          <span className="leading-none">More</span>
        </button>
      </div>
    </nav>
  );
}

/**
 * The five destinations a phone shows by default, in the order a student
 * actually reaches for them: the dashboard, the free workbook, practice,
 * formulas, and the exam.
 */
export const PHONE_PRIMARY: { key: string; short: string }[] = [
  { key: "home", short: "Home" },
  { key: "workbook", short: "Workbook" },
  { key: "lab", short: "Practice" },
  { key: "reference", short: "Formulas" },
  { key: "exam", short: "Exam" },
];
