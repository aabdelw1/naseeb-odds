import { describe, expect, it } from 'vitest'
import { formatPercent } from '../lib/format'

describe('formatPercent', () => {
  it('keeps three significant figures, however small the share', () => {
    expect(formatPercent(1)).toBe('100%')
    expect(formatPercent(0.421234)).toBe('42.1%')
    expect(formatPercent(0.0803)).toBe('8.03%')
    expect(formatPercent(43 / 4_500_000)).toBe('0.000956%')
    expect(formatPercent(1 / 4_500_000)).toBe('0.0000222%')
  })

  it('shows zero as 0%', () => {
    expect(formatPercent(0)).toBe('0%')
  })
})
