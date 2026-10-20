import { test } from 'node:test'
import assert from 'node:assert/strict'
import { pickHotListings, scoreListingInterest } from '../listingInterest.js'

test('messages count double and saves count once', () => {
  const interest = scoreListingInterest({
    favorites: [{ listing_id: 'a' }, { listing_id: 'a' }, { listing_id: 'b' }],
    conversations: [{ listing_id: 'a' }, { listing_id: 'c' }, { listing_id: null }],
  })
  assert.deepEqual(interest.get('a'), { saves: 2, messages: 1, score: 4 })
  assert.deepEqual(interest.get('b'), { saves: 1, messages: 0, score: 1 })
  assert.deepEqual(interest.get('c'), { saves: 0, messages: 1, score: 2 })
  assert.equal(interest.size, 3)
})

test('HOT needs a minimum score and keeps only the top listings', () => {
  const interest = new Map([
    ['a', { score: 9 }],
    ['b', { score: 3 }],
    ['c', { score: 2 }],
    ['d', { score: 5 }],
  ])
  assert.deepEqual([...pickHotListings(interest, { minScore: 3, maxHot: 10 })], ['a', 'd', 'b'])
  assert.deepEqual([...pickHotListings(interest, { minScore: 3, maxHot: 2 })], ['a', 'd'])
  assert.equal(pickHotListings(new Map(), {}).size, 0)
})
