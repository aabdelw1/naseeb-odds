// Pew Research Center, "U.S. Muslims Concerned About Their Place in Society, but Continue
// to Believe in the American Dream" (2017), chapter 1, unless marked approximated.

/** Immigrant (first generation), US-born child of immigrants, or third generation and beyond. */
export type Nativity = 'immigrant' | 'secondGen' | 'thirdGen'

/** Pew only splits most tables by foreign-born vs US-born. */
export type Birthplace = 'immigrant' | 'usBorn'

export function birthplaceOf(nativity: Nativity): Birthplace {
  return nativity === 'immigrant' ? 'immigrant' : 'usBorn'
}

export type EducationLevel = 'lessThanHighSchool' | 'highSchool' | 'someCollege' | 'bachelors' | 'graduate'

/** Lowest first. */
export const EDUCATION_LEVELS: EducationLevel[] = ['lessThanHighSchool', 'highSchool', 'someCollege', 'bachelors', 'graduate']

/** Adults by generation. */
export const NATIVITY_SHARES: Record<Nativity, number> = { immigrant: 0.58, secondGen: 0.18, thirdGen: 0.24 }

/**
 * Age mix of adults by birthplace, in Pew's brackets (18–29, 30–39, 40–54, 55+; the US-born
 * column sums to 101). US-born Muslim adults are much younger than immigrants.
 */
export const AGE_BY_BIRTHPLACE: ({ minAge: number } & Record<Birthplace, number>)[] = [
  { minAge: 18, immigrant: 0.28, usBorn: 0.45 },
  { minAge: 30, immigrant: 0.28, usBorn: 0.22 },
  { minAge: 40, immigrant: 0.26, usBorn: 0.25 },
  { minAge: 55, immigrant: 0.18, usBorn: 0.09 },
]

/** Black Muslims as a share of all Muslim adults, by birthplace. */
export const BLACK_SHARE_BY_BIRTHPLACE: Record<Birthplace, number> = { immigrant: 0.06, usBorn: 0.13 }

/** Race within each generation. Pew's "white" includes Arabs, so it compares with Arab + White here. */
export const RACE_BY_GENERATION: Record<'black' | 'white', Record<Nativity, number>> = {
  black: { immigrant: 0.11, secondGen: 0.07, thirdGen: 0.51 },
  white: { immigrant: 0.45, secondGen: 0.52, thirdGen: 0.23 },
}

/** Pew 2017: highest degree among adults (US-born row rounded so it sums to 1). */
const PEW_2017_EDUCATION_BY_BIRTHPLACE: Record<Birthplace, Record<EducationLevel, number>> = {
  immigrant: { lessThanHighSchool: 0.1, highSchool: 0.27, someCollege: 0.25, bachelors: 0.23, graduate: 0.15 },
  usBorn: { lessThanHighSchool: 0.07, highSchool: 0.36, someCollege: 0.36, bachelors: 0.16, graduate: 0.05 },
}

/**
 * Pew's 2023–24 Religious Landscape Study: 44% of Muslim adults are college graduates,
 * including 26% with a postgraduate degree (Pew 2017: 31% and 11%). Another 30% are
 * current students without a degree.
 */
export const MUSLIM_DEGREES_2024 = { bachelorsOrMore: 0.44, graduate: 0.26 }

/**
 * Highest degree among adults by birthplace. The 2023–24 study doesn't split by birthplace,
 * so this takes Pew 2017's split, scales bachelor's and graduate degrees up to the 2023–24
 * totals, and scales the other levels down to match, keeping the immigrant / US-born gap.
 */
export const EDUCATION_BY_BIRTHPLACE = updateToCurrentDegrees(PEW_2017_EDUCATION_BY_BIRTHPLACE)

function updateToCurrentDegrees(
  old: Record<Birthplace, Record<EducationLevel, number>>,
): Record<Birthplace, Record<EducationLevel, number>> {
  const overall = (level: EducationLevel) =>
    NATIVITY_SHARES.immigrant * old.immigrant[level] + (1 - NATIVITY_SHARES.immigrant) * old.usBorn[level]
  const graduateFactor = MUSLIM_DEGREES_2024.graduate / overall('graduate')
  const bachelorsFactor = (MUSLIM_DEGREES_2024.bachelorsOrMore - MUSLIM_DEGREES_2024.graduate) / overall('bachelors')
  const update = (row: Record<EducationLevel, number>): Record<EducationLevel, number> => {
    const graduate = row.graduate * graduateFactor
    const bachelors = row.bachelors * bachelorsFactor
    const rest = (1 - graduate - bachelors) / (row.lessThanHighSchool + row.highSchool + row.someCollege)
    return {
      lessThanHighSchool: row.lessThanHighSchool * rest,
      highSchool: row.highSchool * rest,
      someCollege: row.someCollege * rest,
      bachelors,
      graduate,
    }
  }
  return { immigrant: update(old.immigrant), usBorn: update(old.usBorn) }
}

export type MaritalGroup = 'neverMarried' | 'married' | 'divorced' | 'widowed'

/**
 * Marital status among adults. Pew immigrants: married 70, never married 22, divorced 3,
 * separated 1, living with a partner 3, widowed 1. US-born: 29, 49, 13, 3, 5, 2. Living
 * with a partner counts as never married and separated as divorced; US-born rounded to 1.
 */
export const MARITAL_BY_BIRTHPLACE: Record<Birthplace, Record<MaritalGroup, number>> = {
  immigrant: { neverMarried: 0.25, married: 0.7, divorced: 0.04, widowed: 0.01 },
  usBorn: { neverMarried: 0.53, married: 0.29, divorced: 0.16, widowed: 0.02 },
}

/** Pew: 53% of Muslim adults are married. */
export const MARRIED_SHARE = 0.53

/**
 * Approximated: young adults are still finishing school, so only this share of people who
 * will hold a degree have one yet. Seeds the model before calibration. Youngest bracket
 * first; older adults use a factor of 1.
 */
export const DEGREE_AGE_FACTOR = [
  { belowAge: 22, bachelors: 0.05, graduate: 0 },
  { belowAge: 25, bachelors: 0.7, graduate: 0.1 },
  { belowAge: 30, bachelors: 1, graduate: 0.6 },
]

/**
 * Bachelor's degree or higher by age and sex in the general US population. The model keeps
 * these gaps (as odds ratios) and shifts them to Pew's overall rate for Muslims.
 * - Census CPS 2024 (table 1): ages 18–24 men 10.9%, women 15.9%; ages 25–29 men 34.9%,
 *   women 45.5% (NCES 2023 agrees: 35.9% / 45.2%).
 * - Census 2024: ages 25–39 42.8%, 40–54 41.5%, 55+ 34.2%; all adults 25+ women 40.1%,
 *   men 37.1%. Splits by sex beyond age 29 are approximated from those.
 * - Ages 18–24 are split assuming 18–21 have almost no degrees yet, which puts 22–24 at
 *   about 24% (men) and 34% (women).
 */
export const DEGREE_RATE_BY_AGE_SEX: { minAge: number; male: number; female: number }[] = [
  { minAge: 18, male: 0.01, female: 0.02 },
  { minAge: 22, male: 0.24, female: 0.34 },
  { minAge: 25, male: 0.349, female: 0.455 },
  { minAge: 30, male: 0.39, female: 0.47 },
  { minAge: 40, male: 0.395, female: 0.435 },
  { minAge: 55, male: 0.36, female: 0.325 },
]

/** Approximated generation mix for children: most children of immigrants are US-born. */
export const CHILD_NATIVITY: Record<Nativity, number> = { immigrant: 0.1, secondGen: 0.75, thirdGen: 0.15 }
