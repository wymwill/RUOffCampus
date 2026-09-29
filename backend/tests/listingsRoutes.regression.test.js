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

test('local PUT and DELETE reject callers who do not own the listing', async () => {
  const listing = await createLocal()
  const path = `/listings/${encodeURIComponent(listing.id)}`
  try {
    const noHost = await request(app.base, 'PUT', path, { body: { title: 'Hijacked' } })
    assert.equal(noHost.status, 403)

    const otherHost = await request(app.base, 'PUT', path, {
      body: { host_id: 'someone-else', title: 'Hijacked' },
    })
    assert.equal(otherHost.status, 403)

    const otherDelete = await request(app.base, 'DELETE', path, { body: { host_id: 'someone-else' } })
    assert.equal(otherDelete.status, 403)

    const still = await request(app.base, 'GET', path)
    assert.equal(still.body.title, 'Owner test sublet')
  } finally {
    const deleted = await request(app.base, 'DELETE', path, { body: { host_id: 'owner-host' } })
    assert.equal(deleted.status, 204)
  }
})

test('PUT ignores ownership and import fields in the body', async () => {
  const listing = await createLocal()
  const path = `/listings/${encodeURIComponent(listing.id)}`
  try {
    const res = await request(app.base, 'PUT', path, {
      body: {
        host_id: 'owner-host',
        title: 'Still mine',
        is_imported: true,
        source: 'rutgers_off_campus',
        source_name: 'Rutgers Off-Campus Marketplace',
        source_url: 'https://offcampushousing.rutgers.edu/fake',
        created_at: '2000-01-01T00:00:00Z',
      },
    })
    assert.equal(res.status, 200, JSON.stringify(res.body))
    assert.equal(res.body.title, 'Still mine')
    assert.equal(res.body.isImported, false)
    assert.equal(res.body.source, 'user')
    assert.notEqual(res.body.sourceName, 'Rutgers Off-Campus Marketplace')
    assert.equal(res.body.sourceUrl, '')
    assert.equal(res.body.host_id, 'owner-host')
    assert.notEqual(res.body.created_at, '2000-01-01T00:00:00Z')
  } finally {
    await request(app.base, 'DELETE', path, { body: { host_id: 'owner-host' } })
  }
})

test('PUT validates edited fields', async () => {
  const listing = await createLocal()
  const path = `/listings/${encodeURIComponent(listing.id)}`
  try {
    const nothing = await request(app.base, 'PUT', path, { body: { host_id: 'owner-host', source: 'x' } })
    assert.equal(nothing.status, 400)

    const badPrice = await request(app.base, 'PUT', path, { body: { host_id: 'owner-host', price_monthly: 0 } })
    assert.equal(badPrice.status, 400)

    const badCampus = await request(app.base, 'PUT', path, {
      body: { host_id: 'owner-host', campus_location: 'Newark' },
    })
    assert.equal(badCampus.status, 400)
  } finally {
    await request(app.base, 'DELETE', path, { body: { host_id: 'owner-host' } })
  }
})

test('paused and taken listings leave search but stay in the host list', async () => {
  const listing = await createLocal({ host_id: 'status-host', title: 'Status test sublet' })
  const path = `/listings/${encodeURIComponent(listing.id)}`
  const inSearch = async () =>
    (await request(app.base, 'GET', '/listings')).body.some((item) => item.id === listing.id)
  try {
    assert.equal(listing.status, 'active')
    assert.equal(await inSearch(), true)

    for (const status of ['paused', 'taken']) {
      const updated = await request(app.base, 'PUT', path, { body: { host_id: 'status-host', status } })
      assert.equal(updated.status, 200, JSON.stringify(updated.body))
      assert.equal(updated.body.status, status)
      assert.equal(await inSearch(), false)

      const mine = await request(app.base, 'GET', '/listings/mine?host_id=status-host')
      assert.equal(mine.status, 200)
      assert.deepEqual(mine.body.map((item) => [item.id, item.status]), [[listing.id, status]])
    }

    const relisted = await request(app.base, 'PUT', path, { body: { host_id: 'status-host', status: 'active' } })
    assert.equal(relisted.body.status, 'active')
    assert.equal(await inSearch(), true)

    const bad = await request(app.base, 'PUT', path, { body: { host_id: 'status-host', status: 'deleted' } })
    assert.equal(bad.status, 400)
  } finally {
    await request(app.base, 'DELETE', path, { body: { host_id: 'status-host' } })
  }
})

test('GET /listings/mine requires host_id in local mode', async () => {
  const res = await request(app.base, 'GET', '/listings/mine')
  assert.equal(res.status, 400)
})

test('campus and distance come from the nearest student center', async () => {
  const listing = await createLocal({
    host_id: 'campus-host',
    // Posted as Busch, but the coordinates are on Easton Ave near College Ave
    campus_location: 'Busch',
    distance: 5,
    latitude: 40.4987,
    longitude: -74.4486,
  })
  const path = `/listings/${encodeURIComponent(listing.id)}`
  try {
    assert.equal(listing.campus, 'College Ave')
    assert.equal(listing.nearestStudentCenter, 'College Avenue Student Center')
    assert.ok(listing.distance < 0.5, `distance ${listing.distance}`)

    const college = await request(app.base, 'GET', '/listings?campus=College%20Ave')
    assert.ok(college.body.some((item) => item.id === listing.id))
    const busch = await request(app.base, 'GET', '/listings?campus=Busch')
    assert.ok(!busch.body.some((item) => item.id === listing.id))
  } finally {
    await request(app.base, 'DELETE', path, { body: { host_id: 'campus-host' } })
  }
})
