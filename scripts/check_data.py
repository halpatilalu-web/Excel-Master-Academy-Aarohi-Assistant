#!/usr/bin/env python3
"""Validate the hand-authored Excel course data in src/data.

The course data uses compact pipe-delimited template literals and `C()`/`Q()`
calls. TypeScript casts those rows to tuples, so this small dependency-free
check catches broken rows before they become blank cards, unwinnable quiz
questions or an exam that cannot fill its level quotas.

    python scripts/check_data.py            # check the repo
    python scripts/check_data.py --verbose  # also print per-level counts

Exit code 0 = fine, 1 = errors printed to stderr. The same rules are asserted at
runtime by `src/data/course.test.ts` (vitest), which sees the parsed objects.
"""

from __future__ import annotations

import argparse
import collections
import pathlib
import re
import sys
from collections.abc import Iterable

ROOT = pathlib.Path(__file__).resolve().parents[1]

CHAPTER_COUNT = 32
QUIZZES_PER_CHAPTER = 2
# Must match LEVEL_QUOTAS in src/lib/exam.ts
LEVEL_QUOTAS = {"Basic": 6, "Intermediate": 8, "Advanced": 6}
EXAM_SIZE = sum(LEVEL_QUOTAS.values())

# Q("question", ["a", "b", "c", "d"], answer) — one quick-check question.
_Q_RE = re.compile(r'Q\("((?:[^"\\]|\\.)*)",\s*\[((?:[^\]])*?)\],\s*(\d+)\)')
_C_RE = re.compile(r'\bC\((\d+),\s*"(Basic|Intermediate|Advanced)"')
_OPTION_RE = re.compile(r'"((?:[^"\\]|\\.)*)"')
_RAW_RE = re.compile(r"const RAW = `([\s\S]*?)`;")


def template_blocks(text: str) -> list[str]:
    return re.findall(r"`([\s\S]*?)`", text)


def lines_from_blocks(text: str) -> list[str]:
    lines: list[str] = []
    for block in template_blocks(text):
        lines.extend(line for line in block.splitlines() if line.strip())
    return lines


def _dupes(values: Iterable[str]) -> list[str]:
    return [v for v, count in collections.Counter(v.strip().lower() for v in values).items() if count > 1]


def check(root: pathlib.Path = ROOT) -> tuple[list[str], dict[str, object]]:
    """Return (errors, summary). No I/O outside `root`."""
    data = root / "src" / "data"
    errors: list[str] = []
    summary: dict[str, object] = {}

    chapters_text = (data / "chapters.ts").read_text(encoding="utf-8")

    # ── chapters: numbering, levels, and every quick-check question ──────────
    chapter_numbers = [int(n) for n in re.findall(r'\bC\((\d+),\s*"(?:Basic|Intermediate|Advanced)"', chapters_text)]
    if chapter_numbers != list(range(1, CHAPTER_COUNT + 1)):
        errors.append(f"chapters.ts must define chapters 1..{CHAPTER_COUNT} in order; got {chapter_numbers}")

    level_by_chapter = {int(n): level for n, level in _C_RE.findall(chapters_text)}

    quiz_count = 0
    quiz_texts: list[str] = []
    for match in _Q_RE.finditer(chapters_text):
        quiz_count += 1
        question, options_raw, answer_raw = match.group(1), match.group(2), match.group(3)
        options = _OPTION_RE.findall(options_raw)
        label = f'chapters.ts Q("{question[:40]}")'
        quiz_texts.append(question)
        if len(options) != 4:
            errors.append(f"{label}: expected 4 options, got {len(options)}")
        if any(not option.strip() for option in options):
            errors.append(f"{label}: an option is empty")
        if not question.strip():
            errors.append(f"{label}: the question text is empty")
        if not 0 <= int(answer_raw) <= 3:
            errors.append(f"{label}: answer index must be 0..3, got {answer_raw}")
    if quiz_count != CHAPTER_COUNT * QUIZZES_PER_CHAPTER:
        errors.append(
            f"chapters.ts should contain {CHAPTER_COUNT * QUIZZES_PER_CHAPTER} quick-check questions; got {quiz_count}"
        )
    chapter_dupes = _dupes(quiz_texts)
    if chapter_dupes:
        errors.append(f"duplicate chapter quiz questions: {chapter_dupes[:5]}")

    # ── extra question bank: 7 pipe fields per row ──────────────────────────
    questions_text = (data / "questions.ts").read_text(encoding="utf-8")
    raw_match = _RAW_RE.search(questions_text)
    extra_lines: list[str] = []
    extra_questions: list[str] = []
    extra_levels: collections.Counter[str] = collections.Counter()
    if not raw_match:
        errors.append("questions.ts: RAW template not found")
    else:
        extra_lines = [line for line in raw_match.group(1).splitlines() if line.strip()]
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
            if not 1 <= chapter <= CHAPTER_COUNT:
                errors.append(f"questions.ts line {line_no}: chapter must be 1..{CHAPTER_COUNT}")
            if not all(part.strip() for part in parts[:5]):
                errors.append(f"questions.ts line {line_no}: question/options must not be empty")
            level = level_by_chapter.get(chapter)
            if level is None:
                errors.append(f"questions.ts line {line_no}: chapter {chapter} does not exist")
            else:
                extra_levels[level] += 1

    extra_dupes = _dupes(extra_questions)
    if extra_dupes:
        errors.append(f"duplicate extra questions: {extra_dupes[:5]}")

    # ── exam must be able to fill its quotas from the two banks ─────────────
    chapter_levels = collections.Counter(level_by_chapter.values())
    pool = {
        level: chapter_levels.get(level, 0) * QUIZZES_PER_CHAPTER + extra_levels.get(level, 0)
        for level in LEVEL_QUOTAS
    }
    for level, quota in LEVEL_QUOTAS.items():
        if pool[level] < quota:
            errors.append(f"exam quota: {level} pool has {pool[level]} questions, needs {quota}")
    if sum(pool.values()) < EXAM_SIZE:
        errors.append(f"exam needs at least {EXAM_SIZE} questions in total; pools hold {sum(pool.values())}")
    summary["pools"] = pool

    # ── formula library ─────────────────────────────────────────────────────
    formulas = lines_from_blocks((data / "formulas.ts").read_text(encoding="utf-8"))
    for row_no, line in enumerate(formulas, start=1):
        parts = line.split("|")
        if len(parts) != 5:
            errors.append(f"formulas.ts row {row_no}: expected 5 fields, got {len(parts)}")
            continue
        if any(not part.strip() for part in parts):
            errors.append(f"formulas.ts row {row_no}: empty field in {line[:60]!r}")
        if not parts[4].strip().isdigit() or not 0 <= int(parts[4]) <= CHAPTER_COUNT:
            errors.append(f"formulas.ts row {row_no}: chapter must be 0..{CHAPTER_COUNT}")

    # ── shortcut library ────────────────────────────────────────────────────
    shortcuts = lines_from_blocks((data / "shortcuts.ts").read_text(encoding="utf-8"))
    for row_no, line in enumerate(shortcuts, start=1):
        parts = line.split("|")
        if len(parts) != 3:
            errors.append(f"shortcuts.ts row {row_no}: expected 3 fields, got {len(parts)}")
        elif any(not part.strip() for part in parts):
            errors.append(f"shortcuts.ts row {row_no}: empty field in {line[:60]!r}")

    # ── VBA snippets ────────────────────────────────────────────────────────
    vba_text = (data / "vba.ts").read_text(encoding="utf-8")
    vba_match = _RAW_RE.search(vba_text)
    vba_blocks: list[str] = []
    if not vba_match:
        errors.append("vba.ts: RAW template not found")
    else:
        vba_blocks = [block for block in vba_match.group(1).split("\n===\n") if block.strip()]
        for block_no, block in enumerate(vba_blocks, start=1):
            lines = block.splitlines()
            level = lines[0].strip() if lines else ""
            if level not in LEVEL_QUOTAS:
                errors.append(f"vba.ts block {block_no}: invalid level {level!r}")
            if len(lines) < 4 or not lines[1].strip() or not lines[2].strip():
                errors.append(f"vba.ts block {block_no}: needs a level, a title, a description and code")

    # ── lab datasets ────────────────────────────────────────────────────────
    labs_text = (data / "labs.ts").read_text(encoding="utf-8")
    lab_ids = re.findall(r'\{\s*id:\s*"([^"]+)"', labs_text)
    lab_files = re.findall(r'\bfile:\s*"([^"]+)"', labs_text)
    if not lab_ids:
        errors.append("labs.ts: no labs found")
    if _dupes(lab_ids):
        errors.append(f"labs.ts: duplicate lab ids {_dupes(lab_ids)}")
    if _dupes(lab_files):
        errors.append(f"labs.ts: duplicate dataset file names {_dupes(lab_files)}")
    for file_name in lab_files:
        if not file_name.endswith(".csv"):
            errors.append(f"labs.ts: dataset {file_name!r} should be a .csv")

    summary.update(
        chapters=len(chapter_numbers),
        chapter_questions=quiz_count,
        extra_questions=len(extra_questions),
        formulas=len(formulas),
        shortcuts=len(shortcuts),
        vba=len(vba_blocks),
        labs=len(lab_ids),
        cross_bank_duplicates=sum(1 for q in extra_questions if q.strip().lower() in {t.strip().lower() for t in quiz_texts}),
    )
    return errors, summary


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Validate src/data course content.")
    parser.add_argument("--root", default=str(ROOT), help="project root (defaults to the repo)")
    parser.add_argument("--verbose", action="store_true", help="print per-level question counts")
    args = parser.parse_args(argv)

    errors, summary = check(pathlib.Path(args.root))
    if errors:
        print("Course data validation failed:", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        return 1

    print(
        "Course data OK: "
        f"{summary['chapters']} chapters, {summary['chapter_questions']} chapter questions, "
        f"{summary['extra_questions']} extra questions "
        f"({summary['cross_bank_duplicates']} cross-bank duplicates deduped by Exam), "
        f"{summary['formulas']} formulas, {summary['shortcuts']} shortcuts, "
        f"{summary['vba']} VBA snippets, {summary['labs']} labs."
    )
    if args.verbose:
        for level, count in (summary["pools"] or {}).items():
            print(f"  {level}: {count} questions (quota {LEVEL_QUOTAS[level]})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
