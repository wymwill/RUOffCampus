import { isSupabaseConfigured, supabaseAdmin } from '../supabaseClient.js'

/**
 * True when the profile has is_admin set. The flag can only be changed with
 * SQL or the service role (see the admin_role migration), so it is read with
 * the service role client here. False when the column doesn't exist yet.
 */
export async function isAdminUser(userId) {
  if (!supabaseAdmin || !userId) return false
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('is_admin')
    .eq('id', userId)
    .maybeSingle()
  if (error) return false
  return data?.is_admin === true
}

/** Use after requireSupabaseUser. Lets only admins through. */
export async function requireAdmin(req, res, next) {
  if (!isSupabaseConfigured) {
    return res.status(404).json({ error: 'Admin tools need Supabase.' })
  }
  if (!supabaseAdmin) {
    return res.status(503).json({ error: 'Admin tools need SUPABASE_SERVICE_ROLE_KEY on the server.' })
  }
  try {
    if (!(await isAdminUser(req.user?.id))) {
      return res.status(403).json({ error: 'Admins only.' })
    }
  } catch (error) {
    return res.status(503).json({ error: error.message || 'Could not check admin access.' })
  }
  req.isAdmin = true
  next()
}
