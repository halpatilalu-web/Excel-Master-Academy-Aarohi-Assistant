export interface ChatMsg { role: "user" | "assistant"; content: string }

/** Thrown when the online tutor is unavailable; `status` 0 means "no answer". */
export class AssistantError extends Error {
  constructor(
    message: string,
    public status = 0,
  ) {
    super(message);
    this.name = "AssistantError";
  }
}

export async function askAssistant(messages: ChatMsg[]): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 65_000);
  try {
    const r = await fetch("/api/assistant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ messages: messages.slice(-20) }),
      signal: controller.signal,
    });
    if (!r.ok) {
      let detail = "assistant unavailable";
      try {
        detail = String(((await r.json()) as { detail?: unknown }).detail ?? detail);
      } catch {
        /* non-JSON body */
      }
      throw new AssistantError(detail, r.status);
    }
    return (await r.json()).reply as string;
  } catch (error) {
    if (error instanceof AssistantError) throw error;
    throw new AssistantError("assistant unreachable", 0);
  } finally {
    clearTimeout(timer);
  }
}

/* ---------- Voice: browser built-in, free, no API key ---------- */
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start(): void;
  stop(): void;
}

type RecognitionCtor = new () => SpeechRecognitionLike;

const SPEECH = (typeof window !== "undefined"
  ? ((window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor }).SpeechRecognition ??
    (window as unknown as { webkitSpeechRecognition?: RecognitionCtor }).webkitSpeechRecognition)
  : undefined);

export const canListen = !!SPEECH;
export const canSpeak = typeof window !== "undefined" && "speechSynthesis" in window;

export function listen(onText: (t: string, final: boolean) => void, onEnd: () => void, lang = "hi-IN") {
  if (!SPEECH) return { stop() {} };
  const rec = new SPEECH();
  rec.lang = lang;
  rec.interimResults = true;
  rec.continuous = false;
  rec.onresult = (event) => {
    let text = "";
    for (let i = 0; i < event.results.length; i++) text += event.results[i][0].transcript;
    onText(text, event.results[event.results.length - 1]?.isFinal ?? false);
  };
  rec.onend = onEnd;
  rec.onerror = onEnd;
  try {
    rec.start();
  } catch {
    onEnd();
  }
  return { stop: () => { try { rec.stop(); } catch { /* already stopped */ } } };
}

function plain(t: string) {
  return t
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[`*_#>|]/g, "")
    .replace(/\p{Extended_Pictographic}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** The best Hindi voice available; `getVoices()` is async on first load. */
function hindiVoice(lang: string): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  return voices.find((v) => v.lang === lang) ?? voices.find((v) => v.lang.startsWith(lang.split("-")[0]));
}

export function speak(text: string, lang = "hi-IN") {
  if (!canSpeak) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(plain(text));
  utterance.lang = lang;
  utterance.rate = 0.95;
  const voice = hindiVoice(lang);
  if (voice) utterance.voice = voice;
  else {
    // Voices were not loaded yet: retry once they are, so the first answer is
    // not read in an English voice.
    const once = () => {
      const later = hindiVoice(lang);
      if (later) utterance.voice = later;
    };
    window.speechSynthesis.addEventListener("voiceschanged", once, { once: true });
  }
  window.speechSynthesis.speak(utterance);
}
export function stopSpeaking() { if (canSpeak) window.speechSynthesis.cancel(); }
