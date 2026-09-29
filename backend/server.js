import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import listingsRouter from './routes/listings.js'
import messagingRouter from './routes/messaging.js'
import { isSupabaseConfigured, supabaseAdmin } from './supabaseClient.js'
import {
  warmRutgersListingCache,
  getRutgersImportMetadata,
  RUTGERS_SOURCE,
} from './rutgersMarketplaceImporter.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors())
app.use(express.json())

// Request logger — prints every request to the terminal
app.use((req, res, next) => {
  const start = Date.now()
  res.on('finish', () => {
    const ms = Date.now() - start
    console.log(`${req.method} ${req.originalUrl} → ${res.statusCode} (${ms}ms)`)
  })
  next()
})

// Routes are served at the root for local dev and mobile, and under /api
// where Vercel forwards public /api/* requests without stripping the prefix.
const api = express.Router()

// Health check
api.get('/health', async (req, res) => {
  let importStatus
  try {
    importStatus = { source: RUTGERS_SOURCE, ...(await getRutgersImportMetadata()) }
  } catch (error) {
    importStatus = { source: RUTGERS_SOURCE, status: 'unavailable', error: error.message }
  }

  res.json({
    status: 'ok',
    mode: isSupabaseConfigured ? 'supabase' : 'local-sqlite',
    import: importStatus,
  })
})

api.use('/listings', listingsRouter)
api.use('/messages', messagingRouter)

app.use('/api', api)
app.use(api)

// Seed / refresh imported Rutgers listings (every 12h at most).
// Supabase mode needs SUPABASE_SERVICE_ROLE_KEY. Set RUTGERS_IMPORT_ON_START=false to skip.
const importOnStart = (process.env.RUTGERS_IMPORT_ON_START || 'true').toLowerCase() !== 'false'

if (!importOnStart) {
  console.log('Rutgers listing warmup disabled (RUTGERS_IMPORT_ON_START=false)')
} else if (isSupabaseConfigured && !supabaseAdmin) {
  console.warn('Rutgers listing warmup skipped: set SUPABASE_SERVICE_ROLE_KEY to import in Supabase mode')
} else {
  // Don't block startup on the scrape.
  warmRutgersListingCache()
    .then((result) => {
      const importCount = result.importedCount ?? result.lastCount ?? 0
      const mode = isSupabaseConfigured ? 'Supabase' : 'Local'
      console.log(`${mode} Rutgers listings ready: ${importCount} imported listings`)
    })
    .catch((error) => {
      console.warn(`Rutgers listing warmup failed: ${error.message}`)
    })
}

// Vercel runs the exported app as a function, so only listen when self hosted.
if (!process.env.VERCEL) {
  const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
  })

  server.on('error', (error) => {
    console.error(`Server failed to start on port ${PORT}:`, error)
    process.exit(1)
  })
}

export default app
