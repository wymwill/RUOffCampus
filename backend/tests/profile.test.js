// Profile updates only take the editable fields, within their limits.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mapProfile, parseProfileUpdates } from '../routes/profile.js'

test('editable fields are trimmed and renamed to columns', () => {
  const { updates } = parseProfileUpdates({
    name: '  Sam Lee ',
    pronouns: 'they/them',
    bio: 'Junior in CS',
    classYear: '2027',
    avatarUrl: 'data:image/jpeg;base64,abc',
  })
  assert.deepEqual(updates, {
    name: 'Sam Lee',
    pronouns: 'they/them',
    bio: 'Junior in CS',
    class_year: 2027,
    avatar_url: 'data:image/jpeg;base64,abc',
  })
})

test('trusted fields in the body are ignored', () => {
  const { updates } = parseProfileUpdates({
    name: 'Sam',
    is_admin: true,
    isAdmin: true,
    is_rutgers: true,
    email: 'someone@rutgers.edu',
    id: 'other',
  })
  assert.deepEqual(updates, { name: 'Sam' })
})

test('blank values clear a field', () => {
  assert.deepEqual(parseProfileUpdates({ bio: '   ', classYear: '', avatarUrl: '' }).updates, {
    bio: null,
    class_year: null,
    avatar_url: null,
  })
})

test('values outside the limits are rejected', () => {
  assert.match(parseProfileUpdates({ name: 'x'.repeat(61) }).error, /name/)
  assert.match(parseProfileUpdates({ bio: 'x'.repeat(501) }).error, /bio/)
  assert.match(parseProfileUpdates({ classYear: 3000 }).error, /classYear/)
  assert.match(parseProfileUpdates({ classYear: 2026.5 }).error, /classYear/)
  assert.match(parseProfileUpdates({ avatarUrl: 'javascript:alert(1)' }).error, /image/)
  assert.match(parseProfileUpdates({ avatarUrl: `data:image/png;base64,${'a'.repeat(200001)}` }).error, /too large/)
  assert.match(parseProfileUpdates({}).error, /No profile fields/)
})

test('profiles from before the new columns still map', () => {
  const profile = mapProfile({ id: 'u1', email: 'a@b.co' }, { id: 'u1', email: 'a@b.co' })
  assert.equal(profile.bio, '')
  assert.equal(profile.classYear, null)
  assert.equal(profile.isAdmin, false)
})
