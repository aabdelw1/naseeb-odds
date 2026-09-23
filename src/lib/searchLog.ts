import { ESTIMATE_LEVELS, type EstimateLevel } from '../data/estimates'
import { AGE_MAX, AGE_MIN, HEIGHT_MAX, HEIGHT_MIN } from '../data/population'
import {
  ALL_ETHNICITIES,
  ALL_MARITAL_STATUSES,
  ALL_NATIVITIES,
  ALL_SECTS,
  EDUCATION_STEPS,
  INCOME_STEPS,
  countActive,
  type ConvertFilter,
  type Filters,
  type SexFilter,
} from './filterOptions'

// One settled search, as the app sends it and the search-log Worker stores it. Shared by both
// sides, so the app can only build what the Worker will accept. Deliberately about searches,
// not people: nothing here can identify who made one. See worker/README.md.

export const SEARCHERS = ['brother', 'sister', 'browsing'] as const
export type Searcher = (typeof SEARCHERS)[number]

/** Bumped whenever the entry shape changes, so old and new rows can be told apart. */
export const SEARCH_LOG_VERSION = 1

/** Random per page load and held only in memory, so it can never follow a person between visits. */
const VISIT_PATTERN = /^[a-z0-9]{12,32}$/

/** Larger than any real payload; the Worker refuses anything bigger before parsing it. */
export const MAX_ENTRY_BYTES = 4096

export interface SearchLogEntry {
  v: typeof SEARCH_LOG_VERSION
  visit: string
  searcher: Searcher | null
  estimate: EstimateLevel
  filters: Filters
  count: number
}

/** A validated entry, flattened into database columns. */
export interface SearchLogRow {
  visit: string
  searcher: Searcher | null
  estimate: EstimateLevel
  lookingFor: SexFilter
  ageMin: number
  ageMax: number
  ethnicities: string
  nativity: string
  marital: string
  heightMin: number
  heightMax: number
  minEducation: string
  minIncome: number
  prays: 0 | 1
  mosque: 0 | 1
  hijab: 0 | 1
  sects: string
  convert: ConvertFilter
  resultCount: number
  activeFilters: number
}

export function buildEntry(
  visit: string,
  searcher: Searcher | null,
  estimate: EstimateLevel,
  filters: Filters,
  count: number,
): SearchLogEntry {
  return { v: SEARCH_LOG_VERSION, visit, searcher, estimate, filters, count }
}

/** Filters that differ from the defaults; a search with none isn't worth logging. */
export function activeFilterCount(filters: Filters): number {
  return Object.values(countActive(filters)).reduce((sum, active) => sum + active, 0)
}

/** Checks an entry from the network and flattens it, or returns null if anything is off. */
export function toSearchLogRow(input: unknown): SearchLogRow | null {
  if (!isRecord(input) || input.v !== SEARCH_LOG_VERSION) return null
  const { visit, searcher, estimate, filters, count } = input
  if (typeof visit !== 'string' || !VISIT_PATTERN.test(visit)) return null
  if (searcher !== null && !oneOf(searcher, SEARCHERS)) return null
  if (!oneOf(estimate, ESTIMATE_LEVELS)) return null
  if (!Number.isInteger(count) || (count as number) < 0 || (count as number) > 10_000_000) return null
  if (!isRecord(filters)) return null

  const f = filters
  if (!oneOf(f.sex, ['any', 'male', 'female'] as const)) return null
  if (!oneOf(f.convert, ['any', 'bornMuslim', 'convert'] as const)) return null
  if (!oneOf(f.minEducation, EDUCATION_STEPS)) return null
  if (typeof f.minIncome !== 'number' || !INCOME_STEPS.includes(f.minIncome)) return null
  if (!isRange(f.ageMin, f.ageMax, AGE_MIN, AGE_MAX)) return null
  if (!isRange(f.heightMin, f.heightMax, HEIGHT_MIN, HEIGHT_MAX)) return null
  for (const key of ['praysFiveDaily', 'mosqueWeekly', 'wearsHijab'] as const) {
    if (typeof f[key] !== 'boolean') return null
  }
  const ethnicities = listOf(f.ethnicities, ALL_ETHNICITIES)
  const nativity = listOf(f.nativity, ALL_NATIVITIES)
  const marital = listOf(f.marital, ALL_MARITAL_STATUSES)
  const sects = listOf(f.sects, ALL_SECTS)
  if (!ethnicities || !nativity || !marital || !sects) return null

  // Re-count from the validated values rather than trusting the app's own tally.
  const checked: Filters = {
    region: 'us',
    sex: f.sex,
    ageMin: f.ageMin as number,
    ageMax: f.ageMax as number,
    ethnicities,
    nativity,
    marital,
    heightMin: f.heightMin as number,
    heightMax: f.heightMax as number,
    minEducation: f.minEducation,
    minIncome: f.minIncome,
    praysFiveDaily: f.praysFiveDaily as boolean,
    mosqueWeekly: f.mosqueWeekly as boolean,
    wearsHijab: f.wearsHijab as boolean,
    sects,
    convert: f.convert,
  }

  return {
    visit,
    searcher: searcher as Searcher | null,
    estimate: estimate as EstimateLevel,
    lookingFor: checked.sex,
    ageMin: checked.ageMin,
    ageMax: checked.ageMax,
    ethnicities: encodeList(ethnicities, ALL_ETHNICITIES),
    nativity: encodeList(nativity, ALL_NATIVITIES),
    marital: encodeList(marital, ALL_MARITAL_STATUSES),
    heightMin: checked.heightMin,
    heightMax: checked.heightMax,
    minEducation: checked.minEducation,
    minIncome: checked.minIncome,
    prays: checked.praysFiveDaily ? 1 : 0,
    mosque: checked.mosqueWeekly ? 1 : 0,
    hijab: checked.wearsHijab ? 1 : 0,
    sects: encodeList(sects, ALL_SECTS),
    convert: checked.convert,
    resultCount: count as number,
    activeFilters: activeFilterCount(checked),
  }
}

/**
 * A chip selection as one column: "all" when everything is picked, "none" when nothing is, and
 * otherwise the picks in their canonical order, so identical selections always match in SQL.
 */
export function encodeList<T extends string>(selected: readonly T[], all: readonly T[]): string {
  if (selected.length === 0) return 'none'
  if (all.every((value) => selected.includes(value))) return 'all'
  return all.filter((value) => selected.includes(value)).join(',')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function oneOf<T extends string>(value: unknown, options: readonly T[]): value is T {
  return typeof value === 'string' && (options as readonly string[]).includes(value)
}

function isRange(low: unknown, high: unknown, min: number, max: number): boolean {
  return (
    Number.isInteger(low) &&
    Number.isInteger(high) &&
    (low as number) >= min &&
    (high as number) <= max &&
    (low as number) <= (high as number)
  )
}

/** The selection with duplicates dropped, or null if it holds anything unknown. */
function listOf<T extends string>(value: unknown, all: readonly T[]): T[] | null {
  if (!Array.isArray(value) || value.length > all.length * 2) return null
  if (!value.every((item) => oneOf(item, all))) return null
  return all.filter((option) => value.includes(option))
}
