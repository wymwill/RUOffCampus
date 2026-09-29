import test from 'node:test';
import assert from 'node:assert/strict';
import { fitFilters } from './fitFilters.js';

const items = [
  { key: 'dates', width: 380 },
  { key: 'price', width: 240 },
  { key: 'beds', width: 110 },
  { key: 'campus', width: 140 },
];

test('everything fits on a wide screen', () => {
  assert.deepEqual(fitFilters(items, 2000), ['dates', 'price', 'beds', 'campus']);
});

test('drops the lowest priority filters first', () => {
  assert.deepEqual(fitFilters(items, 380 + 8 + 240 + 8 + 110), ['dates', 'price', 'beds']);
  assert.deepEqual(fitFilters(items, 380 + 8 + 240), ['dates', 'price']);
});

test('skips a filter that does not fit but keeps narrower later ones', () => {
  assert.deepEqual(fitFilters(items, 380 + 8 + 140), ['dates', 'beds']);
  assert.deepEqual(fitFilters(items, 300), ['price']);
});

test('nothing fits in a tiny space', () => {
  assert.deepEqual(fitFilters(items, 50), []);
});
