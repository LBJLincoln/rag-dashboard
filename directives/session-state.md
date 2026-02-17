# Session State — 16-17 Fevrier 2026 (Session 9 — continued x2)

## Objectif de session
Refonte complete architecture multi-repo + branding Nomos AI + deploiement Vercel + topologie n8n

## Taches completees cette session

### Phase A — Documentation & Dashboard (avant compactage 1)
- technicals/sector-datasets.md (47KB) — 1000+ types docs par secteur
- technicals/infrastructure-plan.md (40KB) — Plan infra distribuee
- directives/dataset-rationale.md (25KB) — Justification 14 benchmarks
- Dashboard technique complet (4 composants + API + SSE)
- TrustSection + SectorCard ameliore (5 use cases ROI)

### Phase B — Architecture Multi-Repo (apres compactage 1)
- mon-ipad rendu PRIVE
- 4 repos PRIVES crees : rag-tests, rag-website, rag-dashboard, rag-data-ingestion
- Contenu complet de mon-ipad pousse vers les 4 repos
- CLAUDE.md reecrit pour architecture tour de controle
- objective.md mis a jour (4 phases, 5 repos)
- propositions v3 corrige avec recherche 2026

### Phase C — Branding Nomos AI + Vercel prep (apres compactage 2)
- Rebranding complet : Multi-RAG → Nomos AI (Header, Footer, Layout, Dashboard, ExecutiveSummary, package.json)
- API routes adaptees pour Vercel (fetch STATUS_API_URL au lieu de filesystem local)
- vercel.json configure (region cdg1)
- CORS headers pour API routes
- Build Next.js 15.5.12 reussi (landing + dashboard + 3 API routes)
- Serveur status Python sur VM port 3001 (sert status.json/data.json en HTTP)
- technicals/topology.md (380 lignes) — topologie complete 6 instances n8n

### Recherche 2026 (resultats cles)
- Workers n8n NE PEUVENT PAS tourner sur e2-micro (pas assez de RAM)
- VM = controle uniquement (main + Redis + PG, pas de workers)
- Next.js NE PEUT PAS tourner sur VM avec n8n (RAM saturee a 869/970MB)
- Free tier realiste : ~15-20 exec/s max (3 Codespace workers)
- Reverse SSH tunnel necessaire (gh codespace ssh -R)
- N8N_CONCURRENCY_PRODUCTION_LIMIT=2 sur VM (quick tests seulement)

## Decisions prises
- **Nom de marque : Nomos AI** (nomos = ordre cosmique, loi universelle en grec ancien)
- Architecture 5 repos prives
- VM = controle + quick tests (1q/5q/10q/50q max) — PAS de site web sur VM
- Vercel = site business + dashboard (obligatoire car RAM VM insuffisante)
- Codespaces = tests lourds (500q+) + ingestion
- 4 sessions Claude Code CLI simultanees (1 par repo, Max plan)
- Dashboard doit agreger donnees de 4 repos en temps reel
- Workflows dupliques par repo avec datasets propres (20/secteur)
- Chaque repo suit workflow-process.md identique

## Topologie n8n (6 processus, 10 conteneurs, 3 environnements)
- VM : n8n-main + PG + Redis (~74MB)
- Codespace A (rag-tests) : 2 workers RAG (~1GB)
- Codespace B (rag-data-ingestion) : n8n-ingestion-main + 2 workers + PG + Redis (~1.1GB)

## Repos impactes (tous a 34400e2)
- mon-ipad (origin) — tous les fichiers
- rag-tests — copie complete
- rag-website — copie complete
- rag-dashboard — copie complete
- rag-data-ingestion — copie complete

## Commits cette session
- 5db43d6 — dashboard, docs, business content & SSE
- 542ff35 — propositions v1
- 2fdee30 — multi-repo architecture + research corrections
- 34400e2 — rebrand Nomos AI + Vercel-ready + topology document

## Blockers
- Vercel : user doit connecter via browser (CLI timeout sur VM low-RAM)
- Token GitHub manque scope `delete_repo` → 4 anciens repos a supprimer manuellement
- gh CLI pas installe sur la VM

## En cours / Prochaines actions (cette session)
1. DEPLOYER sur Vercel : rag-website → nomos-ai.vercel.app (user action browser)
   - Root dir: website, env vars: N8N_HOST, N8N_WEBHOOK_PATH, STATUS_API_URL
2. devcontainer.json pour rag-tests et rag-data-ingestion
3. Configuration agentic Claude Code par repo
4. Workflows dupliques par repo avec datasets sectoriels (20/secteur)
5. Mise a jour docs finaux + push all repos
