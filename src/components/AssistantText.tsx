import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { copyText } from "../lib/clipboard";

/**
 * Renders Aarohi's answers.
 *
 * The chat used to render the raw text with `whitespace-pre-wrap`, so bold
 * markers, `code`, numbered steps and the small ASCII tables all showed up as
 * punctuation. This turns the same text into what it was always meant to look
 * like — using ONLY the app's existing tokens (accent-soft, surface, border,
 * muted), so the purple/neumorphic theme is untouched.
 */

interface Block {
  kind: "p" | "code" | "table" | "ol" | "ul" | "h";
  lines?: string[];
  lang?: string;
}

/** Split an answer into blocks. Kept deliberately small and predictable. */
function toBlocks(text: string): Block[] {
  const blocks: Block[] = [];
  const lines = text.split("\n");
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    if (line.trim().startsWith("```")) {
      const lang = line.trim().slice(3).trim();
      const body: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        body.push(lines[i]);
        i++;
      }
      i++; // closing fence
      // An ASCII table inside a code block is a table, not code.
      const isTable = body.length > 1 && body.filter((l) => l.includes(" | ")).length >= body.length - 1;
      blocks.push(isTable ? { kind: "table", lines: body } : { kind: "code", lines: body, lang });
      continue;
    }

    if (!line.trim()) {
      i++;
      continue;
    }

    // A markdown table written directly (the online models return these).
    if (line.includes("|") && lines[i + 1]?.match(/^\s*\|?[\s:-]+\|/)) {
      const body: string[] = [];
      while (i < lines.length && lines[i].includes("|")) {
        if (!/^\s*\|?[\s:-]+\|/.test(lines[i])) body.push(lines[i]);
        i++;
      }
      blocks.push({ kind: "table", lines: body });
      continue;
    }

    if (/^\d+[.)]\s/.test(line.trim())) {
      const body: string[] = [];
      while (i < lines.length && (/^\d+[.)]\s/.test(lines[i].trim()) || /^\s{2,}\S/.test(lines[i]))) {
        body.push(lines[i]);
        i++;
      }
      blocks.push({ kind: "ol", lines: body });
      continue;
    }

    if (/^[•\-*]\s/.test(line.trim())) {
      const body: string[] = [];
      while (i < lines.length && /^[•\-*]\s/.test(lines[i].trim())) {
        body.push(lines[i]);
        i++;
      }
      blocks.push({ kind: "ul", lines: body });
      continue;
    }

    if (/^#{1,4}\s/.test(line.trim()) || /^\*\*[^*]+\*\*$/.test(line.trim())) {
      blocks.push({ kind: "h", lines: [line.replace(/^#{1,4}\s/, "")] });
      i++;
      continue;
    }

    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].trim().startsWith("```") &&
      !/^\d+[.)]\s/.test(lines[i].trim()) &&
      !/^[•\-*]\s/.test(lines[i].trim())
    ) {
      para.push(lines[i]);
      i++;
    }
    blocks.push({ kind: "p", lines: para });
  }
  return blocks;
}

/** **bold** and `code` inside one line. */
function Inline({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter((p) => p !== "");
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={i} className="font-bold text-(--color-ink)">
              {part.slice(2, -2)}
            </strong>
          );
        }
        if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
          return (
            <code
              key={i}
              className="rounded-md bg-(--color-surface) px-1.5 py-0.5 font-mono text-[0.85em] text-(--color-accent-dark) break-words"
            >
              {part.slice(1, -1)}
            </code>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

function CopyLine({ value }: { value: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      type="button"
      aria-label="Formula copy karo"
      title="Copy"
      onClick={() => {
        void copyText(value).then((done) => {
          if (!done) return;
          setOk(true);
          setTimeout(() => setOk(false), 1200);
        });
      }}
      className="p-1.5 rounded-lg text-(--color-muted) hover:bg-(--color-accent-soft) shrink-0"
    >
      {ok ? <Check size={13} /> : <Copy size={13} />}
    </button>
  );
}

function Table({ rows }: { rows: string[] }) {
  const cells = rows.map((r) =>
    r
      .replace(/^\s*\|/, "")
      .replace(/\|\s*$/, "")
      .split("|")
      .map((c) => c.trim()),
  );
  const [head, ...body] = cells;
  return (
    <div className="my-2 overflow-x-auto rounded-xl border border-(--color-border)">
      <table className="w-full text-left text-[13px]">
        <thead>
          <tr className="bg-(--color-accent-soft)">
            {head.map((c, i) => (
              <th key={i} className="px-2.5 py-1.5 font-bold whitespace-nowrap">
                <Inline text={c} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, r) => (
            <tr key={r} className={r % 2 ? "bg-(--color-surface)/60" : ""}>
              {row.map((c, i) => (
                <td key={i} className="px-2.5 py-1.5 align-top whitespace-nowrap">
                  <Inline text={c} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AssistantText({ text }: { text: string }) {
  const blocks = toBlocks(text);
  return (
    <div className="space-y-1.5">
      {blocks.map((block, i) => {
        if (block.kind === "table") return <Table key={i} rows={block.lines ?? []} />;

        if (block.kind === "code") {
          const value = (block.lines ?? []).join("\n");
          const isFormula = /^=/.test(value.trim());
          return (
            <div key={i} className="my-2 rounded-xl bg-(--color-surface) border border-(--color-border)">
              <div className="flex items-start gap-1 px-2.5 py-2">
                <pre className="flex-1 overflow-x-auto font-mono text-[12.5px] leading-relaxed whitespace-pre">
                  <code>{value}</code>
                </pre>
                <CopyLine value={value} />
              </div>
              {isFormula && (
                <p className="px-2.5 pb-1.5 text-[11px] text-(--color-muted)">Copy karke Excel me paste karo — address apne data ke hisaab se badal lena.</p>
              )}
            </div>
          );
        }

        if (block.kind === "ol") {
          const items: string[] = [];
          for (const raw of block.lines ?? []) {
            if (/^\d+[.)]\s/.test(raw.trim())) items.push(raw.trim().replace(/^\d+[.)]\s*/, ""));
            else if (items.length) items[items.length - 1] += "\n" + raw.trim();
          }
          return (
            <ol key={i} className="space-y-1.5 my-1">
              {items.map((item, n) => (
                <li key={n} className="flex gap-2">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-(--color-accent) text-[11px] font-bold text-white">
                    {n + 1}
                  </span>
                  <span className="flex-1 break-words">
                    <Inline text={item} />
                  </span>
                </li>
              ))}
            </ol>
          );
        }

        if (block.kind === "ul") {
          return (
            <ul key={i} className="space-y-1 my-1">
              {(block.lines ?? []).map((raw, n) => (
                <li key={n} className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-(--color-accent)" />
                  <span className="flex-1 break-words">
                    <Inline text={raw.trim().replace(/^[•\-*]\s*/, "")} />
                  </span>
                </li>
              ))}
            </ul>
          );
        }

        if (block.kind === "h") {
          return (
            <p key={i} className="font-bold text-(--color-ink) pt-1 break-words">
              <Inline text={(block.lines ?? []).join(" ")} />
            </p>
          );
        }

        return (
          <p key={i} className="break-words">
            {(block.lines ?? []).map((line, n) => (
              <span key={n} className="block">
                <Inline text={line} />
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}
