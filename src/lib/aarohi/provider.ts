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
  /** Empty means "use a known-good default" (`DEFAULT_GEMINI_MODEL`). */
  geminiModel: string;
  openaiKey: string;
  openaiBase: string;
  openaiModel: string;
}

const KEY = "aarohi_ai_config_v1";

/**
 * Google retires models. `gemini-2.0-flash` was removed and the API now answers
 * "…is no longer available. Please update your code to use gemini-3.8-flash",
 * which broke every chat with a saved config. So the model is not treated as a
 * constant any more:
 *
 *  - `MODEL_FALLBACKS` is tried in order when a model is retired;
 *  - `listModels()` asks the key which models it can actually use;
 *  - `describeProvider()` shows the model that really answered.
 */
export const DEFAULT_GEMINI_MODEL = "gemini-3.8-flash";

export const MODEL_FALLBACKS = [
  "gemini-3.8-flash",
  "gemini-3-flash",
  "gemini-3.8-pro",
  "gemini-3-pro",
  "gemini-flash-latest",
  "gemini-pro-latest",
  "gemini-2.5-flash",
  "gemini-2.5-pro",
];

export const DEFAULT_CONFIG: AiConfig = {
  provider: "auto",
  geminiKey: "",
  geminiModel: DEFAULT_GEMINI_MODEL,
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

/**
 * The model that actually answered last, so the UI can never claim a retired
 * model is working. Reset when the key or model field changes.
 */
let lastWorkingModel = "";

export function rememberWorkingModel(model: string): void {
  lastWorkingModel = model;
}

export function resetWorkingModel(): void {
  lastWorkingModel = "";
}

export function workingModel(config: AiConfig): string {
  return lastWorkingModel || config.geminiModel.trim() || DEFAULT_GEMINI_MODEL;
}

export function describeProvider(config: AiConfig): string {
  const active = activeProvider(config);
  if (active === "gemini") return `Gemini · ${workingModel(config)}`;
  if (active === "openai") return `Online AI · ${config.openaiModel || "gpt-4o-mini"}`;
  return "App server";
}

/**
 * The personality sent with every direct browser call. Kept short and close to
 * the server's prompt so the two paths answer in the same voice.
 */
/**
 * Aarohi's personality, sent with every browser-side request.
 *
 * An array of lines joined with newlines: the prompt contains markdown fences
 * and inline code, and one template literal cannot hold those backticks
 * without turning unreadable.
 *
 * Rule one is the fix for the complaint that started this: answers were
 * identical every time because the model was told to always produce a
 * six-part teaching block, even for "Hello".
 */
export const CLIENT_SYSTEM_PROMPT = [
  `Tum "Aarohi" ho — Excel Master Academy ki AI study saathi aur Excel teacher. Student se seedha baat karti ho, jaise ek achhi teacher WhatsApp par karti hai.`,
  ``,
  `# Sabse zaruri: har sawal ka jawab ek jaisa mat do`,
  `- Koi fixed format nahi. Jo poochha gaya hai bas wahi jawab do — jitna poochha, utna hi.`,
  `- "Hello", "hi", "thanks", "kaise ho" ka jawab chhota aur normal insaan jaisa: "Namaste! 👋 Main Aarohi — Excel sikhati hoon. Aaj kya karna hai?" Bas itna. Sawal poochhne par hi detail me jao.`,
  `- Pichhle messages padho. Student aage badh chuka hai to pichhla jawab dohrao mat — aage badho.`,
  `- Wahi paragraph, wahi list, wahi menu bar-bar mat likho. Har baar naye shabdon me baat karo.`,
  `- Sawal chhota (ek line) hai to jawab bhi 1-3 line rakho.`,
  ``,
  `# Excel ka sawal ho to (aur sirf tab)`,
  `1. Pehli line me seedha jawab — "haan, XLOOKUP se hoga" ya "iski wajah ye hai".`,
  `2. Formula code block me, poora aur copy-paste ready:`,
  `   \`\`\``,
  `   =VLOOKUP(A2,$F$2:$H$100,3,0)`,
  `   \`\`\``,
  `3. Uske neeche har argument ek line me — sirf jo zaruri ho.`,
  `4. Ek chhota asli-numbers wala example (3-5 rows), aur batao answer kyun aaya.`,
  `5. Sabse aam galti aur uska pakka ilaaj — error ko chhupao mat.`,
  `6. Poora teaching jawab 200-400 shabd. Bas.`,
  ``,
  `# Baat karne ke niyam`,
  `- Student ki bhasha follow karo — Hinglish, Hindi ya English, jo likhe wahi. Default Hinglish, "aap" keh kar.`,
  `- Follow-up ko history se jodo: "uska" / "isko" / "aur" ka matlab pichhle message se lo.`,
  `- Formula ka behaviour pakka na ho to saaf bolo "ye mujhe pakka nahi" aur safe alternative do. Kabhi jhooth mat bolo.`,
  `- Excel se bahar ka sawal ho to politely bolo ki tum Excel teacher ho, aur wapas Excel par laao. Personal/romantic ya photo wali request decline karo.`,
  `- Roleplay (interview, office, viva) welcome hai — ek-ek sawal poochho, jawab par feedback do.`,
  `- Tum AI study companion ho, insaan nahi — poochha jaye to sach batao.`,
].join("\n");

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

interface GeminiModelList {
  models?: { name?: string; supportedGenerationMethods?: string[]; displayName?: string }[];
  error?: { message?: string };
}

/**
 * The models this key can actually use for `generateContent`.
 *
 * Returned newest-first-ish as the API gives them, with the retired ones gone —
 * this is what makes the panel self-healing instead of a list of names that rot.
 */
export async function listModels(config: AiConfig, signal?: AbortSignal): Promise<string[]> {
  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=200", {
    method: "GET",
    headers: { "x-goog-api-key": config.geminiKey.trim() },
    signal,
  });
  if (!response.ok) {
    let detail = "";
    try {
      detail = ((await response.json()) as GeminiModelList).error?.message ?? "";
    } catch {
      /* non-JSON */
    }
    throw new ProviderError(detail || `Model list nahi mili (${response.status})`, response.status);
  }
  const body = (await response.json()) as GeminiModelList;
  const usable = (body.models ?? [])
    .filter((m) => (m.supportedGenerationMethods ?? []).includes("generateContent"))
    .map((m) => (m.name ?? "").replace(/^models\//, ""))
    // Chat models only: skip embeddings, TTS, image and vision-only variants.
    .filter((name) => /gemini/i.test(name) && !/embedding|aqa|imagen|tts|native-audio|live/i.test(name));
  return [...new Set(usable)];
}

/**
 * Google's own message names the replacement, e.g.
 *   "This model models/gemini-2.0-flash is no longer available. Please update
 *    your code to use models/gemini-3.8-flash …"
 * Reading it means we fix ourselves using the vendor's advice, not a guess.
 */
export function modelFromMessage(message: string): string | undefined {
  const match = /use\s+(?:the\s+)?models\/([A-Za-z0-9._-]+)/i.exec(message);
  return match?.[1];
}

/** Does this error mean "that model is gone, try another"? */
export function isRetiredModelError(status: number, message: string): boolean {
  const text = message.toLowerCase();
  if (/no longer available|not found|not supported|deprecated|retired|does not exist/.test(text)) return true;
  return status === 404;
}

interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
  promptFeedback?: { blockReason?: string };
  error?: { message?: string; status?: string };
}

/** One request, one model. Throws ProviderError with the vendor's message. */
async function geminiOnce(
  config: AiConfig,
  model: string,
  messages: ChatMsg[],
  signal?: AbortSignal,
): Promise<string> {
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
      detail = ((await response.json()) as GeminiResponse).error?.message ?? "";
    } catch {
      /* non-JSON */
    }
    if (response.status === 400 && /api key not valid|api_key_invalid/i.test(detail)) {
      throw new ProviderError("Gemini ne key accept nahi ki — key check karo ya nayi banao.", response.status);
    }
    if (response.status === 403) {
      throw new ProviderError(detail || "Is key ke paas Gemini ka access nahi hai.", response.status);
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

/**
 * Ask Gemini, healing a retired model on the way.
 *
 * Order: the configured model → the model Google named in its own error → the
 * list of models this key can use → the built-in fallback list. A retired model
 * is therefore a one-second hiccup, not a broken chat.
 */
async function askGemini(config: AiConfig, messages: ChatMsg[], signal?: AbortSignal): Promise<string> {
  const wanted = config.geminiModel.trim();
  const tried: string[] = [];
  const queue: string[] = wanted ? [wanted] : [DEFAULT_GEMINI_MODEL];

  let lastError: ProviderError | undefined;
  let discovered: string[] | undefined;

  while (queue.length) {
    const model = queue.shift() as string;
    if (tried.includes(model)) continue;
    tried.push(model);
    try {
      const text = await geminiOnce(config, model, messages, signal);
      rememberWorkingModel(model);
      return text;
    } catch (error) {
      const provider = error instanceof ProviderError ? error : new ProviderError("Gemini se connect nahi hua.");
      lastError = provider;
      if (!isRetiredModelError(provider.status, provider.message)) throw provider;

      // 1. Google's own suggestion, first: it is the exact replacement.
      const suggested = modelFromMessage(provider.message);
      if (suggested && !tried.includes(suggested)) queue.unshift(suggested);

      // 2. Ask the key what exists. One extra request, only when we are healing.
      if (!discovered) {
        try {
          discovered = await listModels(config, signal);
        } catch {
          discovered = [];
        }
        // Prefer flash models (cheap/fast) but accept anything usable.
        discovered
          .filter((name) => !tried.includes(name))
          .sort((a, b) => Number(/flash/.test(b)) - Number(/flash/.test(a)))
          .forEach((name) => queue.push(name));
      }

      // 3. Last resort: the names shipped with this build.
      MODEL_FALLBACKS.filter((name) => !tried.includes(name)).forEach((name) => queue.push(name));
    }
  }

  const message = lastError?.message ?? "Koi bhi Gemini model kaam nahi kiya.";
  throw new ProviderError(
    /no longer available/i.test(message)
      ? `Google ne ye model band kar diya aur koi replacement nahi mila. Aarohi → ⚙️ me model ka naam khaali karke Test karo — main khud naya chun lungi.`
      : message,
    lastError?.status ?? 0,
  );
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
