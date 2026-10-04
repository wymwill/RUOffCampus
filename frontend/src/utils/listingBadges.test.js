import test from 'node:test';
import assert from 'node:assert/strict';
import { isAvailableNow, pricePerBedroom, termBadge } from './listingBadges.js';

const TODAY = '2026-08-15';

test('maps an upcoming start month to a term', () => {
  assert.equal(termBadge('2027-01-15', TODAY), "Spring '27");
  assert.equal(termBadge('2027-05-01', TODAY), "Summer '27");
  assert.equal(termBadge('2026-09-01T00:00:00Z', TODAY), "Fall '26");
  assert.equal(termBadge('', TODAY), null);
  assert.equal(termBadge(null, TODAY), null);
});

test('past start dates are available now with no term badge', () => {
  assert.equal(termBadge('2024-06-24', TODAY), null);
  assert.equal(isAvailableNow('2024-06-24', TODAY), true);
  assert.equal(isAvailableNow('2026-08-15', TODAY), true);
  assert.equal(isAvailableNow('2026-08-16', TODAY), false);
  assert.equal(isAvailableNow('', TODAY), false);
});

test('splits whole unit prices across bedrooms', () => {
  assert.equal(pricePerBedroom({ price: 3962, beds: 4, priceLabel: '$3962' }), '$991 / bedroom');
  assert.equal(pricePerBedroom({ price: 950, beds: 1 }), null);
  assert.equal(pricePerBedroom({ price: 875, beds: 4, priceLabel: '$875 /person' }), null);
  assert.equal(pricePerBedroom({ price: 1650, beds: 3, priceLabel: '$1,650 - $3,300' }), null);
  assert.equal(pricePerBedroom({ price: 0, beds: 3 }), null);
});
