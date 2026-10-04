// Inbox last message and unread counts are computed per conversation, so a
// busy conversation can't hide messages from another one.
import { test } from 'node:test'
import assert from 'node:assert/strict'

const { listConversations } = await import('../routes/messaging.js')

const ME = 'me'
const HOST = 'host'

// Minimal stand-in for the supabase-js query builder over in-memory rows.
function fakeSupabase(tables) {
  return {
    from(table) {
      let rows = [...(tables[table] ?? [])]
      let headCount = false
      let limit = null
      const builder = {
        select(_columns, options = {}) {
          headCount = options.head === true && options.count === 'exact'
          return builder
        },
        eq(column, value) {
          rows = rows.filter((row) => row[column] === value)
          return builder
        },
        neq(column, value) {
          rows = rows.filter((row) => row[column] !== value)
          return builder
        },
        gt(column, value) {
          rows = rows.filter((row) => row[column] > value)
          return builder
        },
        in(column, values) {
          rows = rows.filter((row) => values.includes(row[column]))
          return builder
        },
        order(column, { ascending = true } = {}) {
          rows.sort((a, b) => (a[column] < b[column] ? -1 : a[column] > b[column] ? 1 : 0))
          if (!ascending) rows.reverse()
          return builder
        },
        limit(count) {
          limit = count
          return builder
        },
        then(resolve) {
          const data = limit == null ? rows : rows.slice(0, limit)
          return resolve(headCount ? { data: null, count: rows.length, error: null } : { data, error: null })
        },
      }
      return builder
    },
  }
}

function minute(n) {
  return new Date(Date.UTC(2026, 8, 26, 12, n)).toISOString()
}

test('unread counts and last message are correct past 500 total messages', async () => {
  const messages = []
  // A busy conversation with 600 newer messages from the host, all unread.
  for (let i = 0; i < 600; i += 1) {
    messages.push({ id: `busy-${i}`, conversation_id: 'busy', sender_id: HOST, body: `m${i}`, created_at: minute(30 + i) })
  }
  // A quiet conversation with older messages, two unread from the host.
  messages.push(
    { id: 'q1', conversation_id: 'quiet', sender_id: HOST, body: 'read already', created_at: minute(1) },
    { id: 'q2', conversation_id: 'quiet', sender_id: ME, body: 'my reply', created_at: minute(3) },
    { id: 'q3', conversation_id: 'quiet', sender_id: HOST, body: 'unread one', created_at: minute(4) },
    { id: 'q4', conversation_id: 'quiet', sender_id: HOST, body: 'unread two', created_at: minute(5) }
  )

  const client = fakeSupabase({
    conversations: [
      { id: 'busy', listing_id: 'l1', created_by: ME, created_at: minute(0), updated_at: minute(0), listings: null },
      { id: 'quiet', listing_id: 'l2', created_by: ME, created_at: minute(0), updated_at: minute(0), listings: null },
    ],
    conversation_participants: [
      { conversation_id: 'busy', profile_id: ME, last_read_at: null, profiles: null },
      { conversation_id: 'busy', profile_id: HOST, last_read_at: null, profiles: null },
      { conversation_id: 'quiet', profile_id: ME, last_read_at: minute(2), profiles: { id: ME, email: 'me@rutgers.edu', is_rutgers: true } },
      { conversation_id: 'quiet', profile_id: HOST, last_read_at: null, profiles: { id: HOST, email: 'host@gmail.com', is_rutgers: false } },
    ],
    messages,
  })

  const conversations = await listConversations(client, ME, ['busy', 'quiet'])
  const busy = conversations.find((conversation) => conversation.id === 'busy')
  const quiet = conversations.find((conversation) => conversation.id === 'quiet')

  assert.equal(busy.unread_count, 600)
  assert.equal(busy.last_message.id, 'busy-599')
  assert.equal(quiet.unread_count, 2)
  assert.equal(quiet.last_message.id, 'q4')
  assert.equal(quiet.other_participants[0].profile.is_rutgers, false)
  assert.equal(quiet.participants.find((p) => p.profile_id === ME).profile.is_rutgers, true)
  assert.deepEqual(conversations.map((conversation) => conversation.id), ['busy', 'quiet'])
})

test('conversation with no messages has no last message and zero unread', async () => {
  const client = fakeSupabase({
    conversations: [{ id: 'empty', listing_id: 'l1', created_by: ME, created_at: minute(0), updated_at: minute(0), listings: null }],
    conversation_participants: [{ conversation_id: 'empty', profile_id: ME, last_read_at: null, profiles: null }],
    messages: [],
  })

  const [conversation] = await listConversations(client, ME, ['empty'])
  assert.equal(conversation.last_message, null)
  assert.equal(conversation.unread_count, 0)
})
