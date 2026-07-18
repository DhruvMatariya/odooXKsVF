#!/usr/bin/env node
// Migration runner script
// Run with: npm run migrate

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../src/config/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');

async function runMigrations() {
  const client = await pool.connect();
  try {
    // Create migrations table if not exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Get already executed migrations
    const { rows: executed } = await client.query('SELECT filename FROM migrations ORDER BY id');
    const executedFiles = new Set(executed.map(r => r.filename));

    // Get all migration files
    const files = fs.readdirSync(MIGRATIONS_DIR)
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      if (executedFiles.has(file)) {
        console.log(`Skipping already executed: ${file}`);
        continue;
      }

      console.log(`Running migration: ${file}`);
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf-8');
      
      // Check if migration contains ALTER TYPE ... ADD VALUE (must run outside transaction)
      const needsNoTransaction = /\bALTER TYPE\b.*\bADD VALUE\b/i.test(sql);
      
      if (needsNoTransaction) {
        // Run each statement separately without transaction
        const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0);
        for (const stmt of statements) {
          try {
            await client.query(stmt);
          } catch (err) {
            // Ignore "already exists" errors for enum values
            if (err.message.includes('already exists') || err.message.includes('duplicate')) {
              console.log(`  ⊙ Skipped (already exists): ${stmt.substring(0, 80)}...`);
            } else {
              throw err;
            }
          }
        }
        await client.query('INSERT INTO migrations (filename) VALUES ($1)', [file]);
        console.log(`  ✓ Completed: ${file}`);
      } else {
        await client.query('BEGIN');
        try {
          await client.query(sql);
          await client.query('INSERT INTO migrations (filename) VALUES ($1)', [file]);
          await client.query('COMMIT');
          console.log(`  ✓ Completed: ${file}`);
        } catch (err) {
          await client.query('ROLLBACK');
          console.error(`  ✗ Failed: ${file}`);
          throw err;
        }
      }
    }

    console.log('All migrations completed!');
  } catch (err) {
    console.error('Migration failed:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations().catch(() => process.exit(1));