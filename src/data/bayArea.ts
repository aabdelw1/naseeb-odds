import type { Birthplace, MaritalGroup } from './background'
import type { Ethnicity } from './population'
import type { Sect } from './religion'

// The nine-county San Francisco Bay Area. Unless noted, figures come from "The Bay Area
// Muslim Study: Establishing Identity and Community" (ISPU / One Nation Bay Area, 2013,
// 1,100+ respondents). Population estimates by level live in estimates.ts.

export const BAY_AREA = {
  /**
   * South Asian 30%, Arab 23%, Afghan 17%, African American 9%, Asian/Pacific Islander 7%,
   * White 6%, Iranian 2%, other 6%. Afghans and Iranians count as "white" here, and Asian/
   * Pacific Islander and other as "other".
   */
  ethnicity: { desi: 0.3, arab: 0.23, white: 0.25, black: 0.09, other: 0.13 } satisfies Record<Ethnicity, number>,

  /** Foreign-born 60%, US-born 34%, no response 6%. */
  birthplace: { immigrant: 60 / 94, usBorn: 34 / 94 } satisfies Record<Birthplace, number>,

  /** 74% have at least some college; B.A. 30%, graduate school 25%, Ph.D. 5%. */
  education: { highSchoolOrLess: 0.26, someCollege: 0.14, bachelors: 0.3, graduate: 0.3 },

  /**
   * At least some college by ethnicity: South Asian 78%, Iranian 72%, Hispanic 69%, White 66%,
   * Arab 62%, Asian/Pacific Islander 59%, African American 50%, Afghan 40%. Combined groups
   * are weighted by their share; the model keeps the gaps and shifts them to the 74% overall.
   */
  someCollegeByEthnicity: { desi: 0.78, arab: 0.62, white: 0.49, black: 0.5, other: 0.64 } satisfies Record<
    Ethnicity,
    number
  >,

  /** Married 57%, never married 32%, divorced 5%, widowed 2% (of those who answered). */
  marital: { married: 57 / 96, neverMarried: 32 / 96, divorced: 5 / 96, widowed: 2 / 96 } satisfies Record<
    MaritalGroup,
    number
  >,

  /** Sunni 75%, just Muslim 14%, Shia 4%, Sufi 2% and other 5% as "other". */
  sects: { sunni: 0.75, shia: 0.04, justMuslim: 0.14, other: 0.07 } satisfies Record<Sect, number>,

  /**
   * Households earning $100k+ by ethnicity: South Asian 49%, Iranian 38%, Asian/Pacific
   * Islander 36%, Arab 26%, White 23%, Hispanic 15%, Afghan 10%, African American 10%.
   * Combined groups are weighted by their share. Used for each group's relative earnings.
   */
  householdIncome100kPlus: { desi: 0.49, arab: 0.26, white: 0.154, black: 0.1, other: 0.263 } satisfies Record<
    Ethnicity,
    number
  >,

  /**
   * Earnings relative to the same person nationally. BLS May 2025 mean wages run 44%
   * (San Francisco–Oakland) to 71% (San Jose) above the national average; part of that is
   * the Bay Area's more educated workforce, which the education mix above already covers.
   */
  earningsFactor: 1.3,
}
