import test from 'node:test';
import assert from 'node:assert/strict';
import { findNearestStop } from './transit.js';

const stops = [
  { name: 'Scott Hall', lat: 40.4994, lng: -74.4479 },
  { name: 'Busch Student Center', lat: 40.5233, lng: -74.4589 },
];

test('picks the nearest stop and estimates a walk time', () => {
  const nearest = findNearestStop(40.4987, -74.4486, stops);
  assert.equal(nearest.name, 'Scott Hall');
  assert.ok(nearest.walkMinutes >= 1 && nearest.walkMinutes <= 3, `walk ${nearest.walkMinutes}`);
});

test('about a mile away is roughly 25 minutes', () => {
  const nearest = findNearestStop(40.5378, -74.4589, stops);
  assert.equal(nearest.name, 'Busch Student Center');
  assert.ok(Math.abs(nearest.walkMinutes - 25) <= 1, `walk ${nearest.walkMinutes}`);
});

test('returns null without coordinates or stops', () => {
  assert.equal(findNearestStop(null, -74.44, stops), null);
  assert.equal(findNearestStop('x', -74.44, stops), null);
  assert.equal(findNearestStop(40.5, -74.44, []), null);
});
