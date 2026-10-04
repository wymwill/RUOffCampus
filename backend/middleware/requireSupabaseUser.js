import { supabase, isSupabaseConfigured } from '../supabaseClient.js'
import { isRutgersEmail } from '../rutgersEmail.js'

/**
 * When connected to real Supabase: requires Authorization: Bearer <access_token>,
 * verifies with supabase.auth.getUser, sets req.user.
 * In mock mode: skips verification (listing routes use body host_id for creates).
 */
export async function requireSupabaseUser(req, res, next) {
  if (!isSupabaseConfigured) {
    req.user = null
    return next()
  }

  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Authorization required. Send: Authorization: Bearer <access_token>',
    })
  }

  const token = authHeader.slice(7)
  // Debug without leaking token contents.
  console.log("requireSupabaseUser: bearer token length", token?.length)
  let user = null
  try {
    const {
      data: { user: resolvedUser },
      error,
    } = await supabase.auth.getUser(token)

    user = resolvedUser ?? null

    if (error || !user) {
      console.log("requireSupabaseUser: getUser failed", {
        message: error?.message,
        name: error?.name,
        status: error?.status,
        code: error?.code,
      })
      return res.status(401).json({
        error:
          error?.message ||
          "Invalid or expired session. Please sign in again.",
      })
    }
  } catch (err) {
    // Common when SUPABASE_URL is wrong or backend can't reach Supabase (DNS/network).
    console.log("requireSupabaseUser: getUser threw", {
      message: err?.message,
      code: err?.code,
      name: err?.name,
    })
    return res.status(503).json({
      error:
        err?.code === "ENOTFOUND"
          ? "Backend cannot reach Supabase (DNS/URL issue). Check SUPABASE_URL."
          : err?.message || "Backend cannot validate session.",
    })
  }

  // Any email can sign up, but posting and messaging need a confirmed one.
  if (!user.email_confirmed_at && !user.confirmed_at) {
    return res.status(403).json({
      error: 'Please confirm your email before continuing.',
    })
  }

  // Confirmed Rutgers emails get the Rutgers label. Everyone else is labeled
  // as a non-Rutgers account, not blocked.
  req.user = { ...user, isRutgers: isRutgersEmail(user.email) }
  next()
}
