import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PGlite } from '@electric-sql/pglite'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')

// In-memory Postgres with a minimal stand-in for Supabase's auth schema,
// loaded with backend/setup.sql plus the given migration files.
export async function createTestDatabase(migrations = []) {
  const db = new PGlite()
  await db.exec(`
    create schema auth;
    create table auth.users (
      id uuid primary key default gen_random_uuid(),
      email text,
      email_confirmed_at timestamptz,
      raw_user_meta_data jsonb default '{}'::jsonb
    );
    create role authenticated;
    create or replace function auth.uid() returns uuid language sql as 'select null::uuid';
  `)
  await db.exec(readSql('backend/setup.sql'))
  for (const migration of migrations) {
    await db.exec(readSql(migration))
  }
  return db
}

function readSql(relativePath) {
  // pgcrypto isn't bundled with PGlite; gen_random_uuid() is built in anyway.
  return fs
    .readFileSync(path.join(repoRoot, relativePath), 'utf8')
    .replace(/create extension[^;]*;/gi, '')
}
