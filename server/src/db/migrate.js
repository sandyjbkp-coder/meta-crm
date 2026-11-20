import path from 'node:path';
import fs from 'node:fs';
import { getDb, getDialect, isPostgres, isSqlite } from './connection.js';

const migrationsDir = path.join(process.cwd(), 'migrations');
const pgMigrationsDir = path.join(process.cwd(), 'migrations-postgres');

function stripSqlitePragmas(sql) {
  return sql.replace(/^\s*PRAGMA\s+[^;]+;/gm, '').trim();
}

function sqliteAutoincrementToPostgres(sql) {
  return sql.replace(/INTEGER PRIMARY KEY AUTOINCREMENT/g, 'SERIAL PRIMARY KEY');
}

function sqliteDatetimeNowToPostgres(sql) {
  return sql
    .replace(/datetime\('now'\)/g, 'now()')
    .replace(/date\('now'\)/g, 'CURRENT_DATE')
    .replace(/date\('now', '-(\d+) days'\)/g, "(CURRENT_DATE - interval '$1 days')");
}

function convertSqliteToPostgres(sql) {
  let converted = stripSqlitePragmas(sql);
  converted = sqliteAutoincrementToPostgres(converted);
  converted = sqliteDatetimeNowToPostgres(converted);
  converted = converted.replace(/BOOLEAN DEFAULT (\d)/g, "BOOLEAN DEFAULT '$1'");
  return converted;
}

export function migrate() {
  if (!fs.existsSync(migrationsDir)) {
    console.log('[MIGR] No migrations directory at', migrationsDir);
    return;
  }

  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
  if (!files.length) {
    console.log('[MIGR] No migration files');
    return;
  }

  console.log('[MIGR] Running', files.length, 'migrations...');
  
  if (isPostgres()) {
    console.log('[MIGR] PostgreSQL mode detected - run "npm run migrate-pg" for PostgreSQL migrations');
    return;
  }
  
  for (const f of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, f), 'utf-8');
    try {
      getDb().exec(sql);
      console.log(`[MIGR] Applied ${f}`);
    } catch (err) {
      if (!err.message.includes('duplicate column') && !err.message.includes('duplicate index') && !err.message.includes('already exists')) {
        console.error(`[MIGR] ${f}:`, err.message);
      }
    }
  }
  console.log('[MIGR] Done');
}

export async function migratePg() {
  if (!isPostgres()) {
    console.log('[MIGR] Not in PostgreSQL mode. Set DATABASE_URL to run PostgreSQL migrations.');
    return;
  }

  const db = getDb();
  
  if (!fs.existsSync(pgMigrationsDir)) {
    console.log('[MIGR] No PostgreSQL migrations directory at', pgMigrationsDir);
    return;
  }

  const files = fs.readdirSync(pgMigrationsDir).filter(f => f.endsWith('.sql')).sort();
  if (!files.length) {
    console.log('[MIGR] No PostgreSQL migration files');
    return;
  }

  console.log('[MIGR] Running', files.length, 'PostgreSQL migrations...');
  
  for (const f of files) {
    const sql = fs.readFileSync(path.join(pgMigrationsDir, f), 'utf-8');
    const statements = sql.split(';').filter(s => s.trim()).filter(s => !s.trim().startsWith('--'));
    
    for (const stmt of statements) {
      const trimmed = stmt.trim();
      if (trimmed) {
        try {
          await db.query(trimmed);
          console.log(`[MIGR] Applied ${f}: ${trimmed.substring(0, 60)}...`);
        } catch (err) {
          if (!err.message.includes('already exists') && !err.message.includes('duplicate')) {
            console.error(`[MIGR] ${f}:`, err.message);
          }
        }
      }
    }
  }
  
  console.log('[MIGR] PostgreSQL migrations complete');
}
