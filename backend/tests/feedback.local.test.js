// Feedback route in local (non-Supabase) mode: anonymous posts are stored,
// bad input is rejected, and nothing else in the app changes.
process.env.LISTINGS_STORAGE = 'local'
delete process.env.SUPABASE_URL
delete process.env.SUPABASE_ANON_KEY

import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { startApp, request } from './helpers.js'

const { default: feedbackRouter } = await import('../routes/feedback.js')

let app
before(async () => {
  app = await startApp([['/feedback', feedbackRouter]])
})
after(async () => {
  await app.close()
})

test('POST /feedback stores an anonymous message', async () => {
  const res = await request(app.base, 'POST', '/feedback', {
    body: { message: 'The map filters reset when I go back', page: '/map' },
  })
  assert.equal(res.status, 201, JSON.stringify(res.body))
  assert.ok(res.body.id)
})

test('POST /feedback stores a message with an email', async () => {
  const res = await request(app.base, 'POST', '/feedback', {
    body: { message: 'Happy to test new features', email: 'tester@scarletmail.rutgers.edu' },
  })
  assert.equal(res.status, 201, JSON.stringify(res.body))
  assert.ok(res.body.id)
})

test('POST /feedback requires a message', async () => {
  const missing = await request(app.base, 'POST', '/feedback', { body: {} })
  assert.equal(missing.status, 400)

  const blank = await request(app.base, 'POST', '/feedback', { body: { message: '   ' } })
  assert.equal(blank.status, 400)
})

test('POST /feedback rejects messages over 4000 characters', async () => {
  const res = await request(app.base, 'POST', '/feedback', {
    body: { message: 'a'.repeat(4001) },
  })
  assert.equal(res.status, 400)
})

test('POST /feedback rejects malformed emails', async () => {
  const res = await request(app.base, 'POST', '/feedback', {
    body: { message: 'hello', email: 'not-an-email' },
  })
  assert.equal(res.status, 400)
})
