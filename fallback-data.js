/**
 * Fallback status data for offline/error scenarios.
 * Used when the live status.json fetch fails.
 * Updated: 2026-03-08
 */
const FALLBACK_STATUS = {
    "generated_at": "2026-03-08T15:30:00+01:00",
    "phase": { "current": 4, "name": "SOTA Benchmark (61K questions)", "gates_passed": true },
    "pipelines": {
        "standard": { "accuracy": 87.5, "tested": 10917, "correct": 9553, "errors": 218, "target": 85.0, "met": true, "gap": 2.5, "latency_ms": 36000, "latency_p95_ms": 52000, "phase3_accuracy": 87.5, "phase4_accuracy": 13.0, "phase4_tested": 10917, "phase4_status": "DONE" },
        "graph": { "accuracy": 40.9, "tested": 11300, "correct": 4622, "errors": 565, "target": 70.0, "met": false, "gap": -29.1, "latency_ms": 39000, "latency_p95_ms": 58000, "phase3_accuracy": 40.9, "phase4_accuracy": 7.0, "phase4_tested": 11300, "phase4_status": "DONE" },
        "quantitative": { "accuracy": 95.2, "tested": 3550, "correct": 3380, "errors": 35, "target": 85.0, "met": true, "gap": 10.2, "latency_ms": 43000, "latency_p95_ms": 65000, "phase3_accuracy": 95.2, "phase4_accuracy": 14.0, "phase4_tested": 3550, "phase4_status": "91.7% ingested" },
        "orchestrator": { "accuracy": 0, "tested": 0, "correct": 0, "errors": 0, "target": 70.0, "met": false, "gap": -70.0, "latency_ms": 0, "latency_p95_ms": 0, "phase3_accuracy": 80.0, "phase4_accuracy": 0, "phase4_tested": 0, "phase4_status": "ON HOLD" }
    },
    "infrastructure": {
        "hf_spaces": {
            "n8n_primary": { "name": "nomos-rag-engine", "status": "UP" },
            "n8n_space_2": { "name": "nomos-rag-engine-2", "status": "UP" },
            "n8n_space_3": { "name": "nomos-rag-engine-3", "status": "UP" },
            "n8n_space_4": { "name": "nomos-rag-engine-4", "status": "UP" },
            "litellm": { "name": "nomos-rag-engine-7", "status": "UP", "type": "LiteLLM Proxy" },
            "embeddings": { "name": "nomos-embeddings-api", "status": "UP", "type": "Embeddings" }
        },
        "databases": {
            "pinecone": { "sota_index": { "name": "sota-rag-jina-1024", "vectors": 46263, "limit": 100000 }, "website_index": { "name": "website-sectors-jina-1024", "vectors": 31916, "limit": 100000 }, "total_vectors": 78179 },
            "neo4j": { "nodes": 79451, "relationships": 219414, "limit_nodes": 200000, "limit_rels": 400000 },
            "supabase": { "tables": 40, "sector_documents": 11387, "financial_tables": 3876, "limit_mb": 500 }
        }
    },
    "overall": { "accuracy": 74.5, "target": 75.0, "met": false },
    "blockers": ["Graph pipeline 40.9% < 70.0% target (gap: -29.1pp)", "Orchestrator ON HOLD (404 webhook)"],
    "totals": { "unique_questions": 61661, "test_runs": 25767, "iterations": 87 }
};
