# Nomos AI — RAG Tests (Codespace Worker)

> Ce Claude Code CLI tourne dans un GitHub Codespace.
> Role : executer les tests lourds (200q+) des 4 pipelines RAG.
> Workflows identiques a mon-ipad, datasets identiques.

## Contexte
- Ce Codespace contient 2 workers n8n connectes au broker Redis de la VM (34.136.180.66)
- Les tests sont lances depuis ici, les resultats sont ecrits dans docs/status.json
- Le dashboard Vercel (nomos-ai.vercel.app) lit status.json via STATUS_API_URL

## Regles
1. Suivre `directives/workflow-process.md` — EXACTEMENT le meme processus que mon-ipad
2. Double analyse OBLIGATOIRE : `eval/node-analyzer.py` + `scripts/analyze_n8n_executions.py`
3. Si 3+ regressions consecutives → STOP immediat
4. Apres chaque test reussi : mettre a jour docs/status.json + git push
5. Tests SEQUENTIELS uniquement (pas de parallelisme inter-pipeline)

## Commandes
```bash
source .env.local
python3 eval/quick-test.py --questions 200 --pipeline standard
python3 eval/iterative-eval.py --label "phase2-200q"
python3 eval/run-eval-parallel.py --reset --label "phase2-full"
```

## Communication avec la VM
- Status updates : git push → VM Claude Code lit via git pull
- Stop signal : si le fichier `STOP` existe a la racine → arreter tous les tests
- Dashboard : status.json est lu par le serveur status de la VM (port 3001)

## Datasets
Phase 1 : datasets/phase-1/ (200q)
Phase 2 : datasets/phase-2/ (hf-1000.json)
Phase 3+ : datasets/phase-3/
