# Datasets FR Enterprise RAG — 4 Secteurs

> Last updated: 2026-02-18T18:35:00Z

> Recherche complète agent (session 12 — 17 fév 2026)
> 80 datasets identifiés (20 par secteur × 4 secteurs)

## Résumé Exécutif

Total potentiel : **~2.08 millions de Q&A**
Notre sample actuel : ~11K questions = **0.5%** — sévèrement sous-échantillonné

| Secteur | Q&A Disponibles | Notre Sample | Couverture |
|---------|----------------|--------------|------------|
| BTP/Construction | ~236,000 | ~2,750 | 1.2% |
| Industrie | ~246,000 | ~2,750 | 1.1% |
| Finance | ~380,000 | ~2,750 | 0.7% |
| Juridique | ~1,220,000 | ~2,750 | **0.2%** |
| **TOTAL** | **~2,082,000** | **~11,000** | **~0.5%** |

---

## Datasets Prioritaires — Tier 1 (charger maintenant)

| Dataset | Secteur | Lien HF | Q&A |
|---------|---------|---------|-----|
| `antoinejeannot/jurisprudence` | Juridique | [HF](https://huggingface.co/datasets/antoinejeannot/jurisprudence) | 500K+ (Cour de Cassation, live) |
| `AgentPublic/legi` | BTP+Juri | [HF](https://huggingface.co/datasets/AgentPublic/legi) | Tous codes FR |
| `PatronusAI/financebench` | Finance | [HF](https://huggingface.co/datasets/PatronusAI/financebench) | 10K+ |
| `galileo-ai/ragbench` | Industrie | [HF](https://huggingface.co/datasets/galileo-ai/ragbench) | 100K |
| `maastrichtlawtech/bsard` | Juridique | [HF](https://huggingface.co/datasets/maastrichtlawtech/bsard) | 1,100 gold |
| `miracl/miracl` (FR) | Tous | [HF](https://huggingface.co/datasets/miracl/miracl) | ~18K FR |
| `illuin/fquad` | Tous | [HF](https://huggingface.co/datasets/illuin/fquad) | 60K FR |

---

## BTP / Construction

**Gap critique** : Aucun dataset FR natif pour DTU, CCTP, Eurocodes — paywalled AFNOR/CSTB.

### Techniques (T1-T10)
- `ACCORD-NLP/CODE-ACCORD-Entities` — seul corpus annoté réglementation bâtiment (NLP)
- `ClimatePolicyRadar/all-document-text-data` — RT2012/RE2020 inclus
- `AgentPublic/DILA-Vectors` — loi urbanisme + construction, pré-indexé BGE-M3
- `AgentPublic/legi` (code-urbanisme + code-construction-habitation)
- `PleIAs/common_corpus` — filtrer FR réglementaire (CSTB, ADEME, Min.Transition)
- Générer **10K Q&A synthétiques** via RAGEval depuis PDFs AFNOR en domaine public

### Recherche (R1-R10)
- `galileo-ai/ragbench` (EManual subset) — proxy manuels techniques
- `CRAG Benchmark` — gold standard évaluation RAG
- `MIRACL FR` + `FQuAD` — baselines retrieval FR
- `maastrichtlawtech/bsard` — benchmark retrieval FR (Syntec, contrats)
- `NoMIRACL FR` — test "pas de réponse" (crucial quand DTU manquant)

---

## Industrie / Manufacturing

**Gap critique** : Quasi aucun dataset FR industriel public. Corpus CamemBERT/FlauBERT sur logs maintenance → propriétaire.

### Techniques (T1-T10)
- `galileo-ai/ragbench` (EManual + DelucionQA) — manuels techniques
- `nvidia/TechQA-RAG-Eval` — Q&A support technique ingénieur
- `MohammedSohail/predictive-maintenance-dataset` — capteurs multi-équipements
- `AgentPublic/legi` (code-travail + sécurité) — ATEX, ICPE, EPI
- Générer **15K Q&A** depuis publications INRS ED/ND (3000 PDFs publics) via RAGAS

### Recherche (R1-R10)
- `RAGBench` complet (100K) — meilleur benchmark industriel
- `QuALITY` — QA documents longs (manuels 100+ pages)
- `RULER Benchmark` — contextes 4K-128K tokens (standards ISO)
- `WixQA Enterprise` — méthodologie KB enterprise → Q&A

---

## Finance

**Meilleur secteur servi.** FinMTEB (64 datasets), FinanceBench, FinQA.

### Techniques (T1-T10)
- `PatronusAI/financebench` — GOLD STANDARD (10K+, rapports annuels, 10-K)
- `sweatSmile/FinanceQA` — Q&A bilans/rapports, format RAG-ready
- `PleIAs/SEC` (245K docs, 7.24B mots) — plus grand corpus financier public
- `AdaptLLM/finance-tasks` — 7 tâches NLP finance (FPB, FiQA, FinQA...)
- `kensho/bizbench` — raisonnement quantitatif sur docs financiers
- Générer **20K Q&A** depuis publications ACPR/AMF (CC0) via RAGAS

### Recherche (R1-R10)
- `FinMTEB` (64 datasets) — benchmark embedding financier EMNLP 2025
- `dreamerdeo/finqa` — 8281 Q&A raisonnement numérique (MIFID/DORA)
- `MultiEURLEX` FR — classification réglementation EU (DORA, MIFID II)
- `RAGTruth` — hallucination corpus sur finance (critiques: AMF/ACPR)
- `BeIR/fiqa` — retrieval opinions financières (6648 Q&A)

---

## Juridique

**Secteur le mieux couvert.** Jurisprudence en temps réel, tous codes FR, benchmarks Maastricht.

### Techniques (T1-T10)
- `antoinejeannot/jurisprudence` — **500K+ décisions** (Cass+Appel+TJ, MàJ 72h)
- `louisbrulenaudet/legalkit` — tous codes FR, labels LLaMA-3-70B, refresh quotidien
- `louisbrulenaudet/code-commerce` + `code-travail` — codes spécifiques
- `AgentPublic/legi` (tous codes) — 50+ codes, pré-indexé
- `maastrichtlawtech/bsard` + `lleqa` — benchmarks gold annotés juristes
- `CATIE-AQ/frenchQA` — 200K Q&A FR (base fine-tuning lecteurs)

### Recherche (R1-R10)
- `joelniklaus/Multi_Legal_Pile` — 689GB droit multilingue incl. FR (ACL 2024)
- `coastalcph/multi_eurlex` — 65K lois EU FR (RGPD, AI Act, MIFID)
- `pile-of-law/pile-of-law` — 256GB textes juridiques
- `harvard-lil/cold-french-law` — LEGI + traductions EN (CC-BY 4.0)
- `MEMERAG` — évaluation RAG multilingue annoté experts (ACL 2025)

---

## Notes Techniques Pipeline

1. **Embedding actuel Jina-v3** : optimal pour FR technique ✅ (alternative: BAAI/bge-m3)
2. **Chunking légal** : utiliser `rcds/MultiLegalSBD` pour segmentation aux frontières d'articles
3. **Évaluation** : adopter TRACe (RAGBench) — Utilization, Relevance, Adherence, Completeness
4. **Hallucination guard** : implémenter NoMIRACL-style — test "pas de réponse dans contexte"
5. **Génération synthétique** : RAGAS ou RAGEval depuis PDFs propriétaires

---

## Roadmap d'acquisition

### Semaine 1 (HF direct)
```bash
# Charger jurisprudence (échantillon 10K)
from datasets import load_dataset
ds = load_dataset("antoinejeannot/jurisprudence", streaming=True)

# Charger LEGI codes BTP+Juridique
ds_legi = load_dataset("AgentPublic/legi", "code_de_l_urbanisme")

# Charger FinanceBench
ds_fin = load_dataset("PatronusAI/financebench")
```

### Semaines 2-4 (synthétique)
- 15K Q&A Industrie depuis PDFs INRS
- 20K Q&A Finance depuis ACPR/AMF
- 10K Q&A BTP depuis CSTB public domain
- 30K Q&A Juridique depuis EUR-LEX FR

### Mois 2-3 (propriétaire/partenariat)
- Licence AFNOR DTU (~€2K/an)
- Partenariat CETIM pour logs maintenance
- Scraping AMF/ACPR complet

*Dernière mise à jour : 2026-02-17 — Session 12*
