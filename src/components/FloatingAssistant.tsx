import { useEffect, useRef, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Maximize2, Mic, Send, Sparkles, Volume2, VolumeX, X } from "lucide-react";
import { aarohiReply, SUGGESTIONS } from "../data/tutor";
import {
  askAssistant,
  canListen,
  canSpeak,
  listen,
  speak,
  stopSpeaking,
  type ChatMsg,
} from "../lib/assistant";

interface Msg {
  from: "me" | "bot";
  text: string;
}

const WELCOME: Msg = {
  from: "bot",
  text: "Namaste! 👋 Main Aarohi hoon — tumhari Live Excel Diploma AI Assistant! Koi bhi formula, error, Pivot, Power Query ya VBA doubt Hindi ya English mein abhi poochho, ya Mic 🎤 daba kar baat karo!",
};

export function FloatingAssistant({
  open,
  onOpenChange,
  queuedPrompt,
  onClearQueuedPrompt,
  onExpandFull,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  queuedPrompt?: string | null;
  onClearQueuedPrompt?: () => void;
  onExpandFull: () => void;
}) {
  const [msgs, setMsgs] = useState<Msg[]>([WELCOME]);
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceOn, setVoiceOn] = useState(false);
  const recRef = useRef<{ stop(): void } | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, open, typing]);

  async function ask(raw: string) {
    const text = raw.trim();
    if (!text || typing) return;
    stopSpeaking();
    const nextHistory: Msg[] = [...msgs, { from: "me", text }];
    setMsgs(nextHistory);
    setDraft("");
    setTyping(true);

    const payload: ChatMsg[] = nextHistory.slice(-14).map((m) => ({
      role: m.from === "me" ? "user" : "assistant",
      content: m.text,
    }));

    let reply: string;
    try {
      reply = await askAssistant(payload);
    } catch {
      const lastUser =
        [...nextHistory]
          .reverse()
          .slice(1)
          .find((m) => m.from === "me")?.text || "";
      const q = text.split(/\s+/).length < 6 && lastUser ? `${lastUser} ${text}` : text;
      reply = aarohiReply(
        q,
        nextHistory.map((m) => m.text),
      );
    }

    setMsgs((cur) => [...cur, { from: "bot", text: reply }]);
    setTyping(false);
    if (voiceOn) speak(reply);
  }

  useEffect(() => {
    if (open && queuedPrompt) {
      void ask(queuedPrompt);
      onClearQueuedPrompt?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, queuedPrompt]);

  function toggleMic() {
    if (listening) {
      recRef.current?.stop();
      return;
    }
    stopSpeaking();
    setListening(true);
    let finalText = "";
    recRef.current = listen(
      (txt) => {
        finalText = txt;
        setDraft(txt);
      },
      () => {
        setListening(false);
        if (finalText.trim()) {
          setVoiceOn(true);
          void ask(finalText);
        }
      },
    );
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void ask(draft);
  }

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => onOpenChange(true)}
          className="fixed bottom-16 right-4 z-40 flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-4 py-3 text-xs sm:text-sm font-bold shadow-xl hover:scale-105 transition cursor-pointer"
        >
          <Sparkles size={16} /> Live AI Help · Aarohi
        </button>
      )}

      <AnimatePresence>
        {open && (
          <motion.aside
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            aria-label="Aarohi Live AI Assistant"
            className="fixed bottom-4 right-4 z-50 w-[calc(100vw-2rem)] sm:w-96 h-[510px] max-h-[82vh] rounded-3xl border border-(--color-border) bg-(--color-surface) shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="px-4 py-3 bg-gradient-to-r from-emerald-700 to-teal-700 text-white flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <img
                  src="/aarohi-avatar-desk.jpg"
                  alt="Aarohi AI"
                  className="w-9 h-9 rounded-full object-cover border-2 border-emerald-300 shrink-0"
                />
                <div className="min-w-0">
                  <div className="font-display font-extrabold text-sm truncate">
                    Aarohi Live AI Saathi ✨
                  </div>
                  <div className="text-[11px] text-emerald-100 truncate">
                    Online · Hindi + English · Voice & Chat
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {canSpeak && (
                  <button
                    type="button"
                    aria-label="Toggle voice reply"
                    onClick={() => {
                      setVoiceOn((v) => !v);
                      stopSpeaking();
                    }}
                    className="p-1.5 rounded-lg hover:bg-white/15"
                  >
                    {voiceOn ? <Volume2 size={15} /> : <VolumeX size={15} />}
                  </button>
                )}
                <button
                  type="button"
                  aria-label="Open full screen AI Studio"
                  onClick={() => {
                    onOpenChange(false);
                    onExpandFull();
                  }}
                  className="p-1.5 rounded-lg hover:bg-white/15"
                  title="Full Screen AI Studio"
                >
                  <Maximize2 size={15} />
                </button>
                <button
                  type="button"
                  aria-label="Close AI chat"
                  onClick={() => {
                    stopSpeaking();
                    onOpenChange(false);
                  }}
                  className="p-1.5 rounded-lg hover:bg-white/15"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5 text-xs sm:text-sm">
              {msgs.map((m, i) => (
                <div
                  key={i}
                  className={`flex gap-2 ${m.from === "me" ? "justify-end" : "items-start"}`}
                >
                  {m.from === "bot" && (
                    <img
                      src="/aarohi-avatar-desk.jpg"
                      alt=""
                      aria-hidden="true"
                      className="w-7 h-7 rounded-full object-cover border border-(--color-border) shrink-0 mt-0.5"
                    />
                  )}
                  <div
                    className={`max-w-[84%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 leading-relaxed ${
                      m.from === "me"
                        ? "bg-(--color-accent) text-white"
                        : "bg-(--color-accent-soft)"
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              ))}
              {typing && (
                <p className="text-xs text-(--color-muted) px-2">Aarohi type kar rahi hai…</p>
              )}
              <div ref={endRef} />
            </div>

            {/* Quick Prompts */}
            <div className="px-3 pb-2 flex gap-1.5 overflow-x-auto">
              {SUGGESTIONS.slice(0, 4).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => void ask(s)}
                  className="shrink-0 text-[11px] rounded-full border border-(--color-border) px-2.5 py-1 hover:bg-(--color-accent-soft)"
                >
                  {s}
                </button>
              ))}
            </div>

            {/* Input */}
            <form
              onSubmit={onSubmit}
              className="p-2.5 border-t border-(--color-border) bg-(--color-canvas) flex gap-1.5"
            >
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={listening ? "Listening… speak now" : "Ask any Excel doubt (HI/EN)…"}
                className="flex-1 rounded-xl border border-(--color-border) bg-(--color-surface) px-3 py-2 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-(--color-accent)"
              />
              {canListen && (
                <button
                  type="button"
                  aria-label="Voice input"
                  onClick={toggleMic}
                  className={`p-2.5 rounded-xl text-white ${
                    listening ? "bg-rose-600 animate-pulse" : "bg-(--color-accent)"
                  }`}
                >
                  <Mic size={15} />
                </button>
              )}
              <button
                type="submit"
                aria-label="Send message"
                disabled={typing || !draft.trim()}
                className="p-2.5 rounded-xl bg-(--color-accent) text-white disabled:opacity-50"
              >
                <Send size={15} />
              </button>
            </form>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
