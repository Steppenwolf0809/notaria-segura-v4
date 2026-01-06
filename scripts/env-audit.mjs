#!/usr/bin/env node
/**
 * Env audit script
 * - Scans repo for environment variable usages
 * - Writes qa/reports/env-audit.json, env-audit.md, env-cleanup-plan.md
 */

import fs from 'fs';
import path from 'path';

const repoRoot = process.cwd();
const reportsDir = path.join(repoRoot, 'qa', 'reports');

// Declared set from task (paste exactly)
const DECLARED = [
  "DATABASE_PUBLIC_URL", "DATABASE_URL", "DEBUG_EXTRACTION_METHOD", "EXTRACT_HYBRID", "FORCE_PYTHON_EXTRACTOR", "FRONTEND_URL", "GEMINI_ENABLED", "GEMINI_JSON_MODE", "GEMINI_MODEL", "GEMINI_PRIORITY", "GEMINI_TIMEOUT", "GOOGLE_API_KEY", "JWT_SECRET", "LLM_STRATEGY", "NEXT_PUBLIC_DOCS_ARCHIVO_TABS", "NEXT_PUBLIC_DOCS_LAZY_DELIVERED", "NEXT_PUBLIC_DOCS_MATRIZADOR_TABS", "NEXT_PUBLIC_DOCS_RECEPCION_GROUPED", "NEXT_PUBLIC_DOCS_SEARCH_SMART_SCOPE", "NEXT_PUBLIC_DOCS_SEARCH_TOGGLE_RECEPCION", "NEXT_PUBLIC_DOCS_WINDOWING", "NODE_ENV", "RAILWAY_START_COMMAND", "REDIS_URL", "STRUCTURE_ROUTER_ENABLED", "TEMPLATE_MODE", "TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_PHONE_NUMBER", "TWILIO_WHATSAPP_FROM", "VITE_API_URL", "VITE_DOCS_ARCHIVO_TABS", "VITE_DOCS_LAZY_DELIVERED", "VITE_DOCS_MATRIZADOR_TABS", "VITE_DOCS_RECEPCION_GROUPED", "VITE_DOCS_SEARCH_SMART_SCOPE", "VITE_DOCS_SEARCH_TOGGLE_RECEPCION", "VITE_DOCS_WINDOWING", "WHATSAPP_ENABLED", "RUN_MIGRATIONS_ON_START", "TEMPLATE_CACHE_TTL_MS", "RATE_LIMIT_MAX", "RATE_LIMIT_WINDOW_MS", "CIRCUIT_BREAKER_THRESHOLD", "RETRY_MAX_ATTEMPTS"
];

const DEPRECATE_CANDIDATES = new Set([
  'EXTRACT_HYBRID',
  'FORCE_PYTHON_EXTRACTOR',
  'GEMINI_PRIORITY',
]);

// Heuristic: files/dirs to ignore
const IGNORE_DIRS = new Set([
  'node_modules', 'dist', 'build', '.git', '.next', '.turbo', '.cache', '.vercel', '.expo', 'android', 'ios', '.vscode', 'coverage', 'out', '.idea', 'qa/reports'
]);

const TEXT_EXTS = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.json', '.yml', '.yaml', '.md', '.sh', '.bash', '.env', '.txt', '.sql']);

function isBinaryContent(buf) {
  // simple binary check: presence of null byte
  for (let i = 0; i < buf.length; i++) {
    if (buf[i] === 0) return true;
  }
  return false;
}

function shouldScanFile(filePath) {
  const bn = path.basename(filePath);
  if (bn.startsWith('.git')) return false;
  const ext = path.extname(bn);
  if (TEXT_EXTS.has(ext)) return true;
  // also allow files without extension but small
  return ext === '';
}

function walk(dir, out = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const ent of entries) {
    const name = ent.name;
    if (IGNORE_DIRS.has(name)) continue;
    const full = path.join(dir, name);
    try {
      if (ent.isDirectory()) {
        walk(full, out);
      } else if (ent.isFile()) {
        if (shouldScanFile(full)) out.push(full);
      }
    } catch { }
  }
  return out;
}

// Regexes
const reProcessDot = /process\.env\.([A-Z0-9_]+)/g;
const reProcessIndex = /process\.env\[["']([A-Z0-9_]+)["']\]/g;
const reImportMetaDot = /import\.meta\.env\.([A-Z0-9_]+)/g;
const reImportMetaIndex = /import\.meta\.env\[["']([A-Z0-9_]+)["']\]/g;
const rePublicKey = /["'`](NEXT_PUBLIC_[A-Z0-9_]+)["'`]/g;
const reViteKey = /["'`](VITE_[A-Z0-9_]+)["'`]/g;

function inferUsageKind(line) {
  // log > default > branch > read
  const l = line;
  if (/(console\.(log|info|warn|error)|logger\.|log\s*\()/.test(l)) return 'log';
  if (/(\|\||\?\?|\|\|=|\?\?=)/.test(l)) return 'default';
  if (/(if\s*\(|\?|&&|\bcase\b|switch\s*\()/.test(l)) return 'branch';
  return 'read';
}

function inferLayer(file, matchKind) {
  const p = file.replace(/\\/g, '/');
  if (/^(frontend|apps\/frontend|packages\/frontend)\//.test(p)) return 'frontend-build';
  if (/^(backend|server|api)\//.test(p)) return 'backend';
  if (matchKind === 'importmeta' || /import\.meta\.env/.test(matchKind)) return 'frontend-build';
  if (matchKind === 'processenv') return 'backend';
  return 'shared';
}

function isSensitive(name) {
  return /(SECRET|TOKEN|PASSWORD|API|ACCOUNT|AUTH|KEY|DATABASE_URL|DATABASE_PUBLIC_URL|REDIS_URL|PHONE|WHATSAPP|RAILWAY|JWT)/.test(name);
}

function safeSnippet(line) {
  let s = line.replace(/\s+/g, ' ').trim();
  if (s.length > 240) s = s.slice(0, 240) + '…';
  return s;
}

const files = walk(repoRoot);

const varMap = new Map(); // name -> { name, occurrences:[], usage_kind: best?, layer: best, sensitive }

function addOcc(name, file, lineNo, line, matchKind) {
  const usage_kind = inferUsageKind(line);
  const layer = inferLayer(file, matchKind);
  const occ = { file: path.relative(repoRoot, file).replace(/\\/g, '/'), line: lineNo, snippet: safeSnippet(line) };
  if (!varMap.has(name)) {
    varMap.set(name, {
      name,
      occurrences: [occ],
      usage_kind, // initial, but we will keep as the most "important" seen
      layer,
      sensitive: isSensitive(name),
    });
  } else {
    const v = varMap.get(name);
    v.occurrences.push(occ);
    // Upgrade usage_kind priority: log > default > branch > read
    const order = { log: 3, default: 2, branch: 1, read: 0 };
    if (order[usage_kind] > order[v.usage_kind]) v.usage_kind = usage_kind;
    // Upgrade layer: backend/frontend-build over shared; if mixed, keep shared? We'll prefer backend/frontend-build if consistent.
    if (v.layer === 'shared' && layer !== 'shared') v.layer = layer;
    if (v.layer !== layer && (v.layer === 'backend' && layer === 'frontend-build' || v.layer === 'frontend-build' && layer === 'backend')) {
      v.layer = 'shared';
    }
  }
}

for (const file of files) {
  let buf;
  try { buf = fs.readFileSync(file); } catch { continue; }
  if (buf.length > 2_000_000) continue; // skip very large files
  if (isBinaryContent(buf)) continue;
  let text;
  try { text = buf.toString('utf8'); } catch { continue; }
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let m;
    reProcessDot.lastIndex = 0;
    while ((m = reProcessDot.exec(line)) !== null) {
      addOcc(m[1], file, i + 1, line, 'processenv');
    }
    reProcessIndex.lastIndex = 0;
    while ((m = reProcessIndex.exec(line)) !== null) {
      addOcc(m[1], file, i + 1, line, 'processenv');
    }
    reImportMetaDot.lastIndex = 0;
    while ((m = reImportMetaDot.exec(line)) !== null) {
      addOcc(m[1], file, i + 1, line, 'importmeta');
    }
    reImportMetaIndex.lastIndex = 0;
    while ((m = reImportMetaIndex.exec(line)) !== null) {
      addOcc(m[1], file, i + 1, line, 'importmeta');
    }
    rePublicKey.lastIndex = 0;
    while ((m = rePublicKey.exec(line)) !== null) {
      // treat as frontend-build var usage
      addOcc(m[1], file, i + 1, line, 'string-next');
    }
    reViteKey.lastIndex = 0;
    while ((m = reViteKey.exec(line)) !== null) {
      addOcc(m[1], file, i + 1, line, 'string-vite');
    }
  }
}

// Build arrays
const foundVars = Array.from(varMap.values()).sort((a, b) => a.name.localeCompare(b.name));

const foundNames = new Set(foundVars.map(v => v.name));
const declaredSet = new Set(DECLARED);
const unused_declared = DECLARED.filter(n => !foundNames.has(n));
const missing_declared = foundVars.map(v => v.name).filter(n => !declaredSet.has(n));

// Count references for candidates
const candidateCounts = {};
for (const c of DEPRECATE_CANDIDATES) {
  candidateCounts[c] = varMap.has(c) ? varMap.get(c).occurrences.length : 0;
}
const hasLLMStrategy = foundNames.has('LLM_STRATEGY');

// PORT binding check
const hasPort = foundNames.has('PORT');
const warnings = [];
if (!hasPort) {
  warnings.push({ missing: 'PORT', severity: 'high', message: 'Server should bind process.env.PORT; not found in codebase.' });
}

// .env example existence and missing keys proposal
function readEnvExample(p) {
  try { return fs.readFileSync(p, 'utf8'); } catch { return null; }
}
const envExamplePath = path.join(repoRoot, '.env.example');
const envStagingPath = path.join(repoRoot, '.env.staging.example');
const envExample = readEnvExample(envExamplePath);
const envStaging = readEnvExample(envStagingPath);

function extractKeysFromEnv(content) {
  if (!content) return new Set();
  const out = new Set();
  const lines = content.split(/\r?\n/);
  for (const l of lines) {
    const m = l.match(/^\s*([A-Z0-9_]+)\s*=/);
    if (m) out.add(m[1]);
  }
  return out;
}

const exampleKeys = extractKeysFromEnv(envExample);
const stagingKeys = extractKeysFromEnv(envStaging);

// Keys we recommend adding to examples
const operationalNew = [
  'RUN_MIGRATIONS_ON_START', 'TEMPLATE_CACHE_TTL_MS', 'RATE_LIMIT_MAX', 'RATE_LIMIT_WINDOW_MS', 'CIRCUIT_BREAKER_THRESHOLD', 'RETRY_MAX_ATTEMPTS'
];

const usedBackendLike = foundVars.filter(v => v.layer !== 'frontend-build').map(v => v.name);
const backendDesired = Array.from(new Set([...usedBackendLike, ...DECLARED]));

const toAddExample = backendDesired.filter(k => !exampleKeys.has(k));
const toAddStaging = backendDesired.filter(k => !stagingKeys.has(k));
for (const k of operationalNew) {
  if (!toAddExample.includes(k)) toAddExample.push(k);
  if (!toAddStaging.includes(k)) toAddStaging.push(k);
}
if (!toAddExample.includes('PORT')) toAddExample.push('PORT');
if (!toAddStaging.includes('PORT')) toAddStaging.push('PORT');

// Frontend-only vars
const frontendOnly = foundVars
  .filter(v => v.layer === 'frontend-build' || v.name.startsWith('NEXT_PUBLIC_') || v.name.startsWith('VITE_'))
  .map(v => v.name)
  .sort();

// Build JSON report
const jsonReport = {
  generated_at: new Date().toISOString(),
  repo_root: repoRoot,
  totals: {
    vars: foundVars.length,
    occurrences: foundVars.reduce((acc, v) => acc + v.occurrences.length, 0),
  },
  warnings,
  declared_set: DECLARED,
  unused_declared,
  missing_declared,
  deprecated_candidates: Object.keys(candidateCounts).map(name => ({ name, references: candidateCounts[name], superseded_by: 'LLM_STRATEGY', deprecate: candidateCounts[name] <= 1 || hasLLMStrategy })),
  vars: foundVars,
};

// Build Markdown summary
function mdTable(rows) {
  const header = '| Var | Count | Layer | Sensitive |\n|---|---:|---|---|';
  const body = rows.map(r => `| ${r.name} | ${r.occurrences} | ${r.layer} | ${r.sensitive ? 'yes' : 'no'} |`).join('\n');
  return header + '\n' + body;
}

const rows = foundVars.map(v => ({
  name: v.name,
  occurrences: v.occurrences.length,
  layer: v.layer,
  sensitive: v.sensitive,
}));

const mdSummary = [
  '# Environment Variables Audit',
  '',
  `Generated: ${new Date().toISOString()}`,
  '',
  `Total variables: ${foundVars.length}`,
  `Total occurrences: ${rows.reduce((a, b) => a + b.occurrences, 0)}`,
  warnings.length ? `Warnings: ${warnings.map(w => `${w.missing} (${w.severity})`).join(', ')}` : 'Warnings: none',
  '',
  '## Declared vs Used',
  '',
  `Unused declared (${unused_declared.length}): ${unused_declared.join(', ') || '—'}`,
  `Missing declared (${missing_declared.length}): ${missing_declared.join(', ') || '—'}`,
  '',
  '## Variables',
  '',
  mdTable(rows),
  '',
  '## Deprecated Candidates',
  '',
  Object.keys(candidateCounts).map(name => `- ${name}: ${candidateCounts[name]} refs; superseded by LLM_STRATEGY; ${candidateCounts[name] <= 1 || hasLLMStrategy ? 'DEPRECATE' : 'keep for now'}`).join('\n'),
].join('\n');

// Cleanup plan
const varsToKeep = foundVars.map(v => v.name).filter(n => !DEPRECATE_CANDIDATES.has(n));
const varsToDeprecate = Object.keys(candidateCounts).filter(name => candidateCounts[name] <= 1 || hasLLMStrategy);
const planMd = [
  '# Env Cleanup Plan (Safe)',
  '',
  'This plan proposes non-breaking steps. No code changes applied.',
  '',
  '## Keep',
  '',
  varsToKeep.length ? varsToKeep.sort().map(v => `- ${v}`).join('\n') : '- (none detected)',
  '',
  '## Deprecate + Migration',
  '',
  varsToDeprecate.length ? varsToDeprecate.map(v => `- ${v}: Replace with LLM_STRATEGY presets. Suggested mapping: \n  - ${v}=true -> LLM_STRATEGY=gemini \n  - ${v}=false -> LLM_STRATEGY=default`).join('\n') : '- (none)',
  '',
  'Also ensure documentation states these are superseded by `LLM_STRATEGY`.',
  '',
  '## Add to .env examples',
  '',
  `- .env.example: ${toAddExample.sort().join(', ')}`,
  `- .env.staging.example: ${toAddStaging.sort().join(', ')}`,
  '',
  '## Frontend-only vars',
  '',
  frontendOnly.length ? frontendOnly.map(v => `- ${v} (frontend service .env, exposed at build)`).join('\n') : '- (none)',
  '',
  '## Additional Notes',
  '',
  warnings.length ? warnings.map(w => `- Missing ${w.missing} (${w.severity}): ${w.message}`).join('\n') : '- No high-severity findings',
].join('\n');

// Ensure report dir
fs.mkdirSync(reportsDir, { recursive: true });
fs.writeFileSync(path.join(reportsDir, 'env-audit.json'), JSON.stringify(jsonReport, null, 2));
fs.writeFileSync(path.join(reportsDir, 'env-audit.md'), mdSummary);
fs.writeFileSync(path.join(reportsDir, 'env-cleanup-plan.md'), planMd);

// Final console checklist
const checklist = [
  'Env audit complete:',
  `- Vars found: ${foundVars.length}`,
  `- Total occurrences: ${rows.reduce((a, b) => a + b.occurrences, 0)}`,
  `- Unused declared: ${unused_declared.length}`,
  `- Missing declared: ${missing_declared.length}`,
  warnings.length ? `- Warnings: ${warnings.map(w => w.missing).join(', ')}` : '- Warnings: none',
  `- JSON: qa/reports/env-audit.json`,
  `- Summary: qa/reports/env-audit.md`,
  `- Plan: qa/reports/env-cleanup-plan.md`,
].join('\n');

console.log(checklist);

