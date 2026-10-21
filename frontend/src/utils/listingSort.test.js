import test from 'node:test';
import assert from 'node:assert/strict';
import { interestScore, sortListings } from './listingSort.js';

const listings = [
  { id: 'old', created_at: '2025-01-01T00:00:00Z', interest: { saves: 1, messages: 2 } },
  { id: 'new', created_at: '2026-10-10T00:00:00Z', interest: { saves: 0, messages: 0 } },
  { id: 'mid', created_at: '2026-06-01T00:00:00Z', interest: { saves: 3, messages: 1 } },
  { id: 'undated', created_at: null },
];

test('newest first with undated listings last', () => {
  assert.deepEqual(sortListings(listings).map((l) => l.id), ['new', 'mid', 'old', 'undated']);
});

test('most requested first, newest breaks ties', () => {
  assert.deepEqual(sortListings(listings, 'popular').map((l) => l.id), ['mid', 'old', 'new', 'undated']);
});

test('interest score weights messages double', () => {
  assert.equal(interestScore(listings[0]), 5);
  assert.equal(interestScore({}), 0);
});

test('does not change the original array', () => {
  const copy = [...listings];
  sortListings(listings, 'popular');
  assert.deepEqual(listings, copy);
});

test('price sorts put listings without a price last', () => {
  const priced = [
    { id: 'a', price: 900 },
    { id: 'ask', price: 0 },
    { id: 'b', price: 1500 },
  ];
  assert.deepEqual(sortListings(priced, 'price-asc').map((l) => l.id), ['a', 'b', 'ask']);
  assert.deepEqual(sortListings(priced, 'price-desc').map((l) => l.id), ['b', 'a', 'ask']);
});

test('available soonest and closest to campus', () => {
  const dated = [
    { id: 'fall', available_from: '2027-09-01', distance: 0.2 },
    { id: 'now', available_from: '', distance: null },
    { id: 'summer', available_from: '2027-06-01', distance: 1.4 },
  ];
  assert.deepEqual(sortListings(dated, 'soonest').map((l) => l.id), ['now', 'summer', 'fall']);
  assert.deepEqual(sortListings(dated, 'closest').map((l) => l.id), ['fall', 'summer', 'now']);
});
