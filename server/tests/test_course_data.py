"""Tests for the course-data validator itself.

`scripts/check_data.py` is the gate every content change goes through, so it
needs its own tests: a validator that silently stops catching bad rows is worse
than no validator. The runtime side of the same rules lives in
`src/data/course.test.ts`.
"""

from __future__ import annotations

import importlib.util
import pathlib
import re
import shutil

REPO = pathlib.Path(__file__).resolve().parents[2]


def _load_validator():
    spec = importlib.util.spec_from_file_location("check_data", REPO / "scripts" / "check_data.py")
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _copy_data(tmp_path: pathlib.Path) -> pathlib.Path:
    target = tmp_path / "src" / "data"
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copytree(REPO / "src" / "data", target)
    return tmp_path


def test_the_shipped_course_data_is_valid() -> None:
    errors, summary = _load_validator().check(REPO)
    assert errors == []
    assert summary["chapters"] == 45
    assert summary["chapter_questions"] == 90
    assert summary["extra_questions"] > 100
    pools = summary["pools"]
    assert pools["Basic"] >= 6 and pools["Intermediate"] >= 8 and pools["Advanced"] >= 6


def test_cli_exits_zero_for_the_repo() -> None:
    assert _load_validator().main(["--root", str(REPO)]) == 0


def test_flags_an_out_of_range_quiz_answer(tmp_path: pathlib.Path) -> None:
    root = _copy_data(tmp_path)
    chapters = root / "src" / "data" / "chapters.ts"
    text = chapters.read_text(encoding="utf-8")
    # Give the first quick-check question an impossible answer index.
    text = re.sub(r'(Q\("[^"]+",\s*\[[^\]]*\],\s*)0\)', r"\g<1>7)", text, count=1)
    chapters.write_text(text, encoding="utf-8")

    errors, _ = _load_validator().check(root)
    assert any("answer index must be 0..3" in error for error in errors)


def test_flags_an_empty_quiz_option(tmp_path: pathlib.Path) -> None:
    root = _copy_data(tmp_path)
    chapters = root / "src" / "data" / "chapters.ts"
    text = chapters.read_text(encoding="utf-8")
    text = text.replace('Q("Selected cell ka address kahan dikhta hai?", ["Ribbon"', 'Q("Selected cell ka address kahan dikhta hai?", [""', 1)
    chapters.write_text(text, encoding="utf-8")

    errors, _ = _load_validator().check(root)
    assert any("an option is empty" in error for error in errors)


def test_flags_a_broken_formula_row(tmp_path: pathlib.Path) -> None:
    root = _copy_data(tmp_path)
    formulas = root / "src" / "data" / "formulas.ts"
    text = formulas.read_text(encoding="utf-8").replace("SUM|=SUM(number1, [number2], ...)|Numbers ka total jodta hai", "SUM|=SUM(number1", 1)
    formulas.write_text(text, encoding="utf-8")

    errors, _ = _load_validator().check(root)
    assert any("formulas.ts row" in error and "expected 5 fields" in error for error in errors)


def test_flags_duplicate_dataset_file_names(tmp_path: pathlib.Path) -> None:
    root = _copy_data(tmp_path)
    labs = root / "src" / "data" / "labs.ts"
    text = labs.read_text(encoding="utf-8").replace('file: "employees.csv"', 'file: "marks.csv"', 1)
    labs.write_text(text, encoding="utf-8")

    errors, _ = _load_validator().check(root)
    assert any("duplicate dataset file names" in error for error in errors)
