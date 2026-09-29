import fs from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { DatabaseSync } from 'node:sqlite'
import { withNearestStudentCenter } from './studentCenters.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DATA_DIR = path.join(__dirname, 'data')
// Tests set LOCAL_DB_PATH=:memory: so parallel test files don't share one file.
// Vercel's filesystem is read only, so fall back to memory there. The app
// uses Supabase in that case and only touches this database in local mode.
export const LOCAL_DB_PATH =
  process.env.LOCAL_DB_PATH || (process.env.VERCEL ? ':memory:' : path.join(DATA_DIR, 'listings.sqlite'))

if (LOCAL_DB_PATH !== ':memory:') {
  fs.mkdirSync(path.dirname(LOCAL_DB_PATH), { recursive: true })
}

const db = new DatabaseSync(LOCAL_DB_PATH)

db.exec(`
  PRAGMA journal_mode = WAL;

  CREATE TABLE IF NOT EXISTS local_listings (
    id TEXT PRIMARY KEY,
    source TEXT NOT NULL DEFAULT 'user',
    source_name TEXT,
    source_listing_id TEXT,
    source_url TEXT,
    title TEXT NOT NULL,
    description TEXT,
    address TEXT,
    price_monthly REAL,
    price_label TEXT,
    beds REAL,
    baths REAL,
    property_type TEXT,
    campus_location TEXT,
    distance REAL,
    available_from TEXT,
    available_to TEXT,
    landlord_phone TEXT,
    landlord_email TEXT,
    image_url TEXT,
    images_json TEXT NOT NULL DEFAULT '[]',
    amenities_json TEXT NOT NULL DEFAULT '{}',
    latitude REAL,
    longitude REAL,
    host_id TEXT,
    is_imported INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE UNIQUE INDEX IF NOT EXISTS local_listings_source_listing_idx
    ON local_listings (source, source_listing_id)
    WHERE source_listing_id IS NOT NULL;

  CREATE INDEX IF NOT EXISTS local_listings_created_at_idx
    ON local_listings (created_at DESC);

  CREATE TABLE IF NOT EXISTS local_app_state (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`)

// Databases created before listing status existed need the column added.
const localListingColumns = db.prepare('PRAGMA table_info(local_listings)').all()
if (!localListingColumns.some((column) => column.name === 'status')) {
  db.exec("ALTER TABLE local_listings ADD COLUMN status TEXT NOT NULL DEFAULT 'active'")
}

const selectAllListingsStatement = db.prepare(`
  SELECT * FROM local_listings
  ORDER BY
    CASE WHEN is_imported = 1 THEN 0 ELSE 1 END,
    datetime(created_at) DESC,
    title COLLATE NOCASE ASC
`)

const selectListingByIdStatement = db.prepare(`
  SELECT * FROM local_listings
  WHERE id = ?
`)

const insertListingStatement = db.prepare(`
  INSERT INTO local_listings (
    id,
    source,
    source_name,
    source_listing_id,
    source_url,
    title,
    description,
    address,
    price_monthly,
    price_label,
    beds,
    baths,
    property_type,
    campus_location,
    distance,
    available_from,
    available_to,
    landlord_phone,
    landlord_email,
    image_url,
    images_json,
    amenities_json,
    latitude,
    longitude,
    host_id,
    is_imported,
    status,
    created_at,
    updated_at
  ) VALUES (
    @id,
    @source,
    @source_name,
    @source_listing_id,
    @source_url,
    @title,
    @description,
    @address,
    @price_monthly,
    @price_label,
    @beds,
    @baths,
    @property_type,
    @campus_location,
    @distance,
    @available_from,
    @available_to,
    @landlord_phone,
    @landlord_email,
    @image_url,
    @images_json,
    @amenities_json,
    @latitude,
    @longitude,
    @host_id,
    @is_imported,
    @status,
    @created_at,
    @updated_at
  )
`)

const updateListingStatement = db.prepare(`
  UPDATE local_listings
  SET
    title = @title,
    description = @description,
    address = @address,
    price_monthly = @price_monthly,
    price_label = @price_label,
    beds = @beds,
    baths = @baths,
    property_type = @property_type,
    campus_location = @campus_location,
    distance = @distance,
    available_from = @available_from,
    available_to = @available_to,
    landlord_phone = @landlord_phone,
    landlord_email = @landlord_email,
    image_url = @image_url,
    images_json = @images_json,
    amenities_json = @amenities_json,
    latitude = @latitude,
    longitude = @longitude,
    source_name = @source_name,
    source_url = @source_url,
    status = @status,
    updated_at = @updated_at
  WHERE id = @id
`)

const deleteListingStatement = db.prepare(`
  DELETE FROM local_listings
  WHERE id = ?
`)

const deleteImportedListingsBySourceStatement = db.prepare(`
  DELETE FROM local_listings
  WHERE source = ?
    AND is_imported = 1
`)

const countListingsStatement = db.prepare(`
  SELECT COUNT(*) AS count FROM local_listings
`)

const countImportedListingsBySourceStatement = db.prepare(`
  SELECT COUNT(*) AS count
  FROM local_listings
  WHERE source = ?
    AND is_imported = 1
`)

const getAppStateStatement = db.prepare(`
  SELECT value FROM local_app_state
  WHERE key = ?
`)

const setAppStateStatement = db.prepare(`
  INSERT INTO local_app_state (key, value)
  VALUES (?, ?)
  ON CONFLICT(key) DO UPDATE SET value = excluded.value
`)

export function listLocalListings() {
  return selectAllListingsStatement.all().map((row) => withNearestStudentCenter(mapLocalRowToListing(row)))
}

export function getLocalListingById(id) {
  const row = selectListingByIdStatement.get(String(id))
  return row ? withNearestStudentCenter(mapLocalRowToListing(row)) : null
}

export function createLocalListing(input) {
  const record = normalizeLocalRecord(input, {
    id: input.id || `local:${randomUUID()}`,
    source: 'user',
    sourceName: 'Sublet Finder',
    sourceListingId: input.source_listing_id || null,
    sourceUrl: input.source_url || null,
    isImported: false,
    createdAt: input.created_at || new Date().toISOString(),
  })

  insertListingStatement.run(record)
  return getLocalListingById(record.id)
}

export function updateLocalListing(id, updates) {
  const existing = selectListingByIdStatement.get(String(id))
  if (!existing) return null

  const record = normalizeLocalRecord(
    { ...mapLocalRowToListing(existing), ...updates },
    {
      id: existing.id,
      source: existing.source,
      sourceName: existing.source_name,
      sourceListingId: existing.source_listing_id,
      sourceUrl: existing.source_url,
      isImported: Boolean(existing.is_imported),
      createdAt: existing.created_at,
    }
  )

  // The UPDATE statement rejects unknown named parameters, so drop the
  // columns it never changes.
  const { source, source_listing_id, host_id, is_imported, created_at, ...updatable } = record
  updateListingStatement.run(updatable)
  return getLocalListingById(record.id)
}

export function deleteLocalListing(id) {
  return deleteListingStatement.run(String(id))
}

export function replaceImportedListings(source, listings, metadata = {}) {
  db.exec('BEGIN')

  try {
    deleteImportedListingsBySourceStatement.run(source)

    for (const listing of listings) {
      const record = normalizeLocalRecord(listing, {
        id: listing.id || `${source}:${listing.sourceListingId || randomUUID()}`,
        source,
        sourceName: listing.sourceName,
        sourceListingId: listing.sourceListingId,
        sourceUrl: listing.sourceUrl,
        isImported: true,
        createdAt: metadata.fetchedAt || listing.created_at || new Date().toISOString(),
      })

      insertListingStatement.run(record)
    }

    const fetchedAt = metadata.fetchedAt || new Date().toISOString()
    setAppState(`import:${source}:last_synced_at`, fetchedAt)
    setAppState(`import:${source}:last_count`, String(listings.length))
    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}

export function getLocalListingCount() {
  return Number(countListingsStatement.get()?.count || 0)
}

export function getImportedListingCountBySource(source) {
  return Number(countImportedListingsBySourceStatement.get(source)?.count || 0)
}

export function getAppState(key) {
  return getAppStateStatement.get(key)?.value ?? null
}

export function setAppState(key, value) {
  setAppStateStatement.run(key, String(value))
}

export function getImportMetadata(source) {
  const lastSyncedAt = getAppState(`import:${source}:last_synced_at`)
  const lastCount = Number(getAppState(`import:${source}:last_count`) || 0)

  return {
    lastSyncedAt,
    lastCount,
    importedCount: getImportedListingCountBySource(source),
  }
}

function normalizeLocalRecord(input, defaults) {
  const createdAt = defaults.createdAt || new Date().toISOString()
  const updatedAt = new Date().toISOString()
  const images = normalizeImages(input.images, input.image, input.image_url)
  const priceLabel = normalizePriceLabel(input.priceLabel || input.price_label, input.price_monthly, input.price)

  return {
    id: String(defaults.id),
    source: defaults.source || 'user',
    source_name: defaults.sourceName || null,
    source_listing_id: defaults.sourceListingId || null,
    source_url: defaults.sourceUrl || null,
    title: input.title?.trim() || 'Untitled listing',
    description: input.description?.trim() || '',
    address: input.address?.trim() || '',
    price_monthly: toNullableNumber(input.price_monthly ?? input.price),
    price_label: priceLabel,
    beds: toNullableNumber(input.beds ?? input.bedrooms),
    baths: toNullableNumber(input.baths ?? input.bathrooms),
    property_type: input.property_type || input.propertyType || 'apartment',
    campus_location: input.campus_location || input.campus || null,
    distance: toNullableNumber(input.distance),
    available_from: input.available_from || null,
    available_to: input.available_to || null,
    landlord_phone: input.landlord_phone || input.landlordNum || null,
    landlord_email: input.landlord_email || input.landlordEmail || null,
    image_url: input.image_url || input.image || images[0]?.url || null,
    images_json: JSON.stringify(images),
    amenities_json: JSON.stringify(input.amenities || {}),
    latitude: toNullableNumber(input.latitude),
    longitude: toNullableNumber(input.longitude),
    host_id: input.host_id || input.hostId || null,
    is_imported: defaults.isImported ? 1 : 0,
    status: input.status || 'active',
    created_at: createdAt,
    updated_at: updatedAt,
  }
}

function mapLocalRowToListing(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description || '',
    address: row.address || '',
    price: toNullableNumber(row.price_monthly) ?? 0,
    priceLabel: row.price_label || '',
    beds: toNullableNumber(row.beds) ?? 0,
    baths: toNullableNumber(row.baths) ?? 0,
    propertyType: row.property_type || 'apartment',
    campus: row.campus_location || '',
    campus_location: row.campus_location || '',
    distance: toNullableNumber(row.distance),
    available_from: row.available_from || '',
    available_to: row.available_to || '',
    landlordNum: row.landlord_phone || '',
    landlordEmail: row.landlord_email || '',
    image: row.image_url || '',
    image_url: row.image_url || '',
    images: safeJsonParse(row.images_json, []),
    amenities: safeJsonParse(row.amenities_json, {}),
    latitude: toNullableNumber(row.latitude),
    longitude: toNullableNumber(row.longitude),
    host_id: row.host_id || null,
    source: row.source,
    sourceName: row.source_name || '',
    sourceUrl: row.source_url || '',
    isImported: Boolean(row.is_imported),
    status: row.status || 'active',
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

function normalizeImages(images, image, imageUrl) {
  if (Array.isArray(images) && images.length > 0) {
    return images
      .filter(Boolean)
      .map((entry, index) => {
        if (typeof entry === 'string') {
          const trimmed = entry.trim()
          if (!trimmed) return null
          return {
            id: `image-${index}`,
            name: `Image ${index + 1}`,
            url: trimmed,
          }
        }

        if (typeof entry === 'object' && typeof entry.url === 'string') {
          return {
            id: entry.id || `image-${index}`,
            name: entry.name || `Image ${index + 1}`,
            url: entry.url.trim(),
          }
        }

        return null
      })
      .filter(Boolean)
  }

  const fallbackUrl = imageUrl || image
  if (!fallbackUrl) return []

  return [
    {
      id: 'image-0',
      name: 'Primary image',
      url: String(fallbackUrl).trim(),
    },
  ]
}

function normalizePriceLabel(priceLabel, priceMonthly, price) {
  if (typeof priceLabel === 'string' && priceLabel.trim()) {
    return priceLabel.trim()
  }

  const numericPrice = toNullableNumber(priceMonthly ?? price)
  return numericPrice != null ? `$${numericPrice}` : ''
}

function toNullableNumber(value) {
  if (value == null || value === '') return null

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function safeJsonParse(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback
  } catch {
    return fallback
  }
}
