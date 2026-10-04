// Open sign-up with Rutgers labels: anyone can sign up, and the Rutgers flag
// on profiles and listings comes from the confirmed auth email only.
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { createTestDatabase } from './pgHelpers.js'

const MIGRATIONS = [
  'supabase/migrations/20260924060000_restrict_signup_to_rutgers_emails.sql',
  'supabase/migrations/20260924061000_imported_listings.sql',
  'supabase/migrations/20261004120000_open_signup_with_rutgers_labels.sql',
]

let db

before(async () => {
  db = await createTestDatabase(MIGRATIONS)
})
after(async () => {
  await db.close()
})

async function createUser(email, confirmed = true) {
  const result = await db.query(
    'insert into auth.users (email, email_confirmed_at) values ($1, $2) returning id',
    [email, confirmed ? new Date().toISOString() : null]
  )
  return result.rows[0].id
}

async function profileFlag(id) {
  const result = await db.query('select email, is_rutgers from public.profiles where id = $1', [id])
  return result.rows[0]
}

async function createListing(hostId, extra = {}) {
  const result = await db.query(
    `insert into public.listings (title, price_monthly, host_id, host_is_rutgers)
     values ('Room', 900, $1, $2) returning id, host_is_rutgers`,
    [hostId, extra.host_is_rutgers ?? false]
  )
  return result.rows[0]
}

test('non-Rutgers emails can sign up now', async () => {
  const id = await createUser('someone@gmail.com')
  assert.equal((await profileFlag(id)).is_rutgers, false)
})

test('confirmed Rutgers emails are flagged on the profile and their listings', async () => {
  const id = await createUser('ay559@scarletmail.rutgers.edu')
  assert.equal((await profileFlag(id)).is_rutgers, true)
  const listing = await createListing(id)
  assert.equal(listing.host_is_rutgers, true)
})

test('unconfirmed Rutgers emails are not flagged until they confirm', async () => {
  const id = await createUser('new.student@rutgers.edu', false)
  assert.equal((await profileFlag(id)).is_rutgers, false)
  const listing = await createListing(id)
  assert.equal(listing.host_is_rutgers, false)

  await db.query('update auth.users set email_confirmed_at = now() where id = $1', [id])
  assert.equal((await profileFlag(id)).is_rutgers, true)
  const refreshed = await db.query('select host_is_rutgers from public.listings where id = $1', [listing.id])
  assert.equal(refreshed.rows[0].host_is_rutgers, true)
})

test('clients cannot fake the flags', async () => {
  const id = await createUser('fake@gmail.com')
  const listing = await createListing(id, { host_is_rutgers: true })
  assert.equal(listing.host_is_rutgers, false)

  await db.query(
    `update public.profiles set is_rutgers = true, email = 'fake@rutgers.edu' where id = $1`,
    [id]
  )
  const profile = await profileFlag(id)
  assert.equal(profile.is_rutgers, false)
  assert.equal(profile.email, 'fake@gmail.com')

  await db.query('update public.listings set host_is_rutgers = true where id = $1', [listing.id])
  const after = await db.query('select host_is_rutgers from public.listings where id = $1', [listing.id])
  assert.equal(after.rows[0].host_is_rutgers, false)
})

test('changing email away from Rutgers removes the flag', async () => {
  const id = await createUser('leaving@rutgers.edu')
  const listing = await createListing(id)
  assert.equal(listing.host_is_rutgers, true)

  await db.query(`update auth.users set email = 'leaving@gmail.com' where id = $1`, [id])
  assert.equal((await profileFlag(id)).is_rutgers, false)
  const after = await db.query('select host_is_rutgers from public.listings where id = $1', [listing.id])
  assert.equal(after.rows[0].host_is_rutgers, false)
})

test('imported listings without a host are never flagged', async () => {
  const result = await db.query(
    `insert into public.listings (title, price_monthly, is_imported, source, source_listing_id, host_is_rutgers)
     values ('Imported', 1000, true, 'rutgers_off_campus', 'x1', true) returning host_is_rutgers`
  )
  assert.equal(result.rows[0].host_is_rutgers, false)
})

test('migration can run twice', async () => {
  const fs = await import('node:fs')
  const path = await import('node:path')
  const { fileURLToPath } = await import('node:url')
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
  await db.exec(fs.readFileSync(path.join(repoRoot, MIGRATIONS[2]), 'utf8'))
})
