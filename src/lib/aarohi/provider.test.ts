// @vitest-environment jsdom
/**
 * The plug-and-play AI layer.
 *
 * These tests fake a Gemini server (there is no outbound network in CI) but
 * assert the things that actually break in production: the request shape, that
 * a bad key says something a student can act on, that a browser key wins over
 * the app server, and that nothing leaks the key back into the UI.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  activeProvider,
  clearKeys,
  DEFAULT_CONFIG,
  DEFAULT_GEMINI_MODEL,
  describeProvider,
  isRetiredModelError,
  listModels,
  modelFromMessage,
  resetWorkingModel,
  workingModel,
  hasBrowserKey,
  loadConfig,
  saveConfig,
  testProvider,
  type AiConfig,
} from "./provider";
import { respond } from "./respond";

const GEMINI_OK = {
  candidates: [{ content: { parts: [{ text: "Ye Gemini ka jawab hai: =XLOOKUP(A2,B:B,C:C)" }] } }],
};

function reply(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

const geminiConfig = (over: Partial<AiConfig> = {}): AiConfig => ({
  ...DEFAULT_CONFIG,
  provider: "gemini",
  geminiKey: "AIzaTESTKEY",
  ...over,
});

beforeEach(() => {
  localStorage.clear();
  resetWorkingModel();
});
afterEach(() => vi.restoreAllMocks());

describe("saved AI settings", () => {
  it("round-trips through localStorage and falls back to defaults", () => {
    expect(loadConfig().provider).toBe("auto");
    saveConfig(geminiConfig({ geminiModel: "gemini-2.0-flash" }));
    expect(loadConfig().geminiKey).toBe("AIzaTESTKEY");
    expect(loadConfig().geminiModel).toBe("gemini-2.0-flash");
  });

  it("survives corrupted storage instead of crashing the chat", () => {
    localStorage.setItem("aarohi_ai_config_v1", "{{{not json");
    expect(loadConfig().provider).toBe("auto");
  });

  it("describes the active provider without ever printing the key", () => {
    const config = geminiConfig();
    expect(describeProvider(config)).toContain("Gemini");
    expect(describeProvider(config)).not.toContain("AIzaTESTKEY");
  });

  it("picks the right source for each mode", () => {
    expect(activeProvider(geminiConfig())).toBe("gemini");
    expect(activeProvider({ ...DEFAULT_CONFIG, provider: "openai", openaiKey: "sk-1" })).toBe("openai");
    // "gemini" chosen but no key: fall back to the app server rather than fail.
    expect(activeProvider({ ...DEFAULT_CONFIG, provider: "gemini" })).toBe("server");
    // local means local, even with a key saved.
    expect(activeProvider({ ...geminiConfig(), provider: "local" })).toBe("server");
    // auto prefers whatever browser key exists.
    expect(activeProvider({ ...DEFAULT_CONFIG, geminiKey: "AIzaX" })).toBe("gemini");
  });

  it("removes both keys on request", () => {
    saveConfig(geminiConfig({ openaiKey: "sk-1" }));
    expect(hasBrowserKey(loadConfig())).toBe(true);
    expect(hasBrowserKey(clearKeys())).toBe(false);
    expect(loadConfig().geminiKey).toBe("");
  });
});

describe("direct Gemini calls", () => {
  it("sends a Gemini request and returns the text", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => reply(GEMINI_OK));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const answer = await testProvider(geminiConfig());

    expect(answer).toContain("Gemini");
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("generativelanguage.googleapis.com");
    // The default model is whatever ships in this build, not a hardcoded name.
    expect(url).toContain(`${DEFAULT_GEMINI_MODEL}:generateContent`);
    expect((init.headers as Record<string, string>)["x-goog-api-key"]).toBe("AIzaTESTKEY");
    const body = JSON.parse(String(init.body));
    expect(body.systemInstruction.parts[0].text).toContain("Aarohi");
    expect(body.contents[0].role).toBe("user");
    expect(body.generationConfig.maxOutputTokens).toBeGreaterThan(500);
  });

  it("maps our transcript roles to Gemini's (model, not assistant)", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => reply(GEMINI_OK));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await respond("quantum physics ka Frenet-Serret equation samjhao", {
      history: [
        { from: "me", text: "VLOOKUP samjhao" },
        { from: "bot", text: "Ye raha…" },
      ],
      config: geminiConfig(),
    });

    const body = JSON.parse(String((fetchMock.mock.calls[0] as [string, RequestInit])[1].body));
    expect(body.contents.map((c: { role: string }) => c.role)).toEqual(["user", "model", "user"]);
  });

  it("turns a rejected key into a sentence a student can act on", async () => {
    globalThis.fetch = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      reply({ error: { message: "API key not valid. Please pass a valid API key.", status: "INVALID_ARGUMENT" } }, 400),
    ) as unknown as typeof fetch;

    const result = await respond("quantum physics ka Frenet-Serret equation samjhao", {
      history: [],
      config: geminiConfig({ geminiKey: "bad-key" }),
    });

    expect(result.source).toBe("brain");
    expect(result.degraded).toBe(true);
    expect(result.error).toMatch(/API key|key accept/i);
    // The student still gets a usable answer from the brain.
    expect(result.text.length).toBeGreaterThan(200);
    // And the bad key is not echoed back into the chat.
    expect(result.text).not.toContain("bad-key");
  });

  it("explains an exhausted free quota instead of dumping a 429", async () => {
    globalThis.fetch = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => reply({ error: { message: "quota" } }, 429)) as unknown as typeof fetch;
    const result = await respond("quantum physics ka Frenet-Serret equation samjhao", {
      history: [],
      config: geminiConfig(),
    });
    expect(result.error).toMatch(/quota/i);
  });

  it("ignores a safety block and falls back to the brain", async () => {
    globalThis.fetch = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => reply({ promptFeedback: { blockReason: "OTHER" } })) as unknown as typeof fetch;
    const result = await respond("quantum physics ka Frenet-Serret equation samjhao", {
      history: [],
      config: geminiConfig(),
    });
    expect(result.source).toBe("brain");
    expect(result.degraded).toBe(true);
  });
});

describe("openai-compatible providers", () => {
  it("uses the configured base URL and model", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      reply({ choices: [{ message: { content: "Groq ka jawab" } }] }),
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await respond("quantum physics ka Frenet-Serret equation samjhao", {
      history: [],
      config: {
        ...DEFAULT_CONFIG,
        provider: "openai",
        openaiKey: "gsk-1",
        openaiBase: "https://api.groq.com/openai/v1/",
        openaiModel: "llama-3.3-70b",
      },
    });

    expect(result.source).toBe("online");
    expect(result.text).toBe("Groq ka jawab");
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.groq.com/openai/v1/chat/completions");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer gsk-1");
    const body = JSON.parse(String(init.body));
    expect(body.model).toBe("llama-3.3-70b");
    expect(body.messages[0].role).toBe("system");
  });
});

describe("routing between brain, browser key and app server", () => {
  // The model is the first responder when a key exists. It used to be the other
  // way round, which is why "Hello" and even "VLOOKUP kya hai" always got the
  // same brain template even with a working Gemini key.
  it("asks the model for a topic the brain also knows", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => reply(GEMINI_OK));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await respond("VLOOKUP kya hai", { history: [], config: geminiConfig() });

    expect(result.source).toBe("online");
    expect(result.text).toBe("Ye Gemini ka jawab hai: =XLOOKUP(A2,B:B,C:C)");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("asks the model for a plain hello, and says hello back", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      reply({
        candidates: [{ content: { parts: [{ text: "Namaste! 👋 Main Aarohi — Excel sikhati hoon. Aaj kya karna hai?" }] } }],
      }),
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await respond("Hello", { history: [], config: geminiConfig() });

    expect(result.source).toBe("online");
    expect(result.text).toContain("Namaste");
    // The brain's fixed welcome block must not be what a hello produces.
    expect(result.text).not.toContain("VLOOKUP vs XLOOKUP");
    const body = JSON.parse(String((fetchMock.mock.calls[0] as [string, RequestInit])[1].body));
    expect(body.contents.at(-1).parts[0].text).toBe("Hello");
    // Rule one of the prompt: do not answer everything from one template.
    expect(body.systemInstruction.parts[0].text).toMatch(/ek jaisa mat do/i);
  });

  it("sends the whole conversation so follow-ups make sense", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => reply(GEMINI_OK));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await respond("aur uske baare me batao", {
      history: [
        { from: "me", text: "VLOOKUP kya hai" },
        { from: "bot", text: "VLOOKUP ek lookup function hai." },
        { from: "me", text: "Hello" },
        { from: "bot", text: "Namaste!" },
      ],
      config: geminiConfig(),
    });

    const body = JSON.parse(String((fetchMock.mock.calls[0] as [string, RequestInit])[1].body));
    expect(body.contents.map((c: { role: string }) => c.role)).toEqual([
      "user",
      "model",
      "user",
      "model",
      "user",
    ]);
  });

  it("does not call any network when the app has no key and no server", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => {
      throw new Error("offline");
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    // Static host, no browser key, no /api behind it.
    const result = await respond("VLOOKUP kya hai", { history: [], config: DEFAULT_CONFIG, online: false });

    expect(result.source).toBe("brain");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("prefers the browser key over the app server", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, _init?: RequestInit) => {
      if (String(input).includes("generativelanguage")) return reply(GEMINI_OK);
      return reply({ reply: "server ka jawab" });
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await respond("quantum physics ka Frenet-Serret equation samjhao", {
      history: [],
      config: geminiConfig(),
    });

    expect(result.text).toContain("Gemini");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("uses the app server when there is no browser key", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, _init?: RequestInit) => {
      expect(String(input)).toBe("/api/assistant");
      return reply({ reply: "server ka jawab", source: "gemini" });
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await respond("quantum physics ka Frenet-Serret equation samjhao", {
      history: [],
      config: { ...DEFAULT_CONFIG, provider: "auto" },
    });

    expect(result.text).toBe("server ka jawab");
    expect(result.source).toBe("online");
  });

  it("stays offline when the student chooses 'sirf built-in'", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response(""));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await respond("quantum physics ka Frenet-Serret equation samjhao", {
      history: [],
      config: { ...geminiConfig(), provider: "local" },
    });

    expect(result.source).toBe("brain");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("a model Google retires", () => {
  const RETIRED =
    "This model models/gemini-2.0-flash is no longer available. Please update your code to use models/gemini-3.8-flash for the latest features and improvements.";

  it("reads the replacement out of Google's own error", () => {
    expect(modelFromMessage(RETIRED)).toBe("gemini-3.8-flash");
    expect(modelFromMessage("no suggestion here")).toBeUndefined();
  });

  it("recognises a retired model, and only that", () => {
    expect(isRetiredModelError(404, "")).toBe(true);
    expect(isRetiredModelError(400, RETIRED)).toBe(true);
    expect(isRetiredModelError(400, "API key not valid. Please pass a valid API key.")).toBe(false);
    expect(isRetiredModelError(429, "quota exceeded")).toBe(false);
  });

  it("switches to the model Google named, and remembers it", async () => {
    const seen: string[] = [];
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("?pageSize")) return reply({ models: [] });
      const model = /models\/([^:]+):generateContent/.exec(url)?.[1] ?? "";
      seen.push(model);
      if (model === "gemini-2.0-flash") return reply({ error: { message: RETIRED } }, 404);
      void init;
      return reply(GEMINI_OK);
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    // A saved config from the previous release still asks for 2.0-flash.
    const result = await respond("quantum physics ka Frenet-Serret equation samjhao", {
      history: [],
      config: geminiConfig({ geminiModel: "gemini-2.0-flash" }),
    });

    expect(result.source).toBe("online");
    expect(seen).toEqual(["gemini-2.0-flash", "gemini-3.8-flash"]);
    // The UI now reports the model that really answered.
    expect(workingModel(geminiConfig({ geminiModel: "gemini-2.0-flash" }))).toBe("gemini-3.8-flash");
  });

  it("asks the key for its models when Google gives no suggestion", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("?pageSize")) {
        return reply({
          models: [
            { name: "models/gemini-embedding-001", supportedGenerationMethods: ["embedContent"] },
            { name: "models/gemini-3.8-pro", supportedGenerationMethods: ["generateContent"] },
            { name: "models/gemini-3.8-flash", supportedGenerationMethods: ["generateContent"] },
          ],
        });
      }
      if (url.includes("gemini-1.5-old")) return reply({ error: { message: "not found" } }, 404);
      return reply(GEMINI_OK);
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await respond("quantum physics ka Frenet-Serret equation samjhao", {
      history: [],
      config: geminiConfig({ geminiModel: "gemini-1.5-old" }),
    });

    // Flash preferred over pro, and the embedding model never tried.
    expect(workingModel(geminiConfig())).toBe("gemini-3.8-flash");
  });

  it("lists only chat models the key can use", async () => {
    globalThis.fetch = vi.fn(async () =>
      reply({
        models: [
          { name: "models/gemini-3.8-flash", supportedGenerationMethods: ["generateContent"] },
          { name: "models/gemini-embedding-001", supportedGenerationMethods: ["embedContent"] },
          { name: "models/imagen-4", supportedGenerationMethods: ["generateContent"] },
          { name: "models/gemini-tts", supportedGenerationMethods: ["generateContent"] },
        ],
      }),
    ) as unknown as typeof fetch;

    const models = await listModels(geminiConfig());
    expect(models).toEqual(["gemini-3.8-flash"]);
  });

  it("defaults to a model that exists today", () => {
    expect(DEFAULT_GEMINI_MODEL).not.toBe("gemini-2.0-flash");
    expect(describeProvider({ ...geminiConfig(), geminiModel: "" })).toContain(DEFAULT_GEMINI_MODEL);
  });

  it("says something actionable when every model is gone", async () => {
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).includes("?pageSize")) return reply({ models: [] });
      return reply({ error: { message: RETIRED } }, 404);
    }) as unknown as typeof fetch;

    const result = await respond("quantum physics ka Frenet-Serret equation samjhao", {
      history: [],
      config: geminiConfig({ geminiModel: "gemini-2.0-flash" }),
    });

    expect(result.source).toBe("brain");
    expect(result.error).toMatch(/band kar diya|replacement/i);
    expect(result.text.length).toBeGreaterThan(200);
  });

  it("does not swallow a real key error as if it were a retired model", async () => {
    const calls: string[] = [];
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      calls.push(String(input));
      return reply({ error: { message: "API key not valid. Please pass a valid API key." } }, 400);
    }) as unknown as typeof fetch;

    const result = await respond("quantum physics ka Frenet-Serret equation samjhao", {
      history: [],
      config: geminiConfig({ geminiKey: "bad" }),
    });

    expect(result.error).toMatch(/key accept/i);
    // One call, not a stampede through every model.
    expect(calls.filter((u) => u.includes("generateContent")).length).toBe(1);
  });
});
