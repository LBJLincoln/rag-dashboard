# UX/Design Brief — Multi-RAG Orchestrator Website

> Last updated: 2026-02-19T15:30:00+01:00

## Next.js 14 + Tailwind CSS — Enterprise AI Product for French Market

> Research conducted: 2026-02-17
> Scope: rag-website repo (Next.js 14, 4 sectors: BTP, Industrie, Finance, Juridique)
> Target: ETI and Grands Groupes francais

---

## 1. DESIGN PHILOSOPHY — Core Principles

### 1.1 Apple MacBook Pro Pattern Analysis

Apple's product page for the MacBook Pro reveals a precise design grammar applicable to any high-value technical product:

**Progressive Revelation Structure:**
1. Emotional hook — full-bleed visual + minimal headline (< 8 words)
2. Capability overview — feature highlights anchored to concrete outcomes
3. Technical deep-dives — benchmarks expressed as relative multipliers ("6x faster")
4. Integration ecosystem — how it connects to existing workflows
5. Conversion — low-friction CTA, not a form

**Copy philosophy:** "Conversational specificity." Never generic claims. Always a tangible number or outcome. "Repond en 11 secondes" beats "reponse instantanee". "Economise 15h/semaine" beats "gain de productivite".

**Visual grammar:**
- Generous whitespace as a signal of confidence and premium positioning
- Typography hierarchy through size and weight, NOT color
- One visual language per section — never mix metaphors
- Cinematic micro-animations that demonstrate the product instead of decorating it

**Principle to extract:** The MacBook Pro page never argues. It demonstrates. Each section makes a claim, then immediately proves it visually. The enterprise AI website must do the same: claim → visual proof → metric.

### 1.2 B2B SaaS Enterprise AI Pattern (Glean / Notion AI / Perplexity Enterprise)

From analysis of top-performing enterprise AI landing pages in 2025-2026:

**The 3-Stakeholder Rule:** Enterprise decisions involve 3-6 people. The page must speak to:
- The CISO/DSI: security, RGPD, AI Act compliance, data sovereignty
- The IT Admin/Chef de projet: SSO, API, integration with existing stack
- The business end-user/Direction: ROI, time saved, concrete use cases

**Trust architecture (in order of appearance):**
1. Recognizable client logos above the fold or in first scroll
2. Quantified outcomes ("340% ROI median, 6 months payback")
3. Compliance badges (RGPD, AI Act, ISO 27001, HDS if applicable)
4. Named testimonials from persons with visible titles

**CTA philosophy:** Never "Essai gratuit" first. For enterprise: "Voir une demonstration" or "Parler a un expert" reduces friction while qualifying intent.

**The interactive proof principle:** For an AI chatbot product, the most powerful conversion element is a live chatbot demo embedded in the page. Users experience the product while evaluating it. This is non-negotiable for rag-website.

### 1.3 French Enterprise B2B Specifics

The French enterprise market (ETI/Grands Groupes) has distinct expectations:
- Formal tone without being cold: "vous" register throughout, but approachable vocabulary
- ROI arguments must be backed by named sources or recognized firms (Deloitte, Capgemini, BPI France)
- Legal/compliance framing is not a weakness — it is the opening argument (especially post AI Act)
- Sector-specific vocabulary signals expertise: CCTP for BTP, ICPE for Industrie, ACPR for Finance, AJ for Juridique
- Pilot/POC offer converts better than free trial in French enterprise market

---

## 2. COLOR PALETTE — Apple-Aligned, Enterprise-Grade

### 2.1 Primary Palette (Tailwind tokens to define in tailwind.config.ts)

```typescript
// tailwind.config.ts — extend colors
colors: {
  // Base system — mirrors Apple semantic color approach
  background: {
    primary: '#000000',    // dark mode default
    secondary: '#0A0A0A',  // section backgrounds
    tertiary: '#111111',   // card backgrounds
    elevated: '#1C1C1E',   // modals, elevated surfaces (Apple iOS dark)
  },
  // Light mode equivalents
  surface: {
    primary: '#FFFFFF',
    secondary: '#F5F5F7',  // Apple.com light gray (exact match)
    tertiary: '#E8E8ED',
    elevated: '#FFFFFF',
  },
  // Brand colors — one primary, restrained accents
  brand: {
    primary: '#0071E3',    // Apple blue (exact hex from apple.com)
    hover: '#0077ED',
    active: '#006EDB',
  },
  // Sector accent colors (used ONLY for sector identity badges/tags)
  sector: {
    btp: '#E8A838',         // construction amber
    industrie: '#3B82F6',   // industrial blue
    finance: '#10B981',     // finance green
    juridique: '#8B5CF6',   // legal purple
  },
  // Text hierarchy — mirrors Apple's semantic labels
  text: {
    primary: '#F5F5F7',    // dark mode (Apple exact)
    secondary: '#86868B',  // dark mode secondary (Apple exact)
    tertiary: '#6E6E73',   // dark mode tertiary
    // Light mode
    'primary-light': '#1D1D1F',   // Apple.com dark text (exact)
    'secondary-light': '#6E6E73',
  },
  // Status/metrics colors (gamification dashboard)
  status: {
    pass: '#30D158',      // Apple green
    fail: '#FF453A',      // Apple red
    warning: '#FFD60A',  // Apple yellow
    info: '#0A84FF',     // Apple blue (dark mode)
  },
}
```

### 2.2 Gradient Strategy

For hero sections and premium accents only. Never on body text.

```css
/* Hero gradient — subtle, not neon */
.gradient-hero {
  background: radial-gradient(
    ellipse 80% 50% at 50% -20%,
    rgba(0, 113, 227, 0.15),
    transparent
  );
}

/* Sector card gradients */
.gradient-btp    { background: linear-gradient(135deg, #E8A838 0%, #D97706 100%); }
.gradient-industrie { background: linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%); }
.gradient-finance   { background: linear-gradient(135deg, #10B981 0%, #047857 100%); }
.gradient-juridique { background: linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%); }
```

### 2.3 Design Token Naming (Tailwind v4 CSS custom properties)

```css
:root {
  --color-bg-primary: #000;
  --color-bg-secondary: #0A0A0A;
  --color-text-primary: #F5F5F7;
  --color-text-secondary: #86868B;
  --color-brand: #0071E3;
  --radius-card: 18px;        /* Apple card radius */
  --radius-button: 980px;     /* Apple pill button */
  --spacing-section: 120px;   /* Apple-style section breathing room */
}

[data-theme="light"] {
  --color-bg-primary: #FFFFFF;
  --color-bg-secondary: #F5F5F7;
  --color-text-primary: #1D1D1F;
  --color-text-secondary: #6E6E73;
}
```

---

## 3. TYPOGRAPHY — Apple-Aligned

### 3.1 Font Stack

Apple uses SF Pro (system font, not available for web). The closest web alternative that matches Apple's aesthetic:

```typescript
// tailwind.config.ts — fontFamily
fontFamily: {
  sans: [
    '-apple-system',           // macOS/iOS: SF Pro automatically
    'BlinkMacSystemFont',      // Chrome on macOS
    '"Inter Variable"',        // Best SF Pro substitute for web
    '"Inter"',
    'system-ui',
    'sans-serif',
  ],
  mono: [
    '"JetBrains Mono"',
    '"Fira Code"',
    'Consolas',
    'monospace',
  ],
}
```

**Install:** `@next/font` with Inter from Google Fonts (Variable font for weight animations).

```typescript
// app/layout.tsx
import { Inter } from 'next/font/google'
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})
```

### 3.2 Type Scale (mirroring Apple's hierarchy)

```typescript
// tailwind.config.ts — fontSize extensions
fontSize: {
  // Display — hero headlines only
  'display-2xl': ['clamp(3.5rem, 8vw, 7rem)',    { lineHeight: '1.05', letterSpacing: '-0.04em', fontWeight: '700' }],
  'display-xl':  ['clamp(2.5rem, 5vw, 5rem)',    { lineHeight: '1.08', letterSpacing: '-0.03em', fontWeight: '700' }],
  'display-lg':  ['clamp(2rem, 4vw, 3.5rem)',    { lineHeight: '1.1',  letterSpacing: '-0.025em', fontWeight: '600' }],
  // Section headings
  'heading-xl':  ['clamp(1.75rem, 3vw, 2.5rem)', { lineHeight: '1.2',  letterSpacing: '-0.02em', fontWeight: '600' }],
  'heading-lg':  ['clamp(1.5rem, 2.5vw, 2rem)',  { lineHeight: '1.25', letterSpacing: '-0.015em', fontWeight: '600' }],
  'heading-md':  ['1.5rem',                       { lineHeight: '1.3',  letterSpacing: '-0.01em', fontWeight: '500' }],
  // Body
  'body-xl':     ['1.25rem',                      { lineHeight: '1.6' }],
  'body-lg':     ['1.125rem',                     { lineHeight: '1.6' }],
  'body-md':     ['1rem',                         { lineHeight: '1.65' }],
  'body-sm':     ['0.875rem',                     { lineHeight: '1.5' }],
  // UI labels
  'label-lg':    ['0.875rem',                     { lineHeight: '1', letterSpacing: '0.08em', fontWeight: '600', textTransform: 'uppercase' }],
  'label-md':    ['0.75rem',                      { lineHeight: '1', letterSpacing: '0.1em', fontWeight: '600', textTransform: 'uppercase' }],
}
```

### 3.3 Typography Rules

- Headlines: weight 700, negative letter-spacing, line-height tight (1.05-1.1)
- Body: weight 400, normal letter-spacing, line-height relaxed (1.6-1.65)
- Labels/tags: weight 600, UPPERCASE, wide letter-spacing (0.08-0.1em)
- Max line length: 65ch for body text (readability)
- Apple rule: text alignment LEFT for technical content, CENTER only for hero headings

---

## 4. COMPONENT ARCHITECTURE (Next.js 14 App Router)

### 4.1 Folder Structure

```
/app
  layout.tsx              # ThemeProvider, fonts, global styles
  page.tsx                # Homepage (assembles section components)
  /[sector]
    page.tsx              # Sector landing (BTP, industrie, finance, juridique)
  /demo
    page.tsx              # Interactive RAG demo page

/components
  /layout
    Navbar.tsx            # Sticky nav with dark/light toggle
    Footer.tsx
    ThemeToggle.tsx       # Apple-style animated toggle
  /sections
    Hero.tsx              # Full-bleed hero with live demo teaser
    SectorGrid.tsx        # 4 sector cards with hover animations
    HowItWorks.tsx        # 3-step process visualization
    MetricsBar.tsx        # Live accuracy metrics (gamified)
    Testimonials.tsx      # Enterprise logos + quotes
    ComplianceBadges.tsx  # RGPD, AI Act, ISO 27001
    LiveDemo.tsx          # Embedded RAG chat interface
    PricingCTA.tsx        # Pilot offer CTA section
  /ui
    Button.tsx            # Primary, secondary, ghost variants
    Card.tsx              # Glass morphism card
    Badge.tsx             # Sector/status badges
    MetricCounter.tsx     # Animated number counter
    ProgressBar.tsx       # Gamified accuracy bar
    SectorTag.tsx         # Color-coded sector identifier
  /dashboard
    AccuracyGauge.tsx     # Circular gauge (gamification)
    PipelineScoreboard.tsx # 4-pipeline live scores
    PhaseGate.tsx         # Pass/fail gate visual
    LiveMetricsTicker.tsx # Real-time execution counter

/lib
  theme.ts               # Theme utilities
  animations.ts          # Framer Motion variants
  sectors.ts             # Sector config (colors, copy, datasets)

/hooks
  useTheme.ts            # next-themes wrapper
  useAnimatedCounter.ts  # Number animation hook
  useLiveMetrics.ts      # Polls n8n status.json webhook
```

### 4.2 Key Component Specifications

#### Navbar.tsx
```tsx
// Behavior: transparent on scroll-top, backdrop-blur on scroll
// Sticky: position: fixed, z-50
// Height: 44px (Apple nav height)
// Logo: left-aligned
// Links: center (max 5 items)
// CTA button: right ("Demander une demo")
// Theme toggle: far right, before CTA
// Mobile: hamburger with slide-in drawer

// Tailwind classes:
// fixed top-0 w-full z-50 transition-all duration-300
// bg-transparent (top) → bg-black/80 backdrop-blur-xl (scrolled)
```

#### ThemeToggle.tsx — Apple-Style
```tsx
// Sun/moon icon swap with Framer Motion
// Persist in localStorage via next-themes
// Smooth 300ms color transition on entire document
// Zero flicker on SSR (suppressHydrationWarning on <html>)

import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from 'next-themes'

// Toggle button: 40x40px pill, border-subtle
// Icon animates: initial={{ rotate: -30, opacity: 0 }} → animate={{ rotate: 0, opacity: 1 }}
// Transition: spring, stiffness: 200, damping: 15
```

#### Hero.tsx
```tsx
// Full viewport height (100svh)
// Background: dark gradient + subtle grid pattern
// Structure:
//   - Eyebrow label: "Multi-RAG Orchestrator — IA Sectorielle"
//   - H1: max 8 words, weight 700, clamp font-size
//   - Subheadline: 1-2 sentences, outcome-focused
//   - CTA pair: primary "Voir la demonstration" + ghost "En savoir plus"
//   - Trust strip: 5 client logos, muted/desaturated
//   - Hero visual: animated RAG query→answer sequence (Lottie or CSS)

// Animation: entrance with staggered fade-up
// Performance: above-fold only, no video autoplay
```

#### LiveDemo.tsx — Core Conversion Component
```tsx
// Embedded chat interface that calls the real RAG webhook
// Sector selector: 4 tabs (BTP | Industrie | Finance | Juridique)
// Pre-loaded example questions per sector (see section 5)
// Shows: query → retrieval → sources → answer
// Displays: pipeline used, accuracy score, response time
// Mobile-friendly: full-width on <768px

// This is the #1 conversion element. The user experiences the product.
// Calls: /api/demo → proxies to n8n webhook (no CORS, hides API key)
```

#### PipelineScoreboard.tsx — Gamified Dashboard
```tsx
// 4 rows, one per pipeline
// Columns: Pipeline name | Accuracy | Status | Trend
// Accuracy: animated progress bar + percentage
// Status: green PASS badge / red FAIL badge / yellow IN PROGRESS
// Trend: mini sparkline (last 10 executions)
// Real-time: polls /api/status every 30s (n8n Dashboard Status API webhook)
// Gaming aesthetic: subtle glow on PASS, pulsing on active execution
```

---

## 5. SECTION STRUCTURE — Page Layout

### 5.1 Homepage Flow

```
[NAVBAR] — sticky, transparent → glass on scroll

[HERO]
  Eyebrow: "Concu pour les ETI et Grands Groupes francais"
  H1: "L'IA qui comprend votre metier"
  Sub: "Quatre pipelines RAG specialises. Une reponse precise en 11 secondes."
  CTA: [Voir la demonstration] [Choisir votre secteur]
  Trust: logos clients (blurred/silhouetted if no real clients yet)
  Visual: animated query→answer demonstration

[METRICS BAR] — full-width, dark background
  4 animated counters:
  - 85.5% accuracy Standard RAG
  - 80% accuracy Orchestrator
  - <2s response time
  - 4 secteurs couverts

[SECTOR GRID] — "Votre secteur, vos documents, vos reponses"
  4 cards in 2x2 grid (desktop) / 1 column (mobile)
  Each card: sector icon + name + 3 use cases + CTA "Explorer"
  Hover: lift shadow + sector color glow

[HOW IT WORKS] — 3 steps
  1. Posez votre question (your document vocabulary)
  2. 4 pipelines analysent simultanement
  3. L'Orchestrator selectionne la meilleure reponse
  Visual: animated diagram of the 4-pipeline architecture

[LIVE DEMO] — "Essayez maintenant"
  Sector tabs + chat interface + real results
  Below demo: "Resultats de vos questions traites en temps reel"

[METRICS DASHBOARD] — Gamified scoreboard
  4 pipeline scores with pass/fail gates
  Phase gate progression bar
  "Derniere mise a jour: il y a 2 minutes"

[TRUST / COMPLIANCE]
  RGPD badge + AI Act conformite + data sovereignty
  "Vos donnees restent en Europe"
  "Aucun entrainement sur vos documents"

[TESTIMONIALS / SOCIAL PROOF]
  Logos of recognizable French enterprises or sectors
  2-3 pull quotes if available

[CTA SECTION] — "Pilot en 2 semaines"
  Pricing/offer: POC offert, puis abonnement mensuel
  Form: 3 fields maximum (Nom, Email pro, Secteur)
  Alternative: "Planifier un appel de 30 minutes"

[FOOTER]
```

### 5.2 Sector Landing Page Flow (ex: /btp)

```
[NAVBAR]

[SECTOR HERO]
  Badge: "BTP / Construction"
  H1: sector-specific headline (see section 6)
  Sub: sector pain point + solution
  CTA: "Voir les cas d'usage BTP"

[PAIN POINTS] — "Les defis quotidiens de votre secteur"
  3-4 specific problems with BTP vocabulary

[USE CASES] — "Ce que l'IA fait pour vous"
  6 cards: specific BTP tasks the RAG handles

[LIVE DEMO] — pre-loaded with BTP example questions

[DATASETS] — "Trained on your universe"
  Icons/logos of: CCTP, RE2020, DTU, OPPBTP, etc.

[ROI CALCULATOR] — simple interactive widget
  Input: team size, hours/week on document research
  Output: hours saved/week, annual cost savings

[CTA] — "Demarrer un pilot BTP"
```

---

## 6. SECTOR-SPECIFIC COPY & MESSAGING

### 6.1 BTP / Construction

**Target persona:** Directeur Technique, Conducteur de Travaux, Chef de Projet BTP in ETI (50-500 employees)

**Primary pain:** "Je passe 3h par semaine a chercher dans les DTU, CCTP et RE2020. Je rate des clauses. Ca me coute des penalites."

**Hero headline:** "Vos normes BTP, reponses en 11 secondes"

**Subheadline:** "Interrogez directement vos CCTP, DTU, RE2020 et fiches OPPBTP. Fini les recherches manuelles. Votre conformite, garantie."

**3 Value Props:**

| Probleme | Solution | Metrique |
|----------|----------|----------|
| Recherche documentaire manuelle | RAG interroge vos 500+ documents instantanement | -15h/semaine par equipe |
| Risque de non-conformite RE2020 | Alertes automatiques sur changements reglementaires | Evite 1 penalite = 5 000 € |
| DOE et rapports chronophages | Generation assistee des dossiers d'ouvrage | -60% temps redactionnel |

**Sector-specific vocabulary to use:** CCTP, DTU, RE2020, OPPBTP, PLANETE CHANTIER, Maison individuelle, Dossier d'ouvrage execute (DOE), Maitre d'ouvrage, OPC, DICT, Plan de Prevention, BIM, etancheite, accessibilite PMR, RT 2020

**ROI argument (sourced):** "Une PME BTP de 20 employes economise en moyenne 12 000 €/an en automatisant la gestion documentaire. Une penalite evitee = 2 ans d'abonnement rentabilises." (Source: analyse denisatlan.fr, 200 deploiements PME 2022-2025)

**Trust signal:** "Conforme aux referentiels OPPBTP et QUALIBAT"

**Demo question examples:**
- "Quelles sont les exigences de la RE2020 pour les batiments de bureaux ?"
- "Quels sont les DTU applicables a l'etancheite de toiture terrasse ?"
- "Resume les obligations DICT pour ce chantier de terrassement."

**CTA:** "Demarrer un pilot BTP gratuit — 14 jours"

---

### 6.2 Industrie / Manufacturing

**Target persona:** Responsable Maintenance, DSI Industrie, Directeur Production in industrial ETI

**Primary pain:** "Mes techniciens cherchent dans 200 manuels constructeurs en papier. Chaque arret non-planifie coute 50 000 €."

**Hero headline:** "Vos manuels techniques, accessibles en 8 secondes"

**Subheadline:** "Un chatbot qui connait vos ICPE, plans AMDEC et procedures ISO mieux que vos equipes. Maintenance predictive. Zero temps d'arret subi."

**3 Value Props:**

| Probleme | Solution | Metrique |
|----------|----------|----------|
| Manuels constructeurs non structures | RAG indexe vos 1000+ pages techniques | 40% de requetes resolues sans appel constructeur |
| Pannes non-anticipees | Analyse croisee AMDEC + historique capteurs | -30% pannes (ref. Schneider Electric) |
| Conformite ICPE chronophage | Veille automatique normes + alertes derogations | -18h/mois par responsable HSE |

**Sector-specific vocabulary:** ICPE, AMDEC, ISO 9001/14001/45001, plan de maintenance preventive, GMAO, ordre de travail (OT), temps moyen entre pannes (MTBF), temps moyen de reparation (MTTR), qualite six sigma, process mining, SOP (Standard Operating Procedure)

**ROI argument (sourced):** "Schneider Electric deploie l'IA sur 12 000 sites industriels : -30% de pannes, +15% efficacite energetique, 50M€/an economises. Pour une ETI : ROI moyen 5:1 des la premiere annee." (Source: Capgemini Research Institute AI in Action 2025)

**Trust signal:** "Compatible GMAO SAP PM, Maximo, Infor EAM — via API REST"

**Demo question examples:**
- "Quel est le plan de maintenance preventive recommande pour cette pompe centrifuge ?"
- "Quelles obligations ICPE s'appliquent a une installation de stockage de 500t de produits chimiques ?"
- "Resume les procedures ISO 9001 pour notre audit de certification."

**CTA:** "Planifier une demonstration technique — 30 minutes"

---

### 6.3 Finance

**Target persona:** Directeur Financier, Responsable Conformite, Risk Manager in financial ETI or department

**Primary pain:** "Mon equipe conformite passe 40% de son temps sur la veille reglementaire ACPR/AMF. Chaque erreur d'interpretation coute 7 figures."

**Hero headline:** "Conformite ACPR et IFRS, sans l'incertitude"

**Subheadline:** "Interrogez vos etats financiers, textes prudentiels et rapports AMF avec une precision de 94%. Tracabilite complete pour vos auditeurs."

**3 Value Props:**

| Probleme | Solution | Metrique |
|----------|----------|----------|
| Veille reglementaire chronophage | Alertes automatiques ACPR, AMF, BCE | -40% tickets conformite |
| Risque d'interpretation IFRS | RAG cite les paragraphes IAS/IFRS exacts avec sources | 0 ambiguite, tracabilite auditeur |
| Reporting ESG manuel | Extraction automatique metriques ESG depuis documents internes | -25% temps reporting |

**Sector-specific vocabulary:** ACPR, AMF, BCE, prudentiel, solvabilite II, IFRS 9/16/17, KYC/KYB, AML/LCB-FT, reporting COREP/FINREP, stress test, ratio CET1, due diligence, prospectus, PRIIPS, MiFID II, DORA (Digital Operational Resilience Act)

**ROI argument (sourced):** "18% des entreprises francaises constatent deja un ROI positif IA en 2025. Pour la conformite financiere: -40% de tickets repetitifs, ROI positif a 6 mois (Deloitte France, 2025). L'AI Act classe les systemes d'IA financiers comme 'haut risque': notre solution integre nativement les obligations de tracabilite."

**Trust signal:** "Conforme AI Act 2025 — Tracabilite complete — Hebergement UE — RGPD"

**Specific positioning:** In finance, the compliance angle is the OPENING argument, not the reassurance at the bottom. Lead with "Votre IA conforme AI Act, pas votre probleme" because French financial firms are actively worried about regulatory liability in 2025.

**Demo question examples:**
- "Quelles sont les exigences ACPR pour la classification des actifs a risque eleve ?"
- "Quelle est l'interpretation IFRS 16 pour un contrat de location de materiel informatique ?"
- "Resume les obligations DORA applicables a notre categorie d'etablissement."

**CTA:** "Discuter conformite avec un expert — 30 minutes"

---

### 6.4 Juridique

**Target persona:** Directeur Juridique, Avocat d'affaires, Responsable compliance in corporate legal department

**Primary pain:** "Je passe 2 heures par dossier a chercher la jurisprudence applicable. Je facture ou j'absorbe ce temps — dans les deux cas, je perds."

**Hero headline:** "Jurisprudence et contrats, analyses en 15 secondes"

**Subheadline:** "Recherche documentaire juridique avec citation exacte des sources. Droit des affaires, contrats, conformite reglementaire. L'IA qui assiste, sans jamais remplacer l'expertise."

**3 Value Props:**

| Probleme | Solution | Metrique |
|----------|----------|----------|
| Recherche jurisprudentielle manuelle | RAG indexe vos bases Legifrance, Dalloz, doctrine interne | -2h par dossier (ref. etudes LegalTech 2025) |
| Revue de contrats longue | Extraction automatique clauses critiques, flags risques | -60% temps revue premier jet |
| Veille legislative fragmentee | Alertes automatiques sur modifications codes applicables | 0 derogation manquee |

**Sector-specific vocabulary:** jurisprudence, Cour de cassation, Conseil d'Etat, droit des affaires, droit social, contrat-cadre, clause limitative de responsabilite, force majeure, nullite, rescision, code de commerce, code civil, compliance, RGPD, CNIL, CSR/CSRD, LCEN

**Critical positioning note:** The French legal profession is extremely sensitive about AI liability. The messaging MUST include: "L'IA assiste le juriste. Il reste seul responsable de l'analyse." This is not a weakness — frame it as "Notre IA est concue pour le monde juridique : elle cite toujours ses sources, signale ses limites, et vous laisse le dernier mot."

**ROI argument (sourced):** "32% des entreprises considerent la conformite IA comme un differenciateur commercial (etude 2025). Un cabinet juridique traitant 50 dossiers/mois economise 100h/mois de recherche documentaire = 10 000 €/mois au taux horaire moyen."

**Trust signal:** "Sources toujours citees — Raisonnement tracable — Aucune opinion juridique generee automatiquement"

**Demo question examples:**
- "Quelles sont les conditions de la clause de force majeure selon l'article 1218 du Code civil ?"
- "Resume la jurisprudence de la Cour de cassation sur les clauses abusives en droit de la consommation."
- "Quelles obligations CSRD s'appliquent a une ETI de 500 salaries ?"

**CTA:** "Tester avec votre documentation juridique — POC 2 semaines"

---

## 7. GAMIFIED EVALUATION DASHBOARD

### 7.1 Design Philosophy

The dashboard section is inspired by:
- **CI/CD pipeline dashboards** (GitHub Actions, CircleCI): green/red pass/fail clarity
- **ML training dashboards** (Weights & Biases, MLflow): live metric curves, epoch progress
- **Gaming scoreboards**: leaderboards with rank positions and trend arrows

**Key principle:** Every metric has a "win state" (PASS gate). Progress toward win states is visualized with animated progress bars and pulsing status indicators.

### 7.2 Component Specifications

#### PipelineScoreboard Component
```tsx
// Layout: 4 rows in a dark card (bg: #0A0A0A, border: 1px solid #2A2A2A)
// Each row:
//   [Pipeline Name] [Accuracy Bar] [Score %] [Gate Status] [Trend]
//
// Accuracy Bar:
//   - Background: rgba(255,255,255,0.05)
//   - Fill: gradient from sector color to brand blue
//   - Animation: width transition 1.5s ease-out on mount
//   - Target line: dashed vertical at threshold (85%, 70%, etc.)
//
// Gate Status badge:
//   - PASS: bg #30D158/20 text #30D158 rounded-full "PASS"
//   - FAIL: bg #FF453A/20 text #FF453A "FAIL" + subtle pulse animation
//   - RUNNING: bg #0071E3/20 text #0071E3 + spinner "EN COURS"
//
// Trend: tiny chevron up/down with color + delta value "+2.3%"
```

#### AccuracyGauge Component (circular)
```tsx
// SVG-based circular progress gauge
// Size: 120x120px
// Track: stroke-width 8, color rgba(255,255,255,0.1)
// Progress: stroke-width 8, gradient (brand-blue to status-pass)
// Animation: stroke-dashoffset transition 1.8s cubic-bezier
// Center text: large % number + small "accuracy" label
// Outer ring: subtle glow effect (box-shadow/filter: drop-shadow)
```

#### PhaseGate Progress Bar
```tsx
// Horizontal track showing 5 phases
// Each phase: circle node with label below
// Completed phases: filled, connected by solid line
// Current phase: pulsing ring animation
// Future phases: outlined, dashed connector
// This maps to the 5-phase gates defined in docs/status.json
```

#### LiveMetricsTicker
```tsx
// Scrolling ticker at bottom of dashboard section (like financial tickers)
// Items: "Standard RAG 85.5% PASS | Graph RAG 68.7% FAIL | ..."
// Smooth horizontal scroll animation (CSS @keyframes scroll-x)
// Dark strip, monospace font, green/red color coding
```

### 7.3 Real-Time Data Integration
```typescript
// hooks/useLiveMetrics.ts
// Polls: GET http://34.136.180.66:5678/webhook/nomos-status (or /api/status proxy)
// Interval: 30 seconds
// Fallback: show cached data from docs/status.json (built-in at build time)
// SWR or React Query for caching and revalidation

import useSWR from 'swr'

export function useLiveMetrics() {
  const { data, error, isLoading } = useSWR(
    '/api/status',
    fetcher,
    { refreshInterval: 30000, fallbackData: staticStatus }
  )
  return { metrics: data, error, isLoading }
}
```

---

## 8. DARK/LIGHT MODE IMPLEMENTATION

### 8.1 Stack: next-themes + Tailwind v4 + Framer Motion

```bash
npm install next-themes framer-motion
```

### 8.2 Setup

```typescript
// tailwind.config.ts
export default {
  darkMode: 'class',  // class-based, controlled by next-themes
  // ...
}
```

```typescript
// app/layout.tsx
import { ThemeProvider } from 'next-themes'

export default function RootLayout({ children }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className="transition-colors duration-300">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"          // Default: dark (enterprise/Apple aesthetic)
          enableSystem={true}          // Respect OS preference
          disableTransitionOnChange={false}
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
```

### 8.3 ThemeToggle Component

```tsx
// components/layout/ThemeToggle.tsx
'use client'
import { useTheme } from 'next-themes'
import { motion, AnimatePresence } from 'framer-motion'
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline'
import { useEffect, useState } from 'react'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Avoid hydration mismatch
  useEffect(() => setMounted(true), [])
  if (!mounted) return <div className="w-10 h-10" />  // Placeholder same size

  const isDark = theme === 'dark'

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="relative w-10 h-10 rounded-full border border-white/10
                 bg-white/5 hover:bg-white/10 transition-colors duration-200
                 flex items-center justify-center"
      aria-label={isDark ? 'Activer le mode clair' : 'Activer le mode sombre'}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={isDark ? 'moon' : 'sun'}
          initial={{ opacity: 0, rotate: -30, scale: 0.8 }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          exit={{ opacity: 0, rotate: 30, scale: 0.8 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
        >
          {isDark
            ? <SunIcon className="w-5 h-5 text-white/70" />
            : <MoonIcon className="w-5 h-5 text-gray-700" />
          }
        </motion.div>
      </AnimatePresence>
    </button>
  )
}
```

### 8.4 Global Color Transition

```css
/* app/globals.css */
* {
  @apply transition-colors duration-300;
}

/* Override for elements where transition would look odd */
.no-transition,
.no-transition * {
  transition: none !important;
}
```

---

## 9. ANIMATION STRATEGY

### 9.1 Framer Motion Variant Library

```typescript
// lib/animations.ts
export const fadeUpVariant = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1, y: 0,
    transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }
  }
}

export const staggerContainer = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1, delayChildren: 0.2 }
  }
}

export const scaleInVariant = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: {
    opacity: 1, scale: 1,
    transition: { duration: 0.5, ease: 'easeOut' }
  }
}

// Use with: viewport={{ once: true, amount: 0.2 }}
// Triggers on scroll into view, plays once
```

### 9.2 Performance Rules

- All animations triggered by `useInView` or Framer Motion `whileInView` (not on mount)
- Hero entrance: staggered fade-up, 0.1s between elements
- Cards: scale + fade on hover only (no autoplay)
- Progress bars: animate on first visibility (once)
- NO parallax on mobile (performance regression)
- `will-change: transform` only on actively animating elements
- Prefer CSS transitions over JS for color/opacity changes

### 9.3 Micro-interaction Catalog

| Element | Interaction | Animation |
|---------|-------------|-----------|
| CTA button | Hover | Subtle scale(1.02) + brightness increase |
| Sector card | Hover | translateY(-4px) + sector color glow shadow |
| Navbar | Scroll | bg-transparent → bg-black/80 backdrop-blur |
| Progress bar | Mount | Width 0% → target%, 1.5s ease-out |
| Counter | Mount | 0 → target value, 2s ease-out |
| Theme toggle | Click | Icon rotate + fade swap |
| Chat message | New message | slide-up fade-in, 0.3s |
| Pipeline badge | Status change | brief scale pulse |

---

## 10. PERFORMANCE TARGETS

### 10.1 Core Web Vitals Targets

| Metric | Target | Strategy |
|--------|--------|----------|
| LCP | < 2.5s | Hero image/animation optimized, critical CSS inlined |
| FID/INP | < 200ms | No blocking JS above fold, server components |
| CLS | < 0.1 | Font loading with `display: swap`, fixed dimensions |
| TTFB | < 600ms | Static generation (SSG) for all landing pages |

### 10.2 Implementation Priorities

```typescript
// 1. Use next/image for all images
import Image from 'next/image'

// 2. Use next/font for typography (zero layout shift)
import { Inter } from 'next/font/google'
const inter = Inter({ subsets: ['latin'], display: 'swap', preload: true })

// 3. Static generation for all sector pages
// app/[sector]/page.tsx
export function generateStaticParams() {
  return ['btp', 'industrie', 'finance', 'juridique'].map(s => ({ sector: s }))
}

// 4. Route segments: prefer static, isolate dynamic to demo/chat only
// Homepage, sector pages = static (export const dynamic = 'force-static')
// /demo/chat = dynamic (server action or API route)

// 5. Third-party scripts: load with strategy="lazyOnload"
import Script from 'next/script'
<Script src="..." strategy="lazyOnload" />
```

---

## 11. TAILWIND CONFIG SUMMARY

```typescript
// tailwind.config.ts — full configuration
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"Inter Variable"', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
      },
      colors: {
        // (see section 2.1 for full palette)
        brand: { primary: '#0071E3', hover: '#0077ED' },
        sector: {
          btp: '#E8A838',
          industrie: '#3B82F6',
          finance: '#10B981',
          juridique: '#8B5CF6',
        },
        status: {
          pass: '#30D158',
          fail: '#FF453A',
          warning: '#FFD60A',
          info: '#0A84FF',
        },
      },
      borderRadius: {
        card: '18px',
        button: '980px',
      },
      spacing: {
        section: '120px',
        'section-sm': '80px',
        'section-xs': '48px',
      },
      backdropBlur: {
        nav: '20px',
      },
      boxShadow: {
        card: '0 0 0 1px rgba(255,255,255,0.06), 0 4px 24px rgba(0,0,0,0.4)',
        'card-hover': '0 0 0 1px rgba(255,255,255,0.1), 0 8px 40px rgba(0,0,0,0.5)',
        'glow-pass': '0 0 20px rgba(48,209,88,0.3)',
        'glow-fail': '0 0 20px rgba(255,69,58,0.3)',
        'glow-brand': '0 0 20px rgba(0,113,227,0.4)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scroll-x': 'scroll-x 30s linear infinite',
        'fade-up': 'fade-up 0.6s ease-out forwards',
      },
      keyframes: {
        'scroll-x': {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}

export default config
```

---

## 12. IMPLEMENTATION CHECKLIST (Prioritized)

### P0 — Before any visual work
- [ ] Install `next-themes`, `framer-motion`, `swr`, `clsx`, `tailwind-merge`
- [ ] Configure `tailwind.config.ts` with full design tokens (section 2+3+11)
- [ ] Set up `ThemeProvider` in `app/layout.tsx`
- [ ] Implement `ThemeToggle.tsx` component
- [ ] Create `/api/status` proxy route (forwards to n8n status webhook)
- [ ] Create `/api/demo` proxy route (forwards to n8n orchestrator webhook, hides API keys)

### P1 — Core landing page
- [ ] `Hero.tsx` with animated entrance + trust strip
- [ ] `MetricsBar.tsx` with animated counters (useAnimatedCounter hook)
- [ ] `SectorGrid.tsx` with 4 sector cards
- [ ] `LiveDemo.tsx` with sector tabs + real RAG calls
- [ ] `Navbar.tsx` with scroll behavior + ThemeToggle
- [ ] Mobile responsive (test on 375px, 768px, 1280px, 1920px)

### P2 — Dashboard + trust
- [ ] `PipelineScoreboard.tsx` with real-time polling
- [ ] `PhaseGate.tsx` visualization
- [ ] `ComplianceBadges.tsx` (RGPD, AI Act, data sovereignty)
- [ ] `Testimonials.tsx` / social proof section

### P3 — Sector pages
- [ ] `/btp` page with sector-specific copy (section 6.1)
- [ ] `/industrie` page with sector-specific copy (section 6.2)
- [ ] `/finance` page with sector-specific copy (section 6.3)
- [ ] `/juridique` page with sector-specific copy (section 6.4)
- [ ] ROI calculator widget (interactive, client component)

### P4 — Polish
- [ ] Framer Motion entrance animations (stagger on scroll)
- [ ] LiveMetricsTicker (scrolling strip)
- [ ] AccuracyGauge circular SVG component
- [ ] OG image + meta tags per sector page
- [ ] Schema.org JSON-LD (SoftwareApplication + FAQPage per sector)

---

## 13. KEY DIFFERENTIATORS TO COMMUNICATE (Executive Summary)

For the developer: these are the 5 things the site must convey within 10 seconds of landing:

1. **Specificity over generality** — not "an AI chatbot" but "the RAG system that knows your CCTP, your IFRS standards, your AMDEC matrices"
2. **Measured performance** — real accuracy numbers, not promises. "85.5% on Standard RAG" with a source
3. **Sector fluency** — vocabulary signals expertise: CCTP, ACPR, ICPE, AJ. If a BTP director sees "DTU" in the first 3 words, they know this is not generic
4. **Compliance as feature, not disclaimer** — RGPD, AI Act, data sovereignty are front-and-center, not footnotes
5. **You can try it right now** — the live demo is above the fold on desktop, not behind a form

---

*Sources consulted for this brief:*
- [Apple MacBook Pro Design](https://www.apple.com/macbook-pro/)
- [SaaS Landing Page Trends 2026 — SaaSFrame](https://www.saasframe.io/blog/10-saas-landing-page-trends-for-2026-with-real-examples)
- [Glean Brand Refresh 2024](https://www.glean.com/blog/glean-brand-refresh-2024)
- [Apple Dark Mode HIG](https://developer.apple.com/design/human-interface-guidelines/dark-mode)
- [Next.js 14 + Tailwind Best Practices 2025](https://codeparrot.ai/blogs/nextjs-and-tailwind-css-2025-guide-setup-tips-and-best-practices)
- [Dark Mode Toggle Next.js — Cruip](https://cruip.com/implementing-tailwind-css-dark-mode-toggle-with-no-flicker/)
- [Gamification in Product Design 2025 — Arounda](https://arounda.agency/blog/gamification-in-product-design-in-2024-ui-ux)
- [IA & BTP France 2025 — Graneet](https://www.graneet.com/fr/article/ia-btp-2026)
- [ROI IA PME France — Denis Atlan](https://www.denisatlan.fr/barometre-ia-pme)
- [IA Juridique Guide 2025](https://cabinet-bontemps.fr/blog/intelligence-artificielle-juridique-guide-complet-pour-les-professionnels-du-droit/)
- [ROI IA Finance — Deloitte France](https://www.deloitte.com/fr/fr/services/consulting/perspectives/intelligence-artificielle-quel-retour-sur-investissement.html)
- [AI Act conformite 2025](https://mazarinavocats.fr/comprendre-leu-ai-act-2025-par-mazarin-avocats/)
- [Industrie IA France — BPI France Big Media](https://bigmedia.bpifrance.fr/nos-dossiers/comment-lia-va-t-elle-transformer-lindustrie)
- [B2B Landing Page Conversion Stats 2026](https://genesysgrowth.com/blog/landing-page-conversion-stats-for-marketing-leaders)
