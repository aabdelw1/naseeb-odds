import { describe, expect, it, vi } from 'vitest'
import schema from '../../worker/schema.sql?raw'
import worker, { INSERT_SQL, type Env } from '../../worker/index'
import { DEFAULT_FILTERS, type Filters } from '../lib/filterOptions'
import { buildEntry, encodeList, toSearchLogRow, type SearchLogEntry } from '../lib/searchLog'
import { logSearch, SEARCH_LOG_URL } from '../lib/searchLogClient'

const VISIT = 'abc123def456ghi7'
const SEARCH: Filters = {
  ...DEFAULT_FILTERS,
  sex: 'female',
  ageMin: 25,
  ageMax: 30,
  ethnicities: ['desi', 'arab'],
  praysFiveDaily: true,
  wearsHijab: true,
}
const entry = (overrides: Partial<SearchLogEntry> = {}): SearchLogEntry => ({
  ...buildEntry(VISIT, 'brother', 'realistic', SEARCH, 1234),
  ...overrides,
})
const withFilters = (filters: Partial<Filters>) => entry({ filters: { ...SEARCH, ...filters } })

describe('checking a logged search', () => {
  it('flattens a real search into columns', () => {
    expect(toSearchLogRow(entry())).toMatchObject({
      visit: VISIT,
      searcher: 'brother',
      lookingFor: 'female',
      ageMin: 25,
      ageMax: 30,
      ethnicities: 'arab,desi',
      nativity: 'all',
      prays: 1,
      hijab: 1,
      mosque: 0,
      resultCount: 1234,
      activeFilters: 5,
    })
  })

  it('writes chip selections the same way however they were picked', () => {
    expect(encodeList(['desi', 'arab', 'desi'], ['arab', 'black', 'desi'])).toBe('arab,desi')
    expect(encodeList([], ['arab', 'black'])).toBe('none')
    expect(encodeList(['black', 'arab'], ['arab', 'black'])).toBe('all')
  })

  it('accepts a visitor who skipped the brother or sister question', () => {
    expect(toSearchLogRow(entry({ searcher: null }))?.searcher).toBeNull()
  })

  it.each([
    ['a wrong version', { ...entry(), v: 2 }],
    ['a visit id that could be anything', entry({ visit: 'Robert"); DROP TABLE searches;--' })],
    ['an unknown searcher', { ...entry(), searcher: 'aunty' }],
    ['an unknown estimate', { ...entry(), estimate: 'optimistic' }],
    ['a negative count', entry({ count: -1 })],
    ['a fractional count', entry({ count: 1.5 })],
    ['an age off the slider', withFilters({ ageMin: -5 })],
    ['an age range upside down', withFilters({ ageMin: 40, ageMax: 30 })],
    ['a height off the slider', withFilters({ heightMax: 99 })],
    ['an unknown ethnicity', withFilters({ ethnicities: ['arab', 'martian'] as Filters['ethnicities'] })],
    ['an income between slider stops', withFilters({ minIncome: 123_456 })],
    ['a practice that is not true or false', withFilters({ praysFiveDaily: 'yes' as unknown as boolean })],
    ['no filters object', { ...entry(), filters: null }],
    ['not an object at all', 'hello'],
  ])('rejects %s', (_, input) => {
    expect(toSearchLogRow(input)).toBeNull()
  })
})

// A stand-in for the D1 binding that records every insert.
function fakeEnv(allowed = true) {
  const inserts: { sql: string; values: unknown[] }[] = []
  const env: Env = {
    ALLOWED_ORIGINS: 'https://naseebodds.com',
    LIMITER: { limit: vi.fn(async () => ({ success: allowed })) },
    DB: {
      prepare: (sql: string) => ({
        bind: (...values: unknown[]) => ({
          run: async () => {
            inserts.push({ sql, values })
            return {}
          },
        }),
      }),
    },
  }
  return { env, inserts }
}

function post(body: unknown, origin = 'https://naseebodds.com', path = '/search') {
  const request = new Request(`https://naseeb-odds-log.example.workers.dev${path}`, {
    method: 'POST',
    headers: { Origin: origin, 'CF-Connecting-IP': '203.0.113.7', 'Content-Type': 'text/plain' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
  Object.defineProperty(request, 'cf', { value: { country: 'US' } })
  return request
}

describe('the search-log Worker', () => {
  it('stores a valid search from the site, to the hour, without the address', async () => {
    const { env, inserts } = fakeEnv()
    const response = await worker.fetch(post(entry()), env)
    expect(response.status).toBe(204)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://naseebodds.com')
    expect(inserts).toHaveLength(1)
    const [hour, country, visit] = inserts[0].values
    expect(hour).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}$/)
    expect(country).toBe('US')
    expect(visit).toBe(VISIT)
    expect(inserts[0].values).not.toContain('203.0.113.7')
  })

  it('refuses other sites', async () => {
    const { env, inserts } = fakeEnv()
    expect((await worker.fetch(post(entry(), 'https://evil.example'), env)).status).toBe(403)
    expect(inserts).toHaveLength(0)
  })

  it('refuses anything that is not a valid search', async () => {
    const { env, inserts } = fakeEnv()
    expect((await worker.fetch(post('{not json'), env)).status).toBe(400)
    expect((await worker.fetch(post({ ...entry(), estimate: 'optimistic' }), env)).status).toBe(400)
    expect((await worker.fetch(post('x'.repeat(5000)), env)).status).toBe(413)
    expect(inserts).toHaveLength(0)
  })

  it('slows down one address sending too much', async () => {
    const { env, inserts } = fakeEnv(false)
    expect((await worker.fetch(post(entry()), env)).status).toBe(429)
    expect(inserts).toHaveLength(0)
  })

  it('skips a search with nothing chosen', async () => {
    const { env, inserts } = fakeEnv()
    const empty = buildEntry(VISIT, null, 'realistic', DEFAULT_FILTERS, 4_499_999)
    expect((await worker.fetch(post(empty), env)).status).toBe(204)
    expect(inserts).toHaveLength(0)
  })

  it('answers the browser preflight, and nothing but /search', async () => {
    const { env } = fakeEnv()
    const preflight = new Request('https://naseeb-odds-log.example.workers.dev/search', {
      method: 'OPTIONS',
      headers: { Origin: 'https://naseebodds.com' },
    })
    const response = await worker.fetch(preflight, env)
    expect(response.status).toBe(204)
    expect(response.headers.get('Access-Control-Allow-Methods')).toBe('POST')
    expect((await worker.fetch(post(entry(), undefined, '/other'), env)).status).toBe(404)
    const get = new Request('https://naseeb-odds-log.example.workers.dev/search', { headers: { Origin: 'https://naseebodds.com' } })
    expect((await worker.fetch(get, env)).status).toBe(405)
  })

  it('writes exactly the columns the table has', () => {
    const table = schema.slice(schema.indexOf('CREATE TABLE'), schema.indexOf(');'))
    const columns = [...table.matchAll(/^\s{2}([a-z_]+) /gm)].map((match) => match[1]).filter((name) => name !== 'id')
    const inserted = INSERT_SQL.slice(INSERT_SQL.indexOf('(') + 1, INSERT_SQL.indexOf(')')).split(', ')
    expect(inserted).toEqual(columns)
  })
})

describe('sending from the app', () => {
  it('never sends from anywhere but the live site', () => {
    // Tests, local development and previews must not write into the real log.
    expect(logSearch('brother', 'realistic', SEARCH, 1234)).toBe(false)
  })

  it('points at the deployed Worker', () => {
    expect(SEARCH_LOG_URL).toMatch(/^https:\/\/naseeb-odds-log\.[a-z0-9-]+\.workers\.dev\/search$/)
    expect(SEARCH_LOG_URL).not.toContain('SUBDOMAIN')
  })
})
