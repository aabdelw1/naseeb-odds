import type { EducationLevel, Nativity } from '../data/background'
import { AGE_MAX, AGE_MIN, HEIGHT_MAX, HEIGHT_MIN, type Ethnicity, type MaritalStatus, type Sex } from '../data/population'
import type { Sect } from '../data/religion'

// The shape of a search and every value it can take, kept apart from the model in filters.ts.
// Importing filters.ts builds the whole synthetic population, which is fine in the app but far
// too slow for the search-log Worker, so anything the Worker needs to validate lives here.

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
  /** Applies to women only; brothers in the same search are left alone. */
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
