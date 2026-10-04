/**
 * Rutgers email detection, used for labels. Anyone can sign up, but only
 * rutgers.edu addresses and their subdomains (scarletmail.rutgers.edu,
 * rwjms.rutgers.edu, ...) count as Rutgers. Override the domains with
 * RUTGERS_EMAIL_DOMAINS (comma separated). Each entry also covers its
 * subdomains. ALLOWED_EMAIL_DOMAINS is still read for older setups.
 *
 * The trusted flag shown to other users comes from Supabase (profiles.is_rutgers
 * and listings.host_is_rutgers), which also requires a confirmed email.
 */
const DEFAULT_RUTGERS_DOMAINS = ['rutgers.edu']

export function getRutgersEmailDomains() {
  const raw = process.env.RUTGERS_EMAIL_DOMAINS ?? process.env.ALLOWED_EMAIL_DOMAINS
  if (!raw) return DEFAULT_RUTGERS_DOMAINS
  const domains = raw
    .split(',')
    .map((domain) => domain.trim().toLowerCase().replace(/^@/, ''))
    .filter(Boolean)
  return domains.length ? domains : DEFAULT_RUTGERS_DOMAINS
}

export function isRutgersEmail(email, rutgersDomains = getRutgersEmailDomains()) {
  if (typeof email !== 'string') return false
  const normalized = email.trim().toLowerCase()
  const at = normalized.lastIndexOf('@')
  if (at <= 0 || at === normalized.length - 1) return false
  const domain = normalized.slice(at + 1)
  return rutgersDomains.some(
    (rutgers) => domain === rutgers || domain.endsWith(`.${rutgers}`)
  )
}
