#!/usr/bin/env python3
"""
Fix Quantitative Pipeline V2.1 for Phase 2 Support

Fixes applied:
1. Add context reasoning path for Phase 2 questions (finqa, tatqa, convfinqa, wikitablequestions)
   - These questions embed financial context/tables in the question text
   - They need direct LLM reasoning, NOT SQL generation on Supabase
2. Replace $env.LLM_SQL_MODEL and $env.LLM_FAST_MODEL in Code nodes (FIX-32)
3. Increase HTTP timeouts (25s→60s) and retries (1→3) (FIX-22)

New architecture:
  Webhook → Init & ACL → Question Type Classifier → Route by Question Type (IF)
    ├── context_reasoning → Prepare Context Reasoning → Context LLM → Context Response Formatter
    └── sql_query → Schema Introspection → [existing SQL pipeline] → Response Formatter
"""
import json
import copy
import sys
import os

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def fix_env_in_code_nodes(nodes):
    """FIX-32: Replace $env references in Code nodes with hardcoded values."""
    count = 0
    for node in nodes:
        if node['type'] == 'n8n-nodes-base.code' and 'jsCode' in node.get('parameters', {}):
            code = node['parameters']['jsCode']
            original = code

            # Replace $env.LLM_SQL_MODEL with hardcoded value
            code = code.replace(
                "$env.LLM_SQL_MODEL || 'meta-llama/llama-3.3-70b-instruct:free'",
                "'meta-llama/llama-3.3-70b-instruct:free'"
            )
            # Replace $env.LLM_FAST_MODEL with hardcoded value
            code = code.replace(
                "$env.LLM_FAST_MODEL || 'google/gemma-3-27b-it:free'",
                "'google/gemma-3-27b-it:free'"
            )

            if code != original:
                node['parameters']['jsCode'] = code
                count += 1
                print(f"  [FIX-32] Replaced $env in Code node: {node['name']}")
    return count


def fix_http_timeouts(nodes):
    """FIX-22: Increase HTTP Request timeouts and retries."""
    count = 0
    target_nodes = [
        'Text-to-SQL Generator (CoT Enhanced)',
        'Interpretation Layer (LLM Analyst)',
        'SQL Repair LLM',
    ]
    for node in nodes:
        if node['type'] == 'n8n-nodes-base.httpRequest' and node['name'] in target_nodes:
            opts = node.get('parameters', {}).get('options', {})
            changed = False

            if opts.get('timeout', 0) < 60000:
                opts['timeout'] = 60000
                changed = True

            if 'retry' in opts:
                if opts['retry'].get('maxTries', 0) < 3:
                    opts['retry']['maxTries'] = 3
                    changed = True
                if opts['retry'].get('waitBetweenTries', 0) < 5000:
                    opts['retry']['waitBetweenTries'] = 5000
                    changed = True
            else:
                opts['retry'] = {'maxTries': 3, 'waitBetweenTries': 5000}
                changed = True

            if changed:
                node['parameters']['options'] = opts
                count += 1
                print(f"  [FIX-22] Updated timeout/retries: {node['name']}")
    return count


def add_context_reasoning_path(nodes, connections):
    """Add Question Type Classifier and Context Reasoning branch for Phase 2."""

    # Check if already applied
    existing_names = {n['name'] for n in nodes}
    if 'Question Type Classifier' in existing_names:
        print("  [SKIP] Context reasoning path already exists")
        return 0

    # === New Node 1: Question Type Classifier ===
    classifier_node = {
        "parameters": {
            "jsCode": (
                "// Question Type Classifier — Routes between SQL and Context Reasoning\n"
                "const initData = $input.first().json;\n"
                "const query = initData.query || '';\n"
                "\n"
                "// Detect Phase 2 context-rich questions (finqa, tatqa, convfinqa format)\n"
                "// These questions embed financial context and tables in the question text\n"
                "const hasContextMarker = query.includes('Context:') && query.includes('Question:');\n"
                "const hasTableData = /\\|[^|]+\\|[^|]+\\|/.test(query);\n"
                "const isLongWithContext = (hasContextMarker || hasTableData) && query.length > 500;\n"
                "// Also detect 'Please answer the given financial question' pattern\n"
                "const isFinancialContext = query.toLowerCase().includes('please answer the given financial question');\n"
                "\n"
                "const isContextQuestion = isLongWithContext || isFinancialContext;\n"
                "\n"
                "if (isContextQuestion) {\n"
                "  // Extract the actual question and context from the composite string\n"
                "  let extractedQuestion = query;\n"
                "  let extractedContext = '';\n"
                "  \n"
                "  const contextMatch = query.match(/Context:\\s*([\\s\\S]+?)(?=\\nQuestion:|$)/);\n"
                "  const questionMatch = query.match(/Question:\\s*([\\s\\S]+?)(?:\\nAnswer:|$)/);\n"
                "  \n"
                "  if (contextMatch) extractedContext = contextMatch[1].trim();\n"
                "  if (questionMatch) extractedQuestion = questionMatch[1].trim();\n"
                "  \n"
                "  return [{\n"
                "    json: {\n"
                "      ...initData,\n"
                "      question_type: 'context_reasoning',\n"
                "      extracted_question: extractedQuestion,\n"
                "      extracted_context: extractedContext.substring(0, 8000),\n"
                "      original_query: query\n"
                "    }\n"
                "  }];\n"
                "} else {\n"
                "  return [{\n"
                "    json: {\n"
                "      ...initData,\n"
                "      question_type: 'sql_query'\n"
                "    }\n"
                "  }];\n"
                "}\n"
            )
        },
        "id": "a1b2c3d4-qtc1-4000-8000-000000000001",
        "name": "Question Type Classifier",
        "type": "n8n-nodes-base.code",
        "typeVersion": 2,
        "position": [300, 208]
    }

    # === New Node 2: Route by Question Type (IF) ===
    router_node = {
        "parameters": {
            "conditions": {
                "string": [
                    {
                        "conditions": [
                            {
                                "leftValue": "={{ $json.question_type }}",
                                "rightValue": "context_reasoning",
                                "operator": {
                                    "type": "string",
                                    "operation": "equals"
                                }
                            }
                        ]
                    }
                ]
            },
            "options": {}
        },
        "id": "a1b2c3d4-rqt1-4000-8000-000000000002",
        "name": "Route by Question Type",
        "type": "n8n-nodes-base.if",
        "typeVersion": 2,
        "position": [430, 100]
    }

    # === New Node 3: Prepare Context Reasoning ===
    ctx_prep_node = {
        "parameters": {
            "jsCode": (
                "// Build LLM request for direct context-based financial reasoning\n"
                "// Phase 2 questions (finqa, tatqa, convfinqa) embed context + tables in the question\n"
                "const data = $input.first().json;\n"
                "\n"
                "const requestBody = {\n"
                "  model: 'meta-llama/llama-3.3-70b-instruct:free',\n"
                "  messages: [\n"
                "    {\n"
                "      role: 'system',\n"
                "      content: 'You are an expert financial analyst. Answer the question based ONLY on the provided context and data tables.\\n\\n'\n"
                "        + 'RULES:\\n'\n"
                "        + '1. Use ONLY the data from the context — never invent numbers\\n'\n"
                "        + '2. Show your calculation steps briefly\\n'\n"
                "        + '3. For percentages, calculate precisely (e.g., 0.14464)\\n'\n"
                "        + '4. For currency values, give the exact number (e.g., 94.0)\\n'\n"
                "        + '5. Keep your answer concise — give the numerical answer first, then a brief explanation\\n'\n"
                "        + '6. If the answer is a list, separate items with newlines\\n'\n"
                "        + '7. Match the format expected by the question\\n'\n"
                "        + '8. If a table is provided, read the exact values from it\\n'\n"
                "        + 'IMPORTANT: Start your response with the direct answer (number, percentage, or text).'\n"
                "    },\n"
                "    {\n"
                "      role: 'user',\n"
                "      content: data.extracted_context\n"
                "        ? 'Context:\\n' + data.extracted_context + '\\n\\nQuestion: ' + data.extracted_question\n"
                "        : data.original_query || data.query\n"
                "    }\n"
                "  ],\n"
                "  temperature: 0.1,\n"
                "  max_tokens: 500\n"
                "};\n"
                "\n"
                "return [{\n"
                "  json: {\n"
                "    ...data,\n"
                "    requestBody: requestBody\n"
                "  }\n"
                "}];\n"
            )
        },
        "id": "a1b2c3d4-cpr1-4000-8000-000000000003",
        "name": "Prepare Context Reasoning",
        "type": "n8n-nodes-base.code",
        "typeVersion": 2,
        "position": [650, -100]
    }

    # === New Node 4: Context Reasoning LLM ===
    ctx_llm_node = {
        "parameters": {
            "method": "POST",
            "url": "={{ $env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1/chat/completions' }}",
            "authentication": "none",
            "sendBody": True,
            "specifyBody": "json",
            "jsonBody": "={{ JSON.stringify($json.requestBody) }}",
            "options": {
                "timeout": 60000,
                "retry": {
                    "maxTries": 3,
                    "waitBetweenTries": 5000
                }
            },
            "sendHeaders": True,
            "headerParameters": {
                "parameters": [
                    {
                        "name": "Authorization",
                        "value": "=Bearer {{ $env.OPENROUTER_API_KEY }}"
                    }
                ]
            }
        },
        "id": "a1b2c3d4-cll1-4000-8000-000000000004",
        "name": "Context Reasoning LLM",
        "type": "n8n-nodes-base.httpRequest",
        "typeVersion": 4.3,
        "position": [900, -100],
        "credentials": {},
        "continueOnFail": True,
        "onError": "continueRegularOutput"
    }

    # === New Node 5: Context Response Formatter ===
    ctx_fmt_node = {
        "parameters": {
            "jsCode": (
                "// Format context reasoning response into standard pipeline output\n"
                "const data = $input.first().json;\n"
                "let interpretation = '';\n"
                "\n"
                "if (data.choices && data.choices[0] && data.choices[0].message) {\n"
                "  interpretation = data.choices[0].message.content;\n"
                "} else if (data.error) {\n"
                "  interpretation = 'Context reasoning failed: ' + \n"
                "    (typeof data.error === 'object' ? JSON.stringify(data.error) : String(data.error));\n"
                "} else {\n"
                "  interpretation = 'No response from LLM';\n"
                "}\n"
                "\n"
                "// Get init data from upstream\n"
                "let initData = {};\n"
                "try {\n"
                "  initData = $node['Question Type Classifier'].json || {};\n"
                "} catch(e) {\n"
                "  try { initData = $node['Init & ACL'].json || {}; } catch(e2) { initData = {}; }\n"
                "}\n"
                "\n"
                "return [{\n"
                "  json: {\n"
                "    status: interpretation.includes('failed') ? 'ERROR' : 'SUCCESS',\n"
                "    trace_id: initData.trace_id || '',\n"
                "    query: initData.extracted_question || initData.query || '',\n"
                "    sql_executed: 'N/A (context-based reasoning)',\n"
                "    result_count: 1,\n"
                "    interpretation: interpretation,\n"
                "    raw_results: [],\n"
                "    null_aggregation: false,\n"
                "    metadata: {\n"
                "      validation_status: 'CONTEXT_REASONING',\n"
                "      question_type: 'context_reasoning',\n"
                "      timestamp: new Date().toISOString(),\n"
                "      engine: 'QUANTITATIVE'\n"
                "    }\n"
                "  }\n"
                "}];\n"
            )
        },
        "id": "a1b2c3d4-crf1-4000-8000-000000000005",
        "name": "Context Response Formatter",
        "type": "n8n-nodes-base.code",
        "typeVersion": 2,
        "position": [1150, -100]
    }

    # Add new nodes
    nodes.extend([classifier_node, router_node, ctx_prep_node, ctx_llm_node, ctx_fmt_node])

    # === Update connections ===

    # Change: Init & ACL → Schema Introspection  TO  Init & ACL → Question Type Classifier
    if 'Init & ACL' in connections:
        connections['Init & ACL']['main'] = [[{
            "node": "Question Type Classifier",
            "type": "main",
            "index": 0
        }]]

    # Question Type Classifier → Route by Question Type
    connections["Question Type Classifier"] = {
        "main": [[{
            "node": "Route by Question Type",
            "type": "main",
            "index": 0
        }]]
    }

    # Route by Question Type:
    #   TRUE (index 0) = context_reasoning → Prepare Context Reasoning
    #   FALSE (index 1) = sql_query → Schema Introspection
    connections["Route by Question Type"] = {
        "main": [
            [{
                "node": "Prepare Context Reasoning",
                "type": "main",
                "index": 0
            }],
            [{
                "node": "Schema Introspection",
                "type": "main",
                "index": 0
            }]
        ]
    }

    # Prepare Context Reasoning → Context Reasoning LLM
    connections["Prepare Context Reasoning"] = {
        "main": [[{
            "node": "Context Reasoning LLM",
            "type": "main",
            "index": 0
        }]]
    }

    # Context Reasoning LLM → Context Response Formatter
    connections["Context Reasoning LLM"] = {
        "main": [[{
            "node": "Context Response Formatter",
            "type": "main",
            "index": 0
        }]]
    }

    # Context Response Formatter is terminal (webhook responseMode: lastNode picks it up)

    print("  [NEW] Added 5 nodes for context reasoning path")
    print("  [NEW] Updated connections: Init→Classifier→Router→(Context|SQL)")
    return 5


def fix_workflow_section(nodes, connections):
    """Apply all fixes to a nodes[] + connections{} pair."""
    total_fixes = 0
    total_fixes += fix_env_in_code_nodes(nodes)
    total_fixes += fix_http_timeouts(nodes)
    total_fixes += add_context_reasoning_path(nodes, connections)
    return total_fixes


def main():
    input_path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(REPO_ROOT, 'n8n/live/quantitative.json')
    output_path = sys.argv[2] if len(sys.argv) > 2 else input_path

    print(f"Loading: {input_path}")
    with open(input_path) as f:
        wf = json.load(f)

    print(f"\n=== Fixing main nodes ({len(wf['nodes'])} nodes) ===")
    fix_count = fix_workflow_section(wf['nodes'], wf['connections'])

    # Fix activeVersion if present (FIX-29 rule: always patch BOTH)
    if 'activeVersion' in wf and isinstance(wf['activeVersion'], dict):
        av = wf['activeVersion']
        if 'nodes' in av and 'connections' in av:
            print(f"\n=== Fixing activeVersion ({len(av['nodes'])} nodes) ===")
            fix_count += fix_workflow_section(av['nodes'], av['connections'])
        else:
            print("\n  [WARN] activeVersion missing nodes or connections — skipped")

    # Clean stale staticData retry keys (reduce JSON bloat)
    if 'staticData' in wf and 'global' in wf.get('staticData', {}):
        stale_keys = [k for k in wf['staticData']['global'] if k.startswith('retry_sql-repair-')]
        if stale_keys:
            for k in stale_keys:
                del wf['staticData']['global'][k]
            print(f"\n  [CLEAN] Removed {len(stale_keys)} stale staticData retry keys")

    # Save
    with open(output_path, 'w') as f:
        json.dump(wf, f, indent=2)

    print(f"\n{'='*50}")
    print(f"Saved: {output_path}")
    print(f"Total nodes: {len(wf['nodes'])}")
    print(f"Total fixes applied: {fix_count}")
    print(f"{'='*50}")


if __name__ == '__main__':
    main()
