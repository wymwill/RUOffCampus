// Minimal stand-in for https://offcampushousing.rutgers.edu/listing, which
// embeds listings as `var listingData = JSON.parse(JSON.stringify({...}))`.
const description = Buffer.from('<p>Big house on <b>Hamilton St</b> &amp; close to campus. Laundry in unit.</p>').toString('base64')

export const LISTING_RECORDS = {
  70138: {
    id: 70138,
    hidden: '0',
    title: '146 Hamilton StNew Brunswick, NJ 08901',
    address: '146 Hamilton StNew Brunswick, NJ 08901',
    slug: '146-hamilton-st-new-brunswick-nj-08901-70138',
    category_title: 'House',
    description,
    min_rent: 4800,
    max_rent: 5200,
    min_bed: '5',
    min_bath: '2',
    per_person_property: false,
    hide_pricing: false,
    distance: '6 mins',
    list_view_distance: 'walk',
    lat: '40.5001',
    lng: '-74.4501',
    date: '2027-06-01',
    prop_created: 1790000000,
    featured_image: '2026-09/front.jpg',
    images: ['2026-09/front.jpg', '2026-09/kitchen.jpg'],
    laundry_allowed: true,
    parking_allowed: false,
    pets_allowed: false,
    property_features: { parking: 0, 'pets-allowed': 0 },
    features: { 'Unit Features': ['Dishwasher'] },
    listingFeatures: ['Laundry In Unit'],
  },
  60760: {
    id: 60760,
    hidden: '0',
    title: '130 Easton',
    address: '130 Easton Ave, New Brunswick, NJ 08901',
    slug: '130-easton-60760',
    category_title: 'Apartment Building',
    description: '',
    min_rent: 'Ask',
    max_rent: null,
    min_bed: '0',
    min_bath: '1',
    distance: '7 mins',
    list_view_distance: 'walk',
    lat: '40.4991',
    lng: '-74.4527',
    date: '',
    featured_image: '2025-09/lobby.jpg',
    images: [],
    parking_allowed: true,
  },
  99999: {
    id: 99999,
    hidden: '1',
    title: 'Hidden listing',
    slug: 'hidden-99999',
  },
}

export function marketplaceHtml(records = LISTING_RECORDS) {
  return `<!doctype html><html><head><title>Rutgers University | Off-Campus Housing Marketplace</title></head>
<body><div id="app"></div>
<script>
        var listingData = JSON.parse(JSON.stringify(${JSON.stringify(records)}));
        const hiddenPriceLabelText = "Ask for price";
</script></body></html>`
}

// Stub global fetch: serve the fixture for the Rutgers page, delegate the rest.
export function stubRutgersFetch(html = marketplaceHtml(), passthrough = globalThis.fetch) {
  const original = globalThis.fetch
  globalThis.fetch = async (url, options) => {
    if (String(url).startsWith('https://offcampushousing.rutgers.edu/')) {
      return new Response(html, { status: 200, headers: { 'content-type': 'text/html' } })
    }
    return passthrough(url, options)
  }
  return () => {
    globalThis.fetch = original
  }
}
