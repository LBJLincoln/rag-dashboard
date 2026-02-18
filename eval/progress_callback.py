"""
Progress Callback — Reports eval progress to VM for live monitoring.

Writes progress to a local JSON file (/tmp/eval-progress.json) AND
optionally POSTs to the VM's n8n webhook for remote monitoring.

Usage in eval scripts:
    from progress_callback import ProgressReporter
    reporter = ProgressReporter(label="Phase1-200q")
    reporter.start(total_questions=200, pipelines=["standard","graph","quantitative","orchestrator"])
    reporter.update(pipeline="standard", question_id="q42", correct=True, latency_ms=340)
    reporter.pipeline_done(pipeline="standard", accuracy=85.5, tested=50, correct=43)
    reporter.finish(overall_accuracy=78.1)
"""

import json
import os
import time
import threading
from datetime import datetime

try:
    from tz_utils import paris_iso
except ImportError:
    from zoneinfo import ZoneInfo
    _TZ = ZoneInfo("Europe/Paris")
    def paris_iso(): return datetime.now(_TZ).isoformat(timespec='seconds')

PROGRESS_FILE = "/tmp/eval-progress.json"
PID_FILE = "/tmp/eval-run.pid"
LOG_FILE = "/tmp/eval-run.log"

# VM webhook for remote monitoring (optional — fails silently if VM unreachable)
VM_WEBHOOK = os.environ.get("VM_PROGRESS_WEBHOOK", "")


class ProgressReporter:
    """Thread-safe progress reporter for eval runs."""

    def __init__(self, label=""):
        self.label = label
        self.lock = threading.Lock()
        self.state = {
            "status": "initializing",
            "label": label,
            "pid": os.getpid(),
            "started_at": paris_iso(),
            "updated_at": paris_iso(),
            "total_questions": 0,
            "tested": 0,
            "correct": 0,
            "errors": 0,
            "overall_accuracy": 0.0,
            "elapsed_s": 0,
            "pipelines": {},
        }
        self._start_time = time.time()
        # Write PID file for remote stop
        with open(PID_FILE, "w") as f:
            f.write(str(os.getpid()))
        self._write()

    def start(self, total_questions, pipelines):
        """Called at the beginning of an eval run."""
        with self.lock:
            self.state["status"] = "running"
            self.state["total_questions"] = total_questions
            for p in pipelines:
                self.state["pipelines"][p] = {
                    "status": "pending",
                    "tested": 0,
                    "correct": 0,
                    "errors": 0,
                    "accuracy": 0.0,
                    "last_question": "",
                    "last_correct": None,
                    "last_latency_ms": 0,
                }
            self._write()

    def update(self, pipeline, question_id, correct, latency_ms, error=None):
        """Called after each question is evaluated."""
        with self.lock:
            p = self.state["pipelines"].get(pipeline, {})
            p["status"] = "running"
            p["tested"] = p.get("tested", 0) + 1
            if correct:
                p["correct"] = p.get("correct", 0) + 1
            if error:
                p["errors"] = p.get("errors", 0) + 1
            p["accuracy"] = round(p["correct"] / p["tested"] * 100, 1) if p["tested"] > 0 else 0.0
            p["last_question"] = question_id
            p["last_correct"] = correct
            p["last_latency_ms"] = latency_ms
            self.state["pipelines"][pipeline] = p

            # Update totals
            self.state["tested"] = sum(pp.get("tested", 0) for pp in self.state["pipelines"].values())
            self.state["correct"] = sum(pp.get("correct", 0) for pp in self.state["pipelines"].values())
            self.state["errors"] = sum(pp.get("errors", 0) for pp in self.state["pipelines"].values())
            self.state["overall_accuracy"] = round(
                self.state["correct"] / self.state["tested"] * 100, 1
            ) if self.state["tested"] > 0 else 0.0
            self.state["elapsed_s"] = int(time.time() - self._start_time)
            self.state["updated_at"] = paris_iso()

            # ETA calculation
            if self.state["tested"] > 0 and self.state["total_questions"] > 0:
                rate = self.state["tested"] / self.state["elapsed_s"] if self.state["elapsed_s"] > 0 else 0
                remaining = self.state["total_questions"] - self.state["tested"]
                self.state["eta_s"] = int(remaining / rate) if rate > 0 else 0
            self._write()

    def pipeline_done(self, pipeline, accuracy, tested, correct):
        """Called when a pipeline finishes all its questions."""
        with self.lock:
            p = self.state["pipelines"].get(pipeline, {})
            p["status"] = "done"
            p["accuracy"] = accuracy
            p["tested"] = tested
            p["correct"] = correct
            self.state["pipelines"][pipeline] = p
            self.state["updated_at"] = paris_iso()
            self._write()

    def pipeline_failed(self, pipeline, error_msg):
        """Called when a pipeline fails fatally."""
        with self.lock:
            p = self.state["pipelines"].get(pipeline, {})
            p["status"] = "failed"
            p["error"] = error_msg
            self.state["pipelines"][pipeline] = p
            self.state["updated_at"] = paris_iso()
            self._write()

    def finish(self, overall_accuracy=None):
        """Called at the end of the eval run."""
        with self.lock:
            self.state["status"] = "done"
            self.state["elapsed_s"] = int(time.time() - self._start_time)
            self.state["updated_at"] = paris_iso()
            self.state["finished_at"] = paris_iso()
            if overall_accuracy is not None:
                self.state["overall_accuracy"] = overall_accuracy
            self._write()
        # Clean PID file
        try:
            os.remove(PID_FILE)
        except OSError:
            pass

    def _write(self):
        """Write progress to local file. Optionally POST to VM webhook."""
        try:
            with open(PROGRESS_FILE, "w") as f:
                json.dump(self.state, f, indent=2, ensure_ascii=False)
        except Exception:
            pass

        # POST to VM webhook (fire-and-forget, non-blocking)
        if VM_WEBHOOK:
            try:
                import urllib.request
                data = json.dumps(self.state).encode("utf-8")
                req = urllib.request.Request(
                    VM_WEBHOOK,
                    data=data,
                    headers={"Content-Type": "application/json"},
                )
                urllib.request.urlopen(req, timeout=3)
            except Exception:
                pass  # Never block eval on webhook failure
