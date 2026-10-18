import { Router } from 'express'
import { isSupabaseConfigured, supabase, supabaseAdmin } from '../supabaseClient.js'
import { createLocalFeedback } from '../localDatabase.js'

const router = Router()

const MAX_MESSAGE_LENGTH = 4000
const MAX_EMAIL_LENGTH = 320
const MAX_PAGE_LENGTH = 200
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function normalizeOptional(value, maxLength) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return trimmed.slice(0, maxLength)
}

router.post('/', async (req, res) => {
  try {
    const message = typeof req.body?.message === 'string' ? req.body.message.trim() : ''
    if (!message) {
      return res.status(400).json({ error: 'message is required.' })
    }
    if (message.length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json({ error: `message must be ${MAX_MESSAGE_LENGTH} characters or fewer.` })
    }

    const email = normalizeOptional(req.body?.email, MAX_EMAIL_LENGTH)
    if (email && !EMAIL_PATTERN.test(email)) {
      return res.status(400).json({ error: 'email must look like an email address.' })
    }
    const page = normalizeOptional(req.body?.page, MAX_PAGE_LENGTH)

    // Optional sign-in: attach the profile when a valid bearer token is sent.
    // Anonymous feedback is fine too.
    let profileId = null
    const authHeader = req.headers.authorization
    if (isSupabaseConfigured && authHeader?.startsWith('Bearer ')) {
      const { data, error } = await supabase.auth.getUser(authHeader.slice(7))
      if (!error && data?.user) profileId = data.user.id
    }

    if (!isSupabaseConfigured) {
      const row = createLocalFeedback({ message, email, page })
      return res.status(201).json({ id: row.id })
    }

    if (!supabaseAdmin) {
      return res.status(503).json({ error: 'Feedback is not configured on the server.' })
    }

    const { data, error } = await supabaseAdmin
      .from('feedback')
      .insert({ message, email, page, profile_id: profileId })
      .select('id')
      .single()

    if (error || !data) {
      return res.status(400).json({ error: error?.message || 'Could not save feedback.' })
    }

    res.status(201).json({ id: data.id })
  } catch (error) {
    res.status(500).json({ error: error.message || 'Internal server error' })
  }
})

export default router
