import json
import os
import sys
import time
from urllib import request, error
from datetime import datetime
from collections import defaultdict

# Timezone: Europe/Paris
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
try:
    from tz_utils import paris_now, paris_iso
except ImportError:
    from zoneinfo import ZoneInfo
    _TZ = ZoneInfo("Europe/Paris")
    def paris_now(): return datetime.now(_TZ)
    def paris_iso(): return datetime.now(_TZ).isoformat(timespec='seconds')

# --- Constants ---
REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATASETS_DIR = os.path.join(REPO_ROOT, "datasets")
TESTED_IDS_FILE = os.path.join(REPO_ROOT, "docs", "tested_ids.json")

# RAG Endpoints from live-writer.py _default_data
N8N_HOST = os.environ.get("N8N_HOST", "http://34.136.180.66:5678")
RAG_ENDPOINTS = {
    "standard": f"{N8N_HOST}/webhook/rag-multi-index-v3",
    "graph": f"{N8N_HOST}/webhook/ff622742-6d71-4e91-af71-b5c666088717",
    "quantitative": f"{N8N_HOST}/webhook/3e0f8010-39e0-4bca-9d19-35e5094391a9",
    "orchestrator": f"{N8N_HOST}/webhook/92217bb8-ffc8-459a-8331-3f553812c3d0",
}

# --- Functions ---

def call_local_reasoning(question_text, rag_type="quantitative", timeout=30):
    """
    Call OpenRouter LLM directly from VM for context-rich questions.
    Bypasses HF Space n8n pipeline (which is rate-limited from HF IPs).
    Used for:
      - quantitative questions with embedded context+table_data (FIX-39)
      - graph questions with embedded reference context (FIX-39d)
    Returns same format as call_rag() for drop-in replacement.
    """
    api_key = os.environ.get("OPENROUTER_API_KEY", "")
    if not api_key:
        return {"data": None, "latency_ms": 0, "error": "OPENROUTER_API_KEY not set", "http_status": None}

    if rag_type == "quantitative":
        system_prompt = (
            "You are a financial analyst. Answer the question based ONLY on the provided context and table data.\n"
            "Steps:\n"
            "1. LOCATE the relevant numbers in the context/table\n"
            "2. EXTRACT the exact values needed\n"
            "3. CALCULATE if needed (show your work)\n"
            "4. ANSWER with just the final answer\n\n"
            "IMPORTANT: Your FIRST LINE must be the final answer only (a number, percentage, or short phrase). "
            "Then explain your reasoning below."
        )
        # Parse FIX-39 format: question + \n\nContext:\n... + \n\nTable data:\n...
        parts = question_text.split("\n\nContext:\n", 1)
        if len(parts) == 2:
            question_part = parts[0].strip()
            rest = parts[1]
        else:
            question_part = question_text
            rest = ""

        user_prompt = f"{rest}\n\nQuestion: {question_part}\n\nAnswer (first line = final answer only):" if rest else question_text

    elif rag_type == "graph":
        system_prompt = (
            "You are a knowledgeable assistant. Answer the question based on the provided reference context.\n"
            "For multi-hop questions, trace the connections step by step through the context.\n"
            "Give a concise, direct answer."
        )
        parts = question_text.split("\n\nReference context:", 1)
        if len(parts) == 2:
            question_part = parts[0].strip()
            context = parts[1].strip()
        else:
            question_part = question_text
            context = ""

        user_prompt = f"Reference context:\n{context}\n\nQuestion: {question_part}\n\nAnswer:" if context else question_text

    else:
        system_prompt = "Answer the question concisely and accurately."
        user_prompt = question_text

    start_time = datetime.now()
    # Models to try in order (rotate on rate-limit). No system role — Google AI Studio rejects it for Gemma.
    MODELS = [
        "google/gemma-3-27b-it:free",
        "arcee-ai/trinity-large-preview:free",
        "qwen/qwen3-235b-a22b:free",
    ]
    full_prompt = f"{system_prompt}\n\n---\n\n{user_prompt[:12000]}"

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}"
    }

    for model in MODELS:
        payload = json.dumps({
            "model": model,
            "messages": [{"role": "user", "content": full_prompt}],
            "max_tokens": 300,
            "temperature": 0.1
        }).encode('utf-8')

        try:
            req = request.Request("https://openrouter.ai/api/v1/chat/completions",
                                 data=payload, headers=headers)
            with request.urlopen(req, timeout=timeout) as resp:
                data = json.loads(resp.read().decode('utf-8'))
                latency_ms = int((datetime.now() - start_time).total_seconds() * 1000)

                content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
                # Take first line as the answer
                first_line = content.strip().split("\n")[0].strip()
                # Clean up common prefixes
                for prefix in ["Answer:", "The answer is", "Final answer:", "A:", "**", "## "]:
                    if first_line.lower().startswith(prefix.lower()):
                        first_line = first_line[len(prefix):].strip()
                # Remove trailing ** (bold markdown)
                first_line = first_line.rstrip("*").strip()

                return {
                    "data": {"response": first_line, "full_response": content},
                    "latency_ms": latency_ms,
                    "error": None,
                    "http_status": 200
                }
        except error.HTTPError as e:
            if e.code == 429 and model != MODELS[-1]:
                time.sleep(1)
                continue  # Try next model
            latency_ms = int((datetime.now() - start_time).total_seconds() * 1000)
            return {"data": None, "latency_ms": latency_ms, "error": str(e), "http_status": e.code}
        except Exception as e:
            if model != MODELS[-1]:
                time.sleep(0.5)
                continue
            latency_ms = int((datetime.now() - start_time).total_seconds() * 1000)
            return {"data": None, "latency_ms": latency_ms, "error": str(e), "http_status": None}

    latency_ms = int((datetime.now() - start_time).total_seconds() * 1000)
    return {"data": None, "latency_ms": latency_ms, "error": "all models rate-limited", "http_status": 429}


def call_rag(endpoint, question, timeout=60, max_retries=3):
    """
    Makes an HTTP POST request to the RAG endpoint with retry + exponential backoff.
    Returns a dictionary with 'data', 'latency_ms', 'error', 'http_status'.
    Retries on: 429 (rate limit), 502/503/504 (server overload), timeouts, connection errors.
    """
    RETRYABLE_CODES = {429, 502, 503, 504}
    last_result = None

    for attempt in range(max_retries):
        start_time = datetime.now()
        try:
            payload = json.dumps({"query": question, "tenant_id": "benchmark"}).encode('utf-8')
            headers = {"Content-Type": "application/json"}
            req = request.Request(endpoint, data=payload, headers=headers)
            with request.urlopen(req, timeout=timeout) as resp:
                data = json.loads(resp.read().decode('utf-8'))
                latency_ms = int((datetime.now() - start_time).total_seconds() * 1000)
                return {"data": data, "latency_ms": latency_ms, "error": None, "http_status": resp.getcode()}
        except error.HTTPError as e:
            latency_ms = int((datetime.now() - start_time).total_seconds() * 1000)
            last_result = {"data": None, "latency_ms": latency_ms, "error": str(e), "http_status": e.code}
            if e.code in RETRYABLE_CODES and attempt < max_retries - 1:
                delay = (2 ** attempt) + 1  # 2s, 5s, 9s
                time.sleep(delay)
                continue
            return last_result
        except (ConnectionError, TimeoutError, OSError) as e:
            latency_ms = int((datetime.now() - start_time).total_seconds() * 1000)
            last_result = {"data": None, "latency_ms": latency_ms, "error": str(e), "http_status": None}
            if attempt < max_retries - 1:
                delay = (2 ** attempt) + 1
                time.sleep(delay)
                continue
            return last_result
        except Exception as e:
            latency_ms = int((datetime.now() - start_time).total_seconds() * 1000)
            return {"data": None, "latency_ms": latency_ms, "error": str(e), "http_status": None}

    return last_result or {"data": None, "latency_ms": 0, "error": "max retries exhausted", "http_status": None}


def extract_answer(response_data):
    """
    Extracts the final answer from the RAG pipeline's response data.
    Handles both dict and list responses (webhooks return arrays).
    """
    if isinstance(response_data, list):
        response_data = response_data[0] if response_data else {}
    if not isinstance(response_data, dict):
        return str(response_data) if response_data else ""
    # Try multiple common response field names
    for key in ["response", "answer", "result", "interpretation", "final_response"]:
        if key in response_data and response_data[key]:
            return str(response_data[key])
    # Fallback to nested output
    output = response_data.get("output", {})
    if isinstance(output, dict):
        return output.get("answer", "") or output.get("response", "")
    return ""


def evaluate_answer(answer, expected_answer):
    """
    Evaluates the extracted answer against the expected answer.
    Returns a dictionary with 'correct', 'method', 'f1'.
    """
    import re
    answer_lower = answer.lower().strip()
    expected_lower = expected_answer.lower().strip()

    if not expected_lower:
        # No expected answer — just check non-empty response
        return {"correct": len(answer_lower) > 10, "method": "NON_EMPTY", "f1": 1.0 if len(answer_lower) > 10 else 0.0}

    # Normalize numbers: remove commas, $, % for comparison
    def normalize(text):
        import unicodedata
        # Normalize unicode whitespace to regular spaces
        text = ''.join(' ' if unicodedata.category(c).startswith('Z') else c for c in text)
        # Normalize unicode subscripts/superscripts to ASCII
        sub_map = str.maketrans('₀₁₂₃₄₅₆₇₈₉⁰¹²³⁴⁵⁶⁷⁸⁹', '01234567890123456789')
        text = text.translate(sub_map)
        text = text.replace('°', ' degrees ')
        text = re.sub(r'(\d),(\d)', r'\1\2', text)
        # Strip punctuation from tokens (so "Newton," matches "Newton")
        text = re.sub(r'[.,;:!?\'"()\[\]{}\-/]', ' ', text)
        text = re.sub(r'\s+', ' ', text)
        return text.replace('$', '').replace('%', '').strip()

    norm_answer = normalize(answer_lower)
    norm_expected = normalize(expected_lower)

    if norm_answer == norm_expected:
        return {"correct": True, "method": "EXACT_MATCH", "f1": 1.0}
    elif norm_expected in norm_answer:
        return {"correct": True, "method": "CONTAINS_MATCH", "f1": 0.9}
    elif norm_answer in norm_expected:
        return {"correct": True, "method": "SUBSET_MATCH", "f1": 0.8}
    else:
        # Token-level F1 for partial matches
        STOPWORDS = {"a", "an", "the", "is", "of", "in", "to", "and", "for", "on", "at", "with", "from", "s",
                     "that", "was", "by", "it", "its", "are", "were", "been", "be", "has", "have", "had",
                     "which", "where", "who", "whom", "this", "these", "those", "or", "but", "not", "also"}
        answer_tokens = set(norm_answer.split())
        expected_tokens = set(norm_expected.split())
        # Filter stopwords from expected (keep content words only)
        content_expected = expected_tokens - STOPWORDS
        if not content_expected:
            content_expected = expected_tokens
        if not content_expected:
            return {"correct": False, "method": "NO_MATCH", "f1": 0.0}
        # Exact token overlap
        overlap = answer_tokens & content_expected
        # Fuzzy: substring matching for tokens >= 3 chars
        unmatched = content_expected - overlap
        for et in list(unmatched):
            if len(et) < 3:
                continue
            for at in answer_tokens:
                if len(at) < 3:
                    continue
                # Substring match
                if et in at or at in et:
                    overlap.add(et)
                    break
                # Prefix match (75%+): handles "antibiotic"/"antibiotics", "leader"/"leadership"
                min_len = min(len(et), len(at))
                if min_len >= 4:
                    common_prefix = 0
                    for i in range(min_len):
                        if et[i] == at[i]:
                            common_prefix += 1
                        else:
                            break
                    if common_prefix >= min_len * 0.75:
                        overlap.add(et)
                        break
        if not overlap:
            return {"correct": False, "method": "NO_MATCH", "f1": 0.0}
        precision = len(overlap) / len(answer_tokens) if answer_tokens else 0
        recall = len(overlap) / len(content_expected)
        f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0
        # Consider correct if recall >= 0.6 (most expected keywords found in answer)
        # or F1 >= 0.35 (reasonable overlap even with verbose answers)
        is_correct = f1 >= 0.35 or recall >= 0.6
        method = "TOKEN_F1" if recall < 0.6 else "FUZZY_RECALL"
        return {"correct": is_correct, "method": method, "f1": round(f1, 4)}

def compute_f1(answer, expected):
    """Compute F1 score between answer and expected."""
    return evaluate_answer(answer, expected)["f1"]


def extract_pipeline_details(response_data, rag_type):
    """
    Extracts specific pipeline details from the response for diagnostic purposes.
    """
    if isinstance(response_data, list):
        response_data = response_data[0] if response_data else {}
    if not isinstance(response_data, dict):
        return {"rag_type": rag_type}
    return {"rag_type": rag_type, "response_keys": list(response_data.keys())}


def load_questions(include_1000=False, dataset="phase-1"):
    """
    Loads questions from specified dataset files.
    """
    questions = defaultdict(list) # Use defaultdict for easier appending

    if dataset == "phase-1":
        phase1_files = [
            os.path.join(DATASETS_DIR, "phase-1", "standard-orch-50x2.json"),
            os.path.join(DATASETS_DIR, "phase-1", "graph-quant-50x2.json"),
        ]
        
        for pf in phase1_files:
            if os.path.exists(pf):
                with open(pf) as f:
                    data = json.load(f)
                    for q in data.get("questions", []):
                        # Use 'rag_target' to group questions
                        rag_target = q.get("rag_target", "unknown")
                        questions[rag_target].append({
                            "id": q["id"],
                            "question": q["question"],
                            "expected": q["expected_answer"], # Use expected_answer
                            "rag_type": rag_target # Store for later use
                        })
            else:
                print(f"Warning: Dataset file not found: {pf}")

    elif dataset == "phase-2":
        phase2_files = [
            os.path.join(DATASETS_DIR, "phase-2", "hf-1000.json"),
            os.path.join(DATASETS_DIR, "phase-2", "standard-orch-1000x2.json"),
        ]
        for phase2_file in phase2_files:
            if os.path.exists(phase2_file):
                with open(phase2_file) as f:
                    data = json.load(f)
                    for q in data.get("questions", []):
                        rag_target = q.get("rag_target", "unknown")
                        # For quantitative questions, embed context + table_data
                        # in the question text so the context reasoning branch
                        # has data to compute from (FIX-39)
                        question_text = q["question"]
                        if rag_target == "quantitative":
                            ctx = q.get("context", "")
                            table = q.get("table_data")
                            if table or ctx:
                                parts = [question_text]
                                if ctx and ctx.strip():
                                    parts.append(f"\n\nContext:\n{ctx}")
                                if table:
                                    import json as _json
                                    table_str = _json.dumps(table) if not isinstance(table, str) else table
                                    parts.append(f"\n\nTable data:\n{table_str}")
                                question_text = "".join(parts)
                        # For graph questions, embed compact context paragraphs (FIX-39d)
                        # so the pipeline has fallback data when Neo4j traversal fails
                        if rag_target == "graph":
                            ctx = q.get("context", "")
                            if ctx and len(ctx) > 50:
                                # Parse JSON context if needed
                                import json as _json
                                try:
                                    paragraphs = _json.loads(ctx) if ctx.startswith('[') else []
                                    # Extract relevant paragraphs (first 3000 chars)
                                    ctx_text = ""
                                    for p in paragraphs[:10]:
                                        if isinstance(p, dict):
                                            title = p.get("title", "")
                                            text = p.get("paragraph_text", "")
                                            ctx_text += f"\n[{title}] {text}"
                                    if ctx_text:
                                        question_text = f"{question_text}\n\nReference context:{ctx_text[:3000]}"
                                except:
                                    # Plain text context
                                    question_text = f"{question_text}\n\nReference context:\n{ctx[:3000]}"
                        questions[rag_target].append({
                            "id": q["id"],
                            "question": question_text,
                            "expected": q["expected_answer"],
                            "rag_type": rag_target
                        })
                print(f"  Loaded {len(data.get('questions', []))} questions from {os.path.basename(phase2_file)}")
            else:
                print(f"Warning: Dataset file not found: {phase2_file}")
    
    # Handle "all" dataset explicitly
    if dataset == "all":
        # Recursively call for phase-1 and phase-2 and merge
        phase1_q = load_questions(dataset="phase-1")
        phase2_q = load_questions(dataset="phase-2")
        
        for p_type, q_list in phase1_q.items():
            questions.setdefault(p_type, []).extend(q_list)
        for p_type, q_list in phase2_q.items():
            questions.setdefault(p_type, []).extend(q_list)

    return questions


def load_tested_ids_by_type():
    """
    Loads tested question IDs from TESTED_IDS_FILE.
    """
    if os.path.exists(TESTED_IDS_FILE):
        with open(TESTED_IDS_FILE) as f:
            data = json.load(f)
            return {k: set(v) for k, v in data.items()}
    return {}


def save_tested_ids(tested_ids_by_type):
    """
    Saves tested question IDs to TESTED_IDS_FILE.
    """
    with open(TESTED_IDS_FILE, "w") as f:
        json.dump({k: list(v) for k, v in tested_ids_by_type.items()}, f, indent=2)

