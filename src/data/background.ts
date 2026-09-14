// Pew Research Center, "U.S. Muslims Concerned About Their Place in Society, but Continue
// to Believe in the American Dream" (2017), chapter 1, unless marked approximated.

/** Immigrant (first generation), US-born child of immigrants, or third generation and beyond. */
export type Nativity = 'immigrant' | 'secondGen' | 'thirdGen'

export type EducationLevel = 'lessThanHighSchool' | 'highSchool' | 'someCollege' | 'bachelors' | 'graduate'

/**
 * Highest degree among adults. Pew only splits foreign-born from US-born, so second and
 * third+ generation share the US-born row (rounded so it sums to 1).
 */
export const EDUCATION_BY_BIRTHPLACE: Record<'immigrant' | 'usBorn', Record<EducationLevel, number>> = {
  immigrant: { lessThanHighSchool: 0.1, highSchool: 0.27, someCollege: 0.25, bachelors: 0.23, graduate: 0.15 },
  usBorn: { lessThanHighSchool: 0.07, highSchool: 0.36, someCollege: 0.36, bachelors: 0.16, graduate: 0.05 },
}

/**
 * Approximated: young adults are still finishing school, so only this share of people who
 * will hold a degree have one yet. Youngest bracket first; older adults use a factor of 1.
 */
export const DEGREE_AGE_FACTOR = [
  { belowAge: 25, bachelors: 0.35, graduate: 0.1 },
  { belowAge: 30, bachelors: 1, graduate: 0.6 },
]

/**
 * Approximated share of converts by generation. Pew: 23% of Muslim adults are converts,
 * two-thirds of US-born Black Muslims are, and nearly all immigrants were born Muslim.
 * These rates reproduce the 23% overall.
 */
export const CONVERT_SHARE: Record<Nativity, number> = { immigrant: 0.02, secondGen: 0.08, thirdGen: 0.8 }

/** Approximated generation mix for children: most children of immigrants are US-born. */
export const CHILD_NATIVITY: Record<Nativity, number> = { immigrant: 0.1, secondGen: 0.75, thirdGen: 0.15 }
