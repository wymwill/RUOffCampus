import { test } from 'node:test'
import assert from 'node:assert/strict'
import { nearestStudentCenter, withNearestStudentCenter } from '../studentCenters.js'

test('a listing on Easton Ave is nearest the College Avenue Student Center', () => {
  // 100 Easton Ave, New Brunswick
  const nearest = nearestStudentCenter(40.4987, -74.4486)
  assert.equal(nearest.campus, 'College Ave')
  assert.equal(nearest.studentCenter, 'College Avenue Student Center')
  assert.ok(nearest.distance > 0 && nearest.distance < 0.5, `distance ${nearest.distance}`)
})

test('each campus wins near its own student center', () => {
  assert.equal(nearestStudentCenter(40.5236, -74.4585).campus, 'Busch')
  assert.equal(nearestStudentCenter(40.5240, -74.4370).campus, 'Livingston')
  assert.equal(nearestStudentCenter(40.4792, -74.4316).studentCenter, 'Cook Student Center')
  assert.equal(nearestStudentCenter(40.4850, -74.4370).studentCenter, 'Douglass Student Center')
  assert.equal(nearestStudentCenter(40.4850, -74.4370).campus, 'Cook/Douglass')
})

test('distance is 0 at the student center and grows with distance', () => {
  assert.equal(nearestStudentCenter(40.502632, -74.452505).distance, 0)
  // About one mile north of the Busch Student Center
  const far = nearestStudentCenter(40.53783, -74.458861)
  assert.equal(far.campus, 'Busch')
  assert.ok(Math.abs(far.distance - 1) < 0.05, `distance ${far.distance}`)
})

test('missing or invalid coordinates return null', () => {
  assert.equal(nearestStudentCenter(null, -74.45), null)
  assert.equal(nearestStudentCenter('', ''), null)
  assert.equal(nearestStudentCenter('abc', -74.45), null)
})

test('withNearestStudentCenter overrides campus and distance only when coordinates exist', () => {
  const located = withNearestStudentCenter({ latitude: 40.5236, longitude: -74.4585, campus: '', distance: 3 })
  assert.equal(located.campus, 'Busch')
  assert.equal(located.campus_location, 'Busch')
  assert.equal(located.nearestStudentCenter, 'Busch Student Center')
  assert.ok(located.distance < 0.1)

  const unlocated = withNearestStudentCenter({ latitude: null, longitude: null, campus: 'Busch', distance: 0.4 })
  assert.equal(unlocated.campus, 'Busch')
  assert.equal(unlocated.distance, 0.4)
  assert.equal(unlocated.nearestStudentCenter, null)
})
