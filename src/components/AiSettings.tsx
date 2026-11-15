/**
 * "Aarohi ka AI" — where the online model is configured.
 *
 * Two ways to give Aarohi a real model, and this panel explains both in plain
 * language instead of pretending one is enough:
 *
 *  - A key pasted here stays in THIS browser (localStorage). It is the only way
 *    the app can talk to Gemini on a static host like GitHub Pages or Vercel,
 *    because those hosts have no server. Good for the owner's own device; it is
 *    visible to anyone who opens devtools on that device, so it is not for a
 *    shared classroom machine.
 *  - No key here + a server with `GEMINI_API_KEY` = the key never reaches the
 *    browser at all. That is the right setup for students.
 *
 * The panel never prints a saved key back — it only says "saved".
 */
import { useState } from "react";
import { AlertTriangle, Check, Eye, EyeOff, KeyRound, Loader2, Server, Sparkles, Trash2 } from "lucide-react";
import { Button, inputCls } from "./ui";
import {
  activeProvider,
  clearKeys,
  describeProvider,
  hasBrowserKey,
  loadConfig,
  saveConfig,
  testProvider,
  type AiConfig,
  type ProviderId,
} from "../lib/aarohi/provider";

const label = "text-[11px] font-bold uppercase tracking-wide text-(--color-muted)";

export function AiSettings({ onClose }: { onClose?: () => void }) {
  const [config, setConfig] = useState<AiConfig>(loadConfig);
  const [showKey, setShowKey] = useState(false);
  const [status, setStatus] = useState<{ kind: "idle" | "testing" | "ok" | "bad"; text: string }>({
    kind: "idle",
    text: "",
  });

  const update = (patch: Partial<AiConfig>) => {
    setConfig((current) => {
      const next = { ...current, ...patch };
      saveConfig(next);
      return next;
    });
  };

  const provider = activeProvider(config);
  const usingBrowserKey = hasBrowserKey(config) && provider !== "server";

  async function test() {
    setStatus({ kind: "testing", text: "Test chal raha hai…" });
    try {
      const answer = await testProvider(config);
      setStatus({ kind: "ok", text: `Chal gaya ✅ — jawab: "${answer}"` });
    } catch (error) {
      setStatus({
        kind: "bad",
        text: error instanceof Error ? error.message : "Test fail ho gaya.",
      });
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-sm font-extrabold">Aarohi ka AI</h3>
          <p className="text-[11px] text-(--color-muted)">
            Abhi jawab ka source: <span className="font-bold text-(--color-accent-dark)">{describeProvider(config)}</span>
          </p>
        </div>
        {onClose && (
          <button type="button" onClick={onClose} className="neu-btn px-2 py-1 text-[11px] font-bold text-(--color-muted)">
            Band karo
          </button>
        )}
      </div>

      {/* Which provider */}
      <div>
        <p className={label}>Kahan se jawab aaye</p>
        <div className="mt-1.5 grid grid-cols-2 gap-1.5">
          {(
            [
              { id: "auto", name: "Auto", hint: "Key ho to browser, warna server" },
              { id: "gemini", name: "Gemini", hint: "Google (free tier)" },
              { id: "openai", name: "OpenAI-compatible", hint: "OpenAI / Groq / Ollama" },
              { id: "local", name: "Sirf built-in", hint: "Koi internet nahi, brain hi" },
            ] as { id: ProviderId; name: string; hint: string }[]
          ).map((option) => (
            <button
              key={option.id}
              type="button"
              aria-pressed={config.provider === option.id}
              onClick={() => update({ provider: option.id })}
              className={`rounded-xl px-2.5 py-2 text-left text-[11px] font-bold transition ${
                config.provider === option.id
                  ? "bg-(--color-accent) text-white"
                  : "neu-btn text-(--color-ink) hover:bg-(--color-accent-soft)"
              }`}
            >
              {option.name}
              <span className={`block text-[10px] font-normal ${config.provider === option.id ? "text-white/80" : "text-(--color-muted)"}`}>
                {option.hint}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Gemini key */}
      {(config.provider === "auto" || config.provider === "gemini") && (
        <div className="rounded-xl bg-(--color-surface) p-2.5 shadow-(--neu-raised-sm)">
          <p className={`${label} flex items-center gap-1`}>
            <Sparkles size={11} /> Gemini key
            {config.geminiKey.trim() && (
              <span className="ml-1 inline-flex items-center gap-0.5 rounded-full bg-(--color-accent-soft) px-1.5 py-0.5 text-[9px] text-(--color-accent-dark)">
                <Check size={9} /> saved
              </span>
            )}
          </p>
          <div className="mt-1.5 flex gap-1.5">
            <input
              type={showKey ? "text" : "password"}
              className={inputCls}
              placeholder="AIza…"
              aria-label="Gemini API key"
              autoComplete="off"
              spellCheck={false}
              value={config.geminiKey}
              onChange={(event) => update({ geminiKey: event.target.value })}
            />
            <button
              type="button"
              aria-label={showKey ? "Key chhupao" : "Key dikhao"}
              onClick={() => setShowKey((v) => !v)}
              className="neu-btn shrink-0 px-2 text-(--color-muted)"
            >
              {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          <input
            className={`${inputCls} mt-1.5`}
            aria-label="Gemini model"
            placeholder="gemini-2.0-flash"
            value={config.geminiModel}
            onChange={(event) => update({ geminiModel: event.target.value })}
          />
          <p className="mt-1 text-[10px] text-(--color-muted)">
            Free key: <span className="font-mono">aistudio.google.com/apikey</span> → Create API key
          </p>
        </div>
      )}

      {/* OpenAI-compatible */}
      {(config.provider === "auto" || config.provider === "openai") && (
        <div className="rounded-xl bg-(--color-surface) p-2.5 shadow-(--neu-raised-sm)">
          <p className={`${label} flex items-center gap-1`}>
            <KeyRound size={11} /> OpenAI-compatible key
            {config.openaiKey.trim() && (
              <span className="ml-1 inline-flex items-center gap-0.5 rounded-full bg-(--color-accent-soft) px-1.5 py-0.5 text-[9px] text-(--color-accent-dark)">
                <Check size={9} /> saved
              </span>
            )}
          </p>
          <input
            type={showKey ? "text" : "password"}
            className={`${inputCls} mt-1.5`}
            aria-label="OpenAI API key"
            autoComplete="off"
            spellCheck={false}
            placeholder="sk-…"
            value={config.openaiKey}
            onChange={(event) => update({ openaiKey: event.target.value })}
          />
          <div className="mt-1.5 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            <input
              className={inputCls}
              aria-label="API base URL"
              placeholder="https://api.openai.com/v1"
              value={config.openaiBase}
              onChange={(event) => update({ openaiBase: event.target.value })}
            />
            <input
              className={inputCls}
              aria-label="Model name"
              placeholder="gpt-4o-mini"
              value={config.openaiModel}
              onChange={(event) => update({ openaiModel: event.target.value })}
            />
          </div>
          <p className="mt-1 text-[10px] text-(--color-muted)">
            Groq/Ollama ke liye base URL badlo — jo bhi OpenAI format samajhta ho, chalega.
          </p>
        </div>
      )}

      {/* Test + clear */}
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" onClick={() => void test()} disabled={status.kind === "testing" || !hasBrowserKey(config)}>
          {status.kind === "testing" ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          Test karo
        </Button>
        <button
          type="button"
          onClick={() => {
            setConfig(clearKeys());
            setStatus({ kind: "idle", text: "" });
          }}
          className="neu-btn flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold text-(--color-muted)"
        >
          <Trash2 size={12} /> Keys hatao
        </button>
      </div>

      {status.kind !== "idle" && (
        <p
          role="status"
          className={`flex items-start gap-1.5 rounded-xl px-2.5 py-2 text-[11px] ${
            status.kind === "ok"
              ? "tone-good"
              : status.kind === "bad"
                ? "tone-warn"
                : "bg-(--color-surface) text-(--color-muted)"
          }`}
        >
          {status.kind === "ok" ? <Check size={13} className="mt-0.5 shrink-0" /> : <AlertTriangle size={13} className="mt-0.5 shrink-0" />}
          <span className="break-words">{status.text}</span>
        </p>
      )}

      {/* Honest explanation of where the key lives */}
      <div className="rounded-xl bg-(--color-accent-soft)/60 p-2.5 text-[10.5px] leading-relaxed text-(--color-ink)">
        <p className="flex items-center gap-1 font-bold">
          <Server size={11} /> Key kahan rehti hai
        </p>
        <p className="mt-0.5 text-(--color-muted)">
          {usingBrowserKey ? (
            <>
              Is waqt key <b>sirf is browser</b> me save hai (localStorage). GitHub Pages/Vercel par koi server
              nahi hota, isliye browser se seedha AI call hota hai. Apne phone/laptop par theek hai —{" "}
              <b>shared computer par mat chhodo</b>, "Keys hatao" dabao.
            </>
          ) : (
            <>
              Koi browser key nahi hai, to jawab app ke server se aata hai (wahan <span className="font-mono">GEMINI_API_KEY</span>{" "}
              environment me hoti hai — browser tak nahi aati). Docker/Render par yahi best hai. Static host par
              iske liye upar key daalo, warna Aarohi sirf built-in brain se jawab degi.
            </>
          )}
        </p>
      </div>
    </div>
  );
}
