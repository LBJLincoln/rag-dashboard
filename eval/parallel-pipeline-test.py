#!/usr/bin/env python3
"""
Parallel RAG Pipeline Tester — v2 (concurrent questions)

Modes:
  --concurrency 1  : Sequential questions per pipeline (default, safe)
  --concurrency 3  : 3 questions fired simultaneously per pipeline
  --concurrency 5  : 5 questions at once (stress test)

Pipelines always run in parallel (unless --sequential).
Within each pipeline, questions are batched by concurrency level.

Features:
  - Multi-pipeline parallel execution
  - Concurrent questions per pipeline (configurable)
  - Auto-stop after N consecutive errors
  - Real-time progress file at /tmp/eval-progress.json
  - Detailed results JSON at /tmp/eval-results.json
"""

import argparse
import json
import threading
import time
import urllib.request
import urllib.error
from concurrent.futures import ThreadPoolExecutor, as_completed
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
    ("What is the longest river in the world?", ["Nile", "Amazon"]),
    ("Who discovered penicillin?", ["Fleming"]),
    ("What is the smallest country in the world?", ["Vatican"]),
    ("What is the freezing point of water?", ["0", "32", "zero"]),
    ("Who wrote the Odyssey?", ["Homer"]),
    ("What element has the atomic number 1?", ["Hydrogen"]),
    ("What is the largest ocean?", ["Pacific"]),
    ("Who was the first person to walk on the moon?", ["Armstrong"]),
    ("What is the square root of 144?", ["12"]),
    ("What country has the largest population?", ["China", "India"]),
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
RESULTS_FILE = "/tmp/eval-results.json"

progress_lock = threading.Lock()
print_lock = threading.Lock()

global_progress = {
    "status": "running",
    "mode": "parallel",
    "concurrency": 1,
    "pipelines": {},
    "total_tested": 0,
    "total_correct": 0,
    "start_time": None,
    "timestamp": datetime.now(timezone.utc).isoformat(),
}

all_results = []
results_lock = threading.Lock()


def write_progress():
    with progress_lock:
        data = dict(global_progress)
        data["timestamp"] = datetime.now(timezone.utc).isoformat()
        data["total_tested"] = sum(
            p.get("tested", 0) for p in data["pipelines"].values()
        )
        data["total_correct"] = sum(
            p.get("correct", 0) for p in data["pipelines"].values()
        )
        if data["start_time"]:
            elapsed = time.time() - data["start_time"]
            data["elapsed_seconds"] = round(elapsed, 1)
            if data["total_tested"] > 0:
                data["avg_per_question"] = round(elapsed / data["total_tested"], 2)
    try:
        with open(PROGRESS_FILE, "w") as f:
            json.dump(data, f, indent=2)
    except Exception:
        pass


def write_results():
    with results_lock:
        data = list(all_results)
    try:
        with open(RESULTS_FILE, "w") as f:
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
            for key in ("answer", "response", "result", "output", "text", "content", "interpretation"):
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


def call_webhook(url, query, timeout=90):
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


def fire_single_question(name, url, idx, query, expected, total):
    """Fire a single question and return result dict."""
    safe_print(f"  [{name.upper()}] Q{idx}/{total}: {query[:55]}...")
    success, body, elapsed, error_msg = call_webhook(url, query)

    result = {
        "pipeline": name,
        "question_idx": idx,
        "query": query,
        "elapsed": round(elapsed, 2),
        "success": success,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

    if not success:
        result["status"] = "ERROR"
        result["error"] = error_msg
        safe_print(f"  [{name.upper()}] Q{idx} → ERROR ({error_msg}) [{elapsed:.2f}s]")
    else:
        answer_text = extract_answer_text(body)
        correct = check_answer(answer_text, expected)
        result["status"] = "OK" if correct else "WRONG"
        result["answer_preview"] = answer_text[:120]
        result["correct"] = correct
        if correct:
            safe_print(f"  [{name.upper()}] Q{idx} → OK [{elapsed:.2f}s]")
        else:
            safe_print(f"  [{name.upper()}] Q{idx} → WRONG [{elapsed:.2f}s] → {answer_text[:60]}")

    with results_lock:
        all_results.append(result)

    return result


def run_pipeline(name, path, num_questions, max_errors, concurrency):
    url = BASE_URL + path
    is_quantitative = name == "quantitative"
    q_list = QUANTITATIVE_QUESTIONS if is_quantitative else GENERAL_QUESTIONS

    total = min(num_questions, len(q_list))
    q_list = q_list[:total]

    with progress_lock:
        global_progress["pipelines"][name] = {
            "tested": 0,
            "correct": 0,
            "errors": 0,
            "consecutive_errors": 0,
            "avg_time": 0.0,
            "stopped": False,
            "total_time": 0.0,
            "concurrency": concurrency,
        }

    safe_print(f"\n[{name.upper()}] Starting {total} questions (concurrency={concurrency}) → {url}")

    stopped = False

    if concurrency <= 1:
        # Sequential mode: one question at a time
        for i, (query, expected) in enumerate(q_list, 1):
            if stopped:
                break
            result = fire_single_question(name, url, i, query, expected, total)
            stopped = _update_progress(name, result, max_errors)
            write_progress()
    else:
        # Concurrent mode: fire questions in batches
        idx = 0
        while idx < total and not stopped:
            batch_end = min(idx + concurrency, total)
            batch = q_list[idx:batch_end]
            batch_indices = list(range(idx + 1, batch_end + 1))

            safe_print(f"  [{name.upper()}] Batch Q{batch_indices[0]}-Q{batch_indices[-1]} ({len(batch)} concurrent)")

            with ThreadPoolExecutor(max_workers=concurrency) as executor:
                futures = {}
                for bi, (query, expected) in zip(batch_indices, batch):
                    f = executor.submit(fire_single_question, name, url, bi, query, expected, total)
                    futures[f] = bi

                for f in as_completed(futures):
                    result = f.result()
                    stopped = _update_progress(name, result, max_errors)
                    if stopped:
                        break

            write_progress()
            idx = batch_end

            # Small delay between batches to avoid overwhelming
            if idx < total and not stopped:
                time.sleep(1)

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


def _update_progress(name, result, max_errors):
    """Update global progress with result. Returns True if pipeline should stop."""
    with progress_lock:
        pipe = global_progress["pipelines"][name]
        pipe["tested"] += 1
        pipe["total_time"] += result["elapsed"]
        pipe["avg_time"] = pipe["total_time"] / pipe["tested"]

        if result["status"] == "ERROR":
            pipe["errors"] += 1
            pipe["consecutive_errors"] += 1
        elif result.get("correct"):
            pipe["correct"] += 1
            pipe["consecutive_errors"] = 0
        else:
            pipe["consecutive_errors"] += 1

        if pipe["consecutive_errors"] >= max_errors:
            pipe["stopped"] = True
            safe_print(
                f"  [{name.upper()}] AUTO-STOP after {pipe['consecutive_errors']} consecutive failures"
            )
            return True
    return False


def print_summary():
    safe_print("\n" + "=" * 75)
    safe_print("FINAL SUMMARY")
    safe_print("=" * 75)

    total_tested = 0
    total_correct = 0

    with progress_lock:
        pipelines = dict(global_progress["pipelines"])
        mode = global_progress.get("mode", "parallel")
        conc = global_progress.get("concurrency", 1)

    safe_print(f"  Mode: {mode} | Concurrency: {conc} questions/pipeline")
    safe_print("-" * 75)

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
        total_tested += tested
        total_correct += correct

    overall_accuracy = (total_correct / total_tested * 100) if total_tested > 0 else 0.0
    safe_print("-" * 75)
    safe_print(f"  {'OVERALL':<14} accuracy={overall_accuracy:5.1f}%  tested={total_tested}  correct={total_correct}")
    safe_print("=" * 75)

    # Write final results
    write_results()
    safe_print(f"\n  Progress : {PROGRESS_FILE}")
    safe_print(f"  Results  : {RESULTS_FILE}")


def main():
    parser = argparse.ArgumentParser(
        description="Parallel RAG Pipeline Tester v2 — concurrent questions support",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # 5 questions per pipeline, all pipelines in parallel, 1 question at a time
  python3 parallel-pipeline-test.py --questions 5

  # 10 questions, 3 concurrent per pipeline (stress test)
  python3 parallel-pipeline-test.py --questions 10 --concurrency 3

  # Only standard + graph, 5 concurrent questions each
  python3 parallel-pipeline-test.py --pipelines standard graph --concurrency 5

  # Sequential pipelines, but 2 concurrent questions per pipeline
  python3 parallel-pipeline-test.py --sequential --concurrency 2
""",
    )
    parser.add_argument(
        "--questions", type=int, default=5, help="Number of questions per pipeline (default: 5)"
    )
    parser.add_argument(
        "--max-errors", type=int, default=3, help="Max consecutive errors before auto-stop (default: 3)"
    )
    parser.add_argument(
        "--concurrency", type=int, default=1,
        help="Number of questions fired simultaneously per pipeline (default: 1)",
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
    parser.add_argument(
        "--timeout", type=int, default=90, help="Timeout per question in seconds (default: 90)"
    )
    args = parser.parse_args()

    global_progress["mode"] = "sequential" if args.sequential else "parallel"
    global_progress["concurrency"] = args.concurrency
    global_progress["start_time"] = time.time()

    safe_print("RAG Pipeline Tester v2")
    safe_print(f"  Pipeline mode : {'sequential' if args.sequential else 'parallel'}")
    safe_print(f"  Concurrency   : {args.concurrency} questions/pipeline")
    safe_print(f"  Questions     : {args.questions} per pipeline")
    safe_print(f"  Max errors    : {args.max_errors} consecutive")
    safe_print(f"  Timeout       : {args.timeout}s per question")
    safe_print(f"  Pipelines     : {', '.join(args.pipelines)}")
    safe_print(f"  Base URL      : {BASE_URL}")
    safe_print(f"  Progress      : {PROGRESS_FILE}")
    safe_print(f"  Results       : {RESULTS_FILE}")
    safe_print("")

    global_progress["status"] = "running"
    write_progress()

    threads = []
    for name in args.pipelines:
        path = PIPELINES[name]
        t = threading.Thread(
            target=run_pipeline,
            args=(name, path, args.questions, args.max_errors, args.concurrency),
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
        elapsed = time.time() - global_progress["start_time"]
        global_progress["total_elapsed"] = round(elapsed, 1)
    write_progress()

    print_summary()


if __name__ == "__main__":
    main()
