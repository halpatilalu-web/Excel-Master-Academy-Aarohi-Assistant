"""Platform service routes — inert until ``ORVIS_SERVICES`` names them.

``provision-service.py`` writes ``ORVIS_SERVICES=ai,...`` into ``server/.env``;
``include_enabled(app)`` mounts the matching routers. Adding a service to the
template = one entry in ``REGISTRY``. Nothing here runs for sites or for apps
that never provisioned a service.
"""

from __future__ import annotations

from fastapi import APIRouter, FastAPI

from orvis import orvis

from services import ai, email, images, oauth, payments, uploads

REGISTRY: dict[str, APIRouter | None] = {
    "ai": ai.router,
    "google_auth": oauth.router,
    "payments": payments.router,
    "storage": uploads.router,
    "email": email.router,
    "ai_image": images.router,
}

# Routers a service needs from another one: generated images are ``_uploads``
# records, so ``ai_image`` also mounts the uploads routes (list / url / delete).
COMPANIONS: dict[str, tuple[str, ...]] = {"ai_image": ("storage",)}

meta = APIRouter(prefix="/api")


@meta.get("/services")
def list_services() -> dict:
    """What the frontend and verify-site.py read to know which features exist."""
    return {
        "enabled": sorted(s for s in orvis.enabled if s in REGISTRY),
        "configured": orvis.configured,
        "app_id": orvis.app_id,
    }


def include_enabled(app: FastAPI) -> list[str]:
    app.include_router(meta)
    mounted: list[str] = []
    included: set[int] = set()
    for name in sorted(orvis.enabled):
        router = REGISTRY.get(name)
        if router is None:
            continue
        for r in (router, *(REGISTRY.get(c) for c in COMPANIONS.get(name, ()))):
            if r is not None and id(r) not in included:
                app.include_router(r)
                included.add(id(r))
        mounted.append(name)
    return mounted
