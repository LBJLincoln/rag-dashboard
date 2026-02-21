# Workflows PME Connectors — n8n/pme-connectors/

> Last updated: 2026-02-21T05:00:00+01:00

## Architecture (Updated — FIX-34 applied)

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
                   │  → Parse Intent → Switch Router       │
                   └──────┬──────────┬──────────┬─────────┘
                          │          │          │
                    query │    action│    report│
                          ▼          ▼          ▼
                   ┌──────────┐ ┌──────────┐ ┌──────────┐
                   │Orchestr. │ │ action-  │ │Orchestr. │
                   │V10.1     │ │ executor │ │V10.1     │
                   │httpReq   │ │ httpReq  │ │httpReq   │
                   └──────────┘ └──────────┘ └──────────┘
                                     │
                          ┌──────────┼──────────┬──────────┐
                          ▼          ▼          ▼          ▼
                   Google Cal   Gmail      Google Drive  Fallback RAG
```

## Fixes Applied (Session 33)

| Fix | Issue | Solution |
|-----|-------|---------|
| **FIX-34** | `executeWorkflow` returns empty with `respondToWebhook` | All sub-workflow calls replaced with `httpRequest` POST to webhooks |
| **FIX-33** | `$env.OPENROUTER_API_KEY` blocked in n8n 2.8+ | Uses `httpHeaderAuth` credential type instead of `$env` |
| **Gateway** | TODO_STANDARD_RAG_ID placeholder | Replaced with httpRequest to Orchestrator V10.1 webhook |
| **Action executor** | `executeWorkflowTrigger` incompatible | Converted to webhook trigger (`/webhook/pme-action-executor`) |
| **Error handling** | `[object Object]` in responses | All error objects serialized with `JSON.stringify()` |

## Workflows

| File | Nodes | Purpose | Webhook |
|------|-------|---------|---------|
| `multi-canal-gateway.json` | 10 | Central router: channel detect + intent classify + route | `/webhook/pme-assistant-gateway` |
| `whatsapp-telegram-bridge.json` | 8 | WhatsApp + Telegram listeners → forward to gateway | `/webhook/whatsapp-incoming` |
| `action-executor.json` | 11 | Execute actions: calendar, email, drive, summary + fallback RAG | `/webhook/pme-action-executor` |

## Credentials Required

| Credential ID | n8n Type | Service | Status |
|--------------|----------|---------|--------|
| `OPENROUTER_HEADER_AUTH` | HTTP Header Auth | OpenRouter API (Llama 70B) | **Already configured** |
| `TELEGRAM_BOT_CREDENTIAL` | Telegram API | Bot token | Needs setup |
| `WHATSAPP_BEARER_AUTH` | HTTP Header Auth | WhatsApp Cloud API | Needs setup |
| `GOOGLE_CALENDAR_CREDENTIAL` | Google Calendar OAuth2 | Calendar events | Needs setup |
| `GMAIL_CREDENTIAL` | Gmail OAuth2 | Email send/read | Needs setup |
| `GOOGLE_DRIVE_CREDENTIAL` | Google Drive OAuth2 | File search | Needs setup |

## Setup

```bash
# 1. Import workflows to n8n
for f in n8n/pme-connectors/*.json; do
  [ "$(basename $f)" = "README.md" ] && continue
  curl -X POST http://localhost:5678/api/v1/workflows \
    -H "Content-Type: application/json" \
    --data @"$f"
  echo "Imported: $f"
done

# 2. Add credentials in n8n (see table above)

# 3. Activate workflows
# Gateway first, then bridge, then action executor

# 4. Test the gateway (API mode — no Telegram/WhatsApp needed)
curl -X POST http://localhost:5678/webhook/pme-assistant-gateway \
  -H "Content-Type: application/json" \
  -d '{"query":"Quels sont les derniers documents dans le Drive?","channel":"api"}'
```

## Test Without External Credentials

The gateway works in **API mode** without Telegram/WhatsApp/Google credentials:
- Intent `query` → routes to Orchestrator V10.1 (RAG search) ✅
- Intent `report` → routes to Orchestrator V10.1 (report generation) ✅
- Intent `action` → routes to action-executor → **needs Google credentials**

## LLM

| Model | Usage | Cost |
|-------|-------|------|
| Llama 3.3 70B | Intent classification + email summarization | $0 (OpenRouter free) |

## Relation to Other Workflows

- **Separate from sector workflows** (`n8n/website/`)
- Gateway calls Orchestrator V10.1 via httpRequest (not executeWorkflow)
- Action executor has its own webhook (`/webhook/pme-action-executor`)
- All responses go through Response Formatter → Respond to Webhook
