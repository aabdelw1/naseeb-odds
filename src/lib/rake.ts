import { logit, sigmoid } from './stats'

/** Puts each item in a group (or null to leave it out) and gives each group a target. */
export interface Margin<T> {
  group: (item: T) => string | null
  targets: Record<string, number>
}

interface IndexedMargin {
  /** Group position per item; -1 when the item isn't in a targeted group. */
  groupOf: Int32Array
  targets: Float64Array
}

function indexMargin<T>(items: readonly T[], margin: Margin<T>): IndexedMargin {
  const keys = Object.keys(margin.targets)
  const position = new Map(keys.map((key, i) => [key, i]))
  const groupOf = new Int32Array(items.length)
  items.forEach((item, i) => {
    const key = margin.group(item)
    groupOf[i] = key === null ? -1 : (position.get(key) ?? -1)
  })
  return { groupOf, targets: Float64Array.from(keys, (key) => margin.targets[key]) }
}

/**
 * Iterative proportional fitting ("raking"): scales `weights` in place until, for every
 * margin, each group's share of the margin's total weight matches its target share.
 * Targets within a margin are normalized, so they can be counts or shares.
 * Returns the largest adjustment still being made when it stopped.
 */
export function rakeWeights<T>(
  items: readonly T[],
  weights: Float64Array,
  margins: Margin<T>[],
  maxIterations = 500,
  tolerance = 1e-10,
): number {
  const indexed = margins.map((margin) => indexMargin(items, margin))
  let largest = Infinity
  for (let iteration = 0; iteration < maxIterations && largest > tolerance; iteration++) {
    largest = 0
    for (const { groupOf, targets } of indexed) {
      const totals = new Float64Array(targets.length)
      let included = 0
      for (let i = 0; i < weights.length; i++) {
        const g = groupOf[i]
        if (g < 0) continue
        totals[g] += weights[i]
        included += weights[i]
      }
      const targetSum = targets.reduce((a, b) => a + b, 0)
      const factors = Float64Array.from(totals, (total, g) =>
        total > 0 ? ((targets[g] / targetSum) * included) / total : 1,
      )
      for (const factor of factors) largest = Math.max(largest, Math.abs(factor - 1))
      for (let i = 0; i < weights.length; i++) {
        if (groupOf[i] >= 0) weights[i] *= factors[groupOf[i]]
      }
    }
  }
  return largest
}

/**
 * Fits per-item probabilities, held as log-odds in `logits`, so that each group's
 * weighted average rate matches its target rate, adjusting every margin in turn.
 * Returns the largest log-odds shift still being made when it stopped.
 */
export function rakeRates<T>(
  items: readonly T[],
  weights: Float64Array,
  logits: Float64Array,
  margins: Margin<T>[],
  maxIterations = 80,
  tolerance = 1e-4,
): number {
  const indexed = margins.map((margin) => indexMargin(items, margin))
  let largest = Infinity
  for (let iteration = 0; iteration < maxIterations && largest > tolerance; iteration++) {
    largest = 0
    for (const { groupOf, targets } of indexed) {
      const hits = new Float64Array(targets.length)
      const totals = new Float64Array(targets.length)
      for (let i = 0; i < weights.length; i++) {
        const g = groupOf[i]
        if (g < 0) continue
        hits[g] += weights[i] * sigmoid(logits[i])
        totals[g] += weights[i]
      }
      const shifts = Float64Array.from(targets, (target, g) =>
        totals[g] > 0 ? logit(target) - logit(hits[g] / totals[g]) : 0,
      )
      for (const shift of shifts) largest = Math.max(largest, Math.abs(shift))
      for (let i = 0; i < weights.length; i++) {
        if (groupOf[i] >= 0) logits[i] += shifts[groupOf[i]]
      }
    }
  }
  return largest
}
