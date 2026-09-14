import { countMatching, DEFAULT_FILTERS, type Filters } from '../lib/filters'

// Query helpers shared by the tests and scripts/report.ts (so no test-runner imports here).

export const ADULTS: Filters = { ...DEFAULT_FILTERS, ageMin: 18 }

/** Count for `base` (adults by default) narrowed by `filters`. */
export function count(filters: Partial<Filters> = {}, base: Filters = ADULTS): number {
  return countMatching({ ...base, ...filters })
}

/** Share of the people matching `given` who also match `filters`. */
export function share(filters: Partial<Filters>, given: Partial<Filters> = {}, base: Filters = ADULTS): number {
  const denominator = count(given, base)
  return denominator === 0 ? 0 : count({ ...given, ...filters }, base) / denominator
}

/** Share of the people matching `given` but not `excluded` who match `filters`. */
export function shareExcluding(
  filters: Partial<Filters>,
  excluded: Partial<Filters>,
  given: Partial<Filters> = {},
): number {
  const denominator = count(given) - count({ ...given, ...excluded })
  const numerator = count({ ...given, ...filters }) - count({ ...given, ...excluded, ...filters })
  return denominator === 0 ? 0 : numerator / denominator
}

export function pct(x: number): string {
  return `${(x * 100).toFixed(1)}%`
}

/** Deterministic pseudo-random numbers (mulberry32), so failures reproduce. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
