import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isRutgersEmail, getRutgersEmailDomains } from '../rutgersEmail.js'

const ALLOWED = [
  'ay559@scarletmail.rutgers.edu', // netid@scarletmail.rutgers.edu
  'anish.yenduri@rutgers.edu', // first.last@rutgers.edu
  'Anish.Yenduri@Rutgers.EDU', // case-insensitive
  '  ay559@scarletmail.rutgers.edu  ', // surrounding whitespace
  'someone@rwjms.rutgers.edu', // other Rutgers subdomains
]

const REJECTED = [
  'someone@gmail.com',
  'someone@notrutgers.edu',
  'someone@rutgers.edu.evil.com',
  'someone@scarletmail.rutgers.edu.co',
  'someone@rutgers.com',
  'rutgers.edu',
  '@rutgers.edu',
  'someone@',
  '',
  null,
  undefined,
  42,
]

for (const email of ALLOWED) {
  test(`allows ${JSON.stringify(email)}`, () => {
    assert.equal(isRutgersEmail(email), true)
  })
}

for (const email of REJECTED) {
  test(`rejects ${JSON.stringify(email)}`, () => {
    assert.equal(isRutgersEmail(email), false)
  })
}

test('defaults to rutgers.edu (covers scarletmail.rutgers.edu)', () => {
  const saved = process.env.ALLOWED_EMAIL_DOMAINS
  const savedNew = process.env.RUTGERS_EMAIL_DOMAINS
  delete process.env.ALLOWED_EMAIL_DOMAINS
  delete process.env.RUTGERS_EMAIL_DOMAINS
  try {
    assert.deepEqual(getRutgersEmailDomains(), ['rutgers.edu'])
  } finally {
    if (saved !== undefined) process.env.ALLOWED_EMAIL_DOMAINS = saved
    if (savedNew !== undefined) process.env.RUTGERS_EMAIL_DOMAINS = savedNew
  }
})

test('RUTGERS_EMAIL_DOMAINS override wins over the older setting', () => {
  const saved = process.env.RUTGERS_EMAIL_DOMAINS
  const savedOld = process.env.ALLOWED_EMAIL_DOMAINS
  process.env.RUTGERS_EMAIL_DOMAINS = 'rwjms.rutgers.edu'
  process.env.ALLOWED_EMAIL_DOMAINS = 'rutgers.edu'
  try {
    assert.equal(isRutgersEmail('doc@rwjms.rutgers.edu'), true)
    assert.equal(isRutgersEmail('anish.yenduri@rutgers.edu'), false)
  } finally {
    if (saved === undefined) delete process.env.RUTGERS_EMAIL_DOMAINS
    else process.env.RUTGERS_EMAIL_DOMAINS = saved
    if (savedOld === undefined) delete process.env.ALLOWED_EMAIL_DOMAINS
    else process.env.ALLOWED_EMAIL_DOMAINS = savedOld
  }
})

test('ALLOWED_EMAIL_DOMAINS override is respected', () => {
  const saved = process.env.ALLOWED_EMAIL_DOMAINS
  process.env.ALLOWED_EMAIL_DOMAINS = 'scarletmail.rutgers.edu'
  try {
    assert.equal(isRutgersEmail('ay559@scarletmail.rutgers.edu'), true)
    assert.equal(isRutgersEmail('anish.yenduri@rutgers.edu'), false)
  } finally {
    if (saved === undefined) delete process.env.ALLOWED_EMAIL_DOMAINS
    else process.env.ALLOWED_EMAIL_DOMAINS = saved
  }
})
