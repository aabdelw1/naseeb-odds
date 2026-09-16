import type { EstimateLevel } from '../data/estimates'
import { countMatching, DEFAULT_FILTERS, totalPopulation, type Filters } from './filters'
import { formatPercent } from './format'

// A snapshot of the current search for pasting into a bug report: which filters differ
// from the defaults, and how the count narrows as each one is applied.

/** Filter settings that belong together, e.g. both ends of the age range. */
const FILTER_GROUPS: (keyof Filters)[][] = [
  ['region'],
  ['sex'],
  ['ageMin', 'ageMax'],
  ['ethnicities'],
  ['nativity'],
  ['marital'],
  ['heightMin', 'heightMax'],
  ['minEducation'],
  ['minIncome'],
  ['praysFiveDaily'],
  ['mosqueWeekly'],
  ['wearsHijab'],
  ['sects'],
  ['convert'],
]

export interface DebugStep {
  filter: string
  value: unknown
  /** Count after applying this filter and every one before it. */
  count: number
  keptFromPrevious: string
  /** Final count with only this filter reset to its default. */
  countWithoutIt: number
}

export interface DebugReport {
  estimate: EstimateLevel
  count: number
  total: number
  /** Only the filters that differ from the defaults; spread over DEFAULT_FILTERS to reproduce. */
  changed: Partial<Filters>
  steps: DebugStep[]
}

export function debugReport(filters: Filters, estimate: EstimateLevel): DebugReport {
  const pick = (keys: (keyof Filters)[], from: Filters) =>
    Object.fromEntries(keys.map((key) => [key, from[key]])) as Partial<Filters>
  const changedGroups = FILTER_GROUPS.filter((keys) =>
    keys.some((key) => JSON.stringify(filters[key]) !== JSON.stringify(DEFAULT_FILTERS[key])),
  )

  let applied: Filters = { ...DEFAULT_FILTERS }
  let previous = countMatching(applied, estimate)
  const steps = changedGroups.map((keys): DebugStep => {
    applied = { ...applied, ...pick(keys, filters) }
    const count = countMatching(applied, estimate)
    const step = {
      filter: keys.join('/'),
      value: keys.length === 1 ? filters[keys[0]] : pick(keys, filters),
      count,
      keptFromPrevious: previous === 0 ? '—' : formatPercent(count / previous),
      countWithoutIt: countMatching({ ...filters, ...pick(keys, DEFAULT_FILTERS) }, estimate),
    }
    previous = count
    return step
  })

  return {
    estimate,
    count: countMatching(filters, estimate),
    total: totalPopulation(estimate, filters.region),
    changed: Object.assign({}, ...changedGroups.map((keys) => pick(keys, filters))),
    steps,
  }
}
