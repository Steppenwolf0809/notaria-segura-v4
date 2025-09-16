#!/usr/bin/env node

import { execSync } from 'child_process';
import { config } from 'dotenv';

config();

const runMigrations = process.env.RUN_MIGRATIONS_ON_START === 'true';
const hasDatabaseUrl = !!process.env.DATABASE_URL;
const isProduction = process.env.NODE_ENV === 'production';

if (!runMigrations || !hasDatabaseUrl || !isProduction) {
  console.log('migrate deploy: skipped (conditions not met)');
  process.exit(0);
}

try {
  console.log('migrate deploy: start');
  execSync('npx prisma migrate deploy', {
    stdio: 'pipe', // Suppress output to avoid logging sensitive info
    encoding: 'utf8'
  });
  console.log('migrate deploy: success');
} catch (error) {
  console.error('migrate deploy: fail');
  process.exit(1);
}