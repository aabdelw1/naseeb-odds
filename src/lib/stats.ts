/** Abramowitz–Stegun 7.1.26 erf approximation, accurate to ~1e-7. */
export function normalCdf(z: number): number {
  if (z === Infinity) return 1
  if (z === -Infinity) return 0
  const x = Math.abs(z) / Math.SQRT2
  const t = 1 / (1 + 0.3275911 * x)
  const poly = ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t
  const erf = 1 - poly * Math.exp(-x * x)
  return z >= 0 ? (1 + erf) / 2 : (1 - erf) / 2
}

export function logit(p: number): number {
  const q = Math.min(Math.max(p, 1e-9), 1 - 1e-9)
  return Math.log(q / (1 - q))
}

export function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x))
}
