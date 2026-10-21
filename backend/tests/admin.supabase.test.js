// Admin routes and admin edits of other people's listings. Admin access is
// read from profiles.is_admin with the service role.
process.env.SUPABASE_URL = 'https://test-project.supabase.co'
process.env.SUPABASE_ANON_KEY = 'test-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
delete process.env.LISTINGS_STORAGE

import { test, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { startApp, request } from './helpers.js'

const ADMIN_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const USER_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
const OTHER_ADMIN_ID = 'dddddddd-dddd-dddd-dddd-dddddddddddd'
const othersListing = {
  id: 'l1', title: 'Someone else', price_monthly: 900, host_id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
  is_imported: false, images: [], amenities: {}, created_at: '2026-10-01T00:00:00Z', status: 'active',
}

let currentUserId = USER_ID
let calls = []
const realFetch = globalThis.fetch
globalThis.fetch = async (url, options = {}) => {
  const u = new URL(String(url))
  if (u.hostname !== 'test-project.supabase.co') return realFetch(url, options)
  const method = (options.method || 'GET').toUpperCase()
  const auth = new Headers(options.headers).get('authorization') ?? ''
  calls.push({ path: u.pathname, method, serviceRole: auth.includes('test-service-role-key') })
  if (u.pathname === '/rest/v1/profiles') {
    const id = u.searchParams.get('id')?.replace('eq.', '')
    if (!id) return Response.json([])
    return Response.json({ is_admin: id === ADMIN_ID || id === OTHER_ADMIN_ID })
  }
  if (u.pathname === '/rest/v1/listings') {
    if (method === 'PATCH') return Response.json({ ...othersListing, ...JSON.parse(options.body) })
    if (method === 'DELETE') return new Response(null, { status: 204 })
    return Response.json(u.searchParams.has('id') ? othersListing : [othersListing])
  }
  if (u.pathname === '/auth/v1/admin/users') {
    return Response.json({ users: [], aud: 'authenticated' })
  }
  throw new Error(`unexpected call ${method} ${u.pathname}`)
}

const { supabase } = await import('../supabaseClient.js')
supabase.auth.getUser = async () => ({
  data: { user: { id: currentUserId, email: 'x@gmail.com', email_confirmed_at: '2026-10-01T00:00:00Z' } },
  error: null,
})

const { default: listingsRouter } = await import('../routes/listings.js')
const { default: adminRouter } = await import('../routes/admin.js')
let app
before(async () => {
  app = await startApp([
    ['/listings', listingsRouter],
    ['/admin', adminRouter],
  ])
})
after(async () => {
  await app.close()
  globalThis.fetch = realFetch
})
beforeEach(() => {
  calls = []
  currentUserId = USER_ID
})

const headers = { authorization: 'Bearer token-123' }

test('/admin/me reports whether the caller is an admin', async () => {
  assert.deepEqual((await request(app.base, 'GET', '/admin/me', { headers })).body, { isAdmin: false })
  currentUserId = ADMIN_ID
  assert.deepEqual((await request(app.base, 'GET', '/admin/me', { headers })).body, { isAdmin: true })
})

test('admin routes refuse signed out users and non admins', async () => {
  assert.equal((await request(app.base, 'GET', '/admin/users')).status, 401)
  const res = await request(app.base, 'GET', '/admin/users', { headers })
  assert.equal(res.status, 403)
  assert.ok(!calls.some((call) => call.path === '/auth/v1/admin/users'))
})

test('admins can list users', async () => {
  currentUserId = ADMIN_ID
  const res = await request(app.base, 'GET', '/admin/users', { headers })
  assert.equal(res.status, 200, JSON.stringify(res.body))
  assert.deepEqual(res.body, [])
})

test('non admins still cannot edit or delete other people\'s listings', async () => {
  const put = await request(app.base, 'PUT', '/listings/l1', { headers, body: { title: 'Mine now' } })
  assert.equal(put.status, 403)
  const del = await request(app.base, 'DELETE', '/listings/l1', { headers })
  assert.equal(del.status, 403)
  assert.ok(!calls.some((call) => call.method === 'PATCH' || call.method === 'DELETE'))
})

test('admins edit and delete other people\'s listings with the service role', async () => {
  currentUserId = ADMIN_ID
  const put = await request(app.base, 'PUT', '/listings/l1', { headers, body: { status: 'paused' } })
  assert.equal(put.status, 200, JSON.stringify(put.body))
  assert.equal(put.body.status, 'paused')
  const del = await request(app.base, 'DELETE', '/listings/l1', { headers })
  assert.equal(del.status, 204)
  const writes = calls.filter((call) => call.method === 'PATCH' || call.method === 'DELETE')
  assert.equal(writes.length, 2)
  assert.ok(writes.every((call) => call.serviceRole))
})

test('admins cannot ban or delete their own account', async () => {
  currentUserId = ADMIN_ID
  const ban = await request(app.base, 'POST', `/admin/users/${ADMIN_ID}/ban`, { headers, body: {} })
  assert.equal(ban.status, 403)
  const del = await request(app.base, 'DELETE', `/admin/users/${ADMIN_ID}`, { headers })
  assert.equal(del.status, 403)
})

test('admins cannot ban or delete another admin from the site', async () => {
  currentUserId = ADMIN_ID
  const ban = await request(app.base, 'POST', `/admin/users/${OTHER_ADMIN_ID}/ban`, { headers, body: {} })
  assert.equal(ban.status, 403)
  const del = await request(app.base, 'DELETE', `/admin/users/${OTHER_ADMIN_ID}`, { headers })
  assert.equal(del.status, 403)
  assert.ok(!calls.some((call) => call.path.startsWith('/auth/v1/admin/users/')))
})
