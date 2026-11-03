export interface ChatMsg { role: "user" | "assistant"; content: string }

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
    if (!r.ok) throw new Error("assistant unavailable");
    return (await r.json()).reply as string;
  } finally {
    clearTimeout(timer);
  }
}

/* ---------- Voice: browser built-in, free, no API key ---------- */
const SR: any = typeof window !== "undefined" ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition : null;
export const canListen = !!SR;
export const canSpeak = typeof window !== "undefined" && "speechSynthesis" in window;

export function listen(onText: (t: string, final: boolean) => void, onEnd: () => void, lang = "hi-IN") {
  if (!SR) return { stop() {} };
  const rec = new SR();
  rec.lang = lang;
  rec.interimResults = true;
  rec.continuous = false;
  rec.onresult = (e: any) => {
    let text = "";
    for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript;
    onText(text, e.results[e.results.length - 1].isFinal);
  };
  rec.onend = onEnd;
  rec.onerror = onEnd;
  rec.start();
  return { stop: () => rec.stop() };
}

function plain(t: string) {
  return t
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[`*_#>|]/g, "")
    .replace(/\p{Extended_Pictographic}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function speak(text: string, lang = "hi-IN") {
  if (!canSpeak) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(plain(text));
  u.lang = lang;
  u.rate = 0.95;
  const v = window.speechSynthesis.getVoices().find((x) => x.lang === lang) || window.speechSynthesis.getVoices().find((x) => x.lang.startsWith("hi"));
  if (v) u.voice = v;
  window.speechSynthesis.speak(u);
}
export function stopSpeaking() { if (canSpeak) window.speechSynthesis.cancel(); }
