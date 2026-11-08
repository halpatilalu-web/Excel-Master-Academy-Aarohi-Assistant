/**
 * @license MIT
 * Excel's Data ▸ Form dialog, rebuilt for the browser.
 *
 * In Windows Excel this appears when you press Alt, D, O on a table. It gives
 * one row at a time: New, Find Next, Delete, Restore and a scroll bar. That is
 * how data-entry staff actually fill a register without clicking cell by cell,
 * so the grid offers the same thing.
 */
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Search, Trash2, X } from "lucide-react";
import { Button } from "./ui";

export interface DataFormProps {
  /** Header labels, in column order (already resolved from row 1). */
  headers: string[];
  /** Every existing record, one string[] per row. */
  rows: string[][];
  /** Called with a full record; the grid writes it into the first free row. */
  onNew: (values: string[]) => void;
  /** Update an existing record by its row index. */
  onUpdate: (rowIndex: number, values: string[]) => void;
  /** Delete an existing record. */
  onDelete: (rowIndex: number) => void;
  onClose: () => void;
}

export function DataForm({ headers, rows, onNew, onUpdate, onDelete, onClose }: DataFormProps) {
  const [draft, setDraft] = useState<string[]>(() => headers.map(() => ""));
  const [cursor, setCursor] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [note, setNote] = useState<string | null>(null);

  const load = (index: number | null) => {
    setCursor(index);
    setDraft(index === null ? headers.map(() => "") : headers.map((_, i) => rows[index]?.[i] ?? ""));
  };

  const commitNew = () => {
    if (draft.every((value) => value.trim() === "")) {
      setNote("Pehle kuch type karo — ek bhi field bharo.");
      return;
    }
    onNew(draft);
    setNote(`Naya record save ho gaya (#${rows.length + 1}).`);
    setDraft(headers.map(() => ""));
    setCursor(null);
  };

  const commitUpdate = () => {
    if (cursor === null) {
      commitNew();
      return;
    }
    onUpdate(cursor, draft);
    setNote(`Record #${cursor + 1} update ho gaya.`);
  };

  const hits = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return rows.map((_, index) => index);
    return rows
      .map((row, index) => ({ row, index }))
      .filter(({ row }) => row.some((cell) => cell.toLowerCase().includes(needle)))
      .map(({ index }) => index);
  }, [query, rows]);

  const findNext = () => {
    if (!hits.length) {
      setNote("Koi match nahi mila.");
      return;
    }
    const position = cursor === null ? -1 : hits.indexOf(cursor);
    const next = hits[(position + 1) % hits.length];
    load(next);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-3 no-print" role="dialog" aria-modal="true" aria-label="Data entry form">
      <div className="w-full max-w-md rounded-2xl border border-(--color-border-strong) bg-(--color-surface) shadow-2xl overflow-hidden">
        {/* Title bar, like the classic Excel form */}
        <div className="flex items-center justify-between px-3.5 py-2 bg-(--color-accent) text-white">
          <div className="text-xs font-bold tracking-wide">Data Form</div>
          <button type="button" onClick={onClose} aria-label="Close data form" className="p-0.5 rounded hover:bg-white/20">
            <X size={15} />
          </button>
        </div>

        <div className="p-3.5 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="text-[11px] text-(--color-muted)">
              Record <b className="text-(--color-ink)">{cursor === null ? "new" : cursor + 1}</b> / {rows.length}
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => load(cursor === null ? Math.max(0, rows.length - 1) : Math.max(0, cursor - 1))}
                className="p-1 rounded-lg neu-btn hover:bg-(--color-accent-soft)"
                aria-label="Previous record"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                type="button"
                onClick={() => load(cursor === null ? 0 : Math.min(rows.length - 1, cursor + 1))}
                className="p-1 rounded-lg neu-btn hover:bg-(--color-accent-soft)"
                aria-label="Next record"
              >
                <ChevronRight size={14} />
              </button>
              <div className="relative">
                <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-(--color-muted)" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") findNext();
                  }}
                  aria-label="Find in form"
                  placeholder="Find"
                  className="w-28 rounded-lg neu-field bg-(--color-surface) pl-6 pr-2 py-1 text-[11px]"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1.5 max-h-[46vh] overflow-auto pr-1">
            {headers.map((header, index) => (
              <label key={`${header}-${index}`} className="block">
                <span className="block text-[10px] font-bold uppercase tracking-wide text-(--color-muted)">{header}</span>
                <input
                  value={draft[index] ?? ""}
                  onChange={(event) => {
                    const next = [...draft];
                    next[index] = event.target.value;
                    setDraft(next);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") commitUpdate();
                  }}
                  className="w-full rounded-lg neu-field bg-(--color-surface) px-2 py-1.5 text-xs"
                />
              </label>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-(--color-border)">
            <Button onClick={commitNew} className="!px-3 !py-1.5 !text-xs">
              <Plus size={13} /> New
            </Button>
            {cursor !== null && (
              <>
                <Button variant="secondary" onClick={commitUpdate} className="!px-3 !py-1.5 !text-xs">
                  Update
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    onDelete(cursor);
                    setNote(`Record #${cursor + 1} delete ho gaya.`);
                    load(null);
                  }}
                  className="!px-3 !py-1.5 !text-xs"
                >
                  <Trash2 size={13} /> Delete
                </Button>
              </>
            )}
            <Button variant="ghost" onClick={() => load(null)} className="!px-3 !py-1.5 !text-xs">
              Clear
            </Button>
            <Button variant="ghost" onClick={findNext} className="!px-3 !py-1.5 !text-xs ml-auto">
              Find next
            </Button>
          </div>

          <p className="text-[10px] text-(--color-muted) min-h-[1rem]">
            {note ?? "Ek row ek record. New dabao to sheet ke pehle khaali row mein chala jayega."}
          </p>
        </div>
      </div>
    </div>
  );
}
