# Status de Session — 17 Février 2026 (Session 11b + refactoring directives)

> Session 11b : architecture multi-repo finalisée, devcontainers image-based, docker-compose standalone.
> Session directives (17 fév) : refactoring complet des directives — CLAUDE.md enrichi, directives/repos/ créées.

---

## Ce qui a été fait dans les sessions récentes

### Session 11b (17 fév 2026) — Architecture multi-repo
- ✅ Devcontainers image-based (pas de dockerComposeFile → résout bug SSH)
- ✅ docker-compose.yml standalone pour rag-website et rag-data-ingestion
- ✅ setup.sh démarre docker-compose + attend n8n + importe workflows + installe Claude Code
- ✅ rag-tests = remote-only (SSH tunnel vers VM n8n, pas de n8n local)
- ✅ rag-dashboard = site statique (pas de Docker, pas de Codespace nécessaire)
- ✅ scripts/deploy-codespaces.sh : create/start/stop/ssh/tunnel/status/push-all
- ✅ Fix port 8080 : webhook `/webhook/nomos-status` sur port 5678
- ✅ Push architecture vers tous les repos satellites

### Session directives (17 fév 2026) — Refactoring complet
- ✅ CLAUDE.md entièrement réécrit (infra réelle, rôles précis, accès Claude détaillés)
- ✅ `directives/repos/rag-tests.md` créé
- ✅ `directives/repos/rag-website.md` créé (objectif sectoriel + recherche 2026)
- ✅ `directives/repos/rag-data-ingestion.md` créé (recherche papiers 2026 obligatoire)
- ✅ `directives/repos/rag-dashboard.md` créé
- ✅ `scripts/push-directives.sh` créé (push CLAUDE.md vers chaque satellite)

### Session 8 (16 fév 2026) — Infrastructure n8n
- ✅ Task runner TTL fix : 15s → 120s (VM 970MB RAM, souvent en swap)
- ✅ Trailing comma fix Standard embedding JSON (migration Jina)
- ✅ Jina migration validée : Standard 3/3, Graph 3/3
- ✅ Quantitative 1/3 (SQL edge cases — à corriger)

---

## État des pipelines (Phase 1 — 200q)

| Pipeline | Accuracy | Target | Status |
|----------|----------|--------|--------|
| Standard | 85.5% | >= 85% | ✅ PASS |
| Graph | 68.7% | >= 70% | ❌ FAIL (-1.3pp) |
| Quantitative | 78.3% | >= 85% | ❌ FAIL (-6.7pp) |
| Orchestrator | 80.0% | >= 70% | ✅ PASS |
| **Overall** | **78.1%** | **>= 75%** | **✅ PASS** |

---

## État des bases de données

| Database | Contenu | Status |
|----------|---------|--------|
| **Pinecone** (sota-rag-jina-1024) | 10,411 vecteurs, 12 namespaces, 1024-dim | ✅ PRIMARY |
| **Pinecone** (sota-rag-cohere-1024) | 10,411 vecteurs, backup Cohere | ✅ BACKUP |
| **Pinecone** (sota-rag-phase2-graph) | 1,296 vecteurs, e5-large | ✅ OK |
| **Neo4j** | 19,788 nodes, 76,717 relations | ✅ OK |
| **Supabase** | 40 tables, ~17,000+ lignes | ✅ OK |

---

## Infrastructure VM (état actuel)

```
VM Google Cloud e2-micro : 34.136.180.66
RAM : 969MB total / ~865MB utilisé / ~104MB disponible
Swap : 2047MB / ~1084MB utilisé (VM en swap régulièrement)
Disque : 30GB / 12GB utilisé / 17GB libres

Docker containers :
  n8n-n8n-1        : Up (stable), port 5678
  n8n-redis-1      : Up (healthy), port 6379
  n8n-postgres-1   : Up (healthy), port 5432

n8n workflows actifs : 11
```

---

## Fichiers modifiés lors du refactoring directives (17 fév)

| Fichier | Modification |
|---------|-------------|
| `CLAUDE.md` | Réécriture complète : infra réelle, rôles Claude précis, accès/limites, infra détaillée |
| `directives/repos/rag-tests.md` | NOUVEAU : directive agent testeur |
| `directives/repos/rag-website.md` | NOUVEAU : directive agent website, datasets sectoriels, recherche 2026 |
| `directives/repos/rag-data-ingestion.md` | NOUVEAU : directive agent ingestion, recherche papiers 2026 obligatoire |
| `directives/repos/rag-dashboard.md` | NOUVEAU : directive dashboard statique |
| `scripts/push-directives.sh` | NOUVEAU : push CLAUDE.md vers chaque repo satellite |
| `directives/status.md` | MAJ session 11b + refactoring |

---

## Prochaines actions prioritaires

```
COURT TERME (Phase 1 — compléter les gates) :
1. Graph pipeline : 68.7% → 70% (entity extraction, GraphRAG community detection)
2. Quantitative pipeline : 78.3% → 85% (SQL edge cases, multi-table JOINs)
3. Pousser les directives vers chaque repo satellite : bash scripts/push-directives.sh

MOYEN TERME (Phase 2) :
4. Créer/vérifier les Codespaces rag-tests et rag-data-ingestion
5. rag-data-ingestion : Phase 0 recherche papiers 2026 → améliorer Ingestion V4.0
6. rag-website : Phase 0 recherche papiers 2026 → adapter pipelines aux secteurs
7. Phase 2 full eval (1000q — hf-1000.json) quand Phase 1 gates OK

LONG TERME :
8. Ingestion des 20 datasets sectoriels (sector-datasets.md)
9. rag-website : déploiement production Vercel avec les 4 secteurs
10. Phase 3 : 10K+ questions
```

---

## Prompt pour la prochaine session

```
Continue le travail sur mon-ipad (session 12) :
- Session 11b a finalisé l'architecture multi-repo (devcontainers image-based, docker-compose standalone)
- Refactoring directives : CLAUDE.md enrichi, directives/repos/ créées (4 repos)
- Phase 1 overall 78.1% (>75% PASS) — mais Graph 68.7% et Quantitative 78.3% échouent
- PRIORITÉ 1 : Graph 68.7% → 70% (entity extraction)
- PRIORITÉ 2 : Quantitative 78.3% → 85% (SQL edge cases)
- PRIORITÉ 3 : push directives → bash scripts/push-directives.sh
- PRIORITÉ 4 : vérifier/créer les Codespaces rag-tests et rag-data-ingestion
- Infrastructure VM : 30GB disk (17GB libre), 969MB RAM (~100MB dispo), swap actif
- Docker : n8n + redis + postgres actifs
- TOUJOURS : source .env.local avant scripts Python
```
