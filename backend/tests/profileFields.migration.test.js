// Profile fields migration adds the columns with sane limits.
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { createTestDatabase } from './pgHelpers.js'

let db
let userId

before(async () => {
  db = await createTestDatabase(['supabase/migrations/20261023120000_profile_fields.sql'])
  const user = await db.query(`insert into auth.users (email) values ('sam@scarletmail.rutgers.edu') returning id`)
  userId = user.rows[0].id
  await db.query(`insert into public.profiles (id) values ($1) on conflict (id) do nothing`, [userId])
})
after(async () => {
  await db.close()
})

test('profile fields can be saved', async () => {
  await db.query(
    `update public.profiles set name = 'Sam', bio = 'Hi', pronouns = 'they/them', class_year = 2027 where id = $1`,
    [userId]
  )
  const { rows } = await db.query('select name, bio, pronouns, class_year from public.profiles where id = $1', [userId])
  assert.deepEqual(rows[0], { name: 'Sam', bio: 'Hi', pronouns: 'they/them', class_year: 2027 })
})

test('limits are enforced in the database too', async () => {
  await assert.rejects(db.query(`update public.profiles set bio = repeat('x', 501) where id = $1`, [userId]), /profiles_bio_length/)
  await assert.rejects(db.query(`update public.profiles set class_year = 3000 where id = $1`, [userId]), /profiles_class_year_range/)
  await assert.rejects(db.query(`update public.profiles set name = repeat('x', 61) where id = $1`, [userId]), /profiles_name_length/)
})
