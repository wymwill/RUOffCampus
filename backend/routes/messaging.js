import { Router } from 'express'
import { createSupabaseClientWithToken, isSupabaseConfigured } from '../supabaseClient.js'
import { requireSupabaseUser } from '../middleware/requireSupabaseUser.js'

const router = Router()

router.use(requireSupabaseUser)

router.post('/conversations', async (req, res) => {
  try {
    const listingId = req.body.listing_id ?? req.body.listingId
    const currentUserId = req.user?.id

    if (!isSupabaseConfigured) {
      return res.status(503).json({ error: 'Messaging requires Supabase mode.' })
    }

    if (!currentUserId) {
      return res.status(401).json({ error: 'Authorization required.' })
    }

    if (!listingId) {
      return res.status(400).json({ error: 'listing_id is required.' })
    }

    const authenticatedSupabase = getAuthenticatedSupabase(req)
    await ensureOwnProfile(authenticatedSupabase, req.user)

    const { data: listing, error: listingError } = await authenticatedSupabase
      .from('listings')
      .select('id, title, host_id')
      .eq('id', listingId)
      .single()

    if (listingError || !listing) {
      return res.status(404).json({ error: 'Listing not found.' })
    }

    const hostUserId = listing.host_id
    if (!hostUserId) {
      return res.status(400).json({ error: 'This listing does not have a host profile.' })
    }

    if (String(hostUserId) === String(currentUserId)) {
      return res.status(400).json({ error: 'You cannot message yourself about your own listing.' })
    }

    const existingConversation = await findExistingConversation({
      supabaseClient: authenticatedSupabase,
      listingId,
      currentUserId,
      hostUserId,
    })

    if (existingConversation) {
      return res.status(200).json(existingConversation)
    }

    const { data: conversation, error: conversationError } = await authenticatedSupabase
      .from('conversations')
      .insert({
        listing_id: listing.id,
        created_by: currentUserId,
      })
      .select('id, listing_id, created_by, created_at, updated_at')
      .single()

    if (conversationError || !conversation) {
      return res.status(400).json({ error: conversationError?.message || 'Could not create conversation.' })
    }

    const { error: participantsError } = await authenticatedSupabase
      .from('conversation_participants')
      .insert([
        {
          conversation_id: conversation.id,
          profile_id: currentUserId,
          last_read_at: new Date().toISOString(),
        },
        {
          conversation_id: conversation.id,
          profile_id: hostUserId,
        },
      ])

    if (participantsError) {
      return res.status(400).json({ error: participantsError.message })
    }

    const conversationDetails = await getConversationDetails(
      authenticatedSupabase,
      conversation.id,
      currentUserId
    )

    res.status(201).json(conversationDetails ?? conversation)
  } catch (error) {
    res.status(500).json({ error: error.message || 'Internal server error' })
  }
})

router.get('/conversations', async (req, res) => {
  try {
    if (!isSupabaseConfigured) {
      return res.status(503).json({ error: 'Messaging requires Supabase mode.' })
    }

    if (!req.user?.id) {
      return res.status(401).json({ error: 'Authorization required.' })
    }

    const authenticatedSupabase = getAuthenticatedSupabase(req)
    const conversations = await listConversations(authenticatedSupabase, req.user.id)

    res.json(conversations)
  } catch (error) {
    res.status(500).json({ error: error.message || 'Internal server error' })
  }
})

router.get('/conversations/:conversationId/messages', async (req, res) => {
  try {
    if (!isSupabaseConfigured) {
      return res.status(503).json({ error: 'Messaging requires Supabase mode.' })
    }

    const authenticatedSupabase = getAuthenticatedSupabase(req)
    const hasAccess = await canReadConversation(
      authenticatedSupabase,
      req.params.conversationId
    )

    if (!hasAccess) {
      return res.status(404).json({ error: 'Conversation not found.' })
    }

    const { data, error } = await authenticatedSupabase
      .from('messages')
      .select('id, conversation_id, sender_id, body, created_at')
      .eq('conversation_id', req.params.conversationId)
      .order('created_at', { ascending: true })

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    res.json(data ?? [])
  } catch (error) {
    res.status(500).json({ error: error.message || 'Internal server error' })
  }
})

router.post('/conversations/:conversationId/messages', async (req, res) => {
  try {
    if (!isSupabaseConfigured) {
      return res.status(503).json({ error: 'Messaging requires Supabase mode.' })
    }

    const currentUserId = req.user?.id
    const body = String(req.body.body ?? '').trim()

    if (!currentUserId) {
      return res.status(401).json({ error: 'Authorization required.' })
    }

    if (!body) {
      return res.status(400).json({ error: 'Message body is required.' })
    }

    const authenticatedSupabase = getAuthenticatedSupabase(req)

    const { data, error } = await authenticatedSupabase
      .from('messages')
      .insert({
        conversation_id: req.params.conversationId,
        sender_id: currentUserId,
        body,
      })
      .select('id, conversation_id, sender_id, body, created_at')
      .single()

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    await markConversationRead(authenticatedSupabase, req.params.conversationId, currentUserId)

    res.status(201).json(data)
  } catch (error) {
    res.status(500).json({ error: error.message || 'Internal server error' })
  }
})

router.patch('/conversations/:conversationId/read', async (req, res) => {
  try {
    if (!isSupabaseConfigured) {
      return res.status(503).json({ error: 'Messaging requires Supabase mode.' })
    }

    const currentUserId = req.user?.id
    if (!currentUserId) {
      return res.status(401).json({ error: 'Authorization required.' })
    }

    const authenticatedSupabase = getAuthenticatedSupabase(req)
    const updated = await markConversationRead(
      authenticatedSupabase,
      req.params.conversationId,
      currentUserId
    )

    res.json(updated)
  } catch (error) {
    res.status(500).json({ error: error.message || 'Internal server error' })
  }
})

function getAuthenticatedSupabase(req) {
  const accessToken =
    req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.slice(7)
      : null

  return createSupabaseClientWithToken(accessToken)
}

async function ensureOwnProfile(supabaseClient, user) {
  if (!user?.id) return

  await supabaseClient
    .from('profiles')
    .upsert(
      {
        id: user.id,
        email: user.email ?? null,
        name: user.user_metadata?.name ?? user.user_metadata?.full_name ?? null,
        full_name: user.user_metadata?.full_name ?? null,
      },
      { onConflict: 'id' }
    )
}

async function findExistingConversation({
  supabaseClient,
  listingId,
  currentUserId,
  hostUserId,
}) {
  const { data: currentParticipantRows, error: participantError } = await supabaseClient
    .from('conversation_participants')
    .select('conversation_id')
    .eq('profile_id', currentUserId)

  if (participantError || !currentParticipantRows?.length) return null

  const conversationIds = currentParticipantRows.map((row) => row.conversation_id)
  const { data: conversations, error: conversationsError } = await supabaseClient
    .from('conversations')
    .select('id')
    .eq('listing_id', listingId)
    .in('id', conversationIds)

  if (conversationsError || !conversations?.length) return null

  const listingConversationIds = conversations.map((conversation) => conversation.id)
  const { data: hostParticipantRows, error: hostParticipantError } = await supabaseClient
    .from('conversation_participants')
    .select('conversation_id')
    .eq('profile_id', hostUserId)
    .in('conversation_id', listingConversationIds)

  if (hostParticipantError || !hostParticipantRows?.length) return null

  return getConversationDetails(
    supabaseClient,
    hostParticipantRows[0].conversation_id,
    currentUserId
  )
}

async function getConversationDetails(supabaseClient, conversationId, currentUserId) {
  const conversations = await listConversations(supabaseClient, currentUserId, [conversationId])
  return conversations[0] ?? null
}

export async function listConversations(supabaseClient, currentUserId, onlyConversationIds = null) {
  const participantConversationIds = onlyConversationIds
    ? onlyConversationIds
    : await getCurrentUserConversationIds(supabaseClient, currentUserId)

  if (participantConversationIds.length === 0) return []

  let conversationsQuery = supabaseClient
    .from('conversations')
    .select(`
      id,
      listing_id,
      created_by,
      created_at,
      updated_at,
      listings (
        id,
        title,
        address,
        image_url,
        price_monthly,
        host_id
      )
    `)
    .in('id', participantConversationIds)

  const { data: conversations, error: conversationsError } = await conversationsQuery
  if (conversationsError) throw conversationsError
  if (!conversations?.length) return []

  const conversationIds = conversations.map((conversation) => conversation.id)
  const { data: participants, error: participantsError } = await supabaseClient
    .from('conversation_participants')
    .select(`
      conversation_id,
      profile_id,
      joined_at,
      last_read_at,
      profiles (
        id,
        email,
        name,
        full_name,
        avatar_url
      )
    `)
    .in('conversation_id', conversationIds)

  if (participantsError) throw participantsError

  const participantsByConversation = groupBy(participants ?? [], 'conversation_id')

  // Count per conversation so busy threads can't push others past a shared row limit.
  const summaries = await Promise.all(
    conversationIds.map((conversationId) => {
      const currentParticipant = (participantsByConversation.get(conversationId) ?? []).find(
        (participant) => String(participant.profile_id) === String(currentUserId)
      )
      return getMessageSummary(
        supabaseClient,
        conversationId,
        currentUserId,
        currentParticipant?.last_read_at ?? null
      )
    })
  )
  const summaryByConversation = new Map(
    conversationIds.map((conversationId, index) => [conversationId, summaries[index]])
  )

  return conversations
    .map((conversation) =>
      mapConversation({
        conversation,
        participants: participantsByConversation.get(conversation.id) ?? [],
        summary: summaryByConversation.get(conversation.id),
        currentUserId,
      })
    )
    .sort((a, b) => {
      const aTime = new Date(a.last_message?.created_at ?? a.created_at).getTime()
      const bTime = new Date(b.last_message?.created_at ?? b.created_at).getTime()
      return bTime - aTime
    })
}

async function getMessageSummary(supabaseClient, conversationId, currentUserId, lastReadAt) {
  let unreadQuery = supabaseClient
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('conversation_id', conversationId)
    .neq('sender_id', currentUserId)
  if (lastReadAt) unreadQuery = unreadQuery.gt('created_at', lastReadAt)

  const [{ data: latest, error: latestError }, { count, error: unreadError }] = await Promise.all([
    supabaseClient
      .from('messages')
      .select('id, conversation_id, sender_id, body, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(1),
    unreadQuery,
  ])

  if (latestError) throw latestError
  if (unreadError) throw unreadError

  return { lastMessage: latest?.[0] ?? null, unreadCount: count ?? 0 }
}

async function getCurrentUserConversationIds(supabaseClient, currentUserId) {
  const { data, error } = await supabaseClient
    .from('conversation_participants')
    .select('conversation_id')
    .eq('profile_id', currentUserId)

  if (error) throw error
  return [...new Set((data ?? []).map((row) => row.conversation_id))]
}

async function canReadConversation(supabaseClient, conversationId) {
  const { data, error } = await supabaseClient
    .from('conversations')
    .select('id')
    .eq('id', conversationId)
    .maybeSingle()

  return Boolean(data && !error)
}

async function markConversationRead(supabaseClient, conversationId, currentUserId) {
  const { data, error } = await supabaseClient
    .from('conversation_participants')
    .update({ last_read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .eq('profile_id', currentUserId)
    .select('conversation_id, profile_id, last_read_at')
    .single()

  if (error) throw error
  return data
}

function mapConversation({ conversation, participants, summary, currentUserId }) {
  const currentParticipant =
    participants.find((participant) => String(participant.profile_id) === String(currentUserId)) ??
    null
  const otherParticipants = participants.filter(
    (participant) => String(participant.profile_id) !== String(currentUserId)
  )

  return {
    id: conversation.id,
    listing_id: conversation.listing_id,
    created_by: conversation.created_by,
    created_at: conversation.created_at,
    updated_at: conversation.updated_at,
    listing: conversation.listings
      ? {
          id: conversation.listings.id,
          title: conversation.listings.title,
          address: conversation.listings.address,
          image_url: conversation.listings.image_url,
          price_monthly: conversation.listings.price_monthly,
          host_id: conversation.listings.host_id,
        }
      : null,
    participants: participants.map(mapParticipant),
    other_participants: otherParticipants.map(mapParticipant),
    last_message: summary?.lastMessage ?? null,
    unread_count: summary?.unreadCount ?? 0,
    last_read_at: currentParticipant?.last_read_at ?? null,
  }
}

function mapParticipant(participant) {
  return {
    profile_id: participant.profile_id,
    joined_at: participant.joined_at,
    last_read_at: participant.last_read_at,
    profile: participant.profiles
      ? {
          id: participant.profiles.id,
          email: participant.profiles.email,
          name: participant.profiles.name,
          full_name: participant.profiles.full_name,
          avatar_url: participant.profiles.avatar_url,
        }
      : null,
  }
}

function groupBy(rows, key) {
  const grouped = new Map()

  for (const row of rows) {
    const groupKey = row[key]
    if (!grouped.has(groupKey)) grouped.set(groupKey, [])
    grouped.get(groupKey).push(row)
  }

  return grouped
}

export default router
