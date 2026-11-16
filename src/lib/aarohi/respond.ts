/**
 * One place where Aarohi decides where her answer comes from.
 *
 *   0. "Sirf built-in" (`provider: "local"`) — the brain, no request of any kind.
 *      This is checked first, because it is a promise, not a preference.
 *   1. The model, when a key exists: a browser key straight from the page
 *      (static hosts), or the app's own `/api/assistant`.
 *   2. The brain, when there is no key, the model fails, or the answer came back
 *      empty.
 *
 * The model goes FIRST on purpose. It used to be the other way round: any topic
 * the offline brain recognised was answered from its notes, so a student with a
 * working Gemini key still got the same canned template for VLOOKUP and even for
 * "Hello". A model that is connected has to be the one that talks; the brain is
 * the safety net, not the first responder.
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

  const offlineOnly = !online || (options.config ?? loadConfig()).provider === "local";

  // No key, or "sirf built-in": the brain is the whole answer, instantly.
  if (offlineOnly) {
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
