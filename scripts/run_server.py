#!/usr/bin/env python3
"""Cross-platform launcher for the FastAPI server.

`package.json` used to call

    uvicorn main:app --port ${BACKEND_PORT:-8000}

which only works in a POSIX shell — on Windows cmd/PowerShell the `${...}`
syntax is passed through literally and the server never starts. Doing the same
work in Python keeps `pnpm dev:all` / `pnpm start` identical on every OS.

    python scripts/run_server.py            # production-style, 127.0.0.1
    python scripts/run_server.py --reload   # development
    HOST=0.0.0.0 PORT=8000 python scripts/run_server.py
"""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SERVER_DIR = ROOT / "server"

_VENV_PYTHONS = ("bin/python", "bin/python3", "Scripts/python.exe", "Scripts/python3.exe")


def _can_import(executable: str, module: str) -> bool:
    try:
        done = subprocess.run([executable, "-c", f"import {module}"], capture_output=True, timeout=60)
    except (OSError, subprocess.SubprocessError):
        return False
    return done.returncode == 0


def _venv_python() -> str:
    """A project/CONDA-style venv that actually has the server deps, or ""."""
    bases = [ROOT / ".venv", ROOT / "venv"]
    if os.environ.get("VIRTUAL_ENV"):
        bases.insert(0, Path(os.environ["VIRTUAL_ENV"]))
    for base in bases:
        for rel in _VENV_PYTHONS:
            candidate = base / rel
            if candidate.is_file() and _can_import(str(candidate), "uvicorn"):
                return str(candidate)
    return ""


def _restart_in_venv(argv: list[str]) -> int:
    """Re-run this script with the venv interpreter (which was not activated).

    Running `pnpm dev:all` with a bare system Python used to end in "uvicorn is
    not installed" even though the venv next door was ready to go.
    """
    target = _venv_python()
    if not target:
        return -1
    print(f"[server] system Python has no uvicorn — restarting with {target}", flush=True)
    if os.name == "nt":
        return subprocess.call([target, __file__, *argv])
    os.execv(target, [target, __file__, *argv])
    return 0  # unreachable


def main() -> int:
    sys.path.insert(0, str(SERVER_DIR))
    os.chdir(SERVER_DIR)  # so `main:app` resolves and .env/data.db are found
    try:
        import uvicorn
    except ModuleNotFoundError:
        restarted = _restart_in_venv(sys.argv[1:])
        if restarted >= 0:
            return restarted
        print(
            "uvicorn is not installed. Create/activate the venv first:\n"
            "  python -m venv .venv\n"
            "  .venv/bin/python -m pip install -r server/requirements-dev.txt   "
            "(Windows: .venv\\Scripts\\python.exe ...)\n"
            "…or set PYTHON=/path/to/python before running pnpm.",
            file=sys.stderr,
        )
        return 1

    reload = "--reload" in sys.argv
    host = os.environ.get("HOST", "127.0.0.1")
    port = int(os.environ.get("PORT") or os.environ.get("BACKEND_PORT") or "8000")
    uvicorn.run("main:app", host=host, port=port, reload=reload, reload_dirs=[str(SERVER_DIR)] if reload else None)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
