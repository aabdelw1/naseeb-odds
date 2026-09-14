import type { Birthplace, Nativity } from './background'
import type { Ethnicity, Sex } from './population'

// Pew Research Center, "U.S. Muslims Concerned About Their Place in Society, but Continue
// to Believe in the American Dream" (2017), chapters 1 and 6. All rates are for adults.

export type Sect = 'sunni' | 'shia' | 'justMuslim' | 'other'

/** "Other" covers other answers and no answer. */
export const SECT_SHARES: Record<Sect, number> = { sunni: 0.55, shia: 0.16, justMuslim: 0.14, other: 0.15 }

/** Published rates for a yes/no religious practice, by each group Pew reports. */
export interface PracticeRates {
  overall: number
  bySex: Record<Sex, number>
  /** Age brackets, youngest first; each runs up to the next bracket's minAge. */
  byAge: { minAge: number; rate: number }[]
  /** College degree or more vs. some college or less. */
  byDegree: { degree: number; noDegree: number }
  byBirthplace: Record<Birthplace, number>
  byMarried: { married: number; notMarried: number }
  /** Pew doesn't report "other"; the model backs it out from the overall rate. */
  bySect: Record<Exclude<Sect, 'other'>, number>
  /** Particular origin groups Pew reports on. */
  byGroup: { label: string; ethnicity: Ethnicity; usBornOnly?: boolean; rate: number }[]
}

export const PRAYS_FIVE_DAILY: PracticeRates = {
  overall: 0.42,
  bySex: { male: 0.39, female: 0.45 },
  byAge: [
    { minAge: 18, rate: 0.33 },
    { minAge: 30, rate: 0.46 },
    { minAge: 40, rate: 0.45 },
    { minAge: 55, rate: 0.53 },
  ],
  byDegree: { degree: 0.36, noDegree: 0.44 },
  byBirthplace: { immigrant: 0.44, usBorn: 0.39 },
  byMarried: { married: 0.5, notMarried: 0.32 },
  bySect: { sunni: 0.43, shia: 0.49, justMuslim: 0.49 },
  byGroup: [
    { label: 'Middle East–North Africa origin', ethnicity: 'arab', rate: 0.54 },
    { label: 'South Asian origin', ethnicity: 'desi', rate: 0.4 },
  ],
}

export const MOSQUE_WEEKLY: PracticeRates = {
  overall: 0.43,
  bySex: { male: 0.48, female: 0.37 },
  byAge: [
    { minAge: 18, rate: 0.43 },
    { minAge: 40, rate: 0.42 },
  ],
  byDegree: { degree: 0.36, noDegree: 0.46 },
  byBirthplace: { immigrant: 0.45, usBorn: 0.4 },
  byMarried: { married: 0.47, notMarried: 0.37 },
  bySect: { sunni: 0.5, shia: 0.17, justMuslim: 0.5 },
  byGroup: [{ label: 'US-born Black', ethnicity: 'black', usBornOnly: true, rate: 0.43 }],
}

/**
 * Assumed: how strongly praying all five and weekly mosque attendance go together, from
 * 0 (unrelated) to 1 (as overlapping as the two rates allow). Pew doesn't publish it.
 */
export const PRAYER_MOSQUE_CORRELATION = 0.5

/** Pew: 23% of adults are converts; two-thirds of US-born Black Muslims; one-in-seven of everyone else. */
export const CONVERTS = { overall: 0.23, usBornBlack: 0.67, everyoneElse: 1 / 7 }

/**
 * Approximated convert rates by generation and ethnicity, chosen to reproduce CONVERTS.
 * Nearly all immigrants and children of immigrants were born Muslim. Among third
 * generation and beyond, Black, white and Hispanic ("other") Muslims are mostly converts,
 * while grandchildren of Arab and Desi immigrants are mostly born Muslim.
 */
export const CONVERT_SHARE: Record<Nativity, Record<Ethnicity, number>> = {
  immigrant: { arab: 0.02, black: 0.02, desi: 0.02, white: 0.02, other: 0.02 },
  secondGen: { arab: 0.08, black: 0.1, desi: 0.08, white: 0.08, other: 0.08 },
  thirdGen: { arab: 0.2, black: 0.75, desi: 0.2, white: 0.85, other: 0.85 },
}
