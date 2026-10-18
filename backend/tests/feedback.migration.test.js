// The feedback migration creates a private table that only the backend
// service role can write, with the same limits the API enforces.
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { createTestDatabase } from './pgHelpers.js'

let db

before(async () => {
  db = await createTestDatabase(['supabase/migrations/20261018000000_feedback.sql'])
})
after(async () => {
  await db.close()
})

test('feedback can be inserted with just a message', async () => {
  const result = await db.query(
    `insert into public.feedback (message) values ('Map pins are hard to tap on my phone') returning id, created_at, email, page, profile_id`
  )
  assert.ok(result.rows[0].id)
  assert.ok(result.rows[0].created_at)
  assert.equal(result.rows[0].email, null)
  assert.equal(result.rows[0].page, null)
  assert.equal(result.rows[0].profile_id, null)
})

test('empty messages are rejected', async () => {
  await assert.rejects(
    db.query(`insert into public.feedback (message) values ('')`),
    /feedback_message_check/
  )
})

test('messages over 4000 characters are rejected', async () => {
  await assert.rejects(
    db.query(`insert into public.feedback (message) values (repeat('a', 4001))`),
    /feedback_message_check/
  )
})

test('emails over 320 characters are rejected', async () => {
  await assert.rejects(
    db.query(`insert into public.feedback (message, email) values ('hi', repeat('a', 321))`),
    /feedback_email_check/
  )
})

test('profile_id can point at a profile and is set null when it is deleted', async () => {
  const user = await db.query(
    `insert into auth.users (email) values ('fb@scarletmail.rutgers.edu') returning id`
  )
  const userId = user.rows[0].id
  // The handle_new_user_profile trigger already created the profile row.

  const inserted = await db.query(
    `insert into public.feedback (message, profile_id) values ('Love the bus routes', $1) returning id`,
    [userId]
  )
  assert.ok(inserted.rows[0].id)

  await db.query(`delete from public.profiles where id = $1`, [userId])
  const after = await db.query(`select profile_id from public.feedback where id = $1`, [inserted.rows[0].id])
  assert.equal(after.rows[0].profile_id, null)
})

test('migration can run twice', async () => {
  const fs = await import('node:fs')
  const path = await import('node:path')
  const { fileURLToPath } = await import('node:url')
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
  const sql = fs.readFileSync(
    path.join(repoRoot, 'supabase/migrations/20261018000000_feedback.sql'),
    'utf8'
  )
  await db.exec(sql)
})
