/**
 * "HOT" listings: the ones students have shown the most interest in lately.
 *
 * Interest over the last WINDOW_DAYS days:
 *   - a conversation started about the listing (a request) counts 2
 *   - a save to favorites counts 1
 * A listing is HOT when its score is at least MIN_SCORE and it is among the
 * MAX_HOT highest scores. Favorites and conversations are private per user,
 * so this needs the service role client and only exposes counts.
 */
export const WINDOW_DAYS = 14
export const MIN_SCORE = 3
export const MAX_HOT = 10
const CACHE_MS = 5 * 60 * 1000

export function scoreListingInterest({ favorites = [], conversations = [] }) {
  const interest = new Map()
  const entry = (id) => {
    const key = String(id)
    if (!interest.has(key)) interest.set(key, { saves: 0, messages: 0, score: 0 })
    return interest.get(key)
  }
  for (const row of favorites) {
    if (row.listing_id == null) continue
    const item = entry(row.listing_id)
    item.saves += 1
    item.score += 1
  }
  for (const row of conversations) {
    if (row.listing_id == null) continue
    const item = entry(row.listing_id)
    item.messages += 1
    item.score += 2
  }
  return interest
}

export function pickHotListings(interest, { minScore = MIN_SCORE, maxHot = MAX_HOT } = {}) {
  const ranked = [...interest.entries()]
    .filter(([, item]) => item.score >= minScore)
    .sort((a, b) => b[1].score - a[1].score)
    .slice(0, maxHot)
  return new Set(ranked.map(([id]) => id))
}

let cache = null

export function resetListingInterestCache() {
  cache = null
}

/** Interest and HOT set for all listings, cached for a few minutes. */
export async function getListingInterest(adminClient, { now = Date.now() } = {}) {
  if (cache && now - cache.at < CACHE_MS) return cache.value

  const since = new Date(now - WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString()
  const [favorites, conversations] = await Promise.all([
    adminClient.from('favorites').select('listing_id').gte('created_at', since),
    adminClient.from('conversations').select('listing_id').gte('created_at', since),
  ])
  if (favorites.error) throw favorites.error
  if (conversations.error) throw conversations.error

  const interest = scoreListingInterest({
    favorites: favorites.data ?? [],
    conversations: conversations.data ?? [],
  })
  const value = { interest, hot: pickHotListings(interest) }
  cache = { at: now, value }
  return value
}
