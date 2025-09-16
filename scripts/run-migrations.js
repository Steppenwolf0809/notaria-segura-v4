#!/usr/bin/env node
/*
 * Safe prestart migration runner
 * - Runs Prisma migrations only when ALL are true:
 *   RUN_MIGRATIONS_ON_START === 'true'
 *   NODE_ENV === 'production'
 *   DATABASE_URL is set (non-empty)
 * - Executes: npx prisma migrate deploy (in backend/ if present)
 * - Minimal logs; avoids printing secrets.
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function log(msg) {
  console.log(`[migrate] ${msg}`);
}

const { RUN_MIGRATIONS_ON_START, NODE_ENV, DATABASE_URL } = process.env;

if (RUN_MIGRATIONS_ON_START !== 'true') {
  log('Skipped: RUN_MIGRATIONS_ON_START is not "true".');
  process.exit(0);
}
if (NODE_ENV !== 'production') {
  log('Skipped: NODE_ENV is not "production".');
  process.exit(0);
}
if (!DATABASE_URL) {
  log('Skipped: DATABASE_URL is not set.');
  process.exit(0);
}

// Choose working directory for prisma (prefer backend/)
const repoRoot = process.cwd();
const backendDir = path.join(repoRoot, 'backend');
const targetDir = fs.existsSync(path.join(backendDir, 'prisma')) ? backendDir : repoRoot;

log(`Running migrations in: ${path.relative(repoRoot, targetDir) || '.'}`);

// Execute migrate deploy with minimal logs captured
const result = spawnSync('npx', ['prisma', 'migrate', 'deploy'], {
  cwd: targetDir,
  env: {
    ...process.env,
    PRISMA_HIDE_UPDATE_MESSAGE: '1',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
  encoding: 'utf8',
});

function mask(str) {
  if (!str) return '';
  // Mask potential connection strings and tokens just in case
  let s = str;
  s = s.replace(/(postgres(?:ql)?:\/\/)([^:@\s\/]+)(:([^@\s\/]*))?@/gi, '$1***:***@');
  s = s.replace(/(password\s*=)\S+/gi, '$1***');
  s = s.replace(/(token\s*=)\S+/gi, '$1***');
  return s;
}

if (result.status === 0) {
  log('Migrations applied (deploy) successfully.');
  process.exit(0);
}

// On failure, print a short masked tail for diagnostics
const stderrLines = mask(result.stderr).trim().split(/\r?\n/).slice(-20);
const stdoutLines = mask(result.stdout).trim().split(/\r?\n/).slice(-5);
log('Migration failed. Exit code: ' + result.status);
if (stdoutLines.length) log('stdout (tail):\n' + stdoutLines.join('\n'));
if (stderrLines.length) log('stderr (tail):\n' + stderrLines.join('\n'));
process.exit(result.status || 1);

