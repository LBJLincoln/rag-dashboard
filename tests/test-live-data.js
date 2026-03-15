#!/usr/bin/env node
/**
 * test-live-data.js — Live data endpoint validation
 *
 * Fetches data from the VM HTTP server and validates:
 *   1. Response is valid JSON
 *   2. Schema matches expected structure
 *   3. Data freshness (not older than configurable threshold)
 *   4. Per-repo and per-pipeline health scores
 *   5. HF Space health from dashboard-data.json
 *
 * Run: node tests/test-live-data.js
 * Env: LIVE_DATA_URL (override default), MAX_AGE_HOURS (default 2)
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

// ─── Config ────────────────────────────────────────────────────────────────────

const ROOT = path.resolve(__dirname, '..');

const ENDPOINTS = {
  crossRepoDashboard: process.env.LIVE_DATA_URL || 'http://34.136.180.66:8080/data/cross-repo-dashboard.json',
  healthStatus:       'http://34.136.180.66:8080/data/health-status.json',
  rateLimits:         'http://34.136.180.66:8080/data/rate-limits-live.json',
};

const MAX_AGE_HOURS = parseInt(process.env.MAX_AGE_HOURS || '2', 10);
const FETCH_TIMEOUT_MS = 10000;

let passed = 0;
let failed = 0;
let skipped = 0;
const errors = [];
const healthReport = {};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function ok(name) {
  passed++;
  console.log(`  PASS  ${name}`);
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

function fetchJSON(url, timeoutMs = FETCH_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { timeout: timeoutMs }, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} from ${url}`));
        res.resume();
        return;
      }
      let body = '';
      res.setEncoding('utf-8');
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          reject(new Error(`Invalid JSON from ${url}: ${e.message}`));
        }
      });
    });

    req.on('error', (e) => reject(new Error(`Request failed for ${url}: ${e.message}`)));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Timeout (${timeoutMs}ms) fetching ${url}`));
    });
  });
}

function hoursAgo(isoString) {
  if (!isoString) return Infinity;
  const ms = Date.now() - new Date(isoString).getTime();
  return ms / (1000 * 60 * 60);
}

// ─── Suite: Cross-Repo Dashboard ───────────────────────────────────────────────

async function testCrossRepoDashboard() {
  console.log('\n--- Cross-Repo Dashboard (live fetch) ---');
  console.log(`  URL: ${ENDPOINTS.crossRepoDashboard}`);
  console.log(`  Max age: ${MAX_AGE_HOURS}h\n`);

  let data;
  try {
    data = await fetchJSON(ENDPOINTS.crossRepoDashboard);
    ok('cross-repo-fetch');
  } catch (e) {
    fail('cross-repo-fetch', e.message);
    console.log('  (Falling back to local docs/dashboard-data.json)');

    // Try local fallback
    const localPath = path.join(ROOT, 'docs', 'dashboard-data.json');
    if (fs.existsSync(localPath)) {
      try {
        data = JSON.parse(fs.readFileSync(localPath, 'utf-8'));
        ok('cross-repo-local-fallback');
      } catch (e2) {
        fail('cross-repo-local-fallback', e2.message);
        return;
      }
    } else {
      skip('cross-repo-local-fallback', 'file not found');
      return;
    }
  }

  // Schema validation
  if (data.timestamp || data.generated_at) {
    ok('cross-repo-has-timestamp');
  } else {
    fail('cross-repo-has-timestamp', 'no timestamp or generated_at field');
  }

  // Detect schema type: cross-repo-dashboard (repos/summary) vs dashboard-data (stats/spaces)
  const isCrossRepo = !!(data.repos || data.summary);
  const isDashboardData = !!(data.stats);

  if (isCrossRepo) {
    ok('cross-repo-schema-detected (repos/summary format)');

    // Validate repos array
    if (data.repos && Array.isArray(data.repos)) {
      ok(`cross-repo-repos-count: ${data.repos.length}`);
      for (const repo of data.repos) {
        if (repo.name) {
          healthReport[`repo_${repo.name}`] = repo.status || 'unknown';
          ok(`repo:${repo.name} = ${repo.status || 'no-status'}`);
        }
      }
    } else if (data.repos && typeof data.repos === 'object') {
      const repoNames = Object.keys(data.repos);
      ok(`cross-repo-repos-count: ${repoNames.length}`);
      for (const name of repoNames) {
        healthReport[`repo_${name}`] = data.repos[name].status || 'present';
        ok(`repo:${name}`);
      }
    } else {
      fail('cross-repo-repos', 'missing repos field');
    }

    // Validate summary
    if (data.summary && typeof data.summary === 'object') {
      ok('cross-repo-has-summary');
      for (const [key, val] of Object.entries(data.summary)) {
        healthReport[`summary_${key}`] = val;
      }
    } else {
      skip('cross-repo-summary', 'no summary field');
    }

  } else if (isDashboardData) {
    ok('cross-repo-schema-detected (stats/spaces format)');

    // Check required stats fields
    const requiredStatsFields = ['total_docs', 'total_questions'];
    for (const field of requiredStatsFields) {
      if (data.stats[field] !== undefined) {
        ok(`cross-repo-stats.${field} = ${data.stats[field]}`);
      } else {
        fail(`cross-repo-stats.${field}`, 'missing');
      }
    }

    // Docs by sector
    if (data.stats.docs_by_sector && typeof data.stats.docs_by_sector === 'object') {
      const sectors = Object.keys(data.stats.docs_by_sector);
      ok(`cross-repo-sectors (${sectors.join(', ')})`);

      const expectedSectors = ['finance', 'btp', 'juridique', 'industrie'];
      for (const s of expectedSectors) {
        if (data.stats.docs_by_sector[s] !== undefined) {
          healthReport[`sector_docs_${s}`] = data.stats.docs_by_sector[s];
          ok(`sector-docs:${s} = ${data.stats.docs_by_sector[s]}`);
        } else {
          fail(`sector-docs:${s}`, 'sector missing from docs_by_sector');
        }
      }
    } else {
      skip('cross-repo-docs-by-sector', 'not in this schema');
    }

    // Accuracy data
    if (data.stats.accuracy_24h && typeof data.stats.accuracy_24h === 'object') {
      ok('cross-repo-accuracy-24h');
      for (const [pipeline, acc] of Object.entries(data.stats.accuracy_24h)) {
        if (typeof acc.accuracy === 'number') {
          healthReport[`accuracy_${pipeline}`] = acc.accuracy;
          const status = acc.accuracy >= 70 ? 'HEALTHY' : acc.accuracy >= 50 ? 'WARNING' : 'CRITICAL';
          ok(`accuracy:${pipeline} = ${acc.accuracy}% [${status}]`);
        }
      }
    } else {
      skip('cross-repo-accuracy-24h', 'no accuracy_24h data');
    }

  } else {
    fail('cross-repo-schema', 'unrecognized schema: no repos, summary, or stats field');
  }

  // HF Spaces health (may be in either schema)
  if (data.spaces && typeof data.spaces === 'object') {
    ok('cross-repo-spaces');
    let spacesUp = 0;
    let spacesTotal = 0;
    for (const [name, info] of Object.entries(data.spaces)) {
      spacesTotal++;
      if (info.status === 'UP') spacesUp++;
      healthReport[`space_${name}`] = info.status;
    }
    if (spacesUp === spacesTotal) {
      ok(`spaces-health: ${spacesUp}/${spacesTotal} UP`);
    } else {
      fail(`spaces-health: ${spacesUp}/${spacesTotal} UP`, `${spacesTotal - spacesUp} space(s) down`);
    }
  } else {
    skip('cross-repo-spaces', 'no spaces data');
  }

  // Data freshness
  const ts = data.timestamp || data.generated_at;
  if (ts) {
    const age = hoursAgo(ts);
    healthReport.data_age_hours = Math.round(age * 100) / 100;
    if (age <= MAX_AGE_HOURS) {
      ok(`data-freshness: ${Math.round(age * 60)}min old (max ${MAX_AGE_HOURS}h)`);
    } else {
      fail(`data-freshness`, `data is ${Math.round(age * 10) / 10}h old (max ${MAX_AGE_HOURS}h)`);
    }
  }
}

// ─── Suite: Health Status ──────────────────────────────────────────────────────

async function testHealthStatus() {
  console.log('\n--- Health Status (live fetch) ---');
  console.log(`  URL: ${ENDPOINTS.healthStatus}\n`);

  let data;
  try {
    data = await fetchJSON(ENDPOINTS.healthStatus);
    ok('health-status-fetch');
  } catch (e) {
    fail('health-status-fetch', e.message);
    return;
  }

  // Check schema
  if (data.timestamp || data.generated_at || data.checked_at) {
    ok('health-status-has-timestamp');
  } else {
    skip('health-status-has-timestamp', 'no timestamp field found');
  }

  // Check for pipeline health
  if (data.pipelines && typeof data.pipelines === 'object') {
    ok('health-status-pipelines');
    for (const [name, info] of Object.entries(data.pipelines)) {
      const status = info.status || (info.healthy ? 'UP' : 'DOWN');
      healthReport[`pipeline_${name}`] = status;
      ok(`pipeline:${name} = ${status}`);
    }
  } else if (data.spaces || data.engines) {
    ok('health-status-has-infra-data');
  } else {
    skip('health-status-pipelines', 'no pipelines data in response');
  }
}

// ─── Suite: Rate Limits ────────────────────────────────────────────────────────

async function testRateLimits() {
  console.log('\n--- Rate Limits (live fetch) ---');
  console.log(`  URL: ${ENDPOINTS.rateLimits}\n`);

  let data;
  try {
    data = await fetchJSON(ENDPOINTS.rateLimits);
    ok('rate-limits-fetch');
  } catch (e) {
    skip('rate-limits-fetch', e.message);
    return;
  }

  if (typeof data === 'object' && data !== null) {
    ok('rate-limits-valid-object');
    healthReport.rate_limits = 'available';
  }
}

// ─── Run All ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== rag-dashboard: Live Data Tests ===');
  console.log(`Time: ${new Date().toISOString()}`);
  console.log(`Max age threshold: ${MAX_AGE_HOURS} hours`);

  await testCrossRepoDashboard();
  await testHealthStatus();
  await testRateLimits();

  // Health Report Summary
  console.log('\n=== Health Report ===');
  for (const [key, value] of Object.entries(healthReport)) {
    console.log(`  ${key}: ${value}`);
  }

  // Summary
  console.log('\n=== Summary ===');
  console.log(`  PASS: ${passed}`);
  console.log(`  FAIL: ${failed}`);
  console.log(`  SKIP: ${skipped}`);
  console.log(`  TOTAL: ${passed + failed + skipped}`);

  if (errors.length > 0) {
    console.log('\n=== Failures ===');
    for (const e of errors) {
      console.log(`  ${e.test}: ${e.reason}`);
    }
  }

  console.log(`\nResult: ${failed === 0 ? 'ALL PASSED' : `${failed} FAILURE(S)`}`);

  // Write results
  const results = {
    timestamp: new Date().toISOString(),
    suite: 'test-live-data',
    passed,
    failed,
    skipped,
    total: passed + failed + skipped,
    errors,
    healthReport,
    status: failed === 0 ? 'PASS' : 'FAIL'
  };

  const outDir = path.join(ROOT, 'data');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'test-live-data-results.json'), JSON.stringify(results, null, 2));

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => {
  console.error(`Fatal: ${e.message}`);
  process.exit(2);
});
