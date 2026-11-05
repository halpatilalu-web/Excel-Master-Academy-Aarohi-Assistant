#!/usr/bin/env python3
"""Validate the hand-authored Excel course data in src/data.

The course data uses compact pipe-delimited template literals. TypeScript
casts those rows to tuples, so this small dependency-free check catches
broken rows before they become blank cards or unwinnable quiz questions.
"""

from __future__ import annotations

import collections
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
DATA = ROOT / "src" / "data"


def fail(errors: list[str]) -> None:
    if not errors:
        return
    print("Course data validation failed:", file=sys.stderr)
    for error in errors:
        print(f"- {error}", file=sys.stderr)
    raise SystemExit(1)


def template_blocks(text: str) -> list[str]:
    return re.findall(r"`([\s\S]*?)`", text)


def lines_from_blocks(text: str) -> list[str]:
    lines: list[str] = []
    for block in template_blocks(text):
        lines.extend(line for line in block.splitlines() if line.strip())
    return lines


def main() -> None:
    errors: list[str] = []

    chapters_text = (DATA / "chapters.ts").read_text(encoding="utf-8")
    chapter_numbers = [int(n) for n in re.findall(r'\bC\((\d+),\s*"(?:Basic|Intermediate|Advanced)"', chapters_text)]
    total_chapters = 45
    if chapter_numbers != list(range(1, total_chapters + 1)):
        errors.append(f"chapters.ts must define chapters 1..{total_chapters} in order; got {chapter_numbers}")

    chapter_questions = re.findall(r'Q\("([^"]+)"', chapters_text)
    if len(chapter_questions) != total_chapters * 2:
        errors.append(f"chapters.ts should contain {total_chapters * 2} quick-check questions; got {len(chapter_questions)}")
    chapter_dupes = [q for q, count in collections.Counter(q.strip().lower() for q in chapter_questions).items() if count > 1]
    if chapter_dupes:
        errors.append(f"duplicate chapter quiz questions: {chapter_dupes[:5]}")

    questions_text = (DATA / "questions.ts").read_text(encoding="utf-8")
    raw_match = re.search(r"const RAW = `([\s\S]*?)`;", questions_text)
    if not raw_match:
        errors.append("questions.ts: RAW template not found")
        extra_lines: list[str] = []
    else:
        extra_lines = [line for line in raw_match.group(1).splitlines() if line.strip()]

    extra_questions: list[str] = []
    for line_no, line in enumerate(extra_lines, start=1):
        parts = line.split("|")
        if len(parts) != 7:
            errors.append(f"questions.ts line {line_no}: expected 7 fields, got {len(parts)}")
            continue
        extra_questions.append(parts[0])
        try:
            answer = int(parts[5])
            chapter = int(parts[6])
        except ValueError:
            errors.append(f"questions.ts line {line_no}: answer/chapter must be integers")
            continue
        if not 0 <= answer <= 3:
            errors.append(f"questions.ts line {line_no}: answer must be 0..3")
        if not 1 <= chapter <= total_chapters:
            errors.append(f"questions.ts line {line_no}: chapter must be 1..{total_chapters}")
        if not all(parts[:5]):
            errors.append(f"questions.ts line {line_no}: question/options must not be empty")

    extra_dupes = [q for q, count in collections.Counter(q.strip().lower() for q in extra_questions).items() if count > 1]
    if extra_dupes:
        errors.append(f"duplicate extra questions: {extra_dupes[:5]}")

    formulas = lines_from_blocks((DATA / "formulas.ts").read_text(encoding="utf-8"))
    for line_no, line in enumerate(formulas, start=1):
        parts = line.split("|")
        if len(parts) != 5:
            errors.append(f"formulas.ts row {line_no}: expected 5 fields, got {len(parts)}")
            continue
        if not parts[4].isdigit() or not 0 <= int(parts[4]) <= total_chapters:
            errors.append(f"formulas.ts row {line_no}: chapter must be 0..{total_chapters}")

    shortcuts = lines_from_blocks((DATA / "shortcuts.ts").read_text(encoding="utf-8"))
    for line_no, line in enumerate(shortcuts, start=1):
        if len(line.split("|")) != 3:
            errors.append(f"shortcuts.ts row {line_no}: expected 3 fields")

    vba_text = (DATA / "vba.ts").read_text(encoding="utf-8")
    vba_match = re.search(r"const RAW = `([\s\S]*?)`;", vba_text)
    if not vba_match:
        errors.append("vba.ts: RAW template not found")
        vba_blocks: list[str] = []
    else:
        vba_blocks = [block for block in vba_match.group(1).split("\n===\n") if block.strip()]
    for block_no, block in enumerate(vba_blocks, start=1):
        level = block.splitlines()[0].strip()
        if level not in {"Basic", "Intermediate", "Advanced"}:
            errors.append(f"vba.ts block {block_no}: invalid level {level!r}")

    fail(errors)

    chapter_set = {q.strip().lower() for q in chapter_questions}
    cross_dupes = sum(1 for q in extra_questions if q.strip().lower() in chapter_set)
    print(
        "Course data OK: "
        f"{total_chapters} chapters, {len(chapter_questions)} chapter questions, "
        f"{len(extra_questions)} extra questions ({cross_dupes} cross-bank duplicates deduped by Exam), "
        f"{len(formulas)} formulas, {len(shortcuts)} shortcuts, {len(vba_blocks)} VBA snippets."
    )


if __name__ == "__main__":
    main()
