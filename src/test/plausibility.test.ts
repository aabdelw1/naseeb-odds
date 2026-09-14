import { describe, expect, it } from 'vitest'
import { ALL_ETHNICITIES, EDUCATION_STEPS, INCOME_STEPS, type Filters } from '../lib/filters'
import { count, pct, share } from './helpers'

// Relationships between traits that must hold for combined filters to make sense. None
// of these are fitted directly; they follow from how the model links traits together.

const WORKING_AGE: Partial<Filters> = { ageMin: 25, ageMax: 54 }
const US_BORN: Partial<Filters> = { nativity: ['secondGen', 'thirdGen'] }

/** Share of a group at exactly one education level earning at least `minIncome`. */
function incomeAtLevel(level: 'highSchool' | 'bachelors', minIncome: number): number {
  const next = level === 'highSchool' ? 'someCollege' : 'graduate'
  return (
    (count({ minEducation: level, minIncome }) - count({ minEducation: next, minIncome })) /
    (count({ minEducation: level }) - count({ minEducation: next }))
  )
}

describe('income and education go together', () => {
  const groups: [string, Partial<Filters>][] = [
    ['all adults', {}],
    ['brothers', { sex: 'male' }],
    ['sisters', { sex: 'female' }],
    ['ages 25–54', WORKING_AGE],
    ['Black', { ethnicities: ['black'] }],
    ['Desi', { ethnicities: ['desi'] }],
    ['immigrants', { nativity: ['immigrant'] }],
    ['US-born', US_BORN],
  ]

  for (const minIncome of INCOME_STEPS.filter((x) => x >= 50_000)) {
    it(`each step up in education raises the share earning $${minIncome / 1000}k+`, () => {
      const failures: string[] = []
      for (const [label, given] of groups) {
        const rates = EDUCATION_STEPS.map((minEducation) => share({ minIncome }, { ...given, minEducation }))
        rates.slice(1).forEach((rate, i) => {
          if (!(rate > rates[i])) {
            failures.push(`${label}: ${EDUCATION_STEPS[i]} ${pct(rates[i])} → ${EDUCATION_STEPS[i + 1]} ${pct(rate)}`)
          }
        })
      }
      expect(failures).toEqual([])
    })
  }

  it("bachelor's-only earners make $100k+ several times as often as high-school-only earners", () => {
    expect(incomeAtLevel('bachelors', 100_000)).toBeGreaterThan(incomeAtLevel('highSchool', 100_000) * 3)
  })

  it('$250k+ earners are mostly degree holders, unlike adults overall', () => {
    const degreeOverall = share({ minEducation: 'bachelors' })
    expect(share({ minEducation: 'bachelors' }, { minIncome: 250_000 })).toBeGreaterThan(Math.min(0.9, degreeOverall * 2))
    const noDiplomaOverall = 1 - share({ minEducation: 'highSchool' })
    const noDiplomaRich = 1 - share({ minEducation: 'highSchool' }, { minIncome: 250_000 })
    expect(noDiplomaRich).toBeLessThan(noDiplomaOverall / 3)
  })

  it('a degree and $250k+ together are far likelier than multiplying their shares suggests', () => {
    const product = share({ minEducation: 'bachelors' }) * share({ minIncome: 250_000 })
    expect(share({ minEducation: 'bachelors', minIncome: 250_000 })).toBeGreaterThan(product * 2)
  })
})

describe('income differs by ethnicity, birthplace, sex and age', () => {
  it('ranks $100k+ earners aged 25–54: White, Desi, Arab, Other, Black', () => {
    const order = ['white', 'desi', 'arab', 'other', 'black'] as const
    const rates = order.map((e) => share({ minIncome: 100_000 }, { ...WORKING_AGE, ethnicities: [e] }))
    rates.slice(1).forEach((rate, i) => {
      expect(rate, `${order[i + 1]} ${pct(rate)} vs ${order[i]} ${pct(rates[i])}`).toBeLessThan(rates[i])
    })
  })

  it('Black Muslims are underrepresented among $150k+ earners', () => {
    expect(share({ ethnicities: ['black'] }, { minIncome: 150_000 })).toBeLessThan(share({ ethnicities: ['black'] }) * 0.6)
  })

  it('immigrants earn $100k+ more often than US-born Muslims, as in Pew household incomes (29% vs 18%)', () => {
    const ratio = share({ minIncome: 100_000 }, { nativity: ['immigrant'] }) / share({ minIncome: 100_000 }, US_BORN)
    expect(ratio).toBeGreaterThan(1.1)
    expect(ratio).toBeLessThan(2.5)
  })

  it('brothers out-earn sisters at every income level', () => {
    for (const minIncome of INCOME_STEPS.slice(1)) {
      expect(share({ minIncome }, { sex: 'male' })).toBeGreaterThan(share({ minIncome }, { sex: 'female' }))
    }
  })

  it('earnings peak mid-career', () => {
    const young = share({ minIncome: 100_000 }, { ageMin: 18, ageMax: 24 })
    const peak = share({ minIncome: 100_000 }, { ageMin: 35, ageMax: 44 })
    const retired = share({ minIncome: 100_000 }, { ageMin: 65, ageMax: 90 })
    expect(peak).toBeGreaterThan(young * 3)
    expect(peak).toBeGreaterThan(retired * 2)
  })
})

describe('education differs by background and age', () => {
  it("Desi and Arab Muslims, mostly immigrants, hold bachelor's degrees more often than Black Muslims", () => {
    const black = share({ minEducation: 'bachelors' }, { ethnicities: ['black'] })
    expect(share({ minEducation: 'bachelors' }, { ethnicities: ['desi'] })).toBeGreaterThan(black)
    expect(share({ minEducation: 'bachelors' }, { ethnicities: ['arab'] })).toBeGreaterThan(black)
  })

  it('almost nobody under 25 has a graduate degree', () => {
    const young = share({ minEducation: 'graduate' }, { ageMin: 18, ageMax: 24 })
    expect(young).toBeLessThan(0.03)
    expect(share({ minEducation: 'graduate' }, { ageMin: 35, ageMax: 44 })).toBeGreaterThan(young * 4)
  })
})

describe('marriage depends on age and birthplace', () => {
  it('immigrants are more often married than US-born Muslims at every age from 25 to 54', () => {
    for (const [ageMin, ageMax] of [
      [25, 34],
      [35, 44],
      [45, 54],
    ]) {
      const immigrant = share({ marital: ['married'] }, { ageMin, ageMax, nativity: ['immigrant'] })
      const usBorn = share({ marital: ['married'] }, { ageMin, ageMax, ...US_BORN })
      expect(immigrant, `ages ${ageMin}–${ageMax}: ${pct(immigrant)} vs ${pct(usBorn)}`).toBeGreaterThan(usBorn)
    }
  })

  it('most people under 25 have never married and most in their late 40s have', () => {
    expect(share({ marital: ['neverMarried'] }, { ageMin: 18, ageMax: 24 })).toBeGreaterThan(0.6)
    expect(share({ marital: ['neverMarried'] }, { ageMin: 45, ageMax: 54 })).toBeLessThan(0.3)
  })

  it('the married share more than doubles from the early 20s to the 30s', () => {
    expect(share({ marital: ['married'] }, { ageMin: 30, ageMax: 39 })).toBeGreaterThan(
      share({ marital: ['married'] }, { ageMin: 18, ageMax: 24 }) * 2,
    )
  })

  it('widows and divorced parents are rare among the young', () => {
    expect(share({ marital: ['widowed'] }, { ageMin: 18, ageMax: 39 })).toBeLessThan(0.01)
    expect(share({ marital: ['divorcedWithKids'] }, { ageMin: 18, ageMax: 24 })).toBeLessThan(0.01)
  })

  it('being an immigrant and being married go together', () => {
    const product = share({ nativity: ['immigrant'] }) * share({ marital: ['married'] })
    expect(share({ nativity: ['immigrant'], marital: ['married'] })).toBeGreaterThan(product * 1.1)
  })
})

describe('religious practice', () => {
  it('older Muslims pray all five more often than younger ones, brothers and sisters alike', () => {
    for (const sex of ['male', 'female'] as const) {
      expect(share({ praysFiveDaily: true }, { sex, ageMin: 55, ageMax: 90 })).toBeGreaterThan(
        share({ praysFiveDaily: true }, { sex, ageMin: 18, ageMax: 29 }),
      )
    }
  })

  it('Arab-origin Muslims pray all five more often than Desi Muslims', () => {
    expect(share({ praysFiveDaily: true }, { ethnicities: ['arab'] })).toBeGreaterThan(
      share({ praysFiveDaily: true }, { ethnicities: ['desi'] }),
    )
  })

  it('Sunni brothers go to mosque weekly far more often than Shia brothers', () => {
    expect(share({ mosqueWeekly: true }, { sex: 'male', sects: ['sunni'] })).toBeGreaterThan(
      share({ mosqueWeekly: true }, { sex: 'male', sects: ['shia'] }) * 2.5,
    )
  })

  it('praying all five and weekly mosque overlap more than chance, but never more than the rarer of the two', () => {
    for (const given of [
      {},
      { sex: 'male' },
      { sex: 'female' },
      { ageMin: 18, ageMax: 29 },
      { sects: ['shia'] },
      { nativity: ['thirdGen'] },
    ] as Partial<Filters>[]) {
      const both = share({ praysFiveDaily: true, mosqueWeekly: true }, given)
      const prays = share({ praysFiveDaily: true }, given)
      const mosque = share({ mosqueWeekly: true }, given)
      expect(both).toBeGreaterThan(prays * mosque)
      expect(both).toBeLessThanOrEqual(Math.min(prays, mosque) + 0.001)
    }
  })
})

describe('converts', () => {
  it('are nearly all US-born', () => {
    expect(share(US_BORN, { convert: 'convert' })).toBeGreaterThan(0.85)
  })

  it('are common among third-generation Black Muslims and rare among immigrants and Desi Muslims', () => {
    expect(share({ convert: 'convert' }, { ethnicities: ['black'], nativity: ['thirdGen'] })).toBeGreaterThan(0.6)
    expect(share({ convert: 'convert' }, { nativity: ['immigrant'] })).toBeLessThan(0.05)
    expect(share({ convert: 'convert' }, { ethnicities: ['desi'] })).toBeLessThan(0.08)
  })
})

describe('height depends on sex, ethnicity and birthplace', () => {
  it('ranks 5\'10"+ immigrant brothers: Black, Arab, White, Desi, Other', () => {
    const order = ['black', 'arab', 'white', 'desi', 'other'] as const
    const rates = order.map((e) => share({ heightMin: 70 }, { sex: 'male', ethnicities: [e], nativity: ['immigrant'] }))
    rates.slice(1).forEach((rate, i) => expect(rate, `${order[i + 1]} vs ${order[i]}`).toBeLessThan(rates[i]))
  })

  it('US-born brothers are taller than immigrant brothers of the same ethnicity', () => {
    for (const e of ALL_ETHNICITIES) {
      const usBorn = share({ heightMin: 70 }, { sex: 'male', ethnicities: [e], ...US_BORN })
      const immigrant = share({ heightMin: 70 }, { sex: 'male', ethnicities: [e], nativity: ['immigrant'] })
      expect(usBorn, e).toBeGreaterThan(immigrant)
    }
  })

  it("sisters 5'10\" and up are rare", () => {
    expect(share({ heightMin: 70 }, { sex: 'female' })).toBeLessThan(0.05)
  })

  it('height is the same across other traits within a sex, ethnicity and birthplace', () => {
    for (const e of ALL_ETHNICITIES) {
      const given: Partial<Filters> = { sex: 'male', ethnicities: [e], nativity: ['immigrant'] }
      const base = share({ heightMin: 70 }, given)
      const rich = share({ heightMin: 70 }, { ...given, minIncome: 100_000 })
      expect(Math.abs(rich - base)).toBeLessThan(0.01)
    }
  })
})

describe('realistic searches', () => {
  const searches: [string, [string, Partial<Filters>][]][] = [
    [
      'a sister looking for a brother',
      [
        ['brothers 25–35', { sex: 'male', ageMin: 25, ageMax: 35 }],
        ['never married', { marital: ['neverMarried'] }],
        ["5'10\"+", { heightMin: 70 }],
        ["bachelor's+", { minEducation: 'bachelors' }],
        ['$100k+', { minIncome: 100_000 }],
        ['prays all five', { praysFiveDaily: true }],
        ['Sunni', { sects: ['sunni'] }],
      ],
    ],
    [
      'a brother looking for a sister',
      [
        ['sisters 22–30', { sex: 'female', ageMin: 22, ageMax: 30 }],
        ['never married', { marital: ['neverMarried'] }],
        ['Arab or Desi', { ethnicities: ['arab', 'desi'] }],
        ["bachelor's+", { minEducation: 'bachelors' }],
        ['prays all five', { praysFiveDaily: true }],
        ['born Muslim', { convert: 'bornMuslim' }],
      ],
    ],
  ]

  for (const [name, steps] of searches) {
    it(`${name}: narrows at every step and never reaches zero`, () => {
      let filters: Partial<Filters> = {}
      let previous = count()
      for (const [label, patch] of steps) {
        filters = { ...filters, ...patch }
        const c = count(filters)
        expect(c, `${label}: ${c} after ${previous}`).toBeLessThanOrEqual(previous)
        expect(c, label).toBeGreaterThan(0)
        previous = c
      }
    })
  }
})
