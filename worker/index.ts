import { MAX_ENTRY_BYTES, toSearchLogRow, type SearchLogRow } from '../src/lib/searchLog'

// The search log: a Cloudflare Worker that takes one settled search from naseebodds.com and
// stores it in D1. It checks the entry against the same rules the app builds it with, and it
// keeps searches, not people: the connection address is used only to rate-limit and is never
// written down. Deployed with `npm run log:deploy`; see worker/README.md.

export interface Env {
  DB: Database
  LIMITER: Limiter
  /** Comma-separated origins allowed to log searches. */
  ALLOWED_ORIGINS: string
}

// The two bindings, described just far enough to use them, so the Worker needs no extra types
// package and the tests can pass in stand-ins.
export interface Database {
  prepare(sql: string): { bind(...values: unknown[]): { run(): Promise<unknown> } }
}

export interface Limiter {
  limit(options: { key: string }): Promise<{ success: boolean }>
}

const COLUMNS = [
  'hour',
  'country',
  'visit',
  'searcher',
  'estimate',
  'looking_for',
  'age_min',
  'age_max',
  'ethnicities',
  'nativity',
  'marital',
  'height_min',
  'height_max',
  'min_education',
  'min_income',
  'prays',
  'mosque',
  'hijab',
  'sects',
  'convert_status',
  'result_count',
  'active_filters',
]

export const INSERT_SQL = `INSERT INTO searches (${COLUMNS.join(', ')}) VALUES (${COLUMNS.map(() => '?').join(', ')})`

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get('Origin') ?? ''
    const allowed = env.ALLOWED_ORIGINS.split(',').map((value) => value.trim())
    const cors: Record<string, string> = allowed.includes(origin)
      ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' }
      : {}

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          ...cors,
          'Access-Control-Allow-Methods': 'POST',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400',
        },
      })
    }
    if (new URL(request.url).pathname !== '/search') return new Response('Not found', { status: 404 })
    if (request.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: { Allow: 'POST' } })
    if (!allowed.includes(origin)) return new Response('Forbidden', { status: 403 })

    // Rate-limited per connection address, which is used for this check and nothing else.
    const address = request.headers.get('CF-Connecting-IP') ?? 'unknown'
    if (!(await env.LIMITER.limit({ key: address })).success) {
      return new Response('Too many requests', { status: 429, headers: cors })
    }

    if (Number(request.headers.get('Content-Length') ?? 0) > MAX_ENTRY_BYTES) {
      return new Response('Too large', { status: 413, headers: cors })
    }
    const text = await request.text()
    if (text.length > MAX_ENTRY_BYTES) return new Response('Too large', { status: 413, headers: cors })

    let body: unknown
    try {
      body = JSON.parse(text)
    } catch {
      return new Response('Bad request', { status: 400, headers: cors })
    }
    const row = toSearchLogRow(body)
    if (!row) return new Response('Bad request', { status: 400, headers: cors })
    // Nothing chosen yet; the app doesn't send these, but don't store them if something does.
    if (row.activeFilters === 0) return new Response(null, { status: 204, headers: cors })

    await env.DB.prepare(INSERT_SQL)
      .bind(...insertValues(row, new Date(), countryOf(request)))
      .run()
    return new Response(null, { status: 204, headers: cors })
  },
}

/** Values for INSERT_SQL, in column order. The time is kept only to the hour. */
export function insertValues(row: SearchLogRow, now: Date, country: string | null): unknown[] {
  return [
    now.toISOString().slice(0, 13),
    country,
    row.visit,
    row.searcher,
    row.estimate,
    row.lookingFor,
    row.ageMin,
    row.ageMax,
    row.ethnicities,
    row.nativity,
    row.marital,
    row.heightMin,
    row.heightMax,
    row.minEducation,
    row.minIncome,
    row.prays,
    row.mosque,
    row.hijab,
    row.sects,
    row.convert,
    row.resultCount,
    row.activeFilters,
  ]
}

/** Two-letter country code Cloudflare attaches to the request, or null. */
function countryOf(request: Request): string | null {
  const country = (request as Request & { cf?: { country?: unknown } }).cf?.country
  return typeof country === 'string' && /^[A-Z]{2}$/.test(country) ? country : null
}
