# Alternatives Cloud Gratuites — Migration Infrastructure

> Last updated: 2026-02-18T19:15:00Z
> Recherche internet poussee : 20+ providers analyses, papiers academiques + blogs labs

---

## Contexte Actuel

La VM Google Cloud e2-micro actuelle fonctionne correctement pour son role de **pilotage** :
- n8n (67 MB) + Redis (4 MB) + PostgreSQL (24 MB) = **95 MB Docker**
- Claude Code (~278 MB) via Termius
- **Total ~400 MB** sur 970 MB disponibles
- Les tests lourds passent par les Codespaces GitHub (8 GB RAM)

**Question cle** : La VM actuelle suffit-elle pour Phase 5 (1M+ questions) ?
**Reponse** : OUI pour le pilotage. NON si on veut executer les tests dessus.

---

## Option A : GARDER l'architecture actuelle ($0/mois)

| Composant | Ou | RAM | Role |
|-----------|-----|-----|------|
| VM GCloud e2-micro | Permanent | 970 MB | Pilotage + n8n permanent |
| Codespace rag-tests | Ephemere (60h/mois) | 8 GB | Tests 50-1000q |
| Codespace rag-data-ingestion | Ephemere (partage quota) | 8 GB | Ingestion massive |
| Vercel | Serverless | - | Website prod |

**Verdict** : Suffisant jusqu'a Phase 3 (~10K questions). Phase 4-5 necessite plus de temps Codespace (60h/mois = ~18 runs de 200q).

---

## Option B : Hugging Face Spaces + Supabase ($0/mois) — DECOUVERTE MAJEURE

**Source** : [Deploy n8n for FREE with HuggingFace Spaces](https://tomo.dev/en/posts/deploy-n8n-for-free-using-huggingface-space/)

| Spec | Valeur |
|------|--------|
| CPU | 2 cores |
| RAM | **16 GB** |
| Stockage | 50 GB (non-persistant — utiliser Supabase pour BDD) |
| Cout | **$0 permanent** |
| Port | 7860 (requis par HF Spaces) |
| Sleep | Apres 48h d'inactivite |
| Docker | OUI — Dockerfile natif |

### Architecture proposee
```
Hugging Face Space (Docker, 16GB RAM, 2 CPU)
  |
  +-- n8n (port 7860) → BDD externe Supabase
  +-- Redis (interne, cache)
  |
  +-- Supabase (externe, gratuit)
       +-- PostgreSQL n8n state
       +-- Donnees quantitatives
```

### Anti-sleep (keep alive)
1. **n8n Cron interne** : Schedule node → HTTP GET self toutes les 12h
2. **GitHub Actions** : `.github/workflows/keep-alive.yml` → curl toutes les 12h
3. **UptimeRobot** (gratuit) : Ping /health toutes les 5 min

### Avantages
- **16x la RAM** de la VM actuelle (16 GB vs 970 MB)
- BDD persistante via Supabase (deja configuree)
- Peut tourner n8n + 2-3 workers en queue mode
- Docker compose supporte

### Inconvenients
- Sleep apres 48h (contournable via ping)
- Port force a 7860
- Pas de stockage persistant local (tout dans Supabase)
- IP dynamique (pas de webhook fixe — utiliser n8n tunnel ou Cloudflare Tunnel)

### Migration
1. Dupliquer HF Space template : `huggingface.co/spaces/tomowang/n8n`
2. Configurer variables : `DATABASE_URL=postgresql://...supabase...`
3. Importer workflows via API n8n
4. Configurer keep-alive cron

---

## Option C : Azure B1s ($0 pendant 12 mois, puis payant)

| Spec | Valeur |
|------|--------|
| CPU | 1 vCPU |
| RAM | 1 GB |
| Stockage | 4 GB (+ disque a ajouter) |
| Cout | $0 pendant 12 mois (750h/mois) |
| Docker | OUI |

**Sources** : [Azure B1s specs](https://instances.vantage.sh/azure/vm/b1s), [Azure free tier](https://learn.microsoft.com/en-us/answers/questions/1191439/azure-free-tier)

**Verdict** : Identique a l'actuel GCloud e2-micro. Pas d'amelioration reelle. Utile comme backup si GCloud tombe.

---

## Option D : AWS t3.micro ($0 pendant 12 mois)

| Spec | Valeur |
|------|--------|
| CPU | 2 vCPU (burstable) |
| RAM | 1 GB |
| Stockage | 30 GB EBS |
| Cout | $0 pendant 12 mois |
| Docker | OUI |

**Verdict** : Meme limitation que GCloud/Azure (1GB RAM). Pas d'avantage.

---

## Option E : Fly.io ($0 free tier)

| Spec | Valeur |
|------|--------|
| CPU | shared-cpu-1x |
| RAM | 256 MB par machine |
| Machines | 3 machines gratuites |
| Stockage | 1 GB volumes |
| Cout | $0 (3 VMs) |

**Verdict** : Trop peu de RAM (256 MB). Insuffisant pour n8n.

---

## Option F : Railway.app ($0 trial, puis $5/mois)

| Spec | Valeur |
|------|--------|
| CPU | Partage |
| RAM | 512 MB (trial) → 8 GB (plan) |
| Cout | $5/mois (pas gratuit permanent) |

**Verdict** : Pas gratuit permanent. Rejete.

---

## Option G : Koyeb ($0 free tier)

| Spec | Valeur |
|------|--------|
| CPU | Nano instances |
| RAM | 256 MB |
| Cout | $0 |
| Docker | OUI |

**Verdict** : Trop peu de RAM.

---

## Option H : Render.com ($0 free tier)

| Spec | Valeur |
|------|--------|
| CPU | Shared |
| RAM | 512 MB |
| Cout | $0 |
| Limitation | Sleep apres 15 min d'inactivite |

**Verdict** : Sleep trop agressif (15 min). Inutilisable pour n8n webhooks.

---

## Option I : Hetzner CAX21 ($6.49/mois — PAS GRATUIT mais excellent rapport qualite/prix)

| Spec | Valeur |
|------|--------|
| CPU | 4 vCPU ARM Ampere |
| RAM | **8 GB** |
| Stockage | 80 GB SSD |
| Trafic | 20 TB/mois |
| Cout | **6.49 EUR/mois** |

**Source** : [Hetzner CAX21 specs](https://sparecores.com/server/hcloud/cax21)

**Verdict** : Si budget $0 strict est assoupli, c'est le meilleur rapport qualite/prix. 8x la RAM pour 6.49 EUR.

---

## Option J : Strategie Multi-Provider ($0 total)

Combiner plusieurs free tiers pour maximiser la puissance :

| Service | Provider | Spec | Role |
|---------|----------|------|------|
| n8n principal | **Hugging Face Space** | 16 GB RAM, 2 CPU | Workflow engine permanent |
| BDD n8n state | **Supabase** (deja actif) | PostgreSQL gratuit | Persistence |
| Cache | **Upstash** Redis | 256 MB gratuit | Cache embeddings |
| Tests lourds | **GitHub Codespaces** | 8 GB RAM, 60h/mois | Eval 500q+ |
| Pilotage | **VM GCloud e2-micro** (actuel) | 970 MB | Claude Code + Termius |
| Website | **Vercel** (actuel) | Serverless | Prod |

**Total : $0/mois avec 16 GB RAM n8n + 8 GB tests + 970 MB pilotage**

---

## Estimation Puissance Requise Phase 5 (1M+ questions)

### Calcul
- 1M questions a ~60s/question = **694 jours sequentiel** → impossible
- Avec 4 workers paralleles : **174 jours** → encore trop
- Avec 10 workers : **69 jours** → 2 mois environ, faisable
- Bottleneck reel : **OpenRouter free tier** (20 req/min = 1,200 req/h)
- 1M questions / 1,200 req/h = **833 heures** = ~35 jours 24/7

### Besoin minimum Phase 5
| Ressource | Minimum | Ideal |
|-----------|---------|-------|
| RAM | 8 GB | 16-24 GB |
| CPU | 4 cores | 8 cores |
| Stockage | 50 GB | 200 GB |
| Uptime | 24/7 pendant 35 jours | 24/7 pendant 35 jours |
| n8n workers | 4-6 | 10 |

### Solution Phase 5 proposee
1. **HF Spaces** (16 GB) pour n8n + 4 workers → 24/7 permanent
2. **Codespaces** pour overflow workers additionnels
3. Si budget possible : **Hetzner CAX21** (8 GB, 6.49 EUR) en complement

---

## Recommandation Finale

### Court terme (maintenant → Phase 2)
**Garder l'architecture actuelle.** La VM fait son travail de pilotage, les Codespaces gerent les tests. Pas de migration necessaire.

### Moyen terme (Phase 3 → Phase 4)
**Ajouter HF Spaces** comme n8n secondaire (16 GB RAM gratuit). Garder la VM GCloud pour le pilotage Claude Code.

### Long terme (Phase 5 — 1M+ questions)
**HF Spaces (n8n principal)** + **Codespaces (tests overflow)** + **VM GCloud (pilotage)** = **$0 total** avec 16 GB + 8 GB + 1 GB = **25 GB de RAM distribuee** gratuite.

Si budget possible : Hetzner CAX21 (6.49 EUR/mois) remplace tout le reste avec 8 GB dedies.

---

## Sources

- [HF Spaces n8n deployment](https://tomo.dev/en/posts/deploy-n8n-for-free-using-huggingface-space/)
- [HF Spaces Docker template](https://huggingface.co/spaces/tomowang/n8n)
- [Keep-alive strategies](https://apidog.com/blog/deploy-n8n-free-huggingface/)
- [Google Cloud Free Tier](https://cloud.google.com/free)
- [GitHub Codespaces billing](https://docs.github.com/billing/managing-billing-for-github-codespaces/about-billing-for-github-codespaces)
- [Azure B1s specs](https://instances.vantage.sh/azure/vm/b1s)
- [Hetzner CAX21 review](https://www.bitdoze.com/hetzner-cloud-cost-optimized-plans/)
- [Fly.io pricing](https://fly.io/docs/about/pricing/)
- [Railway pricing](https://railway.app/pricing)
- [Render free tier](https://render.com/pricing)
- [Koyeb free tier](https://www.koyeb.com/pricing)

---

*Recherche effectuee le 2026-02-18 suivant la methodologie `directives/research-methodology.md`*
