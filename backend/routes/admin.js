import { Router } from 'express'
import { supabaseAdmin } from '../supabaseClient.js'
import { requireSupabaseUser } from '../middleware/requireSupabaseUser.js'
import { isAdminUser, requireAdmin } from '../middleware/requireAdmin.js'
import {
  mapSupabaseListingRow,
  pickEditableFields,
  validateListingUpdates,
} from './listings.js'
import { syncRutgersMarketplaceListings } from '../rutgersMarketplaceImporter.js'

// Owner tools. Every route runs as the service role, so requireAdmin must
// check the caller first. Banning lasts until an admin lifts it.
const router = Router()
const BAN_DURATION = '876000h'

router.use(requireSupabaseUser, requireAdmin)

const sendError = (res, error, status = 400) =>
  res.status(status).json({ error: error?.message || 'Admin request failed.' })

async function listAuthUsers() {
  const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (error) throw error
  return data?.users ?? []
}

async function emailsById() {
  const users = await listAuthUsers()
  return new Map(users.map((user) => [user.id, user.email]))
}

// Every listing, including paused, taken and hostless ones, with the host's email.
router.get('/listings', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('listings')
      .select('*')
      .order('created_at', { ascending: false, nullsFirst: false })
    if (error) return sendError(res, error)
    const emails = await emailsById()
    res.json(
      data.map((row) => ({
        ...mapSupabaseListingRow(row),
        hostEmail: row.host_id ? emails.get(row.host_id) ?? null : null,
      }))
    )
  } catch (error) {
    sendError(res, error, 500)
  }
})

router.get('/listings/:id', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('listings')
    .select('*')
    .eq('id', req.params.id)
    .maybeSingle()
  if (error) return sendError(res, error)
  if (!data) return res.status(404).json({ error: 'Listing not found' })
  res.json(mapSupabaseListingRow(data))
})

router.patch('/listings/:id', async (req, res) => {
  const updates = pickEditableFields(req.body)
  const validationError = validateListingUpdates(updates)
  if (validationError) return res.status(400).json({ error: validationError })

  const { data, error } = await supabaseAdmin
    .from('listings')
    .update(updates)
    .eq('id', req.params.id)
    .select()
    .maybeSingle()
  if (error) return sendError(res, error)
  if (!data) return res.status(404).json({ error: 'Listing not found' })
  res.json(mapSupabaseListingRow(data))
})

router.delete('/listings/:id', async (req, res) => {
  const { error } = await supabaseAdmin.from('listings').delete().eq('id', req.params.id)
  if (error) return sendError(res, error)
  res.status(204).send()
})

// Accounts with their Rutgers status, admin flag, ban and listing count.
router.get('/users', async (req, res) => {
  try {
    const [users, profiles, listings] = await Promise.all([
      listAuthUsers(),
      supabaseAdmin.from('profiles').select('id, is_admin, is_rutgers'),
      supabaseAdmin.from('listings').select('host_id').not('host_id', 'is', null),
    ])
    if (profiles.error) return sendError(res, profiles.error)
    if (listings.error) return sendError(res, listings.error)

    const profileById = new Map(profiles.data.map((profile) => [profile.id, profile]))
    const listingCounts = new Map()
    for (const { host_id: hostId } of listings.data) {
      listingCounts.set(hostId, (listingCounts.get(hostId) ?? 0) + 1)
    }

    res.json(
      users
        .map((user) => ({
          id: user.id,
          email: user.email,
          createdAt: user.created_at,
          lastSignInAt: user.last_sign_in_at ?? null,
          emailConfirmed: Boolean(user.email_confirmed_at),
          bannedUntil: user.banned_until ?? null,
          isAdmin: profileById.get(user.id)?.is_admin === true,
          isRutgers: profileById.get(user.id)?.is_rutgers === true,
          listingCount: listingCounts.get(user.id) ?? 0,
        }))
        .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    )
  } catch (error) {
    sendError(res, error, 500)
  }
})

// Admins can't ban or delete themselves or another admin from the site.
async function protectedUserError(req, userId) {
  if (userId === req.user.id) return 'You cannot do this to your own account.'
  if (await isAdminUser(userId)) return 'Admin accounts can only be changed in Supabase.'
  return null
}

// Banning also pauses the user's listings so they leave search.
router.post('/users/:id/ban', async (req, res) => {
  const userId = req.params.id
  const banned = req.body?.banned !== false
  const blocked = await protectedUserError(req, userId)
  if (blocked) return res.status(403).json({ error: blocked })

  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    ban_duration: banned ? BAN_DURATION : 'none',
  })
  if (error) return sendError(res, error)

  if (banned) {
    const { error: pauseError } = await supabaseAdmin
      .from('listings')
      .update({ status: 'paused' })
      .eq('host_id', userId)
    if (pauseError) return sendError(res, pauseError)
  }
  res.json({ id: userId, banned })
})

// Deleting the auth user cascades to the profile, listings, saves and messages.
router.delete('/users/:id', async (req, res) => {
  const userId = req.params.id
  const blocked = await protectedUserError(req, userId)
  if (blocked) return res.status(403).json({ error: blocked })

  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)
  if (error) return sendError(res, error)
  res.status(204).send()
})

// Every conversation, newest activity first, with who is in it.
router.get('/conversations', async (req, res) => {
  try {
    const [conversations, participants, messages, listings, emails] = await Promise.all([
      supabaseAdmin.from('conversations').select('id, listing_id, created_at, updated_at'),
      supabaseAdmin.from('conversation_participants').select('conversation_id, profile_id'),
      supabaseAdmin.from('messages').select('conversation_id, created_at'),
      supabaseAdmin.from('listings').select('id, title'),
      emailsById(),
    ])
    for (const result of [conversations, participants, messages, listings]) {
      if (result.error) return sendError(res, result.error)
    }

    const titles = new Map(listings.data.map((listing) => [listing.id, listing.title]))
    const people = new Map()
    for (const row of participants.data) {
      if (!people.has(row.conversation_id)) people.set(row.conversation_id, [])
      people.get(row.conversation_id).push(emails.get(row.profile_id) ?? 'Deleted account')
    }
    const stats = new Map()
    for (const row of messages.data) {
      const stat = stats.get(row.conversation_id) ?? { count: 0, lastAt: null }
      stat.count += 1
      if (!stat.lastAt || row.created_at > stat.lastAt) stat.lastAt = row.created_at
      stats.set(row.conversation_id, stat)
    }

    res.json(
      conversations.data
        .map((conversation) => ({
          id: conversation.id,
          listingId: conversation.listing_id,
          listingTitle: titles.get(conversation.listing_id) ?? null,
          participants: people.get(conversation.id) ?? [],
          messageCount: stats.get(conversation.id)?.count ?? 0,
          lastMessageAt: stats.get(conversation.id)?.lastAt ?? conversation.created_at,
        }))
        .sort((a, b) => String(b.lastMessageAt).localeCompare(String(a.lastMessageAt)))
    )
  } catch (error) {
    sendError(res, error, 500)
  }
})

router.get('/conversations/:id/messages', async (req, res) => {
  try {
    const [{ data, error }, emails] = await Promise.all([
      supabaseAdmin
        .from('messages')
        .select('id, sender_id, body, created_at')
        .eq('conversation_id', req.params.id)
        .order('created_at', { ascending: true }),
      emailsById(),
    ])
    if (error) return sendError(res, error)
    res.json(
      data.map((message) => ({
        id: message.id,
        senderEmail: emails.get(message.sender_id) ?? 'Deleted account',
        body: message.body,
        createdAt: message.created_at,
      }))
    )
  } catch (error) {
    sendError(res, error, 500)
  }
})

router.get('/feedback', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('feedback')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) return sendError(res, error)
  res.json(data)
})

router.post('/import', async (req, res) => {
  try {
    res.json(await syncRutgersMarketplaceListings({ force: true }))
  } catch (error) {
    sendError(res, error, 500)
  }
})

export default router
