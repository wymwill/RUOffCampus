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

test('search and transit count as active bar filters', () => {
  const searched = createDefaultFilters();
  searched.search = 'Easton';
  assert.equal(hasActiveFilters(searched), true);
  assert.equal(countMoreFilters(searched), 0);

  const transit = createDefaultFilters();
  transit.nearTransit = true;
  assert.equal(hasActiveFilters(transit), true);

  const blank = createDefaultFilters();
  blank.search = '   ';
  assert.equal(hasActiveFilters(blank), false);
});

test('posted by counts as a more filter', () => {
  const filters = createDefaultFilters();
  assert.equal(filters.postedBy, 'all');
  filters.postedBy = 'rutgers';
  assert.equal(countMoreFilters(filters), 1);
  assert.equal(hasActiveFilters(filters), true);
});
