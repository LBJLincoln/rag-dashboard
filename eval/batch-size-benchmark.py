#!/usr/bin/env python3
"""
BATCH SIZE BENCHMARK — Find optimal parallel batch size per pipeline.
====================================================================
Tests increasing batch sizes (1, 3, 5, 10, 15, 20) and measures:
- Throughput (questions/minute)
- Error rate (429, timeout, 5xx)
- Latency distribution (p50, p95)
- Whether accuracy degrades under load

Usage:
  source .env.local
  python3 eval/batch-size-benchmark.py --pipeline standard --n8n-host https://lbjlincoln-nomos-rag-engine.hf.space
  python3 eval/batch-size-benchmark.py --pipeline all --max-batch 20

Last updated: 2026-02-22
"""

import argparse
import json
import os
import sys
import time
import urllib.request
import urllib.error
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone, timedelta

PARIS_TZ = timezone(timedelta(hours=1))

# Test questions per pipeline (known-good, diverse)
TEST_QUESTIONS = {
    "standard": [
        "What is the capital of France?",
        "Who invented the telephone?",
        "What is photosynthesis?",
        "When was the United Nations founded?",
        "What is the speed of light?",
        "Who wrote Romeo and Juliet?",
        "What is the largest ocean?",
        "What causes earthquakes?",
        "Who painted the Mona Lisa?",
        "What is the chemical formula for water?",
        "What is DNA?",
        "Who discovered penicillin?",
        "What is the tallest mountain?",
        "What is democracy?",
        "How does a battery work?",
        "What is the theory of relativity?",
        "Who was the first person on the moon?",
        "What is inflation in economics?",
        "What are black holes?",
        "What is artificial intelligence?",
    ],
    "graph": [
        "Who founded Microsoft?",
        "What companies did Elon Musk create?",
        "Who are the key figures in quantum computing?",
        "What is the relationship between Apple and Steve Jobs?",
        "Who invented the World Wide Web?",
        "What organizations does Bill Gates support?",
        "Who discovered the structure of DNA?",
        "What is the connection between Einstein and the atomic bomb?",
        "Who are the founders of Google?",
        "What companies are part of the FAANG group?",
        "Who is the CEO of Tesla?",
        "What awards did Marie Curie receive?",
        "Who founded Amazon?",
        "What is the relationship between OpenAI and Microsoft?",
        "Who created Linux?",
        "What companies compete with Netflix?",
        "Who invented the transistor?",
        "What is the connection between Harvard and Facebook?",
        "Who are the Nobel Prize winners in physics 2023?",
        "What startups did Peter Thiel invest in?",
    ],
    "quantitative": [
        "What was Apple's revenue in 2023?",
        "What is the GDP of the United States?",
        "How many employees does Google have?",
        "What is the market cap of Microsoft?",
        "What was Tesla's net income in 2022?",
        "How much did Amazon spend on R&D?",
        "What is the population of China?",
        "What was the S&P 500 return in 2023?",
        "How many iPhones did Apple sell?",
        "What is the unemployment rate in the US?",
        "What was Netflix's subscriber count?",
        "How much debt does the US government have?",
        "What is the inflation rate in Europe?",
        "How many cars did Toyota produce?",
        "What was Meta's advertising revenue?",
        "What is the price of gold per ounce?",
        "How many users does WhatsApp have?",
        "What was Nvidia's GPU revenue?",
        "What is the average house price in the US?",
        "How much did SpaceX raise in funding?",
    ],
    "orchestrator": [
        "What is the capital of Japan?",
        "How much revenue did Apple make?",
        "Who founded Tesla and what companies are related?",
        "What is the GDP of Germany?",
        "Explain quantum computing",
        "Who are the main competitors of Google?",
        "What was Amazon's profit in 2023?",
        "How does machine learning work?",
        "Who invented the internet?",
        "What is the market cap of the top 5 tech companies?",
        "What is climate change?",
        "Who won the Nobel Prize in Economics?",
        "How many employees does Microsoft have?",
        "What is blockchain technology?",
        "Who are the richest people in the world?",
        "What was the inflation rate last year?",
        "How does a neural network work?",
        "What companies are in the S&P 500?",
        "Who is the president of France?",
        "What is the total US national debt?",
    ],
}

WEBHOOK_PATHS = {
    "standard": "rag-multi-index-v3",
    "graph": "ff622742-6d71-4e91-af71-b5c666088717",
    "quantitative": "3e0f8010-39e0-4bca-9d19-35e5094391a9",
    "orchestrator": "92217bb8-ffc8-459a-8331-3f553812c3d0",
    "pme-gateway": "pme-assistant-gateway",
    "pme-action": "pme-action-executor",
    "pme-whatsapp": "whatsapp-incoming",
}

# PME test questions
TEST_QUESTIONS["pme-gateway"] = [
    "Envoie un email a contact@example.com pour confirmer le rendez-vous",
    "Planifie une reunion demain a 14h avec l'equipe technique",
    "Recherche les documents du projet Alpha dans le drive",
    "Quel est le dernier message recu sur Telegram?",
    "Cree un rappel pour la facture client ABC",
    "Resume les emails non lus de cette semaine",
    "Envoie un message WhatsApp a Jean pour confirmer la livraison",
    "Ajoute une tache 'Revue code' dans Trello pour lundi",
    "Quels sont les prochains evenements dans mon calendrier?",
    "Trouve le contrat du fournisseur XYZ dans Google Drive",
    "Envoie une notification Slack a l'equipe marketing",
    "Cree un devis pour le client 12345",
    "Quel est le statut de la commande 67890?",
    "Planifie un appel avec le service juridique vendredi 10h",
    "Synchronise les contacts CRM avec la liste de diffusion",
    "Genere un rapport des ventes du mois dernier",
    "Archive les conversations Telegram de plus de 30 jours",
    "Mets a jour le statut du ticket support #4521",
    "Envoie le catalogue produits par email au prospect",
    "Quels documents ont ete modifies cette semaine?",
]

TEST_QUESTIONS["pme-action"] = [
    "Cree un evenement Google Calendar: reunion projet demain 15h",
    "Envoie un email via Gmail a support@client.com sujet: Mise a jour",
    "Liste les fichiers dans le dossier Projets sur Google Drive",
    "Ajoute un contact dans HubSpot: Pierre Martin, PME Tech",
    "Genere une facture Stripe pour 500 EUR",
    "Cree une transaction QuickBooks: achat fournitures 150 EUR",
    "Ajoute une carte Trello: Deploiement v2.0 dans la colonne En cours",
    "Envoie un message Telegram a l'equipe: Deploiement termine",
    "Partage le document budget.xlsx via Google Drive avec l'equipe",
    "Planifie un rappel Notion pour la revue mensuelle",
    "Synchronise les donnees Salesforce avec le dashboard",
    "Archive les emails de plus de 6 mois dans Gmail",
    "Cree un webhook Slack pour les notifications de deploiement",
    "Telecharge le rapport financier depuis OneDrive",
    "Mets a jour le pipeline CRM pour le deal Alpha Corp",
    "Envoie une invitation Google Calendar a toute l'equipe",
    "Verifie le solde du compte Stripe",
    "Genere un resume des taches Trello completees cette semaine",
    "Configure un filtre Gmail pour les emails du fournisseur",
    "Cree un nouveau projet dans Notion avec template PME",
]

TEST_QUESTIONS["pme-whatsapp"] = [
    "Bonjour, je voudrais des informations sur vos services",
    "Quel est le prix de votre offre PME?",
    "Je souhaite prendre rendez-vous avec un commercial",
    "Pouvez-vous m'envoyer votre catalogue?",
    "Mon numero de commande est 12345, ou en est la livraison?",
    "Je voudrais modifier mon abonnement",
    "Quels sont vos horaires d'ouverture?",
    "J'ai un probleme avec ma derniere facture",
    "Pouvez-vous me rappeler demain matin?",
    "Je cherche un connecteur pour Salesforce",
    "Comment integrer votre solution avec notre CRM?",
    "Envoyez-moi les conditions generales de vente",
    "Je souhaite annuler ma commande",
    "Quelles sont les nouveautes de votre derniere mise a jour?",
    "Pouvez-vous me transferer au service technique?",
    "Je voudrais un devis personnalise pour 50 utilisateurs",
    "Comment fonctionne l'integration WhatsApp?",
    "Mon compte est bloque, pouvez-vous m'aider?",
    "Quels moyens de paiement acceptez-vous?",
    "Je souhaite planifier une demo de votre produit",
]


def call_webhook(n8n_host, path, question, timeout=120):
    """Call n8n webhook and return (latency_ms, success, error)."""
    url = f"{n8n_host}/webhook/{path}"
    data = json.dumps({"query": question}).encode()
    req = urllib.request.Request(url, data=data, method="POST",
                                 headers={"Content-Type": "application/json"})
    start = time.time()
    try:
        resp = urllib.request.urlopen(req, timeout=timeout)
        body = resp.read().decode()
        latency = int((time.time() - start) * 1000)
        has_answer = len(body) > 20 and "Unable to generate" not in body
        return latency, True, None, has_answer
    except urllib.error.HTTPError as e:
        latency = int((time.time() - start) * 1000)
        error_type = f"HTTP_{e.code}"
        if e.code == 429:
            error_type = "RATE_LIMIT_429"
        return latency, False, error_type, False
    except Exception as e:
        latency = int((time.time() - start) * 1000)
        error_str = str(e)
        if "timed out" in error_str.lower():
            error_type = "TIMEOUT"
        elif "ECONNABORTED" in error_str:
            error_type = "CONN_ABORTED"
        else:
            error_type = f"ERROR:{error_str[:50]}"
        return latency, False, error_type, False


def benchmark_batch(n8n_host, pipeline, batch_size, questions):
    """Run a batch of questions in parallel and measure results."""
    path = WEBHOOK_PATHS[pipeline]
    batch = questions[:batch_size]

    results = []
    start = time.time()

    with ThreadPoolExecutor(max_workers=batch_size) as pool:
        futures = {}
        for i, q in enumerate(batch):
            future = pool.submit(call_webhook, n8n_host, path, q)
            futures[future] = i

        for future in as_completed(futures):
            idx = futures[future]
            latency, success, error, has_answer = future.result()
            results.append({
                "index": idx,
                "latency_ms": latency,
                "success": success,
                "error": error,
                "has_answer": has_answer,
            })

    wall_time = time.time() - start

    # Compute stats
    latencies = [r["latency_ms"] for r in results]
    successes = sum(1 for r in results if r["success"])
    errors = [r["error"] for r in results if r["error"]]
    answers = sum(1 for r in results if r["has_answer"])

    latencies.sort()
    p50 = latencies[len(latencies) // 2] if latencies else 0
    p95 = latencies[int(len(latencies) * 0.95)] if latencies else 0

    return {
        "batch_size": batch_size,
        "wall_time_s": round(wall_time, 1),
        "throughput_qpm": round(len(batch) / wall_time * 60, 1) if wall_time > 0 else 0,
        "success_rate": round(successes / len(batch) * 100, 1),
        "answer_rate": round(answers / len(batch) * 100, 1),
        "p50_ms": p50,
        "p95_ms": p95,
        "errors": errors,
        "total": len(batch),
        "successes": successes,
    }


def benchmark_concurrent(n8n_host, pipelines, questions_per_pipeline, batch_size_per_pipeline):
    """Run N pipelines simultaneously, each sending batch_size questions in parallel.
    This tests the REAL concurrent load: e.g. 4 pipelines × 3 batch = 12 simultaneous requests."""

    total_concurrent = len(pipelines) * batch_size_per_pipeline
    print(f"\n  CONCURRENT TEST: {len(pipelines)} pipelines × {batch_size_per_pipeline} batch "
          f"= {total_concurrent} simultaneous requests")

    results_by_pipeline = {}
    start = time.time()

    with ThreadPoolExecutor(max_workers=len(pipelines)) as pool:
        futures = {}
        for pipeline in pipelines:
            questions = TEST_QUESTIONS.get(pipeline, TEST_QUESTIONS["standard"])
            future = pool.submit(
                benchmark_batch, n8n_host, pipeline, batch_size_per_pipeline, questions
            )
            futures[future] = pipeline

        for future in as_completed(futures):
            pipeline = futures[future]
            result = future.result()
            results_by_pipeline[pipeline] = result

    wall_time = time.time() - start

    # Aggregate stats
    total_success = sum(r["successes"] for r in results_by_pipeline.values())
    total_q = sum(r["total"] for r in results_by_pipeline.values())
    total_errors = sum(len(r["errors"]) for r in results_by_pipeline.values())
    all_latencies = []
    for r in results_by_pipeline.values():
        all_latencies.extend([r["p50_ms"]])  # approximate

    print(f"\n  CONCURRENT RESULT ({total_concurrent} simultaneous):")
    print(f"    Wall time: {round(wall_time, 1)}s")
    print(f"    Total questions: {total_q}")
    print(f"    Total successes: {total_success} ({round(total_success/total_q*100,1) if total_q else 0}%)")
    print(f"    Total errors: {total_errors}")
    print(f"    Aggregate throughput: {round(total_q / wall_time * 60, 1)} q/min")

    for pipeline, r in results_by_pipeline.items():
        status = "OK" if r["success_rate"] >= 80 else "DEGRADED" if r["success_rate"] >= 50 else "FAILED"
        print(f"    {pipeline}: {r['success_rate']}% success, p50={r['p50_ms']}ms [{status}]")

    return {
        "concurrent_workflows": total_concurrent,
        "pipelines": len(pipelines),
        "batch_per_pipeline": batch_size_per_pipeline,
        "wall_time_s": round(wall_time, 1),
        "aggregate_throughput_qpm": round(total_q / wall_time * 60, 1) if wall_time > 0 else 0,
        "total_questions": total_q,
        "total_successes": total_success,
        "overall_success_rate": round(total_success / total_q * 100, 1) if total_q else 0,
        "per_pipeline": {p: {
            "success_rate": r["success_rate"],
            "p50_ms": r["p50_ms"],
            "throughput_qpm": r["throughput_qpm"],
            "errors": r["errors"],
        } for p, r in results_by_pipeline.items()},
    }


def main():
    parser = argparse.ArgumentParser(description="Batch Size Benchmark (per-pipeline + concurrent)")
    parser.add_argument("--pipeline", type=str, default="standard",
                        help="Pipeline to benchmark (standard, graph, quantitative, orchestrator, "
                             "pme-gateway, pme-action, pme-whatsapp, all)")
    parser.add_argument("--n8n-host", type=str,
                        default=os.environ.get("N8N_HOST", "https://lbjlincoln-nomos-rag-engine.hf.space"),
                        help="n8n host URL")
    parser.add_argument("--batch-sizes", type=str, default="1,3,5,10,15,20",
                        help="Comma-separated batch sizes to test")
    parser.add_argument("--pause", type=int, default=30,
                        help="Pause seconds between batch tests (let n8n recover)")
    parser.add_argument("--max-batch", type=int, default=20,
                        help="Max batch size to test")
    parser.add_argument("--concurrent", action="store_true",
                        help="Run CONCURRENT benchmark: all pipelines simultaneously with increasing batch sizes. "
                             "Tests real parallel load (e.g. 4 pipelines × 3 = 12 workflows).")
    parser.add_argument("--concurrent-pipelines", type=str, default="standard,graph,quantitative,orchestrator",
                        help="Pipelines to use in concurrent mode")
    parser.add_argument("--concurrent-batches", type=str, default="1,2,3,4,5",
                        help="Batch sizes per pipeline in concurrent mode (total = pipelines × batch)")
    args = parser.parse_args()

    pipelines = list(WEBHOOK_PATHS.keys()) if args.pipeline == "all" else [args.pipeline]
    batch_sizes = [int(b) for b in args.batch_sizes.split(",") if int(b) <= args.max_batch]

    print("=" * 70)
    print("  BATCH SIZE BENCHMARK")
    print(f"  Host: {args.n8n_host}")
    print(f"  Pipelines: {', '.join(pipelines)}")
    if args.concurrent:
        print(f"  Mode: CONCURRENT (multi-pipeline simultaneous)")
    else:
        print(f"  Mode: per-pipeline sequential")
        print(f"  Batch sizes: {batch_sizes}")
    print(f"  Pause between tests: {args.pause}s")
    print("=" * 70)

    all_results = {}

    if args.concurrent:
        # CONCURRENT MODE: test all pipelines simultaneously with increasing batch
        concurrent_pipelines = [p.strip() for p in args.concurrent_pipelines.split(",")]
        concurrent_batches = [int(b) for b in args.concurrent_batches.split(",")]
        concurrent_results = []

        for batch_per in concurrent_batches:
            total = len(concurrent_pipelines) * batch_per
            print(f"\n{'='*50}")
            print(f"  CONCURRENT: {len(concurrent_pipelines)} pipelines × {batch_per} = {total} simultaneous")
            print(f"{'='*50}")

            result = benchmark_concurrent(
                args.n8n_host, concurrent_pipelines,
                TEST_QUESTIONS, batch_per
            )
            concurrent_results.append(result)

            if result["overall_success_rate"] < 50:
                print(f"  STOPPING: Overall success rate {result['overall_success_rate']}% < 50%")
                break

            if batch_per != concurrent_batches[-1]:
                print(f"  Pausing {args.pause}s...", flush=True)
                time.sleep(args.pause)

        all_results["concurrent"] = concurrent_results

        # Summary
        print("\n" + "=" * 70)
        print("  SUMMARY — Concurrent Capacity")
        print("=" * 70)
        for r in concurrent_results:
            status = "OK" if r["overall_success_rate"] >= 80 else "DEGRADED"
            print(f"  {r['concurrent_workflows']} concurrent: "
                  f"{r['aggregate_throughput_qpm']} q/min, "
                  f"{r['overall_success_rate']}% success [{status}]")

        if concurrent_results:
            best = max(concurrent_results,
                       key=lambda r: r["aggregate_throughput_qpm"] if r["overall_success_rate"] >= 80 else 0)
            print(f"\n  OPTIMAL: {best['concurrent_workflows']} concurrent workflows")
            print(f"    ({best['pipelines']} pipelines × {best['batch_per_pipeline']} batch)")
            print(f"    Throughput: {best['aggregate_throughput_qpm']} q/min")
            print(f"    Success: {best['overall_success_rate']}%")

    else:
        # PER-PIPELINE MODE (original)
        for pipeline in pipelines:
            print(f"\n{'='*50}")
            print(f"  PIPELINE: {pipeline.upper()}")
            print(f"{'='*50}")

            questions = TEST_QUESTIONS.get(pipeline, TEST_QUESTIONS["standard"])
            pipeline_results = []

            for batch_size in batch_sizes:
                if batch_size > len(questions):
                    break

                print(f"\n  Testing batch_size={batch_size}...", end="", flush=True)
                result = benchmark_batch(args.n8n_host, pipeline, batch_size, questions)
                pipeline_results.append(result)

                print(f" done in {result['wall_time_s']}s")
                print(f"    Throughput: {result['throughput_qpm']} q/min")
                print(f"    Success: {result['success_rate']}% ({result['successes']}/{result['total']})")
                print(f"    Answers: {result['answer_rate']}%")
                print(f"    Latency: p50={result['p50_ms']}ms p95={result['p95_ms']}ms")
                if result["errors"]:
                    error_counts = {}
                    for e in result["errors"]:
                        error_counts[e] = error_counts.get(e, 0) + 1
                    print(f"    Errors: {error_counts}")

                # Stop if error rate > 50%
                if result["success_rate"] < 50:
                    print(f"    STOPPING: Error rate too high ({100 - result['success_rate']}%)")
                    break

                # Pause between tests
                if batch_size != batch_sizes[-1]:
                    print(f"    Pausing {args.pause}s...", flush=True)
                    time.sleep(args.pause)

            all_results[pipeline] = pipeline_results

        # Summary
        print("\n" + "=" * 70)
        print("  SUMMARY — Optimal Batch Sizes")
        print("=" * 70)

        for pipeline, results in all_results.items():
            if not results:
                continue
            best = max(results, key=lambda r: r["throughput_qpm"] if r["success_rate"] >= 80 else 0)
            print(f"\n  {pipeline.upper()}:")
            print(f"    Optimal batch size: {best['batch_size']}")
            print(f"    Throughput: {best['throughput_qpm']} q/min")
            print(f"    Success rate: {best['success_rate']}%")
            print(f"    Latency p50/p95: {best['p50_ms']}ms / {best['p95_ms']}ms")

    # Save results
    output = {
        "timestamp": datetime.now(PARIS_TZ).isoformat(),
        "n8n_host": args.n8n_host,
        "results": all_results,
    }
    output_path = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                "..", "logs", "batch-size-benchmark.json")
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w") as f:
        json.dump(output, f, indent=2)
    print(f"\n  Results saved: {output_path}")


if __name__ == "__main__":
    main()
