/**
 * @license MIT
 * The Excel dialogs students are told to look for, rebuilt so they actually
 * work in the browser: Data Validation, Conditional Formatting, Filter, Name
 * Manager, Go To and Format Cells.
 *
 * Each one is a real form that writes a rule back to the sheet; nothing here
 * is a picture of Excel's dialog. Layout is deliberately tall/scrollable and
 * single-column below `sm`, because most of this course is used on a phone.
 */
import { useEffect, useMemo, useState } from "react";
import { Check, Plus, Trash2, X } from "lucide-react";
import {
  CF_PRESETS,
  FILTER_LABELS,
  type CfRule,
  type CfType,
  type FilterOp,
  type ListFilter,
  type NamedRange,
  type SheetFilter,
  type ValidationOp,
  type ValidationRule,
  type ValidationType,
} from "../../lib/excel/sheetTools";

/* ----------------------------- shared shell ---------------------------- */

export function Dialog({
  title,
  subtitle,
  onClose,
  children,
  footer,
  wide,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[90] bg-black/45 backdrop-blur-[2px] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        role="dialog"
        aria-label={title}
        aria-modal="true"
        className={`w-full ${wide ? "sm:max-w-3xl" : "sm:max-w-lg"} max-h-[92vh] sm:max-h-[88vh] flex flex-col bg-(--color-surface) border border-(--color-border) rounded-t-2xl sm:rounded-2xl shadow-2xl`}
      >
        <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-(--color-border)">
          <div>
            <h2 className="text-sm font-extrabold text-(--color-ink)">{title}</h2>
            {subtitle && <p className="text-[11px] text-(--color-muted) mt-0.5 leading-relaxed">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={`Close ${title}`}
            className="p-1.5 rounded-lg text-(--color-muted) hover:bg-(--color-accent-soft) shrink-0"
          >
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">{children}</div>
        {footer && <div className="px-4 py-3 border-t border-(--color-border) flex flex-wrap justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

const fieldCls =
  "w-full rounded-lg border border-(--color-border) bg-(--color-surface) px-2.5 py-2 text-xs text-(--color-ink) outline-none focus:ring-2 focus:ring-(--color-accent)";
const labelCls = "block text-[11px] font-semibold text-(--color-muted) mb-1";

export function PrimaryButton({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1.5 rounded-lg bg-(--color-accent) text-white px-3.5 py-2 text-xs font-bold hover:opacity-90 disabled:opacity-40"
    >
      {children}
    </button>
  );
}

export function GhostButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg border border-(--color-border) bg-(--color-surface) px-3.5 py-2 text-xs font-semibold text-(--color-ink) hover:bg-(--color-accent-soft)"
    >
      {children}
    </button>
  );
}

/* ========================== data validation =========================== */

export function DataValidationDialog({
  range,
  rules,
  onSave,
  onDelete,
  onClose,
}: {
  /** Current selection, pre-filled as the rule's range. */
  range: string;
  rules: ValidationRule[];
  onSave: (rule: ValidationRule) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const [type, setType] = useState<ValidationType>("list");
  const [op, setOp] = useState<ValidationOp>("between");
  const [target, setTarget] = useState(range);
  const [itemsText, setItemsText] = useState("Yes, No");
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");
  const [formula, setFormula] = useState("value>0");
  const [allowBlank, setAllowBlank] = useState(true);
  const [dropdown, setDropdown] = useState(true);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");

  const submit = () => {
    const rule: ValidationRule = {
      id: `v-${Date.now()}`,
      range: target.trim() || range,
      type,
      op,
      min: min || undefined,
      max: max || undefined,
      items: type === "list" ? itemsText.split(",").map((item) => item.trim()).filter(Boolean) : undefined,
      formula: type === "custom" ? formula : undefined,
      allowBlank,
      showDropdown: dropdown,
      title: title || undefined,
      message: message || undefined,
    };
    onSave(rule);
    onClose();
  };

  return (
    <Dialog
      title="Data Validation"
      subtitle="Yeh unhi values ko allow karega jo aap set karo — Excel ka Data ▸ Data Validation."
      onClose={onClose}
      wide
      footer={
        <>
          <GhostButton onClick={onClose}>Cancel</GhostButton>
          <PrimaryButton onClick={submit} disabled={!target.trim()}>
            <Check size={13} /> Apply to {target || range}
          </PrimaryButton>
        </>
      }
    >
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className={labelCls} htmlFor="dv-allow">
            Allow
          </label>
          <select id="dv-allow" aria-label="Allow" className={fieldCls} value={type} onChange={(event) => setType(event.target.value as ValidationType)}>
            <option value="list">List (dropdown)</option>
            <option value="whole">Whole number</option>
            <option value="decimal">Decimal</option>
            <option value="date">Date</option>
            <option value="textLength">Text length</option>
            <option value="custom">Custom formula</option>
          </select>
        </div>
        <div>
          <label className={labelCls} htmlFor="dv-range">
            Applies to
          </label>
          <input id="dv-range" aria-label="Applies to" className={fieldCls} value={target} onChange={(event) => setTarget(event.target.value)} />
        </div>
      </div>

      {type === "list" ? (
        <>
          <div>
            <label className={labelCls} htmlFor="dv-items">
              List values (comma separated)
            </label>
            <input id="dv-items" aria-label="List values" className={fieldCls} value={itemsText} onChange={(event) => setItemsText(event.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-xs text-(--color-ink)">
            <input type="checkbox" checked={dropdown} onChange={(event) => setDropdown(event.target.checked)} /> Show the in-cell dropdown arrow
          </label>
        </>
      ) : type === "custom" ? (
        <div>
          <label className={labelCls} htmlFor="dv-formula">
            Formula (value, or len(value))
          </label>
          <input id="dv-formula" aria-label="Custom formula" className={`${fieldCls} font-mono`} value={formula} onChange={(event) => setFormula(event.target.value)} />
          <p className="text-[11px] text-(--color-muted) mt-1">
            Examples: <code>value&gt;100</code>, <code>len(value)&lt;=10</code>. True = allowed.
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <label className={labelCls} htmlFor="dv-op">
              Data
            </label>
            <select id="dv-op" aria-label="Data operator" className={fieldCls} value={op} onChange={(event) => setOp(event.target.value as ValidationOp)}>
              <option value="between">between</option>
              <option value="notBetween">not between</option>
              <option value="equal">equal to</option>
              <option value="notEqual">not equal to</option>
              <option value="greater">greater than</option>
              <option value="less">less than</option>
              <option value="gte">greater than or equal</option>
              <option value="lte">less than or equal</option>
            </select>
          </div>
          <div>
            <label className={labelCls} htmlFor="dv-min">
              {type === "date" ? "Start date" : "Minimum"}
            </label>
            <input id="dv-min" aria-label="Minimum" className={fieldCls} value={min} onChange={(event) => setMin(event.target.value)} placeholder={type === "date" ? "01-01-2026" : "0"} />
          </div>
          <div>
            <label className={labelCls} htmlFor="dv-max">
              {type === "date" ? "End date" : "Maximum"}
            </label>
            <input id="dv-max" aria-label="Maximum" className={fieldCls} value={max} onChange={(event) => setMax(event.target.value)} placeholder={type === "date" ? "31-12-2026" : "100"} />
          </div>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className={labelCls} htmlFor="dv-title">
            Error title (optional)
          </label>
          <input id="dv-title" aria-label="Error title" className={fieldCls} value={title} onChange={(event) => setTitle(event.target.value)} />
        </div>
        <div>
          <label className={labelCls} htmlFor="dv-message">
            Error message (optional)
          </label>
          <input id="dv-message" aria-label="Error message" className={fieldCls} value={message} onChange={(event) => setMessage(event.target.value)} />
        </div>
      </div>

      <label className="flex items-center gap-2 text-xs text-(--color-ink)">
        <input type="checkbox" checked={allowBlank} onChange={(event) => setAllowBlank(event.target.checked)} /> Ignore blank cells (Excel&apos;s default)
      </label>

      {rules.length > 0 && (
        <div className="rounded-xl border border-(--color-border) divide-y divide-(--color-border)">
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-(--color-muted)">Rules on this sheet</div>
          {rules.map((rule) => (
            <div key={rule.id} className="flex items-center justify-between gap-2 px-3 py-1.5 text-[11px]">
              <span className="text-(--color-ink)">
                <b>{rule.range}</b> · {rule.type}
                {rule.items?.length ? ` (${rule.items.join(", ")})` : ""}
              </span>
              <button
                type="button"
                aria-label={`Delete rule for ${rule.range}`}
                onClick={() => onDelete(rule.id)}
                className="p-1 rounded text-(--color-danger) hover:bg-(--color-danger)/10"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </Dialog>
  );
}

/* ======================= conditional formatting ======================== */

const CF_TYPES: { value: CfType; label: string }[] = [
  { value: "greater", label: "Greater than…" },
  { value: "less", label: "Less than…" },
  { value: "between", label: "Between…" },
  { value: "equal", label: "Equal to…" },
  { value: "textContains", label: "Text contains…" },
  { value: "top", label: "Top N values" },
  { value: "bottom", label: "Bottom N values" },
  { value: "aboveAvg", label: "Above average" },
  { value: "belowAvg", label: "Below average" },
  { value: "duplicates", label: "Duplicate values" },
  { value: "unique", label: "Unique values" },
  { value: "dataBar", label: "Data bars" },
  { value: "colorScale", label: "3-colour scale (red → green)" },
];

export function ConditionalFormattingDialog({
  range,
  rules,
  onSave,
  onDelete,
  onClear,
  onClose,
}: {
  range: string;
  rules: CfRule[];
  onSave: (rule: CfRule) => void;
  onDelete: (id: string) => void;
  onClear: () => void;
  onClose: () => void;
}) {
  const [type, setType] = useState<CfType>("greater");
  const [target, setTarget] = useState(range);
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [text, setText] = useState("");
  const [n, setN] = useState("10");
  const [preset, setPreset] = useState(CF_PRESETS[0]);

  const needsNumber = ["greater", "less", "between", "equal"].includes(type);
  const needsN = type === "top" || type === "bottom";
  const needsText = type === "textContains";

  const submit = () => {
    onSave({
      id: `cf-${Date.now()}`,
      type,
      range: target.trim() || range,
      a: a || undefined,
      b: b || undefined,
      text: text || a || undefined,
      n: needsN ? Number(n) || 10 : undefined,
      fill: type === "dataBar" || type === "colorScale" ? undefined : preset.fill,
      color: type === "dataBar" || type === "colorScale" ? undefined : preset.color,
    });
    onClose();
  };

  return (
    <Dialog
      title="Conditional Formatting"
      subtitle="Range par rule lagao — Excel ki tarah colour apne aap badlega jab value badlegi."
      onClose={onClose}
      wide
      footer={
        <>
          {rules.length > 0 && (
            <button type="button" onClick={onClear} className="rounded-lg px-3 py-2 text-xs font-semibold text-(--color-danger) hover:bg-(--color-danger)/10">
              Clear all rules
            </button>
          )}
          <GhostButton onClick={onClose}>Cancel</GhostButton>
          <PrimaryButton onClick={submit}>
            <Check size={13} /> Apply rule
          </PrimaryButton>
        </>
      }
    >
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className={labelCls} htmlFor="cf-type">
            Rule type
          </label>
          <select id="cf-type" aria-label="Rule type" className={fieldCls} value={type} onChange={(event) => setType(event.target.value as CfType)}>
            {CF_TYPES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls} htmlFor="cf-range">
            Applies to
          </label>
          <input id="cf-range" aria-label="Applies to" className={fieldCls} value={target} onChange={(event) => setTarget(event.target.value)} />
        </div>
      </div>

      {needsNumber && (
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls} htmlFor="cf-a">
              Value
            </label>
            <input id="cf-a" aria-label="Rule value" className={fieldCls} value={a} onChange={(event) => setA(event.target.value)} placeholder="100" />
          </div>
          {type === "between" && (
            <div>
              <label className={labelCls} htmlFor="cf-b">
                And
              </label>
              <input id="cf-b" aria-label="Rule value 2" className={fieldCls} value={b} onChange={(event) => setB(event.target.value)} placeholder="500" />
            </div>
          )}
        </div>
      )}

      {needsText && (
        <div>
          <label className={labelCls} htmlFor="cf-text">
            Text
          </label>
          <input id="cf-text" aria-label="Rule text" className={fieldCls} value={text} onChange={(event) => setText(event.target.value)} placeholder="Pending" />
        </div>
      )}

      {needsN && (
        <div>
          <label className={labelCls} htmlFor="cf-n">
            How many
          </label>
          <input id="cf-n" aria-label="How many" type="number" min={1} className={fieldCls} value={n} onChange={(event) => setN(event.target.value)} />
        </div>
      )}

      {type !== "dataBar" && type !== "colorScale" && (
        <div>
          <span className={labelCls}>Format</span>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {CF_PRESETS.map((item) => (
              <button
                key={item.fill}
                type="button"
                onClick={() => setPreset(item)}
                style={{ backgroundColor: item.fill, color: item.color }}
                className={`rounded-lg border px-2 py-2 text-[11px] font-bold text-left ${
                  preset.fill === item.fill ? "border-(--color-accent) ring-1 ring-(--color-accent)" : "border-(--color-border)"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {rules.length > 0 && (
        <div className="rounded-xl border border-(--color-border) divide-y divide-(--color-border)">
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-(--color-muted)">Rules on this sheet</div>
          {rules.map((rule) => (
            <div key={rule.id} className="flex items-center justify-between gap-2 px-3 py-1.5 text-[11px]">
              <span className="text-(--color-ink)">
                <b>{rule.range}</b> · {CF_TYPES.find((item) => item.value === rule.type)?.label ?? rule.type}
                {rule.a ? ` ${rule.a}` : ""}
                {rule.b ? `–${rule.b}` : ""}
                {rule.text ? ` “${rule.text}”` : ""}
              </span>
              <button
                type="button"
                aria-label={`Delete rule for ${rule.range}`}
                onClick={() => onDelete(rule.id)}
                className="p-1 rounded text-(--color-danger) hover:bg-(--color-danger)/10"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </Dialog>
  );
}

/* ============================== filter =============================== */

export function FilterDialog({
  columns,
  filter,
  onApply,
  onClear,
  onClose,
}: {
  /** Header labels for the filter row, e.g. ["Item","Qty","City"]. */
  columns: { col: number; label: string }[];
  filter: SheetFilter | null;
  onApply: (filter: SheetFilter) => void;
  onClear: () => void;
  onClose: () => void;
}) {
  const [conditions, setConditions] = useState<ListFilter[]>(filter?.filters ?? []);

  const apply = () => {
    if (!filter) return;
    onApply({ ...filter, filters: conditions.filter((item) => item.op === "blank" || item.op === "nblank" || item.value !== "") });
    onClose();
  };

  const update = (index: number, patch: Partial<ListFilter>) =>
    setConditions((current) => current.map((item, i) => (i === index ? { ...item, ...patch } : item)));

  return (
    <Dialog
      title="Filter"
      subtitle="Excel ka AutoFilter — jo rows condition fail karengi woh chhup jaayengi (delete nahi hongi)."
      onClose={onClose}
      wide
      footer={
        <>
          <button type="button" onClick={onClear} className="rounded-lg px-3 py-2 text-xs font-semibold text-(--color-danger) hover:bg-(--color-danger)/10">
            Clear filter
          </button>
          <GhostButton onClick={onClose}>Cancel</GhostButton>
          <PrimaryButton onClick={apply}>
            <Check size={13} /> Apply filter
          </PrimaryButton>
        </>
      }
    >
      <div className="space-y-2">
        {conditions.map((condition, index) => (
          <div key={`${condition.column}-${index}`} className="rounded-xl border border-(--color-border) p-2.5 space-y-2">
            <div className="grid sm:grid-cols-3 gap-2">
              <select
                aria-label={`Filter column ${index + 1}`}
                className={fieldCls}
                value={condition.column}
                onChange={(event) => update(index, { column: Number(event.target.value) })}
              >
                {columns.map((item) => (
                  <option key={item.col} value={item.col}>
                    {item.label}
                  </option>
                ))}
              </select>
              <select
                aria-label={`Filter condition ${index + 1}`}
                className={fieldCls}
                value={condition.op}
                onChange={(event) => update(index, { op: event.target.value as FilterOp })}
              >
                {(Object.keys(FILTER_LABELS) as FilterOp[]).map((op) => (
                  <option key={op} value={op}>
                    {FILTER_LABELS[op]}
                  </option>
                ))}
              </select>
              <input
                aria-label={`Filter value ${index + 1}`}
                className={fieldCls}
                value={condition.value}
                disabled={condition.op === "blank" || condition.op === "nblank"}
                onChange={(event) => update(index, { value: event.target.value })}
                placeholder="Value"
              />
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                aria-label={`Remove condition ${index + 1}`}
                onClick={() => setConditions((current) => current.filter((_, i) => i !== index))}
                className="text-[11px] font-semibold text-(--color-danger) inline-flex items-center gap-1"
              >
                <Trash2 size={11} /> Remove
              </button>
            </div>
          </div>
        ))}
        {conditions.length === 0 && (
          <p className="text-xs text-(--color-muted)">
            Abhi koi condition nahi. “Add condition” dabao, column + condition chuno.
          </p>
        )}
        <GhostButton
          onClick={() =>
            setConditions((current) => [...current, { column: columns[0]?.col ?? 0, op: "contains", value: "" }])
          }
        >
          <span className="inline-flex items-center gap-1">
            <Plus size={12} /> Add condition
          </span>
        </GhostButton>
        <p className="text-[11px] text-(--color-muted)">
          Multiple conditions Excel ki tarah AND hote hain — sabhi sach hone chahiye.
        </p>
      </div>
    </Dialog>
  );
}

/* =========================== name manager ============================ */

export function NameManagerDialog({
  names,
  selection,
  onSave,
  onDelete,
  onGoTo,
  onClose,
}: {
  names: NamedRange[];
  selection: string;
  onSave: (name: NamedRange) => void;
  onDelete: (id: string) => void;
  onGoTo: (range: string) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [range, setRange] = useState(selection);
  const valid = /^[A-Za-z_\\][A-Za-z0-9_.]*$/.test(name.trim()) && !/^[A-Z]{1,3}\d+$/i.test(name.trim());

  return (
    <Dialog
      title="Name Manager"
      subtitle="Range ko naam do (jaise Sales), phir =SUM(Sales) likho — Formulas ▸ Name Manager."
      onClose={onClose}
      wide
      footer={
        <>
          <GhostButton onClick={onClose}>Close</GhostButton>
          <PrimaryButton
            disabled={!valid}
            onClick={() => {
              onSave({ id: `n-${Date.now()}`, name: name.trim(), range: range.trim() });
              setName("");
            }}
          >
            <Plus size={13} /> Add name
          </PrimaryButton>
        </>
      }
    >
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className={labelCls} htmlFor="nm-name">
            Name
          </label>
          <input id="nm-name" aria-label="Range name" className={fieldCls} value={name} onChange={(event) => setName(event.target.value)} placeholder="Sales" />
          {name && !valid && <p className="text-[11px] text-(--color-danger) mt-1">Letters, digits and _ only — not like a cell (A1).</p>}
        </div>
        <div>
          <label className={labelCls} htmlFor="nm-range">
            Refers to
          </label>
          <input id="nm-range" aria-label="Range reference" className={fieldCls} value={range} onChange={(event) => setRange(event.target.value)} placeholder="B2:B30" />
        </div>
      </div>
      <div className="rounded-xl border border-(--color-border) divide-y divide-(--color-border)">
        {names.length === 0 && <p className="px-3 py-2 text-xs text-(--color-muted)">Koi naam nahi. Upar se add karo.</p>}
        {names.map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-2 px-3 py-2 text-xs">
            <span className="text-(--color-ink)">
              <b className="font-mono">{item.name}</b> <span className="text-(--color-muted)">= {item.range}</span>
            </span>
            <span className="flex items-center gap-1">
              <button type="button" onClick={() => onGoTo(item.range)} className="px-2 py-0.5 rounded border border-(--color-border) text-[11px] font-semibold">
                Go to
              </button>
              <button
                type="button"
                aria-label={`Delete name ${item.name}`}
                onClick={() => onDelete(item.id)}
                className="p-1 rounded text-(--color-danger) hover:bg-(--color-danger)/10"
              >
                <Trash2 size={12} />
              </button>
            </span>
          </div>
        ))}
      </div>
    </Dialog>
  );
}

/* =============================== go to =============================== */

export function GoToDialog({
  onGo,
  names,
  onClose,
}: {
  onGo: (range: string) => void;
  names: NamedRange[];
  onClose: () => void;
}) {
  const [value, setValue] = useState("");
  return (
    <Dialog
      title="Go To"
      subtitle="Cell address ya named range likho — F5 jaise."
      onClose={onClose}
      footer={
        <>
          <GhostButton onClick={onClose}>Cancel</GhostButton>
          <PrimaryButton
            disabled={!value.trim()}
            onClick={() => {
              onGo(value.trim());
              onClose();
            }}
          >
            Go
          </PrimaryButton>
        </>
      }
    >
      <input aria-label="Go to address" autoFocus className={`${fieldCls} font-mono`} value={value} onChange={(event) => setValue(event.target.value)} placeholder="C12 or Sales" />
      {names.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {names.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setValue(item.name)}
              className="rounded-full border border-(--color-border) px-2.5 py-1 text-[11px] font-semibold text-(--color-ink) hover:bg-(--color-accent-soft)"
            >
              {item.name}
            </button>
          ))}
        </div>
      )}
    </Dialog>
  );
}

/* =========================== format cells =========================== */

const BUILTIN_FORMATS = [
  { code: "General", sample: "1234.5" },
  { code: "#,##0", sample: "1,235" },
  { code: "#,##0.00", sample: "1,234.50" },
  { code: "0.00", sample: "1234.50" },
  { code: "0.00%", sample: "12.35%" },
  { code: "₹#,##0.00", sample: "₹1,234.50" },
  { code: "dd-mm-yyyy", sample: "07-11-2026" },
  { code: "dd-mmm-yy", sample: "07-Nov-26" },
  { code: "hh:mm", sample: "14:30" },
];

export function FormatCellsDialog({
  current,
  onApply,
  onClose,
}: {
  current: { format?: string; fill?: string; color?: string; bold?: boolean; italic?: boolean; underline?: boolean; align?: string; wrap?: boolean };
  onApply: (patch: Record<string, unknown>) => void;
  onClose: () => void;
}) {
  const [format, setFormat] = useState(current.format ?? "General");
  const [fill, setFill] = useState(current.fill ?? "");
  const [color, setColor] = useState(current.color ?? "");
  const [bold, setBold] = useState(Boolean(current.bold));
  const [italic, setItalic] = useState(Boolean(current.italic));
  const [underline, setUnderline] = useState(Boolean(current.underline));
  const [align, setAlign] = useState(current.align ?? "");
  const [wrap, setWrap] = useState(Boolean(current.wrap));
  const fills = useMemo(() => ["", "#fef9c3", "#dcfce7", "#fee2e2", "#dbeafe", "#f3e8ff", "#f1f5f9"], []);

  return (
    <Dialog
      title="Format Cells"
      subtitle="Number format, colour aur alignment — Ctrl+1 jaisa."
      onClose={onClose}
      wide
      footer={
        <>
          <GhostButton onClick={onClose}>Cancel</GhostButton>
          <PrimaryButton
            onClick={() => {
              onApply({ format, fill: fill || undefined, color: color || undefined, bold, italic, underline, align: align || undefined, wrap });
              onClose();
            }}
          >
            <Check size={13} /> OK
          </PrimaryButton>
        </>
      }
    >
      <div>
        <span className={labelCls}>Number format</span>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
          {BUILTIN_FORMATS.map((item) => (
            <button
              key={item.code}
              type="button"
              onClick={() => setFormat(item.code)}
              className={`rounded-lg border px-2 py-1.5 text-left text-[11px] ${
                format === item.code ? "border-(--color-accent) bg-(--color-accent-soft)" : "border-(--color-border)"
              }`}
            >
              <div className="font-mono font-bold text-(--color-ink)">{item.code}</div>
              <div className="text-(--color-muted)">{item.sample}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <span className={labelCls}>Fill</span>
          <div className="flex flex-wrap gap-1.5">
            {fills.map((swatch) => (
              <button
                key={swatch || "none"}
                type="button"
                aria-label={`Fill ${swatch || "none"}`}
                onClick={() => setFill(swatch)}
                style={swatch ? { backgroundColor: swatch } : undefined}
                className={`h-7 w-7 rounded-md border ${fill === swatch ? "border-(--color-accent) ring-2 ring-(--color-accent)" : "border-(--color-border)"} ${swatch ? "" : "text-[10px] text-(--color-muted)"}`}
              >
                {swatch ? "" : "✕"}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className={labelCls} htmlFor="fc-color">
            Font colour
          </label>
          <input id="fc-color" aria-label="Font colour" type="color" value={color || "#111827"} onChange={(event) => setColor(event.target.value)} className="h-8 w-16 rounded-md border border-(--color-border) bg-transparent" />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs">
        {[
          ["Bold", bold, setBold],
          ["Italic", italic, setItalic],
          ["Underline", underline, setUnderline],
          ["Wrap text", wrap, setWrap],
        ].map(([label, value, setter]) => (
          <label key={String(label)} className="inline-flex items-center gap-1.5 text-(--color-ink)">
            <input type="checkbox" checked={Boolean(value)} onChange={(event) => (setter as (v: boolean) => void)(event.target.checked)} /> {String(label)}
          </label>
        ))}
        <select aria-label="Alignment" className={`${fieldCls} !w-36`} value={align} onChange={(event) => setAlign(event.target.value)}>
          <option value="">Align (auto)</option>
          <option value="left">Left</option>
          <option value="center">Center</option>
          <option value="right">Right</option>
        </select>
      </div>
    </Dialog>
  );
}
