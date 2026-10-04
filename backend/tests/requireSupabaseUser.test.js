// Auth middleware in Supabase mode, with supabase.auth.getUser stubbed.
process.env.SUPABASE_URL = 'https://test-project.supabase.co'
process.env.SUPABASE_ANON_KEY = 'test-anon-key'
delete process.env.LISTINGS_STORAGE
delete process.env.ALLOWED_EMAIL_DOMAINS

import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'

const { supabase, isSupabaseConfigured } = await import('../supabaseClient.js')
const { requireSupabaseUser } = await import('../middleware/requireSupabaseUser.js')

let nextUser = null
let nextError = null
supabase.auth.getUser = async () => ({ data: { user: nextUser }, error: nextError })

function run(headers = { authorization: 'Bearer token-123' }) {
  const req = { headers }
  let statusCode = null
  let payload = null
  let nextCalled = false
  const res = {
    status(code) {
      statusCode = code
      return this
    },
    json(body) {
      payload = body
      return this
    },
  }
  return requireSupabaseUser(req, res, () => {
    nextCalled = true
  }).then(() => ({ req, statusCode, payload, nextCalled }))
}

const confirmed = '2026-09-24T00:00:00Z'

beforeEach(() => {
  nextUser = null
  nextError = null
})

test('runs in Supabase mode for these tests', () => {
  assert.equal(isSupabaseConfigured, true)
})

test('existing behavior: missing bearer token is 401', async () => {
  const result = await run({})
  assert.equal(result.statusCode, 401)
  assert.equal(result.nextCalled, false)
})

test('existing behavior: invalid session is 401', async () => {
  nextError = { message: 'invalid JWT' }
  const result = await run()
  assert.equal(result.statusCode, 401)
  assert.equal(result.nextCalled, false)
})

test('confirmed scarletmail user passes and req.user is set', async () => {
  nextUser = { id: 'u1', email: 'ay559@scarletmail.rutgers.edu', email_confirmed_at: confirmed }
  const result = await run()
  assert.equal(result.nextCalled, true)
  assert.equal(result.req.user.id, 'u1')
  assert.equal(result.req.user.isRutgers, true)
})

test('confirmed first.last@rutgers.edu user passes', async () => {
  nextUser = { id: 'u2', email: 'anish.yenduri@rutgers.edu', email_confirmed_at: confirmed }
  const result = await run()
  assert.equal(result.nextCalled, true)
})

test('confirmed non-Rutgers email passes and is labeled as non-Rutgers', async () => {
  nextUser = { id: 'u3', email: 'someone@gmail.com', email_confirmed_at: confirmed }
  const result = await run()
  assert.equal(result.nextCalled, true)
  assert.equal(result.req.user.isRutgers, false)
})

test('unconfirmed non-Rutgers email is 403', async () => {
  nextUser = { id: 'u5', email: 'someone@gmail.com', email_confirmed_at: null }
  const result = await run()
  assert.equal(result.statusCode, 403)
  assert.equal(result.nextCalled, false)
})

test('unconfirmed Rutgers email is 403', async () => {
  nextUser = { id: 'u4', email: 'ay559@scarletmail.rutgers.edu', email_confirmed_at: null }
  const result = await run()
  assert.equal(result.statusCode, 403)
  assert.equal(result.nextCalled, false)
})
