import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ArrowUpRight,
  Bot,
  Mic,
  Send,
  Sparkles,
  Trash2,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Button, Card, inputCls } from "../components/ui";
import { AssistantText } from "../components/AssistantText";
import { respond, STARTER_CHIPS, type Turn } from "../lib/aarohi/respond";
import {
  canListen,
  canSpeak,
  listen,
  speak,
  stopSpeaking,
} from "../lib/assistant";

interface Msg {
  from: "me" | "bot";
  text: string;
  chips?: string[];
  /** "brain" answers come from the built-in tutor; "online" from the model. */
  source?: "brain" | "online";
  degraded?: boolean;
}

const HELLO: Msg = {
  from: "bot",
  text: [
    "Namaste! 👋 Main **Aarohi** hoon — aapki Excel Diploma teacher, Hinglish mein.",
    "",
    "Main kisi ek jawab par nahi atakti. Aap kaise bhi poochho, waise hi jawab dungi:",
    "",
    "• \"VLOOKUP kya hai\" — 1 minute ka concept",
    "• \"VLOOKUP step by step sikhao\" — poore steps + har argument",
    "• \"Mera data aisa hai\" — apna table paste karo, usi par formula",
    "• \"#N/A kyun aa raha hai\" — asli wajah aur pakka ilaaj",
    "• \"VLOOKUP vs XLOOKUP\" — kaun kab, farq ke saath",
    "",
    "Neeche se koi bhi suggestion dabao ya seedha likho — Hindi, English ya Hinglish.",
  ].join("\n"),
  chips: STARTER_CHIPS,
};

const KEY = "aarohi_excel_chat_v5";
const AVATAR_KEY = "aarohi_avatar_scene_v1";
const AVATAR = "/aarohi-avatar.jpg";

const AVATARS = [
  { id: "classroom", label: "Classroom", src: "/aarohi-avatar.jpg" },
  { id: "desk", label: "Study desk", src: "/aarohi-avatar-desk.jpg" },
  { id: "office", label: "Office", src: "/aarohi-avatar-office.jpg" },
] as const;

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

    // The brain sees the conversation BEFORE this question.
    const before: Turn[] = history.slice(0, -1).map((m) => ({ from: m.from, text: m.text }));

    let reply: Msg;
    try {
      const answer = await respond(text, { history: before });
      reply = {
        from: "bot",
        text: answer.text,
        chips: answer.chips,
        source: answer.source,
        degraded: answer.degraded,
      };
    } catch {
      reply = {
        from: "bot",
        text: "Kuch technical dikkat aa gayi. Ek baar dobara poochho — ya formula ka naam likh kar poochho (jaise `VLOOKUP`), main built-in notes se zaroor jawab dungi.",
      };
    }

    setMsgs((current) => [...current, reply]);
    setTyping(false);
    if (voiceOnRef.current) speak(reply.text);
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

  const lastChips = [...msgs].reverse().find((m) => m.from === "bot" && m.chips?.length)?.chips ?? STARTER_CHIPS;

  return (
    <div className="max-w-3xl space-y-4">
      {/* ---------------- Identity card: same neumorphic Card, calmer layout ---------------- */}
      <Card className="!p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative shrink-0 self-start">
            <img
              loading="lazy"
              decoding="async"
              src={avatar.src}
              alt="Aarohi ka illustrated avatar — Excel teacher"
              className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-3xl neu-btn shadow-sm"
            />
            <span className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full bg-(--color-accent) text-white shadow-sm">
              <Sparkles size={13} />
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <h1 className="font-display text-xl sm:text-2xl font-extrabold leading-tight">Aarohi</h1>
                <p className="text-xs sm:text-sm text-(--color-muted)">
                  Excel Diploma teacher · Hinglish · follow-up samajhti hai
                </p>
              </div>
              <div className="flex shrink-0 gap-1.5">
                {canSpeak && (
                  <button
                    type="button"
                    title="Jawab sunao"
                    aria-label="Jawab sunao"
                    aria-pressed={voiceOn}
                    onClick={() => {
                      setVoiceOn((value) => !value);
                      stopSpeaking();
                    }}
                    className={`p-2 rounded-full neu-btn ${voiceOn ? "text-(--color-accent)" : ""}`}
                  >
                    {voiceOn ? <Volume2 size={17} /> : <VolumeX size={17} />}
                  </button>
                )}
                <button
                  type="button"
                  title="Chat saaf karo"
                  aria-label="Chat saaf karo"
                  onClick={clear}
                  className="p-2 rounded-full neu-btn"
                >
                  <Trash2 size={17} />
                </button>
              </div>
            </div>

            <div className="mt-2.5 flex flex-wrap gap-1.5 text-[11px]">
              <span className="inline-flex items-center gap-1 rounded-full bg-(--color-accent-soft) px-2.5 py-1 font-semibold">
                <Bot size={11} /> 17 topics · step-by-step
              </span>
              <span className="rounded-full bg-(--color-accent-soft) px-2.5 py-1 font-semibold">Follow-up yaad</span>
              <span className="rounded-full bg-(--color-accent-soft) px-2.5 py-1 font-semibold">Hindi + English</span>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {AVATARS.map((item, index) => (
                <button
                  type="button"
                  key={item.id}
                  aria-pressed={index === avatarIndex}
                  aria-label={`Avatar: ${item.label}`}
                  onClick={() => {
                    setAvatarIndex(index);
                    try {
                      localStorage.setItem(AVATAR_KEY, String(index));
                    } catch {
                      /* ignore */
                    }
                  }}
                  className={`h-9 w-9 rounded-full border-2 transition ${
                    index === avatarIndex
                      ? "border-(--color-accent) scale-105"
                      : "border-transparent opacity-70 hover:opacity-100"
                  }`}
                >
                  <img loading="lazy" decoding="async" src={item.src} alt="" aria-hidden="true" className="h-full w-full rounded-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* ---------------- Chat ---------------- */}
      <Card className="!p-0 flex flex-col h-[62vh] min-h-[380px] overflow-hidden">
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-3" aria-live="polite">
          {msgs.map((message, index) => {
            const isMe = message.from === "me";
            return (
              <div
                key={index}
                data-role={message.from}
                className={`flex gap-2 ${isMe ? "justify-end" : "items-start"}`}
              >
                {!isMe && (
                  <img
                    loading="lazy"
                    decoding="async"
                    src={avatar.src}
                    alt=""
                    aria-hidden="true"
                    className="h-8 w-8 shrink-0 rounded-full neu-btn object-cover mt-0.5"
                  />
                )}
                <div className={`min-w-0 ${isMe ? "max-w-[85%]" : "max-w-[92%] sm:max-w-[88%]"}`}>
                  <div
                    className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                      isMe
                        ? "bg-(--color-accent) text-white whitespace-pre-wrap rounded-br-md"
                        : "bg-(--color-accent-soft) rounded-bl-md"
                    }`}
                  >
                    {isMe ? (
                      message.text
                    ) : (
                      <>
                        <AssistantText text={message.text} />
                        {message.degraded && (
                          <p className="mt-2 text-[11px] text-(--color-muted)">
                            Offline notes se jawab — online AI abhi uplabdh nahi.
                          </p>
                        )}
                      </>
                    )}
                  </div>

                  {!isMe && (
                    <div className="mt-1 flex items-center gap-2 px-1">
                      {canSpeak && index > 0 && (
                        <button
                          type="button"
                          onClick={() => speak(message.text)}
                          className="inline-flex items-center gap-1 text-[11px] text-(--color-muted) hover:text-(--color-accent-dark)"
                          aria-label="Yeh jawab suno"
                        >
                          <Volume2 size={12} /> Suno
                        </button>
                      )}
                      <span className="text-[10px] uppercase tracking-wide text-(--color-muted)/70">
                        {message.source === "online" ? "Online AI" : "Aarohi notes"}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {typing && (
            <div className="flex items-center gap-2 text-xs text-(--color-muted)">
              <img loading="lazy" decoding="async" src={avatar.src} alt="" aria-hidden="true" className="h-7 w-7 rounded-full object-cover" />
              <span className="inline-flex gap-1">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-(--color-accent) [animation-delay:0ms]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-(--color-accent) [animation-delay:120ms]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-(--color-accent) [animation-delay:240ms]" />
              </span>
              Aarohi likh rahi hai…
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Follow-up chips from the last answer — this is what makes the chat feel alive */}
        <div className="px-3.5 pb-1 flex gap-1.5 overflow-x-auto" aria-label="Agle sawal ke suggestions">
          {Array.from(new Set(lastChips)).slice(0, 5).map((suggestion) => (
            <button
              type="button"
              key={suggestion}
              onClick={() => void ask(suggestion)}
              className="shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold rounded-full neu-btn px-3 py-1.5 hover:bg-(--color-accent-soft)"
            >
              {suggestion}
              <ArrowUpRight size={11} className="opacity-60" />
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="p-2.5 sm:p-3 border-t border-(--color-border) flex gap-2">
          <label className="sr-only" htmlFor="aarohi-question">
            Apna Excel sawal
          </label>
          <input
            id="aarohi-question"
            className={inputCls}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={listening ? "Sun rahi hoon… boliye" : "Excel ka koi bhi sawal — ya apna data paste karo…"}
            autoComplete="off"
            enterKeyHint="send"
          />
          {canListen && (
            <Button type="button" onClick={mic} className={listening ? "animate-pulse !bg-red-600" : ""}>
              <Mic size={16} />
            </Button>
          )}
          <Button type="submit" disabled={typing || !draft.trim()}>
            <Send size={16} />
          </Button>
        </form>
      </Card>

      <p className="text-xs text-(--color-muted)">
        Aarohi ek AI illustrated study avatar hai — real insaan nahi. Sahi jawab ke liye koi bhi formula paste karo, ya{" "}
        <span className="font-semibold">“mera data aisa hai”</span> likh kar table bhejo.
      </p>
    </div>
  );
}
