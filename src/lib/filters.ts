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
import { PRACTICE_CORRELATION, type Sect } from '../data/religion'
import { BAY_AREA_CELLS, CELLS, incomeShare } from './model'
import { logit, normalCdf, sigmoid } from './stats'

export type { MaritalStatus }

export type SexFilter = 'any' | Sex

export type Region = 'us' | 'bayArea'

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
  region: Region
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
  praysFiveDaily: boolean
  mosqueWeekly: boolean
  /** Women only, so it matches nobody when brothers are being counted. */
  wearsHijab: boolean
  /** Sects to include; empty matches nobody. */
  sects: Sect[]
  minEducation: MinEducation
  /** Generations to include; empty matches nobody. */
  nativity: Nativity[]
  convert: ConvertFilter
}

export const DEFAULT_FILTERS: Filters = {
  region: 'us',
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
  wearsHijab: false,
  sects: ALL_SECTS,
  minEducation: 'any',
  nativity: ALL_NATIVITIES,
  convert: 'any',
}

export type FilterTab = 'basics' | 'life' | 'deen'

/** How many filters on each tab differ from their defaults. */
export function countActive(filters: Filters): Record<FilterTab, number> {
  const active = (checks: boolean[]) => checks.filter(Boolean).length
  return {
    basics: active([
      filters.region !== 'us',
      filters.sex !== 'any',
      filters.ageMin !== AGE_MIN || filters.ageMax !== AGE_MAX,
      filters.ethnicities.length !== ALL_ETHNICITIES.length,
      filters.nativity.length !== ALL_NATIVITIES.length,
    ]),
    life: active([
      filters.marital.length !== ALL_MARITAL_STATUSES.length,
      filters.heightMin !== HEIGHT_MIN || filters.heightMax !== HEIGHT_MAX,
      filters.minEducation !== 'any',
      filters.minIncome > 0,
    ]),
    deen: active([
      filters.praysFiveDaily,
      filters.mosqueWeekly,
      filters.wearsHijab,
      filters.sects.length !== ALL_SECTS.length,
      filters.convert !== 'any',
    ]),
  }
}

/** Muslims of all ages in a region under an estimate level. */
export function totalPopulation(estimate: EstimateLevel = 'realistic', region: Region = 'us'): number {
  if (region === 'bayArea') return ESTIMATES[estimate].bayAreaPopulation
  return Math.round((TOTAL_POPULATION * ESTIMATES[estimate].population) / US_MUSLIM_POPULATION)
}

export function countMatching(filters: Filters, estimate: EstimateLevel = 'realistic'): number {
  const { population, bayAreaPopulation, practiceShift, earningsFactor } = ESTIMATES[estimate]
  const bayArea = filters.region === 'bayArea'
  const cells = bayArea ? BAY_AREA_CELLS : CELLS
  // Both cell sets are built at the realistic level; other levels scale their totals.
  const scale = bayArea
    ? bayAreaPopulation / ESTIMATES.realistic.bayAreaPopulation
    : population / US_MUSLIM_POPULATION
  const practice = (p: number) => (practiceShift === 0 ? p : sigmoid(logit(p) + practiceShift))
  const lo = filters.ageMin
  // The top of the slider means that age and older.
  const hi = filters.ageMax >= AGE_MAX ? Infinity : filters.ageMax + 1
  const ethnicities = new Set(filters.ethnicities)
  const marital = new Set(filters.marital)
  const sects = new Set(filters.sects)
  const nativity = new Set(filters.nativity)
  const minEducationRank = filters.minEducation === 'any' ? -1 : EDUCATION_LEVELS.indexOf(filters.minEducation)
  const heights = heightShares(filters)
  // Height, prayer, mosque and education are only modelled for adults.
  const adultsOnly =
    heights !== null || filters.praysFiveDaily || filters.mosqueWeekly || filters.wearsHijab || minEducationRank >= 0

  let count = 0
  for (const cell of cells) {
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
    const practices: number[] = []
    if (filters.praysFiveDaily) practices.push(practice(cell.praysFiveDaily))
    if (filters.mosqueWeekly) practices.push(practice(cell.mosqueWeekly))
    // Men and children have no hijab probability, so they drop out here. Converts and born
    // Muslims cover at different rates within the same cell, so follow the convert filter.
    if (filters.wearsHijab) {
      const hijab =
        filters.convert === 'convert'
          ? cell.wearsHijabConvert
          : filters.convert === 'bornMuslim'
            ? cell.wearsHijabBornMuslim
            : cell.wearsHijab
      practices.push(hijab === 0 ? 0 : practice(hijab))
    }
    if (practices.length > 0) share *= allPractices(practices)
    if (filters.convert !== 'any') share *= filters.convert === 'convert' ? cell.convert : 1 - cell.convert
    count += cell.weight * scale * share
  }
  return Math.round(count)
}

/** Probability of keeping every one of these practices, part way between independent and maximally overlapping. */
function allPractices(chances: number[]): number {
  return chances.reduce((both, chance) => {
    const independent = both * chance
    return independent + PRACTICE_CORRELATION * (Math.min(both, chance) - independent)
  })
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
