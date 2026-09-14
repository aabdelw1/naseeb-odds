import type { EducationLevel } from './background'

// Personal annual earnings (not household income).

/**
 * Full-time earnings by highest degree. BLS usual weekly earnings, Q2 2026, annualized:
 * medians $803 / $994 / $1,125 per week for less than high school / high school / some
 * college; spreads from each group's 10th–90th percentiles. BLS combines bachelor's and
 * advanced degrees ($1,768 median); they are split using BLS 2024's ratio of $1,541
 * (bachelor's only) to $1,916 (advanced).
 */
export const EARNINGS_BY_EDUCATION: Record<EducationLevel, { median: number; sigma: number }> = {
  lessThanHighSchool: { median: 41_800, sigma: 0.45 },
  highSchool: { median: 51_700, sigma: 0.46 },
  someCollege: { median: 58_500, sigma: 0.5 },
  bachelors: { median: 83_800, sigma: 0.55 },
  graduate: { median: 104_000, sigma: 0.58 },
}

/** Approximated: part-time workers lower the median and widen the spread vs. full-time-only figures. */
export const PART_TIME_ADJUSTMENT = { median: 0.9, sigma: 0.15 }

/** Approximated earnings by age relative to peak years. Youngest first; later ages use `otherwise`. */
export const EARNINGS_AGE_PROFILE = {
  brackets: [
    { belowAge: 25, factor: 0.55 },
    { belowAge: 30, factor: 0.8 },
    { belowAge: 35, factor: 0.92 },
    { belowAge: 55, factor: 1 },
    { belowAge: 65, factor: 0.97 },
  ],
  otherwise: 0.85,
}

/** Approximated: women's share with earnings and median earnings, relative to men's. */
export const FEMALE_EARNINGS = { earners: 0.75, median: 0.82 }

/** Pew 2017: 44% of Muslim adults work full-time and 16% part-time. */
export const EMPLOYED_SHARE = 0.6

/**
 * BLS employment-population ratio by education, ages 25+, August 2026. Used for how much
 * likelier degree holders are to have earnings; the overall level is scaled to EMPLOYED_SHARE.
 */
export const EMPLOYMENT_BY_EDUCATION: Record<EducationLevel, number> = {
  lessThanHighSchool: 0.426,
  highSchool: 0.536,
  someCollege: 0.596,
  bachelors: 0.692,
  graduate: 0.692,
}

/** Pew 2017 household incomes of $100k+: all Muslims, immigrants, US-born. */
export const HOUSEHOLD_100K_PLUS = { all: 0.24, immigrant: 0.29, usBorn: 0.18 }

/** Approximated earnings for teenagers with jobs. */
export const TEEN_EARNINGS = { median: 5_000, sigma: 0.8 }
