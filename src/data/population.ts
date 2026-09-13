// ROUGH PLACEHOLDER ESTIMATES — good enough to build the UI, not to quote.
//
// The totals follow Pew Research Center's 2017 estimate: ~3.45M Muslims in
// the US, ~2.15M of them adults. Pew only publishes broad adult age brackets,
// so the 5-year bands below are our own interpolation, and the 50/50 sex
// split is an assumption. Replace with better sources before sharing widely.

export type Sex = 'male' | 'female'

export interface AgeBand {
  min: number
  /** Exclusive upper bound. */
  max: number
  count: number
}

export const AGE_MIN = 0
/** The last band is really "75+"; the slider tops out here and shows "90+". */
export const AGE_MAX = 90

export const AGE_BANDS: AgeBand[] = [
  { min: 0, max: 5, count: 360_000 },
  { min: 5, max: 10, count: 340_000 },
  { min: 10, max: 15, count: 330_000 },
  { min: 15, max: 18, count: 270_000 },
  { min: 18, max: 25, count: 440_000 },
  { min: 25, max: 30, count: 312_000 },
  { min: 30, max: 35, count: 250_000 },
  { min: 35, max: 40, count: 245_000 },
  { min: 40, max: 45, count: 190_000 },
  { min: 45, max: 50, count: 180_000 },
  { min: 50, max: 55, count: 168_000 },
  { min: 55, max: 60, count: 120_000 },
  { min: 60, max: 65, count: 95_000 },
  { min: 65, max: 70, count: 70_000 },
  { min: 70, max: 75, count: 45_000 },
  { min: 75, max: 90, count: 35_000 },
]

export const SEX_SHARE: Record<Sex, number> = { male: 0.5, female: 0.5 }

export const TOTAL_POPULATION = AGE_BANDS.reduce((sum, b) => sum + b.count, 0)
