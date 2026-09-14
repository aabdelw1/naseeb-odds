import {
  AGE_BY_BIRTHPLACE,
  birthplaceOf,
  CHILD_NATIVITY,
  DEGREE_AGE_FACTOR,
  EDUCATION_BY_BIRTHPLACE,
  EDUCATION_LEVELS,
  MARITAL_BY_BIRTHPLACE,
  type Birthplace,
  type EducationLevel,
  type MaritalGroup,
  type Nativity,
} from '../data/background'
import {
  EARNINGS_AGE_PROFILE,
  EARNINGS_BY_EDUCATION,
  EMPLOYED_SHARE,
  EMPLOYMENT_BY_EDUCATION,
  FEMALE_EARNINGS,
  PART_TIME_ADJUSTMENT,
  TEEN_EARNINGS,
} from '../data/earnings'
import {
  ADULT_AGE,
  ADULT_SEX_SHARE,
  AGE_BANDS,
  CHILD_SEX_SHARE,
  ETHNIC_GROUPS,
  type AgeBand,
  type Ethnicity,
  type MaritalStatus,
  type Sex,
} from '../data/population'
import {
  CONVERT_SHARE,
  MOSQUE_WEEKLY,
  PRAYS_FIVE_DAILY,
  SECT_SHARES,
  type PracticeRates,
  type Sect,
} from '../data/religion'
import { rakeRates, rakeWeights, type Margin } from './rake'
import { logit, normalCdf, sigmoid } from './stats'

// A synthetic population: every combination of age band, sex, ethnicity, generation,
// education, marital status and sect is a cell holding a number of people, plus
// probabilities for traits that are yes/no (prayer, mosque, convert) and an earnings
// distribution. Cell sizes start from the tables in src/data and are then calibrated
// so the whole population reproduces every published figure at once. Because traits
// live together in cells, filters combine realistically: picking $250k+ earners picks
// mostly degree holders, and picking immigrants picks mostly married people.

export interface Cell {
  band: AgeBand
  adult: boolean
  sex: Sex
  ethnicity: Ethnicity
  nativity: Nativity
  birthplace: Birthplace
  /** Null for children. */
  education: EducationLevel | null
  /** Position in EDUCATION_LEVELS; -1 for children. */
  educationRank: number
  marital: MaritalStatus
  sect: Sect
  /** Number of people. */
  weight: number
  /** Probability of praying all five salah daily (adults only). */
  praysFiveDaily: number
  /** Probability of attending a mosque weekly or more (adults only). */
  mosqueWeekly: number
  /** Probability of being a convert. */
  convert: number
  /** Probability of having any earnings. */
  earners: number
  /** Median annual earnings among people with earnings. */
  medianIncome: number
  /** Log-normal spread of earnings among people with earnings. */
  incomeSigma: number
}

const SEXES: Sex[] = ['male', 'female']
const ETHNICITIES = Object.keys(ETHNIC_GROUPS) as Ethnicity[]
const NATIVITIES: Nativity[] = ['immigrant', 'secondGen', 'thirdGen']
const BIRTHPLACES: Birthplace[] = ['immigrant', 'usBorn']
const SECTS = Object.keys(SECT_SHARES) as Sect[]
const HIGH_SCHOOL_RANK = EDUCATION_LEVELS.indexOf('highSchool')
const BACHELORS_RANK = EDUCATION_LEVELS.indexOf('bachelors')

/** Earnings level ISPU's income-by-race figures are matched at. */
const HIGH_INCOME = 100_000

export const CELLS: Cell[] = buildModel()

/** Share of a cell's people earning at least `minIncome`. */
export function incomeShare(cell: Cell, minIncome: number, medianIncome = cell.medianIncome): number {
  if (minIncome <= 0) return 1
  if (cell.earners === 0 || medianIncome <= 0) return 0
  return cell.earners * (1 - normalCdf(Math.log(minIncome / medianIncome) / cell.incomeSigma))
}

function buildModel(): Cell[] {
  const cells = seedCells()
  const adults = cells.filter((c) => c.adult)
  calibrateWeights(adults)
  const prayer = calibratePractice(adults, PRAYS_FIVE_DAILY)
  const mosque = calibratePractice(adults, MOSQUE_WEEKLY)
  adults.forEach((cell, i) => {
    cell.praysFiveDaily = prayer[i]
    cell.mosqueWeekly = mosque[i]
    cell.convert = CONVERT_SHARE[cell.nativity][cell.ethnicity]
  })
  assignEarnings(cells, adults)
  return cells
}

function seedCells(): Cell[] {
  const cells: Cell[] = []
  for (const band of AGE_BANDS) {
    const adult = band.min >= ADULT_AGE
    const sexShares = adult ? ADULT_SEX_SHARE : CHILD_SEX_SHARE
    for (const sex of SEXES) {
      for (const ethnicity of ETHNICITIES) {
        const group = ETHNIC_GROUPS[ethnicity]
        const nativityMix = adult ? group.nativity : CHILD_NATIVITY
        for (const nativity of NATIVITIES) {
          const educations: [EducationLevel | null, number][] = adult ? educationSeed(band, nativity) : [[null, 1]]
          for (const [education, educationShare] of educations) {
            for (const [marital, maritalShare] of maritalSeed(band)) {
              for (const sect of SECTS) {
                const weight =
                  band.count *
                  sexShares[sex] *
                  group.share *
                  nativityMix[nativity] *
                  educationShare *
                  maritalShare *
                  group.sects[sect]
                if (weight === 0) continue
                cells.push({
                  band,
                  adult,
                  sex,
                  ethnicity,
                  nativity,
                  birthplace: birthplaceOf(nativity),
                  education,
                  educationRank: education === null ? -1 : EDUCATION_LEVELS.indexOf(education),
                  marital,
                  sect,
                  weight,
                  praysFiveDaily: 0,
                  mosqueWeekly: 0,
                  convert: 0,
                  earners: 0,
                  medianIncome: 0,
                  incomeSigma: 1,
                })
              }
            }
          }
        }
      }
    }
  }
  return cells
}

function educationSeed(band: AgeBand, nativity: Nativity): [EducationLevel, number][] {
  const s = EDUCATION_BY_BIRTHPLACE[birthplaceOf(nativity)]
  const factor = DEGREE_AGE_FACTOR.find((f) => band.min < f.belowAge)
  if (!factor) return EDUCATION_LEVELS.map((level) => [level, s[level]])
  // Young adults are still in school: hold back degrees they don't have yet.
  const degree = (s.bachelors + s.graduate) * factor.bachelors
  const graduate = s.graduate * factor.graduate
  return [
    ['lessThanHighSchool', s.lessThanHighSchool],
    ['highSchool', s.highSchool],
    ['someCollege', s.someCollege + s.bachelors + s.graduate - degree],
    ['bachelors', degree - graduate],
    ['graduate', graduate],
  ]
}

function maritalSeed(band: AgeBand): [MaritalStatus, number][] {
  const { neverMarried, married, divorced, widowed } = band.marital
  return [
    ['neverMarried', neverMarried],
    ['married', married],
    ['divorcedNoKids', divorced * (1 - band.divorcedWithKids)],
    ['divorcedWithKids', divorced * band.divorcedWithKids],
    ['widowed', widowed],
  ]
}

function maritalGroup(status: MaritalStatus): MaritalGroup {
  return status === 'divorcedNoKids' || status === 'divorcedWithKids' ? 'divorced' : status
}

/**
 * Rakes adult cell sizes to age, sex, ethnicity, generation, sect, marriage and education
 * targets. Every joint target is built from the same totals so the margins agree.
 */
function calibrateWeights(adults: Cell[]): void {
  const weights = Float64Array.from(adults, (c) => c.weight)

  const ethnicityNativity: Record<string, number> = {}
  const ethnicitySect: Record<string, number> = {}
  const birthplaceShare: Record<Birthplace, number> = { immigrant: 0, usBorn: 0 }
  for (const ethnicity of ETHNICITIES) {
    const group = ETHNIC_GROUPS[ethnicity]
    for (const nativity of NATIVITIES) {
      ethnicityNativity[`${ethnicity}|${nativity}`] = group.share * group.nativity[nativity]
      birthplaceShare[birthplaceOf(nativity)] += group.share * group.nativity[nativity]
    }
    for (const sect of SECTS) ethnicitySect[`${ethnicity}|${sect}`] = group.share * group.sects[sect]
  }

  const birthplaceMarital: Record<string, number> = {}
  const birthplaceEducation: Record<string, number> = {}
  let highSchoolOrLess = 0
  for (const birthplace of BIRTHPLACES) {
    for (const [status, share] of Object.entries(MARITAL_BY_BIRTHPLACE[birthplace])) {
      birthplaceMarital[`${birthplace}|${status}`] = birthplaceShare[birthplace] * share
    }
    const education = EDUCATION_BY_BIRTHPLACE[birthplace]
    for (const level of EDUCATION_LEVELS) {
      birthplaceEducation[`${birthplace}|${level}`] = birthplaceShare[birthplace] * education[level]
    }
    highSchoolOrLess += birthplaceShare[birthplace] * (education.lessThanHighSchool + education.highSchool)
  }

  // ISPU reports how often each group stops at high school. Keep those gaps (as odds
  // ratios) but shift them so they average to Pew's overall rate.
  const highSchoolRates = shiftToAverage(
    Object.fromEntries(ETHNICITIES.map((e) => [e, ETHNIC_GROUPS[e].highSchoolOrLess])) as Record<Ethnicity, number>,
    highSchoolOrLess,
  )
  const ethnicityEducation: Record<string, number> = {}
  for (const ethnicity of ETHNICITIES) {
    const share = ETHNIC_GROUPS[ethnicity].share
    ethnicityEducation[`${ethnicity}|highSchoolOrLess`] = share * highSchoolRates[ethnicity]
    ethnicityEducation[`${ethnicity}|moreThanHighSchool`] = share * (1 - highSchoolRates[ethnicity])
  }

  // Pew reports the age mix of immigrants and US-born Muslims separately (US-born adults
  // are much younger). Turn it into age × birthplace targets that agree with the age
  // bands and the birthplace totals above.
  const adultBands = AGE_BANDS.filter((b) => b.min >= ADULT_AGE)
  const bracketTotals: Record<string, number> = {}
  for (const b of adultBands) {
    const bracket = String(ageBracket(AGE_BY_BIRTHPLACE, b.min))
    bracketTotals[bracket] = (bracketTotals[bracket] ?? 0) + b.count
  }
  const agePairs = AGE_BY_BIRTHPLACE.flatMap((row) =>
    BIRTHPLACES.map((birthplace) => ({
      bracket: String(row.minAge),
      birthplace,
      seed: row[birthplace] * birthplaceShare[birthplace],
    })),
  )
  const agePairWeights = Float64Array.from(agePairs, (p) => p.seed)
  rakeWeights(agePairs, agePairWeights, [
    { group: (p) => p.bracket, targets: bracketTotals },
    { group: (p) => p.birthplace, targets: birthplaceShare },
  ])
  const ageBirthplace = Object.fromEntries(agePairs.map((p, i) => [`${p.bracket}|${p.birthplace}`, agePairWeights[i]]))

  const margins: Margin<Cell>[] = [
    { group: (c) => String(c.band.min), targets: Object.fromEntries(adultBands.map((b) => [String(b.min), b.count])) },
    { group: (c) => c.sex, targets: ADULT_SEX_SHARE },
    { group: (c) => `${c.ethnicity}|${c.nativity}`, targets: ethnicityNativity },
    { group: (c) => `${c.ethnicity}|${c.sect}`, targets: ethnicitySect },
    { group: (c) => `${ageBracket(AGE_BY_BIRTHPLACE, c.band.min)}|${c.birthplace}`, targets: ageBirthplace },
    { group: (c) => `${c.birthplace}|${maritalGroup(c.marital)}`, targets: birthplaceMarital },
    { group: (c) => `${c.birthplace}|${c.education}`, targets: birthplaceEducation },
    {
      group: (c) => `${c.ethnicity}|${c.educationRank <= HIGH_SCHOOL_RANK ? 'highSchoolOrLess' : 'moreThanHighSchool'}`,
      targets: ethnicityEducation,
    },
  ]
  rakeWeights(adults, weights, margins, 1000, 1e-8)
  adults.forEach((cell, i) => (cell.weight = weights[i]))
}

/** Shifts every group's rate by the same log-odds so the share-weighted average hits `average`. */
function shiftToAverage(rates: Record<Ethnicity, number>, average: number): Record<Ethnicity, number> {
  const shifted = (shift: number) =>
    Object.fromEntries(ETHNICITIES.map((e) => [e, sigmoid(logit(rates[e]) + shift)])) as Record<Ethnicity, number>
  const mean = (r: Record<Ethnicity, number>) => ETHNICITIES.reduce((sum, e) => sum + ETHNIC_GROUPS[e].share * r[e], 0)
  let lo = -10
  let hi = 10
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2
    if (mean(shifted(mid)) < average) lo = mid
    else hi = mid
  }
  return shifted((lo + hi) / 2)
}

/** Fits each adult cell's probability of a practice so every published group rate is reproduced. */
function calibratePractice(adults: Cell[], rates: PracticeRates): number[] {
  const weights = Float64Array.from(adults, (c) => c.weight)
  const logits = new Float64Array(adults.length).fill(logit(rates.overall))

  // Pew doesn't report "other" sects; back it out so sect rates average to the overall rate.
  const reported = Object.entries(rates.bySect) as [Sect, number][]
  const reportedTotal = reported.reduce((sum, [sect, rate]) => sum + SECT_SHARES[sect] * rate, 0)
  const bySect: Record<string, number> = {
    ...rates.bySect,
    other: Math.min(0.95, Math.max(0.05, (rates.overall - reportedTotal) / SECT_SHARES.other)),
  }

  const margins: Margin<Cell>[] = [
    { group: () => 'all', targets: { all: rates.overall } },
    { group: (c) => c.sex, targets: rates.bySex },
    {
      group: (c) => String(ageBracket(rates.byAge, c.band.min)),
      targets: Object.fromEntries(rates.byAge.map((a) => [String(a.minAge), a.rate])),
    },
    { group: (c) => (c.educationRank >= BACHELORS_RANK ? 'degree' : 'noDegree'), targets: rates.byDegree },
    { group: (c) => c.birthplace, targets: rates.byBirthplace },
    { group: (c) => (c.marital === 'married' ? 'married' : 'notMarried'), targets: rates.byMarried },
    { group: (c) => c.sect, targets: bySect },
    ...rates.byGroup.map(
      (g): Margin<Cell> => ({
        group: (c) => (c.ethnicity === g.ethnicity && (!g.usBornOnly || c.birthplace === 'usBorn') ? 'in' : null),
        targets: { in: g.rate },
      }),
    ),
  ]
  rakeRates(adults, weights, logits, margins)
  return Array.from(logits, sigmoid)
}

function ageBracket(brackets: { minAge: number }[], age: number): number {
  let bracket = brackets[0].minAge
  for (const b of brackets) if (age >= b.minAge) bracket = b.minAge
  return bracket
}

function earningsAgeFactor(band: AgeBand): number {
  return EARNINGS_AGE_PROFILE.brackets.find((b) => band.min < b.belowAge)?.factor ?? EARNINGS_AGE_PROFILE.otherwise
}

/**
 * Earnings depend on education (BLS), age and sex, and on ethnicity: US-born Muslims earn
 * like US-born Americans of the same background, and immigrant multipliers are fitted so
 * each group's share earning $100k+, relative to all adults, matches its standing in ISPU's
 * household income figures. The chance of having earnings follows age, sex and education.
 */
function assignEarnings(cells: Cell[], adults: Cell[]): void {
  const baseEarners = (c: Cell) =>
    c.band.earners * (c.sex === 'female' ? FEMALE_EARNINGS.earners : 1) * EMPLOYMENT_BY_EDUCATION[c.education!]
  const adultWeight = adults.reduce((sum, c) => sum + c.weight, 0)
  const scale = EMPLOYED_SHARE / (adults.reduce((sum, c) => sum + c.weight * baseEarners(c), 0) / adultWeight)

  for (const cell of cells) {
    if (!cell.adult) {
      cell.earners = cell.band.earners
      cell.medianIncome = TEEN_EARNINGS.median
      cell.incomeSigma = TEEN_EARNINGS.sigma
      continue
    }
    const earnings = EARNINGS_BY_EDUCATION[cell.education!]
    cell.earners = Math.min(0.97, baseEarners(cell) * scale)
    cell.medianIncome =
      earnings.median *
      PART_TIME_ADJUSTMENT.median *
      earningsAgeFactor(cell.band) *
      (cell.sex === 'female' ? FEMALE_EARNINGS.median : 1)
    cell.incomeSigma = earnings.sigma + PART_TIME_ADJUSTMENT.sigma
  }

  const averageHousehold = ETHNICITIES.reduce(
    (sum, e) => sum + ETHNIC_GROUPS[e].share * ETHNIC_GROUPS[e].householdIncome100kPlus,
    0,
  )
  const immigrantMultiplier = Object.fromEntries(ETHNICITIES.map((e) => [e, 1])) as Record<Ethnicity, number>
  const factorFor = (c: Cell) =>
    c.birthplace === 'usBorn' ? ETHNIC_GROUPS[c.ethnicity].usBornEarnings : immigrantMultiplier[c.ethnicity]
  const usBornFactorWeight = adults.reduce((sum, c) => sum + (c.birthplace === 'usBorn' ? c.weight * factorFor(c) : 0), 0)
  const baseMedian = adults.map((c) => c.medianIncome)

  for (let iteration = 0; iteration < 60; iteration++) {
    const high: Record<string, number> = {}
    const total: Record<string, number> = {}
    let allHigh = 0
    adults.forEach((c, i) => {
      const h = c.weight * incomeShare(c, HIGH_INCOME, baseMedian[i] * factorFor(c))
      high[c.ethnicity] = (high[c.ethnicity] ?? 0) + h
      total[c.ethnicity] = (total[c.ethnicity] ?? 0) + c.weight
      allHigh += h
    })
    for (const e of ETHNICITIES) {
      const modelRatio = high[e] / total[e] / (allHigh / adultWeight)
      const targetRatio = ETHNIC_GROUPS[e].householdIncome100kPlus / averageHousehold
      immigrantMultiplier[e] = Math.min(2.5, Math.max(0.4, immigrantMultiplier[e] * Math.sqrt(targetRatio / modelRatio)))
    }
    // Keep the overall earnings level anchored to BLS: the average factor across adults stays 1.
    const immigrantFactorWeight = adults.reduce(
      (sum, c) => sum + (c.birthplace === 'immigrant' ? c.weight * immigrantMultiplier[c.ethnicity] : 0),
      0,
    )
    const rescale = (adultWeight - usBornFactorWeight) / immigrantFactorWeight
    for (const e of ETHNICITIES) immigrantMultiplier[e] *= rescale
  }
  adults.forEach((c, i) => (c.medianIncome = baseMedian[i] * factorFor(c)))
}
