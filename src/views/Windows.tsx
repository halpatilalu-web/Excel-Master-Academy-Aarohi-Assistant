/**
 * @license MIT
 * The "Windows" tab — the whole screen becomes a PC.
 *
 * The route is deliberately full-bleed (no course chrome) so it feels like
 * switching to a desktop rather than opening another page. `onExit` takes the
 * student back to the course dashboard.
 */
import { Monitor, ShieldCheck, Sparkles } from "lucide-react";
import { Desktop } from "../components/desktop/Desktop";
import { Bilingual } from "../lib/lang";

export function Windows({ onExit }: { onExit: () => void }) {
  return (
    <div className="-m-3 sm:-m-4 lg:-m-6">
      <Desktop onExit={onExit} />
    </div>
  );
}

/** Small promo card other views can drop in to point at the desktop. */
export function DesktopPromo({ onOpen }: { onOpen: () => void }) {
  return (
    <div className="neu-card-sm p-4">
      <div className="flex items-start gap-3">
        <span className="shrink-0 grid place-items-center h-10 w-10 rounded-lg bg-gradient-to-br from-emerald-700 to-blue-700 text-white">
          <Monitor size={18} />
        </span>
        <div className="min-w-0">
          <div className="font-bold text-(--color-ink) flex flex-wrap items-center gap-2">
            Windows Desktop mode
            <span className="text-[10px] font-semibold uppercase tracking-wide rounded-full px-2 py-0.5 tone-good">
              New
            </span>
          </div>
          <Bilingual
            className="text-xs text-(--color-muted) mt-1 leading-relaxed"
            en="A whole PC inside this site: Excel, Word, PowerPoint, Paint, File Explorer, Notepad, Calculator, Calendar, a Power BI-style dashboard and Settings — with a taskbar, Start menu and draggable windows."
            hi="Is site ke andar poora PC: Excel, Word, PowerPoint, Paint, File Explorer, Notepad, Calculator, Calendar, Power BI-style dashboard aur Settings — taskbar, Start menu aur drag hone wali windows ke saath."
          />
          <div className="flex flex-wrap items-center gap-2 mt-2.5">
            <button
              type="button"
              onClick={onOpen}
              className="inline-flex items-center gap-1.5 rounded-lg bg-(--color-accent) text-white text-xs font-semibold px-3 py-1.5 hover:opacity-90"
            >
              <Sparkles size={13} /> Open the Windows desktop
            </button>
            <span className="inline-flex items-center gap-1 text-[11px] text-(--color-muted)">
              <ShieldCheck size={12} /> Free · no licence or activation
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Windows;
