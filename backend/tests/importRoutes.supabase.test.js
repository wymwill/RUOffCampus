// Supabase-mode listing routes: import endpoint guard and imported-row mapping.
process.env.SUPABASE_URL = 'https://test-project.supabase.co'
process.env.SUPABASE_ANON_KEY = 'test-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
delete process.env.LISTINGS_STORAGE
delete process.env.IMPORT_ADMIN_TOKEN

import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { startApp, request } from './helpers.js'

const importedRow = {
  id: 'a1', title: '146 Hamilton St', price_monthly: 4800, price_label: '$4,800 - $5,200',
  beds: 5, baths: 2, property_type: 'house', source: 'rutgers_off_campus',
  source_name: 'Rutgers Off-Campus Marketplace', source_url: 'https://offcampushousing.rutgers.edu/x',
  is_imported: true, host_id: null, images: [], amenities: {}, created_at: '2026-09-24T00:00:00Z',
  latitude: 40.4959, longitude: -74.4449, distance: 0.7,
}
const userRow = {
  id: 'b2', title: 'My sublet', price_monthly: 900, price_label: null, beds: 1, baths: 1,
  property_type: 'room', source: 'user', is_imported: false, host_id: 'u1', images: [],
  amenities: {}, created_at: '2026-09-23T00:00:00Z',
}

const realFetch = globalThis.fetch
globalThis.fetch = async (url, options) => {
  const u = String(url)
  if (u.startsWith('https://test-project.supabase.co/rest/v1/listings')) {
    return new Response(JSON.stringify([importedRow, userRow]), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }
  if (u.startsWith('https://test-project.supabase.co') || u.startsWith('https://offcampushousing.rutgers.edu')) {
    throw new Error(`unexpected network call in test: ${u}`)
  }
  return realFetch(url, options)
}

const { default: listingsRouter } = await import('../routes/listings.js')
let app
before(async () => {
  app = await startApp([['/listings', listingsRouter]])
})
after(async () => {
  await app.close()
  globalThis.fetch = realFetch
})

test('GET /listings marks imported rows and keeps user rows as before', async () => {
  const res = await request(app.base, 'GET', '/listings')
  assert.equal(res.status, 200)
  const [imported, user] = res.body
  assert.equal(imported.isImported, true)
  assert.equal(imported.sourceName, 'Rutgers Off-Campus Marketplace')
  assert.equal(imported.sourceUrl, 'https://offcampushousing.rutgers.edu/x')
  assert.equal(imported.priceLabel, '$4,800 - $5,200')
  assert.equal(imported.campus, 'College Ave')
  assert.equal(imported.nearestStudentCenter, 'College Avenue Student Center')
  assert.ok(imported.distance < 0.7, `distance ${imported.distance}`)
  assert.equal(user.nearestStudentCenter, null)
  assert.equal(user.isImported, false)
  assert.equal(user.source, 'supabase')
  assert.equal(user.sourceName, 'Supabase')
  assert.equal(user.priceLabel, '$900')
})

test('POST /listings/import-external is refused without IMPORT_ADMIN_TOKEN configured', async () => {
  const res = await request(app.base, 'POST', '/listings/import-external')
  assert.equal(res.status, 403)
})

test('POST /listings/import-external rejects a wrong token', async () => {
  process.env.IMPORT_ADMIN_TOKEN = 'correct-token'
  try {
    const res = await request(app.base, 'POST', '/listings/import-external', {
      headers: { 'x-import-token': 'wrong' },
    })
    assert.equal(res.status, 401)
  } finally {
    delete process.env.IMPORT_ADMIN_TOKEN
  }
})

test('existing behavior: creating a listing still requires auth in Supabase mode', async () => {
  const res = await request(app.base, 'POST', '/listings', { body: { title: 'x', price_monthly: 500 } })
  assert.equal(res.status, 401)
})
