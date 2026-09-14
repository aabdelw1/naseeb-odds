import {
  CHILD_NATIVITY,
  CONVERT_SHARE,
  DEGREE_AGE_FACTOR,
  EDUCATION_BY_BIRTHPLACE,
  type EducationLevel,
  type Nativity,
} from '../data/background'
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
  type EthnicGroup,
  type Ethnicity,
  type Sex,
} from '../data/population'
import {
  MOSQUE_WEEKLY_BY_SEX,
  MOSQUE_WEEKLY_OVERALL,
  PRAYS_FIVE_DAILY_BY_AGE,
  PRAYS_FIVE_DAILY_BY_SEX,
  PRAYS_FIVE_DAILY_OVERALL,
  SECTS,
  type Sect,
} from '../data/religion'

export type SexFilter = 'any' | Sex

export type MaritalStatus = 'neverMarried' | 'divorcedNoKids' | 'divorcedWithKids' | 'widowed' | 'married'

export type MinEducation = 'any' | Exclude<EducationLevel, 'lessThanHighSchool'>

export type ConvertFilter = 'any' | 'bornMuslim' | 'convert'

export const ALL_MARITAL_STATUSES: MaritalStatus[] = [
  'neverMarried',
  'divorcedNoKids',
  'divorcedWithKids',
  'widowed',
  'married',
]

export const ALL_ETHNICITIES: Ethnicity[] = ['arab', 'black', 'desi', 'white', 'other']

export const ALL_SECTS: Sect[] = ['sunni', 'shia', 'justMuslim', 'other']

export const ALL_NATIVITIES: Nativity[] = ['immigrant', 'secondGen', 'thirdGen']

/** Slider stops for minimum income; 0 means any. */
export const INCOME_STEPS = [0, 25_000, 50_000, 75_000, 100_000, 150_000, 200_000, 250_000]

export const EDUCATION_STEPS: MinEducation[] = ['any', 'highSchool', 'someCollege', 'bachelors', 'graduate']

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

  // Advanced filters.
  praysFiveDaily: boolean
  mosqueWeekly: boolean
  /** Sects to include; empty matches nobody. */
  sects: Sect[]
  minEducation: MinEducation
  /** Generations to include; empty matches nobody. */
  nativity: Nativity[]
  convert: ConvertFilter
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
  praysFiveDaily: false,
  mosqueWeekly: false,
  sects: ALL_SECTS,
  minEducation: 'any',
  nativity: ALL_NATIVITIES,
  convert: 'any',
}

export function countActiveAdvanced(filters: Filters): number {
  return [
    filters.praysFiveDaily,
    filters.mosqueWeekly,
    filters.sects.length !== ALL_SECTS.length,
    filters.minEducation !== 'any',
    filters.nativity.length !== ALL_NATIVITIES.length,
    filters.convert !== 'any',
  ].filter(Boolean).length
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
      const religion = religionShare(band, sex, filters)
      for (const ethnicity of filters.ethnicities) {
        const group = ETHNIC_GROUPS[ethnicity]
        const height = heightShare(band, sex, group.meanHeight[sex], filters)
        const background = backgroundShare(band, group, filters)
        count += inAgeRange * sexShares[sex] * marital * income * group.share * height * religion * background
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

/** Share in the chosen sects who also meet the prayer and mosque filters. */
function religionShare(band: AgeBand, sex: Sex, filters: Filters): number {
  // Practice is only surveyed for adults, so those filters leave children out.
  if (band.min < ADULT_AGE && (filters.praysFiveDaily || filters.mosqueWeekly)) return 0
  let share = 0
  for (const sect of filters.sects) {
    const data = SECTS[sect]
    let p = data.share
    // Pew reports each rate by sex, sect and age separately, so combine them as
    // independent multipliers around the overall rate.
    if (filters.praysFiveDaily) {
      const age = PRAYS_FIVE_DAILY_BY_AGE.find((a) => band.min >= a.minAge)!.rate
      const rate =
        PRAYS_FIVE_DAILY_BY_SEX[sex] *
        (age / PRAYS_FIVE_DAILY_OVERALL) *
        (data.praysFiveDaily / PRAYS_FIVE_DAILY_OVERALL)
      p *= Math.min(rate, 0.95)
    }
    if (filters.mosqueWeekly) {
      p *= Math.min(MOSQUE_WEEKLY_BY_SEX[sex] * (data.mosqueWeekly / MOSQUE_WEEKLY_OVERALL), 0.95)
    }
    share += p
  }
  return share
}

/** Share in the chosen generations who also meet the education and convert filters. */
function backgroundShare(band: AgeBand, group: EthnicGroup, filters: Filters): number {
  const adult = band.min >= ADULT_AGE
  // Education is only surveyed for adults, so an education filter leaves children out.
  if (!adult && filters.minEducation !== 'any') return 0
  const mix = adult ? group.nativity : CHILD_NATIVITY
  let share = 0
  for (const nativity of filters.nativity) {
    let p = mix[nativity]
    if (filters.minEducation !== 'any') p *= educationShare(band, nativity, filters.minEducation)
    if (filters.convert !== 'any') {
      const convert = adult ? CONVERT_SHARE[nativity] : 0
      p *= filters.convert === 'convert' ? convert : 1 - convert
    }
    share += p
  }
  return share
}

function educationShare(band: AgeBand, nativity: Nativity, minEducation: Exclude<MinEducation, 'any'>): number {
  const s = EDUCATION_BY_BIRTHPLACE[nativity === 'immigrant' ? 'immigrant' : 'usBorn']
  const factor = DEGREE_AGE_FACTOR.find((f) => band.min < f.belowAge) ?? { bachelors: 1, graduate: 1 }
  switch (minEducation) {
    case 'highSchool':
      return 1 - s.lessThanHighSchool
    case 'someCollege':
      return s.someCollege + s.bachelors + s.graduate
    case 'bachelors':
      return (s.bachelors + s.graduate) * factor.bachelors
    case 'graduate':
      return s.graduate * factor.graduate
  }
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
