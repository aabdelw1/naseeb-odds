// ESTIMATES — good enough to build the UI, not to quote.
//
// Researched:
// - Totals: Pew Research Center (2017), ~3.45M Muslims in the US, ~2.15M adults.
// - Ethnicity mix and adult sex ratio: ISPU American Muslim Poll (2025), the one
//   major survey that counts Arabs separately instead of folding them into white.
// - Heights: CDC NHANES (2015–2018) by race for US-born-heavy groups, blended with
//   NCD-RisC / national survey averages for immigrant-heavy groups.
//
// Approximated (replace with better sources before sharing results widely):
// - 5-year age bands interpolated from Pew's broad adult brackets
// - marital status by age, shaped like the general US population (ACS)
// - the share of divorced people with kids, and earnings curves
// - most filters are treated as independent of each other (e.g. ethnicity doesn't change
//   the age mix). The exceptions: height depends on sex and ethnicity; generation
//   depends on ethnicity; prayer and mosque attendance depend on sex and sect (prayer
//   also on age); education and converts depend on generation.
//
// Religion and background data live in religion.ts and background.ts.

import type { Nativity } from './background'

export type Sex = 'male' | 'female'

export type Ethnicity = 'arab' | 'black' | 'desi' | 'white' | 'other'

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

export interface EthnicGroup {
  /** Share of US Muslims; all groups sum to 1. */
  share: number
  /** Mean adult height in inches. */
  meanHeight: Record<Sex, number>
  /** Generation mix of adults; sums to 1. */
  nativity: Record<Nativity, number>
}

export const AGE_MIN = 0
/** The last band is really "75+"; the slider tops out here and shows "90+". */
export const AGE_MAX = 90
export const ADULT_AGE = 18

/** ISPU 2025: 56% of Muslim adults are men. Children are assumed to be 50/50. */
export const ADULT_SEX_SHARE: Record<Sex, number> = { male: 0.56, female: 0.44 }
export const CHILD_SEX_SHARE: Record<Sex, number> = { male: 0.5, female: 0.5 }

/** Women's earner share and median earnings, relative to men's. */
export const FEMALE_INCOME_FACTOR = { earners: 0.8, medianIncome: 0.8 }

/** Spread of the log-normal earnings curve within a band. */
export const INCOME_SIGMA = 0.75

/** Height slider bounds in inches (4'8" to 6'8"); the ends mean "or shorter" / "or taller". */
export const HEIGHT_MIN = 56
export const HEIGHT_MAX = 80

/**
 * Standard deviation of adult height within one ethnic group, in inches. Derived from
 * the 5th–95th percentile spread of each race group in NHANES 2015–2018 (tables 10, 12).
 */
export const HEIGHT_SD: Record<Sex, number> = { male: 2.8, female: 2.6 }

// Ethnicity shares blend three estimates, because no single survey measures Arabs well:
//
// 1. ISPU 2025 self-ID: Black 28%, Asian 24%, white 20%, Arab 12%, Hispanic 9%,
//    mixed/other ~7%. Arab is a floor: many Arabs tick "white", as the Census
//    instructs, and two-thirds of ISPU's white Muslims are foreign-born.
// 2. Pew 2017 origins: 58% of Muslim adults are immigrants, 25% of them from the
//    Middle East–North Africa (Iran is counted separately), so ~14.5% are Arab-born;
//    add second- and third-generation Arabs for ~19%. Black: 11% of immigrants and
//    32% of US-born Muslims, ~20%.
// 3. Top-down: 2.7M (Census 2020) to 3.7M (Arab American Institute) Arab Americans,
//    24–35% of them Muslim, is 0.65–1.3M of ~3.45M Muslims: ~19–38% Arab.
//
// Arab and Black come out roughly tied (~23% each). "White" here means non-Arab
// white: Persian, Turkish, Afghan, Balkan and convert Muslims. "Desi" follows Pew's
// South Asian origins (Pakistan, India, Bangladesh). "Other" is mostly Hispanic,
// Southeast Asian and mixed.
//
// Heights (inches). NHANES 2015–2018 means: non-Hispanic white 69.5 / 63.9,
// non-Hispanic Black 69.3 / 64.0, non-Hispanic Asian 67.1 / 61.5, Hispanic 67.1 / 62.0
// (men / women). Immigrant-heavy groups (~58% of Muslim adults are foreign-born, Pew)
// blend 60% home-region average with 40% US average.
//
// Generation mix (immigrant / 2nd gen / 3rd gen+), approximated to reproduce Pew's
// 58% / 18% / 24% overall. Pew: 13% of Muslim adults are US-born Black and 6% are
// foreign-born Black; Arab and Desi Muslims are mostly immigrants and their children.
export const ETHNIC_GROUPS: Record<Ethnicity, EthnicGroup> = {
  // Egypt, Lebanon, Jordan, Iraq, Morocco average 172.1 / 159.4 cm, blended with US average.
  arab: {
    share: 0.23,
    meanHeight: { male: 68.3, female: 63.1 },
    nativity: { immigrant: 0.72, secondGen: 0.25, thirdGen: 0.03 },
  },
  // NHANES non-Hispanic Black.
  black: {
    share: 0.23,
    meanHeight: { male: 69.3, female: 64.0 },
    nativity: { immigrant: 0.32, secondGen: 0.08, thirdGen: 0.6 },
  },
  // India 165 / 152 cm, Pakistan 165.8 / 153.9 cm, blended with NHANES Asian.
  desi: {
    share: 0.25,
    meanHeight: { male: 66.0, female: 60.7 },
    nativity: { immigrant: 0.72, secondGen: 0.25, thirdGen: 0.03 },
  },
  // Mostly foreign-born: Iran 170.3 / 157.2 cm, Afghanistan 168.2 / 155.3 cm, plus
  // taller Balkan and Turkish Muslims; about one-third converts at NHANES white height.
  white: {
    share: 0.17,
    meanHeight: { male: 68.2, female: 62.8 },
    nativity: { immigrant: 0.6, secondGen: 0.12, thirdGen: 0.28 },
  },
  // Mostly Hispanic: NHANES Hispanic. Many Hispanic Muslims are US-born converts.
  other: {
    share: 0.12,
    meanHeight: { male: 67.1, female: 62.0 },
    nativity: { immigrant: 0.4, secondGen: 0.15, thirdGen: 0.45 },
  },
}

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
