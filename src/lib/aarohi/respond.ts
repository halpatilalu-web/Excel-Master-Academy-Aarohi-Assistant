/**
 * One place where Aarohi decides where her answer comes from.
 *
 *   1. The built-in brain, when it knows the topic. This is instant, free and
 *      works offline, so the student never waits for a network round trip just
 *      to hear what VLOOKUP is.
 *   2. The online model (`/api/assistant` → Gemini / OpenAI-compatible / Orvis),
 *      for anything the brain flags as low confidence and for genuinely open
 *      questions.
 *   3. The brain's text as the fallback when the network fails.
 *
 * Both chat surfaces (the full Aarohi screen and the floating panel) call this,
 * so they always behave the same way.
 */
import type { BrainReply, Lang } from "./brain";
import { aarohiReply } from "../../data/tutor";
import { askAssistant, type ChatMsg } from "../assistant";
import { activeProvider, askDirect, loadConfig, type AiConfig } from "./provider";

export interface Turn {
  from: "me" | "bot";
  text: string;
}

export interface Reply {
  text: string;
  /** "brain" = offline tutor, "online" = a model answered. */
  source: "brain" | "online";
  conceptId?: string;
  chips?: string[];
  /** True when the model could not be reached and the offline answer is thin. */
  degraded?: boolean;
  /** Human-readable reason the model failed, when it did. */
  error?: string;
}

export interface RespondOptions {
  lang?: Lang;
  /** Saved AI settings; read from localStorage when omitted. */
  config?: AiConfig;
  /** The conversation BEFORE the question, oldest first. */
  history: Turn[];
  /** Set to false to stay strictly offline (static hosts, tests). */
  online?: boolean;
}

/**
 * The brain is ~80 kB of teaching notes: useful on the chat screen and dead
 * weight on the dashboard, so it is imported on the first question and cached
 * by the browser (and by the service worker) from then on. `fallbackBrain` keeps
 * the chat alive if that chunk cannot be fetched at all.
 */
type BrainModule = typeof import("./brain");
let brainPromise: Promise<BrainModule | null> | null = null;

function loadBrain(): Promise<BrainModule | null> {
  brainPromise ??= import("./brain").catch(() => null);
  return brainPromise;
}

/** The offline answer should yield to the model when the brain is guessing. */
function needsModel(reply: BrainReply): boolean {
  return reply.confident === false;
}

export async function respond(question: string, options: RespondOptions): Promise<Reply> {
  const { history, lang, online = true } = options;
  const module = await loadBrain();
  const brain: BrainReply = module
    ? module.aarohiBrain(question, { history, lang })
    : {
        // Last resort when the brain chunk itself failed to load: the compact
        // one-liner tutor that ships with the entry bundle.
        text: aarohiReply(question, history.map((m) => m.text)),
        source: "brain",
      };

  if (!needsModel(brain) || !online) {
    return {
      text: brain.text,
      source: brain.source,
      conceptId: brain.conceptId,
      chips: brain.chips,
    };
  }

  const messages: ChatMsg[] = [...history, { from: "me", text: question } as Turn]
    .slice(-16)
    .map((m) => ({ role: m.from === "me" ? "user" : "assistant", content: m.text }));

  const config: AiConfig = options.config ?? loadConfig();

  // 1. A key saved in this browser (static hosts have no /api at all) — the
  //    provider is called directly, so it works on GitHub Pages and Vercel.
  if (activeProvider(config) !== "server") {
    try {
      const reply = await askDirect(config, messages);
      return { text: reply, source: "online", conceptId: brain.conceptId, chips: brain.chips };
    } catch (error) {
      const message = error instanceof Error ? error.message : "AI se connect nahi ho paya.";
      return {
        text: [
          brain.text,
          "",
          `_${message}_`,
          "",
          "_Yahan maine apne built-in notes se jawab diya. Aarohi → AI settings me key theek karke dobara poochho._",
        ].join("\n"),
        source: "brain",
        conceptId: brain.conceptId,
        chips: brain.chips,
        degraded: true,
        error: message,
      };
    }
  }

  // 2. "Sirf built-in" means exactly that: no request of any kind, ever.
  if (config.provider === "local") {
    return { text: brain.text, source: "brain", conceptId: brain.conceptId, chips: brain.chips };
  }

  // 3. The app's own server (Docker, Render, local dev), where the key lives in
  //    the environment and never reaches the browser.
  try {
    const reply = await askAssistant(messages);
    return { text: reply, source: "online", conceptId: brain.conceptId, chips: brain.chips };
  } catch {
    return {
      text: [
        brain.text,
        "",
        "_Online AI se abhi connect nahi ho paya, isliye maine apne built-in notes se jawab diya. Server/API key lagte hi isi sawal ka aur bhi detailed jawab milega._",
      ].join("\n"),
      source: "brain",
      conceptId: brain.conceptId,
      chips: brain.chips,
      degraded: true,
    };
  }
}

/** The chips shown before the first question. */
export const STARTER_CHIPS = [
  "VLOOKUP kya hai?",
  "VLOOKUP vs XLOOKUP — kaunsa behtar?",
  "#N/A kyun aa raha hai?",
  "Pivot Table step by step banao",
  "SUMIFS 0 kyun de raha hai?",
  "Mera data aisa hai, formula banao",
];
