// Rutgers email detection for labels. Mirrors backend/rutgersEmail.js.
// Anyone can sign up. rutgers.edu and its subdomains (scarletmail.rutgers.edu,
// ...) count as Rutgers. Other people see the trusted flag from Supabase,
// which also needs a confirmed email.
const env = import.meta.env ?? {};
const RUTGERS_DOMAINS = (env.VITE_RUTGERS_EMAIL_DOMAINS || env.VITE_ALLOWED_EMAIL_DOMAINS || "rutgers.edu")
  .split(",")
  .map((domain) => domain.trim().toLowerCase().replace(/^@/, ""))
  .filter(Boolean);

export function isRutgersEmail(email, domains = RUTGERS_DOMAINS) {
  if (typeof email !== "string") return false;
  const normalized = email.trim().toLowerCase();
  const at = normalized.lastIndexOf("@");
  if (at <= 0 || at === normalized.length - 1) return false;
  const domain = normalized.slice(at + 1);
  return domains.some((rutgers) => domain === rutgers || domain.endsWith(`.${rutgers}`));
}
