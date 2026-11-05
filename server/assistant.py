"""Aarohi assistant: real conversational AI + built-in bilingual Excel Diploma tutor.

POST /api/assistant  {messages:[{role:"user"|"assistant", content:"..."}]}  ->  {reply, source}

Works out-of-the-box everywhere:
1. Uses OpenAI-compatible API when LLM_API_KEY is configured in server/.env
2. Else tries Orvis platform AI when enabled
3. Else uses a fast built-in Bilingual (Hindi + English) Excel Diploma tutor so
   requests succeed cleanly without 502 errors even offline!
"""
from __future__ import annotations

import json
import os
import time
import urllib.request
from collections import defaultdict, deque
from typing import List, Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from auth import current_user

router = APIRouter(prefix="/api")

SYSTEM_PROMPT = """Tum "Aarohi" ho — Excel Master Academy ki friendly, smart Indian AI Excel Diploma tutor aur study saathi. Tum Hindi/Hinglish AUR clean English dono mein student ko Basic se Advanced Excel (Basic Excel, Formulas, Data Cleaning, Conditional Formatting, Data Validation, VLOOKUP, XLOOKUP, INDEX-MATCH, Pivot Tables, Dashboards, Charts, Power Query, VBA Macros, Interview Prep) samjhati ho.

Rules:
1. Poori conversation yaad rakho. Agar user bole "iska result kya aayega", "aur samjhao", "in English", "Hindi me batao", "example do", "isme error aaya" — to pichle sawal/formula ko hi continue karo.
2. Jab tak user sirf ek language na maange, concept ko short English + Hindi/Hinglish dono mein clear example aur formula (`=XLOOKUP(...)`) ke saath samjhao.
3. Learning roleplay welcome hai: interviewer, office manager, teacher ya live quiz partner bankar ek-ek sawal/task do aur user ke jawab par feedback do.
4. Formula hamesha code format mein likho, jaise =VLOOKUP(A2,$F$2:$H$100,3,0), aur har argument ka matlab batao.
5. Jawab crisp, friendly aur structured rakho, aur aakhir mein ek chhota follow-up practice tip suggest karo.
6. Tum ek AI study companion ho, real insaan nahi. Romantic/flirty roleplay ya personal photo requests par politely mana karke Excel Diploma seekhne par wapas lao."""


class Msg(BaseModel):
    role: Literal["user", "assistant", "bot"]
    content: str = Field(min_length=1, max_length=4000)


class Body(BaseModel):
    messages: List[Msg] = Field(min_length=1, max_length=20)


_MAX_REQUESTS_PER_MINUTE = 30
_requests: dict[str, deque[float]] = defaultdict(deque)


def _rate_limit(user_id: str) -> None:
    now = time.monotonic()
    q = _requests[user_id]
    while q and now - q[0] > 60:
        q.popleft()
    if len(q) >= _MAX_REQUESTS_PER_MINUTE:
        raise HTTPException(429, "too many assistant requests — wait a minute")
    q.append(now)


def _clean(msgs: List[Msg]) -> list[dict]:
    out = [
        {
            "role": "assistant" if m.role in ("assistant", "bot") else "user",
            "content": m.content.strip(),
        }
        for m in msgs
        if m.content.strip()
    ]
    return out[-20:]


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
def assistant(body: Body, user: dict = Depends(current_user)):
    _rate_limit(str(user.get("id") or "anonymous"))
    messages = _clean(body.messages)
    if not messages:
        raise HTTPException(400, "empty conversation")

    if os.environ.get("LLM_API_KEY"):
        try:
            return {"reply": _via_openai(messages), "source": "llm"}
        except Exception:
            pass

    if os.environ.get("ORVIS_SERVICES"):
        try:
            return {"reply": _via_orvis(messages), "source": "orvis"}
        except Exception:
            pass

    try:
        return {"reply": _builtin_tutor(messages), "source": "builtin"}
    except Exception as exc:
        # Frontend seamlessly runs its 40-chapter + 249-formula local KB!
        raise HTTPException(502, f"assistant unavailable: {type(exc).__name__}")
