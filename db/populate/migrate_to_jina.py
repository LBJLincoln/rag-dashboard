#!/usr/bin/env python3
"""
Migrate Pinecone vectors from Cohere 1024d to Jina 1024d embeddings.

Fetches vectors from sota-rag-cohere-1024, extracts text from metadata,
re-embeds with Jina embeddings-v3 (1024d), and upserts to sota-rag-jina-1024.

Usage:
  source .env.local
  python3 db/populate/migrate_to_jina.py                          # Full migration
  python3 db/populate/migrate_to_jina.py --namespace benchmark-squad_v2  # Single namespace
  python3 db/populate/migrate_to_jina.py --dry-run                # Preview only
  python3 db/populate/migrate_to_jina.py --resume                 # Resume from checkpoint
"""

import json
import os
import sys
import time
import urllib.request
import urllib.error
import argparse
from pathlib import Path

# Configuration
SOURCE_HOST = os.environ.get("PINECONE_SOURCE_HOST",
    "https://sota-rag-cohere-1024-a4mkzmz.svc.aped-4627-b74a.pinecone.io")
TARGET_HOST = os.environ.get("PINECONE_TARGET_HOST",
    "https://sota-rag-jina-1024-a4mkzmz.svc.aped-4627-b74a.pinecone.io")
PINECONE_KEY = os.environ["PINECONE_API_KEY"]
JINA_KEY = os.environ["JINA_API_KEY"]

JINA_MODEL = "jina-embeddings-v3"
JINA_URL = "https://api.jina.ai/v1/embeddings"
JINA_BATCH_SIZE = 64  # Jina max per request
JINA_DIM = 1024
PINECONE_FETCH_BATCH = 20  # Keep small to avoid URL length limits (GET params)
RATE_LIMIT_PAUSE = 1.5  # seconds between Jina batches

# Checkpoint file for resumability
CHECKPOINT_FILE = Path(__file__).parent / "jina_migration_checkpoint.json"


def api_request(url, data=None, headers=None, method=None, timeout=60, retries=3):
    """Make HTTP request with retries."""
    for attempt in range(retries):
        try:
            encoded = json.dumps(data).encode() if data is not None else None
            req = urllib.request.Request(url, data=encoded,
                                         method=method or ("POST" if encoded else "GET"))
            req.add_header("Content-Type", "application/json")
            req.add_header("User-Agent", "pinecone-migration/1.0")
            if headers:
                for k, v in headers.items():
                    req.add_header(k, v)
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                return json.loads(resp.read().decode())
        except urllib.error.HTTPError as e:
            body = e.read().decode()
            if e.code == 429:
                wait = 2 ** attempt * 5
                print(f"    Rate limited, waiting {wait}s...")
                time.sleep(wait)
                continue
            if attempt == retries - 1:
                print(f"    HTTP {e.code}: {body[:300]}")
                raise
            time.sleep(2)
        except Exception as e:
            if attempt == retries - 1:
                raise
            time.sleep(2)


def pinecone_request(host, endpoint, data=None, method=None):
    """Make Pinecone API request."""
    return api_request(f"{host}{endpoint}", data=data,
                       headers={"Api-Key": PINECONE_KEY}, method=method)


def jina_embed(texts, task="retrieval.passage"):
    """Embed texts using Jina API. Returns list of 1024-dim vectors."""
    data = {
        "model": JINA_MODEL,
        "input": texts,
        "task": task,
        "dimensions": JINA_DIM,
    }
    result = api_request(JINA_URL, data=data,
                         headers={"Authorization": f"Bearer {JINA_KEY}"}, timeout=120)
    # Sort by index to preserve order
    embeddings = sorted(result.get("data", []), key=lambda x: x["index"])
    usage = result.get("usage", {})
    return [e["embedding"] for e in embeddings], usage


def list_all_ids(host, namespace=""):
    """List all vector IDs in a namespace using pagination."""
    ids = []
    pagination_token = None
    while True:
        params = f"?namespace={namespace}&limit=100"
        if pagination_token:
            params += f"&paginationToken={pagination_token}"
        result = pinecone_request(host, f"/vectors/list{params}")
        vectors = result.get("vectors", [])
        ids.extend(v["id"] for v in vectors)
        pagination_token = result.get("pagination", {}).get("next")
        if not pagination_token or not vectors:
            break
    return ids


def fetch_vectors(host, ids, namespace=""):
    """Fetch vectors with metadata by IDs (GET with query params)."""
    # Fetch in small sub-batches to keep URL length manageable
    all_vectors = {}
    for i in range(0, len(ids), 10):
        batch = ids[i:i+10]
        id_params = "&".join(f"ids={vid}" for vid in batch)
        url = f"{host}/vectors/fetch?namespace={namespace}&{id_params}"
        result = api_request(url, headers={"Api-Key": PINECONE_KEY}, method="GET")
        all_vectors.update(result.get("vectors", {}))
    return {"vectors": all_vectors}


def extract_text(vector_data, namespace):
    """Extract embeddable text from vector metadata."""
    meta = vector_data.get("metadata", {})

    # Benchmark namespaces: question + expected_answer
    if namespace.startswith("benchmark-"):
        question = meta.get("question", "")
        answer = meta.get("expected_answer", "")
        if question:
            return f"{question}\n{answer}" if answer else question

    # Phase 2 graph passages: title + paragraph_text
    title = meta.get("title", "")
    paragraph = meta.get("paragraph_text", "")
    if paragraph:
        return f"{title}\n\n{paragraph}" if title else paragraph

    # Default namespace: content field
    content = meta.get("content", "")
    if content:
        return content

    # Fallback: try various fields
    for field in ["text", "document", "passage", "chunk_text", "page_content"]:
        if meta.get(field):
            return meta[field]

    return ""


def upsert_batch(host, vectors, namespace=""):
    """Upsert a batch of vectors to Pinecone."""
    return pinecone_request(host, "/vectors/upsert",
                            data={"vectors": vectors, "namespace": namespace})


def load_checkpoint():
    """Load migration checkpoint."""
    if CHECKPOINT_FILE.exists():
        with open(CHECKPOINT_FILE) as f:
            return json.load(f)
    return {"completed_namespaces": [], "partial_namespace": None, "partial_offset": 0}


def save_checkpoint(completed, partial_ns=None, partial_offset=0):
    """Save migration checkpoint."""
    with open(CHECKPOINT_FILE, "w") as f:
        json.dump({
            "completed_namespaces": completed,
            "partial_namespace": partial_ns,
            "partial_offset": partial_offset,
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ")
        }, f, indent=2)


def migrate_namespace(namespace, dry_run=False, start_offset=0):
    """Migrate a single namespace. Returns (migrated_count, total_tokens)."""
    print(f"\n  === Migrating namespace: '{namespace or '(default)'}' ===")

    # List all IDs
    print(f"    Listing vector IDs...")
    ids = list_all_ids(SOURCE_HOST, namespace)
    print(f"    Found {len(ids)} vectors")

    if not ids:
        print(f"    Skipping empty namespace")
        return 0, 0

    if dry_run:
        print(f"    DRY RUN: Would migrate {len(ids)} vectors")
        return len(ids), 0

    total_migrated = 0
    total_tokens = 0
    skipped_empty = 0

    for batch_start in range(start_offset, len(ids), PINECONE_FETCH_BATCH):
        batch_ids = ids[batch_start:batch_start + PINECONE_FETCH_BATCH]

        # Fetch vectors with metadata from source
        fetch_result = fetch_vectors(SOURCE_HOST, batch_ids, namespace)
        vectors_data = fetch_result.get("vectors", {})

        if not vectors_data:
            print(f"    Batch {batch_start//PINECONE_FETCH_BATCH + 1}: No vectors returned")
            continue

        # Extract texts and prepare for embedding
        texts_to_embed = []
        vector_ids = []
        metadata_list = []

        for vid, vdata in vectors_data.items():
            text = extract_text(vdata, namespace)
            if text and len(text.strip()) > 0:
                texts_to_embed.append(text[:8000])  # Jina supports up to 8K tokens
                vector_ids.append(vid)
                metadata_list.append(vdata.get("metadata", {}))
            else:
                skipped_empty += 1

        if not texts_to_embed:
            print(f"    Batch {batch_start//PINECONE_FETCH_BATCH + 1}: No extractable text")
            continue

        # Embed with Jina in sub-batches
        all_embeddings = []
        for emb_start in range(0, len(texts_to_embed), JINA_BATCH_SIZE):
            emb_batch = texts_to_embed[emb_start:emb_start + JINA_BATCH_SIZE]
            embeddings, usage = jina_embed(emb_batch)
            all_embeddings.extend(embeddings)
            total_tokens += usage.get("total_tokens", 0)
            time.sleep(RATE_LIMIT_PAUSE)

        # Upsert to target index
        upsert_vectors = []
        for i, (vid, emb, meta) in enumerate(zip(vector_ids, all_embeddings, metadata_list)):
            upsert_vectors.append({
                "id": vid,
                "values": emb,
                "metadata": meta,
            })

            if len(upsert_vectors) >= 100 or i == len(vector_ids) - 1:
                upsert_batch(TARGET_HOST, upsert_vectors, namespace)
                total_migrated += len(upsert_vectors)
                upsert_vectors = []

        progress = min(batch_start + PINECONE_FETCH_BATCH, len(ids))
        print(f"    Batch {batch_start//PINECONE_FETCH_BATCH + 1}: "
              f"Fetched {len(vectors_data)}, embedded {len(all_embeddings)}, "
              f"migrated {total_migrated}/{len(ids)} "
              f"(tokens used: {total_tokens:,})")

    if skipped_empty:
        print(f"    Skipped {skipped_empty} vectors with no extractable text")
    print(f"    Done: {total_migrated} vectors migrated, {total_tokens:,} tokens used")
    return total_migrated, total_tokens


def main():
    parser = argparse.ArgumentParser(description="Migrate Pinecone vectors: Cohere → Jina")
    parser.add_argument("--namespace", help="Migrate single namespace")
    parser.add_argument("--dry-run", action="store_true", help="Preview only")
    parser.add_argument("--resume", action="store_true", help="Resume from checkpoint")
    parser.add_argument("--token-limit", type=int, default=900000,
                        help="Stop after this many tokens (default 900K, ~90%% of free tier)")
    args = parser.parse_args()

    print("=" * 70)
    print("  PINECONE MIGRATION: Cohere 1024d → Jina 1024d")
    print("=" * 70)
    print(f"  Source: {SOURCE_HOST}")
    print(f"  Target: {TARGET_HOST}")
    print(f"  Jina model: {JINA_MODEL}")
    print(f"  Token limit: {args.token_limit:,}")
    if args.dry_run:
        print("  MODE: DRY RUN")

    # Get source index stats
    print("\n  Fetching source index stats...")
    stats = pinecone_request(SOURCE_HOST, "/describe_index_stats", data={}, method="POST")
    namespaces = stats.get("namespaces", {})
    total_vectors = stats.get("totalVectorCount", 0)
    dimension = stats.get("dimension", "?")

    print(f"  Source: {total_vectors} vectors, {dimension}d, {len(namespaces)} namespaces")

    # Load checkpoint if resuming
    checkpoint = load_checkpoint() if args.resume else {
        "completed_namespaces": [], "partial_namespace": None, "partial_offset": 0
    }

    # Determine which namespaces to migrate
    if args.namespace:
        ns_list = [args.namespace]
    else:
        ns_list = sorted(namespaces.keys())

    # Filter out completed namespaces if resuming
    if args.resume and checkpoint["completed_namespaces"]:
        skipped = [ns for ns in ns_list if ns in checkpoint["completed_namespaces"]]
        ns_list = [ns for ns in ns_list if ns not in checkpoint["completed_namespaces"]]
        if skipped:
            print(f"\n  Resuming: skipping {len(skipped)} completed namespaces: {skipped}")

    print(f"\n  Namespaces to migrate: {len(ns_list)}")
    for ns in ns_list:
        count = namespaces.get(ns, {}).get("vectorCount",
                namespaces.get(ns, {}).get("recordCount", "?"))
        print(f"    {ns or '(default)'}: {count} vectors")

    # Migrate each namespace
    grand_total = 0
    grand_tokens = 0
    completed = list(checkpoint.get("completed_namespaces", []))
    start_time = time.time()

    for ns in ns_list:
        # Check token budget
        if grand_tokens >= args.token_limit and not args.dry_run:
            print(f"\n  TOKEN LIMIT REACHED ({grand_tokens:,} >= {args.token_limit:,})")
            print(f"  Saving checkpoint for resume...")
            save_checkpoint(completed, partial_ns=ns, partial_offset=0)
            break

        try:
            offset = 0
            if args.resume and checkpoint.get("partial_namespace") == ns:
                offset = checkpoint.get("partial_offset", 0)
                print(f"  Resuming {ns} from offset {offset}")

            count, tokens = migrate_namespace(ns, dry_run=args.dry_run, start_offset=offset)
            grand_total += count
            grand_tokens += tokens
            completed.append(ns)
            save_checkpoint(completed)
        except Exception as e:
            print(f"    ERROR migrating {ns}: {e}")
            save_checkpoint(completed, partial_ns=ns)
            continue

    elapsed = time.time() - start_time

    print("\n" + "=" * 70)
    print(f"  MIGRATION {'PREVIEW' if args.dry_run else 'COMPLETE'}")
    print(f"  Total vectors migrated: {grand_total}")
    print(f"  Total tokens used: {grand_tokens:,}")
    print(f"  Time elapsed: {elapsed:.1f}s")
    print(f"  Namespaces completed: {len(completed)}/{len(ns_list) + len(checkpoint.get('completed_namespaces', []))}")
    print("=" * 70)

    if not args.dry_run and grand_total > 0:
        print("\n  Verifying target index...")
        target_stats = pinecone_request(TARGET_HOST, "/describe_index_stats",
                                        data={}, method="POST")
        print(f"  Target: {target_stats.get('totalVectorCount', 0)} vectors, "
              f"{target_stats.get('dimension', '?')}d")

    # Clean up checkpoint if fully done
    remaining = [ns for ns in ns_list if ns not in completed]
    if not remaining and CHECKPOINT_FILE.exists():
        CHECKPOINT_FILE.unlink()
        print("  Checkpoint cleaned up (migration complete)")


if __name__ == "__main__":
    main()
