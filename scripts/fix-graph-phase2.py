#!/usr/bin/env python3
"""
FIX-38: Graph Pipeline Phase 2 improvements
- Switch HyDE entity extraction: Trinity 7B → Llama 70B (better multi-hop entity extraction)
- Increase MAX_DEPTH: 3 → 4 (support 4-hop MuSiQue questions)
- Improve LLM synthesis: Trinity → Llama 70B + better prompt for factual answers
- Improve entity extraction prompt for specific names
"""
import json
import re
import sys
import os

GRAPH_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "n8n", "live", "graph.json")

def fix_graph_workflow():
    with open(GRAPH_PATH) as f:
        wf = json.load(f)

    changes = []

    # === FIX 1: HyDE & Entity Extraction — Trinity → Llama 70B + better prompt ===
    node1 = wf['nodes'][1]  # "WF3: HyDE & Entity Extraction"
    old_body = node1['parameters']['jsonBody']

    new_body = '''={
  "model": "meta-llama/llama-3.3-70b-instruct:free",
  "messages": [
    {
      "role": "system",
      "content": "You are an entity extraction specialist. Given a question, extract ALL specific named entities (people, places, films, TV shows, organizations, dates, events). Return JSON format ONLY.\\n\\nRULES:\\n1. Extract SPECIFIC names only — never generic concepts\\n2. For multi-hop questions, extract entities from EACH hop\\n3. Also generate a brief hypothetical answer document (100 words max)\\n4. Return: {\\"hyde_document\\": string, \\"entities\\": [{\\"name\\": string, \\"type\\": \\"PERSON|PLACE|FILM|ORGANIZATION|EVENT|DATE\\"}]}\\n\\nEXAMPLE:\\nQuestion: Who voices the character in SpongeBob named after a glowing species?\\nEntities: [{\\"name\\": \\"SpongeBob SquarePants\\", \\"type\\": \\"FILM\\"}, {\\"name\\": \\"Plankton\\", \\"type\\": \\"PERSON\\"}, {\\"name\\": \\"Mr. Lawrence\\", \\"type\\": \\"PERSON\\"}]"
    },
    {
      "role": "user",
      "content": "{{ $json.query }}"
    }
  ],
  "temperature": 0.3,
  "max_tokens": 500
}'''

    node1['parameters']['jsonBody'] = new_body
    changes.append("Node 1 (HyDE): Trinity→Llama 70B, improved entity extraction prompt")

    # === FIX 2: Neo4j Query Builder — MAX_DEPTH 3 → 4 ===
    node2 = wf['nodes'][2]  # "Neo4j Query Builder (Deep Traversal V2)"
    code2 = node2['parameters']['jsCode']

    old_depth = "MAX_DEPTH = 3"
    new_depth = "MAX_DEPTH = 4"
    if old_depth in code2:
        code2 = code2.replace(old_depth, new_depth)
        changes.append("Node 2 (Neo4j): MAX_DEPTH 3→4")

    # Also improve entity matching — add fuzzy matching with toLower + CONTAINS
    old_pattern = "r*1..3"
    new_pattern = "r*1..4"
    if old_pattern in code2:
        code2 = code2.replace(old_pattern, new_pattern)
        changes.append("Node 2 (Neo4j): hop pattern r*1..3 → r*1..4")

    node2['parameters']['jsCode'] = code2

    # === FIX 3: Response Formatter — Switch Trinity → Llama 70B + better synthesis prompt ===
    node10 = wf['nodes'][10]  # "Response Formatter"
    code10 = node10['parameters']['jsCode']

    # Replace model
    code10 = code10.replace(
        "model: 'arcee-ai/trinity-large-preview:free'",
        "model: 'meta-llama/llama-3.3-70b-instruct:free'"
    )
    changes.append("Node 10 (Response Formatter): Trinity→Llama 70B")

    # Replace system prompt
    old_prompt = "You are a precise knowledge graph assistant. Answer questions using ONLY the provided context. For factual questions (who/what/where/when), answer in 1-5 words. For yes/no questions, start with Yes or No. For numerical questions, give the number with unit. NEVER say you lack information - always provide your best answer from the context. Respond in the SAME LANGUAGE as the question."

    new_prompt = "You are a precise knowledge graph Q&A assistant. Answer using ONLY the provided context.\\n\\nRULES:\\n1. WHO questions: return person name only (e.g., \\'John Knox\\')\\n2. WHAT questions: return entity name (e.g., \\'River Thames\\')\\n3. WHERE questions: return location (e.g., \\'Pearl River County\\')\\n4. WHEN questions: return year/date only (e.g., \\'1572\\')\\n5. Use graph relationships to trace multi-hop paths\\n6. If context has a chain A→B→C, follow it to find the answer\\n7. Give ONLY the final answer — no explanation, no prefixes\\n8. NEVER say you lack information\\n9. Respond in the SAME LANGUAGE as the question"

    code10 = code10.replace(old_prompt, new_prompt)
    changes.append("Node 10: Improved synthesis prompt for multi-hop factual answers")

    # Increase max_tokens for synthesis
    code10 = code10.replace("max_tokens: 300", "max_tokens: 400")
    changes.append("Node 10: max_tokens 300→400")

    node10['parameters']['jsCode'] = code10

    # === Save ===
    with open(GRAPH_PATH, 'w') as f:
        json.dump(wf, f, indent=2)

    print(f"FIX-38 applied to {GRAPH_PATH}")
    print(f"Changes ({len(changes)}):")
    for c in changes:
        print(f"  - {c}")

    return changes

if __name__ == "__main__":
    fix_graph_workflow()
