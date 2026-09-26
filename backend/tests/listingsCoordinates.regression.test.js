// Regression tests: listing coordinates (latitude/longitude) must round-trip
// through the listings API so the map view can plot pins. Runs in local
// (non-Supabase) mode like the other route regression tests.
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

test('create + read back a listing with coordinates', async () => {
  const created = await request(app.base, 'POST', '/listings', {
    body: {
      title: 'Map pin regression sublet',
      price_monthly: 1200,
      campus_location: 'College Ave',
      host_id: 'map-regression-host',
      latitude: 40.500874,
      longitude: -74.452454,
    },
  })
  assert.equal(created.status, 201, JSON.stringify(created.body))
  const id = created.body.id
  assert.ok(id)
  assert.equal(created.body.latitude, 40.500874)
  assert.equal(created.body.longitude, -74.452454)

  try {
    const list = await request(app.base, 'GET', '/listings')
    assert.equal(list.status, 200)
    const fromList = list.body.find((listing) => listing.id === id)
    assert.ok(fromList, 'created listing should appear in GET /listings')
    assert.equal(typeof fromList.latitude, 'number')
    assert.equal(typeof fromList.longitude, 'number')
    assert.equal(fromList.latitude, 40.500874)
    assert.equal(fromList.longitude, -74.452454)

    const detail = await request(app.base, 'GET', `/listings/${encodeURIComponent(id)}`)
    assert.equal(detail.status, 200)
    assert.equal(detail.body.latitude, 40.500874)
    assert.equal(detail.body.longitude, -74.452454)
  } finally {
    await request(app.base, 'DELETE', `/listings/${encodeURIComponent(id)}`)
  }
})

test('listings without coordinates expose null lat/lng instead of dropping the fields', async () => {
  const created = await request(app.base, 'POST', '/listings', {
    body: {
      title: 'No-coords regression sublet',
      price_monthly: 950,
      host_id: 'map-regression-host',
    },
  })
  assert.equal(created.status, 201, JSON.stringify(created.body))
  const id = created.body.id

  try {
    const detail = await request(app.base, 'GET', `/listings/${encodeURIComponent(id)}`)
    assert.equal(detail.status, 200)
    assert.ok('latitude' in detail.body, 'latitude key should be present')
    assert.ok('longitude' in detail.body, 'longitude key should be present')
    assert.equal(detail.body.latitude, null)
    assert.equal(detail.body.longitude, null)
  } finally {
    await request(app.base, 'DELETE', `/listings/${encodeURIComponent(id)}`)
  }
})
