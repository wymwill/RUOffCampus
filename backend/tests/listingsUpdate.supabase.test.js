// Supabase-mode PUT /listings/:id only forwards fields a host may edit.
process.env.SUPABASE_URL = 'https://test-project.supabase.co'
process.env.SUPABASE_ANON_KEY = 'test-anon-key'
delete process.env.LISTINGS_STORAGE
delete process.env.ALLOWED_EMAIL_DOMAINS

import { test, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { startApp, request } from './helpers.js'

const HOST_ID = '11111111-1111-1111-1111-111111111111'
const ownRow = {
  id: 'b2', title: 'My sublet', price_monthly: 900, beds: 1, baths: 1, property_type: 'room',
  source: 'user', is_imported: false, host_id: HOST_ID, images: [], amenities: {},
  created_at: '2026-09-23T00:00:00Z',
}

let patchBodies = []
const realFetch = globalThis.fetch
globalThis.fetch = async (url, options = {}) => {
  const u = String(url)
  if (u.startsWith('https://test-project.supabase.co/rest/v1/listings')) {
    const method = (options.method || 'GET').toUpperCase()
    if (method === 'PATCH') {
      const body = JSON.parse(options.body)
      patchBodies.push(body)
      return Response.json({ ...ownRow, ...body })
    }
    return Response.json(ownRow)
  }
  if (u.startsWith('https://test-project.supabase.co')) {
    throw new Error(`unexpected network call in test: ${u}`)
  }
  return realFetch(url, options)
}

const { supabase } = await import('../supabaseClient.js')
supabase.auth.getUser = async () => ({
  data: {
    user: { id: HOST_ID, email: 'host@scarletmail.rutgers.edu', email_confirmed_at: '2026-09-24T00:00:00Z' },
  },
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
beforeEach(() => {
  patchBodies = []
})

const auth = { authorization: 'Bearer token-123' }

test('PUT drops ownership and import fields before updating Supabase', async () => {
  const res = await request(app.base, 'PUT', '/listings/b2', {
    headers: auth,
    body: {
      title: 'Renamed',
      host_id: '22222222-2222-2222-2222-222222222222',
      is_imported: true,
      source: 'rutgers_off_campus',
      source_name: 'Rutgers Off-Campus Marketplace',
      source_url: 'https://offcampushousing.rutgers.edu/fake',
      imported_at: '2026-09-24T00:00:00Z',
      created_at: '2000-01-01T00:00:00Z',
      id: 'other',
    },
  })
  assert.equal(res.status, 200, JSON.stringify(res.body))
  assert.deepEqual(patchBodies, [{ title: 'Renamed' }])
})

test('PUT with only protected fields is rejected without calling Supabase', async () => {
  const res = await request(app.base, 'PUT', '/listings/b2', {
    headers: auth,
    body: { is_imported: true, source: 'rutgers_off_campus' },
  })
  assert.equal(res.status, 400)
  assert.equal(patchBodies.length, 0)
})
