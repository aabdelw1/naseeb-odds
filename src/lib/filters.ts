import { EDUCATION_LEVELS, type Birthplace, type EducationLevel, type Nativity } from '../data/background'
import { ESTIMATES, type EstimateLevel } from '../data/estimates'
import {
  AGE_MAX,
  AGE_MIN,
  ETHNIC_GROUPS,
  HEIGHT_MAX,
  HEIGHT_MIN,
  HEIGHT_SD,
  TOTAL_POPULATION,
  US_MUSLIM_POPULATION,
  type Ethnicity,
  type MaritalStatus,
  type Sex,
} from '../data/population'
import { PRAYER_MOSQUE_CORRELATION, type Sect } from '../data/religion'
import { CELLS, incomeShare } from './model'
import { logit, normalCdf, sigmoid } from './stats'

export type { MaritalStatus }

export type SexFilter = 'any' | Sex

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
  /** Minimum annual personal earnings; 0 means any. */
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

export function countActiveBasic(filters: Filters): number {
  return [
    filters.sex !== 'any',
    filters.ageMin !== AGE_MIN || filters.ageMax !== AGE_MAX,
    filters.ethnicities.length !== ALL_ETHNICITIES.length,
    filters.heightMin !== HEIGHT_MIN || filters.heightMax !== HEIGHT_MAX,
    filters.marital.length !== ALL_MARITAL_STATUSES.length,
    filters.minIncome > 0,
  ].filter(Boolean).length
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

/** Muslims of all ages under an estimate level. */
export function totalPopulation(estimate: EstimateLevel = 'realistic'): number {
  return Math.round((TOTAL_POPULATION * ESTIMATES[estimate].population) / US_MUSLIM_POPULATION)
}

export function countMatching(filters: Filters, estimate: EstimateLevel = 'realistic'): number {
  const { population, practiceShift, earningsFactor } = ESTIMATES[estimate]
  const scale = population / US_MUSLIM_POPULATION
  const practice = (p: number) => (practiceShift === 0 ? p : sigmoid(logit(p) + practiceShift))
  const lo = filters.ageMin
  const hi = filters.ageMax + 1
  const ethnicities = new Set(filters.ethnicities)
  const marital = new Set(filters.marital)
  const sects = new Set(filters.sects)
  const nativity = new Set(filters.nativity)
  const minEducationRank = filters.minEducation === 'any' ? -1 : EDUCATION_LEVELS.indexOf(filters.minEducation)
  const heights = heightShares(filters)
  // Height, prayer, mosque and education are only modelled for adults.
  const adultsOnly = heights !== null || filters.praysFiveDaily || filters.mosqueWeekly || minEducationRank >= 0

  let count = 0
  for (const cell of CELLS) {
    const { band } = cell
    // Assume people are spread evenly across a band's years.
    const overlap = Math.min(hi, band.max) - Math.max(lo, band.min)
    if (overlap <= 0) continue
    if (adultsOnly && !cell.adult) continue
    if (filters.sex !== 'any' && cell.sex !== filters.sex) continue
    if (!ethnicities.has(cell.ethnicity) || !marital.has(cell.marital)) continue
    if (!sects.has(cell.sect) || !nativity.has(cell.nativity)) continue
    if (cell.educationRank < minEducationRank) continue

    let share = overlap / (band.max - band.min)
    if (heights) share *= heights[cell.sex][cell.ethnicity][cell.birthplace]
    if (filters.minIncome > 0) share *= incomeShare(cell, filters.minIncome, cell.medianIncome * earningsFactor)
    if (filters.praysFiveDaily && filters.mosqueWeekly) {
      share *= bothPractices(practice(cell.praysFiveDaily), practice(cell.mosqueWeekly))
    } else if (filters.praysFiveDaily) {
      share *= practice(cell.praysFiveDaily)
    } else if (filters.mosqueWeekly) {
      share *= practice(cell.mosqueWeekly)
    }
    if (filters.convert !== 'any') share *= filters.convert === 'convert' ? cell.convert : 1 - cell.convert
    count += cell.weight * scale * share
  }
  return Math.round(count)
}

/** Probability of both practices, part way between independent and maximally overlapping. */
function bothPractices(prays: number, mosque: number): number {
  const independent = prays * mosque
  return independent + PRAYER_MOSQUE_CORRELATION * (Math.min(prays, mosque) - independent)
}

type HeightShares = Record<Sex, Record<Ethnicity, Record<Birthplace, number>>>

/** Share within the height range by sex, ethnicity and birthplace, or null when height isn't limited. */
function heightShares(filters: Filters): HeightShares | null {
  const noLower = filters.heightMin <= HEIGHT_MIN
  const noUpper = filters.heightMax >= HEIGHT_MAX
  if (noLower && noUpper) return null
  // Heights are whole inches, so 5'10" covers everyone from 5'9.5" to 5'10.5".
  const lower = noLower ? -Infinity : filters.heightMin - 0.5
  const upper = noUpper ? Infinity : filters.heightMax + 0.5
  const between = (mean: number, sd: number) => normalCdf((upper - mean) / sd) - normalCdf((lower - mean) / sd)
  const forSex = (sex: Sex) =>
    Object.fromEntries(
      (Object.keys(ETHNIC_GROUPS) as Ethnicity[]).map((ethnicity) => {
        const { immigrant, usBorn } = ETHNIC_GROUPS[ethnicity].meanHeight
        return [
          ethnicity,
          { immigrant: between(immigrant[sex], HEIGHT_SD[sex]), usBorn: between(usBorn[sex], HEIGHT_SD[sex]) },
        ]
      }),
    ) as Record<Ethnicity, Record<Birthplace, number>>
  return { male: forSex('male'), female: forSex('female') }
}
