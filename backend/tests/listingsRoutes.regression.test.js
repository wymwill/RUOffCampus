// Regression tests for the existing listing + favorites flows in local
// (non-Supabase) mode. These must keep passing after any change.
process.env.LISTINGS_STORAGE = 'local'
delete process.env.SUPABASE_URL
delete process.env.SUPABASE_ANON_KEY

import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { startApp, request } from './helpers.js'

const { default: listingsRouter } = await import('../routes/listings.js')

let app
before(async () => {
  app = await startApp([['/listings', listingsRouter]])
})
after(async () => {
  await app.close()
})

test('GET /listings returns an array', async () => {
  const res = await request(app.base, 'GET', '/listings')
  assert.equal(res.status, 200)
  assert.ok(Array.isArray(res.body))
})

test('create, read, filter, delete a listing', async () => {
  const created = await request(app.base, 'POST', '/listings', {
    body: {
      title: 'Regression test sublet',
      description: 'Room near College Ave',
      price_monthly: 900,
      campus_location: 'College Ave',
      beds: 1,
      property_type: 'room',
      host_id: 'regression-host',
    },
  })
  assert.equal(created.status, 201, JSON.stringify(created.body))
  const id = created.body.id
  assert.ok(id)

  try {
    const fetched = await request(app.base, 'GET', `/listings/${encodeURIComponent(id)}`)
    assert.equal(fetched.status, 200)
    assert.equal(fetched.body.title, 'Regression test sublet')

    const filtered = await request(app.base, 'GET', '/listings?min_price=890&max_price=910')
    assert.ok(filtered.body.some((listing) => listing.id === id))

    const excluded = await request(app.base, 'GET', '/listings?min_price=2000')
    assert.ok(!excluded.body.some((listing) => listing.id === id))
  } finally {
    const deleted = await request(app.base, 'DELETE', `/listings/${encodeURIComponent(id)}`, {
      body: { host_id: 'regression-host' },
    })
    assert.ok([200, 204].includes(deleted.status), `delete status ${deleted.status}`)
  }

  const gone = await request(app.base, 'GET', `/listings/${encodeURIComponent(id)}`)
  assert.equal(gone.status, 404)
})

test('POST /listings validates required fields', async () => {
  const missing = await request(app.base, 'POST', '/listings', { body: { title: 'No price' } })
  assert.equal(missing.status, 400)

  const badCampus = await request(app.base, 'POST', '/listings', {
    body: { title: 'Bad campus', price_monthly: 500, campus_location: 'Newark' },
  })
  assert.equal(badCampus.status, 400)

  const negative = await request(app.base, 'POST', '/listings', {
    body: { title: 'Negative', price_monthly: -5 },
  })
  assert.equal(negative.status, 400)
})

test('import-status responds in local mode', async () => {
  const res = await request(app.base, 'GET', '/listings/import-status')
  assert.equal(res.status, 200)
  assert.equal(res.body.mode, 'local-sqlite')
})

async function createLocal(body = {}) {
  const res = await request(app.base, 'POST', '/listings', {
    body: { title: 'Owner test sublet', price_monthly: 800, host_id: 'owner-host', ...body },
  })
  assert.equal(res.status, 201, JSON.stringify(res.body))
  return res.body
}

test('PUT /listings/:id updates a local listing', async () => {
  const listing = await createLocal()
  try {
    const res = await request(app.base, 'PUT', `/listings/${encodeURIComponent(listing.id)}`, {
      body: { host_id: 'owner-host', title: 'Renamed sublet', price_monthly: 850 },
    })
    assert.equal(res.status, 200, JSON.stringify(res.body))
    assert.equal(res.body.title, 'Renamed sublet')
    assert.equal(res.body.price, 850)
  } finally {
    await request(app.base, 'DELETE', `/listings/${encodeURIComponent(listing.id)}`, {
      body: { host_id: 'owner-host' },
    })
  }
})
