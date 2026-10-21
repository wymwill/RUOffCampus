import { Router } from 'express'
import { createSupabaseClientWithToken, isSupabaseConfigured } from '../supabaseClient.js'
import { requireSupabaseUser } from '../middleware/requireSupabaseUser.js'

// The signed in user's own profile. Reads and writes run as the user, so RLS
// limits them to their own row, and database triggers keep email, is_rutgers
// and is_admin out of the user's control.
const router = Router()

const LIMITS = { name: 60, pronouns: 30, bio: 500 }
const MAX_AVATAR_LENGTH = 200000
const MIN_CLASS_YEAR = 1950
const MAX_CLASS_YEAR = 2040

function userClient(req) {
  return createSupabaseClientWithToken(req.headers.authorization.slice(7))
}

// Columns from later migrations may be missing, so read with * and default.
export function mapProfile(row, user) {
  return {
    id: row?.id ?? user.id,
    email: row?.email ?? user.email,
    name: row?.name ?? '',
    avatarUrl: row?.avatar_url ?? '',
    bio: row?.bio ?? '',
    pronouns: row?.pronouns ?? '',
    classYear: row?.class_year ?? null,
    isRutgers: row?.is_rutgers === true,
    isAdmin: row?.is_admin === true,
    createdAt: row?.created_at ?? user.created_at ?? null,
  }
}

function trimmedOrNull(value) {
  if (value == null) return null
  const text = String(value).trim()
  return text ? text : null
}

/** Picks and checks the editable fields. Returns { updates } or { error }. */
export function parseProfileUpdates(body = {}) {
  const updates = {}
  for (const [field, max] of Object.entries(LIMITS)) {
    if (body[field] === undefined) continue
    const value = trimmedOrNull(body[field])
    if (value && value.length > max) return { error: `${field} must be ${max} characters or fewer.` }
    updates[field] = value
  }

  if (body.classYear !== undefined) {
    if (body.classYear === null || body.classYear === '') {
      updates.class_year = null
    } else {
      const year = Number(body.classYear)
      if (!Number.isInteger(year) || year < MIN_CLASS_YEAR || year > MAX_CLASS_YEAR) {
        return { error: `classYear must be a year between ${MIN_CLASS_YEAR} and ${MAX_CLASS_YEAR}.` }
      }
      updates.class_year = year
    }
  }

  if (body.avatarUrl !== undefined) {
    const avatar = trimmedOrNull(body.avatarUrl)
    if (avatar && !/^(data:image\/(jpeg|png|webp);base64,|https:\/\/)/.test(avatar)) {
      return { error: 'avatarUrl must be an uploaded image.' }
    }
    if (avatar && avatar.length > MAX_AVATAR_LENGTH) {
      return { error: 'That photo is too large. Try a smaller one.' }
    }
    updates.avatar_url = avatar
  }

  if (Object.keys(updates).length === 0) return { error: 'No profile fields to update.' }
  return { updates }
}

router.use((req, res, next) => {
  if (!isSupabaseConfigured) return res.status(404).json({ error: 'Profiles need Supabase.' })
  next()
}, requireSupabaseUser)

router.get('/me', async (req, res) => {
  const { data, error } = await userClient(req)
    .from('profiles')
    .select('*')
    .eq('id', req.user.id)
    .maybeSingle()
  if (error) return res.status(400).json({ error: error.message })
  res.json(mapProfile(data, req.user))
})

router.put('/me', async (req, res) => {
  const { updates, error: parseError } = parseProfileUpdates(req.body)
  if (parseError) return res.status(400).json({ error: parseError })

  const { data, error } = await userClient(req)
    .from('profiles')
    .update(updates)
    .eq('id', req.user.id)
    .select('*')
    .maybeSingle()
  if (error) return res.status(400).json({ error: error.message })
  if (!data) return res.status(404).json({ error: 'Profile not found.' })
  res.json(mapProfile(data, req.user))
})

export default router
