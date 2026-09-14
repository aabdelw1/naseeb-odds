import { describe, expect, it } from 'vitest'
import { debugReport } from '../lib/debug'
import { countMatching, DEFAULT_FILTERS, totalPopulation, type Filters } from '../lib/filters'

describe('debug report', () => {
  it('has no steps for the default filters', () => {
    const report = debugReport(DEFAULT_FILTERS, 'realistic')
    expect(report.changed).toEqual({})
    expect(report.steps).toEqual([])
    expect(Math.abs(report.count - totalPopulation())).toBeLessThanOrEqual(2)
  })

  it('walks through each changed filter down to the final count', () => {
    const filters: Filters = {
      ...DEFAULT_FILTERS,
      sex: 'male',
      ageMin: 27,
      ageMax: 34,
      minEducation: 'bachelors',
      praysFiveDaily: true,
    }
    const report = debugReport(filters, 'realistic')
    expect(report.steps.map((s) => s.filter)).toEqual(['sex', 'ageMin/ageMax', 'minEducation', 'praysFiveDaily'])
    expect(report.steps[report.steps.length - 1].count).toBe(report.count)
    report.steps.slice(1).forEach((step, i) => expect(step.count).toBeLessThanOrEqual(report.steps[i].count + 1))
    for (const step of report.steps) expect(step.countWithoutIt).toBeGreaterThanOrEqual(report.count)
  })

  it('reproduces the same count from the copied JSON', () => {
    const filters: Filters = { ...DEFAULT_FILTERS, sex: 'female', ethnicities: ['arab', 'desi'], heightMin: 64, minIncome: 75_000 }
    const pasted = JSON.parse(JSON.stringify(debugReport(filters, 'generous')))
    expect(countMatching({ ...DEFAULT_FILTERS, ...pasted.changed }, pasted.estimate)).toBe(pasted.count)
  })
})
