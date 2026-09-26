// RLS for profiles and conversation participants, checked as the
// authenticated role against an in-memory Postgres.
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { createTestDatabase } from './pgHelpers.js'

const MIGRATION = 'supabase/migrations/20260926120000_tighten_profile_and_participant_policies.sql'

const RENTER = '10000000-0000-0000-0000-000000000001'
const HOST = '10000000-0000-0000-0000-000000000002'
const STRANGER = '10000000-0000-0000-0000-000000000003'
let db
let listingId
let conversationId

before(async () => {
  db = await createTestDatabase([MIGRATION])
  await db.exec(`
    create or replace function auth.uid() returns uuid language sql stable
      as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
    grant usage on schema public, auth to authenticated;
    grant all on all tables in schema public to authenticated;
    grant execute on all functions in schema public, auth to authenticated;
  `)
  for (const [id, email] of [
    [RENTER, 'renter@scarletmail.rutgers.edu'],
    [HOST, 'host@scarletmail.rutgers.edu'],
    [STRANGER, 'stranger@scarletmail.rutgers.edu'],
  ]) {
    await db.query('insert into auth.users (id, email) values ($1, $2)', [id, email])
  }
  const listing = await db.query(
    `insert into public.listings (title, price_monthly, host_id) values ('Room', 900, $1) returning id`,
    [HOST]
  )
  listingId = listing.rows[0].id
})

after(async () => {
  await db.close()
})

async function asUser(userId, sql, params = []) {
  await db.query(`select set_config('test.uid', $1, false)`, [userId])
  await db.exec('set role authenticated')
  try {
    return await db.query(sql, params)
  } finally {
    await db.exec('reset role')
  }
}

async function visibleProfileIds(userId) {
  const result = await asUser(userId, 'select id from public.profiles order by id')
  return result.rows.map((row) => row.id)
}

test('users only see their own profile before any conversation', async () => {
  assert.deepEqual(await visibleProfileIds(RENTER), [RENTER])
  assert.deepEqual(await visibleProfileIds(STRANGER), [STRANGER])
})

test('conversation creator can add themselves and the listing host', async () => {
  const created = await asUser(
    RENTER,
    'insert into public.conversations (listing_id, created_by) values ($1, $2) returning id',
    [listingId, RENTER]
  )
  conversationId = created.rows[0].id
  await asUser(
    RENTER,
    'insert into public.conversation_participants (conversation_id, profile_id) values ($1, $2), ($1, $3)',
    [conversationId, RENTER, HOST]
  )
  const count = await db.query(
    'select count(*)::int as n from public.conversation_participants where conversation_id = $1',
    [conversationId]
  )
  assert.equal(count.rows[0].n, 2)
})

test('conversation creator cannot add an unrelated user', async () => {
  await assert.rejects(
    asUser(
      RENTER,
      'insert into public.conversation_participants (conversation_id, profile_id) values ($1, $2)',
      [conversationId, STRANGER]
    ),
    /row-level security/
  )
})

test('users cannot add themselves to someone else\'s conversation', async () => {
  await assert.rejects(
    asUser(
      STRANGER,
      'insert into public.conversation_participants (conversation_id, profile_id) values ($1, $2)',
      [conversationId, STRANGER]
    ),
    /row-level security/
  )
})

test('conversation participants can see each other but strangers cannot', async () => {
  assert.deepEqual(await visibleProfileIds(RENTER), [RENTER, HOST])
  assert.deepEqual(await visibleProfileIds(HOST), [RENTER, HOST])
  assert.deepEqual(await visibleProfileIds(STRANGER), [STRANGER])
})
