import { describe, expect, it } from 'vitest'
import { resultBucket } from '../lib/analytics'

describe('resultBucket', () => {
  it('groups result sizes into rough ranges', () => {
    expect([0, 1, 99, 100, 999, 1_000, 9_999, 10_000, 99_999, 100_000, 4_500_000].map(resultBucket)).toEqual([
      '0',
      '1–99',
      '1–99',
      '100–999',
      '100–999',
      '1k–10k',
      '1k–10k',
      '10k–100k',
      '10k–100k',
      '100k+',
      '100k+',
    ])
  })
})
