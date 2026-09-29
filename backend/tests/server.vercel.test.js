// On Vercel the app is exported instead of listening, uses an in-memory
// local database, and serves the same routes with and without the /api prefix.
process.env.VERCEL = '1'
process.env.LISTINGS_STORAGE = 'local'
process.env.RUTGERS_IMPORT_ON_START = 'false'
delete process.env.LOCAL_DB_PATH
delete process.env.SUPABASE_URL
delete process.env.SUPABASE_ANON_KEY

import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { request } from './helpers.js'

const { LOCAL_DB_PATH } = await import('../localDatabase.js')
const { default: app } = await import('../server.js')

let server
let base
before(async () => {
  server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s))
  })
  base = `http://127.0.0.1:${server.address().port}`
})
after(async () => {
  await new Promise((resolve) => server.close(resolve))
})

test('uses an in-memory database on Vercel', () => {
  assert.equal(LOCAL_DB_PATH, ':memory:')
})

for (const prefix of ['/api', '']) {
  test(`serves health and listings at ${prefix || 'the root'}`, async () => {
    const health = await request(base, 'GET', `${prefix}/health`)
    assert.equal(health.status, 200)
    assert.equal(health.body.status, 'ok')

    const listings = await request(base, 'GET', `${prefix}/listings`)
    assert.equal(listings.status, 200)
    assert.ok(Array.isArray(listings.body))
  })
}

test('unknown /api paths return 404', async () => {
  const res = await request(base, 'GET', '/api/nope')
  assert.equal(res.status, 404)
})
