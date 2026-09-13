// ROUGH PLACEHOLDER ESTIMATES — good enough to build the UI, not to quote.
//
// Totals follow Pew Research Center's 2017 estimate: ~3.45M Muslims in the US,
// ~2.15M of them adults. Everything else is our own approximation:
// - 5-year age bands interpolated from Pew's broad adult brackets
// - a 50/50 sex split
// - marital status by age, shaped like the general US population (ACS)
// - earnings loosely modelled on general US patterns
// Replace with better sources before sharing results widely.

export type Sex = 'male' | 'female'

export interface MaritalShares {
  neverMarried: number
  married: number
  /** Includes separated. */
  divorced: number
  widowed: number
}

export interface AgeBand {
  min: number
  /** Exclusive upper bound. */
  max: number
  count: number
  /** Shares of the band by marital status; they sum to 1. */
  marital: MaritalShares
  /** Share of divorced people who have at least one child. */
  divorcedWithKids: number
  /** Share of men with any earnings. */
  earners: number
  /** Median annual earnings among men with earnings. */
  medianIncome: number
}

export const AGE_MIN = 0
/** The last band is really "75+"; the slider tops out here and shows "90+". */
export const AGE_MAX = 90

export const SEX_SHARE: Record<Sex, number> = { male: 0.5, female: 0.5 }

/** Women's earner share and median earnings, relative to men's. */
export const FEMALE_INCOME_FACTOR = { earners: 0.8, medianIncome: 0.8 }

/** Spread of the log-normal earnings curve within a band. */
export const INCOME_SIGMA = 0.75

function band(
  min: number,
  max: number,
  count: number,
  [neverMarried, married, divorced, widowed]: [number, number, number, number],
  divorcedWithKids: number,
  earners: number,
  medianIncome: number,
): AgeBand {
  return {
    min,
    max,
    count,
    marital: { neverMarried, married, divorced, widowed },
    divorcedWithKids,
    earners,
    medianIncome,
  }
}

export const AGE_BANDS: AgeBand[] = [
  //   ages     count     never  married divorced widowed  div+kids earners median
  band(0, 5, 360_000, [1, 0, 0, 0], 0, 0, 0),
  band(5, 10, 340_000, [1, 0, 0, 0], 0, 0, 0),
  band(10, 15, 330_000, [1, 0, 0, 0], 0, 0, 0),
  band(15, 18, 270_000, [0.99, 0.01, 0, 0], 0, 0.2, 5_000),
  band(18, 25, 440_000, [0.88, 0.11, 0.01, 0], 0.3, 0.55, 22_000),
  band(25, 30, 312_000, [0.55, 0.41, 0.04, 0], 0.5, 0.8, 45_000),
  band(30, 35, 250_000, [0.33, 0.59, 0.075, 0.005], 0.65, 0.82, 58_000),
  band(35, 40, 245_000, [0.22, 0.66, 0.11, 0.01], 0.75, 0.82, 68_000),
  band(40, 45, 190_000, [0.16, 0.68, 0.145, 0.015], 0.75, 0.82, 68_000),
  band(45, 50, 180_000, [0.13, 0.68, 0.17, 0.02], 0.75, 0.8, 72_000),
  band(50, 55, 168_000, [0.11, 0.68, 0.18, 0.03], 0.75, 0.8, 72_000),
  band(55, 60, 120_000, [0.09, 0.67, 0.2, 0.04], 0.75, 0.7, 65_000),
  band(60, 65, 95_000, [0.07, 0.66, 0.21, 0.06], 0.75, 0.7, 65_000),
  band(65, 70, 70_000, [0.06, 0.64, 0.2, 0.1], 0.75, 0.25, 40_000),
  band(70, 75, 45_000, [0.05, 0.6, 0.17, 0.18], 0.75, 0.25, 40_000),
  band(75, 90, 35_000, [0.04, 0.48, 0.12, 0.36], 0.75, 0.25, 40_000),
]

export const TOTAL_POPULATION = AGE_BANDS.reduce((sum, b) => sum + b.count, 0)
