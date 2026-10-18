// Supabase mode: the importer upserts on (source, source_listing_id) and
// prunes stale rows. Supabase HTTP calls are captured instead of sent.
process.env.SUPABASE_URL = 'https://test-project.supabase.co'
process.env.SUPABASE_ANON_KEY = 'test-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
delete process.env.LISTINGS_STORAGE

import { test, beforeEach, after } from 'node:test'
import assert from 'node:assert/strict'
import { stubRutgersFetch } from './fixtures/rutgersMarketplace.js'

const calls = []
const fakeSupabase = async (url, options = {}) => {
  const u = String(url)
  if (!u.startsWith('https://test-project.supabase.co')) {
    throw new Error(`unexpected network call: ${u}`)
  }
  const headers = new Headers(options.headers)
  calls.push({
    method: options.method || 'GET',
    url: new URL(u),
    prefer: headers.get('prefer') || '',
    auth: headers.get('authorization') || '',
    body: options.body ? JSON.parse(options.body) : null,
  })
  return new Response('[]', {
    status: 200,
    headers: { 'content-type': 'application/json', 'content-range': '0-1/2' },
  })
}
const restoreFetch = stubRutgersFetch(undefined, fakeSupabase)
after(() => restoreFetch())

const { syncRutgersMarketplaceListings } = await import('../rutgersMarketplaceImporter.js')

beforeEach(() => {
  calls.length = 0
})

test('upserts all listings keyed on source + source_listing_id with the service role', async () => {
  const result = await syncRutgersMarketplaceListings({ force: true })
  assert.equal(result.mode, 'supabase')
  assert.equal(result.importedCount, 2)

  const upsert = calls.find((call) => call.method === 'POST')
  assert.ok(upsert, 'expected an upsert call')
  assert.equal(upsert.url.pathname, '/rest/v1/listings')
  assert.equal(upsert.url.searchParams.get('on_conflict'), 'source,source_listing_id')
  assert.match(upsert.prefer, /resolution=merge-duplicates/)
  assert.match(upsert.auth, /test-service-role-key/)

  assert.equal(upsert.body.length, 2)
  for (const row of upsert.body) {
    assert.equal(row.source, 'rutgers_off_campus')
    assert.equal(row.is_imported, true)
    assert.equal(row.host_id, null)
    assert.equal(row.imported_at, result.fetchedAt)
    assert.ok(row.source_listing_id)
    assert.ok(Number.isInteger(row.price_monthly) && row.price_monthly >= 0)
  }
  const house = upsert.body.find((row) => row.source_listing_id === '70138')
  const easton = upsert.body.find((row) => row.source_listing_id === '60760')
  assert.equal(house.created_at, new Date(1790000000 * 1000).toISOString())
  assert.equal(easton.created_at, null)
})

test('prunes only stale imported rows from the same source', async () => {
  const result = await syncRutgersMarketplaceListings({ force: true })
  const prune = calls.find((call) => call.method === 'DELETE')
  assert.ok(prune, 'expected a prune call')
  const params = prune.url.searchParams
  assert.equal(params.get('source'), 'eq.rutgers_off_campus')
  assert.equal(params.get('is_imported'), 'eq.true')
  assert.equal(params.get('imported_at'), `lt.${result.fetchedAt}`)
})

test('the same listings produce the same upsert keys on every run (no duplicates)', async () => {
  await syncRutgersMarketplaceListings({ force: true })
  const first = calls.find((call) => call.method === 'POST').body.map((row) => row.source_listing_id)
  calls.length = 0
  await syncRutgersMarketplaceListings({ force: true })
  const second = calls.find((call) => call.method === 'POST').body.map((row) => row.source_listing_id)
  assert.deepEqual(second.sort(), first.sort())
  assert.equal(new Set(first).size, first.length)
})
