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

/** Highest degree among adults (US-born row rounded so it sums to 1). */
export const EDUCATION_BY_BIRTHPLACE: Record<Birthplace, Record<EducationLevel, number>> = {
  immigrant: { lessThanHighSchool: 0.1, highSchool: 0.27, someCollege: 0.25, bachelors: 0.23, graduate: 0.15 },
  usBorn: { lessThanHighSchool: 0.07, highSchool: 0.36, someCollege: 0.36, bachelors: 0.16, graduate: 0.05 },
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
 * will hold a degree have one yet. Youngest bracket first; older adults use a factor of 1.
 */
export const DEGREE_AGE_FACTOR = [
  { belowAge: 25, bachelors: 0.35, graduate: 0.1 },
  { belowAge: 30, bachelors: 1, graduate: 0.6 },
]

/** Approximated generation mix for children: most children of immigrants are US-born. */
export const CHILD_NATIVITY: Record<Nativity, number> = { immigrant: 0.1, secondGen: 0.75, thirdGen: 0.15 }
