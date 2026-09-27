import test from 'node:test';
import assert from 'node:assert/strict';
import { listingToFormData } from './listingForm.js';

test('loads an API listing into form fields', () => {
  const form = listingToFormData({
    title: 'Summer room',
    address: '10 Easton Ave',
    price: 950,
    beds: 1,
    baths: 1.5,
    propertyType: 'Apartment',
    available_from: '2027-05-15',
    available_to: '2027-08-15T00:00:00Z',
    landlordNum: '732-555-0100',
    landlordEmail: 'host@scarletmail.rutgers.edu',
    description: 'Sunny room near the Yard.\n\n— Contact —\nPhone: 732-555-0100\nEmail: host@scarletmail.rutgers.edu',
    images: [{ id: 'a', name: 'front', url: 'https://example.com/a.jpg' }, 'https://example.com/b.jpg'],
    amenities: { Parking: true, laundry: true },
  });

  assert.equal(form.price, '950');
  assert.equal(form.beds, '1');
  assert.equal(form.baths, '1.5');
  assert.equal(form.propertyType, 'apartment');
  assert.equal(form.available_to, '2027-08-15');
  assert.equal(form.description, 'Sunny room near the Yard.');
  assert.deepEqual(form.images.map((image) => image.url), ['https://example.com/a.jpg', 'https://example.com/b.jpg']);
  assert.deepEqual(form.amenities, { Parking: true, Laundry: true, Pet_Friendly: false, Furnished: false });
});

test('handles missing fields and zero price', () => {
  const form = listingToFormData({ price: 0, image_url: 'https://example.com/c.jpg' });
  assert.equal(form.title, '');
  assert.equal(form.price, '');
  assert.equal(form.description, '');
  assert.deepEqual(form.images.map((image) => image.url), ['https://example.com/c.jpg']);
});
