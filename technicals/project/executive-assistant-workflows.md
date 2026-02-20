# Workflows n8n — Assistant Exécutif Multi-Canal RAG (SOTA 2026)

> Last updated: 2026-02-20T10:00:00+01:00

---

## Résumé

Architecture workflows n8n pour un assistant IA dirigeant multi-canal. WhatsApp + Telegram + Gmail + Google Drive + Calendar connectés au RAG Nomos AI via Llama 3.3 70B (gratuit).

---

## 1. Apps Recommandées par Catégorie

### Messageries
| App | Support n8n | Recommandé | Méthode |
|-----|-------------|------------|---------|
| **WhatsApp Business** | Native | **OUI** | WhatsApp Business Cloud node — bidirectionnel webhooks |
| **Telegram** | Native | **OUI** | Telegram Bot node — gratuit, excellent pour chatbots |
| Signal | Community | Optionnel | Requiert Docker signal-cli-rest-api |
| iMessage | Third-party | Non | Blooio API (payant) |

### Stockage Personnel
| App | Support n8n | Recommandé |
|-----|-------------|------------|
| **Google Drive** | Native (triggers) | **OUI** |
| **OneDrive** | Native (CRUD) | **OUI** |
| iCloud | Aucun | Non |

### Stockage Professionnel
| App | Support n8n | Recommandé |
|-----|-------------|------------|
| **Google Workspace** | Native (complet) | **OUI** |
| **Dropbox Business** | Native (triggers) | **OUI** |
| SharePoint | Partiel (pas de trigger) | Optionnel |

### Email
| App | Support n8n | Recommandé |
|-----|-------------|------------|
| **Gmail** | Native (complet) | **OUI** |
| **Outlook** | Native (complet) | **OUI** |
| ProtonMail | Aucun natif | Non |

### Calendrier
| App | Support n8n | Recommandé |
|-----|-------------|------------|
| **Google Calendar** | Native (5 triggers, 6 actions) | **OUI** |
| **Outlook Calendar** | Native (complet) | **OUI** |

---

## 2. Architecture Workflow

```
┌──────────────────────────────────────────────────────────────────────┐
│                     COUCHE INGESTION MULTI-CANAL                     │
├────────────┬─────────────┬─────────────┬──────────────┬─────────────┤
│ WhatsApp   │ Telegram    │ Gmail       │ Google Cal   │ Google Drive│
│ (webhook)  │ (webhook)   │ (trigger)   │ (trigger)    │ (trigger)   │
└─────┬──────┴──────┬──────┴──────┬──────┴──────┬───────┴──────┬──────┘
      └─────────────┴─────────────┴─────────────┴──────────────┘
                                  │
                    ┌─────────────▼──────────────┐
                    │   CLASSIFICATEUR INTENT    │  Llama 3.3 70B
                    │  (Query / Action / Cal)    │
                    └─────────────┬──────────────┘
                                  │
              ┌───────────────────┼───────────────────┐
              ▼                   ▼                   ▼
     ┌────────────────┐  ┌────────────────┐  ┌────────────────┐
     │  RAG SEARCH    │  │  ACTION EXEC   │  │  CALENDAR      │
     │  (Pinecone     │  │  (Gmail send,  │  │  (Events,      │
     │   Neo4j,       │  │   Drive share, │  │   disponibilité│
     │   Supabase)    │  │   multi-canal) │  │   invitations) │
     └───────┬────────┘  └───────┬────────┘  └───────┬────────┘
              └───────────────────┼───────────────────┘
                                  ▼
                    ┌─────────────────────────────┐
                    │   RÉPONSE CANAL ORIGINAL    │
                    └─────────────────────────────┘
```

---

## 3. Patterns d'Usage

### Pattern A : Recherche documentaire (RAG)
```
User (WhatsApp) → "Trouve le rapport budget du mois dernier"
  → Intent: Document retrieval
  → Vector Search (indexes perso + pro)
  → Rerank top 5
  → LLM résumé + lien fichier
  → Réponse WhatsApp
```

### Pattern B : Action calendrier
```
User (Telegram) → "Planifie une démo avec Jean mardi 15h"
  → Intent: Calendar action
  → Google Calendar: check disponibilité
  → Créer event + envoyer invitation
  → Réponse Telegram
```

### Pattern C : Rapport email
```
User (WhatsApp) → "Résumé hebdo des mails importants"
  → Intent: Email analysis
  → Gmail: fetch 7 derniers jours
  → LLM Llama 70B: résumé + catégorisation
  → Google Docs: générer rapport
  → Gmail: envoyer aux stakeholders
  → Réponse WhatsApp avec lien
```

---

## 4. LLM Recommandé

| Modèle | Contexte | Usage | Coût |
|--------|----------|-------|------|
| **Llama 3.3 70B** | 128K | RAG conversationnel, raisonnement | **$0** (OpenRouter) |
| Gemini 2.0 Flash | 1M | Documents longs | **$0** |
| Gemini 2.5 Flash Lite | 1M | Ingestion massive | **$0** |

---

## 5. Coût Estimé

| Composant | Service | Coût/mois |
|-----------|---------|-----------|
| n8n | Self-hosted (VM existante) | $0 |
| LLM | OpenRouter free tier | $0 |
| Vector DB | Pinecone free | $0 |
| Embeddings | Jina AI free | $0 |
| WhatsApp | Meta Business (1K conv/mois) | $0 |
| Telegram | Bot API | $0 |
| **Total** | | **$0** |

---

## 6. Templates n8n de Référence

- [WhatsApp RAG Chatbot (Voice/Text/PDF)](https://n8n.io/workflows/4827)
- [Telegram AI Bot Template](https://n8n.io/workflows/2534)
- [Signal Personal Assistant](https://n8n.io/workflows/10661)
- [Google Drive RAG with Gemini](https://n8n.io/workflows/2753)
- [Multi-Channel AI Personal Assistant](https://n8n.io/workflows/4723)
- [Calendar Sync Google↔Outlook](https://n8n.io/workflows/2528)

---

## 7. Roadmap Implémentation

1. **Semaine 1-2** : MVP WhatsApp + Gmail + Drive + RAG basique
2. **Semaine 3-4** : Telegram + Calendar + Intent classifier + Actions
3. **Semaine 5-6** : Agentic routing multi-source + Reranking + RLHF
4. **Semaine 7-8** : OneDrive + SharePoint + Monitoring + Analytics
