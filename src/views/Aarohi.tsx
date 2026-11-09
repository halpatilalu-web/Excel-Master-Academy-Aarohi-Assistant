import { useEffect, useRef, useState, type FormEvent } from "react";
import { Mic, Send, Sparkles, Trash2, Volume2, VolumeX } from "lucide-react";
import { aarohiReply, SUGGESTIONS } from "../data/tutor";
import { Button, Card, inputCls } from "../components/ui";
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

const HELLO: Msg = {
  from: "bot",
  text: "Namaste doston! Main Aarohi hoon — tumhari friendly Indian Excel creator aur study saathi. Formula, error, Pivot, chart ya koi bhi Excel doubt Hinglish me poochho. Chaho to hum interview ya office-report roleplay karke practice bhi kar sakte hain. Follow-up sawal bhi chalega!",
};
const KEY = "aarohi_excel_chat_v4";
const AVATAR_KEY = "aarohi_avatar_scene_v1";

const AVATARS = [
  {
    id: "classroom",
    label: "Classroom",
    src: "/aarohi-avatar.jpg",
    alt: "Aarohi ka illustrated avatar: classroom me laptop ke saath Excel padha rahi hai",
  },
  {
    id: "desk",
    label: "Study desk",
    src: "/aarohi-avatar-desk.jpg",
    alt: "Aarohi ka illustrated avatar: study desk se haath hila kar swagat kar rahi hai",
  },
  {
    id: "office",
    label: "Office dashboard",
    src: "/aarohi-avatar-office.jpg",
    alt: "Aarohi ka illustrated avatar: office dashboard samjha rahi hai",
  },
] as const;

const ROLEPLAY_SUGGESTIONS = [
  "Interview roleplay: mujhse ek-ek karke Excel sawal poochho",
  "Office roleplay: monthly sales report banana sikhao",
  "Quiz lo — test my Excel!",
  "=XLOOKUP(A2,$F$2:$F$100,$D$2:$D$100,\"Missing\")",
];

function loadAvatarIndex(): number {
  try {
    const index = Number(localStorage.getItem(AVATAR_KEY));
    return Number.isInteger(index) && index >= 0 && index < AVATARS.length ? index : 0;
  } catch {
    return 0;
  }
}

function loadMessages(): Msg[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) || "null");
    if (!Array.isArray(parsed)) return [HELLO];
    const messages = parsed.filter(
      (m): m is Msg =>
        typeof m === "object" &&
        m !== null &&
        ((m as Msg).from === "me" || (m as Msg).from === "bot") &&
        typeof (m as Msg).text === "string",
    );
    return messages.length ? messages.slice(-60) : [HELLO];
  } catch {
    return [HELLO];
  }
}

export function Aarohi() {
  const [msgs, setMsgs] = useState<Msg[]>(loadMessages);
  const [avatarIndex, setAvatarIndex] = useState<number>(loadAvatarIndex);
  const avatar = AVATARS[avatarIndex] ?? AVATARS[0];
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceOn, setVoiceOn] = useState(false);
  const recRef = useRef<{ stop(): void } | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const voiceOnRef = useRef(voiceOn);
  voiceOnRef.current = voiceOn;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
    try {
      localStorage.setItem(KEY, JSON.stringify(msgs.slice(-60)));
    } catch {
      /* storage full/blocked — chat still works for this session */
    }
  }, [msgs, typing]);

  useEffect(
    () => () => {
      recRef.current?.stop();
      stopSpeaking();
    },
    [],
  );

  async function ask(rawText: string) {
    const text = rawText.trim();
    if (!text || typing) return;

    stopSpeaking();
    const history: Msg[] = [...msgs, { from: "me", text }];
    setMsgs(history);
    setDraft("");
    setTyping(true);

    const chat: ChatMsg[] = history.slice(-20).map((m) => ({
      role: m.from === "me" ? "user" : "assistant",
      content: m.text,
    }));

    let reply: string;
    try {
      reply = await askAssistant(chat);
    } catch {
      // Offline/local Excel knowledge base fallback.
      const lastUser =
        [...history]
          .reverse()
          .slice(1)
          .find((m) => m.from === "me")?.text || "";
      const q = text.split(/\s+/).length < 6 && lastUser ? `${lastUser} ${text}` : text;
      reply = aarohiReply(
        q,
        history.map((m) => m.text),
      );
    }

    setMsgs((current) => [...current, { from: "bot", text: reply }]);
    setTyping(false);
    if (voiceOnRef.current) speak(reply);
  }

  function mic() {
    if (listening) {
      recRef.current?.stop();
      return;
    }
    stopSpeaking();
    setListening(true);
    let finalText = "";
    recRef.current = listen(
      (text) => {
        finalText = text;
        setDraft(text);
      },
      () => {
        setListening(false);
        if (finalText.trim()) {
          setVoiceOn(true);
          voiceOnRef.current = true;
          void ask(finalText);
        }
      },
    );
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void ask(draft);
  }

  function clear() {
    stopSpeaking();
    recRef.current?.stop();
    setListening(false);
    setMsgs([HELLO]);
  }

  return (
    <div className="max-w-3xl space-y-4">
      <Card className="!p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <img loading="lazy" decoding="async"
            src={avatar.src}
            alt={avatar.alt}
            className="w-full sm:w-40 aspect-square object-cover rounded-3xl neu-btn shadow-sm"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <h1 className="font-display text-2xl font-extrabold">Aarohi Excel Saathi</h1>
                <p className="text-sm text-(--color-muted)">
                  Tumhari friendly Indian Excel creator — Hinglish padhai, encouragement aur learning roleplay ke saath.
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                {canSpeak && (
                  <button
                    type="button"
                    title="Jawab sunao"
                    aria-label="Jawab sunao"
                    onClick={() => {
                      setVoiceOn((value) => !value);
                      stopSpeaking();
                    }}
                    className="p-2 rounded-full neu-btn"
                  >
                    {voiceOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
                  </button>
                )}
                <button
                  type="button"
                  title="Chat saaf karo"
                  aria-label="Chat saaf karo"
                  onClick={clear}
                  className="p-2 rounded-full neu-btn"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="inline-flex items-center gap-1 rounded-full bg-(--color-accent-soft) px-2.5 py-1 font-semibold">
                <Sparkles size={12} /> Hinglish coach
              </span>
              <span className="rounded-full bg-(--color-accent-soft) px-2.5 py-1 font-semibold">Interview roleplay</span>
              <span className="rounded-full bg-(--color-accent-soft) px-2.5 py-1 font-semibold">Office practice</span>
              <span className="rounded-full bg-(--color-accent-soft) px-2.5 py-1 font-semibold">Voice support</span>
            </div>

            <div className="mt-4">
              <p className="text-xs font-bold uppercase tracking-wide text-(--color-muted)">Avatar scene chuno</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {AVATARS.map((item, index) => (
                  <button
                    type="button"
                    key={item.id}
                    aria-pressed={index === avatarIndex}
                    onClick={() => setAvatarIndex(index)}
                    className={`flex items-center gap-2 rounded-full border p-1 pr-3 text-xs font-semibold transition ${
                      index === avatarIndex
                        ? "border-(--color-accent) bg-(--color-accent-soft)"
                        : "border-(--color-border) hover:bg-(--color-accent-soft)"
                    }`}
                  >
                    <img loading="lazy" decoding="async" src={item.src} alt="" aria-hidden="true" className="h-9 w-9 rounded-full object-cover" />
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card className="!p-0 flex flex-col h-[60vh] min-h-[360px]">
        <div className="flex-1 overflow-y-auto p-4 space-y-3" aria-live="polite">
          {msgs.map((message, index) => (
            <div key={index} className={`flex gap-2 ${message.from === "me" ? "justify-end" : "items-end"}`}>
              {message.from === "bot" && (
                <img loading="lazy" decoding="async"
                  src={avatar.src}
                  alt=""
                  aria-hidden="true"
                  className="h-8 w-8 shrink-0 rounded-full neu-btn object-cover"
                />
              )}
              <div
                className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm ${
                  message.from === "me"
                    ? "bg-(--color-accent) text-white"
                    : "bg-(--color-accent-soft)"
                }`}
              >
                {message.text}
                {message.from === "bot" && canSpeak && index > 0 && (
                  <button
                    type="button"
                    onClick={() => speak(message.text)}
                    className="ml-2 align-middle opacity-60 hover:opacity-100"
                    title="Suno"
                    aria-label="Yeh jawab suno"
                  >
                    <Volume2 size={14} className="inline" />
                  </button>
                )}
              </div>
            </div>
          ))}
          {typing && (
            <div className="flex items-center gap-2 text-xs text-(--color-muted)">
              <img loading="lazy" decoding="async" src={avatar.src} alt="" aria-hidden="true" className="h-7 w-7 rounded-full object-cover" />
              Aarohi soch kar jawab likh rahi hai…
            </div>
          )}
          <div ref={endRef} />
        </div>

        <div className="px-4 pb-2 flex gap-2 overflow-x-auto">
          {Array.from(new Set([...SUGGESTIONS, ...ROLEPLAY_SUGGESTIONS])).map((suggestion) => (
            <button
              type="button"
              key={suggestion}
              onClick={() => void ask(suggestion)}
              className="shrink-0 text-xs rounded-full neu-btn px-3 py-1.5 hover:bg-(--color-accent-soft)"
            >
              {suggestion}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="p-3 border-t border-(--color-border) flex gap-2">
          <label className="sr-only" htmlFor="aarohi-question">Apna Excel sawal</label>
          <input
            id="aarohi-question"
            className={inputCls}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={listening ? "Sun rahi hoon… boliye" : "Apna Excel sawal likho…"}
          />
          {canListen && (
            <Button
              type="button"
              onClick={mic}
              className={listening ? "animate-pulse !bg-red-600" : ""}
            >
              <Mic size={16} />
            </Button>
          )}
          <Button type="submit" disabled={typing || !draft.trim()}>
            <Send size={16} />
          </Button>
        </form>
      </Card>

      <p className="text-xs text-(--color-muted)">
        Aarohi ek AI illustrated study avatar hai — real insaan ya personal selfie nahi. Online jawab is app ke server se aata hai; server/AI uplabdh na ho to built-in Excel notes se jawab milta hai.
      </p>
    </div>
  );
}
