import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseEmbeddedListingData } from '../rutgersMarketplaceImporter.js'
import { marketplaceHtml } from './fixtures/rutgersMarketplace.js'

const listings = parseEmbeddedListingData(marketplaceHtml())
const byId = Object.fromEntries(listings.map((listing) => [listing.sourceListingId, listing]))

test('parses visible listings and skips hidden ones', () => {
  assert.equal(listings.length, 2)
  assert.ok(byId['70138'])
  assert.ok(byId['60760'])
  assert.equal(byId['99999'], undefined)
})

test('maps price, beds, baths, type, location and link', () => {
  const house = byId['70138']
  assert.equal(house.id, 'rutgers_off_campus:70138')
  assert.equal(house.price, 4800)
  assert.equal(house.priceLabel, '$4,800 - $5,200')
  assert.equal(house.beds, 5)
  assert.equal(house.baths, 2)
  assert.equal(house.propertyType, 'house')
  assert.equal(house.distance, 0.5)
  assert.equal(house.latitude, 40.5001)
  assert.equal(house.available_from, '2027-06-01')
  assert.equal(house.listedAt, new Date(1790000000 * 1000).toISOString())
  assert.equal(byId['60760'].listedAt, null)
  assert.equal(
    house.sourceUrl,
    'https://offcampushousing.rutgers.edu/city/new-brunswick-nj/listing/146-hamilton-st-new-brunswick-nj-08901-70138'
  )
})

test('fixes run-together addresses and decodes base64 HTML descriptions', () => {
  const house = byId['70138']
  assert.equal(house.address, '146 Hamilton St, New Brunswick, NJ 08901')
  assert.equal(house.title, '146 Hamilton St, New Brunswick, NJ 08901')
  assert.match(house.description, /Big house on Hamilton St & close to campus/)
  assert.doesNotMatch(house.description, /<|&amp;/)
})

test('builds full image URLs', () => {
  const house = byId['70138']
  assert.equal(
    house.image,
    'https://rcp-prod-uploads.s3.amazonaws.com/property_images/slider_images/2026-09/front.jpg'
  )
  assert.equal(house.images.length, 2)
})

test('"Ask" pricing becomes 0 with an Ask label', () => {
  const building = byId['60760']
  assert.equal(building.price, 0)
  assert.equal(building.priceLabel, 'Ask')
  assert.equal(building.propertyType, 'apartment')
  assert.equal(building.available_from, null)
})

test('infers amenities', () => {
  assert.equal(byId['70138'].amenities.Laundry, true)
  assert.equal(byId['70138'].amenities.Parking, false)
  assert.equal(byId['60760'].amenities.Parking, true)
})

test('returns [] when the page has no embedded data', () => {
  assert.deepEqual(parseEmbeddedListingData('<html><body>nothing here</body></html>'), [])
  assert.deepEqual(parseEmbeddedListingData('var listingData = JSON.parse(JSON.stringify({broken'), [])
})
