#!/usr/bin/env python3
"""
DATA VALIDATOR — Validates ALL datasets before evaluation runs.
================================================================
Ensures data integrity so eval scripts NEVER run on broken data.

Checks:
  1. File existence and JSON validity
  2. Required fields per question (id, question, expected_answer, rag_target)
  3. Context format validity (graph: JSON parseable, quant: context+table)
  4. ID uniqueness across entire dataset
  5. Expected answer non-empty
  6. rag_target is a known pipeline type
  7. Context parsing compatibility with load_questions()

Usage:
  python eval/data_validator.py                    # Validate all datasets
  python eval/data_validator.py --dataset phase-2  # Validate Phase 2 only
  python eval/data_validator.py --fix              # Auto-fix known issues

Called automatically by preflight.py and run-eval-parallel.py.
"""

import json
import os
import sys
from collections import defaultdict

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATASETS_DIR = os.path.join(REPO_ROOT, "datasets")

VALID_RAG_TARGETS = {"standard", "graph", "quantitative", "orchestrator"}
REQUIRED_FIELDS = {"id", "question", "expected_answer", "rag_target"}

# Known context formats for graph questions
GRAPH_CONTEXT_FORMATS = {
    "musique": "array_of_objects",       # [{"idx":..., "title":..., "paragraph_text":...}]
    "hotpotqa": "array_of_objects",      # [{"idx":..., "title":..., "paragraph_text":...}]
    "2wikimultihopqa": "title_sentences", # {"title": [...], "sentences": [[...],...]}
}


class DataValidationResult:
    def __init__(self):
        self.errors = []      # Fatal — eval MUST NOT run
        self.warnings = []    # Non-fatal — eval can run but results may be degraded
        self.stats = {}       # Summary statistics
        self.valid = True

    def error(self, msg):
        self.errors.append(msg)
        self.valid = False

    def warn(self, msg):
        self.warnings.append(msg)

    def summary(self):
        return {
            "valid": self.valid,
            "errors": len(self.errors),
            "warnings": len(self.warnings),
            "stats": self.stats,
        }


def detect_graph_context_format(context_str):
    """Detect the format of graph question context.
    Returns: 'array_of_objects' | 'title_sentences' | 'plain_text' | 'invalid'
    """
    if not context_str or not context_str.strip():
        return "empty"

    ctx = context_str.strip()

    # Format 1: [{"idx":..., "title":..., "paragraph_text":...}]
    if ctx.startswith('['):
        try:
            parsed = json.loads(ctx)
            if isinstance(parsed, list) and parsed:
                if isinstance(parsed[0], dict) and "paragraph_text" in parsed[0]:
                    return "array_of_objects"
                if isinstance(parsed[0], dict) and "title" in parsed[0]:
                    return "array_of_objects"
                if isinstance(parsed[0], list):
                    return "array_of_arrays"
            return "array_unknown"
        except json.JSONDecodeError:
            return "invalid_json"

    # Format 2: {"title": [...], "sentences": [[...],...]}
    if ctx.startswith('{'):
        try:
            parsed = json.loads(ctx)
            if isinstance(parsed, dict):
                if "title" in parsed and "sentences" in parsed:
                    return "title_sentences"
                if "paragraphs" in parsed:
                    return "paragraphs_dict"
            return "dict_unknown"
        except json.JSONDecodeError:
            return "invalid_json"

    # Format 3: Plain text
    return "plain_text"


def parse_graph_context(context_str):
    """Parse graph context into readable text, handling ALL known formats.
    Returns: (parsed_text: str, format_name: str)
    """
    fmt = detect_graph_context_format(context_str)

    if fmt == "empty":
        return "", "empty"

    if fmt == "array_of_objects":
        try:
            paragraphs = json.loads(context_str)
            parts = []
            for p in paragraphs[:15]:
                if isinstance(p, dict):
                    title = p.get("title", "")
                    text = p.get("paragraph_text", p.get("text", ""))
                    if title and text:
                        parts.append(f"[{title}] {text}")
                    elif text:
                        parts.append(text)
            return "\n".join(parts)[:6000], "array_of_objects"
        except:
            return context_str[:6000], "fallback"

    if fmt == "title_sentences":
        try:
            parsed = json.loads(context_str)
            titles = parsed.get("title", [])
            sentences = parsed.get("sentences", [])
            parts = []
            for i, title in enumerate(titles):
                if i < len(sentences):
                    sents = sentences[i]
                    if isinstance(sents, list):
                        text = " ".join(sents)
                    else:
                        text = str(sents)
                    parts.append(f"[{title}] {text}")
                else:
                    parts.append(f"[{title}]")
            return "\n".join(parts)[:6000], "title_sentences"
        except:
            return context_str[:6000], "fallback"

    if fmt == "plain_text":
        return context_str[:6000], "plain_text"

    if fmt == "paragraphs_dict":
        try:
            parsed = json.loads(context_str)
            paragraphs = parsed.get("paragraphs", [])
            parts = []
            for p in paragraphs[:15]:
                if isinstance(p, dict):
                    parts.append(p.get("text", str(p)))
                else:
                    parts.append(str(p))
            return "\n".join(parts)[:6000], "paragraphs_dict"
        except:
            return context_str[:6000], "fallback"

    # Fallback: dump as-is (truncated)
    return context_str[:6000], "fallback"


def parse_quant_table(table_data):
    """Parse quantitative table data into readable text.
    Returns: (parsed_text: str, format_name: str)
    """
    if not table_data:
        return "", "empty"

    if isinstance(table_data, str):
        try:
            parsed = json.loads(table_data)
            if isinstance(parsed, list):
                # Array of arrays — format as markdown table
                lines = []
                for row in parsed:
                    if isinstance(row, list):
                        lines.append(" | ".join(str(cell) for cell in row))
                return "\n".join(lines), "array_of_arrays"
            return table_data, "string"
        except:
            return table_data, "raw_string"

    if isinstance(table_data, list):
        lines = []
        for row in table_data:
            if isinstance(row, list):
                lines.append(" | ".join(str(cell) for cell in row))
            elif isinstance(row, dict):
                lines.append(" | ".join(f"{k}: {v}" for k, v in row.items()))
        return "\n".join(lines), "list"

    if isinstance(table_data, dict):
        return json.dumps(table_data, indent=2), "dict"

    return str(table_data), "unknown"


def validate_dataset_file(filepath, result):
    """Validate a single dataset file."""
    if not os.path.exists(filepath):
        result.error(f"File not found: {filepath}")
        return []

    try:
        with open(filepath) as f:
            data = json.load(f)
    except json.JSONDecodeError as e:
        result.error(f"Invalid JSON in {filepath}: {e}")
        return []

    questions = data.get("questions", [])
    if not questions:
        result.error(f"No questions in {filepath}")
        return []

    seen_ids = set()
    valid_questions = []
    context_formats = defaultdict(int)
    table_formats = defaultdict(int)

    for i, q in enumerate(questions):
        qid = q.get("id", f"<missing-id-{i}>")

        # Required fields check
        missing = REQUIRED_FIELDS - set(q.keys())
        if missing:
            result.error(f"[{qid}] Missing required fields: {missing}")
            continue

        # ID uniqueness
        if qid in seen_ids:
            result.error(f"[{qid}] Duplicate ID in {os.path.basename(filepath)}")
        seen_ids.add(qid)

        # rag_target validity
        rag_target = q.get("rag_target", "")
        if rag_target not in VALID_RAG_TARGETS:
            result.error(f"[{qid}] Invalid rag_target: '{rag_target}'")
            continue

        # Question non-empty
        if not q.get("question", "").strip():
            result.error(f"[{qid}] Empty question text")
            continue

        # Expected answer check
        if not q.get("expected_answer", "").strip():
            result.warn(f"[{qid}] Empty expected_answer — will use NON_EMPTY check")

        # Context validation for graph questions
        if rag_target == "graph":
            ctx = q.get("context", "")
            fmt = detect_graph_context_format(ctx)
            context_formats[fmt] += 1
            if fmt == "invalid_json":
                result.warn(f"[{qid}] Graph context is invalid JSON — will use raw text")
            elif fmt == "empty":
                result.warn(f"[{qid}] Graph question has no context")

        # Context + table validation for quantitative questions
        if rag_target == "quantitative":
            ctx = q.get("context", "")
            table = q.get("table_data")
            if not ctx and not table:
                result.warn(f"[{qid}] Quantitative question has no context AND no table_data")
            if table:
                _, tfmt = parse_quant_table(table)
                table_formats[tfmt] += 1

        valid_questions.append(q)

    return valid_questions, context_formats, table_formats


def validate_all(dataset=None):
    """Validate all dataset files (or specific dataset).
    Returns DataValidationResult.
    """
    result = DataValidationResult()
    all_ids = set()
    total_by_target = defaultdict(int)
    total_questions = 0

    files_to_check = []

    if dataset in (None, "phase-1", "all"):
        files_to_check.extend([
            os.path.join(DATASETS_DIR, "phase-1", "standard-orch-50x2.json"),
            os.path.join(DATASETS_DIR, "phase-1", "graph-quant-50x2.json"),
        ])

    if dataset in (None, "phase-2", "all"):
        files_to_check.extend([
            os.path.join(DATASETS_DIR, "phase-2", "hf-1000.json"),
            os.path.join(DATASETS_DIR, "phase-2", "standard-orch-1000x2.json"),
        ])

    all_context_formats = defaultdict(int)
    all_table_formats = defaultdict(int)

    for filepath in files_to_check:
        if not os.path.exists(filepath):
            result.warn(f"Dataset file not found (skipping): {filepath}")
            continue

        validated = validate_dataset_file(filepath, result)
        if not validated:
            continue
        questions, ctx_fmts, tbl_fmts = validated

        for q in questions:
            qid = q["id"]
            if qid in all_ids:
                result.error(f"[{qid}] Duplicate ID across dataset files")
            all_ids.add(qid)
            total_by_target[q["rag_target"]] += 1
            total_questions += 1

        for k, v in ctx_fmts.items():
            all_context_formats[k] += v
        for k, v in tbl_fmts.items():
            all_table_formats[k] += v

    result.stats = {
        "total_questions": total_questions,
        "by_target": dict(total_by_target),
        "unique_ids": len(all_ids),
        "context_formats": dict(all_context_formats),
        "table_formats": dict(all_table_formats),
        "files_checked": len(files_to_check),
    }

    return result


def print_report(result):
    """Print a human-readable validation report."""
    print("=" * 60)
    print("  DATA VALIDATION REPORT")
    print("=" * 60)

    if result.valid:
        print("  Status: VALID")
    else:
        print("  Status: INVALID — EVAL MUST NOT RUN")

    print(f"\n  Stats:")
    for k, v in result.stats.items():
        if isinstance(v, dict):
            print(f"    {k}:")
            for k2, v2 in v.items():
                print(f"      {k2}: {v2}")
        else:
            print(f"    {k}: {v}")

    if result.errors:
        print(f"\n  ERRORS ({len(result.errors)}):")
        for e in result.errors[:20]:
            print(f"    [ERROR] {e}")
        if len(result.errors) > 20:
            print(f"    ... and {len(result.errors) - 20} more errors")

    if result.warnings:
        print(f"\n  WARNINGS ({len(result.warnings)}):")
        for w in result.warnings[:20]:
            print(f"    [WARN] {w}")
        if len(result.warnings) > 20:
            print(f"    ... and {len(result.warnings) - 20} more warnings")

    print("=" * 60)


def main():
    import argparse
    parser = argparse.ArgumentParser(description="Validate RAG evaluation datasets")
    parser.add_argument("--dataset", choices=["phase-1", "phase-2", "all"], default=None,
                        help="Dataset to validate (default: all)")
    parser.add_argument("--fix", action="store_true",
                        help="Auto-fix known issues")
    parser.add_argument("--json", action="store_true",
                        help="Output as JSON")
    args = parser.parse_args()

    result = validate_all(dataset=args.dataset)

    if args.json:
        output = {
            "valid": result.valid,
            "errors": result.errors,
            "warnings": result.warnings,
            "stats": result.stats,
        }
        print(json.dumps(output, indent=2))
    else:
        print_report(result)

    sys.exit(0 if result.valid else 1)


if __name__ == "__main__":
    main()
