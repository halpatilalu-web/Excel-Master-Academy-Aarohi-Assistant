"""Aarohi assistant: real conversational AI (remembers the chat, explains follow-ups).

POST /api/assistant  {messages:[{role:"user"|"assistant", content:"..."}]}  ->  {reply, source}

Works anywhere. Configure ONE of these in server/.env:
  LLM_API_KEY=sk-...                      (any OpenAI-compatible provider)
  LLM_BASE_URL=https://api.openai.com/v1  (optional, default shown)
  LLM_MODEL=gpt-4o-mini                   (optional)
If LLM_API_KEY is missing, falls back to the Orvis platform AI when available.
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
    messages: List[Msg] = Field(min_length=1, max_length=20)


_MAX_REQUESTS_PER_MINUTE = 20
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
    out = [{"role": "assistant" if m.role in ("assistant", "bot") else "user", "content": m.content.strip()} for m in msgs if m.content.strip()]
    return out[-20:]


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
def assistant(body: Body, user: dict = Depends(current_user)):
    _rate_limit(str(user.get("id") or "anonymous"))
    messages = _clean(body.messages)
    if not messages:
        raise HTTPException(400, "empty conversation")
    try:
        if os.environ.get("LLM_API_KEY"):
            return {"reply": _via_openai(messages), "source": "llm"}
        return {"reply": _via_orvis(messages), "source": "orvis"}
    except Exception as exc:  # frontend falls back to offline tutor
        raise HTTPException(502, f"assistant unavailable: {type(exc).__name__}")
