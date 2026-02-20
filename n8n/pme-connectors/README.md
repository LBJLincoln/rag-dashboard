# Workflows PME Connectors — n8n/pme-connectors/

> Last updated: 2026-02-20T20:00:00+01:00

## Architecture

```
                   ┌──────────────────────────────────────┐
                   │     whatsapp-telegram-bridge.json     │
                   │  Telegram Trigger + WhatsApp Webhook  │
                   └──────────────┬───────────────────────┘
                                  │ POST /webhook/pme-assistant-gateway
                                  ▼
                   ┌──────────────────────────────────────┐
                   │      multi-canal-gateway.json         │
                   │  Channel Detect → Intent Classify     │
                   │  → Switch (query/action/report)       │
                   └──────┬──────────┬──────────┬─────────┘
                          │          │          │
                    query │    action│    report│
                          ▼          ▼          ▼
                   ┌──────────┐ ┌──────────┐ ┌──────────┐
                   │ Standard │ │ action-  │ │ (future) │
                   │ RAG V3.4 │ │ executor │ │ report   │
                   │ Pipeline │ │ .json    │ │ workflow │
                   └──────────┘ └──────────┘ └──────────┘
                                     │
                          ┌──────────┼──────────┐
                          ▼          ▼          ▼
                   Google Cal   Gmail      Google Drive
```

## Workflows

| File | Nodes | Purpose | Webhook |
|------|-------|---------|---------|
| `multi-canal-gateway.json` | 9 | Central router: channel detect + intent classify + route | `/webhook/pme-assistant-gateway` |
| `whatsapp-telegram-bridge.json` | 9 | WhatsApp + Telegram listeners → forward to gateway | `/webhook/whatsapp-incoming` |
| `action-executor.json` | 9 | Execute actions: calendar, email, drive, summary | Sub-workflow (called by gateway) |

## Credentials Required (TODO)

| Credential | n8n Type | Service | How to get |
|-----------|----------|---------|-----------|
| `TODO_TELEGRAM_CREDENTIAL` | Telegram API | Bot token | @BotFather on Telegram |
| `TODO_WHATSAPP_TOKEN` | HTTP Header Auth | WhatsApp Cloud API | Meta Business Suite |
| `TODO_GOOGLE_CREDENTIAL` | Google OAuth2 | Calendar + Gmail + Drive | Google Cloud Console |
| `TODO_GMAIL_CREDENTIAL` | Gmail OAuth2 | Gmail send/read | Google Cloud Console |
| `OPENROUTER_API_KEY` | Env variable | LLM (Llama 70B) | Already configured |

## Setup

```bash
# 1. Import workflows
for f in n8n/pme-connectors/*.json; do
  curl -X POST http://localhost:5678/api/v1/workflows \
    -H "X-N8N-API-KEY: $N8N_API_KEY" \
    -H "Content-Type: application/json" \
    --data @"$f"
  echo "Imported: $f"
done

# 2. Add credentials in n8n UI
# 3. Update workflow IDs in gateway (TODO_STANDARD_RAG_ID, TODO_ACTION_EXECUTOR_ID)
# 4. Activate workflows
# 5. Test: curl -X POST http://localhost:5678/webhook/pme-assistant-gateway \
#     -H "Content-Type: application/json" \
#     -d '{"query":"Resume mes emails de la semaine","channel":"api"}'
```

## LLM

| Model | Usage | Cost |
|-------|-------|------|
| Llama 3.3 70B | Intent classification + response generation | $0 (OpenRouter free) |

## Relation to other workflows

- These are SEPARATE from sector workflows (`n8n/website/`)
- The gateway can call existing RAG pipelines (Standard V3.4, Graph V3.3, etc.)
- The action-executor handles non-RAG tasks (calendar, email, drive)
