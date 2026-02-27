/**
 * API Status Endpoint
 * 
 * Returns live pipeline health status with fallback to local JSON
 * when external data sources are unavailable.
 * 
 * Endpoint: GET /api/status
 * Response: JSON with pipeline health, trading board rankings, and system status
 */

// Local fallback data when external sources fail
const FALLBACK_STATUS = require('./fallback-status.json');

// External data source URLs
const EXTERNAL_STATUS_URL = 'https://raw.githubusercontent.com/LBJLincoln/mon-ipad/main/docs/status.json';
const HF_HEALTH_URL = 'https://lbjlincoln-nomos-rag-engine.hf.space/healthz';
const REFRESH_INTERVAL_MS = 30000; // 30 seconds

/**
 * Calculate trading board rankings from pipeline data
 * 
 * @param {Object} pipelines - Pipeline accuracy data
 * @returns {Object} Trading board with BEST, MIDDLE (rolling), WORST
 */
function calculateTradingBoard(pipelines) {
  if (!pipelines || Object.keys(pipelines).length === 0) {
    return { best: null, middle: [], worst: null, timestamp: new Date().toISOString() };
  }

  // Convert to array and sort by accuracy (descending)
  const sorted = Object.entries(pipelines)
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => (b.accuracy || 0) - (a.accuracy || 0));

  if (sorted.length === 0) {
    return { best: null, middle: [], worst: null, timestamp: new Date().toISOString() };
  }

  // BEST: Fixed #1 performer
  const best = {
    rank: 1,
    pipeline: sorted[0].id,
    name: getPipelineName(sorted[0].id),
    accuracy: sorted[0].accuracy,
    target: sorted[0].target,
    gap: sorted[0].gap,
    met: sorted[0].met,
    tested: sorted[0].tested
  };

  // WORST: Fixed last performer
  const worst = {
    rank: sorted.length,
    pipeline: sorted[sorted.length - 1].id,
    name: getPipelineName(sorted[sorted.length - 1].id),
    accuracy: sorted[sorted.length - 1].accuracy,
    target: sorted[sorted.length - 1].target,
    gap: sorted[sorted.length - 1].gap,
    met: sorted[sorted.length - 1].met,
    tested: sorted[sorted.length - 1].tested
  };

  // MIDDLE: Rolling placeholders (exclude BEST and WORST)
  const middle = sorted.slice(1, -1).map((p, idx) => ({
    rank: idx + 2, // Rank starts at 2 (after BEST)
    pipeline: p.id,
    name: getPipelineName(p.id),
    accuracy: p.accuracy,
    target: p.target,
    gap: p.gap,
    met: p.met,
    tested: p.tested,
    // Rolling indicator: shows trend potential
    trend: p.gap >= 0 ? 'stable' : p.gap >= -5 ? 'recovering' : 'at-risk'
  }));

  return {
    best,
    middle,
    worst,
    timestamp: new Date().toISOString(),
    summary: {
      total: sorted.length,
      passing: sorted.filter(p => p.met).length,
      atRisk: sorted.filter(p => !p.met && p.gap >= -5).length,
      critical: sorted.filter(p => !p.met && p.gap < -5).length
    }
  };
}

/**
 * Get human-readable pipeline name
 */
function getPipelineName(id) {
  const names = {
    standard: 'Standard RAG',
    graph: 'Graph RAG',
    quantitative: 'Quantitative RAG',
    orchestrator: 'Orchestrator'
  };
  return names[id] || id;
}

/**
 * Check HF Space health
 */
async function checkHFHealth() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(HF_HEALTH_URL, {
      signal: controller.signal,
      mode: 'no-cors'
    });
    
    clearTimeout(timeoutId);
    return { healthy: true, status: 'online', latency: 'normal' };
  } catch (error) {
    return { 
      healthy: false, 
      status: 'offline', 
      latency: null,
      error: error.message 
    };
  }
}

/**
 * Fetch external status with timeout
 */
async function fetchExternalStatus() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    
    const response = await fetch(`${EXTERNAL_STATUS_URL}?t=${Date.now()}`, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' }
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    throw new Error(`External fetch failed: ${error.message}`);
  }
}

/**
 * Main handler for /api/status
 */
module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const startTime = Date.now();
  let dataSource = 'external';
  let statusData = null;
  let hfHealth = { healthy: false, status: 'unknown' };

  try {
    // Try to fetch external data and check HF health in parallel
    const [externalData, health] = await Promise.all([
      fetchExternalStatus().catch(() => null),
      checkHFHealth()
    ]);
    
    hfHealth = health;

    if (externalData) {
      statusData = externalData;
      dataSource = 'external';
    } else {
      // Fallback to local JSON
      statusData = FALLBACK_STATUS;
      dataSource = 'local_fallback';
    }
  } catch (error) {
    // Complete fallback
    statusData = FALLBACK_STATUS;
    dataSource = 'local_fallback';
  }

  // Calculate trading board
  const tradingBoard = calculateTradingBoard(statusData.pipelines);

  // Build response
  const response = {
    meta: {
      generated_at: new Date().toISOString(),
      response_time_ms: Date.now() - startTime,
      data_source: dataSource,
      refresh_interval_ms: REFRESH_INTERVAL_MS,
      api_version: '1.0'
    },
    system: {
      phase: statusData.phase || { current: 1, name: 'Unknown', gates_passed: false },
      overall: statusData.overall || { accuracy: 0, target: 75, met: false },
      blockers: statusData.blockers || [],
      next_action: statusData.next_action || null
    },
    pipelines: statusData.pipelines || {},
    trading_board: tradingBoard,
    infrastructure: {
      hf_space: hfHealth,
      github_raw: dataSource === 'external' ? 'online' : 'fallback_active'
    },
    totals: statusData.totals || { unique_questions: 0, test_runs: 0, iterations: 0 }
  };

  res.status(200).json(response);
};
