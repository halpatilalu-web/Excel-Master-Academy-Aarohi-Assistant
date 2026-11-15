/**
 * Where Aarohi's online answers come from.
 *
 * The app ships in three deployments and each one needs a different answer:
 *
 *  - **GitHub Pages / Vercel (static)**: there is no `/api` at all, so an online
 *    model can only be reached directly from the browser. The owner (or a
 *    student on their own laptop) can paste a key in Aarohi → AI settings, and
 *    it is kept in this browser only.
 *  - **Docker / Render / local (`pnpm dev:all`)**: `/api/assistant` exists and
 *    the key lives in the server environment, where it belongs. Nothing to do
 *    in the browser.
 *  - **No key anywhere**: the built-in brain answers. Nothing breaks.
 *
 * The key is never committed, never logged, and never sent anywhere except the
 * provider you chose. That is also why this module does not export the key in
 * any status string — `describe()` only ever says "configured" or not.
 */
import type { ChatMsg } from "../assistant";

export type ProviderId = "auto" | "gemini" | "openai" | "local";

export interface AiConfig {
  /** auto = use this browser's key if there is one, else the app server. */
  provider: ProviderId;
  geminiKey: string;
  geminiModel: string;
  openaiKey: string;
  openaiBase: string;
  openaiModel: string;
}

const KEY = "aarohi_ai_config_v1";

export const DEFAULT_CONFIG: AiConfig = {
  provider: "auto",
  geminiKey: "",
  geminiModel: "gemini-2.0-flash",
  openaiKey: "",
  openaiBase: "https://api.openai.com/v1",
  openaiModel: "gpt-4o-mini",
};

export function loadConfig(): AiConfig {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "null") as Partial<AiConfig> | null;
    if (!raw || typeof raw !== "object") return { ...DEFAULT_CONFIG };
    return { ...DEFAULT_CONFIG, ...raw };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function saveConfig(config: AiConfig): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(config));
  } catch {
    /* storage blocked — the in-memory config still works for this session */
  }
}

export function clearKeys(): AiConfig {
  const next: AiConfig = { ...loadConfig(), geminiKey: "", openaiKey: "" };
  saveConfig(next);
  return next;
}

/** A browser key is present, so the provider can be called directly. */
export function hasBrowserKey(config: AiConfig): boolean {
  return Boolean(config.geminiKey.trim() || config.openaiKey.trim());
}

/** Which provider will actually be used for the NEXT question. */
export function activeProvider(config: AiConfig): "gemini" | "openai" | "server" {
  if (config.provider === "gemini" && config.geminiKey.trim()) return "gemini";
  if (config.provider === "openai" && config.openaiKey.trim()) return "openai";
  if (config.provider === "auto") {
    if (config.geminiKey.trim()) return "gemini";
    if (config.openaiKey.trim()) return "openai";
  }
  return "server";
}

export function describeProvider(config: AiConfig): string {
  const active = activeProvider(config);
  if (active === "gemini") return `Gemini · ${config.geminiModel || "gemini-2.0-flash"}`;
  if (active === "openai") return `Online AI · ${config.openaiModel || "gpt-4o-mini"}`;
  return "App server";
}

/**
 * The personality sent with every direct browser call. Kept short and close to
 * the server's prompt so the two paths answer in the same voice.
 */
export const CLIENT_SYSTEM_PROMPT = `Tum "Aarohi" ho — Excel Master Academy ki smart, friendly Hinglish Excel teacher. Student Excel Diploma (Basic se Advanced) kar raha hai: formulas, data cleaning, lookups (VLOOKUP/XLOOKUP/INDEX-MATCH), Pivot Tables, dashboards, Power Query, VBA, GST invoicing, interview prep.

Rules:
1. Sawal jo poochha hai wahi answer do. "Kya hai" = short definition + 1 example. "Step by step" = numbered steps. "Mera data aisa hai" = usi data par formula. "Error" = cause + fix. Ek hi template me sab ko mat dhanso, pichhla jawab dohrao mat.
2. Poori conversation yaad rakho — "aur samjhao", "iska result", "in English" sab previous sawal ka continuation hai.
3. Student ki bhasha me jawab do (Hinglish/Hindi/English).
4. Formula hamesha code me, poora aur copy-paste ready: \`=VLOOKUP(A2,$F$2:$H$100,3,0)\`. Neeche har argument ka matlab ek line me.
5. Ek chhota asli-numbers wala example do (3-5 rows) aur batao answer kyun aaya.
6. Sabse aam galti aur uska pakka ilaaj batao — error ko chhupao mat.
7. 250-450 shabd. Aakhir me ek practice task ya ek follow-up sawal.
8. Roleplay (interview, office, quiz) welcome hai — ek-ek sawal poochho, feedback do.
9. AI study companion ho, insaan nahi. Romantic/personal photo requests politely decline karke Excel par lao. Excel se bahar ke sawal par bolo ki tum Excel teacher ho.
10. Kabhi jhooth mat bolo — function ka behaviour pakka na ho to saaf bolo aur safe alternative do.`;

export class ProviderError extends Error {
  constructor(
    message: string,
    public status = 0,
  ) {
    super(message);
    this.name = "ProviderError";
  }
}

/** Turn our two-role transcript into either provider's wire format. */
function geminiContents(messages: ChatMsg[]) {
  return messages
    .filter((m) => m.content.trim())
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));
}

interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
  promptFeedback?: { blockReason?: string };
  error?: { message?: string; status?: string };
}

async function askGemini(config: AiConfig, messages: ChatMsg[], signal?: AbortSignal): Promise<string> {
  const model = config.geminiModel.trim() || "gemini-2.0-flash";
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": config.geminiKey.trim() },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: CLIENT_SYSTEM_PROMPT }] },
        contents: geminiContents(messages),
        generationConfig: { temperature: 0.7, maxOutputTokens: 1200, topP: 0.95 },
      }),
      signal,
    },
  );

  if (!response.ok) {
    let detail = "";
    try {
      const body = (await response.json()) as GeminiResponse;
      detail = body.error?.message ?? "";
    } catch {
      /* non-JSON */
    }
    // 400 with "API key not valid" is the one people actually hit.
    if (response.status === 400 || response.status === 403) {
      throw new ProviderError(
        detail || "Gemini ne key accept nahi ki — key check karo ya nayi banao.",
        response.status,
      );
    }
    if (response.status === 429) {
      throw new ProviderError("Gemini ka free quota khatam ho gaya — thodi der baad try karo.", 429);
    }
    throw new ProviderError(detail || `Gemini error ${response.status}`, response.status);
  }

  const body = (await response.json()) as GeminiResponse;
  if (body.promptFeedback?.blockReason) {
    throw new ProviderError("Ye sawal Gemini ne block kar diya.", 400);
  }
  const text = (body.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("").trim();
  if (!text) throw new ProviderError("Gemini ne khali jawab diya.", 0);
  return text;
}

async function askOpenAiCompatible(config: AiConfig, messages: ChatMsg[], signal?: AbortSignal): Promise<string> {
  const base = (config.openaiBase.trim() || DEFAULT_CONFIG.openaiBase).replace(/\/+$/, "");
  const response = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.openaiKey.trim()}` },
    body: JSON.stringify({
      model: config.openaiModel.trim() || DEFAULT_CONFIG.openaiModel,
      messages: [{ role: "system", content: CLIENT_SYSTEM_PROMPT }, ...messages],
      temperature: 0.7,
      max_tokens: 1200,
    }),
    signal,
  });

  if (!response.ok) {
    let detail = "";
    try {
      detail = ((await response.json()) as { error?: { message?: string } }).error?.message ?? "";
    } catch {
      /* non-JSON */
    }
    if (response.status === 401 || response.status === 403) {
      throw new ProviderError(detail || "API key accept nahi hui — check karo.", response.status);
    }
    if (response.status === 429) {
      throw new ProviderError("Free quota khatam — thodi der baad try karo.", 429);
    }
    throw new ProviderError(detail || `AI error ${response.status}`, response.status);
  }

  const body = (await response.json()) as { choices?: { message?: { content?: string } }[] };
  const text = body.choices?.[0]?.message?.content?.trim() ?? "";
  if (!text) throw new ProviderError("AI ne khali jawab diya.", 0);
  return text;
}

/** Answer with the browser key. Throws ProviderError with a human message. */
export async function askDirect(
  config: AiConfig,
  messages: ChatMsg[],
  signal?: AbortSignal,
): Promise<string> {
  const active = activeProvider(config);
  if (active === "gemini") return askGemini(config, messages, signal);
  if (active === "openai") return askOpenAiCompatible(config, messages, signal);
  throw new ProviderError("Is browser me koi key save nahi hai.", 0);
}

/**
 * "Test" button: one tiny request that proves the key works and says which
 * model answered. Costs a handful of tokens, never a full answer.
 */
export async function testProvider(config: AiConfig): Promise<string> {
  const ping: ChatMsg[] = [{ role: "user", content: "Reply with exactly: ok" }];
  const text = await askDirect(config, ping);
  return text.slice(0, 60);
}
