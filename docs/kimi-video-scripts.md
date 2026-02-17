# Kimi Capabilities Test + Video Scripts — 2026-02-17

## KIMI STATUS REPORT

### Installation
- Binary: `/home/termius/.local/bin/kimi` and `/home/termius/.local/bin/kimi-code`
- Version: **1.12.0**
- Auth: OAuth (token stored in `~/.kimi/credentials/kimi-code.json`) — token VALID
- Model: `kimi-for-coding` (kimi-code provider, 262K context, supports thinking/image/video)

### Issue Found: Broken MCP Servers in `~/.kimi/mcp.json`
Kimi fails by default because `~/.kimi/mcp.json` references 3 MCP servers that cannot connect:
- `neo4j`: binary `neo4j-mcp` not found → Connection closed
- `n8n`: binary `n8n-mcp-server` not found → Connection closed
- `supabase`: HTTP endpoint returns 401 Unauthorized

### Workaround (WORKING)
Pass an empty MCP config file to override the default:
```bash
echo '{"mcpServers":{}}' > /tmp/empty-mcp.json
/home/termius/.local/bin/kimi --quiet --mcp-config-file /tmp/empty-mcp.json -p "your prompt"
```

### Fix Recommendation
Either:
1. Remove broken entries from `~/.kimi/mcp.json`
2. Or always use `--mcp-config-file /tmp/empty-mcp.json` flag

### Kimi Capabilities Confirmed
- Text generation: YES (tested, fast responses)
- Thinking mode: Available (--thinking flag)
- Max context: 262,144 tokens
- Supports: image_in, video_in (multimodal)
- CLI modes: quiet, print, interactive, ACP server, Web UI

---

## VIDEO SCRIPTS — 4 SECTEURS

### SECTEUR 1 — BTP / CONSTRUCTION

**Script Vidéo — Chatbot RAG IA pour le BTP**

| Durée | VOIX OFF | TEXTE ÉCRAN |
|-------|----------|-------------|
| 0-5s | « Vos équipes perdent 3 heures par jour à chercher des informations ? » | [3H/JOUR PERDUES] Recherche d'infos technique |
| 5-12s | « Notre IA RAG répond en 3 secondes. Un DTU, un CCAP, un plan de chantier : elle trouve l'info exacte dans vos milliers de documents. » | [RÉPONSE EN 3 SECONDES] DTU • CCAP • Plans • Vos documents internes |
| 12-19s | « Résultat : moins d'erreurs de devis, zéro oubli de norme, et vos chantiers livrés dans les délais. » | [ROI CONCRET] Devis plus justes / Conformité garantie / Délais tenus |
| 19-25s | « Les ETI du BTP gagnent 20% de productivité. Vos équipes se concentrent sur l'exécution, pas la paperasse. » | [+20% PRODUCTIVITÉ] BTP & Construction |
| 25-30s | « Démo personnalisée sur vos propres documents. Réservez votre créneau. » | [DÉMO GRATUITE] votresite.fr/demo — 30 min, vos docs, vos cas d'usage |

**Notes production:**
- Visuels: archives papier/encombré → interface IA épurée → chantier fluide
- Musique: rythmée, ambiance transformation digitale
- Ton: assuré, factuel, orienté résultat
- Angle par persona: DAF ("+20% productivité"), DG ("livraison délais"), DSI ("intégration sécurisée")

---

### SECTEUR 2 — INDUSTRIE / MANUFACTURING

**Script Vidéo — Chatbot RAG IA Industrie**

| Durée | VOIX OFF | TEXTE ÉCRAN | VISUEL |
|-------|----------|-------------|--------|
| 0-5s | « Vos équipes perdent 2 heures par jour à chercher des informations techniques ? » | 2h/jour perdues → Coût caché : 15 000€/an par technicien | Technicien frustré devant classeurs |
| 5-11s | « Notre IA donne la réponse en 3 secondes. Manuels, procédures ATEX, fiches sécurité : tout est accessible instantanément. » | 3 secondes vs 2 heures | Écran tablette avec réponse chatbot + logo ATEX |
| 11-17s | « Maintenance préventive : vos techniciens ont les bonnes procédures, immédiatement. Résultat : 30% moins de pannes imprévues. » | −30% de pannes / MTTR réduit de moitié | Technicien terrain, téléphone, machine |
| 17-23s | « Qualité et conformité : une non-conformité ? Le chatbot trace la procédure corrective en temps réel. Zéro retard de certification. » | Zéro retard audit / 100% traçable | Interface chatbot + badge ISO |
| 23-28s | « Déployé en 48h. ROI mesurable dès le premier mois. Demandez votre démo gratuite. » | ROI 1er mois / [NomProduit].fr/demo | Logo + URL + bouton DÉMO GRATUITE |

**Notes production:**
- Musique: percussive, rythmée industrielle, crescendo
- Couleurs: fond sombre (charbon), accents jaune sécurité / orange industriel
- Format: 1:1 LinkedIn + 9:16 Stories/Reels

---

### SECTEUR 3 — FINANCE / BANQUE

**Script Vidéo — Chatbot IA Finance**

| Durée | VOIX OFF | TEXTE ÉCRAN | Direction visuelle |
|-------|----------|-------------|-------------------|
| 0-5s | « Vos équipes passent encore des heures à fouiller vos réglementations ? » | [Votre temps, c'est de l'argent.] | Bureau financier, piles de documents |
| 5-12s | « Notre IA RAG répond en 3 secondes sur AMF, BCE, Bâle III. KYC validé 4 fois plus vite. Zéro erreur de conformité. » | [AMF • BCE • Bâle III] / [KYC : -75% de temps] / [Conformité : 0 erreur] | Interface chatbot, chiffres en grands caractères |
| 12-19s | « Contrats clients, rapports d'audit, analyses financières : tout devient accessible, instantanément. » | [100% de vos documents] / [1 question = 1 réponse] | Défilement : contrat → audit → analyse |
| 19-26s | « Résultat ? Vos équipes gagnent 12 heures par semaine. Vous réduisez vos risques réglementaires de 60%. » | [+12h/semaine gagnées] / [-60% de risque] | Graphique en hausse, décideur serein |
| 26-30s | « Démonstration personnalisée. Cette semaine. » | [Réservez votre démo →] / [iafinance.fr/demo] | Logo + URL + bouton CTA |

**Notes production:**
- Ton: sobre, institutionnel, confiance + performance
- Musique: piano minimaliste + sous-couche électronique discrète, crescendo aux chiffres
- Palette: bleu nuit, blanc cassé, accents dorés subtils

---

### SECTEUR 4 — JURIDIQUE

**Script Vidéo — Chatbot IA Juridique**

| Durée | VOIX OFF | TEXTE ÉCRAN |
|-------|----------|-------------|
| 0-5s | « Vos juristes passent 40% de leur temps à chercher des informations. » | 40% du temps perdu en recherche |
| 5-10s | « Interrogez la jurisprudence en 3 secondes. 15 heures de recherche économisées par dossier. » | Jurisprudence instantanée \| -15h par dossier |
| 10-15s | « Veille réglementaire RGPD et droit des sociétés en temps réel. Zéro sanction évitée. » | Conformité temps réel \| Zéro risque |
| 15-20s | « Contrats types et clauses générés instantanément. ROI : +35% de productivité juridique. » | Contrats instantanés \| +35% productivité |
| 20-30s | « Déjà 80 cabinets et directions juridiques nous font confiance. Démo personnalisée sous 48h. » | 80+ cabinets équipés / Démonstration sous 48h / [CTA] → RDV JURIDIA.FR/DEMO |

**Tagline:** "Juridia. Votre droit, instantanément."

**Notes production:**
- Ton: sobre, institutionnel, couleurs marine/gris/blanc
- Musique: minimaliste, pas d'effets visuels tape-à-l'oeil
- Rythme: coupes nettes, un message = une image

---

## RÉSUMÉ MÉTRIQUES ROI PAR SECTEUR

| Secteur | Gain temps | Gain productivité | Réduction risque |
|---------|-----------|------------------|-----------------|
| BTP | -3h/jour recherche | +20% productivité | Zéro oubli norme |
| Industrie | -2h/jour (-15k€/an/tech) | -30% pannes | Zéro retard certification |
| Finance | +12h/semaine/équipe | KYC 4x plus vite | -60% risque réglementaire |
| Juridique | -15h/dossier (-40% temps) | +35% productivité | Zéro sanction |

---

## COMMANDE KIMI (pour reproduire)

```bash
echo '{"mcpServers":{}}' > /tmp/empty-mcp.json
/home/termius/.local/bin/kimi --quiet --mcp-config-file /tmp/empty-mcp.json -p "votre prompt"
```
