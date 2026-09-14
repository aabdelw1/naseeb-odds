import { describe, expect, it } from 'vitest'
import { ESTIMATE_LEVELS } from '../data/estimates'
import { AGE_MAX, AGE_MIN, HEIGHT_MAX, HEIGHT_MIN } from '../data/population'
import {
  ALL_ETHNICITIES,
  ALL_MARITAL_STATUSES,
  ALL_NATIVITIES,
  ALL_SECTS,
  DEFAULT_FILTERS,
  EDUCATION_STEPS,
  INCOME_STEPS,
  type Filters,
} from '../lib/filters'
import { changedSettings, fromSearchParams, toSearchParams } from '../lib/urlState'
import { seededRandom } from './helpers'

const random = seededRandom(20260914)
const pick = <T>(values: readonly T[]): T => values[Math.floor(random() * values.length)]
const maybeSubset = <T>(values: T[]): T[] => (random() < 0.5 ? values : values.filter(() => random() < 0.5))
const maybeRange = (min: number, max: number): [number, number] => {
  if (random() < 0.5) return [min, max]
  const a = min + Math.floor(random() * (max - min + 1))
  const b = min + Math.floor(random() * (max - min + 1))
  return [Math.min(a, b), Math.max(a, b)]
}

function randomFilters(): Filters {
  const [ageMin, ageMax] = maybeRange(AGE_MIN, AGE_MAX)
  const [heightMin, heightMax] = maybeRange(HEIGHT_MIN, HEIGHT_MAX)
  return {
    ...DEFAULT_FILTERS,
    sex: pick(['any', 'male', 'female'] as const),
    ageMin,
    ageMax,
    ethnicities: maybeSubset(ALL_ETHNICITIES),
    nativity: maybeSubset(ALL_NATIVITIES),
    marital: maybeSubset(ALL_MARITAL_STATUSES),
    heightMin,
    heightMax,
    minEducation: pick(EDUCATION_STEPS),
    minIncome: pick(INCOME_STEPS),
    praysFiveDaily: random() < 0.5,
    mosqueWeekly: random() < 0.5,
    sects: maybeSubset(ALL_SECTS),
    convert: pick(['any', 'bornMuslim', 'convert'] as const),
  }
}

describe('search links', () => {
  it('are empty for the default search', () => {
    expect(toSearchParams({ filters: DEFAULT_FILTERS, estimate: 'realistic' }).toString()).toBe('')
    expect(fromSearchParams(new URLSearchParams(''))).toEqual({ filters: DEFAULT_FILTERS, estimate: 'realistic' })
  })

  it('reopen exactly the same search', () => {
    for (let i = 0; i < 300; i++) {
      const state = { filters: randomFilters(), estimate: pick(ESTIMATE_LEVELS) }
      const link = toSearchParams(state).toString()
      expect(fromSearchParams(new URLSearchParams(link)), link).toEqual(state)
    }
  })

  it('are short and readable', () => {
    const params = toSearchParams({
      filters: {
        ...DEFAULT_FILTERS,
        sex: 'female',
        ageMin: 23,
        ageMax: 28,
        ethnicities: ['arab'],
        praysFiveDaily: true,
        sects: [],
      },
      estimate: 'generous',
    })
    expect(Object.fromEntries(params)).toEqual({
      sex: 'female',
      age: '23-28',
      ethnicity: 'arab',
      prays: '1',
      sect: 'none',
      estimate: 'generous',
    })
  })

  it('ignore values they do not recognise', () => {
    const state = fromSearchParams(
      new URLSearchParams('sex=robot&age=5-200&height=70-60&income=123&ethnicity=martian&education=phd&estimate=wild&prays=yes'),
    )
    expect(state).toEqual({ filters: DEFAULT_FILTERS, estimate: 'realistic' })
  })

  it('keep chip selections in a fixed order', () => {
    const { filters } = fromSearchParams(new URLSearchParams('ethnicity=desi,arab,unknown'))
    expect(filters.ethnicities).toEqual(['arab', 'desi'])
  })

  it('report which settings changed between two searches', () => {
    const before = { filters: DEFAULT_FILTERS, estimate: 'realistic' as const }
    const after = {
      filters: { ...DEFAULT_FILTERS, sex: 'female' as const, ageMin: 23, ageMax: 28 },
      estimate: 'generous' as const,
    }
    expect(changedSettings(before, after)).toEqual([
      { setting: 'sex', value: 'female' },
      { setting: 'age', value: '23-28' },
      { setting: 'estimate', value: 'generous' },
    ])
    expect(changedSettings(after, before).map((change) => change.value)).toEqual(['default', 'default', 'default'])
    expect(changedSettings(after, after)).toEqual([])
  })

  it('leave out the hidden Bay Area option', () => {
    const params = toSearchParams({ filters: { ...DEFAULT_FILTERS, region: 'bayArea' }, estimate: 'realistic' })
    expect(params.toString()).toBe('')
  })
})
