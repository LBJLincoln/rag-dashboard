/**
 * Dashboard configuration — shared across pages
 */
const CONFIG = {
    refreshInterval: 30000,
    githubRaw: 'https://raw.githubusercontent.com/LBJLincoln/rag-dashboard/main',
    n8nHost: 'https://lbjlincoln-nomos-rag-engine.hf.space',
    pipelines: [
        { id: 'standard', name: 'Standard RAG', path: '/webhook/rag-multi-index-v3', target: 85.0, color: '#58A6FF' },
        { id: 'graph', name: 'Graph RAG', path: '/webhook/ff622742-6d71-4e91-af71-b5c666088717', target: 70.0, color: '#BC8CFF' },
        { id: 'quantitative', name: 'Quantitative RAG', path: '/webhook/3e0f8010-39e0-4bca-9d19-35e5094391a9', target: 85.0, color: '#39D353' },
        { id: 'orchestrator', name: 'Orchestrator', path: '/webhook/92217bb8-ffc8-459a-8331-3f553812c3d0', target: 70.0, color: '#39D2C0' }
    ]
};
