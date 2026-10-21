import test from 'node:test';
import assert from 'node:assert/strict';
import { formatAdded, formatAvailability, isAvailableNow, pricePerBedroom, termBadge } from './listingBadges.js';

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

test('formats when a listing was added and flags new ones', () => {
  const now = new Date('2026-10-18T12:00:00Z');
  assert.deepEqual(
    { relative: formatAdded('2026-10-18T09:00:00Z', now).relative, isNew: formatAdded('2026-10-18T09:00:00Z', now).isNew },
    { relative: 'today', isNew: true }
  );
  assert.equal(formatAdded('2026-10-17T11:00:00Z', now).relative, 'yesterday');
  assert.equal(formatAdded('2026-10-12T12:00:00Z', now).relative, '6 days ago');
  assert.equal(formatAdded('2026-10-12T12:00:00Z', now).isNew, true);
  assert.equal(formatAdded('2026-10-11T12:00:00Z', now).isNew, false);
  assert.equal(formatAdded('2026-09-20T12:00:00Z', now).relative, '4 weeks ago');
  assert.equal(formatAdded('2026-03-14T12:00:00Z', now).relative, '7 months ago');
  assert.equal(formatAdded('2020-01-01T00:00:00Z', now).relative, '6 years ago');
  assert.equal(formatAdded(null, now), null);
  assert.equal(formatAdded('not a date', now), null);
});

test('availability uses one format and adds the year when it is not this year', () => {
  const today = '2026-10-21';
  assert.equal(formatAvailability('', '', today), 'Dates not listed');
  assert.equal(formatAvailability('2026-09-01', '', today), 'Available now');
  assert.equal(formatAvailability('2026-09-01', '2026-12-31', today), 'Available now to Dec 31');
  assert.equal(formatAvailability('2027-06-01', '', today), 'From Jun 1, 2027');
  assert.equal(formatAvailability('2026-11-15', '2026-12-20', today), 'Nov 15 to Dec 20');
});
