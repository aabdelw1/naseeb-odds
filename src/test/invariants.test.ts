import { describe, expect, it } from 'vitest'
import { ADULT_POPULATION, HEIGHT_MAX, HEIGHT_MIN, TOTAL_POPULATION } from '../data/population'
import {
  ALL_ETHNICITIES,
  ALL_MARITAL_STATUSES,
  ALL_NATIVITIES,
  ALL_SECTS,
  countMatching,
  DEFAULT_FILTERS,
  EDUCATION_STEPS,
  INCOME_STEPS,
  type Filters,
} from '../lib/filters'
import { seededRandom } from './helpers'

// Rules every count must follow, checked across every pair of filter values and hundreds
// of random combinations of all filters at once.

type Patch = Partial<Filters>

/** Representative values for every filter; the first value of each is its default. */
const DIMENSIONS: Record<string, Patch[]> = {
  sex: [{ sex: 'any' }, { sex: 'male' }, { sex: 'female' }],
  age: [
    { ageMin: 0, ageMax: 90 },
    { ageMin: 18, ageMax: 90 },
    { ageMin: 0, ageMax: 17 },
    { ageMin: 18, ageMax: 24 },
    { ageMin: 25, ageMax: 34 },
    { ageMin: 35, ageMax: 54 },
    { ageMin: 55, ageMax: 90 },
    { ageMin: 27, ageMax: 27 },
  ],
  ethnicity: [
    { ethnicities: ALL_ETHNICITIES },
    ...ALL_ETHNICITIES.map((e) => ({ ethnicities: [e] })),
    { ethnicities: ['arab', 'desi'] },
    { ethnicities: [] },
  ],
  height: [
    { heightMin: HEIGHT_MIN, heightMax: HEIGHT_MAX },
    { heightMin: 72, heightMax: HEIGHT_MAX },
    { heightMin: HEIGHT_MIN, heightMax: 63 },
    { heightMin: 64, heightMax: 68 },
  ],
  marital: [
    { marital: ALL_MARITAL_STATUSES },
    { marital: ['neverMarried'] },
    { marital: ['neverMarried', 'divorcedNoKids', 'divorcedWithKids'] },
    { marital: ['divorcedWithKids'] },
    { marital: ['married'] },
    { marital: [] },
  ],
  income: INCOME_STEPS.map((minIncome) => ({ minIncome })),
  prays: [{ praysFiveDaily: false }, { praysFiveDaily: true }],
  mosque: [{ mosqueWeekly: false }, { mosqueWeekly: true }],
  sect: [{ sects: ALL_SECTS }, ...ALL_SECTS.map((s) => ({ sects: [s] })), { sects: [] }],
  education: EDUCATION_STEPS.map((minEducation) => ({ minEducation })),
  nativity: [
    { nativity: ALL_NATIVITIES },
    ...ALL_NATIVITIES.map((n) => ({ nativity: [n] })),
    { nativity: ['immigrant', 'secondGen'] },
    { nativity: [] },
  ],
  convert: [{ convert: 'any' }, { convert: 'bornMuslim' }, { convert: 'convert' }],
}
const NAMES = Object.keys(DIMENSIONS)

/** Categorical filters whose options split the population into non-overlapping parts. */
const PARTITIONS: { dimension: string; whole: Patch; parts: Patch[] }[] = [
  { dimension: 'sex', whole: { sex: 'any' }, parts: [{ sex: 'male' }, { sex: 'female' }] },
  {
    dimension: 'ethnicity',
    whole: { ethnicities: ALL_ETHNICITIES },
    parts: ALL_ETHNICITIES.map((e) => ({ ethnicities: [e] })),
  },
  {
    dimension: 'marital',
    whole: { marital: ALL_MARITAL_STATUSES },
    parts: ALL_MARITAL_STATUSES.map((m) => ({ marital: [m] })),
  },
  { dimension: 'sect', whole: { sects: ALL_SECTS }, parts: ALL_SECTS.map((s) => ({ sects: [s] })) },
  {
    dimension: 'nativity',
    whole: { nativity: ALL_NATIVITIES },
    parts: ALL_NATIVITIES.map((n) => ({ nativity: [n] })),
  },
  { dimension: 'convert', whole: { convert: 'any' }, parts: [{ convert: 'bornMuslim' }, { convert: 'convert' }] },
]

const build = (...patches: Patch[]): Filters => Object.assign({ ...DEFAULT_FILTERS }, ...patches)

const random = seededRandom(20260913)
const pick = <T>(values: T[]): T => values[Math.floor(random() * values.length)]
/** Random full combinations: one value for every filter. */
const COMBOS: Patch[][] = Array.from({ length: 300 }, () => NAMES.map((name) => pick(DIMENSIONS[name])))
const describeCombo = (combo: Patch[]) => JSON.stringify(Object.assign({}, ...combo))

describe('baseline', () => {
  it('counts everyone with no filters and every adult from 18 up', () => {
    expect(Math.abs(countMatching(DEFAULT_FILTERS) - TOTAL_POPULATION)).toBeLessThanOrEqual(2)
    expect(Math.abs(countMatching(build({ ageMin: 18 })) - ADULT_POPULATION)).toBeLessThanOrEqual(2)
  })

  it('matches nobody when any option group is emptied', () => {
    for (const patch of [{ ethnicities: [] }, { marital: [] }, { sects: [] }, { nativity: [] }] as Patch[]) {
      expect(countMatching(build(patch))).toBe(0)
    }
  })

  it('leaves children out of adult-only filters and keeps them for the rest', () => {
    const kids: Patch = { ageMin: 0, ageMax: 17 }
    for (const adultOnly of [
      { praysFiveDaily: true },
      { mosqueWeekly: true },
      { heightMin: 60 },
      { minEducation: 'highSchool' },
    ] as Patch[]) {
      expect(countMatching(build(kids, adultOnly))).toBe(0)
    }
    const allKids = countMatching(build(kids))
    expect(countMatching(build(kids, { sects: ['sunni'] }))).toBeGreaterThan(0)
    expect(countMatching(build(kids, { ethnicities: ['desi'] }))).toBeGreaterThan(0)
    expect(countMatching(build(kids, { convert: 'convert' }))).toBe(0)
    expect(countMatching(build(kids, { convert: 'bornMuslim' }))).toBe(allKids)
  })
})

describe('every pair of filter values', () => {
  it('gives a whole, non-negative count no bigger than either filter alone', () => {
    const alone = new Map<Patch, number>()
    for (const name of NAMES) for (const patch of DIMENSIONS[name]) alone.set(patch, countMatching(build(patch)))

    const failures: string[] = []
    let checked = 0
    for (let i = 0; i < NAMES.length; i++) {
      for (let j = i + 1; j < NAMES.length; j++) {
        for (const a of DIMENSIONS[NAMES[i]]) {
          for (const b of DIMENSIONS[NAMES[j]]) {
            const c = countMatching(build(a, b))
            checked++
            // Rounding each count to a whole person can add at most 1.
            if (!Number.isInteger(c) || c < 0 || c > Math.min(alone.get(a)!, alone.get(b)!) + 1) {
              failures.push(`${JSON.stringify({ ...a, ...b })} → ${c}`)
            }
          }
        }
      }
    }
    expect(checked).toBeGreaterThan(1500)
    expect(failures).toEqual([])
  })
})

describe('random combinations of every filter', () => {
  it('never exceed the total and never grow when a filter is added', () => {
    const failures: string[] = []
    for (const combo of COMBOS) {
      const c = countMatching(build(...combo))
      if (!Number.isInteger(c) || c < 0 || c > TOTAL_POPULATION) failures.push(`${describeCombo(combo)} → ${c}`)
      NAMES.forEach((name, d) => {
        // Resetting one filter to its default must not lower the count.
        const loosened = combo.map((patch, k) => (k === d ? DIMENSIONS[name][0] : patch))
        const looser = countMatching(build(...loosened))
        if (c > looser + 1) failures.push(`removing ${name} from ${describeCombo(combo)}: ${c} → ${looser}`)
      })
    }
    expect(failures).toEqual([])
  })

  it('add up: the options of a filter together equal the filter left open', () => {
    const failures: string[] = []
    for (const combo of COMBOS) {
      for (const { dimension, whole, parts } of PARTITIONS) {
        const d = NAMES.indexOf(dimension)
        const withPatch = (patch: Patch) => countMatching(build(...combo.map((p, k) => (k === d ? patch : p))))
        const total = withPatch(whole)
        const sum = parts.reduce((s, part) => s + withPatch(part), 0)
        if (Math.abs(sum - total) > parts.length) {
          failures.push(`${dimension} in ${describeCombo(combo)}: parts ${sum} vs whole ${total}`)
        }
      }
      // Height splits adults (children are only counted when height is open).
      const heightIndex = NAMES.indexOf('height')
      const ageIndex = NAMES.indexOf('age')
      const adultCombo = (height: Patch) =>
        countMatching(build(...combo.map((p, k) => (k === ageIndex ? { ageMin: 18, ageMax: 90 } : k === heightIndex ? height : p))))
      const tall = adultCombo({ heightMin: 68, heightMax: HEIGHT_MAX })
      const short = adultCombo({ heightMin: HEIGHT_MIN, heightMax: 67 })
      const any = adultCombo({ heightMin: HEIGHT_MIN, heightMax: HEIGHT_MAX })
      if (Math.abs(tall + short - any) > 2) failures.push(`height in ${describeCombo(combo)}: ${tall}+${short} vs ${any}`)
    }
    expect(failures).toEqual([])
  })

  it('shrink as minimum income or minimum education rises', () => {
    const failures: string[] = []
    for (const combo of COMBOS) {
      for (const [name, steps] of [
        ['income', DIMENSIONS.income],
        ['education', DIMENSIONS.education],
      ] as const) {
        const d = NAMES.indexOf(name)
        const counts = steps.map((step) => countMatching(build(...combo.map((p, k) => (k === d ? step : p)))))
        counts.slice(1).forEach((c, i) => {
          if (c > counts[i] + 1) failures.push(`${name} in ${describeCombo(combo)}: ${counts.join(' → ')}`)
        })
      }
    }
    expect(failures).toEqual([])
  })
})
