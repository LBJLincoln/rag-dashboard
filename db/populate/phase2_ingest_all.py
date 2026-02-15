#!/usr/bin/env python3
"""
Phase 2 Complete Ingestion: Supabase benchmark_datasets + Pinecone embeddings.

1. Load 1000 questions from hf-1000.json
2. Insert into Supabase benchmark_datasets (musique, 2wikimultihopqa, finqa, tatqa, convfinqa, wikitablequestions)
3. Embed graph question contexts using Cohere embed-english-v3.0 (1024-dim)
4. Upsert to Pinecone sota-rag-cohere-1024 (namespaces: benchmark-musique, benchmark-2wikimultihopqa)

Usage:
    python3 db/populate/phase2_ingest_all.py                    # Full run
    python3 db/populate/phase2_ingest_all.py --skip-supabase    # Skip Supabase insert
    python3 db/populate/phase2_ingest_all.py --skip-pinecone    # Skip Pinecone embed
    python3 db/populate/phase2_ingest_all.py --dry-run          # Preview only
"""
import json
import os
import sys
import time
import ssl
from datetime import datetime, timezone
from urllib import request, error

# ============================================================
# Configuration
# ============================================================
COHERE_API_KEY = os.environ.get("COHERE_API_KEY", "")
PINECONE_API_KEY = os.environ.get("PINECONE_API_KEY", "")
PINECONE_HOST = "https://sota-rag-cohere-1024-a4mkzmz.svc.aped-4627-b74a.pinecone.io"
SUPABASE_PASSWORD = os.environ.get("SUPABASE_PASSWORD", "")

DATASET_FILE = os.path.join(os.path.dirname(__file__), "..", "..", "datasets", "phase-2", "hf-1000.json")

COHERE_EMBED_URL = "https://api.cohere.com/v1/embed"
COHERE_MODEL = "embed-english-v3.0"
COHERE_DIM = 1024
COHERE_BATCH_SIZE = 96  # Cohere max per request
PINECONE_BATCH_SIZE = 100

# SSL context for self-signed certs
ssl_ctx = ssl.create_default_context()
ssl_ctx.check_hostname = False
ssl_ctx.verify_peer = False


# ============================================================
# Helpers
# ============================================================

def cohere_embed(texts, input_type="search_document"):
    """Generate Cohere embeddings."""
    body = json.dumps({
        "texts": texts,
        "model": COHERE_MODEL,
        "input_type": input_type,
        "truncate": "END"
    }).encode()
    req = request.Request(COHERE_EMBED_URL, data=body, method="POST", headers={
        "Authorization": f"Bearer {COHERE_API_KEY}",
        "Content-Type": "application/json"
    })
    for attempt in range(3):
        try:
            with request.urlopen(req, timeout=60, context=ssl_ctx) as resp:
                result = json.loads(resp.read())
                return result.get("embeddings", [])
        except Exception as e:
            if attempt < 2:
                time.sleep(2 ** attempt)
                continue
            print(f"  ERROR embedding: {e}")
            return None


def pinecone_upsert(vectors, namespace):
    """Upsert vectors to Pinecone."""
    url = f"{PINECONE_HOST}/vectors/upsert"
    body = json.dumps({"vectors": vectors, "namespace": namespace}).encode()
    req = request.Request(url, data=body, method="POST", headers={
        "Api-Key": PINECONE_API_KEY,
        "Content-Type": "application/json"
    })
    for attempt in range(3):
        try:
            with request.urlopen(req, timeout=30, context=ssl_ctx) as resp:
                return json.loads(resp.read())
        except Exception as e:
            if attempt < 2:
                time.sleep(2 ** attempt)
                continue
            print(f"  ERROR upserting: {e}")
            return None


def supabase_insert_batch(rows):
    """Insert rows into benchmark_datasets via Supabase REST API."""
    import psycopg2
    conn_str = f"postgresql://postgres.ayqviqmxifzmhphiqfmj:{SUPABASE_PASSWORD}@aws-1-eu-west-1.pooler.supabase.com:6543/postgres"
    conn = psycopg2.connect(conn_str, sslmode="require")
    cur = conn.cursor()

    insert_sql = """
        INSERT INTO benchmark_datasets
            (dataset_name, category, split, item_index, question, expected_answer, context, supporting_facts, metadata, tenant_id, ingested_at, batch_id)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT DO NOTHING
    """

    now = datetime.now(timezone.utc).isoformat()
    batch_id = f"phase2-ingest-{datetime.now().strftime('%Y%m%dT%H%M%S')}"

    count = 0
    for row in rows:
        try:
            cur.execute(insert_sql, (
                row.get("dataset_name", ""),
                row.get("category", ""),
                row.get("split", ""),
                row.get("item_index", 0),
                row.get("question", ""),
                row.get("expected_answer", ""),
                row.get("context", ""),
                json.dumps(row.get("supporting_facts")) if row.get("supporting_facts") else None,
                json.dumps(row.get("metadata")) if row.get("metadata") else None,
                row.get("tenant_id", "benchmark"),
                now,
                batch_id
            ))
            count += 1
        except Exception as e:
            print(f"  Row error: {e}")
            conn.rollback()
            continue

    conn.commit()
    cur.close()
    conn.close()
    return count


# ============================================================
# Main
# ============================================================
def main():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--skip-supabase", action="store_true")
    parser.add_argument("--skip-pinecone", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--limit", type=int, default=0)
    args = parser.parse_args()

    print("=" * 70)
    print("PHASE 2 COMPLETE INGESTION")
    print(f"Time: {datetime.now().isoformat()}")
    print(f"Supabase: {'SKIP' if args.skip_supabase else 'ON'}")
    print(f"Pinecone: {'SKIP' if args.skip_pinecone else 'ON'}")
    print(f"Dry run: {args.dry_run}")
    print("=" * 70)

    # 1. Load questions
    print("\n1. Loading hf-1000.json...")
    with open(DATASET_FILE) as f:
        data = json.load(f)
    questions = data.get("questions", [])
    print(f"   Total questions: {len(questions)}")

    graph_qs = [q for q in questions if q.get("rag_target") == "graph"]
    quant_qs = [q for q in questions if q.get("rag_target") == "quantitative"]
    print(f"   Graph: {len(graph_qs)}, Quantitative: {len(quant_qs)}")

    if args.limit:
        questions = questions[:args.limit]
        graph_qs = [q for q in questions if q.get("rag_target") == "graph"]
        print(f"   Limited to {args.limit} questions ({len(graph_qs)} graph)")

    # 2. Supabase benchmark_datasets
    if not args.skip_supabase:
        print(f"\n2. Inserting {len(questions)} questions into Supabase benchmark_datasets...")
        if args.dry_run:
            print(f"   [DRY RUN] Would insert {len(questions)} rows")
        else:
            try:
                count = supabase_insert_batch(questions)
                print(f"   Inserted: {count} rows")
            except Exception as e:
                print(f"   ERROR: {e}")
                print("   Continuing with Pinecone...")
    else:
        print("\n2. Skipping Supabase insertion")

    # 3. Pinecone: embed graph question passages
    if not args.skip_pinecone:
        print(f"\n3. Embedding graph passages for Pinecone...")

        # Extract passages from graph questions
        passages_by_ns = {}  # namespace -> [(id, text, metadata)]

        for q in graph_qs:
            ds = q.get("dataset_name", "unknown")
            ns = f"benchmark-{ds}"
            if ns not in passages_by_ns:
                passages_by_ns[ns] = []

            # Parse context (JSON string of passages)
            context = q.get("context", "")
            if not context:
                continue

            try:
                if isinstance(context, str):
                    passages = json.loads(context)
                else:
                    passages = context
            except (json.JSONDecodeError, TypeError):
                # Plain text context
                passages = [{"title": q["id"], "paragraph_text": context, "is_supporting": True}]

            if not isinstance(passages, list):
                continue

            # Only embed supporting passages + a sample of non-supporting
            for i, p in enumerate(passages):
                if not isinstance(p, dict):
                    continue
                title = p.get("title", "")
                text = p.get("paragraph_text", "")
                if not text or len(text) < 20:
                    continue

                is_supporting = p.get("is_supporting", False)

                # Embed all supporting + first 5 non-supporting per question
                if is_supporting or i < 5:
                    vec_id = f"p2-{q['id']}-p{i}"
                    full_text = f"{title}\n\n{text}" if title else text
                    passages_by_ns[ns].append((vec_id, full_text, {
                        "question_id": q["id"],
                        "passage_idx": i,
                        "is_supporting": is_supporting,
                        "title": title[:200],
                        "dataset_name": ds,
                        "tenant_id": "benchmark"
                    }))

        total_passages = sum(len(v) for v in passages_by_ns.values())
        print(f"   Namespaces: {list(passages_by_ns.keys())}")
        print(f"   Total passages to embed: {total_passages}")

        if args.dry_run:
            for ns, items in passages_by_ns.items():
                print(f"   [DRY RUN] {ns}: {len(items)} passages")
        else:
            for ns, items in passages_by_ns.items():
                print(f"\n   Namespace: {ns} ({len(items)} passages)")

                # Batch embed + upsert
                embedded = 0
                for batch_start in range(0, len(items), COHERE_BATCH_SIZE):
                    batch = items[batch_start:batch_start + COHERE_BATCH_SIZE]
                    texts = [item[1][:2000] for item in batch]  # Truncate to 2000 chars

                    embeddings = cohere_embed(texts)
                    if not embeddings:
                        print(f"     Embedding failed at batch {batch_start}")
                        continue

                    # Prepare Pinecone vectors
                    vectors = []
                    for j, (vec_id, text, meta) in enumerate(batch):
                        if j < len(embeddings):
                            vectors.append({
                                "id": vec_id,
                                "values": embeddings[j],
                                "metadata": meta
                            })

                    # Upsert in Pinecone batches
                    for pc_start in range(0, len(vectors), PINECONE_BATCH_SIZE):
                        pc_batch = vectors[pc_start:pc_start + PINECONE_BATCH_SIZE]
                        result = pinecone_upsert(pc_batch, ns)
                        if result:
                            embedded += len(pc_batch)

                    # Rate limit: Cohere trial tier = 10 req/min
                    time.sleep(7)

                    if (batch_start // COHERE_BATCH_SIZE) % 5 == 0:
                        print(f"     Embedded {embedded}/{len(items)}...")

                print(f"   {ns}: {embedded} passages embedded and upserted")
    else:
        print("\n3. Skipping Pinecone embedding")

    print(f"\n{'=' * 70}")
    print("PHASE 2 INGESTION COMPLETE")
    print(f"{'=' * 70}")


if __name__ == "__main__":
    main()
