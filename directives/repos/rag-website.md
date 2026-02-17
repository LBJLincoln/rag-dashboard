# rag-website — CLAUDE.md

> **Ce repo s'exécute dans un Codespace GitHub éphémère (dev) + Vercel (prod).**
> Tu es un agent Claude Code spécialisé dans le SITE BUSINESS multi-secteurs.
> Tu suis le même workflow-process que mon-ipad, adapté à ton objectif secteur.

---

## ÉTAT ACTUEL — 17 fév 2026

| | |
|-|-|
| **Dernier commit** | c5a9ec70 — 17 fév 2026 (fix SSE live feed + Apple B2B redesign) |
| **Déployé / en cours** | Live sur Vercel : https://nomos-ai-pied.vercel.app — dashboard SSE /dashboard actif (932q) |
| **Codespace** | Shutdown — nomos-rag-website-jr7q9gr69qqfqp6r |
| **Prochain objectif immédiat** | Intégrer vrais docs sectoriels (BTP/Industrie/Finance/Juridique) dans les démos chatbot |

### Commandes clés pour cette session
```bash
# Redémarrer le Codespace si nécessaire
gh codespace start --codespace nomos-rag-website-jr7q9gr69qqfqp6r

# Dans le Codespace — dev local
npm install
npm run dev  # port 3000

# Déployer en prod
git push origin main  # → Vercel auto-deploy

# Vérifier le build
npm run build
```

### Livrables déjà en prod (session 13 — 17 fév 2026)
- Hero : problem-first, pain points cycliques, dual CTA + lien dashboard
- SectorCard : Apple-style, pain point en grand, ROI chips, bouton vidéo
- VideoModal : storyboard cinématique scripts Kimi (4 secteurs)
- HowItWorks : "Sous le capot", pipelines en sous-section
- DashboardCTA : section transparence avec métriques live
- evalStore.ts : Zustand SSE store (XP levels, streaming, pipeline stats)
- useEvalStream.ts : SSE hook avec reconnect exponentiel
- dashboard/live/ : QuestionRow, VirtualizedFeedList, FeedStatusBar, MilestoneNotification
- XPProgressionBar : 7 niveaux gamifiés (1q → 1000q)

---

## OBJECTIF DE CE REPO

Construire un **Multi-RAG Orchestrator sectoriel** capable de répondre aux questions
métier des ETI et Grands Groupes français dans 4 secteurs :
- **BTP/Construction** — normes, marchés, CCTP, RE2020
- **Industrie** — maintenance, ICPE, qualité ISO, AMDEC
- **Finance** — états financiers, IFRS, prudentiel, KYC
- **Juridique** — jurisprudence, codes, contrats, compliance

**Cible finale** : performance SOTA sur les 20 datasets sectoriels désignés,
avec des bases de données **SÉPARÉES** de mon-ipad.

---

## POINT DE DÉPART : VERSION RÉUSSIE DE MON-IPAD PHASE 2

**Tu pars de la dernière version validée de mon-ipad** (4 pipelines RAG Phase 2).
- Copier l'architecture des 4 pipelines (Standard, Graph, Quantitative, Orchestrator)
- Adapter les workflows n8n pour les documents sectoriels (pas les benchmarks académiques)
- Créer des **bases de données séparées** avec les datasets sectoriels

### Bases de données SÉPARÉES (ne pas utiliser celles de mon-ipad)
| BDD | Index/Schema mon-ipad | Index/Schema rag-website |
|-----|----------------------|--------------------------|
| Pinecone | `sota-rag-jina-1024` | `website-sectors-jina-1024` |
| Neo4j | graph mon-ipad | labels préfixés `WEB_` |
| Supabase | schéma `public` | schéma `website_` |

---

## RECHERCHE ACADÉMIQUE PRÉLIMINAIRE (PHASE 0 — OBLIGATOIRE)

**Avant de commencer le développement**, effectuer une revue des papiers 2026 :

### Sources prioritaires
- **ArXiv** (cs.IR, cs.CL) : papiers RAG SOTA 2025-2026
- **Anthropic Research** : techniques de retrieval, contextual RAG
- **OpenAI Research** : file search improvements, embedding models
- **ECIR 2026, ACL 2026, EMNLP 2025** : papers acceptés sur RAG sectoriel

### Topics à rechercher
```
1. "Sector-specific RAG" OR "domain RAG 2026"
2. "Contextual retrieval" OR "late chunking" (Jina)
3. "Graph RAG" domain adaptation 2026
4. "Quantitative RAG" financial documents
5. "Document-level embeddings" multilingue FR/EN
6. "Hybrid retrieval" dense + sparse sectoriel
```

### Intégration des découvertes
- Documenter les techniques dans `research/papers-2026.md`
- Appliquer les meilleures techniques aux workflows n8n sectoriels
- Comparer avant/après avec la double analyse (node-analyzer + analyze_n8n_executions)

---

## LES 20 DATASETS SECTORIELS (source : mon-ipad/technicals/sector-datasets.md)

5 datasets prioritaires par secteur = 20 datasets totaux.
Voir la liste complète dans `technicals/sector-datasets.md` (sections 3.1 à 3.4).

### BTP/Construction (5 datasets prioritaires)
| # | Dataset | Source HF | Utilité |
|---|---------|-----------|---------|
| 1 | **CODE-ACCORD** | `GT4SD/code-accord` | NER réglementations bâtiment FR (DTU, Eurocodes) |
| 2 | **ConstructionSite VQA** | `joyjeni/ConstructionSite-VQA-GPT4` | QA chantiers (sécurité, équipements) |
| 3 | **Engineering Drawings AS1100** | `cclabsai/engineering-drawing-qa-as1100` | QA dessins techniques / plans |
| 4 | **DesignQA** | `filipeabperes/DesignQA` | QA conformité normes ingénierie |
| 5 | **SQuAD Construction subset** | `rajpurkar/squad_v2` (filtré bâtiment) | QA extractif documents construction |

### Industrie/Manufacturing (5 datasets prioritaires)
| # | Dataset | Source HF | Utilité |
|---|---------|-----------|---------|
| 1 | **Manufacturing QA** | `thesven/manufacturing-qa-gpt4o` | 5 000 QA process fab, qualité, lean |
| 2 | **TAT-QA** | `nextplusplus/TAT-QA` | QA hybride tableaux + texte (rapports qualité) |
| 3 | **QuALITY** | `nyu-mll/quality` | QA documents longs (manuels, procédures 5000+ tokens) |
| 4 | **RAGBench** | `rungalileo/ragbench` | 100K exemples RAG multi-domaine industrie |
| 5 | **CRAG** | `facebook/crag` | Benchmark RAG NeurIPS 2024 (multi-hop, dynamique) |

### Finance (5 datasets prioritaires)
| # | Dataset | Source HF | Utilité |
|---|---------|-----------|---------|
| 1 | FinanceBench | `PatronusAI/financebench` | QA états financiers |
| 2 | ConvFinQA | `TheFinAI/convfinqa` | Raisonnement financier |
| 3 | FinQA | Standard (déjà dans mon-ipad) | Calculs financiers |
| 4 | TAT-QA | Standard (déjà dans mon-ipad) | Tableaux financiers |
| 5 | Finance-Instruct | `sujet-ai/Sujet-Finance-Instruct-500k` | Instructions métier |

### Juridique (5 datasets prioritaires)
| # | Dataset | Source HF | Utilité |
|---|---------|-----------|---------|
| 1 | French Case Law | `rcds/french_case_law` | Jurisprudence FR |
| 2 | COLD French Law | `rcds/cold-french-law` | Code civil, pénal |
| 3 | MultiEURLEX | `joelito/multi_eurlex` | Droit européen |
| 4 | LegalBench | Identifier depuis sector-datasets.md | Raisonnement juridique |
| 5 | Contrats commerciaux | Identifier depuis sector-datasets.md | Clauses contractuelles |

### Procédure de téléchargement
```bash
source .env.local
# Les scripts de téléchargement sont dans scripts/download-sector-datasets.py
python3 scripts/download-sector-datasets.py --sector btp --max-questions 10000
python3 scripts/download-sector-datasets.py --sector finance --max-questions 10000
# etc.
```

---

## INFRASTRUCTURE DE CE CODESPACE

```
Type        : GitHub Codespace (éphémère)
CPU         : 2 cores | RAM : 8 GB | Disque : 32 GB
n8n local   : OUI — docker-compose standalone
              (n8n + postgres, démarré par setup.sh)
Déploiement : Vercel (auto sur push main)
```

### Containers Docker locaux
```
rag-website-n8n-1       n8nio/n8n:latest   Port 5678
rag-website-postgres-1  postgres:15         Port 5432 (interne)
```

---

## BOUCLE D'ITÉRATION (même que workflow-process.md — adapté secteurs)

### Étape 1 : Test 1/1 (par secteur)
```bash
source .env.local
python3 eval/quick-test.py --questions 1 --pipeline standard --sector btp
python3 eval/quick-test.py --questions 1 --pipeline quantitative --sector finance
```
- Si erreur → double analyse AVANT tout fix
- Si succès → passer à 5/5

### Étape 2 : Test 5/5 (double analyse OBLIGATOIRE)
```bash
python3 eval/quick-test.py --questions 5 --pipeline <pipeline> --sector <secteur>
# Pour chaque execution-id :
python3 eval/node-analyzer.py --execution-id <ID>
python3 scripts/analyze_n8n_executions.py --execution-id <ID>
```

### Étape 3 : Test 10/10
```bash
python3 eval/run-eval-parallel.py --max 10 --sector <secteur> --label "sector-fix"
```

### Étape 4 : Tests 200q → 1000q par secteur
```bash
python3 eval/run-eval-parallel.py --sector btp --label "btp-baseline"
python3 eval/run-eval-parallel.py --sector finance --questions 1000 --label "finance-phase2"
```

### Cibles par secteur
| Secteur | Pipeline principal | Cible |
|---------|-------------------|-------|
| BTP | Standard + Graph | >= 75% |
| Industrie | Standard + Quantitative | >= 75% |
| Finance | Quantitative | >= 80% |
| Juridique | Graph + Orchestrator | >= 70% |

---

## STACK TECHNIQUE

```
Frontend    : Next.js 14 (App Router) + Tailwind + shadcn/ui
Backend     : n8n local Codespace (workflows sectoriels)
LLM         : OpenRouter (Llama 70B, Gemma 27B) — même que mon-ipad
Embeddings  : Jina embeddings-v3 1024-dim (PRIMARY)
Vector DB   : Pinecone `website-sectors-jina-1024` (SÉPARÉE)
Graph DB    : Neo4j Aura Free — labels `WEB_*` (SÉPARÉE)
SQL DB      : Supabase schéma `website_*` (SÉPARÉE)
Deploy      : Vercel (auto push main)
```

---

## RÈGLES D'OR

1. **source .env.local** avant tout script Python
2. **Bases de données SÉPARÉES** — ne jamais écrire dans les indexes de mon-ipad
3. **Recherche papiers 2026 OBLIGATOIRE** avant développement
4. **UN fix par itération** — même règle que mon-ipad
5. **Double analyse** (node-analyzer + analyze_n8n_executions) pour chaque exécution
6. **Tests séquentiels** — jamais parallèles (503)
7. **5/5 minimum** avant sync/commit
8. **Push avant arrêt Codespace** — éphémère !
9. **Résultats vers GitHub** — mon-ipad lit depuis rag-website/main

---

## FIN DE SESSION

```bash
# Build Next.js
npm run build

# Génération status sectoriel
python3 eval/generate_status.py --mode sectors

# Commit
git add .
git commit -m "feat(sectors): BTP X% Finance X% — [description fix]"
git push origin main  # → déclenche Vercel auto-deploy
```

---

*Ce CLAUDE.md est géré depuis `mon-ipad/directives/repos/rag-website.md`.*
