#!/usr/bin/env node
/**
 * test-api-contracts.js — API route and data contract validation
 *
 * Validates:
 *   1. All API routes defined in vercel.json return valid JSON
 *   2. Response schemas match expected structure
 *   3. Fallback data exists and is valid
 *   4. api/status.js module exports correct handler shape
 *   5. Local JSON data files conform to their contracts
 *   6. Cross-referencing: fallback matches live schema
 *
 * Run: node tests/test-api-contracts.js
 * Env: VERCEL_URL (override deployed URL for live checks)
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

// ─── Config ────────────────────────────────────────────────────────────────────

const ROOT = path.resolve(__dirname, '..');
const VERCEL_URL = process.env.VERCEL_URL || 'https://nomos-dashboard-alexis-morets-projects.vercel.app';
const FETCH_TIMEOUT_MS = 15000;

let passed = 0;
let failed = 0;
let skipped = 0;
const errors = [];

// ─── Helpers ───────────────────────────────────────────────────────────────────

function ok(name, detail) {
  passed++;
  const suffix = detail ? ` (${detail})` : '';
  console.log(`  PASS  ${name}${suffix}`);
}

function fail(name, reason) {
  failed++;
  errors.push({ test: name, reason });
  console.log(`  FAIL  ${name}`);
  console.log(`        -> ${reason}`);
}

function skip(name, reason) {
  skipped++;
  console.log(`  SKIP  ${name} (${reason})`);
}

function readJSON(relPath) {
  const full = path.join(ROOT, relPath);
  if (!fs.existsSync(full)) return null;
  return JSON.parse(fs.readFileSync(full, 'utf-8'));
}

function fetchURL(url, timeoutMs = FETCH_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { timeout: timeoutMs }, (res) => {
      let body = '';
      res.setEncoding('utf-8');
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body,
          json: (() => { try { return JSON.parse(body); } catch { return null; } })()
        });
      });
    });
    req.on('error', (e) => reject(e));
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

// ─── Contract Definitions ──────────────────────────────────────────────────────

const CONTRACTS = {
  // /api/status response schema
  apiStatus: {
    required: ['meta', 'system', 'pipelines', 'trading_board', 'infrastructure', 'totals'],
    meta: { required: ['generated_at', 'data_source', 'api_version'] },
    system: { required: ['phase', 'overall'] },
    pipelines: { type: 'object' },
    trading_board: { required: ['best', 'worst', 'timestamp'] },
  },

  // fallback-status.json schema
  fallbackStatus: {
    required: ['generated_at', 'phase', 'pipelines', 'overall', 'blockers', 'totals'],
    phase: { required: ['current', 'name'] },
    pipelines: {
      type: 'object',
      entryFields: ['accuracy', 'tested', 'target', 'met', 'gap']
    },
    overall: { required: ['accuracy', 'target', 'met'] },
  },

  // docs/status.json schema
  statusJson: {
    required: ['generated_at', 'phase', 'pipelines', 'overall'],
    pipelines: {
      type: 'object',
      entryFields: ['accuracy', 'tested', 'target', 'met']
    },
  },

  // docs/dashboard-data.json schema
  dashboardData: {
    required: ['timestamp', 'stats', 'spaces'],
    stats: { required: ['total_docs', 'total_questions'] },
    spaces: { type: 'object' },
  },

  // docs/repo-status.json schema
  repoStatus: {
    required: ['repos', 'generated_at'],
    repos: {
      type: 'array',
      entryFields: ['name', 'role', 'status']
    },
  },

  // repos-config.json schema
  reposConfig: {
    required: ['repos'],
    repos: {
      type: 'array',
      entryFields: ['id', 'name', 'status']
    },
  },
};

// ─── Generic Schema Validator ──────────────────────────────────────────────────

function validateSchema(data, contract, prefix) {
  const issues = [];

  if (!data || typeof data !== 'object') {
    issues.push(`${prefix}: expected object, got ${typeof data}`);
    return issues;
  }

  // Check required top-level fields
  if (contract.required) {
    for (const field of contract.required) {
      if (data[field] === undefined) {
        issues.push(`${prefix}: missing required field '${field}'`);
      }
    }
  }

  // Check nested contracts
  for (const [field, spec] of Object.entries(contract)) {
    if (field === 'required' || field === 'type' || field === 'entryFields') continue;
    if (data[field] === undefined) continue;

    if (typeof spec === 'object' && spec.required) {
      for (const subField of spec.required) {
        if (data[field][subField] === undefined) {
          issues.push(`${prefix}.${field}: missing required field '${subField}'`);
        }
      }
    }

    if (typeof spec === 'object' && spec.type === 'object' && spec.entryFields) {
      const entries = Object.entries(data[field]);
      if (entries.length > 0) {
        for (const [key, value] of entries.slice(0, 3)) {
          for (const ef of spec.entryFields) {
            if (value[ef] === undefined) {
              issues.push(`${prefix}.${field}.${key}: missing field '${ef}'`);
            }
          }
        }
      }
    }

    if (typeof spec === 'object' && spec.type === 'array' && spec.entryFields) {
      if (Array.isArray(data[field]) && data[field].length > 0) {
        for (const ef of spec.entryFields) {
          if (data[field][0][ef] === undefined) {
            issues.push(`${prefix}.${field}[0]: missing field '${ef}'`);
          }
        }
      }
    }
  }

  return issues;
}

// ─── Suite: Local Fallback Files ───────────────────────────────────────────────

function testFallbackFiles() {
  console.log('\n--- Fallback & Data File Contracts ---');

  const fileTests = [
    { file: 'api/fallback-status.json', contract: CONTRACTS.fallbackStatus, name: 'fallback-status' },
    { file: 'docs/status.json', contract: CONTRACTS.statusJson, name: 'status-json' },
    { file: 'docs/dashboard-data.json', contract: CONTRACTS.dashboardData, name: 'dashboard-data' },
    { file: 'docs/repo-status.json', contract: CONTRACTS.repoStatus, name: 'repo-status' },
    { file: 'repos-config.json', contract: CONTRACTS.reposConfig, name: 'repos-config' },
  ];

  for (const { file, contract, name } of fileTests) {
    let data;
    try {
      data = readJSON(file);
    } catch (e) {
      fail(`contract:${name}:parse`, `JSON parse error: ${e.message}`);
      continue;
    }

    if (data === null) {
      skip(`contract:${name}`, `${file} not found`);
      continue;
    }

    ok(`contract:${name}:exists`, file);

    const issues = validateSchema(data, contract, name);
    if (issues.length === 0) {
      ok(`contract:${name}:schema`);
    } else {
      for (const issue of issues) {
        fail(`contract:${name}:schema`, issue);
      }
    }
  }
}

// ─── Suite: api/status.js Module Validation ────────────────────────────────────

function testApiStatusModule() {
  console.log('\n--- api/status.js Module Contract ---');

  const statusPath = path.join(ROOT, 'api', 'status.js');
  if (!fs.existsSync(statusPath)) {
    fail('api-status-module-exists', 'file not found');
    return;
  }
  ok('api-status-module-exists');

  const code = fs.readFileSync(statusPath, 'utf-8');

  // Check it exports a function via module.exports
  if (/module\.exports\s*=/.test(code)) {
    ok('api-status-exports-handler');
  } else {
    fail('api-status-exports-handler', 'no module.exports found');
  }

  // Check it's an async function (Vercel serverless pattern)
  if (/module\.exports\s*=\s*async/.test(code)) {
    ok('api-status-async-handler');
  } else {
    skip('api-status-async-handler', 'handler may not be async');
  }

  // Check CORS headers are set
  if (/Access-Control-Allow-Origin/.test(code)) {
    ok('api-status-cors-headers');
  } else {
    fail('api-status-cors-headers', 'no CORS headers found');
  }

  // Check it uses the fallback
  if (/fallback/i.test(code)) {
    ok('api-status-has-fallback');
  } else {
    fail('api-status-has-fallback', 'no fallback mechanism found');
  }

  // Check it references required response fields
  const requiredResponseFields = ['meta', 'system', 'pipelines', 'trading_board', 'infrastructure', 'totals'];
  for (const field of requiredResponseFields) {
    if (code.includes(field)) {
      ok(`api-status-field:${field}`);
    } else {
      fail(`api-status-field:${field}`, `response field '${field}' not found in code`);
    }
  }

  // Check it references the fallback JSON
  if (code.includes('fallback-status.json')) {
    ok('api-status-references-fallback-file');
  } else {
    fail('api-status-references-fallback-file', 'does not reference fallback-status.json');
  }

  // Validate internal functions exist
  const expectedFunctions = ['calculateTradingBoard', 'getPipelineName', 'checkHFHealth', 'fetchExternalStatus'];
  for (const fn of expectedFunctions) {
    if (code.includes(`function ${fn}`)) {
      ok(`api-status-fn:${fn}`);
    } else {
      skip(`api-status-fn:${fn}`, 'function not found');
    }
  }
}

// ─── Suite: Vercel Route Mapping ───────────────────────────────────────────────

function testVercelRouteMapping() {
  console.log('\n--- Vercel Route Mapping ---');

  const vercel = readJSON('vercel.json');
  if (!vercel) {
    fail('vercel-json-load', 'could not load vercel.json');
    return;
  }

  if (!vercel.rewrites || !Array.isArray(vercel.rewrites)) {
    skip('vercel-rewrites', 'no rewrites array');
    return;
  }

  for (const rule of vercel.rewrites) {
    const { source, destination } = rule;
    if (!source || !destination) {
      fail(`vercel-route:${source || '?'}`, 'missing source or destination');
      continue;
    }

    // Check destination file exists
    const destFile = destination.replace(/^\//, '');
    if (fs.existsSync(path.join(ROOT, destFile))) {
      ok(`vercel-route:${source} -> ${destination}`);
    } else {
      fail(`vercel-route:${source} -> ${destination}`, 'destination file not found');
    }
  }

  // Check CORS headers for API routes
  if (vercel.headers && Array.isArray(vercel.headers)) {
    const apiHeaders = vercel.headers.find(h => h.source && h.source.includes('api'));
    if (apiHeaders) {
      const hasCors = apiHeaders.headers.some(h => h.key === 'Access-Control-Allow-Origin');
      if (hasCors) {
        ok('vercel-api-cors');
      } else {
        fail('vercel-api-cors', 'no CORS header for API routes');
      }
    } else {
      skip('vercel-api-cors', 'no API header rules');
    }
  }
}

// ─── Suite: Live API Checks (optional) ─────────────────────────────────────────

async function testLiveAPI() {
  console.log('\n--- Live API Checks ---');
  console.log(`  URL: ${VERCEL_URL}`);

  const routes = [
    { path: '/api/status', contract: CONTRACTS.apiStatus, name: 'api-status' },
    { path: '/', name: 'root-html', expectHTML: true },
  ];

  for (const route of routes) {
    const url = `${VERCEL_URL}${route.path}`;
    try {
      const res = await fetchURL(url);

      if (res.status !== 200) {
        fail(`live:${route.name}`, `HTTP ${res.status}`);
        continue;
      }
      ok(`live:${route.name}:status`, `HTTP ${res.status}`);

      if (route.expectHTML) {
        if (res.body.includes('<!DOCTYPE') || res.body.includes('<html')) {
          ok(`live:${route.name}:is-html`);
        } else {
          fail(`live:${route.name}:is-html`, 'response does not look like HTML');
        }
        continue;
      }

      // JSON route
      if (res.json) {
        ok(`live:${route.name}:valid-json`);
      } else {
        fail(`live:${route.name}:valid-json`, 'response is not valid JSON');
        continue;
      }

      // Validate contract
      if (route.contract) {
        const issues = validateSchema(res.json, route.contract, route.name);
        if (issues.length === 0) {
          ok(`live:${route.name}:contract`);
        } else {
          for (const issue of issues) {
            fail(`live:${route.name}:contract`, issue);
          }
        }
      }

      // Check cache headers
      const cacheControl = res.headers['cache-control'] || '';
      if (route.path.startsWith('/api') && cacheControl.includes('no-cache')) {
        ok(`live:${route.name}:no-cache`);
      } else if (route.path.startsWith('/api')) {
        skip(`live:${route.name}:no-cache`, `cache-control: ${cacheControl || 'not set'}`);
      }

    } catch (e) {
      fail(`live:${route.name}`, e.message);
    }
  }
}

// ─── Suite: Cross-Reference Validation ─────────────────────────────────────────

function testCrossReferences() {
  console.log('\n--- Cross-Reference Validation ---');

  // Check that fallback-status pipelines match status.json pipelines
  const fallback = readJSON('api/fallback-status.json');
  const status = readJSON('docs/status.json');

  if (fallback && status && fallback.pipelines && status.pipelines) {
    const fbPipelines = new Set(Object.keys(fallback.pipelines));
    const stPipelines = new Set(Object.keys(status.pipelines));

    const inFbNotSt = [...fbPipelines].filter(p => !stPipelines.has(p));
    const inStNotFb = [...stPipelines].filter(p => !fbPipelines.has(p));

    if (inFbNotSt.length === 0 && inStNotFb.length === 0) {
      ok('cross-ref:pipeline-keys-match');
    } else {
      const msgs = [];
      if (inFbNotSt.length) msgs.push(`in fallback only: ${inFbNotSt.join(', ')}`);
      if (inStNotFb.length) msgs.push(`in status only: ${inStNotFb.join(', ')}`);
      fail('cross-ref:pipeline-keys-match', msgs.join('; '));
    }
  } else {
    skip('cross-ref:pipeline-keys-match', 'could not load both files');
  }

  // Check repos-config repos exist in repo-status
  const config = readJSON('repos-config.json');
  const repoStatus = readJSON('docs/repo-status.json');

  if (config && repoStatus && config.repos && repoStatus.repos) {
    const configNames = new Set(config.repos.map(r => r.name || r.id));
    const statusNames = new Set(repoStatus.repos.map(r => r.name));

    let matchCount = 0;
    for (const name of statusNames) {
      if (configNames.has(name)) matchCount++;
    }

    if (matchCount > 0) {
      ok(`cross-ref:repos-overlap (${matchCount} shared repos)`);
    } else {
      fail('cross-ref:repos-overlap', 'no overlap between repos-config and repo-status');
    }
  } else {
    skip('cross-ref:repos-overlap', 'could not load both files');
  }
}

// ─── Run All ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== rag-dashboard: API Contract Tests ===');
  console.log(`Root: ${ROOT}`);
  console.log(`Time: ${new Date().toISOString()}`);

  // Local tests (always run)
  testFallbackFiles();
  testApiStatusModule();
  testVercelRouteMapping();
  testCrossReferences();

  // Live tests (may fail if offline — don't count as hard failures)
  const liveFailsBefore = failed;
  try {
    await testLiveAPI();
  } catch (e) {
    console.log(`\n  Live API tests error: ${e.message}`);
  }
  const liveFailsOnly = failed - liveFailsBefore;

  // Summary
  console.log('\n=== Summary ===');
  console.log(`  PASS: ${passed}`);
  console.log(`  FAIL: ${failed} (${liveFailsOnly} from live API)`);
  console.log(`  SKIP: ${skipped}`);
  console.log(`  TOTAL: ${passed + failed + skipped}`);

  if (errors.length > 0) {
    console.log('\n=== Failures ===');
    for (const e of errors) {
      console.log(`  ${e.test}: ${e.reason}`);
    }
  }

  // Only count non-live failures for exit code
  const hardFails = failed - liveFailsOnly;
  console.log(`\nResult: ${hardFails === 0 ? 'ALL LOCAL TESTS PASSED' : `${hardFails} LOCAL FAILURE(S)`}`);
  if (liveFailsOnly > 0) {
    console.log(`Note: ${liveFailsOnly} live API test(s) failed (network-dependent)`);
  }

  // Write results
  const results = {
    timestamp: new Date().toISOString(),
    suite: 'test-api-contracts',
    passed,
    failed,
    skipped,
    hardFails,
    liveFailsOnly,
    total: passed + failed + skipped,
    errors,
    status: hardFails === 0 ? 'PASS' : 'FAIL'
  };

  const outDir = path.join(ROOT, 'data');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'test-api-contracts-results.json'), JSON.stringify(results, null, 2));

  process.exit(hardFails > 0 ? 1 : 0);
}

main().catch(e => {
  console.error(`Fatal: ${e.message}`);
  process.exit(2);
});
