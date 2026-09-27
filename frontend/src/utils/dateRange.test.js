import test from 'node:test';
import assert from 'node:assert/strict';
import { listingMatchesDates } from './dateRange.js';

const summer = { available_from: '2027-05-15', available_to: '2027-08-15' };

test('no dates selected matches everything', () => {
  assert.equal(listingMatchesDates(summer, {}), true);
  assert.equal(listingMatchesDates({}, { moveIn: '', moveOut: '' }), true);
});

test('matches when the stay overlaps availability', () => {
  assert.equal(listingMatchesDates(summer, { moveIn: '2027-06-01', moveOut: '2027-08-01' }), true);
  assert.equal(listingMatchesDates(summer, { moveIn: '2027-05-01', moveOut: '2027-05-20' }), true);
  assert.equal(listingMatchesDates(summer, { moveIn: '2027-08-10', moveOut: '2027-09-01' }), true);
  assert.equal(listingMatchesDates(summer, { moveIn: '2027-08-15', moveOut: '2027-08-30' }), true);
});

test('rejects stays entirely before or after availability', () => {
  assert.equal(listingMatchesDates(summer, { moveIn: '2027-01-01', moveOut: '2027-05-14' }), false);
  assert.equal(listingMatchesDates(summer, { moveIn: '2027-08-16', moveOut: '2027-12-01' }), false);
});

test('works with only a move in or only a move out date', () => {
  assert.equal(listingMatchesDates(summer, { moveIn: '2027-09-01' }), false);
  assert.equal(listingMatchesDates(summer, { moveIn: '2027-07-01' }), true);
  assert.equal(listingMatchesDates(summer, { moveOut: '2027-05-01' }), false);
  assert.equal(listingMatchesDates(summer, { moveOut: '2027-06-01' }), true);
});

test('open ended availability is open on the missing side', () => {
  const fromOnly = { available_from: '2027-06-01' };
  assert.equal(listingMatchesDates(fromOnly, { moveIn: '2028-01-01', moveOut: '2028-02-01' }), true);
  assert.equal(listingMatchesDates(fromOnly, { moveIn: '2027-01-01', moveOut: '2027-05-01' }), false);
  const toOnly = { available_to: '2027-06-01' };
  assert.equal(listingMatchesDates(toOnly, { moveIn: '2027-07-01' }), false);
});

test('listings without dates follow includeUndated', () => {
  const stay = { moveIn: '2027-06-01', moveOut: '2027-08-01' };
  assert.equal(listingMatchesDates({}, { ...stay, includeUndated: true }), true);
  assert.equal(listingMatchesDates({ available_from: '' }, { ...stay, includeUndated: false }), false);
});

test('accepts timestamps by comparing the date part', () => {
  const listing = { available_from: '2027-05-15T00:00:00Z', available_to: '2027-08-15T00:00:00Z' };
  assert.equal(listingMatchesDates(listing, { moveIn: '2027-09-01' }), false);
});
