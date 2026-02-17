# Nomos AI — Dashboard Live (Codespace/Vercel)

> Ce Claude Code CLI gere le dashboard technique en temps reel.
> Role : afficher les metriques live des 4 pipelines RAG + multi-source.
> Donnees lues depuis status.json (VM) et data.json (historique complet).

## Contexte
- Dashboard Next.js lisant docs/status.json + docs/data.json
- SSE streaming pour mise a jour temps reel (polling 10s)
- Multi-source : affiche l'etat de mon-ipad, rag-website, rag-data-ingestion
- Pas de backend lourd : site statique avec API routes legeres

## Sources de donnees
| Source | Endpoint | Contenu |
|--------|----------|---------|
| status.json | VM:5678/webhook/nomos-status | Phase, accuracy, blockers |
| data.json | Local (1.2MB) | Historique 42 iterations, 232 questions |
| SSE stream | /api/dashboard/stream | Mises a jour temps reel |

## Regles
1. Le dashboard est READ-ONLY — ne jamais modifier les donnees source
2. Fallback : si VM inaccessible, lire docs/status.json local
3. Apres chaque modification : git push pour deploiement Vercel/GH Pages
4. Tester le build avant push : `cd website && npm run build`

## Deploiement
- **Vercel** : auto-deploy sur push vers main
- **GH Pages** : public/dashboard.html (version statique)
