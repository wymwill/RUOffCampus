import test from 'node:test';
import assert from 'node:assert/strict';
import { computeHomeStats, pickFeatured } from './homeStats.js';

const PLACEHOLDER = 'placeholder.jpg';
const listings = [
  { id: 1, price: 900, campus: 'College Ave', image: 'a.jpg', nearestStop: { walkMinutes: 3 }, available_from: '2027-09-01' },
  { id: 2, price: 1500, campus: 'College Ave', image: PLACEHOLDER, nearestStop: { walkMinutes: 9 } },
  { id: 3, price: 0, campus: 'Busch', image: 'c.jpg', nearestStop: null },
  { id: 4, price: 1200, campus: 'Livingston', image: 'd.jpg', nearestStop: { walkMinutes: 5 }, available_from: '2027-01-10' },
];

test('computes totals, median rent and campus counts from listings', () => {
  const stats = computeHomeStats(listings, PLACEHOLDER);
  assert.equal(stats.total, 4);
  assert.equal(stats.nearTransit, 2);
  assert.equal(stats.medianRent, 1200);
  assert.deepEqual(stats.campuses['College Ave'], { count: 2, image: 'a.jpg' });
  assert.deepEqual(stats.campuses.Busch, { count: 1, image: 'c.jpg' });
  assert.deepEqual(stats.campuses['Cook/Douglass'], { count: 0, image: null });
});

test('median of an even count averages the middle two and handles no prices', () => {
  assert.equal(computeHomeStats([{ price: 1000 }, { price: 2000 }]).medianRent, 1500);
  assert.equal(computeHomeStats([{ price: 0 }]).medianRent, null);
});

test('features upcoming listings with photos and a price first', () => {
  const featured = pickFeatured(listings, 3, PLACEHOLDER, '2026-10-01');
  assert.deepEqual(featured.map((listing) => listing.id), [4, 1]);
});
