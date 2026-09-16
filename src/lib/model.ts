import {
  AGE_BY_BIRTHPLACE,
  birthplaceOf,
  CHILD_NATIVITY,
  DEGREE_AGE_FACTOR,
  DEGREE_RATE_BY_AGE_SEX,
  EDUCATION_BY_BIRTHPLACE,
  EDUCATION_LEVELS,
  MARITAL_BY_BIRTHPLACE,
  type Birthplace,
  type EducationLevel,
  type MaritalGroup,
  type Nativity,
} from '../data/background'
import { BAY_AREA } from '../data/bayArea'
import {
  EARNINGS_AGE_PROFILE,
  EARNINGS_BY_EDUCATION,
  EMPLOYED_SHARE,
  EMPLOYMENT_BY_EDUCATION,
  FEMALE_EARNINGS,
  PART_TIME_ADJUSTMENT,
  TEEN_EARNINGS,
} from '../data/earnings'
import { ESTIMATES } from '../data/estimates'
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
  HIJAB,
  HIJAB_TILTS,
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
//
// The Bay Area is a second set of the same cells, re-weighted to the Bay Area Muslim
// Study and given Bay Area earnings.

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
  /** Probability of wearing hijab in public all or most of the time; 0 for men and children. */
  wearsHijab: number
  /** The same, split by whether she converted; they average back to wearsHijab. */
  wearsHijabConvert: number
  wearsHijabBornMuslim: number
  /** Probability of being a convert. */
  convert: number
  /** Probability of having any earnings. */
  earners: number
  /** Median annual earnings from education, age and sex, before ethnicity and region. */
  baseMedianIncome: number
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

/** Earnings level the income-by-race figures are matched at. */
const HIGH_INCOME = 100_000

export const CELLS: Cell[] = buildModel()

/** Bay Area cells, in the same order as CELLS, summing to the realistic Bay Area population. */
export const BAY_AREA_CELLS: Cell[] = buildBayArea(CELLS)

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
  const hijab = calibrateHijab(adults, prayer, mosque)
  adults.forEach((cell, i) => {
    cell.praysFiveDaily = prayer[i]
    cell.mosqueWeekly = mosque[i]
    cell.wearsHijab = hijab[i]
    cell.convert = CONVERT_SHARE[cell.nativity][cell.ethnicity]
    splitHijabByConvert(cell)
  })
  assignEarnings(cells, adults)
  // US-born Muslims earn like US-born Americans of the same background (Pew 2013); the
  // immigrant multipliers carry the rest of ISPU's income gaps by race.
  fitEthnicityEarnings(
    adults,
    Object.fromEntries(ETHNICITIES.map((e) => [e, ETHNIC_GROUPS[e].householdIncome100kPlus])) as Record<Ethnicity, number>,
    1,
    (c) => (c.birthplace === 'usBorn' ? ETHNIC_GROUPS[c.ethnicity].usBornEarnings : null),
  )
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
                  wearsHijab: 0,
                  wearsHijabConvert: 0,
                  wearsHijabBornMuslim: 0,
                  convert: 0,
                  earners: 0,
                  baseMedianIncome: 0,
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

function highSchoolGroup(cell: Cell): string {
  return cell.educationRank <= HIGH_SCHOOL_RANK ? 'highSchoolOrLess' : 'moreThanHighSchool'
}

/** Joint ethnicity × high-school-or-less targets from per-group rates. */
function ethnicityEducationTargets(shares: Record<Ethnicity, number>, highSchoolOrLess: Record<Ethnicity, number>) {
  const targets: Record<string, number> = {}
  for (const e of ETHNICITIES) {
    targets[`${e}|highSchoolOrLess`] = shares[e] * highSchoolOrLess[e]
    targets[`${e}|moreThanHighSchool`] = shares[e] * (1 - highSchoolOrLess[e])
  }
  return targets
}

/** Each band's share of these cells' total weight, keyed by the band's minimum age. */
function bandTotals(cells: Cell[]): Record<string, number> {
  const totals: Record<string, number> = {}
  for (const c of cells) totals[c.band.min] = (totals[c.band.min] ?? 0) + c.weight
  return totals
}

/**
 * Rakes adult cell sizes to age, sex, ethnicity, generation, sect, marriage and education
 * targets. Every joint target is built from the same totals so the margins agree.
 */
function calibrateWeights(adults: Cell[]): void {
  const weights = Float64Array.from(adults, (c) => c.weight)
  const ethnicityShares = Object.fromEntries(ETHNICITIES.map((e) => [e, ETHNIC_GROUPS[e].share])) as Record<
    Ethnicity,
    number
  >

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
  let degreeShare = 0
  for (const birthplace of BIRTHPLACES) {
    for (const [status, share] of Object.entries(MARITAL_BY_BIRTHPLACE[birthplace])) {
      birthplaceMarital[`${birthplace}|${status}`] = birthplaceShare[birthplace] * share
    }
    const education = EDUCATION_BY_BIRTHPLACE[birthplace]
    for (const level of EDUCATION_LEVELS) {
      birthplaceEducation[`${birthplace}|${level}`] = birthplaceShare[birthplace] * education[level]
    }
    highSchoolOrLess += birthplaceShare[birthplace] * (education.lessThanHighSchool + education.highSchool)
    degreeShare += birthplaceShare[birthplace] * (education.bachelors + education.graduate)
  }

  // ISPU reports how often each group stops at high school. Keep those gaps (as odds
  // ratios) but shift them so they average to Pew's overall rate.
  const highSchoolRates = shiftToAverage(
    Object.fromEntries(ETHNICITIES.map((e) => [e, ETHNIC_GROUPS[e].highSchoolOrLess])) as Record<Ethnicity, number>,
    ethnicityShares,
    highSchoolOrLess,
  )

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

  // Degrees by age and sex follow the general US pattern (young women well ahead of young
  // men, older adults less likely to hold one), shifted to Pew's overall rate for Muslims.
  const adultTotal = adultBands.reduce((sum, b) => sum + b.count, 0)
  const sexAgeWeights: Record<string, number> = {}
  const sexAgeRates: Record<string, number> = {}
  for (const b of adultBands) {
    const bracket = ageBracket(DEGREE_RATE_BY_AGE_SEX, b.min)
    const row = DEGREE_RATE_BY_AGE_SEX.find((r) => r.minAge === bracket)!
    for (const sex of SEXES) {
      const key = `${sex}|${bracket}`
      sexAgeWeights[key] = (sexAgeWeights[key] ?? 0) + (b.count * ADULT_SEX_SHARE[sex]) / adultTotal
      sexAgeRates[key] = row[sex]
    }
  }
  const degreeRates = shiftToAverage(sexAgeRates, sexAgeWeights, degreeShare)
  const sexAgeDegree: Record<string, number> = {}
  for (const [key, weight] of Object.entries(sexAgeWeights)) {
    sexAgeDegree[`${key}|degree`] = weight * degreeRates[key]
    sexAgeDegree[`${key}|noDegree`] = weight * (1 - degreeRates[key])
  }

  const margins: Margin<Cell>[] = [
    { group: (c) => String(c.band.min), targets: Object.fromEntries(adultBands.map((b) => [String(b.min), b.count])) },
    { group: (c) => c.sex, targets: ADULT_SEX_SHARE },
    { group: (c) => `${c.ethnicity}|${c.nativity}`, targets: ethnicityNativity },
    { group: (c) => `${c.ethnicity}|${c.sect}`, targets: ethnicitySect },
    { group: (c) => `${ageBracket(AGE_BY_BIRTHPLACE, c.band.min)}|${c.birthplace}`, targets: ageBirthplace },
    { group: (c) => `${c.birthplace}|${maritalGroup(c.marital)}`, targets: birthplaceMarital },
    { group: (c) => `${c.birthplace}|${c.education}`, targets: birthplaceEducation },
    {
      group: (c) => `${c.ethnicity}|${highSchoolGroup(c)}`,
      targets: ethnicityEducationTargets(ethnicityShares, highSchoolRates),
    },
    {
      group: (c) =>
        `${c.sex}|${ageBracket(DEGREE_RATE_BY_AGE_SEX, c.band.min)}|${c.educationRank >= BACHELORS_RANK ? 'degree' : 'noDegree'}`,
      targets: sexAgeDegree,
    },
  ]
  rakeWeights(adults, weights, margins, 1000, 1e-8)
  adults.forEach((cell, i) => (cell.weight = weights[i]))
}

/** Shifts every group's rate by the same log-odds so the share-weighted average hits `average`. */
function shiftToAverage<K extends string>(
  rates: Record<K, number>,
  shares: Record<K, number>,
  average: number,
): Record<K, number> {
  const keys = Object.keys(rates) as K[]
  const shifted = (shift: number) =>
    Object.fromEntries(keys.map((k) => [k, sigmoid(logit(rates[k]) + shift)])) as Record<K, number>
  const mean = (r: Record<K, number>) => keys.reduce((sum, k) => sum + shares[k] * r[k], 0)
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

/**
 * Hijab, for women only. Pew publishes just the overall rate and a split by degree, so cells
 * start from the overall rate tilted by HIJAB_TILTS — practice, generation, sect, converts and
 * age — and raking then pulls the published rates back into line. The tilts decide who covers;
 * the published rates decide how many.
 */
function calibrateHijab(adults: Cell[], prayer: number[], mosque: number[]): number[] {
  const isWoman = (cell: Cell) => cell.sex === 'female'
  const weights = Float64Array.from(adults, (c) => c.weight)
  const womenWeight = adults.reduce((sum, c) => (isWoman(c) ? sum + c.weight : sum), 0)
  const averageAmongWomen = (rates: number[]) =>
    adults.reduce((sum, c, i) => (isWoman(c) ? sum + c.weight * rates[i] : sum), 0) / womenWeight
  const prayerAverage = logit(averageAmongWomen(prayer))
  const mosqueAverage = logit(averageAmongWomen(mosque))

  const tilt = (cell: Cell, i: number) => {
    const practice = (logit(prayer[i]) - prayerAverage + (logit(mosque[i]) - mosqueAverage)) / 2
    const age = HIJAB_TILTS.byAge.reduce(
      (shift, bracket) => (cell.band.min >= bracket.minAge ? bracket.shift : shift),
      HIJAB_TILTS.byAge[0].shift,
    )
    // The generation fade applies to the women born into Islam; the converts beside them get
    // the convert tilt instead. Third-generation cells are mostly converts, so weighting the
    // two keeps those cells from being dragged down by a fade that isn't theirs.
    const converts = CONVERT_SHARE[cell.nativity][cell.ethnicity]
    const background = HIJAB_TILTS.byNativity[cell.nativity] * (1 - converts) + HIJAB_TILTS.convert * converts
    return (
      HIJAB_TILTS.practiceLink * practice +
      background +
      HIJAB_TILTS.bySect[cell.sect] +
      age
    )
  }
  const logits = Float64Array.from(adults, (c, i) => (isWoman(c) ? logit(HIJAB.overall) + tilt(c, i) : 0))

  // Muslim women hold degrees far more often now (Pew 2024) than in the 2017 survey, so Pew's
  // two published rates no longer average to its own overall rate here. Keep the gap between
  // them and move both until they do.
  const degreeGroup = (c: Cell) => (c.educationRank >= BACHELORS_RANK ? 'degree' : 'noDegree')
  const degreeWeight = { degree: 0, noDegree: 0 }
  for (const cell of adults) if (isWoman(cell)) degreeWeight[degreeGroup(cell)] += cell.weight
  const degreeShares = {
    degree: degreeWeight.degree / womenWeight,
    noDegree: degreeWeight.noDegree / womenWeight,
  }
  const byDegree = shiftToAverage(HIJAB.byDegree, degreeShares, HIJAB.overall)

  const margins: Margin<Cell>[] = [
    { group: (c) => (isWoman(c) ? 'women' : null), targets: { women: HIJAB.overall } },
    { group: (c) => (isWoman(c) ? degreeGroup(c) : null), targets: byDegree },
  ]
  rakeRates(adults, weights, logits, margins)
  return adults.map((c, i) => (isWoman(c) ? sigmoid(logits[i]) : 0))
}

/**
 * Splits a cell's hijab rate between converts and born Muslims. Converts and born Muslims live
 * in the same cells, so the difference between them has to sit inside a cell rather than
 * between cells; both rates still average back to the cell's own rate.
 */
function splitHijabByConvert(cell: Cell): void {
  const converts = cell.convert
  if (cell.wearsHijab <= 0 || converts <= 0 || converts >= 1) {
    cell.wearsHijabConvert = cell.wearsHijab
    cell.wearsHijabBornMuslim = cell.wearsHijab
    return
  }
  // The generation fade describes families born into Islam losing the habit over generations,
  // and a convert never inherited it, so hers is cancelled out. Without this, converts would
  // look least likely to cover purely because most of them are third generation.
  const shift = HIJAB_TILTS.convert - HIJAB_TILTS.byNativity[cell.nativity]
  const mean = (base: number) => converts * sigmoid(base + shift) + (1 - converts) * sigmoid(base)
  let lo = -20
  let hi = 20
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2
    if (mean(mid) < cell.wearsHijab) lo = mid
    else hi = mid
  }
  const base = (lo + hi) / 2
  cell.wearsHijabBornMuslim = sigmoid(base)
  cell.wearsHijabConvert = sigmoid(base + shift)
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
 * Earnings from education (BLS medians and spread), age and sex. The chance of having
 * earnings follows age, sex and education, scaled to Pew's 60% of adults working.
 */
function assignEarnings(cells: Cell[], adults: Cell[]): void {
  const baseEarners = (c: Cell) =>
    c.band.earners * (c.sex === 'female' ? FEMALE_EARNINGS.earners : 1) * EMPLOYMENT_BY_EDUCATION[c.education!]
  const adultWeight = adults.reduce((sum, c) => sum + c.weight, 0)
  const scale = EMPLOYED_SHARE / (adults.reduce((sum, c) => sum + c.weight * baseEarners(c), 0) / adultWeight)

  for (const cell of cells) {
    if (!cell.adult) {
      cell.earners = cell.band.earners
      cell.baseMedianIncome = cell.medianIncome = TEEN_EARNINGS.median
      cell.incomeSigma = TEEN_EARNINGS.sigma
      continue
    }
    const earnings = EARNINGS_BY_EDUCATION[cell.education!]
    cell.earners = Math.min(0.97, baseEarners(cell) * scale)
    cell.baseMedianIncome = cell.medianIncome =
      earnings.median *
      PART_TIME_ADJUSTMENT.median *
      earningsAgeFactor(cell.band) *
      (cell.sex === 'female' ? FEMALE_EARNINGS.median : 1)
    cell.incomeSigma = earnings.sigma + PART_TIME_ADJUSTMENT.sigma
  }
}

/**
 * Sets each adult cell's median earnings to its base median times an ethnicity factor.
 * Factors are fitted so each group's share earning $100k+, relative to all these adults,
 * matches its standing in `householdHighIncome` (shares of $100k+ households). Cells with a
 * `fixed` factor keep it. Fitted factors are rescaled so the average factor is `level`.
 */
function fitEthnicityEarnings(
  adults: Cell[],
  householdHighIncome: Record<Ethnicity, number>,
  level: number,
  fixed: (cell: Cell) => number | null = () => null,
): void {
  const totalWeight = adults.reduce((sum, c) => sum + c.weight, 0)
  const groupWeight: Record<string, number> = {}
  for (const c of adults) groupWeight[c.ethnicity] = (groupWeight[c.ethnicity] ?? 0) + c.weight
  const averageHousehold = ETHNICITIES.reduce(
    (sum, e) => sum + (groupWeight[e] / totalWeight) * householdHighIncome[e],
    0,
  )
  const fixedWeight = adults.reduce((sum, c) => sum + c.weight * (fixed(c) ?? 0), 0)

  const multiplier = Object.fromEntries(ETHNICITIES.map((e) => [e, level])) as Record<Ethnicity, number>
  const factorFor = (c: Cell) => fixed(c) ?? multiplier[c.ethnicity]

  for (let iteration = 0; iteration < 60; iteration++) {
    const high: Record<string, number> = {}
    let allHigh = 0
    for (const c of adults) {
      const h = c.weight * incomeShare(c, HIGH_INCOME, c.baseMedianIncome * factorFor(c))
      high[c.ethnicity] = (high[c.ethnicity] ?? 0) + h
      allHigh += h
    }
    for (const e of ETHNICITIES) {
      const modelRatio = high[e] / groupWeight[e] / (allHigh / totalWeight)
      const targetRatio = householdHighIncome[e] / averageHousehold
      multiplier[e] = Math.min(2.5 * level, Math.max(0.4 * level, multiplier[e] * Math.sqrt(targetRatio / modelRatio)))
    }
    // Keep the overall earnings level anchored: the average factor across adults is `level`.
    const fittedWeight = adults.reduce((sum, c) => sum + (fixed(c) === null ? c.weight * multiplier[c.ethnicity] : 0), 0)
    const rescale = (level * totalWeight - fixedWeight) / fittedWeight
    for (const e of ETHNICITIES) multiplier[e] *= rescale
  }
  for (const c of adults) c.medianIncome = c.baseMedianIncome * factorFor(c)
}

/**
 * Copies the national cells and re-weights them to the Bay Area Muslim Study: its ethnic,
 * birthplace, education, marriage and sect mix (keeping the national age and sex mix), with
 * Bay Area earnings and income gaps by ethnicity.
 */
function buildBayArea(national: Cell[]): Cell[] {
  const cells = national.map((c) => ({ ...c }))
  const adults = cells.filter((c) => c.adult)
  const children = cells.filter((c) => !c.adult)

  const someCollege = shiftToAverage(BAY_AREA.someCollegeByEthnicity, BAY_AREA.ethnicity, 1 - BAY_AREA.education.highSchoolOrLess)
  const highSchoolOrLess = Object.fromEntries(ETHNICITIES.map((e) => [e, 1 - someCollege[e]])) as Record<Ethnicity, number>
  const sexTotals: Record<string, number> = {}
  for (const c of adults) sexTotals[c.sex] = (sexTotals[c.sex] ?? 0) + c.weight

  const adultWeights = Float64Array.from(adults, (c) => c.weight)
  rakeWeights(
    adults,
    adultWeights,
    [
      { group: (c) => String(c.band.min), targets: bandTotals(adults) },
      { group: (c) => c.sex, targets: sexTotals },
      { group: (c) => c.ethnicity, targets: BAY_AREA.ethnicity },
      { group: (c) => `${c.ethnicity}|${highSchoolGroup(c)}`, targets: ethnicityEducationTargets(BAY_AREA.ethnicity, highSchoolOrLess) },
      { group: (c) => c.birthplace, targets: BAY_AREA.birthplace },
      {
        group: (c) => (c.educationRank <= HIGH_SCHOOL_RANK ? 'highSchoolOrLess' : c.education!),
        targets: BAY_AREA.education,
      },
      { group: (c) => maritalGroup(c.marital), targets: BAY_AREA.marital },
      { group: (c) => c.sect, targets: BAY_AREA.sects },
    ],
    1000,
    1e-8,
  )
  adults.forEach((c, i) => (c.weight = adultWeights[i]))

  // Children follow the Bay Area's ethnic mix.
  const childWeights = Float64Array.from(children, (c) => c.weight)
  rakeWeights(children, childWeights, [
    { group: (c) => String(c.band.min), targets: bandTotals(children) },
    { group: (c) => c.ethnicity, targets: BAY_AREA.ethnicity },
  ])
  children.forEach((c, i) => (c.weight = childWeights[i]))

  const scale = ESTIMATES.realistic.bayAreaPopulation / cells.reduce((sum, c) => sum + c.weight, 0)
  for (const c of cells) c.weight *= scale

  fitEthnicityEarnings(adults, BAY_AREA.householdIncome100kPlus, BAY_AREA.earningsFactor)
  return cells
}
