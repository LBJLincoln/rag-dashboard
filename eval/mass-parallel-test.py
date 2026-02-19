#!/usr/bin/env python3
"""
Mass Parallel RAG Tester — v2.0 (stdlib only, zero dependencies)

High-performance concurrent testing system for 100/500/10000 questions.
Uses ThreadPoolExecutor + urllib.request — NO external dependencies.

Architecture:
  - ThreadPoolExecutor with configurable max_workers
  - Multiple pipelines tested simultaneously
  - Real-time progress tracking with /tmp/eval-progress.json
  - Auto-save results every N minutes
  - Graceful shutdown on errors or Ctrl+C
  - Batch processing with configurable batch sizes
  - Per-pipeline auto-stop on consecutive errors

Usage:
  python3 eval/mass-parallel-test.py --total 100 --concurrency 10
  python3 eval/mass-parallel-test.py --total 500 --concurrency 20 --pipelines standard,graph
  python3 eval/mass-parallel-test.py --total 10000 --concurrency 50

Concurrency guidelines:
  - HF Space cpu-basic: 5-10 concurrent requests safe
  - HF Space cpu-upgrade: 20-30 concurrent requests
  - Conservative start: --concurrency 5, increase if stable
"""

import json
import os
import sys
import time
import argparse
import random
import threading
import signal
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError

REPO_ROOT = Path(__file__).resolve().parent.parent
PROGRESS_FILE = Path("/tmp/eval-progress.json")
RESULTS_FILE = Path("/tmp/eval-mass-results.json")
SUMMARY_FILE = REPO_ROOT / "logs" / f"mass-test-{datetime.now().strftime('%Y%m%d-%H%M%S')}.json"

BASE_URL = os.environ.get("HF_SPACE_URL", "https://lbjlincoln-nomos-rag-engine.hf.space")

PIPELINES = {
    "standard": "/webhook/rag-multi-index-v3",
    "graph": "/webhook/ff622742-6d71-4e91-af71-b5c666088717",
    "orchestrator": "/webhook/92217bb8-ffc8-459a-8331-3f553812c3d0",
}

PIPELINES_ALL = {
    **PIPELINES,
    "quantitative": "/webhook/3e0f8010-39e0-4bca-9d19-35e5094391a9",
}

# 50+ diverse questions per pipeline type
GENERAL_QUESTIONS = [
    ("What is the capital of France?", ["Paris"]),
    ("Who invented the telephone?", ["Bell", "Meucci"]),
    ("What year did World War 2 end?", ["1945"]),
    ("What is the largest planet in our solar system?", ["Jupiter"]),
    ("Who wrote Romeo and Juliet?", ["Shakespeare"]),
    ("What is the speed of light?", ["speed", "light", "300", "3", "299"]),
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
    ("Who was the first person to walk on the moon?", ["Armstrong", "Neil"]),
    ("What is the square root of 144?", ["12"]),
    ("What country has the largest population?", ["China", "India"]),
    ("What is the capital of Japan?", ["Tokyo"]),
    ("Who discovered gravity?", ["Newton"]),
    ("What is the boiling point of water?", ["100", "212"]),
    ("Where is the Great Wall?", ["China"]),
    ("What is photosynthesis?", ["plant", "light", "energy", "carbon"]),
    ("Who wrote the theory of relativity?", ["Einstein"]),
    ("What is DNA?", ["deoxyribonucleic", "genetic", "nucleic"]),
    ("What planet is known as the Red Planet?", ["Mars"]),
    ("What is the largest mammal?", ["whale", "blue whale"]),
    ("Who invented the light bulb?", ["Edison", "Swan"]),
    ("What is the capital of Australia?", ["Canberra"]),
    ("What language has the most native speakers?", ["Mandarin", "Chinese", "English"]),
    ("Who composed the Moonlight Sonata?", ["Beethoven"]),
    ("What is the main gas in Earth's atmosphere?", ["nitrogen", "N2"]),
    ("What is the fastest land animal?", ["cheetah"]),
    ("Who founded Amazon?", ["Bezos"]),
    ("What year was the internet invented?", ["1969", "1983", "1990"]),
    ("What is the tallest mountain?", ["Everest"]),
    ("Who wrote Hamlet?", ["Shakespeare"]),
    ("What is the capital of Brazil?", ["Brasilia"]),
    ("What causes earthquakes?", ["tectonic", "plates", "fault"]),
    ("What is the currency of Japan?", ["Yen"]),
    ("Who discovered America?", ["Columbus", "Leif"]),
    ("What is the largest desert?", ["Sahara", "Antarctic"]),
    ("What planet has rings?", ["Saturn"]),
    ("Who developed the polio vaccine?", ["Salk", "Sabin"]),
    ("What is the capital of Canada?", ["Ottawa"]),
    ("Who founded Microsoft?", ["Gates", "Allen"]),
    ("What is the distance from Earth to the Sun?", ["93", "150", "million"]),
    ("Who wrote Pride and Prejudice?", ["Austen"]),
]

GRAPH_QUESTIONS = [
    ("Who founded Microsoft and when?", ["Gates", "Allen", "1975"]),
    ("What is the relationship between Bill Gates and Paul Allen?", ["co-founder", "founder"]),
    ("Which city is the Eiffel Tower located in?", ["Paris"]),
    ("Who directed the movie Inception?", ["Nolan", "Christopher"]),
    ("What company did Steve Jobs co-found?", ["Apple"]),
    ("What did Marie Curie win Nobel Prizes for?", ["Physics", "Chemistry"]),
    ("What did Alexander Fleming discover?", ["penicillin"]),
    ("Who is known as the father of modern physics?", ["Einstein"]),
    ("What disease is caused by mosquitoes?", ["malaria", "dengue"]),
    ("Who wrote the Communist Manifesto?", ["Marx", "Engels"]),
    ("What is the WHO?", ["World Health Organization", "Health"]),
    ("Who invented the World Wide Web?", ["Berners-Lee", "Tim"]),
    ("What is NASA?", ["National Aeronautics", "Space"]),
    ("Who was the first female Nobel Prize winner?", ["Curie", "Marie"]),
    ("What is CERN?", ["European Organization", "Nuclear Research", "particle"]),
    ("Who painted the Sistine Chapel?", ["Michelangelo"]),
    ("What is the United Nations?", ["international", "organization", "peace"]),
    ("Who invented the printing press?", ["Gutenberg"]),
    ("What is OPEC?", ["Organization", "Petroleum", "Oil"]),
    ("Who discovered X-rays?", ["Rontgen", "Roentgen"]),
]


def generate_question_batch(pipeline, total_needed, seed=42):
    """Generate a batch of questions for a pipeline, cycling through the bank."""
    rng = random.Random(seed)
    bank = GRAPH_QUESTIONS if pipeline == "graph" else GENERAL_QUESTIONS

    questions = []
    for i in range(total_needed):
        q, expected = bank[i % len(bank)]
        cycle = i // len(bank)
        qid = f"{pipeline}-q{i+1:05d}"
        if cycle > 0:
            q = f"{q} (variation {cycle + 1})"
        questions.append({
            "id": qid,
            "query": q,
            "expected": expected,
            "pipeline": pipeline,
        })
    rng.shuffle(questions)
    return questions


def check_answer(response_text, expected_keywords):
    """Check if response contains expected keywords."""
    if expected_keywords is None:
        return len(response_text.strip()) > 0
    text_lower = response_text.lower()
    return any(kw.lower() in text_lower for kw in expected_keywords)


def extract_answer(response_body):
    """Extract answer text from JSON response."""
    try:
        text = response_body if isinstance(response_body, str) else response_body.decode("utf-8", errors="replace")
        data = json.loads(text)
        if isinstance(data, dict):
            for key in ("answer", "response", "result", "output", "text", "content", "interpretation"):
                if key in data and data[key]:
                    return str(data[key])
            return json.dumps(data)[:500]
        if isinstance(data, list) and data:
            first = data[0]
            if isinstance(first, dict):
                for key in ("answer", "response", "result", "output", "text", "content"):
                    if key in first and first[key]:
                        return str(first[key])
            return json.dumps(first)[:500]
        return str(data)[:500]
    except Exception:
        if isinstance(response_body, bytes):
            return response_body.decode("utf-8", errors="replace")[:500]
        return str(response_body)[:500]


def fire_single_question(question, timeout):
    """Fire a single HTTP request (runs in thread)."""
    url = f"{BASE_URL}{PIPELINES_ALL[question['pipeline']]}"
    payload = json.dumps({"query": question["query"]}).encode("utf-8")
    start = time.time()

    try:
        req = Request(
            url,
            data=payload,
            headers={
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            method="POST",
        )
        with urlopen(req, timeout=timeout) as resp:
            body = resp.read()
            elapsed = time.time() - start
            status = resp.status

            if status == 200:
                answer_text = extract_answer(body)
                correct = check_answer(answer_text, question["expected"])
                return {
                    "id": question["id"],
                    "pipeline": question["pipeline"],
                    "query": question["query"],
                    "status": "pass" if correct else "fail",
                    "correct": correct,
                    "answer": answer_text[:200],
                    "latency_ms": round(elapsed * 1000),
                    "http_status": status,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                }
            else:
                return {
                    "id": question["id"],
                    "pipeline": question["pipeline"],
                    "query": question["query"],
                    "status": "error",
                    "correct": False,
                    "answer": "",
                    "error": f"HTTP {status}",
                    "latency_ms": round(elapsed * 1000),
                    "http_status": status,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                }

    except HTTPError as e:
        elapsed = time.time() - start
        return {
            "id": question["id"],
            "pipeline": question["pipeline"],
            "query": question["query"],
            "status": "error",
            "correct": False,
            "answer": "",
            "error": f"HTTP {e.code}: {str(e.reason)[:100]}",
            "latency_ms": round(elapsed * 1000),
            "http_status": e.code,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    except (TimeoutError, URLError) as e:
        elapsed = time.time() - start
        err_str = str(e)[:200]
        is_timeout = "timed out" in err_str.lower() or isinstance(e, TimeoutError)
        return {
            "id": question["id"],
            "pipeline": question["pipeline"],
            "query": question["query"],
            "status": "timeout" if is_timeout else "error",
            "correct": False,
            "answer": "",
            "error": f"Timeout after {timeout}s" if is_timeout else err_str,
            "latency_ms": round(elapsed * 1000),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    except Exception as e:
        elapsed = time.time() - start
        return {
            "id": question["id"],
            "pipeline": question["pipeline"],
            "query": question["query"],
            "status": "error",
            "correct": False,
            "answer": "",
            "error": str(e)[:200],
            "latency_ms": round(elapsed * 1000),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }


class MassParallelTester:
    def __init__(self, pipelines, total_per_pipeline, concurrency, timeout, auto_save_interval):
        self.pipelines = pipelines
        self.total_per_pipeline = total_per_pipeline
        self.concurrency = concurrency
        self.timeout = timeout
        self.auto_save_interval = auto_save_interval
        self.start_time = time.time()
        self.results = []
        self.stats = {}
        self.lock = threading.Lock()
        self.stopped = False

        for name in pipelines:
            self.stats[name] = {
                "tested": 0, "correct": 0, "errors": 0,
                "total_latency": 0.0, "min_latency": float("inf"),
                "max_latency": 0.0, "consecutive_errors": 0,
                "auto_stopped": False,
            }

    def record_result(self, result):
        """Thread-safe result recording."""
        with self.lock:
            pipe = result["pipeline"]
            s = self.stats[pipe]
            elapsed = result["latency_ms"] / 1000.0

            s["tested"] += 1
            s["total_latency"] += elapsed
            s["min_latency"] = min(s["min_latency"], elapsed)
            s["max_latency"] = max(s["max_latency"], elapsed)

            if result["correct"]:
                s["correct"] += 1
                s["consecutive_errors"] = 0
            elif result["status"] in ("error", "timeout"):
                s["errors"] += 1
                s["consecutive_errors"] += 1
                if s["consecutive_errors"] >= 5:
                    s["auto_stopped"] = True
            else:
                s["consecutive_errors"] = 0

            self.results.append(result)

        # Log (outside lock for performance)
        icon = "+" if result["correct"] else "x" if result["status"] in ("error", "timeout") else "-"
        pipe_short = result["pipeline"][:4].upper()
        tested = self.stats[result["pipeline"]]["tested"]
        total = self.total_per_pipeline
        lat = result["latency_ms"] / 1000.0
        print(f"  [{icon}] {pipe_short} {tested}/{total} | {result['query'][:40]}... | {lat:.1f}s", flush=True)

    def is_pipeline_stopped(self, pipeline):
        """Check if pipeline should be auto-stopped."""
        with self.lock:
            return self.stats[pipeline].get("auto_stopped", False)

    def write_progress(self):
        """Write progress to file for external monitoring."""
        elapsed = time.time() - self.start_time
        with self.lock:
            total_tested = sum(s["tested"] for s in self.stats.values())
            total_correct = sum(s["correct"] for s in self.stats.values())
            total_target = self.total_per_pipeline * len(self.pipelines)

            progress = {
                "status": "running" if not self.stopped else "completed",
                "mode": "mass-parallel-v2",
                "concurrency": self.concurrency,
                "elapsed_seconds": round(elapsed, 1),
                "total_tested": total_tested,
                "total_correct": total_correct,
                "total_target": total_target,
                "accuracy": round(total_correct / max(total_tested, 1) * 100, 1),
                "progress_pct": round(total_tested / max(total_target, 1) * 100, 1),
                "qps": round(total_tested / max(elapsed, 0.1), 2),
                "eta_seconds": round((total_target - total_tested) * elapsed / max(total_tested, 1)) if total_tested > 0 else None,
                "pipelines": {},
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }

            for name, s in self.stats.items():
                progress["pipelines"][name] = {
                    "tested": s["tested"],
                    "correct": s["correct"],
                    "errors": s["errors"],
                    "accuracy": round(s["correct"] / max(s["tested"], 1) * 100, 1),
                    "avg_latency_s": round(s["total_latency"] / max(s["tested"], 1), 2),
                    "min_latency_s": round(s["min_latency"], 2) if s["min_latency"] != float("inf") else None,
                    "max_latency_s": round(s["max_latency"], 2),
                    "consecutive_errors": s["consecutive_errors"],
                    "auto_stopped": s["auto_stopped"],
                }

        try:
            PROGRESS_FILE.write_text(json.dumps(progress, indent=2))
        except Exception:
            pass

    def write_results(self):
        """Write full results to file."""
        with self.lock:
            data = list(self.results)
        try:
            RESULTS_FILE.write_text(json.dumps(data, indent=2))
        except Exception:
            pass

    def run(self):
        """Main execution loop using ThreadPoolExecutor."""
        self.start_time = time.time()

        # Generate all questions upfront
        all_questions = {}
        for name in self.pipelines:
            all_questions[name] = generate_question_batch(name, self.total_per_pipeline)

        total_target = self.total_per_pipeline * len(self.pipelines)
        print(f"\n{'='*60}")
        print(f"MASS PARALLEL TEST v2.0 (stdlib) — {total_target} questions total")
        print(f"  Pipelines: {', '.join(self.pipelines.keys())}")
        print(f"  Per pipeline: {self.total_per_pipeline}")
        print(f"  Concurrency: {self.concurrency} threads")
        print(f"  Timeout: {self.timeout}s per question")
        print(f"  Target: {BASE_URL}")
        print(f"  Auto-save: every {self.auto_save_interval}s")
        print(f"{'='*60}\n")

        # Interleave questions from all pipelines for balanced testing
        interleaved = []
        max_len = max(len(qs) for qs in all_questions.values())
        for i in range(max_len):
            for name in self.pipelines:
                qs = all_questions[name]
                if i < len(qs):
                    interleaved.append(qs[i])

        last_save_time = time.time()
        last_progress_time = time.time()
        completed_count = 0

        with ThreadPoolExecutor(max_workers=self.concurrency) as executor:
            # Submit all questions
            future_to_question = {}
            for q in interleaved:
                if self.stopped:
                    break
                if self.is_pipeline_stopped(q["pipeline"]):
                    continue
                future = executor.submit(fire_single_question, q, self.timeout)
                future_to_question[future] = q

            # Process results as they complete
            for future in as_completed(future_to_question):
                if self.stopped:
                    break

                question = future_to_question[future]
                try:
                    result = future.result()
                    self.record_result(result)
                except Exception as e:
                    error_result = {
                        "id": question["id"],
                        "pipeline": question["pipeline"],
                        "query": question["query"],
                        "status": "error",
                        "correct": False,
                        "answer": "",
                        "error": f"Future exception: {str(e)[:200]}",
                        "latency_ms": 0,
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                    }
                    self.record_result(error_result)

                completed_count += 1

                # Progress update every 5s
                now = time.time()
                if now - last_progress_time >= 5:
                    self.write_progress()
                    last_progress_time = now

                    with self.lock:
                        total_tested = sum(s["tested"] for s in self.stats.values())
                        total_correct = sum(s["correct"] for s in self.stats.values())
                    elapsed = now - self.start_time
                    qps = total_tested / max(elapsed, 0.1)
                    acc = total_correct / max(total_tested, 1) * 100
                    eta = (total_target - total_tested) / max(qps, 0.01)
                    print(f"\n  >>> Progress: {total_tested}/{total_target} ({acc:.1f}%) | {qps:.1f} q/s | {elapsed:.0f}s elapsed | ETA {eta:.0f}s\n")

                # Auto-save results
                if now - last_save_time >= self.auto_save_interval:
                    self.write_results()
                    self.write_progress()
                    with self.lock:
                        total_tested = sum(s["tested"] for s in self.stats.values())
                    print(f"\n  [SAVE] Auto-saved {total_tested} results to {RESULTS_FILE}\n")
                    last_save_time = now

                # Check if all pipelines auto-stopped
                with self.lock:
                    all_stopped = all(s["auto_stopped"] for s in self.stats.values())
                if all_stopped:
                    print("\n[!] ALL pipelines auto-stopped (5 consecutive errors each). Ending test.")
                    self.stopped = True
                    break

        # Final writes
        self.stopped = True
        self.write_progress()
        self.write_results()

        # Print summary
        elapsed = time.time() - self.start_time
        with self.lock:
            total_tested = sum(s["tested"] for s in self.stats.values())
            total_correct = sum(s["correct"] for s in self.stats.values())
            total_errors = sum(s["errors"] for s in self.stats.values())

        summary = {
            "test_type": "mass-parallel-v2",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "config": {
                "total_per_pipeline": self.total_per_pipeline,
                "concurrency": self.concurrency,
                "timeout": self.timeout,
                "target": BASE_URL,
                "pipelines": list(self.pipelines.keys()),
            },
            "totals": {
                "tested": total_tested,
                "correct": total_correct,
                "errors": total_errors,
                "accuracy_pct": round(total_correct / max(total_tested, 1) * 100, 1),
                "elapsed_seconds": round(elapsed, 1),
                "qps": round(total_tested / max(elapsed, 0.1), 2),
            },
            "pipelines": {},
        }

        print(f"\n{'='*60}")
        print(f"RESULTS SUMMARY")
        print(f"{'='*60}")
        print(f"  Total: {total_tested} tested | {total_correct} correct | {total_errors} errors")
        print(f"  Accuracy: {total_correct/max(total_tested,1)*100:.1f}%")
        print(f"  Duration: {elapsed:.1f}s ({total_tested/max(elapsed,0.1):.1f} q/s)")
        print()

        for name in self.pipelines:
            s = self.stats[name]
            acc = s["correct"] / max(s["tested"], 1) * 100
            avg_lat = s["total_latency"] / max(s["tested"], 1)
            stopped_tag = " [STOPPED]" if s["auto_stopped"] else ""
            print(f"  {name.upper():15s} | {s['tested']:5d} tested | {s['correct']:5d} correct | {acc:5.1f}% | avg {avg_lat:.1f}s{stopped_tag}")
            summary["pipelines"][name] = {
                "tested": s["tested"],
                "correct": s["correct"],
                "errors": s["errors"],
                "accuracy_pct": round(acc, 1),
                "avg_latency_s": round(avg_lat, 2),
                "min_latency_s": round(s["min_latency"], 2) if s["min_latency"] != float("inf") else None,
                "max_latency_s": round(s["max_latency"], 2),
                "auto_stopped": s["auto_stopped"],
            }

        print(f"\n  Results: {RESULTS_FILE}")
        print(f"  Progress: {PROGRESS_FILE}")

        # Save summary to logs
        os.makedirs(SUMMARY_FILE.parent, exist_ok=True)
        SUMMARY_FILE.write_text(json.dumps(summary, indent=2))
        print(f"  Summary: {SUMMARY_FILE}")

        return summary

    def shutdown(self):
        """Graceful shutdown."""
        print("\n[!] Shutting down... saving results.")
        self.stopped = True
        self.write_results()
        self.write_progress()


def main():
    parser = argparse.ArgumentParser(description="Mass Parallel RAG Tester v2.0 (stdlib)")
    parser.add_argument("--total", type=int, default=100,
                        help="Total questions PER PIPELINE (default: 100)")
    parser.add_argument("--concurrency", type=int, default=10,
                        help="Max concurrent threads (default: 10)")
    parser.add_argument("--timeout", type=int, default=120,
                        help="Timeout per question in seconds (default: 120)")
    parser.add_argument("--pipelines", type=str, default="standard,graph,orchestrator",
                        help="Comma-separated pipelines (default: standard,graph,orchestrator)")
    parser.add_argument("--include-quant", action="store_true",
                        help="Include quantitative pipeline (broken)")
    parser.add_argument("--auto-save", type=int, default=600,
                        help="Auto-save interval in seconds (default: 600 = 10min)")
    parser.add_argument("--target", type=str, default=None,
                        help="Override target URL")

    args = parser.parse_args()

    global BASE_URL
    if args.target:
        BASE_URL = args.target

    pipe_names = [p.strip() for p in args.pipelines.split(",")]
    selected = {}
    for name in pipe_names:
        if name in PIPELINES_ALL:
            selected[name] = PIPELINES_ALL[name]
        else:
            print(f"Unknown pipeline: {name}")
            sys.exit(1)

    if args.include_quant and "quantitative" not in selected:
        selected["quantitative"] = PIPELINES_ALL["quantitative"]

    tester = MassParallelTester(
        pipelines=selected,
        total_per_pipeline=args.total,
        concurrency=args.concurrency,
        timeout=args.timeout,
        auto_save_interval=args.auto_save,
    )

    # Handle Ctrl+C gracefully
    def sigint_handler(sig, frame):
        tester.shutdown()
        sys.exit(130)
    signal.signal(signal.SIGINT, sigint_handler)

    try:
        summary = tester.run()
        sys.exit(0 if summary["totals"]["accuracy_pct"] >= 70 else 1)
    except KeyboardInterrupt:
        tester.shutdown()
        sys.exit(130)


if __name__ == "__main__":
    main()
