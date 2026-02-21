#!/usr/bin/env python3
"""
FIX-37B: Quantitative Pipeline Phase 2 improvements (context reasoning path)
- Improve context reasoning prompt with table parsing instructions + CoT
- Remove 8000 char context truncation
- Increase temperature 0.1→0.3, max_tokens 500→800
- Add numerical answer extraction in Context Response Formatter
- Fix duplicate rule in prompt
"""
import json
import os

QUANT_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "n8n", "live", "quantitative.json")

def fix_quant_workflow():
    with open(QUANT_PATH) as f:
        wf = json.load(f)

    changes = []

    # === FIX 1: Question Type Classifier — remove 8000 char truncation ===
    node25 = None
    for node in wf['nodes']:
        if node['name'] == 'Question Type Classifier':
            node25 = node
            break

    if node25:
        code = node25['parameters']['jsCode']
        if '.substring(0, 8000)' in code:
            code = code.replace('.substring(0, 8000)', '')
            node25['parameters']['jsCode'] = code
            changes.append("Classifier: removed 8000 char context truncation")

    # === FIX 2: Prepare Context Reasoning — improved prompt ===
    node27 = None
    for node in wf['nodes']:
        if node['name'] == 'Prepare Context Reasoning':
            node27 = node
            break

    if node27:
        new_code = '''// Build LLM request for direct context-based financial reasoning
// Phase 2 questions (finqa, tatqa, convfinqa) embed context + tables in the question
const data = $input.first().json;

const requestBody = {
  model: 'meta-llama/llama-3.3-70b-instruct:free',
  messages: [
    {
      role: 'system',
      content: 'You are an expert financial analyst. Answer the question based ONLY on the provided context and data tables.\\n\\n'
        + 'REASONING METHOD (follow these steps):\\n'
        + '1. LOCATE: Find the specific table row/column or text passage with the relevant data\\n'
        + '2. EXTRACT: Pull exact numbers from the data (with units — $, %, millions, etc.)\\n'
        + '3. CALCULATE: Show your arithmetic step by step (e.g., 500 - 450 = 50, 50/450 = 0.1111)\\n'
        + '4. ANSWER: State the final result\\n\\n'
        + 'TABLE PARSING RULES:\\n'
        + '- Tables may use pipe delimiters (|col1|col2|) or space-separated columns\\n'
        + '- Read exact values from tables — never approximate\\n'
        + '- For column lookups: find the row matching the criteria, read the target column\\n'
        + '- For aggregations: sum/subtract/divide the exact values\\n\\n'
        + 'ANSWER FORMAT RULES:\\n'
        + '- For percentages: give the decimal value (e.g., 0.1111 or 11.11%)\\n'
        + '- For currency: give the number (e.g., 94.0 or $94 million)\\n'
        + '- For yes/no: answer yes or no\\n'
        + '- For counts: give the integer\\n'
        + '- IMPORTANT: Start your response with ONLY the final answer on the first line\\n'
        + '- Then explain your reasoning on subsequent lines'
    },
    {
      role: 'user',
      content: data.extracted_context
        ? 'Context:\\n' + data.extracted_context + '\\n\\nQuestion: ' + data.extracted_question + '\\n\\nAnswer:'
        : data.query
    }
  ],
  temperature: 0.3,
  max_tokens: 800
};

return [{
  json: {
    requestBody: requestBody,
    trace_id: data.trace_id || '',
    query: data.extracted_question || data.query || '',
    extracted_context: data.extracted_context || '',
    question_type: 'context_reasoning'
  }
}];'''

        node27['parameters']['jsCode'] = new_code
        changes.append("Context Reasoning: improved prompt with CoT + table parsing + answer format rules")
        changes.append("Context Reasoning: temperature 0.1→0.3, max_tokens 500→800")

    # === FIX 3: Context Response Formatter — extract numerical answer ===
    node29 = None
    for node in wf['nodes']:
        if node['name'] == 'Context Response Formatter':
            node29 = node
            break

    if node29:
        new_code = '''// Format context reasoning response into standard pipeline output
// FIX-37B: Extract numerical answer from LLM prose response
const data = $input.first().json;
let interpretation = '';
let extractedAnswer = '';

if (data.choices && data.choices[0] && data.choices[0].message) {
  const fullResponse = data.choices[0].message.content || '';
  interpretation = fullResponse;

  // Extract the first line as the answer (prompt asks for answer on first line)
  const lines = fullResponse.trim().split('\\n');
  extractedAnswer = lines[0].trim();

  // Clean up common prefixes
  extractedAnswer = extractedAnswer
    .replace(/^(the answer is|answer:|result:|therefore|thus|=)\\s*/i, '')
    .replace(/^approximately\\s*/i, '')
    .trim();

  // If first line is too long (>100 chars), try regex extraction
  if (extractedAnswer.length > 100) {
    const numMatch = fullResponse.match(/(?:answer|result|equals?|is)\\s*[:=]?\\s*([\\-$]?[\\d,]+\\.?\\d*%?)/i);
    if (numMatch) {
      extractedAnswer = numMatch[1];
    }
  }
} else if (data.error) {
  interpretation = 'Context reasoning failed: ' +
    (typeof data.error === 'object' ? JSON.stringify(data.error) : String(data.error));
} else {
  interpretation = 'No response from LLM';
}

// Get init data from upstream
let initData = {};
try {
  initData = $node['Question Type Classifier'].json || {};
} catch(e) {
  try { initData = $node['Init & ACL'].json || {}; } catch(e2) { initData = {}; }
}

return [{
  json: {
    status: interpretation.includes('failed') ? 'ERROR' : 'SUCCESS',
    trace_id: initData.trace_id || '',
    query: initData.extracted_question || initData.query || '',
    sql_executed: 'N/A (context-based reasoning)',
    result_count: 1,
    interpretation: extractedAnswer || interpretation,
    raw_results: [],
    null_aggregation: false,
    metadata: {
      validation_status: 'CONTEXT_REASONING',
      question_type: 'context_reasoning',
      full_response: interpretation,
      extracted_answer: extractedAnswer,
      timestamp: new Date().toISOString(),
      engine: 'QUANTITATIVE'
    }
  }
}];'''

        node29['parameters']['jsCode'] = new_code
        changes.append("Response Formatter: added numerical answer extraction from first line")
        changes.append("Response Formatter: interpretation now returns extracted answer, full response in metadata")

    # === Save ===
    with open(QUANT_PATH, 'w') as f:
        json.dump(wf, f, indent=2)

    print(f"FIX-37B applied to {QUANT_PATH}")
    print(f"Changes ({len(changes)}):")
    for c in changes:
        print(f"  - {c}")

    return changes

if __name__ == "__main__":
    fix_quant_workflow()
