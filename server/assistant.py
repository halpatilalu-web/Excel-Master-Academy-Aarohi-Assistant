"""Aarohi assistant: real conversational AI (remembers the chat, explains follow-ups).

POST /api/assistant  {messages:[{role:"user"|"assistant", content:"..."}]}  ->  {reply, source}

Works anywhere. Configure ONE of these in server/.env:
  LLM_API_KEY=sk-...                      (any OpenAI-compatible provider)
  LLM_BASE_URL=https://api.openai.com/v1  (optional, default shown)
  LLM_MODEL=gpt-4o-mini                   (optional)
If LLM_API_KEY is missing, falls back to the Orvis platform AI when available.

Cost control: this endpoint spends real money per call, and guest accounts are
free to create — so it is limited per user AND per IP, with a global ceiling,
and the total conversation size is capped before anything leaves the process.
"""
from __future__ import annotations

import json
import os
import time
import urllib.request
from collections import defaultdict, deque
from typing import Literal

from auth import client_ip, current_user
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api")

SYSTEM_PROMPT = """Tum "Aarohi" ho — ek friendly, energetic Indian AI Excel creator aur study saathi. Tum Hinglish (Hindi in Roman script + simple English Excel terms) me ek warm desi dost/teacher ki tarah baat karti ho: encouraging, clear, thoda sa halka humor, lekin hamesha respectful aur professional.

Rules:
1. Poori conversation yaad rakho. Agar user bole "iska result kya aayega", "aur samjhao", "example do", "isme error aaya" — to pichle sawal/formula ko hi continue karo. Kabhi wahi purana jawab dobara mat do.
2. Sirf kisi stored data tak limited mat raho. Excel, Google Sheets, formulas, shortcuts, Pivot, Power Query, VBA, charts, dashboards, data cleaning, exam/interview prep — sab par apne poore knowledge se jawab do. Excel se bahar ka chhota sawal bhi ho to safe tareeke se madad karo aur phir seekhne par wapas lao.
3. Learning roleplay welcome hai: interviewer, office manager, client, teacher ya practice partner bankar ek-ek sawal/task do, user ke jawab par feedback do, aur scenario ko Excel seekhne par rakho.
4. Samjhane ka tareeka: pehle 1 line mein concept, phir chhota example (sample data table ya 3-5 rows), phir step-by-step, phir result kya aayega, phir common galti/error.
5. Jab user "result kya aayega" puchhe aur data na de, khud realistic sample data bana kar dikhao (jaise Name | Salary) aur formula ka exact output likho.
6. Formula hamesha code format mein likho, jaise =VLOOKUP(A2,$F$2:$H$100,3,0). Har argument ka matlab batao.
7. Jawab chhote aur clear rakho (zyada se zyada ~12 lines), voice mein bhi sunne layak: bahut lambi tables ya symbols avoid karo jab tak zaroori na ho. Emoji kabhi-kabhi 1 se zyada mat lagao.
8. Aakhir mein ek chhota follow-up sawal, mini-practice ya agla step suggest karo.
9. Agar user galat ho to pyaar se sahi karo. Pata na ho to imaandaari se bolo, guess ko fact mat banao.
10. Tum ek AI study companion ho, real insaan nahi. Romantic/flirty/seductive roleplay, personal photo/selfie requests, kisi real person ki tarah personal image banane ke daave ya unsafe content par politely mana karo. User ko app ke illustrated avatar scenes ya Excel learning roleplay ki taraf wapas lao."""


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
        "max_tokens": 700,
    }
    req = urllib.request.Request(
        f"{base}/chat/completions",
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {os.environ['LLM_API_KEY']}"},
    )
    with urllib.request.urlopen(req, timeout=60) as r:
        data = json.loads(r.read())
    return data["choices"][0]["message"]["content"].strip()


def _via_orvis(messages: list[dict]) -> str:
    from orvis import orvis  # only exists inside the Orvis-built project

    full = [{"role": "system", "content": SYSTEM_PROMPT}] + messages
    return orvis.ai.chat(full, max_tokens=700)["content"].strip()


@router.post("/assistant")
def assistant(body: Body, request: Request, user: dict = Depends(current_user)):
    uid = str(user.get("id") or "anonymous")
    _rate_limit(f"user|{uid}", _MAX_REQUESTS_PER_MINUTE, "too many assistant requests — wait a minute")
    _rate_limit(f"ip|{client_ip(request)}", _MAX_REQUESTS_PER_IP, "too many assistant requests from this network — wait a minute")
    _rate_limit("global", _MAX_REQUESTS_GLOBAL, "Aarohi is busy right now — try again in a minute")
    messages = _trim(_clean(body.messages))
    if not messages:
        raise HTTPException(400, "empty conversation")
    try:
        if os.environ.get("LLM_API_KEY"):
            return {"reply": _via_openai(messages), "source": "llm"}
        return {"reply": _via_orvis(messages), "source": "orvis"}
    except Exception as exc:
        # Log the detail for the operator, show the student something actionable.
        print(f"[assistant] upstream failure: {type(exc).__name__}: {exc}", flush=True)
        raise HTTPException(502, "Aarohi abhi online nahi hai — built-in Excel notes se jawab mil raha hai.")
