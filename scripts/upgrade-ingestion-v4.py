#!/usr/bin/env python3
"""
Upgrade Ingestion V3.1 workflow to V4.0 with SOTA 2026 improvements.

Applies:
- A. Late Chunking (Jina embeddings)
- B. Domain-Specific Chunking (sector-aware routing)
- C. CompactRAG QA Pairs (enhanced Q&A generation)
- D. Enhanced Metadata (sector detection, NER, doc_type)
- E. French NER Integration (entity extraction)
- F. BM25 Improvements (French stop words, sector weighting)

Session 30 — 2026-02-20
"""

import json
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional
import uuid

# Paths
REPO_ROOT = Path("/home/termius/mon-ipad")
INGESTION_JSON = REPO_ROOT / "n8n" / "live" / "ingestion.json"
BACKUP_JSON = REPO_ROOT / "n8n" / "validated" / "ingestion-v3.1-backup.json"


def read_workflow(path: Path) -> Dict[str, Any]:
    """Read n8n workflow JSON."""
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)


def write_workflow(path: Path, workflow: Dict[str, Any]) -> None:
    """Write n8n workflow JSON with pretty formatting."""
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(workflow, f, indent=2, ensure_ascii=False)


def find_node(workflow: Dict[str, Any], name: str) -> Optional[Dict[str, Any]]:
    """Find a node by name in the workflow."""
    for node in workflow.get('nodes', []):
        if node.get('name') == name:
            return node
    return None


def create_node_id() -> str:
    """Generate a unique node ID (n8n format)."""
    return str(uuid.uuid4())


def upgrade_embeddings_node(workflow: Dict[str, Any]) -> bool:
    """
    A. Late Chunking - Modify Generate Embeddings node.
    Add late_chunking: true and task: retrieval.passage to Jina API.
    """
    node = find_node(workflow, "Generate Embeddings V3.1 (Contextual)")
    if not node:
        print("⚠️  Warning: 'Generate Embeddings V3.1 (Contextual)' node not found")
        return False

    # Parse the current jsonBody
    json_body = node['parameters'].get('jsonBody', '{}')

    # Update to include late_chunking and task
    new_json_body = '''={
  "model": "jina-embeddings-v3",
  "input": {{ JSON.stringify(($json.chunks || []).slice(0, 100).map(c => c.contextual_content || c.content)) }},
  "late_chunking": true,
  "task": "retrieval.passage",
  "dimensions": 1024
}'''

    node['parameters']['jsonBody'] = new_json_body

    # Update node name to V4
    node['name'] = "Generate Embeddings V4.0 (Late Chunking)"
    node['notes'] = "SOTA 2026: Late chunking enabled for better contextual embeddings"

    print("✅ A. Late Chunking: Updated Generate Embeddings node")
    return True


def add_sector_router_node(workflow: Dict[str, Any]) -> bool:
    """
    B. Domain-Specific Chunking - Add Sector-Aware Router V4 node.
    This node detects sector and sets chunking strategy before Semantic Chunker.
    """
    semantic_chunker = find_node(workflow, "Semantic Chunker V3.1 (Adaptive)")
    if not semantic_chunker:
        print("⚠️  Warning: 'Semantic Chunker V3.1 (Adaptive)' node not found")
        return False

    # Create new router node
    router_node = {
        "parameters": {
            "jsCode": '''// SOTA 2026 — B. Sector-Aware Router V4
// Detects document sector and sets optimal chunking strategy
// Reference: technicals/project/rag-research-2026.md (DeepRead, Domain-Specific Chunking)

const mimeData = $node['MIME Type Detector'].json;
const piiData = $node['PII Fortress'].json;
const objectKey = mimeData.objectKey || '';
const content = piiData.processed_content || '';

// === SECTOR DETECTION ===
function detectSector(path, content) {
  const pathLower = path.toLowerCase();
  const contentSample = content.substring(0, 2000).toLowerCase();

  // BTP/Construction patterns
  if (
    /\b(dtu|cctp|plu|re2020|rt2012|shon|shob|permis[- ]construire)\b/i.test(contentSample) ||
    pathLower.includes('btp') ||
    pathLower.includes('construction')
  ) {
    return 'btp';
  }

  // Finance patterns
  if (
    /\b(ifrs|bale|corep|finrep|mifid|amf|acpr|solvabilite)\b/i.test(contentSample) ||
    pathLower.includes('finance') ||
    pathLower.includes('compta')
  ) {
    return 'finance';
  }

  // Legal patterns
  if (
    /\b(article|loi|decret|arrete|cour|conseil|cnil|rgpd|code civil)\b/i.test(contentSample) ||
    pathLower.includes('juridique') ||
    pathLower.includes('legal')
  ) {
    return 'legal';
  }

  // Industry patterns
  if (
    /\b(iso|amdec|fds|haccp|sop|gmao|tpm)\b/i.test(contentSample) ||
    pathLower.includes('industrie') ||
    pathLower.includes('production')
  ) {
    return 'industry';
  }

  return 'general';
}

// === CHUNKING STRATEGY ===
function getChunkingStrategy(sector) {
  const strategies = {
    finance: {
      name: 'finance_page_level',
      chunk_size: 256,
      preserve_tables: true,
      description: 'Preserve financial tables and statements, small chunks with rich metadata'
    },
    legal: {
      name: 'legal_clause_based',
      chunk_size: 700,
      preserve_structure: true,
      description: 'Never split articles/clauses, preserve legal structure'
    },
    btp: {
      name: 'btp_spec_based',
      chunk_size: 1024,
      group_by: 'building_codes',
      description: 'Group by building codes (DTU, RE2020), larger chunks for technical specs'
    },
    industry: {
      name: 'industry_hierarchical',
      chunk_size: 512,
      preserve_hierarchy: true,
      description: 'Preserve SOP/manual hierarchical structure'
    },
    general: {
      name: 'adaptive_semantic',
      chunk_size: 500,
      description: 'Adaptive semantic chunking (default V3.1 behavior)'
    }
  };

  return strategies[sector] || strategies.general;
}

const sector = detectSector(objectKey, content);
const strategy = getChunkingStrategy(sector);

return {
  ...mimeData,
  ...piiData,
  sector: sector,
  chunk_strategy: strategy.name,
  chunk_size: strategy.chunk_size,
  chunking_config: strategy,
  router_version: 'v4.0'
};'''
        },
        "id": create_node_id(),
        "name": "Sector-Aware Router V4",
        "type": "n8n-nodes-base.code",
        "typeVersion": 2,
        "position": [
            semantic_chunker['position'][0] - 240,
            semantic_chunker['position'][1]
        ],
        "notes": "SOTA 2026 B: Sector detection + domain-specific chunking strategy"
    }

    workflow['nodes'].append(router_node)

    # Update connections: PII Fortress → Router → Semantic Chunker
    # Find connection to Semantic Chunker and insert router in between
    for conn in workflow.get('connections', {}).values():
        for target_list in conn.get('main', []):
            if target_list:
                for target in target_list:
                    if target.get('node') == 'Semantic Chunker V3.1 (Adaptive)':
                        # Update to point to router
                        source_node = target.get('node')
                        # We'll handle this manually in the connections update
                        pass

    print("✅ B. Sector-Aware Router: Added new node (connections need manual update)")
    return True


def enhance_qa_enricher_node(workflow: Dict[str, Any]) -> bool:
    """
    C. CompactRAG QA Pairs - Enhance Q&A Enricher node.
    Generate 5 atomic QA pairs for finance/industry, include numerical reasoning.
    """
    node = find_node(workflow, "Q&A Enricher")
    if not node:
        print("⚠️  Warning: 'Q&A Enricher' node not found")
        return False

    new_code = '''// SOTA 2026 — C. CompactRAG QA Pairs Enhanced
// Generate 5 atomic QA pairs for finance/industry (instead of 3)
// Include numerical reasoning questions for financial tables
// Reference: technicals/project/rag-research-2026.md (CompactRAG)

const chunkData = $node['Chunk Validator & Enricher V4'].json;
let qaData;
try {
  qaData = JSON.parse($json.choices?.[0]?.message?.content || '{}');
} catch (e) {
  qaData = { questions: [] };
}

const questions = qaData.questions || [];
const sector = chunkData.sector || 'general';

// Determine QA pairs per chunk based on sector
const qaPairsPerChunk = (sector === 'finance' || sector === 'industry') ? 5 : 3;

// Add hypothetical questions to each chunk
const finalChunks = chunkData.chunks.map((chunk, idx) => {
  const startIdx = idx * qaPairsPerChunk;
  const endIdx = (idx + 1) * qaPairsPerChunk;
  const chunkQuestions = questions.slice(startIdx, endIdx);

  return {
    ...chunk,
    hypothetical_questions: chunkQuestions,
    qa_pairs_count: chunkQuestions.length,
    compact_qa_metadata: {
      doc_type: 'compact_qa',
      sector: sector,
      numerical_reasoning: sector === 'finance' && /\d+/.test(chunk.content)
    }
  };
});

return {
  ...chunkData,
  chunks: finalChunks,
  total_qa_pairs: questions.length,
  qa_strategy: qaPairsPerChunk === 5 ? 'enhanced_compact' : 'standard'
};'''

    node['parameters']['jsCode'] = new_code
    node['name'] = "Q&A Enricher V4.0 (CompactRAG)"
    node['notes'] = "SOTA 2026 C: Enhanced QA generation with sector-aware atomic pairs"

    print("✅ C. CompactRAG QA Pairs: Enhanced Q&A Enricher node")
    return True


def enhance_chunk_validator_metadata(workflow: Dict[str, Any]) -> bool:
    """
    D. Enhanced Metadata - Modify Chunk Validator & Enricher V4.
    Add sector detection, language detection, doc_type classification, semantic_tags.
    """
    node = find_node(workflow, "Chunk Validator & Enricher V4")
    if not node:
        print("⚠️  Warning: 'Chunk Validator & Enricher V4' node not found")
        return False

    # Get current code and enhance it
    current_code = node['parameters'].get('jsCode', '')

    # Add enhanced metadata section before the return statement
    enhanced_metadata_code = '''
// === SOTA 2026 — D. ENHANCED METADATA ===

// Sector detection patterns
function detectSector(content, filename) {
  const contentLower = content.toLowerCase();
  const filenameLower = filename.toLowerCase();

  const patterns = {
    btp: /\b(dtu|cctp|plu|re2020|rt2012|shon|shob|permis[- ]construire)\b/i,
    finance: /\b(ifrs|bale|corep|finrep|mifid|amf|acpr|solvabilite)\b/i,
    legal: /\b(article|loi|decret|arrete|cour|conseil|cnil|rgpd|code civil)\b/i,
    industry: /\b(iso|amdec|fds|haccp|sop|gmao|tpm)\b/i
  };

  for (const [sector, pattern] of Object.entries(patterns)) {
    if (pattern.test(content) || filenameLower.includes(sector)) {
      return sector;
    }
  }
  return 'general';
}

// Language detection (simple heuristic)
function detectLanguage(content) {
  const frenchWords = /\b(le|la|les|de|et|un|une|dans|pour|que|qui|avec|sur)\b/gi;
  const englishWords = /\b(the|and|of|to|in|for|that|with|on|at)\b/gi;

  const frenchCount = (content.match(frenchWords) || []).length;
  const englishCount = (content.match(englishWords) || []).length;

  return frenchCount > englishCount ? 'fr' : 'en';
}

// Document type classification
function classifyDocType(filename, content) {
  const filenameLower = filename.toLowerCase();
  const contentSample = content.substring(0, 1000).toLowerCase();

  if (/(contrat|contract|agreement)/.test(filenameLower)) return 'contract';
  if (/(reglement|regulation|directive)/.test(filenameLower)) return 'regulation';
  if (/(rapport|report)/.test(filenameLower)) return 'report';
  if (/(specification|spec|cahier[- ]charge)/.test(filenameLower)) return 'specification';
  if (/(procedure|sop|mode[- ]operatoire)/.test(filenameLower)) return 'procedure';
  if (/(facture|invoice)/.test(filenameLower)) return 'invoice';
  if (/(devis|quote)/.test(filenameLower)) return 'quote';

  // Content-based fallback
  if (/\barticle\s+\d+/i.test(contentSample)) return 'legal_text';
  if (/\btableau|table\b/i.test(contentSample) && /\d+[.,]\d+/.test(contentSample)) return 'financial_report';

  return 'document';
}

// Semantic tags extraction (3-5 keywords per chunk)
function extractSemanticTags(content, sector) {
  const tags = new Set();

  // Sector-specific important terms
  const sectorTerms = {
    btp: ['construction', 'batiment', 'permis', 'norme', 'technique'],
    finance: ['bilan', 'resultat', 'tresorerie', 'actif', 'passif', 'cout'],
    legal: ['loi', 'article', 'obligation', 'responsabilite', 'droit'],
    industry: ['production', 'qualite', 'maintenance', 'securite', 'processus']
  };

  const terms = sectorTerms[sector] || [];
  const contentLower = content.toLowerCase();

  for (const term of terms) {
    if (contentLower.includes(term)) {
      tags.add(term);
      if (tags.size >= 5) break;
    }
  }

  // Extract capitalized terms (likely important concepts)
  const capitalizedTerms = content.match(/\b[A-ZÉÈÊÀ][A-ZÉÈÊÀa-zéèêàç]+(?:\s+[A-ZÉÈÊÀ][A-ZÉÈÊÀa-zéèêàç]+)?\b/g) || [];
  for (const term of capitalizedTerms.slice(0, 5 - tags.size)) {
    if (term.length > 3) tags.add(term.toLowerCase());
  }

  return Array.from(tags).slice(0, 5);
}

const detectedSector = detectSector(fullContent, mimeData.objectKey);
const detectedLanguage = detectLanguage(fullContent);
const detectedDocType = classifyDocType(mimeData.objectKey, fullContent);
'''

    # Insert enhanced metadata code before the final enrichedChunks mapping
    # Find the return statement and add metadata there
    lines = current_code.split('\n')

    # Find where enrichedChunks are created and enhance them
    enhanced_chunk_mapping = '''
const enrichedChunks = validatedChunks.map((chunk, idx) => {
  const chunkId = `${parentId}-chunk-${idx}`;

  let currentSection = 'Introduction';
  for (const section of sections) {
    if (section.index <= (chunk.start_index || 0)) {
      currentSection = section.header;
    } else break;
  }

  const semanticTags = extractSemanticTags(chunk.content, detectedSector);

  return {
    id: chunkId,
    content: chunk.content,
    contextual_content: chunk.content,
    contextual_prefix: '',
    topic: chunk.topic,
    section: currentSection,
    parent_id: parentId,
    parent_filename: mimeData.objectKey,
    document_title: documentTitle,
    document_type: documentType,
    quality_score: mimeData.quality_score,
    version: 1,
    is_obsolete: false,
    chunk_method: isValid ? mimeData.chunking_method : 'recursive_fallback',
    chunk_index: idx,
    total_chunks: validatedChunks.length,
    tenant_id: mimeData.tenant_id,
    trace_id: mimeData.traceId,
    pii_count: piiData.pii_count || 0,
    created_at: new Date().toISOString(),
    // === SOTA 2026 D: Enhanced Metadata ===
    sector: detectedSector,
    language: detectedLanguage,
    doc_type: detectedDocType,
    semantic_tags: semanticTags,
    metadata_version: 'v4.0'
  };
});
'''

    # Replace the enrichedChunks mapping in the code
    new_code = current_code

    # Find the enrichedChunks mapping and replace it
    start_marker = 'const enrichedChunks = validatedChunks.map'
    end_marker = '});'

    if start_marker in new_code:
        # Insert enhanced metadata functions before enrichedChunks
        insertion_point = new_code.find(start_marker)
        new_code = (
            new_code[:insertion_point] +
            enhanced_metadata_code +
            '\n' +
            enhanced_chunk_mapping +
            '\n' +
            new_code[new_code.find('return {', insertion_point):]
        )

    node['parameters']['jsCode'] = new_code
    node['notes'] = "PATCH P04 + SOTA 2026 D: Enhanced metadata (sector, language, doc_type, semantic_tags)"

    print("✅ D. Enhanced Metadata: Updated Chunk Validator & Enricher V4")
    return True


def add_french_ner_node(workflow: Dict[str, Any]) -> bool:
    """
    E. French NER Integration - Add French NER Extractor V4 node after chunking.
    Extract French entities (PERSON, ORG, LOCATION, DATE, AMOUNT).
    """
    chunk_validator = find_node(workflow, "Chunk Validator & Enricher V4")
    if not chunk_validator:
        print("⚠️  Warning: 'Chunk Validator & Enricher V4' node not found")
        return False

    ner_node = {
        "parameters": {
            "jsCode": '''// SOTA 2026 — E. French NER Extractor V4
// Extract French named entities for better filtering and retrieval
// Reference: technicals/project/rag-research-2026.md (Entity-aware retrieval)

const chunkData = $json;
const chunks = chunkData.chunks || [];

// === FRENCH NER PATTERNS ===
const patterns = {
  // French legal entities
  legal_institutions: /\b(Cour de cassation|Conseil d'État|Conseil constitutionnel|Tribunal|CNIL|AMF|ACPR)\b/gi,

  // French companies (common suffixes)
  companies: /\b([A-ZÉÈÊ][a-zéèêàç]+(?:\s+[A-ZÉÈÊ][a-zéèêàç]+)*)\s+(SA|SAS|SARL|SCA|SCM|EURL|SCI)\b/gi,

  // French organizations
  organizations: /\b(Ministère|Direction|Agence|Commission|Autorité)\s+(?:de\s+|des\s+|d')?([A-ZÉÈÊ][a-zéèêàç\s]+)\b/gi,

  // French locations
  locations: /\b(Paris|Lyon|Marseille|Toulouse|Nice|Nantes|Strasbourg|Bordeaux|Lille|Rennes)\b/gi,

  // Dates (French format)
  dates: /\b\d{1,2}(?:er)?\s+(?:janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+\d{4}\b/gi,

  // Amounts (Euro)
  amounts: /\b\d+(?:\s?\d{3})*(?:[.,]\d+)?\s*(?:€|EUR|euros?)\b/gi,

  // Persons (titles + names)
  persons: /\b(?:M\.|Mme|Monsieur|Madame|Dr\.|Professeur)\s+([A-ZÉÈÊ][a-zéèêàç]+(?:\s+[A-ZÉÈÊ][a-zéèêàç]+)*)\b/gi
};

// Extract entities from chunk content
function extractEntities(content) {
  const entities = {
    persons: [],
    organizations: [],
    locations: [],
    dates: [],
    amounts: [],
    legal_entities: []
  };

  // Legal institutions
  const legalMatches = content.matchAll(patterns.legal_institutions);
  for (const match of legalMatches) {
    entities.legal_entities.push(match[0]);
  }

  // Companies
  const companyMatches = content.matchAll(patterns.companies);
  for (const match of companyMatches) {
    entities.organizations.push(match[0]);
  }

  // Organizations
  const orgMatches = content.matchAll(patterns.organizations);
  for (const match of orgMatches) {
    entities.organizations.push(match[0]);
  }

  // Locations
  const locationMatches = content.matchAll(patterns.locations);
  for (const match of locationMatches) {
    entities.locations.push(match[0]);
  }

  // Dates
  const dateMatches = content.matchAll(patterns.dates);
  for (const match of dateMatches) {
    entities.dates.push(match[0]);
  }

  // Amounts
  const amountMatches = content.matchAll(patterns.amounts);
  for (const match of amountMatches) {
    entities.amounts.push(match[0]);
  }

  // Persons
  const personMatches = content.matchAll(patterns.persons);
  for (const match of personMatches) {
    entities.persons.push(match[1]);  // Capture group 1 = name only
  }

  // Deduplicate
  for (const key of Object.keys(entities)) {
    entities[key] = [...new Set(entities[key])];
  }

  return entities;
}

// Enrich chunks with NER entities
const enrichedChunks = chunks.map(chunk => {
  const entities = extractEntities(chunk.content || '');
  const totalEntities = Object.values(entities).flat().length;

  return {
    ...chunk,
    entities: entities,
    entity_count: totalEntities,
    has_entities: totalEntities > 0,
    ner_version: 'v4.0'
  };
});

return {
  ...chunkData,
  chunks: enrichedChunks,
  total_entities_extracted: enrichedChunks.reduce((sum, c) => sum + c.entity_count, 0)
};'''
        },
        "id": create_node_id(),
        "name": "French NER Extractor V4",
        "type": "n8n-nodes-base.code",
        "typeVersion": 2,
        "position": [
            chunk_validator['position'][0] + 240,
            chunk_validator['position'][1]
        ],
        "notes": "SOTA 2026 E: French Named Entity Recognition for better filtering"
    }

    workflow['nodes'].append(ner_node)

    print("✅ E. French NER: Added French NER Extractor V4 node")
    return True


def enhance_bm25_node(workflow: Dict[str, Any]) -> bool:
    """
    F. BM25 Improvements - Enhance BM25 Sparse Vector Generator.
    Add French stop words, sector-specific term weighting.
    """
    # First, find if BM25 node exists
    bm25_node = None
    for node in workflow.get('nodes', []):
        if 'BM25' in node.get('name', ''):
            bm25_node = node
            break

    if not bm25_node:
        print("⚠️  Warning: BM25 node not found, creating new one")

        # Create new BM25 node
        chunk_validator = find_node(workflow, "Chunk Validator & Enricher V4")
        if not chunk_validator:
            return False

        bm25_node = {
            "parameters": {
                "jsCode": ""
            },
            "id": create_node_id(),
            "name": "BM25 Sparse Vector Generator V4",
            "type": "n8n-nodes-base.code",
            "typeVersion": 2,
            "position": [
                chunk_validator['position'][0] + 480,
                chunk_validator['position'][1] + 200
            ],
            "notes": "SOTA 2026 F: BM25 with French stop words and sector weighting"
        }
        workflow['nodes'].append(bm25_node)

    # Enhanced BM25 code
    bm25_code = '''// SOTA 2026 — F. BM25 Improvements
// French stop words removal + sector-specific term weighting
// Reference: technicals/project/rag-research-2026.md (Hybrid retrieval)

const chunkData = $json;
const chunks = chunkData.chunks || [];

// === FRENCH STOP WORDS ===
const FRENCH_STOP_WORDS = new Set([
  'le', 'la', 'les', 'un', 'une', 'des', 'de', 'du', 'au', 'aux',
  'et', 'ou', 'mais', 'donc', 'or', 'ni', 'car',
  'dans', 'sur', 'sous', 'avec', 'pour', 'par', 'sans', 'vers',
  'à', 'ce', 'cet', 'cette', 'ces', 'mon', 'ton', 'son', 'notre', 'votre', 'leur',
  'je', 'tu', 'il', 'elle', 'nous', 'vous', 'ils', 'elles',
  'qui', 'que', 'quoi', 'dont', 'où',
  'si', 'ne', 'pas', 'plus', 'moins', 'très', 'trop',
  'être', 'avoir', 'faire', 'dire', 'aller', 'voir', 'savoir', 'pouvoir', 'vouloir'
]);

// === SECTOR-SPECIFIC TERM WEIGHTS ===
const SECTOR_TERMS = {
  btp: ['construction', 'batiment', 'permis', 'norme', 'technique', 'dtu', 'cctp'],
  finance: ['bilan', 'resultat', 'tresorerie', 'actif', 'passif', 'cout', 'ifrs'],
  legal: ['loi', 'article', 'obligation', 'responsabilite', 'droit', 'tribunal', 'arret'],
  industry: ['production', 'qualite', 'maintenance', 'securite', 'processus', 'iso']
};

// === TOKENIZATION (French-aware) ===
function tokenize(text) {
  // Handle French compound words and contractions
  return text
    .toLowerCase()
    .replace(/['']/g, ' ')  // Split contractions (l'article → l article)
    .replace(/[^\w\sàâäéèêëïîôùûüÿæœç-]/g, ' ')  // Keep French chars
    .split(/\s+/)
    .filter(t => t.length > 2 && !FRENCH_STOP_WORDS.has(t));
}

// === BM25 PARAMETERS ===
const k1 = 1.2;  // Term frequency saturation
const b = 0.75;  // Length normalization

// Compute document lengths
const docLengths = chunks.map(c => tokenize(c.content || '').length);
const avgDocLength = docLengths.reduce((a, b) => a + b, 0) / docLengths.length;

// Compute IDF (Inverse Document Frequency)
const allTokens = chunks.flatMap(c => tokenize(c.content || ''));
const vocabulary = [...new Set(allTokens)];

const idf = {};
for (const term of vocabulary) {
  const df = chunks.filter(c => tokenize(c.content || '').includes(term)).length;
  idf[term] = Math.log((chunks.length - df + 0.5) / (df + 0.5) + 1);
}

// === GENERATE SPARSE VECTORS ===
const enrichedChunks = chunks.map((chunk, idx) => {
  const tokens = tokenize(chunk.content || '');
  const docLength = docLengths[idx];
  const sector = chunk.sector || 'general';

  // Term frequency
  const tf = {};
  for (const token of tokens) {
    tf[token] = (tf[token] || 0) + 1;
  }

  // BM25 scores
  const sparseVector = {};
  for (const [term, freq] of Object.entries(tf)) {
    const termIdf = idf[term] || 0;
    const lengthNorm = 1 - b + b * (docLength / avgDocLength);
    let score = termIdf * (freq * (k1 + 1)) / (freq + k1 * lengthNorm);

    // === SECTOR-SPECIFIC WEIGHTING ===
    // Legal terms get +50% weight in juridique sector
    const sectorTerms = SECTOR_TERMS[sector] || [];
    if (sectorTerms.includes(term)) {
      score *= 1.5;
    }

    sparseVector[term] = score;
  }

  // Top 100 terms (BM25 is typically sparse)
  const sortedTerms = Object.entries(sparseVector)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 100);

  const topSparseVector = Object.fromEntries(sortedTerms);

  return {
    ...chunk,
    sparse_vector: topSparseVector,
    sparse_vector_size: Object.keys(topSparseVector).length,
    bm25_version: 'v4.0'
  };
});

return {
  ...chunkData,
  chunks: enrichedChunks,
  vocabulary_size: vocabulary.length,
  avg_sparse_vector_size: enrichedChunks.reduce((sum, c) => sum + c.sparse_vector_size, 0) / enrichedChunks.length
};'''

    bm25_node['parameters']['jsCode'] = bm25_code
    bm25_node['name'] = "BM25 Sparse Vector Generator V4"
    bm25_node['notes'] = "SOTA 2026 F: French stop words + sector-specific term weighting"

    print("✅ F. BM25 Improvements: Enhanced BM25 node with French support")
    return True


def update_workflow_metadata(workflow: Dict[str, Any]) -> None:
    """Update workflow metadata to V4.0."""
    workflow['name'] = 'Ingestion V4.0 (SOTA 2026)'
    if 'meta' not in workflow or workflow['meta'] is None:
        workflow['meta'] = {}
    if 'instanceId' not in workflow['meta']:
        workflow['meta']['instanceId'] = create_node_id()

    # Update settings
    if 'settings' not in workflow:
        workflow['settings'] = {}

    workflow['settings']['executionOrder'] = 'v1'

    # Add upgrade notes
    if 'tags' not in workflow:
        workflow['tags'] = []

    if {'name': 'SOTA-2026'} not in workflow['tags']:
        workflow['tags'].append({'name': 'SOTA-2026'})

    print("✅ Updated workflow metadata to V4.0")


def main():
    """Main upgrade process."""
    print("=" * 80)
    print("INGESTION V3.1 → V4.0 UPGRADE (SOTA 2026)")
    print("=" * 80)
    print()

    # Check if ingestion.json exists
    if not INGESTION_JSON.exists():
        print(f"❌ Error: {INGESTION_JSON} not found")
        return 1

    print(f"📖 Reading workflow from {INGESTION_JSON}")
    workflow = read_workflow(INGESTION_JSON)

    print(f"   Current workflow: {workflow.get('name', 'Unknown')}")
    print(f"   Total nodes: {len(workflow.get('nodes', []))}")
    print()

    # Create backup
    print(f"💾 Creating backup at {BACKUP_JSON}")
    BACKUP_JSON.parent.mkdir(parents=True, exist_ok=True)
    write_workflow(BACKUP_JSON, workflow)
    print("   ✅ Backup created")
    print()

    # Apply upgrades
    print("🔧 Applying SOTA 2026 upgrades:")
    print()

    changes = []

    if upgrade_embeddings_node(workflow):
        changes.append("A. Late Chunking")

    if add_sector_router_node(workflow):
        changes.append("B. Sector-Aware Router")

    if enhance_qa_enricher_node(workflow):
        changes.append("C. CompactRAG QA Pairs")

    if enhance_chunk_validator_metadata(workflow):
        changes.append("D. Enhanced Metadata")

    if add_french_ner_node(workflow):
        changes.append("E. French NER")

    if enhance_bm25_node(workflow):
        changes.append("F. BM25 Improvements")

    print()
    update_workflow_metadata(workflow)
    print()

    # Save upgraded workflow
    print(f"💾 Saving upgraded workflow to {INGESTION_JSON}")
    write_workflow(INGESTION_JSON, workflow)
    print("   ✅ Workflow saved")
    print()

    # Summary
    print("=" * 80)
    print("UPGRADE SUMMARY")
    print("=" * 80)
    print()
    print(f"✅ Successfully upgraded Ingestion V3.1 → V4.0")
    print()
    print("Changes applied:")
    for i, change in enumerate(changes, 1):
        print(f"  {i}. {change}")
    print()
    print(f"Total nodes in workflow: {len(workflow.get('nodes', []))}")
    print()
    print(f"Backup saved to: {BACKUP_JSON}")
    print(f"Upgraded workflow: {INGESTION_JSON}")
    print()
    print("⚠️  IMPORTANT: Import the workflow to n8n and verify connections manually")
    print("   Some connections may need adjustment after adding new nodes.")
    print()
    print("Next steps:")
    print("  1. Import workflow to n8n HF Space (16GB RAM)")
    print("  2. Verify all node connections")
    print("  3. Test with a sample document")
    print("  4. Run full ingestion test (10-50 docs)")
    print("  5. Sync back to VM: python3 n8n/sync.py")
    print()
    print("=" * 80)

    return 0


if __name__ == '__main__':
    sys.exit(main())
