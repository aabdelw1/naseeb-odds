// ESTIMATES — good enough to build the UI, not to quote.
//
// How the numbers work: src/lib/model.ts builds a synthetic population of US Muslims out
// of "cells" (age band × sex × ethnicity × generation × education × marital status × sect),
// seeds their sizes from the tables in src/data, then calibrates them until the model
// reproduces published figures. Filters count the matching cells, so combinations stay
// consistent with each other: $250k+ earners are mostly degree holders, immigrants are
// more often married, converts are mostly US-born, and so on.
//
// Researched:
// - Total: ~4.5M Muslims of all ages (US Religion Census 2020), with Pew 2017's age mix.
// - Ethnicity mix, adult sex ratio and education gaps between groups: ISPU American
//   Muslim Poll (2025), blended with Pew.
// - Heights: CDC NHANES (2015–2018) by race for US-born Muslims; home-country averages
//   for immigrants.
// - Religion, education, generation and marriage by birthplace: Pew 2017 (religion.ts,
//   background.ts). Earnings by education: BLS; income by race: ISPU and Pew (earnings.ts).
//
// Approximated (replace with better sources before sharing results widely):
// - 5-year age bands interpolated from Pew's broad adult brackets
// - the starting shape of marital status by age (general US pattern), which is then
//   calibrated to Pew's marriage rates for immigrant and US-born Muslims
// - the share of divorced people with kids
// - generation and sect mix within each ethnicity

import type { Birthplace, Nativity } from './background'
import type { Sect } from './religion'

export type Sex = 'male' | 'female'

export type Ethnicity = 'arab' | 'black' | 'desi' | 'white' | 'other'

export type MaritalStatus = 'neverMarried' | 'divorcedNoKids' | 'divorcedWithKids' | 'widowed' | 'married'

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
  /** Starting shares by marital status; they sum to 1. Adults are recalibrated later. */
  marital: MaritalShares
  /** Share of divorced people who have at least one child. */
  divorcedWithKids: number
  /** Starting share of men with any earnings; women and the overall level are adjusted in the model. */
  earners: number
}

export interface EthnicGroup {
  /** Share of US Muslims; all groups sum to 1. */
  share: number
  /** Mean adult height in inches, for immigrants and for the US-born. */
  meanHeight: Record<Birthplace, Record<Sex, number>>
  /** Generation mix of adults; sums to 1. */
  nativity: Record<Nativity, number>
  /** Sect mix; sums to 1. */
  sects: Record<Sect, number>
  /** ISPU 2025 share with a high school diploma or less; the model keeps the gaps between groups. */
  highSchoolOrLess: number
  /** ISPU 2025 share of households earning $100k+, used for each group's relative earnings. */
  householdIncome100kPlus: number
  /** Earnings of US-born members relative to US-born Muslims overall (see ETHNIC_GROUPS). */
  usBornEarnings: number
}

export const AGE_MIN = 0
/** The last band is really "75+"; the slider tops out here and shows "90+". */
export const AGE_MAX = 90
export const ADULT_AGE = 18

/**
 * US Religion Census 2020 counted ~4.45M Muslims; Pew's 2023–24 Religious Landscape Study
 * puts Muslims at about 1% of US adults, in line with that. Pew's 2017 estimate was 3.45M.
 */
export const US_MUSLIM_POPULATION = 4_500_000
const PEW_2017_POPULATION = 3_450_000

/** ISPU 2025: 56% of Muslim adults are men. Children are assumed to be 50/50. */
export const ADULT_SEX_SHARE: Record<Sex, number> = { male: 0.56, female: 0.44 }
export const CHILD_SEX_SHARE: Record<Sex, number> = { male: 0.5, female: 0.5 }

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
// Heights (inches). US-born children of immigrants grow taller than their parents'
// home-country averages, so US-born Muslims use NHANES 2015–2018 means for their race
// group (non-Hispanic white 69.5 / 63.9, Black 69.3 / 64.0, Asian 67.1 / 61.5, Hispanic
// 67.1 / 62.0, men / women) and immigrants use home-country averages.
//
// Generation mix (immigrant / 2nd gen / 3rd gen+), fitted to Pew 2017: 58% / 18% / 24%
// overall, and race within each generation: Black 11% / 7% / 51%, white (including
// Arabs) 45% / 52% / 23%, Asian 41% / 22% / 2%, Hispanic 1% / 17% / 18%. 13% of Muslim
// adults are US-born Black and 6% foreign-born Black.
//
// Sect mix, approximated to reproduce Pew's Sunni 55% / Shia 16% / just Muslim 14%.
// Pew: US-born Black Muslims are 45% Sunni and 43% no particular sect or no answer;
// Iranians (in "white" here) are mostly Shia.
//
// High school or less, ISPU 2025: Black 35%, White 14%, Asian 10%. Arab and "other" are
// not reported.
//
// $100k+ household income, ISPU 2025: white 44%, Asian 34%, Arab 19%, Black 7%.
// "Other" is not reported and is assumed to be 15%. Those gaps mostly reflect
// immigrants, so the model fits them through immigrant earnings. US-born earnings
// follow Pew 2013's second-generation Americans: median household incomes of $67.5k
// (Asian), $63.2k (white), $48.4k (Hispanic), $43.5k (Black) vs $58.1k overall,
// square-rooted because education differences are already modelled separately.
export const ETHNIC_GROUPS: Record<Ethnicity, EthnicGroup> = {
  arab: {
    share: 0.23,
    // Immigrants: Egypt, Lebanon, Jordan, Iraq, Morocco average 172.1 / 159.4 cm.
    // US-born: NHANES non-Hispanic white (the Census counts Arabs as white).
    meanHeight: { immigrant: { male: 67.8, female: 62.8 }, usBorn: { male: 69.5, female: 63.9 } },
    nativity: { immigrant: 0.7, secondGen: 0.27, thirdGen: 0.03 },
    sects: { sunni: 0.6, shia: 0.2, justMuslim: 0.1, other: 0.1 },
    // Not reported; assumed between White (14%) and Asian (10%).
    highSchoolOrLess: 0.12,
    householdIncome100kPlus: 0.19,
    usBornEarnings: 1.04,
  },
  black: {
    share: 0.23,
    // Immigrants: Nigeria 174.8 cm (men). US-born: NHANES non-Hispanic Black.
    meanHeight: { immigrant: { male: 68.8, female: 63.5 }, usBorn: { male: 69.3, female: 64.0 } },
    nativity: { immigrant: 0.32, secondGen: 0.06, thirdGen: 0.62 },
    sects: { sunni: 0.52, shia: 0.03, justMuslim: 0.22, other: 0.23 },
    highSchoolOrLess: 0.35,
    householdIncome100kPlus: 0.07,
    usBornEarnings: 0.87,
  },
  desi: {
    share: 0.25,
    // Immigrants: India 165 / 152 cm, Pakistan 165.8 / 153.9 cm. US-born: NHANES non-Hispanic Asian.
    meanHeight: { immigrant: { male: 65.1, female: 60.2 }, usBorn: { male: 67.1, female: 61.5 } },
    nativity: { immigrant: 0.8, secondGen: 0.17, thirdGen: 0.03 },
    sects: { sunni: 0.67, shia: 0.14, justMuslim: 0.09, other: 0.1 },
    // ISPU's Asian figure.
    highSchoolOrLess: 0.1,
    householdIncome100kPlus: 0.34,
    usBornEarnings: 1.08,
  },
  white: {
    share: 0.17,
    // Immigrants: Iran 170.3 / 157.2 cm, Afghanistan 168.2 / 155.3 cm, nudged up for Balkan
    // and Turkish Muslims. US-born (mostly converts): NHANES non-Hispanic white.
    meanHeight: { immigrant: { male: 67.3, female: 62.0 }, usBorn: { male: 69.5, female: 63.9 } },
    nativity: { immigrant: 0.55, secondGen: 0.17, thirdGen: 0.28 },
    sects: { sunni: 0.35, shia: 0.4, justMuslim: 0.12, other: 0.13 },
    highSchoolOrLess: 0.14,
    householdIncome100kPlus: 0.44,
    usBornEarnings: 1.04,
  },
  other: {
    share: 0.12,
    // Immigrants: Indonesia 164 / 154.1 cm, Malaysia 165.2 / 154.4 cm. US-born: NHANES Hispanic.
    meanHeight: { immigrant: { male: 65.0, female: 60.7 }, usBorn: { male: 67.1, female: 62.0 } },
    nativity: { immigrant: 0.3, secondGen: 0.27, thirdGen: 0.43 },
    sects: { sunni: 0.55, shia: 0.05, justMuslim: 0.2, other: 0.2 },
    // Not reported; assumed like Black Muslims (second-generation Hispanic Americans have
    // among the lowest college rates, Pew 2013).
    highSchoolOrLess: 0.35,
    householdIncome100kPlus: 0.15,
    usBornEarnings: 0.91,
  },
}

/** Counts are given in Pew 2017's age mix (summing to 3.45M) and scaled to US_MUSLIM_POPULATION. */
function band(
  min: number,
  max: number,
  pew2017Count: number,
  [neverMarried, married, divorced, widowed]: [number, number, number, number],
  divorcedWithKids: number,
  earners: number,
): AgeBand {
  const count = Math.round((pew2017Count * US_MUSLIM_POPULATION) / PEW_2017_POPULATION)
  return { min, max, count, marital: { neverMarried, married, divorced, widowed }, divorcedWithKids, earners }
}

export const AGE_BANDS: AgeBand[] = [
  //   ages     count     never  married divorced widowed  div+kids earners
  band(0, 5, 360_000, [1, 0, 0, 0], 0, 0),
  band(5, 10, 340_000, [1, 0, 0, 0], 0, 0),
  band(10, 15, 330_000, [1, 0, 0, 0], 0, 0),
  band(15, 18, 270_000, [0.99, 0.01, 0, 0], 0, 0.2),
  // Adult bands add up to Pew's brackets: 18–29 35%, 30–39 25%, 40–54 26%, 55+ 14%.
  band(18, 22, 250_000, [0.95, 0.045, 0.005, 0], 0.2, 0.45),
  band(22, 25, 190_000, [0.79, 0.19, 0.02, 0], 0.35, 0.68),
  band(25, 30, 313_000, [0.55, 0.41, 0.04, 0], 0.5, 0.8),
  band(30, 35, 270_000, [0.33, 0.59, 0.075, 0.005], 0.65, 0.82),
  band(35, 40, 267_000, [0.22, 0.66, 0.11, 0.01], 0.75, 0.82),
  band(40, 45, 198_000, [0.16, 0.68, 0.145, 0.015], 0.75, 0.82),
  band(45, 50, 188_000, [0.13, 0.68, 0.17, 0.02], 0.75, 0.8),
  band(50, 55, 173_000, [0.11, 0.68, 0.18, 0.03], 0.75, 0.8),
  band(55, 60, 104_000, [0.09, 0.67, 0.2, 0.04], 0.75, 0.7),
  band(60, 65, 80_000, [0.07, 0.66, 0.21, 0.06], 0.75, 0.7),
  band(65, 70, 58_000, [0.06, 0.64, 0.2, 0.1], 0.75, 0.25),
  band(70, 75, 35_000, [0.05, 0.6, 0.17, 0.18], 0.75, 0.25),
  band(75, 90, 24_000, [0.04, 0.48, 0.12, 0.36], 0.75, 0.25),
]

export const TOTAL_POPULATION = AGE_BANDS.reduce((sum, b) => sum + b.count, 0)

export const ADULT_POPULATION = AGE_BANDS.filter((b) => b.min >= ADULT_AGE).reduce((sum, b) => sum + b.count, 0)
