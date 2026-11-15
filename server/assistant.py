"""Aarohi assistant: real conversational AI + built-in bilingual Excel Diploma tutor.

POST /api/assistant  {messages:[{role:"user"|"assistant", content:"..."}]}  ->  {reply, source}

Works anywhere. Configure ONE of these (server/.env or the host's dashboard):

  Google Gemini (free tier available)
    GEMINI_API_KEY=AIza...
    GEMINI_MODEL=gemini-3.8-flash          (optional; self-heals if retired)

  Any OpenAI-compatible provider (OpenAI, Groq, OpenRouter, Ollama, vLLM…)
    LLM_API_KEY=sk-...
    LLM_BASE_URL=https://api.openai.com/v1 (optional, default shown)
    LLM_MODEL=gpt-4o-mini                  (optional, default shown)

  Orvis platform AI (ORVIS_SERVICES) is tried last, before the offline tutor.

With no key at all, the endpoint answers from the built-in bilingual Excel
Diploma tutor, so the app never shows an empty chat — it just becomes less open
ended. The browser has its own, much larger offline brain (`src/lib/aarohi`) and
uses that when this endpoint is unreachable.

Cost control: this endpoint spends real money per call, and guest accounts are
free to create — so it is limited per user AND per IP, with a global ceiling,
and the total conversation size is capped before anything leaves the process.
"""
from __future__ import annotations

import json
import os
import re
import time
import urllib.error
import urllib.request
from collections import defaultdict, deque
from typing import Literal

from auth import client_ip, current_user
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api")

SYSTEM_PROMPT = """Tum "Aarohi" ho — Excel Master Academy ki smart, friendly Hinglish Excel teacher aur study saathi. Student Excel Diploma (Basic se Advanced) kar raha hai: formulas, data cleaning, conditional formatting, data validation, VLOOKUP/XLOOKUP/INDEX-MATCH, Pivot Tables, charts & dashboards, Power Query, VBA macros, GST invoicing, interview prep.

Kaam kaise karo:

1. **Sawal jo poochha hai, wahi answer do.** "VLOOKUP kya hai" ka answer ek-line definition + ek example hai. "VLOOKUP step by step sikhao" ka answer numbered steps hai. "Mera data aisa hai" ka answer usi data par bana formula hai. "Error aa raha hai" ka answer cause → fix hai. Har sawal ko ek hi template me mat dhanso, aur pichhle jawab ko shabd-ba-shabd dohrao mat.

2. **Poori baat-cheet yaad rakho.** "aur samjhao", "iska result?", "in English", "mera data aisa hai", "usme error aaya" — sab pichhle sawal ka continuation hain. Follow-up par naya topic shuru mat karo.

3. **Bhasha student ki.** Hinglish/Hindi likhe to Hinglish me jawab do; English likhe to English me. Beech me mix karne ki zarurat nahi, par headings short rakho.

4. **Formula hamesha code me**, poora, copy-paste-ready: `=VLOOKUP(A2,$F$2:$H$100,3,0)`. Uske neeche har argument ka matlab ek line me. Formula adhoora ya `...` wala kabhi mat do.

5. **Example me asli numbers do** — 3-5 row ki chhoti table, formula, aur "answer kyun aaya" ek line me. Student ke bheje hue data ho to usi ke column names use karo.

6. **Galtiyan pehle batao, IFERROR se chhupao mat.** Har lookup/array formula ke saath sabse aam galti aur uska pakka ilaaj batao (type mismatch, unlocked range, approximate match, spill block).

7. **Chhota rakho par poora.** 250-450 shabd. Bahut lamba jawab bhi bura hai. Zarurat ho to poochho: "chahe to main isi ka step-by-step ya practice task bhi de sakti hoon."

8. **Aakhir me ek aage ka kadam** — ek chhota practice task YA ek follow-up sawal. Ek se zyada suggestion ki list mat banao.

9. **Roleplay** (interview, office manager, teacher, quiz partner) bilkul welcome hai. Ek-ek sawal poochho, student ke jawab par feedback do, aur agla sawal poochho.

10. Tum AI study companion ho, insaan nahi. Romantic/flirty baatein ya personal photo maangna politely decline karke Excel par wapas lao. Medical/legal/financial advice, ya Excel se bahar ke sawal par: politely bolo ki tum Excel Diploma teacher ho, aur ek Excel topic suggest karo.

11. **Kabhi jhooth mat bolo.** Agar kisi function ka exact behaviour pakka nahi (naya function, version-specific bug), to saaf bolo "is version me confirm kar lo" aur safe alternative do. Galat formula dene se behtar hai honest rehna.
"""


class Msg(BaseModel):
    role: Literal["user", "assistant", "bot"]
    content: str = Field(min_length=1, max_length=4000)


class Body(BaseModel):
    messages: list[Msg] = Field(min_length=1, max_length=20)


_MAX_REQUESTS_PER_MINUTE = 20      # per signed-in user (a guest counts as one)
_MAX_REQUESTS_PER_IP = 40          # per client IP, across all its guests
_MAX_REQUESTS_GLOBAL = 120         # whole process, all users
_MAX_TOTAL_CHARS = 24_000          # what actually gets sent to the model
_requests: dict[str, deque[float]] = defaultdict(deque)
_WINDOW_S = 60.0


def _rate_limit(key: str, limit: int, message: str) -> None:
    now = time.monotonic()
    q = _requests[key]
    while q and now - q[0] > _WINDOW_S:
        q.popleft()
    if len(q) >= limit:
        retry = max(1, int(_WINDOW_S - (now - q[0])))
        raise HTTPException(429, message, headers={"Retry-After": str(retry)})
    q.append(now)
    if len(_requests) > 20_000:
        for k in [k for k, v in _requests.items() if not v]:
            _requests.pop(k, None)


def _clean(msgs: list[Msg]) -> list[dict]:
    out = [{"role": "assistant" if m.role in ("assistant", "bot") else "user", "content": m.content.strip()} for m in msgs if m.content.strip()]
    return out[-20:]


def _trim(messages: list[dict]) -> list[dict]:
    """Keep the newest turns that fit the budget (always keeps the last one)."""
    kept: list[dict] = []
    total = 0
    for message in reversed(messages):
        size = len(message["content"])
        if kept and total + size > _MAX_TOTAL_CHARS:
            break
        kept.append(message)
        total += size
    return list(reversed(kept))


def _via_openai(messages: list[dict]) -> str:
    base = os.environ.get("LLM_BASE_URL", "https://api.openai.com/v1").rstrip("/")
    body = {
        "model": os.environ.get("LLM_MODEL", "gpt-4o-mini"),
        "messages": [{"role": "system", "content": SYSTEM_PROMPT}] + messages,
        "temperature": 0.6,
        "max_tokens": 750,
    }
    req = urllib.request.Request(
        f"{base}/chat/completions",
        data=json.dumps(body).encode(),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {os.environ['LLM_API_KEY']}",
        },
    )
    with urllib.request.urlopen(req, timeout=60) as r:
        data = json.loads(r.read())
    return data["choices"][0]["message"]["content"].strip()


# Google retires Gemini models: gemini-2.0-flash was removed and the API now
# answers "…is no longer available. Please update your code to use
# models/gemini-3.8-flash". A hardcoded name therefore breaks every chat on a
# date nobody controls, so the name is resolved at runtime instead.
DEFAULT_GEMINI_MODEL = os.environ.get("DEFAULT_GEMINI_MODEL", "gemini-3.8-flash")
GEMINI_FALLBACKS = [
    "gemini-3.8-flash",
    "gemini-3-flash",
    "gemini-3.8-pro",
    "gemini-3-pro",
    "gemini-flash-latest",
    "gemini-pro-latest",
    "gemini-2.5-flash",
]
_gemini_model_cache: dict[str, str] = {}


def _gemini_models(key: str, base: str) -> list[str]:
    """Models this key can actually call, best chat model first."""
    req = urllib.request.Request(f"{base}/models?pageSize=200", headers={"x-goog-api-key": key})
    with urllib.request.urlopen(req, timeout=30) as r:
        data = json.loads(r.read())
    names = []
    for model in data.get("models") or []:
        if "generateContent" not in (model.get("supportedGenerationMethods") or []):
            continue
        name = str(model.get("name", "")).removeprefix("models/")
        if not name or "gemini" not in name.lower():
            continue
        if any(skip in name.lower() for skip in ("embedding", "aqa", "imagen", "tts", "live")):
            continue
        names.append(name)
    # Cheap and fast first: flash before pro, newest version number first.
    names.sort(key=lambda n: (0 if "flash" in n else 1, -len(n)))
    return list(dict.fromkeys(names))


def _gemini_call(base: str, key: str, model: str, body: dict) -> str:
    req = urllib.request.Request(
        f"{base}/models/{model}:generateContent",
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json", "x-goog-api-key": key},
    )
    with urllib.request.urlopen(req, timeout=60) as r:
        data = json.loads(r.read())
    candidates = data.get("candidates") or []
    if not candidates:
        raise RuntimeError(f"gemini({model}): no candidates")
    text = "".join(p.get("text", "") for p in (candidates[0].get("content", {}).get("parts") or [])).strip()
    if not text:
        raise RuntimeError(f"gemini({model}): empty reply")
    return text


def _via_gemini(messages: list[dict]) -> str:
    """Google Gemini, stdlib only — no SDK, so the Docker image stays small.

    Gemini keeps the transcript in `contents` and the personality in
    `systemInstruction`. Note the role names: Gemini says "model", not
    "assistant", and it needs at least one user turn.

    A retired model heals itself: the configured name, then the replacement
    Google names in its own error, then whatever the key can use, then the
    shipped fallbacks. The working model is remembered per process.
    """
    key = os.environ["GEMINI_API_KEY"].strip()
    base = os.environ.get("GEMINI_BASE_URL", "https://generativelanguage.googleapis.com/v1beta").rstrip("/")
    body = {
        "systemInstruction": {"parts": [{"text": SYSTEM_PROMPT}]},
        "contents": [
            {"role": "model" if m["role"] == "assistant" else "user", "parts": [{"text": m["content"]}]}
            for m in messages
            if m.get("content")
        ],
        "generationConfig": {"temperature": 0.7, "maxOutputTokens": 1200, "topP": 0.95},
    }

    configured = os.environ.get("GEMINI_MODEL", "").strip()
    queue = [configured or _gemini_model_cache.get("working") or DEFAULT_GEMINI_MODEL]
    tried: list[str] = []
    last: Exception | None = None

    while queue:
        model = queue.pop(0)
        if not model or model in tried:
            continue
        tried.append(model)
        try:
            text = _gemini_call(base, key, model, body)
            _gemini_model_cache["working"] = model
            return text
        except urllib.error.HTTPError as exc:
            try:
                detail = json.loads(exc.read() or b"{}").get("error", {}).get("message", "")
            except Exception:  # noqa: BLE001 - a non-JSON error body is still an error
                detail = ""
            last = exc
            retired = exc.code == 404 or "no longer available" in detail.lower() or "not found" in detail.lower()
            if not retired:
                raise RuntimeError(f"gemini({model}): {detail or exc.code}") from exc
            match = re.search(r"use\s+(?:the\s+)?models/([\w.-]+)", detail, re.I)
            if match and match.group(1) not in tried:
                queue.insert(0, match.group(1))
            if not _gemini_model_cache.get("discovered"):
                try:
                    _gemini_model_cache["discovered"] = "1"
                    queue.extend([n for n in _gemini_models(key, base) if n not in tried])
                except Exception:  # noqa: BLE001 - discovery is best effort
                    pass
            queue.extend([n for n in GEMINI_FALLBACKS if n not in tried])
        except Exception as exc:  # noqa: BLE001 - network/JSON failures fall through to the next provider
            last = exc
            break

    raise RuntimeError(f"gemini: {last}")


def _via_orvis(messages: list[dict]) -> str:
    from orvis import orvis

    full = [{"role": "system", "content": SYSTEM_PROMPT}] + messages
    return orvis.ai.chat(full, max_tokens=750)["content"].strip()


_BUILTIN_TOPICS: list[tuple[tuple[str, ...], str]] = [
    (
        ("selfie", "photo bhej", "tumhari photo", "flirt", "romantic", "girlfriend", "seductive"),
        "Main ek AI illustrated study companion hoon — personal photos ya romantic roleplay nahi karti.\n\n🇬🇧 Let's focus on your Excel Diploma skills! Ask me about XLOOKUP, Pivot Tables, Data Cleaning, Power Query, or VBA Macros.",
    ),
    (
        ("xlookup",),
        "🔎 **XLOOKUP (Modern Lookup King)**\n\n🇬🇧 **English:** Searches a lookup array in ANY direction (left/right/up/down) and returns the matching item with built-in error text.\n🇮🇳 **Hindi:** Bina column number gine left ya right kahin se bhi value dhundh lata hai!\n\n• **Syntax:** `=XLOOKUP(A2, $F$2:$F$100, $D$2:$D$100, \"Not Found\")`\n• **Multi-Criteria:** `=XLOOKUP(1, (A:A=G2)*(B:B=H2), D:D)`\n\n👉 Try asking: *'XLOOKUP aur INDEX-MATCH mein kaun kab use karein?'*",
    ),
    (
        ("vlookup",),
        "🔍 **VLOOKUP (Vertical Lookup)**\n\n🇬🇧 **English:** Searches for an ID in the FIRST column of a table and fetches a column to the right.\n🇮🇳 **Hindi:** Table ke pehle column mein ID dhundh kar usi row ka daayen wala column deta hai.\n\n• **Formula:** `=VLOOKUP(A2, $F$2:$H$100, 3, 0)`\n• Lock table with `F4` (`$`), and always pass `0` for Exact Match!\n\n👉 Tip: Wrap with `=IFERROR(VLOOKUP(...), \"Missing\")` to hide `#N/A`.",
    ),
    (
        ("index", "match"),
        "🎯 **INDEX + MATCH Combo**\n\n🇬🇧 **English:** `MATCH` finds the row/column position; `INDEX` grabs the value at that coordinate. Works in every Excel version & supports left + 2D matrix lookups!\n🇮🇳 **Hindi:** `MATCH` position batata hai aur `INDEX` us jagah ki value nikalta hai — column insert hone par bhi nahi tootta!\n\n• **1-Way:** `=INDEX(D2:D100, MATCH(A2, F2:F100, 0))`\n• **2-Way Matrix:** `=INDEX(B2:M20, MATCH(G2,A2:A20,0), MATCH(H1,B1:M1,0))`",
    ),
    (
        ("clean", "trim", "proper", "textsplit", "dirty"),
        "🧹 **Data Cleaning Toolkit**\n\n🇬🇧 **English:** Combine `CLEAN` (removes hidden line breaks), `TRIM` (removes extra spaces), and `PROPER` (Title Case) to purify messy exports.\n🇮🇳 **Hindi:** Gande office data ke faltu space aur chhupe kachre ko hatane ka best formula:\n\n• `=PROPER(TRIM(CLEAN(A2)))`\n• Split columns: `=TEXTSPLIT(A2, \",\")` or `Data → Text to Columns`\n• Deduplicate: `Data → Remove Duplicates`",
    ),
    (
        ("conditional formatting", "row highlight", "color scale", "data bar"),
        "🎨 **Conditional Formatting**\n\n🇬🇧 **English:** Automatically highlights exceptions, progress bars, or entire rows dynamically.\n🇮🇳 **Hindi:** Value ke hisaab se cell ya poori row ka colour apne aap badalta hai!\n\n• **Full Row Highlight** (select `A2:F100`): New Rule → Formula: `=$E2=\"Overdue\"`\n• Lock ONLY column `$E` so the whole row checks Status in Column E!",
    ),
    (
        ("validation", "dropdown", "indirect"),
        "✅ **Data Validation & Smart Dropdowns**\n\n🇬🇧 **English:** Restricts cells to valid dropdown items, numbers, or custom rules so typos never enter your sheet.\n🇮🇳 **Hindi:** Galat entry ko type hote waqt hi rok deta hai!\n\n• **List Dropdown:** `Data → Data Validation → Allow: List`\n• **Dependent Dropdown (State → City):** `=INDIRECT(A2)`\n• **Block Duplicate IDs:** Custom formula `=COUNTIF($A$2:$A$100, A2)=1`",
    ),
    (
        ("pivot", "slicer", "timeline"),
        "🌪️ **Pivot Tables & Slicers**\n\n🇬🇧 **English:** Summarize 100,000+ rows in 10 seconds! Format raw data as `Ctrl + T` Table first, then `Insert → PivotTable`.\n🇮🇳 **Hindi:** Hazaaron rows ka instant summary! `Slicer` aur `Report Connections` lagakar 1 click mein poora dashboard filter karo (`Alt + F5` = Refresh).",
    ),
    (
        ("dashboard", "chart", "kpi", "waterfall"),
        "📊 **Executive Dashboard & Charts**\n\n🇬🇧 **English:** Use a 3-sheet structure (`Data → Pivots → Dashboard`), place 4–5 KPI cards at the top, hide gridlines, and link Slicers to Combo/Bar/Doughnut/Waterfall charts.\n🇮🇳 **Hindi:** `Alt + F1` se turant chart banta hai; 1-page dashboard mein hamesha saaf colours aur clickable Slicers rakho!",
    ),
    (
        ("power query", "unpivot", "etl", "merge"),
        "⚙️ **Power Query (Get & Transform ETL)**\n\n🇬🇧 **English:** Import CSVs or entire folders, clean/Unpivot/Merge once in Query Editor, and click **Refresh** next month for 1-click automation!\n🇮🇳 **Hindi:** Wide mahino (`Jan | Feb | Mar`) ko seedha karne ke liye `Unpivot Other Columns` aur VLOOKUP ki jagah `Merge Queries` use karo!",
    ),
    (
        ("vba", "macro", "xlsm", "alt+f11"),
        "🤖 **VBA Macros Automation**\n\n🇬🇧 **English:** Record repetitive tasks or press `Alt + F11` to code VBA loops and 1-click PDF exporters. Always save macro files as `.xlsm`!\n🇮🇳 **Hindi:** Chhota Auto-PDF VBA code:\n```vba\nSub ExportPDF()\n  ActiveSheet.ExportAsFixedFormat Type:=xlTypePDF, Filename:=\"Report.pdf\"\n  MsgBox \"PDF Saved!\"\nEnd Sub\n```",
    ),
    (
        ("sumifs", "sumif", "countifs", "countif"),
        "🧮 **SUMIFS & COUNTIFS**\n\n🇬🇧 **English:** Add or count records matching multiple criteria. Remember: in `SUMIFS`, `sum_range` comes **FIRST**!\n🇮🇳 **Hindi:** Example: `=SUMIFS(D2:D500, B2:B500, \"North\", C2:C500, \"Pen\")` — North mein Pen ki kul bikri!",
    ),
    (
        ("if", "ifs", "grade", "pass"),
        "🔀 **IF & IFS Logical Formulas**\n\n🇬🇧 **English:** Automate decisions with `=IF(test, true_val, false_val)` or multi-tier `=IFS(...)`.\n🇮🇳 **Hindi:** Grade formula: `=IFS(B2>=80,\"A\", B2>=60,\"B\", B2>=40,\"C\", TRUE,\"F\")`",
    ),
    (
        ("gst", "cgst", "sgst", "igst", "reverse gst"),
        "🧾 **GST Tax Invoice & Reverse GST**\n\n🇬🇧 **English:** Intra-state (`BuyerState = HomeState`) splits 18% into **9% CGST + 9% SGST**; Inter-state charges **18% IGST**. Extract base price from MRP via `=Total / (1 + 18%)`.\n🇮🇳 **Hindi:** Same state mein `=IF(C2=$G$1, ROUND(D2*9%,2), 0)` se CGST/SGST aur alag state mein 18% IGST lagao! MRP ₹1,180 se base keemat = `=1180/1.18` (₹1,000).",
    ),
    (
        ("#null!", "#calc!", "#connect!", "#blocked!", "12 error"),
        "🚑 **All 12 Excel Errors Doctor**\n\n🇬🇧 **English:** `#NULL!` = missing `:` (`=SUM(A1 A10)`); `#SPILL!` = cells below aren't empty; `#CALC!` = empty `FILTER` (add 3rd arg `\"None\"`); `#CONNECT!` = offline data link; `#BLOCKED!` = Trust Center security.\n🇮🇳 **Hindi:** `=SUM(A1:A10)` mein colon lagao (`#NULL!` hat jayega), aur `FILTER` ke aakhir mein `\"No Match\"` zaroor do (`#CALC!` nahi aayega)!",
    ),
    (
        ("color theory", "colour theory", "palette"),
        "🎨 **Report Color Theory**\n\n🇬🇧 **English:** Stick to **2–3 main shades** + high text contrast + neutral canvas (`#FFFFFF` / `#F4F6F7`). Top palettes: Navy `#1B4F72`, Dark Green `#145A32`, or Charcoal `#2C3E50` + Teal `#0E9AA7`.\n🇮🇳 **Hindi:** Rainbow sheet mat banao! 2-3 shades rakho aur laal/peela rang sirf KPI alert ke liye bacha kar rakho.",
    ),
    (
        ("dsum", "dget", "daverage"),
        "🗄️ **Database Functions (`DSUM` & `DGET`)**\n\n🇬🇧 **English:** `=DSUM(A1:E500, \"Sales\", G1:H2)` sums rows matching a visible Criteria Table. `DGET` extracts a unique match and alerts `#NUM!` if duplicate IDs exist!\n🇮🇳 **Hindi:** Auditors `DGET` isliye pasand karte hain kyunki duplicate Employee ID hone par woh turant `#NUM!` dikha kar galti pakadwa deta hai!",
    ),
    (
        ("interview", "roleplay", "mock"),
        "🎤 **Mock Interview Mode Ready!**\n\n🇬🇧 **Question 1:** You have `EmpID` in Column C and `Department` in Column A. Why does `VLOOKUP` fail here, and what exact `XLOOKUP` or `INDEX-MATCH` formula solves it?\n🇮🇳 Apna jawab formula ke saath likho — main turant interviewer feedback dungi!",
    ),
]


def _builtin_tutor(messages: list[dict]) -> str:
    last_user = next((m["content"] for m in reversed(messages) if m["role"] == "user"), "")
    prev_user = ""
    seen_last = False
    for m in reversed(messages):
        if m["role"] == "user":
            if not seen_last:
                seen_last = True
            else:
                prev_user = m["content"]
                break

    combined = last_user.lower()
    if len(last_user.split()) <= 6 and prev_user:
        combined = f"{prev_user.lower()} {combined}"

    for keys, answer in _BUILTIN_TOPICS:
        if any(k in combined for k in keys):
            return answer

    # Defer unknown specialized formula/chapter lookups to the frontend's 249-formula + 40-chapter KB
    raise RuntimeError("delegate-to-client-kb")


@router.post("/assistant")
def assistant(body: Body, request: Request, user: dict = Depends(current_user)):
    uid = str(user.get("id") or "anonymous")
    _rate_limit(f"user|{uid}", _MAX_REQUESTS_PER_MINUTE, "too many assistant requests — wait a minute")
    _rate_limit(f"ip|{client_ip(request)}", _MAX_REQUESTS_PER_IP, "too many assistant requests from this network — wait a minute")
    _rate_limit("global", _MAX_REQUESTS_GLOBAL, "Aarohi is busy right now — try again in a minute")
    messages = _trim(_clean(body.messages))
    if not messages:
        raise HTTPException(400, "empty conversation")

    if os.environ.get("GEMINI_API_KEY"):
        try:
            return {"reply": _via_gemini(messages), "source": "gemini"}
        except Exception as exc:
            print(f"[assistant] gemini failed: {type(exc).__name__}: {exc}", flush=True)

    if os.environ.get("LLM_API_KEY"):
        try:
            return {"reply": _via_openai(messages), "source": "llm"}
        except Exception as exc:
            print(f"[assistant] llm failed: {type(exc).__name__}: {exc}", flush=True)

    if os.environ.get("ORVIS_SERVICES"):
        try:
            return {"reply": _via_orvis(messages), "source": "orvis"}
        except Exception:
            pass

    try:
        return {"reply": _builtin_tutor(messages), "source": "builtin"}
    except Exception as exc:
        print(f"[assistant] upstream failure: {type(exc).__name__}: {exc}", flush=True)
        raise HTTPException(502, "Aarohi abhi online nahi hai — built-in Excel notes se jawab mil raha hai.") from exc
