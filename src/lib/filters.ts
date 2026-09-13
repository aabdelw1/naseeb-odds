import { AGE_BANDS, AGE_MAX, AGE_MIN, SEX_SHARE, type Sex } from '../data/population'

export type SexFilter = 'any' | Sex

export interface Filters {
  sex: SexFilter
  /** Inclusive. */
  ageMin: number
  /** Inclusive. */
  ageMax: number
}

export const DEFAULT_FILTERS: Filters = { sex: 'any', ageMin: AGE_MIN, ageMax: AGE_MAX }

export function countMatching(filters: Filters): number {
  const lo = filters.ageMin
  const hi = filters.ageMax + 1
  let count = 0
  for (const band of AGE_BANDS) {
    // Assume people are spread evenly across a band's years.
    const overlap = Math.max(0, Math.min(hi, band.max) - Math.max(lo, band.min))
    count += (band.count * overlap) / (band.max - band.min)
  }
  const share = filters.sex === 'any' ? 1 : SEX_SHARE[filters.sex]
  return Math.round(count * share)
}
