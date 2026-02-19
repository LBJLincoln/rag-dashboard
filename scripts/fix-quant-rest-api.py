#!/usr/bin/env python3
"""
FIX-29: Convert Quantitative workflow from PostgreSQL direct to Supabase REST API.

Root cause: HF Space blocks outbound TCP port 6543 (PostgreSQL pooler).
Solution: Use Supabase REST API (exec_sql RPC) via HTTP Request nodes.

Replaces:
  - Schema Introspection (n8n-nodes-base.postgres) → HTTP Request + splitIntoItems
  - SQL Executor (n8n-nodes-base.postgres) → HTTP Request + splitIntoItems
"""
import json
import sys
import os

def convert_workflow(input_path, output_path):
    with open(input_path) as f:
        wf = json.load(f)

    schema_query = (
        "SELECT table_name, column_name, data_type, is_nullable "
        "FROM information_schema.columns "
        "WHERE table_schema = 'public' "
        "AND table_name IN ('financials', 'balance_sheet', 'sales_data', "
        "'products', 'employees', 'quarterly_revenue', 'orders', 'customers', "
        "'departments', 'finqa_tables', 'convfinqa_tables') "
        "AND table_name NOT LIKE 'pg_%' "
        "AND table_name NOT LIKE '_realtime%' "
        "AND table_name NOT LIKE 'supabase_%' "
        "ORDER BY table_name, ordinal_position"
    )

    for node in wf['nodes']:
        if node['name'] == 'Schema Introspection':
            print(f"Converting: {node['name']} (postgres → httpRequest)")
            node['type'] = 'n8n-nodes-base.httpRequest'
            node['typeVersion'] = 4.2
            node['credentials'] = {}
            node['parameters'] = {
                'method': 'POST',
                'url': "={{ $env.SUPABASE_URL || 'https://ayqviqmxifzmhphiqfmj.supabase.co' }}/rest/v1/rpc/exec_sql",
                'authentication': 'none',
                'sendHeaders': True,
                'headerParameters': {
                    'parameters': [
                        {'name': 'apikey', 'value': "={{ $env.SUPABASE_API_KEY }}"},
                        {'name': 'Authorization', 'value': "=Bearer {{ $env.SUPABASE_API_KEY }}"},
                        {'name': 'Content-Type', 'value': 'application/json'}
                    ]
                },
                'sendBody': True,
                'specifyBody': 'json',
                'jsonBody': json.dumps({"sql_query": schema_query}),
                'options': {
                    'timeout': 30000,
                    'response': {
                        'response': {
                            'neverError': True,
                            'fullResponse': False
                        }
                    },
                    'splitIntoItems': True
                }
            }

        elif node['name'] == 'SQL Executor (Postgres)':
            print(f"Converting: {node['name']} (postgres → httpRequest)")
            node['type'] = 'n8n-nodes-base.httpRequest'
            node['typeVersion'] = 4.2
            node['credentials'] = {}
            node['parameters'] = {
                'method': 'POST',
                'url': "={{ $env.SUPABASE_URL || 'https://ayqviqmxifzmhphiqfmj.supabase.co' }}/rest/v1/rpc/exec_sql",
                'authentication': 'none',
                'sendHeaders': True,
                'headerParameters': {
                    'parameters': [
                        {'name': 'apikey', 'value': "={{ $env.SUPABASE_API_KEY }}"},
                        {'name': 'Authorization', 'value': "=Bearer {{ $env.SUPABASE_API_KEY }}"},
                        {'name': 'Content-Type', 'value': 'application/json'}
                    ]
                },
                'sendBody': True,
                'specifyBody': 'json',
                'jsonBody': "={{ JSON.stringify({sql_query: $json.validated_sql}) }}",
                'options': {
                    'timeout': 30000,
                    'retry': {
                        'maxTries': 2,
                        'waitBetweenTries': 2000
                    },
                    'response': {
                        'response': {
                            'neverError': True,
                            'fullResponse': False
                        }
                    },
                    'splitIntoItems': True
                }
            }

    with open(output_path, 'w') as f:
        json.dump(wf, f, indent=2)

    print(f"\nSaved to: {output_path}")
    print(f"Nodes: {len(wf['nodes'])}")

if __name__ == '__main__':
    input_path = sys.argv[1] if len(sys.argv) > 1 else '/tmp/hf-space-update/n8n-workflows/quantitative.json'
    output_path = sys.argv[2] if len(sys.argv) > 2 else '/tmp/hf-space-update/n8n-workflows/quantitative.json'
    convert_workflow(input_path, output_path)
