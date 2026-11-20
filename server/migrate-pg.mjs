#!/usr/bin/env node
// Async migration runner for PostgreSQL
// Usage: node server/migrate-pg.mjs

import path from 'node:path';
import { migratePg } from './src/db/migrate.js';

async function main() {
  try {
    await migratePg();
    process.exit(0);
  } catch (err) {
    console.error('[MIGR-PG] Failed:', err.message);
    process.exit(1);
  }
}

main();
