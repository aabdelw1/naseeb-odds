import type { EstimateLevel } from '../data/estimates'
import type { Filters } from './filterOptions'
import { activeFilterCount, buildEntry, type Searcher } from './searchLog'

// Sends settled searches to the search-log Worker (worker/index.ts). Only from the live site,
// only once a search has sat still, and only while the visit is a reasonable length.

/** The deployed Worker; see worker/README.md. */
export const SEARCH_LOG_URL = 'https://naseeb-odds-log.ammar-s-nasr.workers.dev/search'

/** How long a search has to sit still before it counts, so a dragged slider logs once. */
export const SEARCH_SETTLE_MS = 2000

/** Plenty for a long, curious visit; past this the visit stops sending. */
export const MAX_SEARCHES_PER_VISIT = 60

/** Random per page load and kept only in memory, so it can never link two visits. */
const visit = randomVisitId()
let sent = 0

export function logSearch(searcher: Searcher | null, estimate: EstimateLevel, filters: Filters, count: number): boolean {
  if (!isLiveSite() || sent >= MAX_SEARCHES_PER_VISIT || activeFilterCount(filters) === 0) return false
  sent += 1
  const body = JSON.stringify(buildEntry(visit, searcher, estimate, filters, count))
  try {
    // A plain-text beacon is a "simple" request: no preflight, and it still arrives if the
    // reader closes the tab straight after searching.
    if (navigator.sendBeacon?.(SEARCH_LOG_URL, body)) return true
    void fetch(SEARCH_LOG_URL, { method: 'POST', body, keepalive: true, headers: { 'Content-Type': 'text/plain' } })
    return true
  } catch {
    // Logging must never break the calculator.
    return false
  }
}

function isLiveSite(): boolean {
  return import.meta.env.PROD && typeof window !== 'undefined' && window.location.hostname === 'naseebodds.com'
}

function randomVisitId(): string {
  const bytes = new Uint8Array(16)
  globalThis.crypto.getRandomValues(bytes)
  return Array.from(bytes, (byte) => (byte % 36).toString(36)).join('')
}
