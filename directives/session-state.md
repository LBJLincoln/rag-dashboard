# Session State — 17 Fevrier 2026 (Session 10)

## Objectif de session
Audit complet infrastructure + liberation VM + activation workflows + refonte dashboard multi-source

## Taches completees cette session

### Phase A — Audit Infrastructure
- Audit complet des 5 repos (tous synchro a 3b98e56)
- Audit VM : RAM 969MB, 3 containers Docker, n8n + PG + Redis
- Audit n8n : 14 workflows, tous actifs — identification des 3 a desactiver
- Audit Codespaces : 3 devcontainer configs (rag-tests, rag-data-ingestion, rag-website)
- Audit ports : 5678 (n8n), 5432 (PG), 6379 (Redis), 8080 (status server)

### Phase B — Liberation VM
- Killed Next.js process (74MB liberes) — NE DOIT PAS tourner sur VM (Vercel)
- Supprime image Docker redis:alpine inutilisee (97MB disque)
- Desactive 3 workflows d'ingestion sur VM (Ingestion V3.1, Enrichissement V3.1, Dataset Ingestion)
- Applique Docker memory limits : n8n 600m, PG 128m, Redis 96m
- Applique optimisations n8n : pruning (48h, 500 max), save on success=none, concurrency=2
- Reduit Redis maxmemory 256m → 64m
- NODE_OPTIONS=--max-old-space-size=512

### Phase C — Dashboard multi-source
- API route dashboard refondee pour aggreger 3 sources (mon-ipad, rag-website, rag-data-ingestion)
- STATUS_API_URL pointe vers port 8080 (Python HTTP server) au lieu de webhook n8n
- SSE stream route mise a jour (poll 10s au lieu de 5s pour economiser resources)
- Nouveau composant DataSources.tsx — visualise l'etat des 3 sources de donnees
- Dashboard page mise a jour avec DataSources + lastIteration + polling 15s

## Decisions prises
- VM = 11 workflows actifs (4 pipelines RAG + benchmarks + dashboard + feedback)
- Codespace rag-data-ingestion = ingestion + enrichissement (instance n8n separee)
- Codespace rag-tests = 2 workers connectes au Redis/PG de la VM
- Status server = Python HTTP sur port 8080 (pas n8n webhook pour alleger la charge)
- Dashboard diff 3 sources : mon-ipad (benchmarks), rag-website (sectoriels), rag-data-ingestion (ingestion)

## Etat des workflows (VM)
| Workflow | ID | Active |
|----------|-----|--------|
| Orchestrator V10.1 | aGsYnJY9nNCaTM82 | ON |
| Standard RAG V3.4 | TmgyRP20N4JFd9CB | ON |
| Graph RAG V3.3 | 6257AfT1l4FMC6lY | ON |
| Quantitative V2.0 | e465W7V9Q8uK6zJE | ON |
| Dashboard Status API | KcfzvJD6yydxY9Uk | ON |
| Benchmark V3.0 | LKZO1QQY9jvBltP0 | ON |
| Monitoring Dashboard | tLNh3wTty7sEprLj | ON |
| SQL Executor | 22k9541l9mHENlLD | ON |
| Orchestrator Tester | m9jaYzWMSVbBFeSf | ON |
| RAG Batch Tester | y2FUkI5SZfau67dN | ON |
| Feedback V3.1 | F70g14jMxIGCZnFz | ON |
| Ingestion V3.1 | 15sUKy5lGL4rYW0L | OFF (→ Codespace) |
| Enrichissement V3.1 | 9V2UTVRbf4OJXPto | OFF (→ Codespace) |
| Dataset Ingestion | YaHS9rVb1osRUJpE | OFF (→ Codespace) |

## Etat Phase 1 (base pour Phase 2)
| Pipeline | Accuracy | Target | Status |
|----------|----------|--------|--------|
| Standard | 85.5% | >= 85% | PASS |
| Graph | 68.7% | >= 70% | FAIL (-1.3pp) |
| Quantitative | 78.3% | >= 85% | FAIL (-6.7pp) |
| Orchestrator | 80.0% | >= 70% | PASS |
| **Overall** | **78.1%** | **>= 75%** | **PASS** |

## Repos impactes
- mon-ipad (origin) — docker-compose optimise, dashboard refait, session-state

## Blockers
- gh CLI pas installe — impossible de gerer les Codespaces depuis la VM
- n8n API publique v1 timeout sur e2-micro (reponses trop lourdes) — workaround : query PG directement
- Vercel : user doit connecter via browser (pas encore fait)

## Prochaines actions
1. Installer gh CLI sur la VM pour gerer les Codespaces
2. Creer/demarrer les Codespaces rag-tests et rag-data-ingestion
3. Adapter les tests website aux 20 datasets/secteur (generer questions sectorielles)
4. Deployer sur Vercel (rag-website → nomos-ai.vercel.app)
5. Commencer Phase 2 : corriger Graph (68.7% → 70%) et Quantitative (78.3% → 85%)
6. Commit + push tous repos
