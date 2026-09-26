// Listing status migration applies on top of the existing schema and
// only allows known statuses.
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { createTestDatabase } from './pgHelpers.js'

let db
let hostId

before(async () => {
  db = await createTestDatabase([
    'supabase/migrations/20260924061000_imported_listings.sql',
    'supabase/migrations/20260926130000_listing_status.sql',
  ])
  const user = await db.query(
    `insert into auth.users (email) values ('host@scarletmail.rutgers.edu') returning id`
  )
  hostId = user.rows[0].id
})
after(async () => {
  await db.close()
})

test('new listings default to active', async () => {
  const result = await db.query(
    `insert into public.listings (title, price_monthly, host_id) values ('Room', 900, $1) returning status`,
    [hostId]
  )
  assert.equal(result.rows[0].status, 'active')
})

test('unknown statuses are rejected', async () => {
  await assert.rejects(
    db.query(
      `insert into public.listings (title, price_monthly, host_id, status) values ('Room', 900, $1, 'deleted')`,
      [hostId]
    ),
    /listings_status_check/
  )
})

test('migration can run twice', async () => {
  const fs = await import('node:fs')
  const path = await import('node:path')
  const { fileURLToPath } = await import('node:url')
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
  const sql = fs.readFileSync(
    path.join(repoRoot, 'supabase/migrations/20260926130000_listing_status.sql'),
    'utf8'
  )
  await db.exec(sql)
})
