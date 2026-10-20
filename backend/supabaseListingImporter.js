import { supabaseAdmin } from './supabaseClient.js'

const VALID_CAMPUS_LOCATIONS = ['Busch', 'College Ave', 'Livingston', 'Cook/Douglass']

/**
 * Upsert imported listings into Supabase and remove rows from the same
 * source that no longer appear upstream. Requires SUPABASE_SERVICE_ROLE_KEY
 * (imported rows have no host, so RLS blocks normal users from writing them).
 */
export async function replaceImportedListingsInSupabase(source, listings, { fetchedAt } = {}) {
  requireAdmin()
  const importedAt = fetchedAt || new Date().toISOString()

  const rows = listings.map((listing) => toSupabaseRow(source, listing, importedAt))

  const { error: upsertError } = await supabaseAdmin
    .from('listings')
    .upsert(rows, { onConflict: 'source,source_listing_id' })

  if (upsertError) {
    throw new Error(`Supabase upsert failed: ${upsertError.message}`)
  }

  // Drop listings that disappeared from the source since the last sync.
  const { error: deleteError } = await supabaseAdmin
    .from('listings')
    .delete()
    .eq('source', source)
    .eq('is_imported', true)
    .lt('imported_at', importedAt)

  if (deleteError) {
    console.warn(`Could not prune stale imported listings: ${deleteError.message}`)
  }

  return { importedCount: rows.length, fetchedAt: importedAt }
}

export async function getSupabaseImportMetadata(source) {
  requireAdmin()

  const { count, error: countError } = await supabaseAdmin
    .from('listings')
    .select('id', { count: 'exact', head: true })
    .eq('source', source)
    .eq('is_imported', true)

  if (countError) throw new Error(countError.message)

  const { data, error } = await supabaseAdmin
    .from('listings')
    .select('imported_at')
    .eq('source', source)
    .eq('is_imported', true)
    .order('imported_at', { ascending: false })
    .limit(1)

  if (error) throw new Error(error.message)

  return {
    importedCount: count ?? 0,
    lastCount: count ?? 0,
    lastSyncedAt: data?.[0]?.imported_at ?? null,
  }
}

function requireAdmin() {
  if (!supabaseAdmin) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is required to import listings in Supabase mode.'
    )
  }
}

function toSupabaseRow(source, listing, importedAt) {
  const campus = VALID_CAMPUS_LOCATIONS.includes(listing.campus) ? listing.campus : null
  return {
    source,
    source_name: listing.sourceName || null,
    source_listing_id: String(listing.sourceListingId),
    source_url: listing.sourceUrl || null,
    is_imported: true,
    imported_at: importedAt,
    host_id: null,
    title: listing.title || 'Rutgers off-campus listing',
    description: listing.description || null,
    address: listing.address || null,
    price_monthly: Math.max(0, Math.round(Number(listing.price) || 0)),
    price_label: listing.priceLabel || null,
    campus_location: campus,
    beds: Math.max(0, Math.round(Number(listing.beds) || 0)),
    baths: Math.max(0, Number(listing.baths) || 0),
    property_type: listing.propertyType || null,
    distance: Number.isFinite(listing.distance) ? listing.distance : null,
    image_url: listing.image || null,
    images: Array.isArray(listing.images) ? listing.images : [],
    amenities: listing.amenities || {},
    latitude: Number.isFinite(listing.latitude) ? listing.latitude : null,
    longitude: Number.isFinite(listing.longitude) ? listing.longitude : null,
    available_from: listing.available_from || null,
    // When the listing was added to the Rutgers marketplace, not when we
    // imported it. Always sent because bulk upserts use one column list.
    created_at: listing.listedAt || null,
  }
}
