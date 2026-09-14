import type { Sex } from './population'

// Pew Research Center, "U.S. Muslims Concerned About Their Place in Society, but Continue
// to Believe in the American Dream" (2017), chapter 6. All rates are for adults.

export type Sect = 'sunni' | 'shia' | 'justMuslim' | 'other'

export interface SectData {
  /** Share of US Muslims. */
  share: number
  /** Share who pray all five salah daily. */
  praysFiveDaily: number
  /** Share who attend a mosque weekly or more. */
  mosqueWeekly: number
}

// "Other" covers other answers and no answer. Pew doesn't report its rates, so they are
// backed out so the weighted averages match Pew's overall 42% (prayer) and 43% (mosque).
export const SECTS: Record<Sect, SectData> = {
  sunni: { share: 0.55, praysFiveDaily: 0.43, mosqueWeekly: 0.5 },
  shia: { share: 0.16, praysFiveDaily: 0.49, mosqueWeekly: 0.17 },
  justMuslim: { share: 0.14, praysFiveDaily: 0.49, mosqueWeekly: 0.5 },
  other: { share: 0.15, praysFiveDaily: 0.24, mosqueWeekly: 0.385 },
}

export const PRAYS_FIVE_DAILY_OVERALL = 0.42
export const PRAYS_FIVE_DAILY_BY_SEX: Record<Sex, number> = { male: 0.39, female: 0.45 }
/** Oldest bracket first, so the first entry at or below a band's age is its bracket. */
export const PRAYS_FIVE_DAILY_BY_AGE = [
  { minAge: 55, rate: 0.53 },
  { minAge: 40, rate: 0.45 },
  { minAge: 30, rate: 0.46 },
  { minAge: 18, rate: 0.33 },
]

export const MOSQUE_WEEKLY_OVERALL = 0.43
export const MOSQUE_WEEKLY_BY_SEX: Record<Sex, number> = { male: 0.48, female: 0.37 }
