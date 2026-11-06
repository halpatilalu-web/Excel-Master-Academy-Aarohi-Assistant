/**
 * Tokeniser + parser for Excel formula syntax.
 *
 * Produces a small AST that the evaluator walks. Keeping parsing separate means
 * a malformed formula fails once, at entry, instead of mid-calculation, and the
 * AST can be cached per cell (the grid re-evaluates hundreds of cells on every
 * keystroke).
 */
import type { ErrorCode } from "./core";

export type Node =
  | { t: "num"; v: number }
  | { t: "str"; v: string }
  | { t: "bool"; v: boolean }
  | { t: "err"; v: ErrorCode }
  | { t: "missing" }
  | { t: "ref"; sheet: string | null; row: number; col: number; rowAbs: boolean; colAbs: boolean }
  | { t: "range"; sheet: string | null; r1: number; c1: number; r2: number; c2: number; whole: boolean }
  | { t: "name"; v: string }
  | { t: "func"; name: string; args: Node[] }
  | { t: "array"; rows: Node[][] }
  | { t: "binary"; op: string; l: Node; r: Node }
  | { t: "unary"; op: "+" | "-" | "@"; v: Node }
  | { t: "pct"; v: Node }
  | { t: "call"; fn: Node; args: Node[] };

interface Token {
  kind: "num" | "str" | "bool" | "err" | "ref" | "name" | "op" | "lparen" | "rparen" | "comma" | "semi" | "lbrace" | "rbrace" | "colon" | "bang" | "sheet";
  text: string;
  sheet?: string;
  rowAbs?: boolean;
  colAbs?: boolean;
}

const ERROR_LITERALS: ErrorCode[] = [
  "#NULL!",
  "#DIV/0!",
  "#VALUE!",
  "#REF!",
  "#NAME?",
  "#NUM!",
  "#N/A",
  "#SPILL!",
  "#CALC!",
];

const REF_RE = /^\$?[A-Za-z]{1,3}\$?\d{1,7}/;
const WHOLE_COL_RE = /^\$?[A-Za-z]{1,3}(?=:)/;
const WHOLE_ROW_RE = /^\$?\d{1,7}(?=:)/;

export class ParseError extends Error {}

interface RefPayload {
  r1: number;
  c1: number;
  r2: number;
  c2: number;
  whole?: boolean;
  sheet?: string | null;
}

export function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const n = input.length;

  const push = (tok: Token) => tokens.push(tok);

  while (i < n) {
    const ch = input[i];

    if (ch === " " || ch === "\t" || ch === "\n" || ch === "\r") {
      i++;
      continue;
    }

    if (ch === '"') {
      let out = "";
      i++;
      while (i < n) {
        if (input[i] === '"') {
          if (input[i + 1] === '"') {
            out += '"';
            i += 2;
            continue;
          }
          i++;
          break;
        }
        out += input[i++];
      }
      push({ kind: "str", text: out });
      continue;
    }

    if (ch === "'") {
      // Quoted sheet name: 'My Sheet'!A1
      let out = "";
      i++;
      while (i < n && input[i] !== "'") {
        if (input[i] === "'" && input[i + 1] === "'") {
          out += "'";
          i += 2;
          continue;
        }
        out += input[i++];
      }
      i++; // closing quote
      if (input[i] === "!") i++;
      push({ kind: "sheet", text: out });
      continue;
    }

    if (ch === "#") {
      const rest = input.slice(i).toUpperCase();
      const hit = ERROR_LITERALS.find((e) => rest.startsWith(e));
      if (hit) {
        push({ kind: "err", text: hit });
        i += hit.length;
        continue;
      }
      throw new ParseError(`Unknown error literal at ${i}`);
    }

    // Whole-row ranges (SUM(1:1), AVERAGE(2:5)) start with a digit, so they must
    // be recognised before the number branch swallows the "1" as a literal.
    const restAtRow = input.slice(i);
    const wholeRow = WHOLE_ROW_RE.exec(restAtRow);
    if (wholeRow && restAtRow[wholeRow[0].length] === ":") {
      const secondRow = /^\$?\d{1,7}/.exec(restAtRow.slice(wholeRow[0].length + 1));
      if (secondRow) {
        push({
          kind: "ref",
          text: JSON.stringify({
            r1: Number(wholeRow[0].replace(/\$/g, "")) - 1,
            c1: 0,
            r2: Number(secondRow[0].replace(/\$/g, "")) - 1,
            c2: 16_383,
            whole: true,
            sheet: null,
          }),
        });
        i += wholeRow[0].length + 1 + secondRow[0].length;
        continue;
      }
    }

    if (/[0-9]/.test(ch) || (ch === "." && /[0-9]/.test(input[i + 1] ?? ""))) {
      const m = /^\d*\.?\d+(?:[eE][+-]?\d+)?/.exec(input.slice(i));
      if (m) {
        push({ kind: "num", text: m[0] });
        i += m[0].length;
        continue;
      }
    }

    if (/[A-Za-z_$\\]/.test(ch)) {
      const rest = input.slice(i);
      const sheetPrefix = tokens.length && tokens[tokens.length - 1].kind === "sheet" ? tokens[tokens.length - 1] : null;

      // A1, $A$1, A1:B9, A:A, 1:1 — references are recognised before names.
      const refMatch = REF_RE.exec(rest);
      if (refMatch && !/^[A-Za-z_][A-Za-z0-9_.]*\(/.test(rest)) {
        const ref = refMatch[0];
        const parts = /^(\$?)([A-Za-z]{1,3})(\$?)(\d{1,7})$/.exec(ref);
        if (parts) {
          const rowAbs = parts[3] === "$";
          const colAbs = parts[1] === "$";
          const col = colIndex(parts[2]);
          const row = Number(parts[4]) - 1;
          const afterRef = rest.slice(ref.length);
          if (afterRef.startsWith(":")) {
            const tail = afterRef.slice(1);
            const ref2 = REF_RE.exec(tail);
            if (ref2) {
              const p2 = /^(\$?)([A-Za-z]{1,3})(\$?)(\d{1,7})$/.exec(ref2[0]);
              if (p2) {
                if (sheetPrefix) tokens.pop();
                push({
                  kind: "ref",
                  text: JSON.stringify({
                    r1: row,
                    c1: col,
                    r2: Number(p2[4]) - 1,
                    c2: colIndex(p2[2]),
                    sheet: sheetPrefix?.text ?? null,
                  }),
                });
                i += ref.length + 1 + ref2[0].length;
                continue;
              }
            }
          } else {
            if (sheetPrefix) tokens.pop();
            push({
              kind: "ref",
              text: JSON.stringify({ r1: row, c1: col, r2: row, c2: col, whole: false, sheet: sheetPrefix?.text ?? null }),
            });
            i += ref.length;
            continue;
          }
        }
      }

      // Whole-column range like A:A or whole-row like 1:1.
      const wholeCol = WHOLE_COL_RE.exec(rest);
      if (wholeCol && rest[wholeCol[0].length] === ":") {
        const second = /^\$?[A-Za-z]{1,3}/.exec(rest.slice(wholeCol[0].length + 1));
        if (second) {
          if (sheetPrefix) tokens.pop();
          push({
            kind: "ref",
            text: JSON.stringify({
              r1: 0,
              c1: colIndex(wholeCol[0].replace(/\$/g, "")),
              r2: 1_048_575,
              c2: colIndex(second[0].replace(/\$/g, "")),
              whole: true,
              sheet: sheetPrefix?.text ?? null,
            }),
          });
          i += wholeCol[0].length + 1 + second[0].length;
          continue;
        }
      }

      const word = /^[A-Za-z_\\][A-Za-z0-9_.\\]*/.exec(rest);
      if (!word) throw new ParseError(`Unexpected character "${ch}"`);
      const after = rest.slice(word[0].length);
      if (after.startsWith("(")) {
        push({ kind: "name", text: word[0].toUpperCase() });
        i += word[0].length;
        continue;
      }
      if (input[i + word[0].length] === "!") {
        push({ kind: "sheet", text: word[0] });
        i += word[0].length + 1;
        continue;
      }
      const upper = word[0].toUpperCase();
      if (upper === "TRUE" || upper === "FALSE") {
        push({ kind: "bool", text: upper });
        i += word[0].length;
        continue;
      }
      push({ kind: "name", text: upper });
      i += word[0].length;
      continue;
    }

    switch (ch) {
      case "(":
        push({ kind: "lparen", text: ch });
        i++;
        continue;
      case ")":
        push({ kind: "rparen", text: ch });
        i++;
        continue;
      case ",":
        push({ kind: "comma", text: ch });
        i++;
        continue;
      case ";":
        push({ kind: "semi", text: ch });
        i++;
        continue;
      case "{":
        push({ kind: "lbrace", text: ch });
        i++;
        continue;
      case "}":
        push({ kind: "rbrace", text: ch });
        i++;
        continue;
      case ":":
        push({ kind: "colon", text: ch });
        i++;
        continue;
      case "!":
        push({ kind: "bang", text: ch });
        i++;
        continue;
      case "%":
        push({ kind: "op", text: "%" });
        i++;
        continue;
      case "&":
        push({ kind: "op", text: "&" });
        i++;
        continue;
      case "+":
      case "-":
      case "*":
      case "/":
      case "^":
      case "=":
      case "@":
        push({ kind: "op", text: ch });
        i++;
        continue;
      case "<":
      case ">":
        if (input[i + 1] === "=") {
          push({ kind: "op", text: `${ch}=` });
          i += 2;
        } else if (input[i + 1] === ">") {
          push({ kind: "op", text: "<>" });
          i += 2;
        } else {
          push({ kind: "op", text: ch });
          i++;
        }
        continue;
      default:
        throw new ParseError(`Unexpected character "${ch}"`);
    }
  }

  return tokens;
}

function colIndex(col: string): number {
  let n = 0;
  for (const ch of col.toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

class Parser {
  private pos = 0;

  constructor(private readonly tokens: Token[]) {}

  parse(): Node {
    const node = this.comparison();
    if (this.pos < this.tokens.length) throw new ParseError("Unexpected trailing input");
    return node;
  }

  private peek(offset = 0): Token | undefined {
    return this.tokens[this.pos + offset];
  }

  private next(): Token | undefined {
    return this.tokens[this.pos++];
  }

  private accept(kind: Token["kind"], text?: string): Token | null {
    const tok = this.peek();
    if (!tok || tok.kind !== kind) return null;
    if (text !== undefined && tok.text !== text) return null;
    this.pos++;
    return tok;
  }

  private comparison(): Node {
    let left = this.concat();
    for (;;) {
      const tok = this.peek();
      if (tok?.kind === "op" && ["=", "<>", "<", ">", "<=", ">="].includes(tok.text)) {
        this.pos++;
        left = { t: "binary", op: tok.text, l: left, r: this.concat() };
        continue;
      }
      return left;
    }
  }

  private concat(): Node {
    let left = this.additive();
    for (;;) {
      const tok = this.peek();
      if (tok?.kind === "op" && tok.text === "&") {
        this.pos++;
        left = { t: "binary", op: "&", l: left, r: this.additive() };
        continue;
      }
      return left;
    }
  }

  private additive(): Node {
    let left = this.term();
    for (;;) {
      const tok = this.peek();
      if (tok?.kind === "op" && (tok.text === "+" || tok.text === "-")) {
        this.pos++;
        left = { t: "binary", op: tok.text, l: left, r: this.term() };
        continue;
      }
      return left;
    }
  }

  private term(): Node {
    let left = this.power();
    for (;;) {
      const tok = this.peek();
      if (tok?.kind === "op" && (tok.text === "*" || tok.text === "/")) {
        this.pos++;
        left = { t: "binary", op: tok.text, l: left, r: this.power() };
        continue;
      }
      return left;
    }
  }

  private power(): Node {
    let left = this.unary();
    for (;;) {
      const tok = this.peek();
      if (tok?.kind === "op" && tok.text === "^") {
        this.pos++;
        left = { t: "binary", op: "^", l: left, r: this.unary() };
        continue;
      }
      return left;
    }
  }

  private unary(): Node {
    const tok = this.peek();
    if (tok?.kind === "op" && (tok.text === "-" || tok.text === "+" || tok.text === "@")) {
      this.pos++;
      return { t: "unary", op: tok.text as "+" | "-" | "@", v: this.unary() };
    }
    return this.postfix();
  }

  private postfix(): Node {
    let node = this.primary();
    for (;;) {
      const tok = this.peek();
      if (tok?.kind === "op" && tok.text === "%") {
        this.pos++;
        node = { t: "pct", v: node };
        continue;
      }
      // LAMBDA(x, x*2)(21) — calling a value that evaluates to a LAMBDA.
      if (tok?.kind === "lparen") {
        this.pos++;
        const args: Node[] = [];
        if (this.peek()?.kind !== "rparen") {
          for (;;) {
            args.push(this.peek()?.kind === "comma" ? { t: "missing" } : this.comparison());
            const sep = this.peek();
            if (sep?.kind === "comma") {
              this.pos++;
              continue;
            }
            break;
          }
        }
        if (!this.accept("rparen")) throw new ParseError("Missing )");
        node = { t: "call", fn: node, args };
        continue;
      }
      return node;
    }
  }

  private primary(): Node {
    const tok = this.next();
    if (!tok) throw new ParseError("Unexpected end of formula");

    switch (tok.kind) {
      case "num":
        return { t: "num", v: Number(tok.text) };
      case "str":
        return { t: "str", v: tok.text };
      case "bool":
        return { t: "bool", v: tok.text === "TRUE" };
      case "err":
        return { t: "err", v: tok.text as ErrorCode };
      case "sheet":
        // 'Sheet'!A1 or Sheet1!A1 — the reference token follows.
        return this.primaryWithSheet(tok.text);
      case "lparen": {
        const inner = this.comparison();
        if (!this.accept("rparen")) throw new ParseError("Missing )");
        return inner;
      }
      case "lbrace": {
        const rows: Node[][] = [];
        let row: Node[] = [];
        for (;;) {
          if (this.peek()?.kind === "rbrace") {
            this.pos++;
            break;
          }
          row.push(this.comparison());
          const sep = this.peek();
          if (sep?.kind === "comma") {
            this.pos++;
            continue;
          }
          if (sep?.kind === "semi") {
            this.pos++;
            rows.push(row);
            row = [];
            continue;
          }
          if (sep?.kind === "rbrace") {
            this.pos++;
            break;
          }
          throw new ParseError("Bad array constant");
        }
        rows.push(row);
        return { t: "array", rows };
      }
      case "name": {
        if (this.peek()?.kind === "lparen") {
          this.pos++;
          const args: Node[] = [];
          if (this.peek()?.kind !== "rparen") {
            for (;;) {
              if (this.peek()?.kind === "comma" || this.peek()?.kind === "rparen") {
                args.push({ t: "missing" });
              } else {
                args.push(this.comparison());
              }
              const sep = this.peek();
              if (sep?.kind === "comma") {
                this.pos++;
                continue;
              }
              break;
            }
          }
          if (!this.accept("rparen")) throw new ParseError("Missing )");
          return { t: "func", name: tok.text, args };
        }
        if (this.peek()?.kind === "bang") {
          // Sheet1!A1 written without quotes.
          this.pos++;
          return this.primaryWithSheet(tok.text);
        }
        return { t: "name", v: tok.text };
      }
      case "ref": {
        const parsed = JSON.parse(tok.text) as RefPayload;
        if (parsed.r1 === parsed.r2 && parsed.c1 === parsed.c2 && !parsed.whole) {
          return { t: "ref", sheet: parsed.sheet ?? null, row: parsed.r1, col: parsed.c1, rowAbs: false, colAbs: false };
        }
        return {
          t: "range",
          sheet: parsed.sheet ?? null,
          r1: parsed.r1,
          c1: parsed.c1,
          r2: parsed.r2,
          c2: parsed.c2,
          whole: Boolean(parsed.whole),
        };
      }
      default:
        throw new ParseError(`Unexpected token ${tok.text}`);
    }
  }

  private primaryWithSheet(sheet: string): Node {
    const tok = this.next();
    if (!tok || tok.kind !== "ref") throw new ParseError("Expected a cell after sheet name");
    const parsed = JSON.parse(tok.text) as RefPayload;
    if (parsed.r1 === parsed.r2 && parsed.c1 === parsed.c2 && !parsed.whole) {
      return { t: "ref", sheet, row: parsed.r1, col: parsed.c1, rowAbs: false, colAbs: false };
    }
    return {
      t: "range",
      sheet,
      r1: parsed.r1,
      c1: parsed.c1,
      r2: parsed.r2,
      c2: parsed.c2,
      whole: Boolean(parsed.whole),
    };
  }
}

const cache = new Map<string, Node>();

export function parseFormula(formula: string): Node {
  const body = formula.startsWith("=") ? formula.slice(1) : formula;
  const hit = cache.get(body);
  if (hit) return hit;
  const node = new Parser(tokenize(body)).parse();
  if (cache.size > 3000) cache.clear();
  cache.set(body, node);
  return node;
}

/** True when the text looks like a formula (leading "=" outside a string). */
export function isFormula(text: string): boolean {
  return typeof text === "string" && text.trimStart().startsWith("=");
}

export function collectNames(node: Node, out: Set<string> = new Set()): Set<string> {
  switch (node.t) {
    case "name":
      out.add(node.v);
      break;
    case "func":
      node.args.forEach((a) => collectNames(a, out));
      break;
    case "binary":
      collectNames(node.l, out);
      collectNames(node.r, out);
      break;
    case "unary":
    case "pct":
      collectNames(node.v, out);
      break;
    case "call":
      collectNames(node.fn, out);
      node.args.forEach((a) => collectNames(a, out));
      break;
    case "array":
      node.rows.forEach((r) => r.forEach((c) => collectNames(c, out)));
      break;
    default:
      break;
  }
  return out;
}
