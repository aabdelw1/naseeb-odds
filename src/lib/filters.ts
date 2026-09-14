import { EDUCATION_LEVELS, type EducationLevel, type Nativity } from '../data/background'
import {
  AGE_MAX,
  AGE_MIN,
  ETHNIC_GROUPS,
  HEIGHT_MAX,
  HEIGHT_MIN,
  HEIGHT_SD,
  type Ethnicity,
  type MaritalStatus,
  type Sex,
} from '../data/population'
import { PRAYER_MOSQUE_CORRELATION, type Sect } from '../data/religion'
import { CELLS, incomeShare } from './model'
import { normalCdf } from './stats'

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
    if (heights) share *= heights[cell.sex][cell.ethnicity]
    if (filters.minIncome > 0) share *= incomeShare(cell, filters.minIncome)
    if (filters.praysFiveDaily && filters.mosqueWeekly) {
      share *= bothPractices(cell.praysFiveDaily, cell.mosqueWeekly)
    } else if (filters.praysFiveDaily) {
      share *= cell.praysFiveDaily
    } else if (filters.mosqueWeekly) {
      share *= cell.mosqueWeekly
    }
    if (filters.convert !== 'any') share *= filters.convert === 'convert' ? cell.convert : 1 - cell.convert
    count += cell.weight * share
  }
  return Math.round(count)
}

/** Probability of both practices, part way between independent and maximally overlapping. */
function bothPractices(prays: number, mosque: number): number {
  const independent = prays * mosque
  return independent + PRAYER_MOSQUE_CORRELATION * (Math.min(prays, mosque) - independent)
}

/** Share of each sex and ethnicity within the height range, or null when height isn't limited. */
function heightShares(filters: Filters): Record<Sex, Record<Ethnicity, number>> | null {
  const noLower = filters.heightMin <= HEIGHT_MIN
  const noUpper = filters.heightMax >= HEIGHT_MAX
  if (noLower && noUpper) return null
  // Heights are whole inches, so 5'10" covers everyone from 5'9.5" to 5'10.5".
  const lower = noLower ? -Infinity : filters.heightMin - 0.5
  const upper = noUpper ? Infinity : filters.heightMax + 0.5
  const shareFor = (sex: Sex) =>
    Object.fromEntries(
      (Object.keys(ETHNIC_GROUPS) as Ethnicity[]).map((ethnicity) => {
        const mean = ETHNIC_GROUPS[ethnicity].meanHeight[sex]
        const sd = HEIGHT_SD[sex]
        return [ethnicity, normalCdf((upper - mean) / sd) - normalCdf((lower - mean) / sd)]
      }),
    ) as Record<Ethnicity, number>
  return { male: shareFor('male'), female: shareFor('female') }
}
