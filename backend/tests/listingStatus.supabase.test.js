// Supabase-mode search hides paused and taken listings, and GET /listings/mine
// asks Supabase only for the signed in host's rows.
process.env.SUPABASE_URL = 'https://test-project.supabase.co'
process.env.SUPABASE_ANON_KEY = 'test-anon-key'
delete process.env.LISTINGS_STORAGE
delete process.env.ALLOWED_EMAIL_DOMAINS

import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { startApp, request } from './helpers.js'

const HOST_ID = '11111111-1111-1111-1111-111111111111'
const row = (id, status) => ({
  id, title: id, price_monthly: 900, host_id: HOST_ID, is_imported: false, images: [], amenities: {},
  created_at: '2026-09-23T00:00:00Z', ...(status === undefined ? {} : { status }),
})
const rows = [row('active', 'active'), row('paused', 'paused'), row('taken', 'taken'), row('legacy', undefined)]

const listingRequests = []
const realFetch = globalThis.fetch
globalThis.fetch = async (url, options = {}) => {
  const u = String(url)
  if (u.startsWith('https://test-project.supabase.co/rest/v1/listings')) {
    listingRequests.push({ url: new URL(u), headers: new Headers(options.headers) })
    return Response.json(rows)
  }
  if (u.startsWith('https://test-project.supabase.co')) {
    throw new Error(`unexpected network call in test: ${u}`)
  }
  return realFetch(url, options)
}

const { supabase } = await import('../supabaseClient.js')
supabase.auth.getUser = async () => ({
  data: { user: { id: HOST_ID, email: 'host@scarletmail.rutgers.edu', email_confirmed_at: '2026-09-24T00:00:00Z' } },
  error: null,
})

const { default: listingsRouter } = await import('../routes/listings.js')
let app
before(async () => {
  app = await startApp([['/listings', listingsRouter]])
})
after(async () => {
  await app.close()
  globalThis.fetch = realFetch
})

test('search only returns active listings and treats missing status as active', async () => {
  const res = await request(app.base, 'GET', '/listings')
  assert.equal(res.status, 200)
  assert.deepEqual(res.body.map((listing) => listing.id), ['active', 'legacy'])
  assert.equal(res.body[1].status, 'active')
})

test('GET /listings/mine filters by the signed in host and keeps every status', async () => {
  listingRequests.length = 0
  const res = await request(app.base, 'GET', '/listings/mine', {
    headers: { authorization: 'Bearer token-123' },
  })
  assert.equal(res.status, 200)
  assert.deepEqual(res.body.map((listing) => listing.status), ['active', 'paused', 'taken', 'active'])
  assert.equal(listingRequests.length, 1)
  assert.equal(listingRequests[0].url.searchParams.get('host_id'), `eq.${HOST_ID}`)
  assert.equal(listingRequests[0].headers.get('authorization'), 'Bearer token-123')
})

test('GET /listings/mine needs a session', async () => {
  const res = await request(app.base, 'GET', '/listings/mine')
  assert.equal(res.status, 401)
})
