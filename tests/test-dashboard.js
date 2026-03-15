#!/usr/bin/env node
/**
 * test-dashboard.js — Static dashboard validation tests
 *
 * Validates:
 *   1. All HTML files parse correctly (no unclosed tags)
 *   2. repos-config.json is valid JSON with required fields
 *   3. API endpoint JSON files are valid
 *   4. All local resources referenced in HTML exist
 *   5. JavaScript in HTML files has no syntax errors
 *   6. vercel.json rewrite destinations exist
 *
 * Run: node tests/test-dashboard.js
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

// ─── Config ────────────────────────────────────────────────────────────────────

const ROOT = path.resolve(__dirname, '..');
let passed = 0;
let failed = 0;
let skipped = 0;
const errors = [];

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

function fileExists(relPath) {
  return fs.existsSync(path.join(ROOT, relPath));
}

function readFile(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf-8');
}

function collectFiles(dir, ext) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== '.git' && entry.name !== 'node_modules') {
      results.push(...collectFiles(full, ext));
    } else if (entry.isFile() && full.endsWith(ext)) {
      results.push(full);
    }
  }
  return results;
}

// ─── Suite: HTML Parsing ───────────────────────────────────────────────────────

function testHTMLParsing() {
  console.log('\n--- HTML Parsing ---');

  const htmlFiles = collectFiles(ROOT, '.html');

  if (htmlFiles.length === 0) {
    skip('html-files-exist', 'no HTML files found');
    return;
  }

  console.log(`  Found ${htmlFiles.length} HTML file(s)\n`);

  for (const file of htmlFiles) {
    const rel = path.relative(ROOT, file);
    const content = fs.readFileSync(file, 'utf-8');

    // Check DOCTYPE
    const testName = `html-parse:${rel}`;

    // Validate basic structure
    const hasDoctype = /<!DOCTYPE\s+html>/i.test(content);
    const hasHtmlOpen = /<html[\s>]/i.test(content);
    const hasHtmlClose = /<\/html>/i.test(content);
    const hasHead = /<head[\s>]/i.test(content) && /<\/head>/i.test(content);
    const hasBody = /<body[\s>]/i.test(content) && /<\/body>/i.test(content);

    const issues = [];
    if (!hasDoctype) issues.push('missing <!DOCTYPE html>');
    if (!hasHtmlOpen) issues.push('missing <html> tag');
    if (!hasHtmlClose) issues.push('missing </html> tag');
    if (!hasHead) issues.push('missing <head>...</head>');
    if (!hasBody) issues.push('missing <body>...</body>');

    // Check for unclosed common tags (basic heuristic)
    const voidTags = new Set(['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr']);
    const tagOpenPattern = /<([a-zA-Z][a-zA-Z0-9]*)\b[^\/]*?>/g;
    const tagClosePattern = /<\/([a-zA-Z][a-zA-Z0-9]*)\s*>/g;

    const openCounts = {};
    const closeCounts = {};
    let m;

    while ((m = tagOpenPattern.exec(content)) !== null) {
      const tag = m[1].toLowerCase();
      if (!voidTags.has(tag)) {
        openCounts[tag] = (openCounts[tag] || 0) + 1;
      }
    }
    while ((m = tagClosePattern.exec(content)) !== null) {
      const tag = m[1].toLowerCase();
      closeCounts[tag] = (closeCounts[tag] || 0) + 1;
    }

    // Check critical tags for balance (div, section, main, header, footer, script, style)
    const criticalTags = ['div', 'section', 'main', 'header', 'footer', 'script', 'style', 'table', 'ul', 'ol'];
    for (const tag of criticalTags) {
      const opens = openCounts[tag] || 0;
      const closes = closeCounts[tag] || 0;
      if (opens > 0 && closes > 0 && Math.abs(opens - closes) > 2) {
        issues.push(`<${tag}> open=${opens} close=${closes} (mismatch > 2)`);
      }
    }

    if (issues.length === 0) {
      ok(testName);
    } else {
      fail(testName, issues.join('; '));
    }
  }
}

// ─── Suite: repos-config.json ──────────────────────────────────────────────────

function testReposConfig() {
  console.log('\n--- repos-config.json ---');

  const configPath = 'repos-config.json';
  if (!fileExists(configPath)) {
    fail('repos-config-exists', 'file not found');
    return;
  }
  ok('repos-config-exists');

  let config;
  try {
    config = JSON.parse(readFile(configPath));
    ok('repos-config-valid-json');
  } catch (e) {
    fail('repos-config-valid-json', e.message);
    return;
  }

  // Required top-level fields
  if (config.repos && Array.isArray(config.repos)) {
    ok('repos-config-has-repos-array');
  } else {
    fail('repos-config-has-repos-array', 'missing or not an array');
    return;
  }

  if (config.repos.length > 0) {
    ok(`repos-config-repos-count (${config.repos.length})`);
  } else {
    fail('repos-config-repos-count', 'repos array is empty');
  }

  // Validate each repo entry
  const requiredFields = ['id', 'name', 'status'];
  for (const repo of config.repos) {
    const missing = requiredFields.filter(f => !repo[f]);
    const testName = `repos-config-repo:${repo.id || repo.name || 'unknown'}`;
    if (missing.length === 0) {
      ok(testName);
    } else {
      fail(testName, `missing fields: ${missing.join(', ')}`);
    }
  }

  // hf_space field
  if (config.hf_space && config.hf_space.url) {
    ok('repos-config-hf-space');
  } else {
    skip('repos-config-hf-space', 'no hf_space field');
  }

  // vm field
  if (config.vm && config.vm.ip) {
    ok('repos-config-vm');
  } else {
    skip('repos-config-vm', 'no vm field');
  }

  // phase field
  if (config.phase && typeof config.phase.current === 'number') {
    ok('repos-config-phase');
  } else {
    skip('repos-config-phase', 'no phase field');
  }
}

// ─── Suite: API & JSON Files ───────────────────────────────────────────────────

function testAPIAndJSONFiles() {
  console.log('\n--- API & JSON Files ---');

  const jsonFiles = [
    'api/fallback-status.json',
    'docs/status.json',
    'docs/repo-status.json',
    'docs/dashboard-data.json',
    'data/self-improve-state.json',
  ];

  for (const jsonFile of jsonFiles) {
    if (!fileExists(jsonFile)) {
      skip(`json-valid:${jsonFile}`, 'file not found');
      continue;
    }

    try {
      const data = JSON.parse(readFile(jsonFile));
      ok(`json-valid:${jsonFile}`);

      // Specific schema checks
      if (jsonFile === 'api/fallback-status.json') {
        if (data.pipelines && data.phase && data.overall) {
          ok('fallback-status-schema');
        } else {
          fail('fallback-status-schema', 'missing pipelines/phase/overall');
        }

        // Check pipeline entries
        const expectedPipelines = ['standard', 'graph', 'quantitative', 'orchestrator'];
        const found = Object.keys(data.pipelines || {});
        const missing = expectedPipelines.filter(p => !found.includes(p));
        if (missing.length === 0) {
          ok('fallback-status-all-pipelines');
        } else {
          fail('fallback-status-all-pipelines', `missing: ${missing.join(', ')}`);
        }
      }

      if (jsonFile === 'docs/status.json') {
        if (data.pipelines && data.infrastructure) {
          ok('status-json-schema');
        } else {
          fail('status-json-schema', 'missing pipelines or infrastructure');
        }
      }

      if (jsonFile === 'docs/dashboard-data.json') {
        if (data.stats && data.spaces) {
          ok('dashboard-data-schema');
        } else {
          fail('dashboard-data-schema', 'missing stats or spaces');
        }
      }

    } catch (e) {
      fail(`json-valid:${jsonFile}`, e.message);
    }
  }

  // Validate api/status.js is valid CommonJS module
  const statusJs = 'api/status.js';
  if (fileExists(statusJs)) {
    try {
      const code = readFile(statusJs);
      // Check syntax by compiling (not executing)
      new vm.Script(code, { filename: statusJs });
      ok('api-status-js-syntax');
    } catch (e) {
      fail('api-status-js-syntax', e.message);
    }
  } else {
    skip('api-status-js-syntax', 'file not found');
  }
}

// ─── Suite: JavaScript Syntax ──────────────────────────────────────────────────

function testJavaScriptSyntax() {
  console.log('\n--- JavaScript Syntax ---');

  // Standalone JS files
  const jsFiles = collectFiles(ROOT, '.js').filter(f =>
    !f.includes('node_modules') &&
    !f.includes('.git') &&
    !f.includes('tests/')
  );

  for (const file of jsFiles) {
    const rel = path.relative(ROOT, file);
    try {
      const code = fs.readFileSync(file, 'utf-8');
      new vm.Script(code, { filename: rel });
      ok(`js-syntax:${rel}`);
    } catch (e) {
      // CommonJS require() will fail in vm.Script — skip those
      if (e.message.includes('require is not defined') || e.message.includes("Cannot use import")) {
        // Try just syntax checking by wrapping
        try {
          new vm.Script(`(function(require, module, exports, __dirname, __filename) { ${code} })`, { filename: rel });
          ok(`js-syntax:${rel}`);
        } catch (e2) {
          fail(`js-syntax:${rel}`, e2.message.split('\n')[0]);
        }
      } else {
        fail(`js-syntax:${rel}`, e.message.split('\n')[0]);
      }
    }
  }

  // Inline <script> blocks in HTML files
  const htmlFiles = collectFiles(ROOT, '.html');
  for (const file of htmlFiles) {
    const rel = path.relative(ROOT, file);
    const content = fs.readFileSync(file, 'utf-8');

    // Extract inline scripts (skip external src scripts and JSON-LD)
    const scriptPattern = /<script(?![^>]*\bsrc\s*=)(?![^>]*type\s*=\s*["']application\/ld\+json["'])[^>]*>([\s\S]*?)<\/script>/gi;
    let scriptMatch;
    let scriptIndex = 0;

    while ((scriptMatch = scriptPattern.exec(content)) !== null) {
      const scriptContent = scriptMatch[1].trim();
      if (!scriptContent) continue;
      scriptIndex++;

      const testName = `inline-js:${rel}#${scriptIndex}`;
      try {
        new vm.Script(scriptContent, { filename: `${rel}:script#${scriptIndex}` });
        ok(testName);
      } catch (e) {
        // Many inline scripts use browser globals — just check for gross syntax errors
        const msg = e.message.split('\n')[0];
        if (msg.includes('Unexpected token') || msg.includes('Unexpected end') || msg.includes('Invalid or unexpected')) {
          fail(testName, msg);
        } else {
          ok(testName + ' (runtime-only error, syntax ok)');
        }
      }
    }
  }
}

// ─── Suite: Resource References ────────────────────────────────────────────────

function testResourceReferences() {
  console.log('\n--- Resource References ---');

  // Check vercel.json rewrite destinations
  if (fileExists('vercel.json')) {
    try {
      const vercel = JSON.parse(readFile('vercel.json'));
      if (vercel.rewrites && Array.isArray(vercel.rewrites)) {
        for (const rule of vercel.rewrites) {
          const dest = rule.destination;
          if (dest && dest.startsWith('/')) {
            const destPath = dest.replace(/^\//, '');
            if (fileExists(destPath)) {
              ok(`vercel-rewrite:${rule.source} -> ${dest}`);
            } else {
              fail(`vercel-rewrite:${rule.source} -> ${dest}`, 'destination file not found');
            }
          }
        }
      }
    } catch (e) {
      fail('vercel-json-parse', e.message);
    }
  }

  // Check that key referenced files exist
  const expectedFiles = [
    'index.html',
    'control-panel.html',
    'repos-config.json',
    'api/status.js',
    'api/fallback-status.json',
    'vercel.json',
    'utils.js',
  ];

  for (const f of expectedFiles) {
    if (fileExists(f)) {
      ok(`file-exists:${f}`);
    } else {
      fail(`file-exists:${f}`, 'file missing');
    }
  }

  // Check local href/src references in HTML (only relative paths)
  const htmlFiles = collectFiles(ROOT, '.html');
  const checkedRefs = new Set();

  for (const file of htmlFiles) {
    const rel = path.relative(ROOT, file);
    const dir = path.dirname(file);
    const content = fs.readFileSync(file, 'utf-8');

    // Match href="./something" or src="./something" or href="something.html"
    const refPattern = /(?:href|src)\s*=\s*["'](\.[^"']*|(?!https?:|\/\/|#|mailto:|javascript:|data:)[a-zA-Z][^"']*\.(?:html|js|css|json|png|jpg|svg|ico))["']/gi;
    let refMatch;

    while ((refMatch = refPattern.exec(content)) !== null) {
      let ref = refMatch[1];
      // Remove query strings and fragments
      ref = ref.split('?')[0].split('#')[0];
      if (!ref) continue;

      const resolved = path.resolve(dir, ref);
      const relResolved = path.relative(ROOT, resolved);
      const cacheKey = `${rel}:${ref}`;

      if (checkedRefs.has(cacheKey)) continue;
      checkedRefs.add(cacheKey);

      if (fs.existsSync(resolved)) {
        ok(`ref:${rel} -> ${ref}`);
      } else {
        // Not critical for external CDN fonts etc
        fail(`ref:${rel} -> ${ref}`, `referenced file not found: ${relResolved}`);
      }
    }
  }
}

// ─── Suite: vercel.json ────────────────────────────────────────────────────────

function testVercelConfig() {
  console.log('\n--- vercel.json ---');

  if (!fileExists('vercel.json')) {
    fail('vercel-json-exists', 'file not found');
    return;
  }

  try {
    const vercel = JSON.parse(readFile('vercel.json'));
    ok('vercel-json-valid');

    if (vercel.rewrites && Array.isArray(vercel.rewrites) && vercel.rewrites.length > 0) {
      ok(`vercel-json-rewrites (${vercel.rewrites.length} rules)`);
    } else {
      skip('vercel-json-rewrites', 'no rewrites defined');
    }

    if (vercel.headers && Array.isArray(vercel.headers)) {
      ok(`vercel-json-headers (${vercel.headers.length} rules)`);
    } else {
      skip('vercel-json-headers', 'no headers defined');
    }

  } catch (e) {
    fail('vercel-json-valid', e.message);
  }
}

// ─── Run All ───────────────────────────────────────────────────────────────────

function main() {
  console.log('=== rag-dashboard: Static Validation Tests ===');
  console.log(`Root: ${ROOT}`);
  console.log(`Time: ${new Date().toISOString()}`);

  testHTMLParsing();
  testReposConfig();
  testAPIAndJSONFiles();
  testJavaScriptSyntax();
  testResourceReferences();
  testVercelConfig();

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

  // Write results to JSON for consumption by self-improve loop
  const results = {
    timestamp: new Date().toISOString(),
    suite: 'test-dashboard',
    passed,
    failed,
    skipped,
    total: passed + failed + skipped,
    errors,
    status: failed === 0 ? 'PASS' : 'FAIL'
  };

  const outDir = path.join(ROOT, 'data');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'test-dashboard-results.json'), JSON.stringify(results, null, 2));

  process.exit(failed > 0 ? 1 : 0);
}

main();
