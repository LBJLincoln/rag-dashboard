# Diagnostic Flowchart — Decision Trees for Recurring Problems

> Last updated: 2026-02-19T23:55:00+01:00

> **OBJECTIF** : Eliminer le re-debug de problemes deja resolus.
> Ce document est un ARBRE DE DECISION. Suivre la branche correspondant au symptome observe.
> Chaque feuille de l'arbre pointe vers le Fix exact dans `fixes-library.md`.

---

## COMMENT UTILISER CE DOCUMENT

1. Observer le **symptome** (HTTP status, message d'erreur, comportement)
2. Trouver la section correspondante ci-dessous
3. Suivre l'arbre de decision jusqu'a la feuille
4. Appliquer la solution referencee (ou verifier si deja appliquee)
5. Si le symptome n'est pas couvert, l'ajouter apres resolution

---

## ARBRE 1 — Pipeline repond mais resultat incorrect

```
Reponse recue mais mauvaise
    |
    +-- Reponse contient "[object Object]" ?
    |       OUI → Pattern 2.2 (knowledge-base.md) : serialiser typeof check
    |
    +-- Reponse contient HTML (<!DOCTYPE html>) ?
    |       OUI → URL API incomplete (ex: /chat/completions manquant)
    |             → FIX-35 : verifier OPENROUTER_BASE_URL
    |             → Verifier que entrypoint.sh corrige l'URL
    |
    +-- Reponse "Query must start with SELECT" ?
    |       |
    |       +-- LLM retourne erreur 429 ? → Rate limit OpenRouter
    |       |       → Attendre 60s, ou changer modele, ou multi-key
    |       |       → Voir knowledge-base Section 1.6 (rate-limit)
    |       |
    |       +-- LLM retourne JSON invalide ? → Modele genere mal le SQL
    |       |       → Pattern 2.3 : ILIKE, sample data, schema statique
    |       |
    |       +-- LLM retourne HTML ? → URL API sans /chat/completions
    |               → FIX-35
    |
    +-- SQL correct mais resultat numerique faux ?
    |       → Pattern 2.3 : mauvais WHERE (company, period, year)
    |       → Solution : ILIKE + sample data in prompt
    |
    +-- Reponse vide (body = [] ou "") ?
    |       |
    |       +-- Orchestrator ? → FIX-34 : executeWorkflow + respondToWebhook
    |       |       → Verifier que les Invoke nodes sont httpRequest (pas executeWorkflow)
    |       |
    |       +-- Autre pipeline ? → Pattern 2.8 : verifier noeud Respond to Webhook
    |
    +-- Reponse = donnees d'un autre pipeline ?
            → Orchestrator route mal → verifier Intent Classifier
            → knowledge-base Section 1.3 : matrice workflow x modele
```

---

## ARBRE 2 — Erreur HTTP a l'appel du webhook

```
Erreur HTTP en appelant un webhook
    |
    +-- 404 "webhook not registered" ?
    |       |
    |       +-- Path correct ? → Verifier Section 0.1 knowledge-base.md
    |       |       → TOUJOURS copier le path depuis la doc, JAMAIS taper de memoire
    |       |
    |       +-- Path correct mais 404 ? → Workflow pas actif
    |               → Sur VM : docker exec n8n-postgres-1 psql -U n8n -d n8n -t -A \
    |                          -c "SELECT active FROM workflow_entity WHERE id = '<ID>'"
    |               → Sur HF Space : verifier logs de startup (activation failed?)
    |
    +-- 401 "X-N8N-API-KEY header required" ?
    |       → FIX-27 : pas de cle API sur la VM
    |       → Utiliser PostgreSQL direct ou MCP n8n (Section 0.3 knowledge-base)
    |       → NE PAS tenter l'API REST
    |
    +-- 500 Internal Server Error ?
    |       |
    |       +-- Message "access to env vars denied" ?
    |       |       → FIX-33 : $env bloque dans n8n 2.8+
    |       |       → Solution : fix-env-refs.py (injection a l'import)
    |       |       → Anti-pattern AP-8 : $env interdit partout
    |       |
    |       +-- Message "Credential with ID xxx does not exist" ?
    |       |       → FIX-06 : credentials pas migrees
    |       |       → Creer les credentials + re-mapper les IDs
    |       |
    |       +-- Message "SQLITE_CONSTRAINT FOREIGN KEY" ?
    |       |       → FIX-18 : FK vers entites source DB
    |       |       → Strip FK fields avant import
    |       |
    |       +-- Aucun message clair ?
    |               → Verifier execution dans n8n : analyser le dernier noeud execute
    |               → scripts/analyze_n8n_executions.py --pipeline <name> --limit 1
    |
    +-- 429 Too Many Requests ?
    |       → OpenRouter rate limit (~20 req/min free tier)
    |       → knowledge-base Section 1.6
    |       → Options : attendre, retry backoff 8s, multi-key, changer modele
    |
    +-- 502/503 Service Unavailable ?
    |       → n8n surcharge ou redemarrage en cours
    |       → Attendre 30s et retry
    |       → Si VM : verifier RAM (free -m), tuer sessions Claude zombies
    |       → Si HF Space : verifier que le container est up (curl healthz)
    |
    +-- Timeout (>60s) ?
            → Pipeline sous charge ou LLM OpenRouter lent
            → Quantitative : 3 calls LLM = 15-30s normal
            → Orchestrator : delegue a sub-pipelines = 20-45s normal
            → Augmenter timeout a 90s dans le script de test
```

---

## ARBRE 3 — Modification workflow n'a pas d'effet

```
Fix applique mais comportement runtime inchange
    |
    +-- Modifie sur la VM n8n ?
    |       → INTERDIT depuis session 25 (Pattern 2.11)
    |       → Task Runner cache le code compile meme apres restart
    |       → SOLUTION : modifier sur HF Space UNIQUEMENT
    |       → Regles 25, 28 de CLAUDE.md
    |
    +-- Modifie sur HF Space ?
    |       |
    |       +-- Rebuild effectue ? (git push → Docker rebuild)
    |       |       → Verifier dans les logs HF Space que le nouveau code est deploye
    |       |       → fix-env-refs.py doit afficher les remplacements
    |       |
    |       +-- $env utilise dans le workflow ?
    |       |       → FIX-33 : $env bloque dans n8n 2.8+
    |       |       → Verifier que fix-env-refs.py les remplace correctement
    |       |
    |       +-- Code node modifie ?
    |       |       → Cycle PUT → Deactivate → Activate (FIX-21)
    |       |       → OU : re-import complet (HF Space = fresh DB a chaque rebuild)
    |       |
    |       +-- nodes[] modifie mais pas activeVersion.nodes[] ?
    |               → Anti-pattern AP-6 : TOUJOURS patcher les DEUX
    |               → FIX-29, FIX-32 documentent ce piege
    |
    +-- Modifie via API REST ?
            → FIX-09 : payload PUT doit exclure champs read-only
            → FIX-21 : cycle PUT → Deactivate → Activate obligatoire
            → Verifier avec GET que le changement est persiste
```

---

## ARBRE 4 — Problemes d'infrastructure HF Space

```
HF Space dysfonctionnel
    |
    +-- Container ne demarre pas ?
    |       |
    |       +-- "python3 not found" → FIX-13 : installer python3 dans Dockerfile
    |       +-- Import workflow echoue → FIX-14 : format array vs objet
    |       +-- FK constraint → FIX-18 : strip FK fields
    |       +-- Activation echoue → FIX-19 : n8n 2.8+ requires publish (versionId)
    |
    +-- Container up mais webhooks 500 ?
    |       → Verifier logs startup : "$env replacement" visible ?
    |       → Si non : fix-env-refs.py pas execute → verifier entrypoint.sh
    |       → Si oui : verifier quel noeud echoue (analyser execution)
    |
    +-- API REST (/api/, /rest/) ne fonctionne pas ?
    |       → FIX-15 : HF proxy casse POST body pour /api/ et /rest/
    |       → SOLUTION : utiliser webhooks (fonctionnent normalement)
    |       → OU : diagnostic via diag-server.py port 7861
    |
    +-- Webhook OK mais reponse incorrecte ?
    |       → Voir ARBRE 1 ci-dessus
    |
    +-- Rebuild tres long (>5 min) ?
            → HF Space cpu-basic est lent
            → Normal : 2-4 min pour rebuild Docker
            → Verifier que le git push a ete recu (logs Build)
```

---

## ARBRE 5 — Problemes de test et evaluation

```
Tests echouent ou donnent des resultats inattendus
    |
    +-- 5/5 PASS en smoke mais accuracy basse en eval ?
    |       → Pattern 2.7 : smoke questions sont faciles
    |       → Toujours valider avec 50q+ eval complete
    |
    +-- "source: command not found" ou variables manquantes ?
    |       → Regle 16 : source .env.local AVANT tout script Python
    |       → bash: source /home/termius/mon-ipad/.env.local
    |
    +-- Script Python OOM (killed) ?
    |       → VM RAM limitee (~100MB dispo)
    |       → Regle 25 : ZERO test eval sur VM
    |       → Executer sur HF Space ou Codespace
    |
    +-- Resultats inconsistants entre runs ?
    |       → OpenRouter rate limit cause des timeouts aleatoires
    |       → Quantitative : delai 8-10s entre questions recommande
    |       → Voir knowledge-base Section 6.3
    |
    +-- Field name 'question' rejete ?
    |       → Anti-pattern AP-2 : utiliser 'query' (pas 'question')
    |       → Section 0.2 knowledge-base.md
    |
    +-- Tests paralleles causent des 503 ?
            → Regle 12 : tests n8n SEQUENTIELS (pas paralleles)
            → EXCEPTION : eval/parallel-pipeline-test.py gere le spacing
            → HF Space supporte 3 pipelines simultanes (teste session 27)
```

---

## ARBRE 6 — Problemes de credentials et authentification

```
Erreur d'authentification ou de credentials
    |
    +-- "access to env vars denied" ?
    |       → FIX-33 : $env bloque n8n 2.8+
    |       → fix-env-refs.py injecte les valeurs a l'import
    |
    +-- "Credential with ID xxx does not exist" ?
    |       → FIX-06 : credentials pas migrees
    |       → Creer + re-mapper IDs
    |
    +-- OpenRouter 401 "Invalid API key" ?
    |       → Verifier OPENROUTER_API_KEY dans .env.local
    |       → HF Space : verifier secret dans les Settings
    |
    +-- Neo4j "Authentication failed" ?
    |       → Verifier NEO4J_PASSWORD
    |       → Format auth : Basic base64(neo4j:PASSWORD)
    |
    +-- Supabase "password authentication failed" ?
    |       → Verifier SUPABASE_PASSWORD / SUPABASE_DB_URL
    |       → Port 6543 (pooler) peut etre bloque sur HF Space
    |       → FIX-29 : utiliser REST API Supabase au lieu de TCP direct
    |
    +-- HuggingFace "Invalid username or password" ?
            → Pattern 2.4 : HF dataset ID incorrect
            → Verifier avec mcp__huggingface__hf_search_datasets
```

---

## MATRICE DE SYMPTOMES RAPIDE

| Symptome | Arbre | Fix probable | Fichier reference |
|----------|-------|--------------|-------------------|
| 404 webhook | 2 | Mauvais path | knowledge-base.md 0.1 |
| 500 "$env denied" | 2 | FIX-33 | fixes-library.md |
| 500 "credential not found" | 2 | FIX-06 | fixes-library.md |
| 429 rate limit | 2 | Backoff/multi-key | knowledge-base.md 1.6 |
| Body vide (Orchestrator) | 1 | FIX-34 | fixes-library.md |
| HTML au lieu de JSON | 1 | FIX-35 | fixes-library.md |
| "[object Object]" | 1 | Pattern 2.2 | knowledge-base.md |
| "Query must start with SELECT" | 1 | LLM 429 ou URL | knowledge-base.md 1.6 |
| Fix sans effet (VM) | 3 | Pattern 2.11 | knowledge-base.md |
| Fix sans effet (HF) | 3 | AP-6 / FIX-21 | fixes-library.md |
| OOM sur VM | 5 | Regle 25 | CLAUDE.md |
| Test inconsistant | 5 | Rate limit | knowledge-base.md 6.3 |

---

## CHECKLIST PRE-DEBUG (OBLIGATOIRE)

Avant de commencer tout debug, verifier dans l'ordre :

```
[ ] 1. Le symptome est-il dans la MATRICE DE SYMPTOMES ci-dessus ?
[ ] 2. Le symptome est-il dans fixes-library.md (index par categorie) ?
[ ] 3. Le symptome est-il dans knowledge-base.md (patterns de resolution) ?
[ ] 4. Les anti-patterns AP-1 a AP-10 sont-ils evites ?
[ ] 5. La pre-vol checklist (knowledge-base Section 0.4) est-elle suivie ?
```

**Si un de ces checks trouve une reponse : APPLIQUER LA SOLUTION EXISTANTE.**
**Ne PAS re-diagnostiquer. Ne PAS re-analyser. Appliquer directement.**

---

## AJOUT D'UN NOUVEAU SYMPTOME

Quand un nouveau probleme est resolu et n'est pas dans ce document :

1. Identifier l'arbre correspondant (1-6)
2. Ajouter la branche dans l'arbre
3. Ajouter l'entree dans la MATRICE DE SYMPTOMES
4. Documenter le fix dans `fixes-library.md`
5. Ajouter le pattern dans `knowledge-base.md` Section 2
6. Commit + push immediat
