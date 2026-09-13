import {
  AGE_BANDS,
  AGE_MAX,
  AGE_MIN,
  FEMALE_INCOME_FACTOR,
  INCOME_SIGMA,
  SEX_SHARE,
  type AgeBand,
  type Sex,
} from '../data/population'

export type SexFilter = 'any' | Sex

export type MaritalStatus = 'neverMarried' | 'divorcedNoKids' | 'divorcedWithKids' | 'widowed' | 'married'

export const ALL_MARITAL_STATUSES: MaritalStatus[] = [
  'neverMarried',
  'divorcedNoKids',
  'divorcedWithKids',
  'widowed',
  'married',
]

/** Slider stops for minimum income; 0 means any. */
export const INCOME_STEPS = [0, 25_000, 50_000, 75_000, 100_000, 150_000, 200_000, 250_000]

export interface Filters {
  sex: SexFilter
  /** Inclusive. */
  ageMin: number
  /** Inclusive. */
  ageMax: number
  /** Statuses to include; empty matches nobody. */
  marital: MaritalStatus[]
  /** Minimum annual earnings; 0 means any. */
  minIncome: number
}

export const DEFAULT_FILTERS: Filters = {
  sex: 'any',
  ageMin: AGE_MIN,
  ageMax: AGE_MAX,
  marital: ALL_MARITAL_STATUSES,
  minIncome: 0,
}

export function countMatching(filters: Filters): number {
  const lo = filters.ageMin
  const hi = filters.ageMax + 1
  const sexes: Sex[] = filters.sex === 'any' ? ['male', 'female'] : [filters.sex]
  let count = 0
  for (const band of AGE_BANDS) {
    // Assume people are spread evenly across a band's years.
    const overlap = Math.max(0, Math.min(hi, band.max) - Math.max(lo, band.min))
    if (overlap === 0) continue
    const inAgeRange = (band.count * overlap) / (band.max - band.min)
    const marital = maritalShare(band, filters.marital)
    for (const sex of sexes) {
      // Treats marital status and income as independent within an age band and sex.
      count += inAgeRange * SEX_SHARE[sex] * marital * incomeShare(band, sex, filters.minIncome)
    }
  }
  return Math.round(count)
}

function maritalShare(band: AgeBand, statuses: MaritalStatus[]): number {
  const { neverMarried, married, divorced, widowed } = band.marital
  const shares: Record<MaritalStatus, number> = {
    neverMarried,
    married,
    widowed,
    divorcedNoKids: divorced * (1 - band.divorcedWithKids),
    divorcedWithKids: divorced * band.divorcedWithKids,
  }
  return statuses.reduce((sum, status) => sum + shares[status], 0)
}

/** Share of the band earning at least `minIncome`, assuming log-normal earnings among earners. */
function incomeShare(band: AgeBand, sex: Sex, minIncome: number): number {
  if (minIncome <= 0) return 1
  const factor = sex === 'female' ? FEMALE_INCOME_FACTOR : { earners: 1, medianIncome: 1 }
  const earners = band.earners * factor.earners
  if (earners === 0) return 0
  const median = band.medianIncome * factor.medianIncome
  const z = Math.log(minIncome / median) / INCOME_SIGMA
  return earners * (1 - normalCdf(z))
}

/** Abramowitz–Stegun 7.1.26 erf approximation, accurate to ~1e-7. */
function normalCdf(z: number): number {
  const x = Math.abs(z) / Math.SQRT2
  const t = 1 / (1 + 0.3275911 * x)
  const poly = ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t
  const erf = 1 - poly * Math.exp(-x * x)
  return z >= 0 ? (1 + erf) / 2 : (1 - erf) / 2
}
