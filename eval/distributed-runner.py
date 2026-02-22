#!/usr/bin/env python3
"""
DISTRIBUTED MULTI-INSTANCE RUNNER — 12+ concurrent workflows
=============================================================
Distributes pipeline evaluations across multiple n8n instances
(HF Space, Codespaces, VM) each with their own OpenRouter key.

Architecture:
  Instance 1 (HF Space, 16GB):   Standard + Graph   × batch 5 = 10 concurrent
  Instance 2 (Codespace 1, 8GB): Standard + Graph   × batch 5 = 10 concurrent
  Instance 3 (Codespace 2, 8GB): Quant + Orchestrator × batch 10 = 20 concurrent
  ─────────────────────────────────────────────────────────────────────────
  TOTAL: 40 concurrent workflow executions (3 instances × multiple pipelines)

Each instance uses a DIFFERENT OpenRouter API key to bypass the 20 req/min
rate limit per key. This effectively multiplies throughput linearly.

Usage:
  source .env.local
  python3 eval/distributed-runner.py --config eval/instances.json
  python3 eval/distributed-runner.py --config eval/instances.json --dataset phase-2 --max 100

Config format (instances.json):
  [
    {"name": "hf-space", "host": "https://lbjlincoln-nomos-rag-engine.hf.space",
     "pipelines": ["standard", "graph"], "batch_size": 5, "max_concurrent": 10},
    {"name": "codespace-1", "host": "http://localhost:5678",
     "pipelines": ["quantitative", "orchestrator"], "batch_size": 10, "max_concurrent": 20}
  ]

Last updated: 2026-02-22
"""

import argparse
import json
import os
import sys
import time
import threading
from datetime import datetime, timezone, timedelta
from concurrent.futures import ThreadPoolExecutor, as_completed

PARIS_TZ = timezone(timedelta(hours=1))
REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EVAL_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, EVAL_DIR)

# Import from run-eval
from importlib.machinery import SourceFileLoader
run_eval_mod = SourceFileLoader("run_eval", os.path.join(EVAL_DIR, "run-eval.py")).load_module()
writer = SourceFileLoader("w", os.path.join(EVAL_DIR, "live-writer.py")).load_module()

load_questions = run_eval_mod.load_questions
load_tested_ids_by_type = run_eval_mod.load_tested_ids_by_type
save_tested_ids = run_eval_mod.save_tested_ids
extract_answer = run_eval_mod.extract_answer
evaluate_answer = run_eval_mod.evaluate_answer
extract_pipeline_details = run_eval_mod.extract_pipeline_details
compute_f1 = run_eval_mod.compute_f1

WEBHOOK_PATHS = {
    "standard": "/webhook/rag-multi-index-v3",
    "graph": "/webhook/ff622742-6d71-4e91-af71-b5c666088717",
    "quantitative": "/webhook/3e0f8010-39e0-4bca-9d19-35e5094391a9",
    "orchestrator": "/webhook/92217bb8-ffc8-459a-8331-3f553812c3d0",
    "pme-gateway": "/webhook/pme-assistant-gateway",
    "pme-action": "/webhook/pme-action-executor",
    "pme-whatsapp": "/webhook/whatsapp-incoming",
}

_print_lock = threading.Lock()
_dedup_lock = threading.Lock()


def tprint(msg):
    with _print_lock:
        print(msg, flush=True)


def call_webhook(host, path, question, timeout=120):
    """Call a webhook on a specific host."""
    import urllib.request
    import urllib.error
    url = f"{host}{path}"
    data = json.dumps({"query": question}).encode()
    req = urllib.request.Request(url, data=data, method="POST",
                                 headers={"Content-Type": "application/json"})
    start = time.time()
    try:
        resp = urllib.request.urlopen(req, timeout=timeout)
        body = resp.read().decode()
        latency = int((time.time() - start) * 1000)
        try:
            parsed = json.loads(body)
        except json.JSONDecodeError:
            parsed = {"output": body}
        return {"data": parsed, "latency_ms": latency, "error": None,
                "http_status": resp.status, "raw_response": body}
    except urllib.error.HTTPError as e:
        latency = int((time.time() - start) * 1000)
        return {"data": None, "latency_ms": latency,
                "error": f"HTTP_{e.code}", "http_status": e.code}
    except Exception as e:
        latency = int((time.time() - start) * 1000)
        err = str(e)
        if "timed out" in err.lower():
            return {"data": None, "latency_ms": latency, "error": "TIMEOUT"}
        return {"data": None, "latency_ms": latency, "error": f"ERROR:{err[:100]}"}


def process_question_on_instance(instance, pipeline, q, idx, total):
    """Process a single question on a specific instance."""
    host = instance["host"]
    path = WEBHOOK_PATHS[pipeline]
    timeout = {"standard": 120, "graph": 180, "quantitative": 60,
               "orchestrator": 120}.get(pipeline, 120)

    resp = call_webhook(host, path, q["question"], timeout=timeout)

    if resp["error"]:
        answer = ""
        evaluation = {"correct": False, "method": "NO_ANSWER", "f1": 0.0,
                      "detail": resp["error"]}
    else:
        answer = extract_answer(resp["data"])
        evaluation = evaluate_answer(answer, q["expected"])

    is_correct = evaluation.get("correct", False)
    f1_val = evaluation.get("f1", compute_f1(answer, q["expected"]))
    symbol = "[+]" if is_correct else "[-]"
    iname = instance["name"]

    tprint(f"  [{iname}|{pipeline.upper()} {idx+1}/{total}] {symbol} {q['id']} | "
           f"F1={f1_val:.3f} | {resp['latency_ms']}ms | {evaluation.get('method','')}")

    return {
        "qid": q["id"],
        "question": q["question"],
        "expected": q["expected"],
        "answer": answer,
        "is_correct": is_correct,
        "f1_val": f1_val,
        "has_error": resp["error"] is not None,
        "resp": resp,
        "evaluation": evaluation,
        "instance": iname,
        "pipeline": pipeline,
    }


def run_pipeline_on_instance(instance, pipeline, questions, tested_ids, label=""):
    """Run a pipeline on a specific instance with batching."""
    batch_size = instance.get("batch_size", 5)
    early_stop = instance.get("early_stop", 10)
    already_tested = tested_ids.get(pipeline, set())
    untested = [q for q in questions if q["id"] not in already_tested]

    if not untested:
        tprint(f"  [{instance['name']}|{pipeline.upper()}] SKIPPED (all tested)")
        return pipeline, {"tested": 0, "correct": 0, "errors": 0}, []

    tprint(f"\n  [{instance['name']}|{pipeline.upper()}] Starting {len(untested)} questions "
           f"(batch={batch_size}, early-stop={early_stop})")

    totals = {"tested": 0, "correct": 0, "errors": 0}
    results = []
    consecutive_failures = 0

    for batch_start in range(0, len(untested), batch_size):
        if consecutive_failures >= early_stop and totals["tested"] > early_stop:
            tprint(f"  [{instance['name']}|{pipeline.upper()}] EARLY STOP: "
                   f"{consecutive_failures} consecutive failures")
            break

        batch = untested[batch_start:batch_start + batch_size]

        # Process batch in parallel
        batch_results = []
        with ThreadPoolExecutor(max_workers=len(batch)) as pool:
            futures = {}
            for j, q in enumerate(batch):
                idx = batch_start + j
                future = pool.submit(
                    process_question_on_instance,
                    instance, pipeline, q, idx, len(untested)
                )
                futures[future] = j

            for future in as_completed(futures):
                j = futures[future]
                try:
                    result = future.result()
                    batch_results.append((j, result))
                except Exception as e:
                    tprint(f"  [{instance['name']}|{pipeline.upper()}] Error: {e}")

        # Record batch results in order
        batch_results.sort(key=lambda x: x[0])
        for _, result in batch_results:
            writer.record_question(
                rag_type=pipeline, question_id=result["qid"],
                question_text=result["question"], correct=result["is_correct"],
                f1=result["f1_val"], latency_ms=result["resp"]["latency_ms"],
                error=result["resp"].get("error"), cost_usd=0,
                expected=result["expected"], answer=result["answer"],
                match_type=result["evaluation"].get("method", "")
            )
            with _dedup_lock:
                tested_ids.setdefault(pipeline, set()).add(result["qid"])
            totals["tested"] += 1
            if result["is_correct"]:
                totals["correct"] += 1
                consecutive_failures = 0
            else:
                consecutive_failures += 1
            if result["has_error"]:
                totals["errors"] += 1
            results.append(result)

        # Brief pause between batches
        if batch_start + batch_size < len(untested):
            time.sleep(0.5)

    acc = round(totals["correct"] / totals["tested"] * 100, 1) if totals["tested"] > 0 else 0
    tprint(f"\n  [{instance['name']}|{pipeline.upper()}] DONE: "
           f"{totals['correct']}/{totals['tested']} ({acc}%) | {totals['errors']} errors")

    # Save dedup
    with _dedup_lock:
        save_tested_ids({k: v for k, v in tested_ids.items()})

    return pipeline, totals, results


def load_instances(config_path):
    """Load instance configuration."""
    if config_path and os.path.exists(config_path):
        with open(config_path) as f:
            return json.load(f)

    # Default: single HF Space instance
    return [{
        "name": "hf-space",
        "host": os.environ.get("N8N_HOST", "https://lbjlincoln-nomos-rag-engine.hf.space"),
        "pipelines": ["standard", "graph", "quantitative", "orchestrator"],
        "batch_size": 5,
        "max_concurrent": 20,
        "early_stop": 10,
    }]


def main():
    parser = argparse.ArgumentParser(
        description="Distributed Multi-Instance Runner (12+ concurrent workflows)")
    parser.add_argument("--config", type=str, default=None,
                        help="Path to instances.json config file")
    parser.add_argument("--dataset", type=str, default="phase-2",
                        choices=["phase-1", "phase-2", "all"],
                        help="Dataset to evaluate")
    parser.add_argument("--max", type=int, default=None,
                        help="Max questions per pipeline")
    parser.add_argument("--reset", action="store_true",
                        help="Ignore dedup, re-test all")
    parser.add_argument("--push", action="store_true",
                        help="Git push after completion")
    parser.add_argument("--label", type=str, default="",
                        help="Label for this run")
    parser.add_argument("--force", action="store_true",
                        help="Skip phase gate checks")
    parser.add_argument("--dry-run", action="store_true",
                        help="Show plan without executing")
    args = parser.parse_args()

    instances = load_instances(args.config)
    start_time = datetime.now(PARIS_TZ)

    # Calculate total concurrent capacity
    total_concurrent = sum(
        len(i.get("pipelines", [])) * i.get("batch_size", 5)
        for i in instances
    )
    total_pipelines = sum(len(i.get("pipelines", [])) for i in instances)

    print("=" * 70)
    print("  DISTRIBUTED MULTI-INSTANCE RUNNER")
    print(f"  Started: {start_time.isoformat()}")
    print(f"  Instances: {len(instances)}")
    print(f"  Total pipeline slots: {total_pipelines}")
    print(f"  Total concurrent capacity: {total_concurrent}")
    print(f"  Dataset: {args.dataset}")
    print(f"  Max per pipeline: {args.max or 'all'}")
    print("=" * 70)

    for i, inst in enumerate(instances):
        concurrent = len(inst.get("pipelines", [])) * inst.get("batch_size", 5)
        print(f"\n  Instance {i+1}: {inst['name']}")
        print(f"    Host: {inst['host']}")
        print(f"    Pipelines: {', '.join(inst.get('pipelines', []))}")
        print(f"    Batch size: {inst.get('batch_size', 5)}")
        print(f"    Concurrent: {concurrent}")

    if args.dry_run:
        print("\n  DRY RUN — exiting without executing")
        return

    # Load questions
    print("\n  Loading questions...")
    questions = load_questions(dataset=args.dataset)

    if args.max:
        for t in questions:
            questions[t] = questions[t][:args.max]

    # Load dedup
    if args.reset:
        tested_ids = {t: set() for t in WEBHOOK_PATHS}
    else:
        tested_ids = load_tested_ids_by_type()

    # Initialize dashboard
    writer.init(
        status="running",
        label=args.label or f"distributed-{args.dataset}-{len(instances)}inst",
        description=f"Distributed: {len(instances)} instances, {total_concurrent} concurrent",
    )

    # Launch all instance+pipeline combinations concurrently
    print(f"\n  Launching {total_pipelines} pipeline slots across {len(instances)} instances...")
    overall_totals = {"tested": 0, "correct": 0, "errors": 0}

    # Each instance gets its own ThreadPoolExecutor for its pipelines
    # All instances run truly in parallel
    all_futures = {}
    executor = ThreadPoolExecutor(max_workers=total_pipelines)

    for inst in instances:
        for pipeline in inst.get("pipelines", []):
            if pipeline in questions and questions[pipeline]:
                future = executor.submit(
                    run_pipeline_on_instance,
                    inst, pipeline, questions[pipeline],
                    tested_ids, label=args.label
                )
                all_futures[future] = f"{inst['name']}:{pipeline}"

    # Collect results
    for future in as_completed(all_futures):
        key = all_futures[future]
        try:
            pipeline, totals, results = future.result()
            overall_totals["tested"] += totals["tested"]
            overall_totals["correct"] += totals["correct"]
            overall_totals["errors"] += totals["errors"]
        except Exception as e:
            print(f"  [{key}] FAILED: {e}")

    executor.shutdown(wait=True)

    # Summary
    elapsed = int((datetime.now(PARIS_TZ) - start_time).total_seconds())
    acc = round(overall_totals["correct"] / overall_totals["tested"] * 100, 1) \
        if overall_totals["tested"] > 0 else 0

    print(f"\n{'='*70}")
    print("  DISTRIBUTED EVALUATION COMPLETE")
    print(f"{'='*70}")
    print(f"  Instances: {len(instances)}")
    print(f"  Concurrent capacity: {total_concurrent}")
    print(f"  Tested:  {overall_totals['tested']}")
    print(f"  Correct: {overall_totals['correct']}")
    print(f"  Errors:  {overall_totals['errors']}")
    print(f"  Accuracy: {acc}%")
    print(f"  Elapsed: {elapsed}s ({elapsed // 60}m {elapsed % 60}s)")
    if overall_totals["tested"] > 0:
        tput = round(overall_totals["tested"] / (elapsed / 60), 1) if elapsed > 0 else 0
        print(f"  Throughput: {tput} q/min")

    if overall_totals["tested"] > 0:
        writer.finish(event="distributed_eval_complete")

    # Final dedup save
    save_tested_ids(tested_ids)

    if args.push:
        print("  Pushing to GitHub...")
        writer.git_push(f"eval: distributed {overall_totals['tested']}q, "
                        f"{overall_totals['correct']} correct ({elapsed}s)")


if __name__ == "__main__":
    main()
