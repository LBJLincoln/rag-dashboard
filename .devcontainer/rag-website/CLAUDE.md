# Nomos AI — Website Workflows (Codespace)

> Ce Claude Code CLI tourne dans un GitHub Codespace.
> Role : developper et tester les workflows RAG avec des datasets SECTORIELS propres.
> Les workflows sont des COPIES des workflows testes dans mon-ipad.

## Contexte
- Workflows identiques aux 4 pipelines RAG de mon-ipad (meme version exacte)
- MAIS datasets differents : 20 datasets specialises par secteur (voir technicals/sector-datasets.md)
- MAIS questions differentes : generees a partir des datasets sectoriels
- Le processus de test est IDENTIQUE a mon-ipad (workflow-process.md)

## Regles
1. Suivre `directives/workflow-process.md` — MEME processus que mon-ipad
2. Les workflows doivent etre en SYNC avec la version testee dans mon-ipad
3. Avant chaque session : verifier que les workflows sont a jour via `n8n/sync.py`
4. Double analyse OBLIGATOIRE : `eval/node-analyzer.py` + `scripts/analyze_n8n_executions.py`
5. Apres chaque test reussi : docs/status.json + git push

## Datasets sectoriels (20 par secteur)
### BTP
Normes DTU, CCAG travaux, diagnostics immobiliers, plans archi, DIUO, PGC, reglementations ERP,
normes PMR, certifications NF, etudes de sol, PLU, permis de construire, bilans carbone,
RT2020, rapports DPE, CSPS, DOE, APS/APD, devis quantitatifs, plannings Gantt

### Industrie
Procedures maintenance, fiches MSDS, rapports qualite ISO, gammes de fabrication,
plans P&ID, documentation ATEX, rapports AMDEC, audits energetiques, cahiers de soudage,
normes CE, dossiers FDA, validations IQ/OQ/PQ, GMP, registres ICPE, plans de prevention,
fiches postes, DUERP, arbres de defaillance, procedures HACCP, plans QHSE

### Finance
Ratios Bale III, rapports annuels, fiches OPCVM, analyses credit, stress tests,
bilans consolides, rapports CAC, matrices de risques, prospectus emissions,
documentation KYC, rapports MiFID, analyses ESG, forecasts DCF, cap tables,
term sheets, covenant packages, NAV reports, rapports ALM, plans de continuite, compliance audits

### Juridique
Code du travail, Code civil, jurisprudence Cour de cassation, contrats types,
conditions generales, RGPD, statuts societes, PV AG, pactes d'actionnaires,
baux commerciaux, conventions collectives, accords d'entreprise, procedures prudhomales,
protocoles transactionnels, clauses de non-concurrence, avenants, cessions de parts,
due diligence juridique, audits conformite, chartes informatiques

## Communication avec mon-ipad
- Sync workflows : verifier version via git diff avec mon-ipad/n8n/live/
- Status : git push → VM lit via git pull
- Dashboard : nomos-ai.vercel.app affiche les resultats en temps reel
