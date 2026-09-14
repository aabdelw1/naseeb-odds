import { expect } from 'vitest'
import { pct } from './helpers'

/** Asserts a rate is within `tolerance` (absolute, e.g. 0.02 = 2 points) of a published figure. */
export function expectNear(actual: number, expected: number, tolerance: number, label: string): void {
  expect(
    Math.abs(actual - expected),
    `${label}: model ${pct(actual)}, source ${pct(expected)} ± ${pct(tolerance)}`,
  ).toBeLessThanOrEqual(tolerance)
}
