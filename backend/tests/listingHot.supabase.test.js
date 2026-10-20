// Supabase mode marks the most requested listings as hot using the service
// role client, and still returns listings if counting fails.
process.env.SUPABASE_URL = 'https://test-project.supabase.co'
process.env.SUPABASE_ANON_KEY = 'test-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
delete process.env.LISTINGS_STORAGE

import { test, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { startApp, request } from './helpers.js'

const row = (id) => ({
  id, title: id, price_monthly: 900, host_id: 'h', is_imported: false, images: [], amenities: {},
  created_at: '2026-10-01T00:00:00Z', status: 'active',
})
let failInterest = false
const realFetch = globalThis.fetch
globalThis.fetch = async (url, options = {}) => {
  const u = String(url)
  if (u.startsWith('https://test-project.supabase.co/rest/v1/listings')) {
    return Response.json([row('busy'), row('saved-once'), row('quiet')])
  }
  if (u.startsWith('https://test-project.supabase.co/rest/v1/favorites')) {
    if (failInterest) return Response.json({ message: 'boom' }, { status: 500 })
    assert.match(new Headers(options.headers).get('authorization'), /test-service-role-key/)
    assert.ok(new URL(u).searchParams.get('created_at')?.startsWith('gte.'))
    return Response.json([{ listing_id: 'busy' }, { listing_id: 'saved-once' }])
  }
  if (u.startsWith('https://test-project.supabase.co/rest/v1/conversations')) {
    if (failInterest) return Response.json({ message: 'boom' }, { status: 500 })
    return Response.json([{ listing_id: 'busy' }])
  }
  if (u.startsWith('https://test-project.supabase.co')) throw new Error(`unexpected call ${u}`)
  return realFetch(url, options)
}

const { resetListingInterestCache } = await import('../listingInterest.js')
const { default: listingsRouter } = await import('../routes/listings.js')
let app
before(async () => {
  app = await startApp([['/listings', listingsRouter]])
})
after(async () => {
  await app.close()
  globalThis.fetch = realFetch
})
beforeEach(() => {
  failInterest = false
  resetListingInterestCache()
})

test('marks listings with enough recent saves and messages as hot', async () => {
  const res = await request(app.base, 'GET', '/listings')
  assert.equal(res.status, 200)
  const byId = Object.fromEntries(res.body.map((listing) => [listing.id, listing]))
  assert.deepEqual(byId.busy.interest, { saves: 1, messages: 1 })
  assert.equal(byId.busy.hot, true)
  assert.equal(byId['saved-once'].hot, false)
  assert.deepEqual(byId.quiet.interest, { saves: 0, messages: 0 })
})

test('still returns listings when counting interest fails', async () => {
  failInterest = true
  const res = await request(app.base, 'GET', '/listings')
  assert.equal(res.status, 200)
  assert.equal(res.body.length, 3)
  assert.equal(res.body[0].hot, undefined)
})
