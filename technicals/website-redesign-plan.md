# Website Redesign Plan — Apple MacBook Pro Style B2B

> Last updated: 2026-02-18T22:01:57+01:00

> Généré par agent Plan (session 12 — 17 fév 2026)
> Sources : audit complet 25 composants + best practices recherche

## Architecture cible

### Sections (ordre page)
1. **Hero** — full-screen cinéma, parallax orbs, titre statique puissant
2. **SectorsSection** — Apple variant-selector tabs (1 secteur actif à la fois)
3. **LiveEvalSection** — scores live n8n, jauges animées, gamification
4. **HowItWorks** — timeline verticale animée
5. **Footer**

### Principes Apple MacBook Pro
- Dark mode par défaut, toggle light/dark
- Typographie : grandes tailles, tracking négatif, Inter/SF Pro
- Sections scroll-reveal (Framer Motion `whileInView`)
- ZÉRO hover-only content — tout visible directement
- CTA clair et unique par section

---

## 20 fichiers à créer/modifier (priorité)

### Priorité 1 — Fondations visuelles
| Fichier | Action | Complexité |
|---------|--------|------------|
| `globals.css` | Ajouter variables light mode `[data-theme="light"]` | Medium |
| `layout.tsx` | `data-theme` + `suppressHydrationWarning` | Low |
| `hooks/useTheme.ts` | NEW — localStorage + `document.documentElement.dataset.theme` | Low |
| `components/ui/ThemeToggle.tsx` | NEW — Sun/Moon toggle | Low |
| `components/ui/ScrollReveal.tsx` | NEW — wrapper Framer Motion `whileInView` | Low |
| `components/landing/Hero.tsx` | REPLACE — titre statique, parallax, scroll indicator | Medium |

### Priorité 2 — Secteurs business-first
| Fichier | Action | Complexité |
|---------|--------|------------|
| `lib/constants.ts` | Ajouter `pitchLine` + `roiHeadline` par secteur | Low |
| `types/sector.ts` | Ajouter champs `pitchLine`, `roiHeadline` | Low |
| `components/ui/SectorSelector.tsx` | NEW — tab strip Apple-style | Medium |
| `components/landing/SectorCard.tsx` | REPLACE — métriques toujours visibles, ROI affiché | Medium |
| `components/landing/BentoGrid.tsx` → `SectorsSection.tsx` | REPLACE — AnimatePresence tabs | High |

### Priorité 3 — Live eval gamifiée
| Fichier | Action | Complexité |
|---------|--------|------------|
| `types/metrics.ts` | NEW — `PipelineMetric`, `LiveMetricsData`, `ConnectionStatus` | Low |
| `hooks/useLiveMetrics.ts` | NEW — SSE consumer `/api/dashboard/stream`, auto-reconnect | Medium |
| `hooks/useCountUp.ts` | NEW — `requestAnimationFrame` count-up animé | Low |
| `components/ui/AccuracyGauge.tsx` | NEW — SVG ring + count-up (extrait de PipelineCards) | Medium |
| `components/ui/LiveBadge.tsx` | NEW — "EN DIRECT" + timestamp | Low |
| `components/landing/LiveEvalSection.tsx` | NEW — remplace TrustSection | High |

### Priorité 4 — Polish
| Fichier | Action | Complexité |
|---------|--------|------------|
| `components/landing/HowItWorks.tsx` | REPLACE — timeline verticale SVG animée | Medium |
| `components/layout/Header.tsx` | MODIFY — transparent sur hero, ThemeToggle, CTA | Low |
| `app/page.tsx` | MODIFY — Server Component, import LiveEvalSection | Low |

---

## Données secteurs enrichies (constants.ts)

```typescript
// BTP:
pitchLine: "Conformité normative. En 3 secondes.",
roiHeadline: "2.4M EUR/an · −70% temps de recherche"

// Industrie:
pitchLine: "Zéro arrêt non planifié. Procédures à la demande.",
roiHeadline: "2.5M EUR/an · −40% pannes non prévues"

// Finance:
pitchLine: "Conformité réglementaire. Réponse en 2 secondes.",
roiHeadline: "3.5M EUR/an · −80% temps de calcul réglementaire"

// Juridique:
pitchLine: "Jurisprudence. Contrats. Réponse sourcée.",
roiHeadline: "3.2M EUR/an · −60% temps de recherche juridique"
```

---

## Stratégie live metrics

- **Source** : SSE endpoint `/api/dashboard/stream` (déjà implémenté)
- **Hook** : `useLiveMetrics` — EventSource + auto-reconnect exponentiel (max 60s)
- **Fallback** : valeurs statiques `constants.ts` si offline
- **Animation** : count-up 0→78.1% en 1200ms à l'entrée viewport
- **Gamification** : stamp PASS/FAIL après animation, glow vert si accuracy > target

---

## Variables CSS light mode

```css
[data-theme="light"] {
  --bg: #f5f5f7;
  --s1: #ffffff;
  --s2: #f2f2f2;
  --s3: #e8e8ed;
  --tx: #1d1d1f;
  --tx2: #6e6e73;
  --bd: rgba(0, 0, 0, 0.06);
  --glass: rgba(255, 255, 255, 0.72);
}
```

---

## Ce qu'on NE TOUCHE PAS

- Tous les composants `modal/` (TermiusModal — parfait tel quel)
- Tous les composants `dashboard/` (sauf PhaseExplorer + QuestionViewer stubs → à implémenter)
- Toutes les APIs (`api/chat`, `api/dashboard`, `api/dashboard/stream`)
- Stores, hooks chat, lib/api.ts, lib/parseResponse.ts

---

## Séquence gamification LiveEvalSection

```
t=0ms    : Titre "La preuve par les chiffres" fade-up
t=200ms  : LiveBadge "EN DIRECT · il y a 2min" appear
t=400ms  : Score global compte 0→78.1 en 1200ms
t=1600ms : Badge "PASS" scale-in avec spring (effet tampon)
t=1800ms : 4 jauges pipeline fillent simultanément
t=2000ms : Chiffres pipelines comptent up
t=2200ms : Tags benchmarks cascade (30ms stagger)
t=2400ms : CTA "Voir le dashboard" fade-in
```

---

## Mapping secteur → pipeline (pour accuracy live)

| Secteur | Pipeline affiché | Accuracy actuelle |
|---------|-----------------|-------------------|
| BTP | Standard RAG | 85.5% ✅ |
| Industrie | Quantitative | 78.3% ⚠️ |
| Finance | Orchestrator | 80.0% ✅ |
| Juridique | Graph | 68.7% ⚠️ |
| **Global** | **Overall** | **78.1% ✅** |

---

*Dernière mise à jour : 2026-02-17 — Session 12*
