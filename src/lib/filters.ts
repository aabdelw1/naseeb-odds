import {
  ADULT_AGE,
  ADULT_SEX_SHARE,
  AGE_BANDS,
  AGE_MAX,
  AGE_MIN,
  CHILD_SEX_SHARE,
  ETHNIC_GROUPS,
  FEMALE_INCOME_FACTOR,
  HEIGHT_MAX,
  HEIGHT_MIN,
  HEIGHT_SD,
  INCOME_SIGMA,
  type AgeBand,
  type Ethnicity,
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

export const ALL_ETHNICITIES: Ethnicity[] = ['arab', 'black', 'desi', 'white', 'other']

/** Slider stops for minimum income; 0 means any. */
export const INCOME_STEPS = [0, 25_000, 50_000, 75_000, 100_000, 150_000, 200_000, 250_000]

export interface Filters {
  sex: SexFilter
  /** Inclusive. */
  ageMin: number
  /** Inclusive. */
  ageMax: number
  /** Groups to include; empty matches nobody. */
  ethnicities: Ethnicity[]
  /** Inches, inclusive; HEIGHT_MIN means no lower limit. */
  heightMin: number
  /** Inches, inclusive; HEIGHT_MAX means no upper limit. */
  heightMax: number
  /** Statuses to include; empty matches nobody. */
  marital: MaritalStatus[]
  /** Minimum annual earnings; 0 means any. */
  minIncome: number
}

export const DEFAULT_FILTERS: Filters = {
  sex: 'any',
  ageMin: AGE_MIN,
  ageMax: AGE_MAX,
  ethnicities: ALL_ETHNICITIES,
  heightMin: HEIGHT_MIN,
  heightMax: HEIGHT_MAX,
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
    const sexShares = band.min >= ADULT_AGE ? ADULT_SEX_SHARE : CHILD_SEX_SHARE
    for (const sex of sexes) {
      const income = incomeShare(band, sex, filters.minIncome)
      for (const ethnicity of filters.ethnicities) {
        const group = ETHNIC_GROUPS[ethnicity]
        const height = heightShare(band, sex, group.meanHeight[sex], filters)
        count += inAgeRange * sexShares[sex] * marital * income * group.share * height
      }
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

/** Share within the height range, assuming normally distributed adult heights. */
function heightShare(band: AgeBand, sex: Sex, meanHeight: number, filters: Filters): number {
  const noLower = filters.heightMin <= HEIGHT_MIN
  const noUpper = filters.heightMax >= HEIGHT_MAX
  if (noLower && noUpper) return 1
  // Children's heights aren't modelled, so any height limit leaves them out.
  if (band.min < ADULT_AGE) return 0
  // Heights are whole inches, so 5'10" covers everyone from 5'9.5" to 5'10.5".
  const lower = noLower ? -Infinity : filters.heightMin - 0.5
  const upper = noUpper ? Infinity : filters.heightMax + 0.5
  const sd = HEIGHT_SD[sex]
  return normalCdf((upper - meanHeight) / sd) - normalCdf((lower - meanHeight) / sd)
}

/** Abramowitz–Stegun 7.1.26 erf approximation, accurate to ~1e-7. */
function normalCdf(z: number): number {
  if (z === Infinity) return 1
  if (z === -Infinity) return 0
  const x = Math.abs(z) / Math.SQRT2
  const t = 1 / (1 + 0.3275911 * x)
  const poly = ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t
  const erf = 1 - poly * Math.exp(-x * x)
  return z >= 0 ? (1 + erf) / 2 : (1 - erf) / 2
}
