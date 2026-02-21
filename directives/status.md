# Status — 21 Fevrier 2026 (Session 32)

> Last updated: 2026-02-21T05:30:00+01:00

## Session 32 = Phase 2 Launch — 591/1000 questions tested

### Accompli
- **Phase 2 launched** : 591 questions tested across 3 pipelines (Standard, Graph, Orchestrator)
- **Standard** : 66.8% (163/244) — meeting P2 target (65%)
- **Graph** : 21.2% (48/226) — far below P2 target (60%), missing datasets in Neo4j
- **Orchestrator** : 67.6% (75/111) — meeting P2 target (65%)
- **Quantitative** : BLOCKED (1/10 = 10.0%) — TCP 6543 blocked on HF Space + rate limits
- **Quant diagnosis** : [object Object] = OpenRouter 429 + bad JS serialization (FIX-22)
- **Bottleneck system** : Added to CLAUDE.md (background testing, prioritization, escalation)
- **Satellite directives** : All 5 repos updated
- **PME Connectors** : Verified live (Next.js 15, 15 apps, Vercel cdg1)

### Phase 2 Resultats (en cours — 591/1000 tested)
| Pipeline | Accuracy | Tested | Correct | Target P2 | Gap | Status |
|----------|----------|--------|---------|-----------|-----|--------|
| Standard | 66.8% | 244 | 163 | 65% | +1.8pp | ON TRACK |
| Graph | 21.2% | 226 | 48 | 60% | -38.8pp | NEEDS WORK |
| Quantitative | 10.0% | 10 | 1 | 70% | -60.0pp | BLOCKED |
| Orchestrator | 67.6% | 111 | 75 | 65% | +2.6pp | ON TRACK |
| **Overall** | **48.6%** | 591 | 287 | 65% | -16.4pp | IN PROGRESS |

### Key Blockers
1. **Graph 21.2%** : Phase 2 questions (2WikiMultiHopQA, HotpotQA) not in Neo4j → retrieval fails
2. **Quant BLOCKED** : HF Space TCP port 6543 blocked → can't reach Supabase PostgreSQL
3. **Quant rate limit** : OpenRouter 20 req/min → 429 errors → [object Object]

### Prochaine session : Continue Phase 2 + Fix Graph + Unblock Quant
1. Ingest 2WikiMultiHopQA + HotpotQA datasets into Neo4j (Graph pipeline)
2. Fix Quantitative: test on VM n8n (port 6543 works locally) or use Codespace
3. Continue Standard + Orchestrator to 500+ questions
4. Target: 1,000 total questions, Overall >= 50%
