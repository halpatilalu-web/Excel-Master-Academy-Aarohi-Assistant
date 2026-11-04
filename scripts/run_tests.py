"""Cross-platform launcher for the backend test suite (`pnpm test:server`).

`python -m pytest server` uses whatever `python` happens to be on PATH. On a
machine that has both a system Python and this project's venv, that is often the
wrong interpreter, and all the student sees is a confusing

    /usr/bin/python: No module named pytest

So: pick the project's `.venv` when it exists, else honour `PYTHON`, else the
interpreter running this script — and when pytest still is not importable, print
what to do instead of a traceback.

Usage: python scripts/run_tests.py [pytest args…]   (default: server -q)
"""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def _venv_python(base: Path) -> Path | None:
    for rel in ("bin/python", "bin/python3", "Scripts/python.exe", "Scripts/python3.exe"):
        candidate = base / rel
        if candidate.is_file():
            return candidate
    return None


def _has_pytest(executable: str) -> bool:
    try:
        result = subprocess.run(
            [executable, "-c", "import pytest"],
            capture_output=True,
            timeout=60,
        )
    except (OSError, subprocess.SubprocessError):
        return False
    return result.returncode == 0


def resolve_python() -> str:
    """The interpreter that should run pytest, best candidate first."""
    seen: list[str] = []
    candidates: list[str] = []

    if os.environ.get("PYTHON"):
        candidates.append(os.environ["PYTHON"])

    project_venv = _venv_python(ROOT / ".venv")
    if project_venv:
        candidates.append(str(project_venv))

    if os.environ.get("VIRTUAL_ENV"):
        env_venv = _venv_python(Path(os.environ["VIRTUAL_ENV"]))
        if env_venv:
            candidates.append(str(env_venv))

    candidates.append(sys.executable)

    for candidate in candidates:
        if candidate in seen:
            continue
        seen.append(candidate)
        if _has_pytest(candidate):
            return candidate
    return ""


def main(argv: list[str]) -> int:
    args = argv or ["server", "-q"]
    python = resolve_python()

    if not python:
        venv_hint = ".venv\\Scripts\\python.exe" if os.name == "nt" else ".venv/bin/python"
        print(
            "pytest is not installed for the interpreter that ran this script.\n"
            "\n"
            "  python -m venv .venv\n"
            f"  {venv_hint} -m pip install -r server/requirements-dev.txt\n"
            "\n"
            "…then run `pnpm test:server` again. Already have a virtualenv?\n"
            "Activate it, or point PYTHON at it (PYTHON=/path/to/python pnpm test:server).",
            file=sys.stderr,
        )
        return 1

    if python != sys.executable:
        print(f"[test] using {python}", flush=True)
    return subprocess.call([python, "-m", "pytest", *args], cwd=ROOT)


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
