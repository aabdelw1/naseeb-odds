import { describe, expect, it } from 'vitest'
import {
  AGE_BY_BIRTHPLACE,
  BLACK_SHARE_BY_BIRTHPLACE,
  EDUCATION_BY_BIRTHPLACE,
  MARITAL_BY_BIRTHPLACE,
  MARRIED_SHARE,
  NATIVITY_SHARES,
  RACE_BY_GENERATION,
  type Birthplace,
} from '../data/background'
import { EMPLOYED_SHARE } from '../data/earnings'
import { ADULT_POPULATION, ADULT_SEX_SHARE, ETHNIC_GROUPS, HEIGHT_SD, type Ethnicity } from '../data/population'
import { CONVERTS, MOSQUE_WEEKLY, PRAYS_FIVE_DAILY, SECT_SHARES, type PracticeRates, type Sect } from '../data/religion'
import { ALL_ETHNICITIES, ALL_NATIVITIES, type Filters } from '../lib/filters'
import { CELLS } from '../lib/model'
import { normalCdf } from '../lib/stats'
import { expectNear } from './assertions'
import { count, share, shareExcluding } from './helpers'

// Does the model reproduce the published figures it is built from? Each test compares a
// model rate, computed through the same filters the app uses, with its source.

const US_BORN: Partial<Filters> = { nativity: ['secondGen', 'thirdGen'] }
const BIRTHPLACE_FILTER: Record<Birthplace, Partial<Filters>> = { immigrant: { nativity: ['immigrant'] }, usBorn: US_BORN }

describe('population (Pew 2017, ISPU 2025)', () => {
  it('matches the adult population, 56% of them men', () => {
    expect(Math.abs(count() - ADULT_POPULATION)).toBeLessThanOrEqual(2)
    expectNear(share({ sex: 'male' }), ADULT_SEX_SHARE.male, 0.003, 'men')
  })

  it('matches the ethnicity mix', () => {
    for (const e of ALL_ETHNICITIES) expectNear(share({ ethnicities: [e] }), ETHNIC_GROUPS[e].share, 0.003, e)
  })

  it('matches generations and where Black Muslims were born', () => {
    for (const n of ALL_NATIVITIES) expectNear(share({ nativity: [n] }), NATIVITY_SHARES[n], 0.02, n)
    // Black Muslims are 23% here, above Pew's 19% (see ETHNIC_GROUPS), so compare how
    // Black Muslims split by birthplace rather than their share of all adults.
    const { usBorn, immigrant } = BLACK_SHARE_BY_BIRTHPLACE
    expectNear(share(US_BORN, { ethnicities: ['black'] }), usBorn / (usBorn + immigrant), 0.03, 'Black Muslims US-born')
  })

  it("roughly matches Pew's race mix within each generation", () => {
    // Black Muslims are 23% here vs Pew's 20%, hence the loose tolerance.
    for (const nativity of ALL_NATIVITIES) {
      const given: Partial<Filters> = { nativity: [nativity] }
      expectNear(share({ ethnicities: ['black'] }, given), RACE_BY_GENERATION.black[nativity], 0.05, `Black, ${nativity}`)
      expectNear(
        share({ ethnicities: ['arab', 'white'] }, given),
        RACE_BY_GENERATION.white[nativity],
        0.05,
        `Arab or White, ${nativity}`,
      )
    }
  })

  it("keeps ISPU's gaps in how often each group stops at high school", () => {
    const odds = (p: number) => p / (1 - p)
    const modelOdds = (e: Ethnicity) => odds(1 - share({ minEducation: 'someCollege' }, { ethnicities: [e] }))
    for (const e of ['black', 'white', 'arab'] as Ethnicity[]) {
      const modelRatio = modelOdds(e) / modelOdds('desi')
      const sourceRatio = odds(ETHNIC_GROUPS[e].highSchoolOrLess) / odds(ETHNIC_GROUPS.desi.highSchoolOrLess)
      expect(Math.abs(modelRatio / sourceRatio - 1), `${e} vs Desi: ${modelRatio.toFixed(2)} vs ${sourceRatio.toFixed(2)}`).toBeLessThan(0.1)
    }
  })

  it('matches the younger age mix of US-born Muslims', () => {
    AGE_BY_BIRTHPLACE.forEach(({ minAge, immigrant, usBorn }, i) => {
      const ageMax = i + 1 < AGE_BY_BIRTHPLACE.length ? AGE_BY_BIRTHPLACE[i + 1].minAge - 1 : 90
      const age: Partial<Filters> = { ageMin: minAge, ageMax }
      expectNear(share(age, { nativity: ['immigrant'] }), immigrant, 0.015, `immigrants ${minAge}–${ageMax}`)
      expectNear(share(age, US_BORN), usBorn, 0.015, `US-born ${minAge}–${ageMax}`)
    })
  })

  it('matches sects', () => {
    for (const s of Object.keys(SECT_SHARES) as Sect[]) expectNear(share({ sects: [s] }), SECT_SHARES[s], 0.005, s)
  })
})

describe('marriage and education by birthplace (Pew 2017)', () => {
  it('matches marital status for immigrants and US-born', () => {
    for (const [birthplace, given] of Object.entries(BIRTHPLACE_FILTER) as [Birthplace, Partial<Filters>][]) {
      const rates = MARITAL_BY_BIRTHPLACE[birthplace]
      expectNear(share({ marital: ['married'] }, given), rates.married, 0.01, `${birthplace} married`)
      expectNear(share({ marital: ['neverMarried'] }, given), rates.neverMarried, 0.01, `${birthplace} never married`)
      expectNear(
        share({ marital: ['divorcedNoKids', 'divorcedWithKids'] }, given),
        rates.divorced,
        0.01,
        `${birthplace} divorced`,
      )
    }
    expectNear(share({ marital: ['married'] }), MARRIED_SHARE, 0.03, 'all adults married')
  })

  it("matches bachelor's degrees for immigrants and US-born", () => {
    for (const [birthplace, given] of Object.entries(BIRTHPLACE_FILTER) as [Birthplace, Partial<Filters>][]) {
      const rates = EDUCATION_BY_BIRTHPLACE[birthplace]
      expectNear(
        share({ minEducation: 'bachelors' }, given),
        rates.bachelors + rates.graduate,
        0.01,
        `${birthplace} bachelor's+`,
      )
      expectNear(share({ minEducation: 'graduate' }, given), rates.graduate, 0.01, `${birthplace} graduate`)
    }
  })
})

function describePractice(name: string, filter: Partial<Filters>, rates: PracticeRates) {
  describe(`${name} (Pew 2017)`, () => {
    it('matches the overall rate', () => expectNear(share(filter), rates.overall, 0.015, 'overall'))

    it('matches by sex and age', () => {
      for (const sex of ['male', 'female'] as const) expectNear(share(filter, { sex }), rates.bySex[sex], 0.02, sex)
      rates.byAge.forEach(({ minAge, rate }, i) => {
        const ageMax = i + 1 < rates.byAge.length ? rates.byAge[i + 1].minAge - 1 : 90
        expectNear(share(filter, { ageMin: minAge, ageMax }), rate, 0.03, `ages ${minAge}–${ageMax}`)
      })
    })

    it('matches by degree, birthplace and marriage', () => {
      expectNear(share(filter, { minEducation: 'bachelors' }), rates.byDegree.degree, 0.03, 'degree')
      expectNear(shareExcluding(filter, { minEducation: 'bachelors' }), rates.byDegree.noDegree, 0.03, 'no degree')
      for (const [birthplace, given] of Object.entries(BIRTHPLACE_FILTER) as [Birthplace, Partial<Filters>][]) {
        expectNear(share(filter, given), rates.byBirthplace[birthplace], 0.03, birthplace)
      }
      expectNear(share(filter, { marital: ['married'] }), rates.byMarried.married, 0.03, 'married')
      expectNear(
        share(filter, { marital: ['neverMarried', 'divorcedNoKids', 'divorcedWithKids', 'widowed'] }),
        rates.byMarried.notMarried,
        0.03,
        'not married',
      )
    })

    it('matches by sect and origin', () => {
      for (const [sect, rate] of Object.entries(rates.bySect)) {
        expectNear(share(filter, { sects: [sect as Sect] }), rate, 0.03, sect)
      }
      for (const group of rates.byGroup) {
        const given: Partial<Filters> = { ethnicities: [group.ethnicity], ...(group.usBornOnly ? US_BORN : {}) }
        expectNear(share(filter, given), group.rate, 0.04, group.label)
      }
    })
  })
}

describePractice('praying all five daily', { praysFiveDaily: true }, PRAYS_FIVE_DAILY)
describePractice('weekly mosque attendance', { mosqueWeekly: true }, MOSQUE_WEEKLY)

describe('converts (Pew 2017)', () => {
  it('are about a fifth of adults, two-thirds of US-born Black Muslims, and one-in-seven of everyone else', () => {
    const converts = share({ convert: 'convert' })
    expectNear(converts, CONVERTS.overall, 0.02, 'overall')
    const usBornBlack: Partial<Filters> = { ethnicities: ['black'], ...US_BORN }
    expectNear(share({ convert: 'convert' }, usBornBlack), CONVERTS.usBornBlack, 0.03, 'US-born Black')
    const everyoneElse =
      (count({ convert: 'convert' }) - count({ ...usBornBlack, convert: 'convert' })) / (count() - count(usBornBlack))
    expectNear(everyoneElse, CONVERTS.everyoneElse, 0.02, 'everyone else')
  })
})

describe('earnings (Pew 2017, ISPU 2025)', () => {
  it('has 60% of adults working', () => {
    const adults = CELLS.filter((c) => c.adult)
    const total = adults.reduce((s, c) => s + c.weight, 0)
    const working = adults.reduce((s, c) => s + c.weight * c.earners, 0) / total
    expectNear(working, EMPLOYED_SHARE, 0.02, 'employed')
  })

  it("ranks ethnic groups' high earners like ISPU's household incomes", () => {
    const average = ALL_ETHNICITIES.reduce(
      (s, e) => s + ETHNIC_GROUPS[e].share * ETHNIC_GROUPS[e].householdIncome100kPlus,
      0,
    )
    const overall = share({ minIncome: 100_000 })
    for (const e of ['arab', 'black', 'desi', 'white'] as Ethnicity[]) {
      const modelRatio = share({ minIncome: 100_000 }, { ethnicities: [e] }) / overall
      const sourceRatio = ETHNIC_GROUPS[e].householdIncome100kPlus / average
      expect(Math.abs(modelRatio / sourceRatio - 1), `${e}: ${modelRatio.toFixed(2)} vs ${sourceRatio.toFixed(2)}`).toBeLessThan(0.1)
    }
  })
})

describe('height (CDC NHANES)', () => {
  it('gives the normal-curve share of 6-footers', () => {
    const mean = ETHNIC_GROUPS.black.meanHeight.usBorn.male
    const expected = 1 - normalCdf((71.5 - mean) / HEIGHT_SD.male)
    expectNear(
      share({ heightMin: 72 }, { sex: 'male', ethnicities: ['black'], ...US_BORN }),
      expected,
      0.003,
      'US-born Black men 6ft+',
    )
  })
})
