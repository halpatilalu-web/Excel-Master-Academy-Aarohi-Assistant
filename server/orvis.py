"""Orvis platform client for the app server — stdlib only.

Reads ORVIS_API_URL / ORVIS_APP_ID / ORVIS_SECRET_KEY / ORVIS_SERVICES from the
process env (``load_env()`` fills them from ``server/.env``, which
``provision-service.py`` writes). The secret key never leaves this process:
the browser talks to *this* server's ``/api/*`` routes, and this module talks
to Orvis.

    from orvis import orvis
    if "ai" in orvis.enabled:
        reply = orvis.ai.chat([{"role": "user", "content": "hi"}])["content"]
        for delta in orvis.ai.chat_stream(messages): ...
    if "ai_image" in orvis.enabled:
        img = orvis.ai.image("a watercolor fox", aspect_ratio="4:5")   # {"key","url",…}

Errors raise ``OrvisError(status, code, detail)``; 402 = the app owner is out
of Orvis credits, 429 = rate/daily budget, 403 = service not enabled.
"""

from __future__ import annotations

import hashlib
import hmac
import base64
import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any, Dict, Iterator, List, Optional, Sequence

_ENV_PATH = Path(__file__).resolve().parent / ".env"
_DEFAULT_TIMEOUT_S = 90


def load_env(path: Path = _ENV_PATH, *, override: bool = False) -> Dict[str, str]:
    """Load KEY=VALUE lines from ``server/.env`` into os.environ (no python-dotenv)."""
    loaded: Dict[str, str] = {}
    try:
        text = Path(path).read_text(encoding="utf-8")
    except OSError:
        return loaded
    for raw in text.splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key, value = key.strip(), value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
            value = value[1:-1]
        if key and (override or key not in os.environ):
            os.environ[key] = value
        loaded[key] = value
    return loaded


def _q(v: Any) -> str:
    return urllib.parse.quote(str(v), safe="")


class OrvisError(Exception):
    """A non-2xx answer from the platform. ``str()`` never includes the key."""

    def __init__(self, status: int, code: str, detail: str) -> None:
        super().__init__(f"{status} {code}: {detail}")
        self.status = status
        self.code = code
        self.detail = detail


class _Http:
    def __init__(self, client: "Orvis") -> None:
        self._c = client

    def _headers(self, extra: Optional[Dict[str, str]] = None) -> Dict[str, str]:
        if not self._c.secret_key:
            raise OrvisError(0, "not_configured", "ORVIS_SECRET_KEY missing — run provision-service.py")
        h = {
            "Authorization": f"Bearer {self._c.secret_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": f"orvis-app/{self._c.app_id or 'unknown'}",
        }
        h.update(extra or {})
        return h

    def request(self, method: str, path: str, body: Any = None, *, timeout: Optional[int] = None) -> Any:
        data = None if body is None else json.dumps(body).encode("utf-8")
        req = urllib.request.Request(self._c.url(path), data=data, method=method, headers=self._headers())
        try:
            with urllib.request.urlopen(req, timeout=timeout or self._c.timeout) as resp:
                raw = resp.read()
                return json.loads(raw) if raw else None
        except urllib.error.HTTPError as exc:
            raise _to_error(exc)
        except urllib.error.URLError as exc:
            raise OrvisError(0, "unreachable", f"cannot reach Orvis at {self._c.api_url}: {exc.reason}")

    def stream_sse(self, path: str, body: Any, *, timeout: Optional[int] = None) -> Iterator[Dict[str, Any]]:
        """Yield each ``data:`` JSON object of an SSE response; stop at [DONE]."""
        data = json.dumps(body).encode("utf-8")
        req = urllib.request.Request(
            self._c.url(path), data=data, method="POST",
            headers=self._headers({"Accept": "text/event-stream"}),
        )
        try:
            resp = urllib.request.urlopen(req, timeout=timeout or self._c.timeout)
        except urllib.error.HTTPError as exc:
            raise _to_error(exc)
        except urllib.error.URLError as exc:
            raise OrvisError(0, "unreachable", f"cannot reach Orvis at {self._c.api_url}: {exc.reason}")
        with resp:
            for raw_line in resp:
                line = raw_line.decode("utf-8", "replace").rstrip("\r\n")
                if not line.startswith("data:"):
                    continue
                payload = line[5:].strip()
                if payload == "[DONE]":
                    return
                try:
                    yield json.loads(payload)
                except json.JSONDecodeError:
                    continue


def _to_error(exc: urllib.error.HTTPError) -> OrvisError:
    code, detail = "http_error", exc.reason or ""
    try:
        body = json.loads(exc.read().decode("utf-8", "replace"))
        err = body.get("error") if isinstance(body, dict) else None
        if isinstance(err, dict):
            code = str(err.get("code") or code)
            detail = str(err.get("message") or detail)
        elif isinstance(body, dict):
            code = str(body.get("code") or code)
            detail = str(body.get("detail") or detail)
    except Exception:
        pass
    return OrvisError(exc.code, code, detail)


class _AI:
    """``orvis.ai`` — chat completions (OpenAI-compatible under the hood)."""

    def __init__(self, http: _Http) -> None:
        self._http = http

    def chat(
        self,
        messages: List[Dict[str, Any]],
        *,
        model: Optional[str] = None,
        max_tokens: Optional[int] = None,
        response_json_schema: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Return ``{"content": str, "usage": {...}, "id": str}``.

        ``model`` is a tier ("fast" | "smart") unless the owner brought their
        own provider. With ``response_json_schema`` the content is a JSON
        string matching the schema (also returned parsed as ``"json"``).
        """
        body: Dict[str, Any] = {"messages": messages, "stream": False}
        if model:
            body["model"] = model
        if max_tokens:
            body["max_tokens"] = int(max_tokens)
        if response_json_schema is not None:
            body["response_format"] = {
                "type": "json_schema",
                "json_schema": {"name": "answer", "schema": response_json_schema},
            }
        data = self._http.request("POST", "/api/v1/platform/v1/chat/completions", body)
        content = ((data.get("choices") or [{}])[0].get("message") or {}).get("content") or ""
        out = {"id": data.get("id", ""), "content": content, "usage": data.get("usage") or {}}
        if response_json_schema is not None:
            try:
                out["json"] = json.loads(content)
            except json.JSONDecodeError:
                out["json"] = None
        return out

    def chat_stream(
        self,
        messages: List[Dict[str, Any]],
        *,
        model: Optional[str] = None,
        max_tokens: Optional[int] = None,
    ) -> Iterator[str]:
        """Yield text deltas as they arrive. Raises ``OrvisError`` on a mid-stream error."""
        body: Dict[str, Any] = {"messages": messages, "stream": True}
        if model:
            body["model"] = model
        if max_tokens:
            body["max_tokens"] = int(max_tokens)
        for chunk in self._http.stream_sse("/api/v1/platform/v1/chat/completions", body):
            err = chunk.get("error")
            if isinstance(err, dict):
                raise OrvisError(502, str(err.get("code") or "error"), str(err.get("message") or "stream error"))
            for choice in chunk.get("choices") or []:
                text = (choice.get("delta") or {}).get("content")
                if text:
                    yield text

    # ── vision helpers ───────────────────────────────────────────────
    # The model can look at images. Build the message with these rather than
    # hand-assembling content parts; the platform takes the image inline and
    # never fetches a URL for you.

    @staticmethod
    def image_part(data: Any, media_type: str = "image/jpeg") -> Dict[str, Any]:
        """One image content part. ``data`` may be raw bytes, base64 text, or a
        full ``data:`` URI (in which case ``media_type`` is read from it)."""
        if isinstance(data, (bytes, bytearray)):
            url = "data:" + media_type + ";base64," + base64.b64encode(bytes(data)).decode()
        else:
            text = str(data)
            url = text if text.startswith("data:") else f"data:{media_type};base64,{text}"
        return {"type": "image_url", "image_url": {"url": url}}

    @classmethod
    def user_message(
        cls, text: str, images: Optional[Sequence[Any]] = None, *, media_type: str = "image/jpeg",
    ) -> Dict[str, Any]:
        """A user turn carrying text plus any images::

            reply = orvis.ai.chat([orvis.ai.user_message(q, images=[photo_bytes])])
        """
        if not images:
            return {"role": "user", "content": text}
        parts: List[Dict[str, Any]] = [{"type": "text", "text": text}] if text else []
        parts.extend(cls.image_part(i, media_type) for i in images)
        return {"role": "user", "content": parts}

    def models(self) -> List[str]:
        data = self._http.request("GET", "/api/v1/platform/v1/models")
        return [m.get("id", "") for m in (data.get("data") or [])]

    # ── image generation (service ``ai_image``) ──────────────────────
    # Orvis picks the model and stores the result in this app's file space;
    # each image is billed to the owner's credits.

    def image(
        self,
        prompt: str,
        *,
        aspect_ratio: Optional[str] = None,
        size: Optional[str] = None,
        quality: Optional[str] = None,
        reference_images: Optional[Sequence[Any]] = None,
        idempotency_key: Optional[str] = None,
        media_type: str = "image/jpeg",
    ) -> Dict[str, Any]:
        """Generate one image. ``{"key","url","expires_in","content_type","size_bytes","model","deduped"}``.

        ``url`` is a signed link valid ``expires_in`` seconds — store ``key``
        and call ``image_url(key)`` for a fresh one. ``reference_images``
        (≤ 2) guide the result: raw bytes, base64 or ``data:`` URIs. Pass
        ``idempotency_key`` so a retried request returns the same image and
        is never billed twice.
        """
        body: Dict[str, Any] = {"prompt": prompt}
        for name, value in (("aspect_ratio", aspect_ratio), ("size", size), ("quality", quality),
                            ("idempotency_key", idempotency_key)):
            if value:
                body[name] = value
        if reference_images:
            body["reference_images"] = [self.image_part(i, media_type)["image_url"]["url"] for i in reference_images]
        return self._http.request("POST", "/api/v1/platform/ai/image", body, timeout=180) or {}

    def image_url(self, key: str) -> Dict[str, Any]:
        """A fresh signed link for a generated image: ``{"url","expires_in","content_type"}``."""
        return self._http.request("GET", f"/api/v1/platform/ai/image/download-url?key={_q(key)}", timeout=15) or {}

    def delete_image(self, key: str) -> Dict[str, Any]:
        return self._http.request("DELETE", f"/api/v1/platform/ai/image?key={_q(key)}", timeout=15) or {}


class _Auth:
    """``orvis.auth`` — Google login brokered by the platform (service ``google_auth``)."""

    def __init__(self, http: _Http) -> None:
        self._http = http

    def exchange(self, code: str) -> Dict[str, Any]:
        """One-time login code (from `?orvis_code=`) → verified profile
        ``{"id","provider","subject","email","email_verified","name","picture"}``."""
        data = self._http.request("POST", "/api/v1/platform/auth/exchange", {"code": code}, timeout=15)
        return data.get("user") or {}


class _Integrations:
    """``orvis.integrations`` — admin-added REST services (kind ``http_api``).

    Which ops exist is listed in the service's how-to that
    ``provision-service.py --service <slug>`` prints (``docs_md``).
    """

    def __init__(self, http: _Http) -> None:
        self._http = http

    def call(
        self,
        service: str,
        op: str,
        *,
        path: Optional[Dict[str, Any]] = None,
        query: Optional[Dict[str, Any]] = None,
        body: Any = None,
        timeout: Optional[int] = None,
    ) -> Dict[str, Any]:
        """Return ``{"status": upstream_status, "data": parsed_json_or_text}``."""
        payload: Dict[str, Any] = {}
        if path:
            payload["path"] = path
        if query:
            payload["query"] = query
        if body is not None:
            payload["body"] = body
        data = self._http.request("POST", f"/api/v1/platform/x/{service}/{op}", payload, timeout=timeout)
        return {"status": data.get("status"), "data": data.get("data"), "orvis": data.get("orvis") or {}}


class _Storage:
    """``orvis.storage`` — files that persist (service ``storage``).

    The browser uploads straight to S3 with a one-time URL this returns; this
    server only brokers and records. Keys are per app; scope them per user
    yourself (``u/<user_id>/…``) and check ownership before signing a download.
    """

    def __init__(self, http: "_Http") -> None:
        self._http = http

    def presign_upload(self, key: str, *, content_type: str, size: int, visibility: str = "private") -> Dict[str, Any]:
        """``{"url", "method":"PUT", "headers", "expires_in", "key"}`` for the browser."""
        return self._http.request("POST", "/api/v1/platform/storage/upload-url", {
            "key": key, "content_type": content_type, "size": int(size), "visibility": visibility,
        }, timeout=20) or {}

    def confirm(self, key: str, *, visibility: str = "private") -> Dict[str, Any]:
        """After the PUT: records real size/type; ``{"key","size_bytes","content_type",…}``."""
        return self._http.request("POST", "/api/v1/platform/storage/confirm", {"key": key, "visibility": visibility}, timeout=30) or {}

    def sign(self, key: str, *, filename: Optional[str] = None) -> Dict[str, Any]:
        """A time-limited download URL: ``{"url","expires_in","content_type"}``."""
        q = f"?key={_q(key)}" + (f"&filename={_q(filename)}" if filename else "")
        return self._http.request("GET", "/api/v1/platform/storage/download-url" + q, timeout=15) or {}

    def list(self, prefix: str = "", limit: int = 200) -> Dict[str, Any]:
        return self._http.request("GET", f"/api/v1/platform/storage/objects?prefix={_q(prefix)}&limit={int(limit)}", timeout=15) or {}

    def delete(self, key: str) -> Dict[str, Any]:
        return self._http.request("DELETE", "/api/v1/platform/storage/objects/" + key, timeout=15) or {}


class _Email:
    """``orvis.email`` — transactional mail (service ``email``). Orvis sends it
    (From "<app> via Orvis", Reply-To the owner) or the owner's own SMTP does."""

    def __init__(self, http: "_Http") -> None:
        self._http = http

    def send(
        self, to: str, subject: str, *, html: str = "", text: str = "",
        reply_to: Optional[str] = None, idempotency_key: Optional[str] = None,
    ) -> Dict[str, Any]:
        """``{"id", "provider_message_id", "deduped"}``. Pass ``idempotency_key``
        (e.g. ``f"receipt:{order_id}"``) so a retry can never send twice."""
        body: Dict[str, Any] = {"to": to, "subject": subject, "html": html, "text": text}
        if reply_to:
            body["reply_to"] = reply_to
        if idempotency_key:
            body["idempotency_key"] = idempotency_key
        return self._http.request("POST", "/api/v1/platform/email/send", body, timeout=30) or {}


class _Payments:
    """``orvis.payments`` — Razorpay checkout on the app OWNER's own account.

    The owner's key secret stays on the platform; this app only ever sees the
    publishable key id. Money settles to the owner and Orvis charges nothing.
    """

    def __init__(self, http: "_Http", client: "Orvis") -> None:
        self._http = http
        self._c = client

    def config(self) -> Dict[str, Any]:
        """``{"key_id", "currency", "configured", "max_amount_minor"}`` for the widget."""
        return self._http.request("GET", "/api/v1/platform/payments/config", timeout=15) or {}

    def create_order(
        self,
        amount_minor: int,
        *,
        currency: Optional[str] = None,
        receipt: Optional[str] = None,
        notes: Optional[Dict[str, str]] = None,
    ) -> Dict[str, Any]:
        """Create a Razorpay order. ``amount_minor`` is paise for INR, cents elsewhere."""
        body: Dict[str, Any] = {"amount_minor": int(amount_minor)}
        if currency:
            body["currency"] = currency
        if receipt:
            body["receipt"] = receipt
        if notes:
            body["notes"] = notes
        return self._http.request("POST", "/api/v1/platform/payments/orders", body, timeout=30) or {}

    def verify(self, order_id: str, payment_id: str, signature: str) -> Dict[str, Any]:
        """Check the checkout callback. ``{"verified", "paid", "status", …}``;
        only treat the payment as real when BOTH ``verified`` and ``paid``."""
        return self._http.request("POST", "/api/v1/platform/payments/verify", {
            "razorpay_order_id": order_id,
            "razorpay_payment_id": payment_id,
            "razorpay_signature": signature,
        }, timeout=30) or {}

    def verify_webhook(self, raw_body: bytes, signature_header: str, *, tolerance_s: int = 300) -> bool:
        """True when ``X-Orvis-Signature`` really came from Orvis for this app.

        Orvis signs ``<ts>.<body>`` with HMAC-SHA256 keyed on the sha256 of this
        app's secret key — a value both sides already have, so no extra secret
        is exchanged. Reject anything older than ``tolerance_s`` (replay guard).
        """
        if not self._c.secret_key or not signature_header:
            return False
        parts = dict(
            kv.split("=", 1) for kv in signature_header.split(",") if "=" in kv
        )
        stamp, sent = parts.get("t", ""), parts.get("v1", "")
        if not stamp or not sent:
            return False
        try:
            age = abs(int(time.time()) - int(stamp))
        except ValueError:
            return False
        if age > tolerance_s:
            return False
        key = hashlib.sha256(self._c.secret_key.strip().encode("utf-8")).hexdigest()
        expected = hmac.new(key.encode("utf-8"), f"{stamp}.".encode("utf-8") + raw_body, hashlib.sha256)
        return hmac.compare_digest(expected.hexdigest(), sent)


class Orvis:
    def __init__(
        self,
        *,
        api_url: Optional[str] = None,
        secret_key: Optional[str] = None,
        app_id: Optional[str] = None,
        services: Optional[str] = None,
        timeout: int = _DEFAULT_TIMEOUT_S,
    ) -> None:
        self.api_url = (api_url or os.environ.get("ORVIS_API_URL") or "").rstrip("/")
        # Browser-facing base for redirects (Google login hop); same as api_url unless set.
        self.public_api_url = (os.environ.get("ORVIS_PUBLIC_API_URL") or self.api_url).rstrip("/")
        self.secret_key = secret_key or os.environ.get("ORVIS_SECRET_KEY") or ""
        self.app_id = app_id or os.environ.get("ORVIS_APP_ID") or ""
        raw = services if services is not None else os.environ.get("ORVIS_SERVICES", "")
        self.enabled = frozenset(s.strip() for s in raw.split(",") if s.strip())
        self.timeout = timeout
        self._http = _Http(self)
        self.ai = _AI(self._http)
        self.integrations = _Integrations(self._http)
        self.auth = _Auth(self._http)
        self.payments = _Payments(self._http, self)
        self.storage = _Storage(self._http)
        self.email = _Email(self._http)

    @property
    def configured(self) -> bool:
        return bool(self.api_url and self.secret_key and self.app_id)

    def url(self, path: str) -> str:
        if not self.api_url:
            raise OrvisError(0, "not_configured", "ORVIS_API_URL missing — run provision-service.py")
        return self.api_url + path

    def health(self) -> Dict[str, Any]:
        """Unauthenticated platform liveness (used by the verify gate)."""
        req = urllib.request.Request(self.url("/api/v1/platform/health"), headers={"Accept": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                return json.loads(resp.read() or b"{}")
        except urllib.error.HTTPError as exc:
            raise _to_error(exc)
        except urllib.error.URLError as exc:
            raise OrvisError(0, "unreachable", f"cannot reach Orvis at {self.api_url}: {exc.reason}")

    def __repr__(self) -> str:
        masked = (self.secret_key[:8] + "…") if self.secret_key else "<unset>"
        return f"Orvis(api_url={self.api_url!r}, app_id={self.app_id!r}, key={masked}, enabled={sorted(self.enabled)})"


load_env()
orvis = Orvis()
