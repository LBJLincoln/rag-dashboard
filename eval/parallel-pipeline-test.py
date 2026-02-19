#!/usr/bin/env python3
"""
Parallel RAG Pipeline Tester
Tests all 4 RAG pipelines simultaneously using threading.
"""

import argparse
import json
import threading
import time
import urllib.request
import urllib.error
from datetime import datetime, timezone


BASE_URL = "https://lbjlincoln-nomos-rag-engine.hf.space"

PIPELINES = {
    "standard": "/webhook/rag-multi-index-v3",
    "graph": "/webhook/ff622742-6d71-4e91-af71-b5c666088717",
    "quantitative": "/webhook/3e0f8010-39e0-4bca-9d19-35e5094391a9",
    "orchestrator": "/webhook/92217bb8-ffc8-459a-8331-3f553812c3d0",
}

GENERAL_QUESTIONS = [
    ("What is the capital of France?", ["Paris"]),
    ("Who invented the telephone?", ["Bell"]),
    ("What year did World War 2 end?", ["1945"]),
    ("What is the largest planet in our solar system?", ["Jupiter"]),
    ("Who wrote Romeo and Juliet?", ["Shakespeare"]),
    ("What is the speed of light?", ["speed", "light", "300", "3"]),
    ("Who painted the Mona Lisa?", ["Vinci", "Leonardo"]),
    ("What is H2O?", ["water"]),
    ("Who was the first president of the United States?", ["Washington"]),
    ("What is the chemical symbol for gold?", ["Au"]),
]

QUANTITATIVE_QUESTIONS = [
    ("What is the total revenue?", None),
    ("How many companies are in the database?", None),
    ("What is the average revenue per company?", None),
    ("Show me the top 5 companies by revenue", None),
    ("What is the total number of employees?", None),
    ("What is the maximum revenue recorded?", None),
    ("List all companies with revenue above average", None),
    ("What is the minimum number of employees?", None),
    ("Show me companies sorted by employee count", None),
    ("What is the sum of all revenues?", None),
]

PROGRESS_FILE = "/tmp/eval-progress.json"

progress_lock = threading.Lock()
print_lock = threading.Lock()

global_progress = {
    "status": "running",
    "pipelines": {},
    "total_tested": 0,
    "timestamp": datetime.now(timezone.utc).isoformat(),
}


def write_progress():
    with progress_lock:
        data = dict(global_progress)
        data["timestamp"] = datetime.now(timezone.utc).isoformat()
        data["total_tested"] = sum(
            p.get("tested", 0) for p in data["pipelines"].values()
        )
    try:
        with open(PROGRESS_FILE, "w") as f:
            json.dump(data, f, indent=2)
    except Exception:
        pass


def safe_print(msg):
    with print_lock:
        print(msg, flush=True)


def check_answer(response_text, expected_keywords):
    if expected_keywords is None:
        return len(response_text.strip()) > 0
    text_lower = response_text.lower()
    return any(kw.lower() in text_lower for kw in expected_keywords)


def extract_answer_text(response_body):
    try:
        data = json.loads(response_body)
        if isinstance(data, dict):
            for key in ("answer", "response", "result", "output", "text", "content"):
                if key in data and data[key]:
                    return str(data[key])
            return json.dumps(data)
        if isinstance(data, list) and data:
            first = data[0]
            if isinstance(first, dict):
                for key in ("answer", "response", "result", "output", "text", "content"):
                    if key in first and first[key]:
                        return str(first[key])
            return json.dumps(first)
        return str(data)
    except Exception:
        return response_body.decode("utf-8", errors="replace") if isinstance(response_body, bytes) else str(response_body)


def call_webhook(url, query, timeout=60):
    payload = json.dumps({"query": query}).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=payload,
        headers={
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
        method="POST",
    )
    try:
        start = time.time()
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            body = resp.read()
            elapsed = time.time() - start
            return True, body, elapsed, None
    except urllib.error.HTTPError as e:
        elapsed = time.time() - start
        try:
            body = e.read()
        except Exception:
            body = b""
        return False, body, elapsed, f"HTTP {e.code}: {e.reason}"
    except urllib.error.URLError as e:
        elapsed = time.time() - start
        return False, b"", elapsed, f"URL error: {e.reason}"
    except Exception as e:
        elapsed = time.time() - start
        return False, b"", elapsed, f"Error: {e}"


def run_pipeline(name, path, questions, max_errors):
    url = BASE_URL + path
    is_quantitative = name == "quantitative"
    q_list = QUANTITATIVE_QUESTIONS if is_quantitative else GENERAL_QUESTIONS

    num_questions = min(questions, len(q_list))
    q_list = q_list[:num_questions]

    with progress_lock:
        global_progress["pipelines"][name] = {
            "tested": 0,
            "correct": 0,
            "errors": 0,
            "consecutive_errors": 0,
            "avg_time": 0.0,
            "stopped": False,
            "total_time": 0.0,
        }

    safe_print(f"\n[{name.upper()}] Starting {num_questions} questions → {url}")

    for i, (query, expected) in enumerate(q_list, 1):
        with progress_lock:
            if global_progress["pipelines"][name].get("stopped"):
                break

        safe_print(f"[{name.upper()}] Q{i}/{num_questions}: {query[:60]}...")

        success, body, elapsed, error_msg = call_webhook(url, query)

        with progress_lock:
            pipe = global_progress["pipelines"][name]
            pipe["tested"] += 1
            pipe["total_time"] += elapsed
            pipe["avg_time"] = pipe["total_time"] / pipe["tested"]

            if not success:
                pipe["errors"] += 1
                pipe["consecutive_errors"] += 1
                status_str = f"ERROR ({error_msg})"
                if pipe["consecutive_errors"] >= max_errors:
                    pipe["stopped"] = True
                    safe_print(
                        f"[{name.upper()}] AUTO-STOP after {pipe['consecutive_errors']} consecutive errors"
                    )
            else:
                answer_text = extract_answer_text(body)
                correct = check_answer(answer_text, expected)
                if correct:
                    pipe["correct"] += 1
                    pipe["consecutive_errors"] = 0
                    status_str = f"OK ({elapsed:.2f}s)"
                else:
                    pipe["consecutive_errors"] += 1
                    short_answer = answer_text[:80].replace("\n", " ")
                    status_str = f"WRONG ({elapsed:.2f}s) → got: {short_answer}"
                    if pipe["consecutive_errors"] >= max_errors:
                        pipe["stopped"] = True
                        safe_print(
                            f"[{name.upper()}] AUTO-STOP after {pipe['consecutive_errors']} consecutive wrong/errors"
                        )

        safe_print(f"[{name.upper()}] Q{i} → {status_str}")
        write_progress()

        if global_progress["pipelines"][name].get("stopped"):
            break

    with progress_lock:
        pipe = global_progress["pipelines"][name]
        tested = pipe["tested"]
        correct = pipe["correct"]
        errors = pipe["errors"]
        avg = pipe["avg_time"]
        accuracy = (correct / tested * 100) if tested > 0 else 0.0

    safe_print(
        f"\n[{name.upper()}] DONE — {tested} tested | {correct} correct | {errors} errors | "
        f"accuracy={accuracy:.1f}% | avg={avg:.2f}s"
    )


def print_summary():
    safe_print("\n" + "=" * 70)
    safe_print("FINAL SUMMARY")
    safe_print("=" * 70)

    with progress_lock:
        pipelines = dict(global_progress["pipelines"])

    for name, pipe in pipelines.items():
        tested = pipe.get("tested", 0)
        correct = pipe.get("correct", 0)
        errors = pipe.get("errors", 0)
        avg = pipe.get("avg_time", 0.0)
        stopped = pipe.get("stopped", False)
        accuracy = (correct / tested * 100) if tested > 0 else 0.0
        stop_label = " [AUTO-STOPPED]" if stopped else ""
        safe_print(
            f"  {name.upper():<14} accuracy={accuracy:5.1f}%  "
            f"tested={tested}  correct={correct}  errors={errors}  "
            f"avg_time={avg:.2f}s{stop_label}"
        )

    safe_print("=" * 70)


def main():
    parser = argparse.ArgumentParser(description="Parallel RAG Pipeline Tester")
    parser.add_argument(
        "--questions", type=int, default=5, help="Number of questions per pipeline (default: 5)"
    )
    parser.add_argument(
        "--max-errors", type=int, default=3, help="Max consecutive errors before auto-stop (default: 3)"
    )
    parser.add_argument(
        "--sequential", action="store_true", help="Run pipelines sequentially instead of in parallel"
    )
    parser.add_argument(
        "--pipelines",
        nargs="+",
        choices=list(PIPELINES.keys()),
        default=list(PIPELINES.keys()),
        help="Which pipelines to test (default: all)",
    )
    args = parser.parse_args()

    safe_print(f"RAG Pipeline Tester")
    safe_print(f"  Mode       : {'sequential' if args.sequential else 'parallel'}")
    safe_print(f"  Questions  : {args.questions} per pipeline")
    safe_print(f"  Max errors : {args.max_errors} consecutive")
    safe_print(f"  Pipelines  : {', '.join(args.pipelines)}")
    safe_print(f"  Base URL   : {BASE_URL}")
    safe_print(f"  Progress   : {PROGRESS_FILE}")
    safe_print("")

    global_progress["status"] = "running"
    write_progress()

    threads = []
    for name in args.pipelines:
        path = PIPELINES[name]
        t = threading.Thread(
            target=run_pipeline,
            args=(name, path, args.questions, args.max_errors),
            name=f"pipeline-{name}",
            daemon=True,
        )
        threads.append(t)

    if args.sequential:
        for t in threads:
            t.start()
            t.join()
    else:
        for t in threads:
            t.start()
        for t in threads:
            t.join()

    with progress_lock:
        global_progress["status"] = "completed"
    write_progress()

    print_summary()


if __name__ == "__main__":
    main()
