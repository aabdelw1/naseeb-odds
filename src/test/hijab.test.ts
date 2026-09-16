import { describe, expect, it } from 'vitest'
import { HIJAB } from '../data/religion'
import { countMatching, DEFAULT_FILTERS } from '../lib/filters'
import { ADULTS, count, share } from './helpers'

// Pew Research Center (2017): 38% of US Muslim women always wear a headcover in public and 5%
// most of the time, so 43% "wear hijab". Among women without a degree 44% always cover, against
// 24% of college graduates.

const WOMEN = { ...ADULTS, sex: 'female' as const }

describe('hijab', () => {
  it('matches the published share of Muslim women', () => {
    expect(share({ wearsHijab: true }, {}, WOMEN)).toBeCloseTo(HIJAB.overall, 2)
  })

  it('is more common among women without a degree, as Pew reports', () => {
    const degree = share({ wearsHijab: true }, { minEducation: 'bachelors' }, WOMEN)
    const everyone = share({ wearsHijab: true }, {}, WOMEN)
    expect(degree).toBeLessThan(everyone)
    expect(degree).toBeCloseTo(HIJAB.byDegree.degree, 1)
  })

  it('goes together with praying five times a day', () => {
    const praying = share({ wearsHijab: true }, { praysFiveDaily: true }, WOMEN)
    const everyone = share({ wearsHijab: true }, {}, WOMEN)
    expect(praying).toBeGreaterThan(everyone * 1.2)
    expect(praying).toBeLessThan(1)
  })

  it('leaves a search for brothers alone', () => {
    expect(count({ wearsHijab: true, sex: 'male' })).toBe(count({ sex: 'male' }))
  })

  it('narrows the sisters but keeps every brother when either would do', () => {
    const both = count({ wearsHijab: true, sex: 'any' })
    const brothers = count({ sex: 'male' })
    const sistersWearing = count({ wearsHijab: true, sex: 'female' })
    // Each count is rounded on its own, so allow a person either way.
    expect(Math.abs(both - (brothers + sistersWearing))).toBeLessThanOrEqual(2)
    expect(both).toBeGreaterThan(sistersWearing)
    expect(both).toBeLessThan(count({ sex: 'any' }))
  })

  it('leaves out children, who have no hijab rate', () => {
    const everyone = { ...DEFAULT_FILTERS, sex: 'female' as const, wearsHijab: true }
    expect(countMatching(everyone)).toBe(count({ wearsHijab: true }, WOMEN))
  })

  // Pew publishes no breakdown beyond education, so these check the assumed direction of
  // HIJAB_TILTS rather than a published figure.
  it('fades with each generation among women born into Islam', () => {
    // The fade belongs to families born Muslim. Third-generation Muslim women are mostly Black
    // American converts and their daughters, who cover more, so the overall third-generation
    // rate is higher rather than lower.
    const bornMuslim = { convert: 'bornMuslim' as const }
    const immigrant = share({ wearsHijab: true }, { ...bornMuslim, nativity: ['immigrant'] }, WOMEN)
    const second = share({ wearsHijab: true }, { ...bornMuslim, nativity: ['secondGen'] }, WOMEN)
    const third = share({ wearsHijab: true }, { ...bornMuslim, nativity: ['thirdGen'] }, WOMEN)
    expect(immigrant).toBeGreaterThan(second)
    expect(second).toBeGreaterThan(third)
  })

  it('is more common among older women', () => {
    const older = share({ wearsHijab: true }, { ageMin: 45 }, WOMEN)
    const younger = share({ wearsHijab: true }, { ageMin: 18, ageMax: 29 }, WOMEN)
    expect(older).toBeGreaterThan(younger)
  })

  it('is more common among Sunni than Shia women', () => {
    const sunni = share({ wearsHijab: true }, { sects: ['sunni'] }, WOMEN)
    const shia = share({ wearsHijab: true }, { sects: ['shia'] }, WOMEN)
    expect(sunni).toBeGreaterThan(shia)
  })

  it('is more common among converts, including beside born Muslims of the same background', () => {
    expect(share({ wearsHijab: true }, { convert: 'convert' }, WOMEN)).toBeGreaterThan(
      share({ wearsHijab: true }, { convert: 'bornMuslim' }, WOMEN),
    )
    const generation = { nativity: ['thirdGen' as const] }
    expect(share({ wearsHijab: true }, { ...generation, convert: 'convert' }, WOMEN)).toBeGreaterThan(
      share({ wearsHijab: true }, { ...generation, convert: 'bornMuslim' }, WOMEN),
    )
  })

  it('goes together with weekly mosque attendance', () => {
    const mosque = share({ wearsHijab: true }, { mosqueWeekly: true }, WOMEN)
    expect(mosque).toBeGreaterThan(share({ wearsHijab: true }, {}, WOMEN))
  })

  it('stays within believable bounds for every single trait', () => {
    // No assumed tilt should push a group to almost-everyone or almost-nobody.
    for (const given of [
      { nativity: ['immigrant' as const] },
      { nativity: ['thirdGen' as const] },
      { sects: ['sunni' as const] },
      { sects: ['shia' as const] },
      { ageMin: 60 },
      { convert: 'convert' as const },
      { praysFiveDaily: true },
    ]) {
      const wearing = share({ wearsHijab: true }, given, WOMEN)
      expect(wearing).toBeGreaterThan(0.1)
      expect(wearing).toBeLessThan(0.9)
    }
  })

  it('narrows the pool without emptying it', () => {
    const wearing = count({ wearsHijab: true }, WOMEN)
    expect(wearing).toBeGreaterThan(0)
    expect(wearing).toBeLessThan(count({}, WOMEN))
  })
})
