import { ESTIMATE_LEVELS, type EstimateLevel } from '../data/estimates'
import { AGE_MAX, AGE_MIN, HEIGHT_MAX, HEIGHT_MIN } from '../data/population'
import {
  ALL_ETHNICITIES,
  ALL_MARITAL_STATUSES,
  ALL_NATIVITIES,
  ALL_SECTS,
  DEFAULT_FILTERS,
  EDUCATION_STEPS,
  INCOME_STEPS,
  type ConvertFilter,
  type Filters,
  type SexFilter,
} from './filters'

// A search stored in the page address, so a shared link reopens the same search, e.g.
// ?sex=female&age=23-28&ethnicity=arab&prays=1. Only settings that differ from the defaults
// are written, and anything unrecognised is ignored. The hidden Bay Area option is left out.

export interface SearchState {
  filters: Filters
  estimate: EstimateLevel
}

const SEXES: SexFilter[] = ['any', 'male', 'female']
const CONVERTS: ConvertFilter[] = ['any', 'bornMuslim', 'convert']

export function toSearchParams({ filters, estimate }: SearchState): URLSearchParams {
  const params = new URLSearchParams()
  const defaults = DEFAULT_FILTERS
  if (filters.sex !== defaults.sex) params.set('sex', filters.sex)
  if (filters.ageMin !== AGE_MIN || filters.ageMax !== AGE_MAX) params.set('age', `${filters.ageMin}-${filters.ageMax}`)
  setList(params, 'ethnicity', filters.ethnicities, ALL_ETHNICITIES)
  setList(params, 'born', filters.nativity, ALL_NATIVITIES)
  setList(params, 'marital', filters.marital, ALL_MARITAL_STATUSES)
  if (filters.heightMin !== HEIGHT_MIN || filters.heightMax !== HEIGHT_MAX) {
    params.set('height', `${filters.heightMin}-${filters.heightMax}`)
  }
  if (filters.minEducation !== defaults.minEducation) params.set('education', filters.minEducation)
  if (filters.minIncome !== defaults.minIncome) params.set('income', String(filters.minIncome))
  if (filters.praysFiveDaily) params.set('prays', '1')
  if (filters.mosqueWeekly) params.set('mosque', '1')
  if (filters.wearsHijab) params.set('hijab', '1')
  setList(params, 'sect', filters.sects, ALL_SECTS)
  if (filters.convert !== defaults.convert) params.set('convert', filters.convert)
  if (estimate !== 'realistic') params.set('estimate', estimate)
  return params
}

export function fromSearchParams(params: URLSearchParams): SearchState {
  const filters: Filters = { ...DEFAULT_FILTERS }
  filters.sex = oneOf(params.get('sex'), SEXES) ?? filters.sex
  const age = range(params.get('age'), AGE_MIN, AGE_MAX)
  if (age) [filters.ageMin, filters.ageMax] = age
  filters.ethnicities = list(params.get('ethnicity'), ALL_ETHNICITIES) ?? filters.ethnicities
  filters.nativity = list(params.get('born'), ALL_NATIVITIES) ?? filters.nativity
  filters.marital = list(params.get('marital'), ALL_MARITAL_STATUSES) ?? filters.marital
  const height = range(params.get('height'), HEIGHT_MIN, HEIGHT_MAX)
  if (height) [filters.heightMin, filters.heightMax] = height
  filters.minEducation = oneOf(params.get('education'), EDUCATION_STEPS) ?? filters.minEducation
  const income = Number(params.get('income'))
  if (INCOME_STEPS.includes(income)) filters.minIncome = income
  filters.praysFiveDaily = params.get('prays') === '1'
  filters.mosqueWeekly = params.get('mosque') === '1'
  filters.wearsHijab = params.get('hijab') === '1'
  filters.sects = list(params.get('sect'), ALL_SECTS) ?? filters.sects
  filters.convert = oneOf(params.get('convert'), CONVERTS) ?? filters.convert
  return { filters, estimate: oneOf(params.get('estimate'), ESTIMATE_LEVELS) ?? 'realistic' }
}

/** Settings that differ between two searches, with their new link value ("default" when set back). */
export function changedSettings(before: SearchState, after: SearchState): { setting: string; value: string }[] {
  const was = toSearchParams(before)
  const now = toSearchParams(after)
  const keys = new Set([...was.keys(), ...now.keys()])
  return [...keys]
    .filter((key) => was.get(key) !== now.get(key))
    .map((key) => ({ setting: key, value: now.get(key) ?? 'default' }))
}

/** Writes a chip selection in its canonical order, or "none" when empty; skips it when everything is selected. */
function setList<T extends string>(params: URLSearchParams, key: string, selected: T[], all: T[]): void {
  if (all.every((value) => selected.includes(value))) return
  params.set(key, selected.length === 0 ? 'none' : all.filter((value) => selected.includes(value)).join(','))
}

function oneOf<T extends string>(value: string | null, options: readonly T[]): T | undefined {
  return options.find((option) => option === value)
}

function range(value: string | null, min: number, max: number): [number, number] | undefined {
  const match = value?.match(/^(\d+)-(\d+)$/)
  if (!match) return undefined
  const low = Number(match[1])
  const high = Number(match[2])
  return low >= min && high <= max && low <= high ? [low, high] : undefined
}

function list<T extends string>(value: string | null, all: readonly T[]): T[] | undefined {
  if (value === null) return undefined
  if (value === 'none') return []
  const items = value.split(',')
  const known = all.filter((option) => items.includes(option))
  return known.length > 0 ? known : undefined
}
