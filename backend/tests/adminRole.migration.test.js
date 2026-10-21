// The admin migration makes the owner an admin and keeps users from
// granting themselves the flag.
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { createTestDatabase } from './pgHelpers.js'

const MIGRATION = 'supabase/migrations/20261022120000_admin_role.sql'
let db
let ownerId
let studentId

before(async () => {
  db = await createTestDatabase()
  const users = await db.query(
    `insert into auth.users (email) values ('ScarletSublet@gmail.com'), ('student@scarletmail.rutgers.edu') returning id`
  )
  ownerId = users.rows[0].id
  studentId = users.rows[1].id
  await db.query(
    `insert into public.profiles (id, email) values ($1, 'scarletsublet@gmail.com'), ($2, 'student@scarletmail.rutgers.edu')
     on conflict (id) do nothing`,
    [ownerId, studentId]
  )
  const fs = await import('node:fs')
  const path = await import('node:path')
  const { fileURLToPath } = await import('node:url')
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
  await db.exec(fs.readFileSync(path.join(repoRoot, MIGRATION), 'utf8'))
  // RLS is covered elsewhere. Off here so these tests reach the trigger.
  await db.exec('grant all on public.profiles to authenticated')
  await db.exec('alter table public.profiles disable row level security')
})
after(async () => {
  await db.close()
})

const isAdmin = async (id) =>
  (await db.query('select is_admin from public.profiles where id = $1', [id])).rows[0].is_admin

test('the owner account is an admin and others are not', async () => {
  assert.equal(await isAdmin(ownerId), true)
  assert.equal(await isAdmin(studentId), false)
})

test('a signed in user cannot make themselves an admin', async () => {
  await db.exec('set role authenticated')
  try {
    await db.query('update public.profiles set is_admin = true, name = $2 where id = $1', [studentId, 'Sam'])
  } finally {
    await db.exec('reset role')
  }
  assert.equal(await isAdmin(studentId), false)
  const { rows } = await db.query('select name from public.profiles where id = $1', [studentId])
  assert.equal(rows[0].name, 'Sam')
})

test('a signed in user cannot remove an admin flag either', async () => {
  await db.exec('set role authenticated')
  try {
    await db.query('update public.profiles set is_admin = false where id = $1', [ownerId])
  } finally {
    await db.exec('reset role')
  }
  assert.equal(await isAdmin(ownerId), true)
})

test('SQL run by the owner can still grant admin', async () => {
  await db.query('update public.profiles set is_admin = true where id = $1', [studentId])
  assert.equal(await isAdmin(studentId), true)
})
