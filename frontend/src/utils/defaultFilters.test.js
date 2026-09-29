import test from 'node:test';
import assert from 'node:assert/strict';
import { countMoreFilters, createDefaultFilters, hasActiveFilters } from './defaultFilters.js';

test('defaults have no active filters', () => {
  const filters = createDefaultFilters();
  assert.equal(countMoreFilters(filters), 0);
  assert.equal(hasActiveFilters(filters), false);
});

test('counts property type, amenities and hidden undated listings as more filters', () => {
  const filters = createDefaultFilters();
  filters.propertyType = 'house';
  filters.amenities.Parking = true;
  filters.amenities.Laundry = true;
  filters.dates.includeUndated = false;
  assert.equal(countMoreFilters(filters), 4);
  assert.equal(hasActiveFilters(filters), true);
});

test('bar filters are active but not counted as more filters', () => {
  for (const change of [
    (f) => { f.beds = 2; },
    (f) => { f.campus = 'Busch'; },
    (f) => { f.price = [500, null]; },
    (f) => { f.price = [0, 1200]; },
    (f) => { f.dates.moveIn = '2027-06-01'; },
  ]) {
    const filters = createDefaultFilters();
    change(filters);
    assert.equal(countMoreFilters(filters), 0);
    assert.equal(hasActiveFilters(filters), true);
  }
});
