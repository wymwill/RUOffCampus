import { Router } from 'express'
import { supabase, isSupabaseConfigured, createSupabaseClientWithToken } from '../supabaseClient.js'
import { requireSupabaseUser } from '../middleware/requireSupabaseUser.js'
import {
  createLocalListing,
  deleteLocalListing,
  getLocalListingById,
  listLocalListings,
  updateLocalListing,
} from '../localDatabase.js'
import {
  RUTGERS_SOURCE,
  getRutgersImportMetadata,
  syncRutgersMarketplaceListings,
} from '../rutgersMarketplaceImporter.js'

const router = Router()
const VALID_CAMPUS_LOCATIONS = ['Busch', 'College Ave', 'Livingston', 'Cook/Douglass']

// Fields a host may change on their own listing. Ownership and import
// metadata (host_id, source, is_imported, ...) are never taken from the body.
const EDITABLE_LISTING_FIELDS = [
  'title',
  'description',
  'address',
  'price_monthly',
  'price_label',
  'campus_location',
  'beds',
  'baths',
  'property_type',
  'distance',
  'image_url',
  'images',
  'amenities',
  'available_from',
  'available_to',
  'landlord_phone',
  'landlord_email',
  'latitude',
  'longitude',
]

function pickEditableFields(body = {}) {
  const updates = {}
  for (const field of EDITABLE_LISTING_FIELDS) {
    if (body[field] !== undefined) updates[field] = body[field]
  }
  return updates
}

function validateListingUpdates(updates) {
  if (Object.keys(updates).length === 0) return 'No updatable fields provided'
  if ('title' in updates && !String(updates.title ?? '').trim()) return 'Title cannot be empty'
  if ('price_monthly' in updates && !(Number(updates.price_monthly) > 0)) {
    return 'price_monthly must be a positive number'
  }
  if (updates.campus_location && !VALID_CAMPUS_LOCATIONS.includes(updates.campus_location)) {
    return `campus_location must be one of: ${VALID_CAMPUS_LOCATIONS.join(', ')}`
  }
  return null
}

// Local mode has no auth, so the caller names itself with host_id (the same
// field used on create). Imported listings have no host and stay read only.
function localOwnershipError(existing, req) {
  if (existing.isImported) return 'Imported listings cannot be changed.'
  const requesterId = req.body?.host_id ?? req.query.host_id
  if (!requesterId || String(existing.host_id) !== String(requesterId)) {
    return 'You can only change your own listings.'
  }
  return null
}

function mapSupabaseListingRow(data) {
  return {
    id: data.id,
    title: data.title,
    address: data.address || '',
    description: data.description || '',
    price: data.price_monthly,
    priceLabel: data.price_label || (data.price_monthly ? `$${data.price_monthly}` : ''),
    beds: data.beds,
    baths: data.baths ?? 0,
    propertyType: data.property_type,
    distance: data.distance,
    amenities: data.amenities || {},
    campus: data.campus_location || '',
    campus_location: data.campus_location || '',
    available_from: data.available_from || '',
    available_to: data.available_to || '',
    landlordNum: data.landlord_phone || '',
    landlordEmail: data.landlord_email || '',
    latitude: toNullableNumber(data.latitude),
    longitude: toNullableNumber(data.longitude),
    image: data.image_url || '',
    image_url: data.image_url || '',
    images: Array.isArray(data.images) ? data.images : [data.image_url].filter(Boolean),
    source: data.is_imported ? data.source : 'supabase',
    sourceName: data.is_imported ? data.source_name || '' : 'Supabase',
    sourceUrl: data.source_url || '',
    isImported: Boolean(data.is_imported),
    created_at: data.created_at,
    host_id: data.host_id,
  }
}

function filterListings(listings, query) {
  const minPrice = toNullableNumber(query.min_price)
  const maxPrice = toNullableNumber(query.max_price)
  const beds = toNullableNumber(query.beds)
  const propertyType = query.property_type?.toLowerCase()
  const campus = query.campus?.toLowerCase()

  return listings.filter((listing) => {
    const listingPrice = Number(listing.price ?? 0)
    const listingBeds = Number(listing.beds ?? 0)
    const listingCampus = String(listing.campus || listing.campus_location || '').toLowerCase()
    const listingPropertyType = String(listing.propertyType || '').toLowerCase()

    if (minPrice != null && listingPrice < minPrice) return false
    if (maxPrice != null && listingPrice > maxPrice) return false
    if (beds != null && listingBeds !== beds) return false
    if (propertyType && listingPropertyType !== propertyType) return false
    if (campus && !listingCampus.includes(campus)) return false

    return true
  })
}

router.get('/import-status', async (req, res) => {
  try {
    res.json({
      mode: isSupabaseConfigured ? 'supabase' : 'local-sqlite',
      source: RUTGERS_SOURCE,
      ...(await getRutgersImportMetadata()),
    })
  } catch (error) {
    res.status(500).json({ error: error.message || 'Could not read import status.' })
  }
})

// In Supabase (production) mode, triggering a re-scrape requires
// the IMPORT_ADMIN_TOKEN header so random visitors can't spam the Rutgers site.
function requireImportAdmin(req, res, next) {
  if (!isSupabaseConfigured) return next()
  const expected = process.env.IMPORT_ADMIN_TOKEN
  if (!expected) {
    return res.status(403).json({ error: 'Set IMPORT_ADMIN_TOKEN to trigger imports in Supabase mode.' })
  }
  if (req.headers['x-import-token'] !== expected) {
    return res.status(401).json({ error: 'Invalid import token.' })
  }
  next()
}

router.post('/import-external', requireImportAdmin, async (req, res) => {
  try {
    const result = await syncRutgersMarketplaceListings({ force: true })
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: error.message || 'Could not import Rutgers listings.' })
  }
})

// POST /favorites - Add a listing to the authenticated user's favorites
router.post('/favorites', requireSupabaseUser, async (req, res) => {
  try {
    const { listing_id } = req.body
    const user_id = req.user?.id

    if (!listing_id) {
      return res.status(400).json({ error: 'listing_id is required' })
    }

    if (!user_id) {
      return res.status(401).json({ error: 'Authorization required.' })
    }

    const accessToken =
      req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.slice(7)
        : null

    const authenticatedSupabase = createSupabaseClientWithToken(accessToken)

    const { data, error } = await authenticatedSupabase
      .from('favorites')
      .insert({
        listing_id,
        user_id,
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return res.status(409).json({ error: 'Listing already in favorites' })
      }
      return res.status(400).json({ error: error.message })
    }

    res.status(201).json(data)
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /favorites - Get all favorites for the authenticated user
router.get('/favorites', requireSupabaseUser, async (req, res) => {
  try {
    const user_id = req.user?.id

    if (!user_id) {
      return res.status(401).json({ error: 'Authorization required.' })
    }

    const accessToken =
      req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.slice(7)
        : null

    const authenticatedSupabase = createSupabaseClientWithToken(accessToken)

    const { data, error } = await authenticatedSupabase
      .from('favorites')
      .select(`
        *,
        listings (*)
      `)
      .eq('user_id', user_id)

    if (error) return res.status(400).json({ error: error.message })

    const mappedFavorites = data.map((favorite) => ({
      id: favorite.id,
      user_id: favorite.user_id,
      listing_id: favorite.listing_id,
      created_at: favorite.created_at,
      listing: favorite.listings ? {
        id: favorite.listings.id,
        title: favorite.listings.title,
        price: favorite.listings.price_monthly,
        beds: favorite.listings.beds,
        propertyType: favorite.listings.property_type,
        distance: favorite.listings.distance,
        amenities: favorite.listings.amenities || {},
        campus_location: favorite.listings.campus_location,
        description: favorite.listings.description,
        image_url: favorite.listings.image_url,
      } : null,
    }))

    res.json(mappedFavorites)
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.delete('/favorites/:listingId', requireSupabaseUser, async (req, res) => {
  try {
    const user_id = req.user?.id

    if (!user_id) {
      return res.status(401).json({ error: 'Authorization required.' })
    }

    const accessToken =
      req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.slice(7)
        : null

    const authenticatedSupabase = createSupabaseClientWithToken(accessToken)

    const { error } = await authenticatedSupabase
      .from('favorites')
      .delete()
      .eq('user_id', user_id)
      .eq('listing_id', req.params.listingId)

    if (error) return res.status(400).json({ error: error.message })
    res.status(204).send()
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/', async (req, res) => {
  try {
    if (!isSupabaseConfigured) {
      return res.json(filterListings(listLocalListings(), req.query))
    }

    let query = supabase.from('listings').select('*')

    if (req.query.campus) {
      query = query.ilike('campus_location', `%${req.query.campus}%`)
    }
    if (req.query.min_price) {
      query = query.gte('price_monthly', Number(req.query.min_price))
    }
    if (req.query.max_price) {
      query = query.lte('price_monthly', Number(req.query.max_price))
    }
    if (req.query.beds) {
      query = query.eq('beds', Number(req.query.beds))
    }
    if (req.query.property_type) {
      query = query.eq('property_type', req.query.property_type)
    }

    query = query.order('created_at', { ascending: false })

    const { data, error } = await query

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    res.json(data.map(mapSupabaseListingRow))
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    if (!isSupabaseConfigured) {
      const listing = getLocalListingById(req.params.id)
      return listing
        ? res.json(listing)
        : res.status(404).json({ error: 'Listing not found' })
    }

    const { data, error } = await supabase
      .from('listings')
      .select('*')
      .eq('id', req.params.id)
      .single()

    if (error) return res.status(404).json({ error: 'Listing not found' })
    res.json(mapSupabaseListingRow(data))
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/', requireSupabaseUser, async (req, res) => {
  try {
    const {
      title,
      description,
      address,
      price_monthly,
      price_label,
      campus_location,
      beds,
      baths,
      property_type,
      distance,
      image_url,
      images,
      amenities,
      available_from,
      available_to,
      landlord_phone,
      landlord_email,
      latitude,
      longitude,
      host_id: host_id_body,
    } = req.body

    const host_id = isSupabaseConfigured
      ? req.user?.id
      : host_id_body || 'local-guest'

    if (!title || !price_monthly) {
      return res.status(400).json({ error: 'Title and price_monthly are required' })
    }

    if (Number(price_monthly) <= 0) {
      return res.status(400).json({ error: 'price_monthly must be a positive number' })
    }

    if (campus_location && !VALID_CAMPUS_LOCATIONS.includes(campus_location)) {
      return res.status(400).json({
        error: `campus_location must be one of: ${VALID_CAMPUS_LOCATIONS.join(', ')}`,
      })
    }

    if (!isSupabaseConfigured) {
      const created = createLocalListing({
        title,
        description,
        address,
        price_monthly,
        price_label,
        campus_location,
        beds,
        baths,
        property_type,
        distance,
        image_url,
        images,
        amenities,
        available_from,
        available_to,
        landlord_phone,
        landlord_email,
        latitude,
        longitude,
        host_id,
      })

      return res.status(201).json(created)
    }

    const accessToken =
      req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.slice(7)
        : null

    const authenticatedSupabase = createSupabaseClientWithToken(accessToken)

    const { data, error } = await authenticatedSupabase
      .from('listings')
      .insert({
        title,
        description,
        address,
        price_monthly,
        price_label,
        campus_location,
        beds,
        baths,
        property_type,
        distance,
        image_url,
        images,
        amenities,
        available_from,
        available_to,
        landlord_phone,
        landlord_email,
        latitude,
        longitude,
        host_id,
      })
      .select()
      .single()

    if (error) {
      console.error('POST /listings insert error:', error)
      return res.status(400).json({ error: error.message })
    }

    if (!data) {
      return res.status(500).json({ error: 'Listing insert did not return a row.' })
    }

    res.status(201).json(mapSupabaseListingRow(data))
  } catch (err) {
    console.error('POST /listings unexpected error:', err)
    res.status(500).json({ error: err?.message || 'Internal server error' })
  }
})

router.put('/:id', requireSupabaseUser, async (req, res) => {
  try {
    const id = req.params.id

    if (!isSupabaseConfigured) {
      const existing = getLocalListingById(id)
      if (!existing) {
        return res.status(404).json({ error: 'Listing not found' })
      }

      const ownershipError = localOwnershipError(existing, req)
      if (ownershipError) {
        return res.status(403).json({ error: ownershipError })
      }

      const updates = pickEditableFields(req.body)
      const validationError = validateListingUpdates(updates)
      if (validationError) {
        return res.status(400).json({ error: validationError })
      }

      const updated = updateLocalListing(id, updates)
      return res.json(updated)
    }

    const { data: existing, error: fetchErr } = await supabase
      .from('listings')
      .select('host_id')
      .eq('id', id)
      .single()

    if (fetchErr || !existing) {
      return res.status(404).json({ error: 'Listing not found' })
    }

    if (String(existing.host_id) !== String(req.user.id)) {
      return res.status(403).json({ error: 'You can only edit your own listings.' })
    }

    const updates = pickEditableFields(req.body)
    const validationError = validateListingUpdates(updates)
    if (validationError) {
      return res.status(400).json({ error: validationError })
    }

    const accessToken =
      req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.slice(7)
        : null

    const authenticatedSupabase = createSupabaseClientWithToken(accessToken)

    const { data, error } = await authenticatedSupabase
      .from('listings')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) return res.status(400).json({ error: error.message })

    res.json(mapSupabaseListingRow(data))
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.delete('/:id', requireSupabaseUser, async (req, res) => {
  try {
    const id = req.params.id

    if (!isSupabaseConfigured) {
      const existing = getLocalListingById(id)
      if (!existing) {
        return res.status(404).json({ error: 'Listing not found' })
      }

      const ownershipError = localOwnershipError(existing, req)
      if (ownershipError) {
        return res.status(403).json({ error: ownershipError })
      }

      deleteLocalListing(id)
      return res.status(204).send()
    }

    const { data: existing, error: fetchErr } = await supabase
      .from('listings')
      .select('host_id')
      .eq('id', id)
      .single()

    if (fetchErr || !existing) {
      return res.status(404).json({ error: 'Listing not found' })
    }

    if (String(existing.host_id) !== String(req.user.id)) {
      return res.status(403).json({ error: 'You can only delete your own listings.' })
    }

    const accessToken =
      req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.slice(7)
        : null

    const authenticatedSupabase = createSupabaseClientWithToken(accessToken)

    const { error } = await authenticatedSupabase.from('listings').delete().eq('id', id)

    if (error) return res.status(400).json({ error: error.message })
    res.status(204).send()
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' })
  }
})

function toNullableNumber(value) {
  if (value == null || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export default router
