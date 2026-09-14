// Prints how the model's numbers relate across filters, as markdown tables.
// Run with: npm run report

import { HOUSEHOLD_100K_PLUS } from '../src/data/earnings'
import { ETHNIC_GROUPS, type Ethnicity } from '../src/data/population'
import { EDUCATION_STEPS, type Filters, type MinEducation } from '../src/lib/filters'
import { count, pct, share } from '../src/test/helpers'

type Patch = Partial<Filters>

const US_BORN: Patch = { nativity: ['secondGen', 'thirdGen'] }
const ETHNICITY_LABELS: Record<Ethnicity, string> = {
  arab: 'Arab',
  black: 'Black',
  desi: 'Desi',
  white: 'White',
  other: 'Other',
}
const EDUCATION_LABELS = ['Less than high school', 'High school', 'Some college', "Bachelor's", 'Graduate degree']

function table(title: string, headers: string[], rows: (string | number)[][]): void {
  console.log(`\n### ${title}\n`)
  console.log(`| ${headers.join(' | ')} |`)
  console.log(`| ${headers.map(() => '---').join(' | ')} |`)
  for (const row of rows) console.log(`| ${row.join(' | ')} |`)
}

/** Number of people matching `given` at exactly education level `i` (0 = less than high school). */
function atLevel(i: number, given: Patch = {}): number {
  const atLeast = (step: MinEducation | undefined) => (step ? count({ ...given, minEducation: step }) : 0)
  return atLeast(EDUCATION_STEPS[i]) - atLeast(EDUCATION_STEPS[i + 1])
}

const working: Patch = { ageMin: 25, ageMax: 54 }

table(
  'Personal earnings by highest degree (ages 25–54)',
  ['Degree', 'Share of group', '$50k+', '$100k+', '$250k+'],
  EDUCATION_LABELS.map((label, i) => [
    label,
    pct(atLevel(i, working) / count(working)),
    ...[50_000, 100_000, 250_000].map((minIncome) => pct(atLevel(i, { ...working, minIncome }) / atLevel(i, working))),
  ]),
)

table(
  'Highest degree of all adults vs. high earners',
  ['Degree', 'All adults', '$100k+ earners', '$250k+ earners'],
  EDUCATION_LABELS.map((label, i) => [
    label,
    ...[0, 100_000, 250_000].map((minIncome) => pct(atLevel(i, { minIncome }) / count({ minIncome }))),
  ]),
)

table(
  '$100k+ earners by ethnicity (ages 25–54)',
  ['Ethnicity', 'Model: personal $100k+', "Model: bachelor's+", 'ISPU: household $100k+'],
  (Object.keys(ETHNICITY_LABELS) as Ethnicity[]).map((e) => [
    ETHNICITY_LABELS[e],
    pct(share({ minIncome: 100_000 }, { ...working, ethnicities: [e] })),
    pct(share({ minEducation: 'bachelors' }, { ...working, ethnicities: [e] })),
    e === 'other' ? '(assumed 15%)' : pct(ETHNIC_GROUPS[e].householdIncome100kPlus),
  ]),
)

const traits: [string, Patch][] = [
  ['$100k+ personal earnings', { minIncome: 100_000 }],
  ["Bachelor's+", { minEducation: 'bachelors' }],
  ['Married', { marital: ['married'] }],
  ['Prays all five', { praysFiveDaily: true }],
  ['Mosque weekly', { mosqueWeekly: true }],
  ['Convert', { convert: 'convert' }],
]
table(
  'Immigrants vs. US-born (adults)',
  ['Trait', 'Immigrants', 'US-born'],
  [
    ...traits.map(([label, patch]) => [label, pct(share(patch, { nativity: ['immigrant'] })), pct(share(patch, US_BORN))]),
    ['Pew: household $100k+', pct(HOUSEHOLD_100K_PLUS.immigrant), pct(HOUSEHOLD_100K_PLUS.usBorn)],
  ],
)

const ageRows: [string, Patch][] = [
  ['18–24', { ageMin: 18, ageMax: 24 }],
  ['25–34', { ageMin: 25, ageMax: 34 }],
  ['35–44', { ageMin: 35, ageMax: 44 }],
  ['45–54', { ageMin: 45, ageMax: 54 }],
  ['55+', { ageMin: 55, ageMax: 90 }],
]
table(
  'Married, by age and birthplace',
  ['Age', 'Immigrants', 'US-born', 'Never married (all)'],
  ageRows.map(([label, age]) => [
    label,
    pct(share({ marital: ['married'] }, { ...age, nativity: ['immigrant'] })),
    pct(share({ marital: ['married'] }, { ...age, ...US_BORN })),
    pct(share({ marital: ['neverMarried'] }, age)),
  ]),
)

table(
  'Religious practice by sex and age',
  ['Age', 'Brothers pray all 5', 'Sisters pray all 5', 'Brothers mosque weekly', 'Sisters mosque weekly'],
  ageRows.map(([label, age]) => [
    label,
    pct(share({ praysFiveDaily: true }, { ...age, sex: 'male' })),
    pct(share({ praysFiveDaily: true }, { ...age, sex: 'female' })),
    pct(share({ mosqueWeekly: true }, { ...age, sex: 'male' })),
    pct(share({ mosqueWeekly: true }, { ...age, sex: 'female' })),
  ]),
)

table(
  'Converts by ethnicity and generation',
  ['Ethnicity', 'Immigrants', '2nd gen', '3rd gen+', 'All'],
  (Object.keys(ETHNICITY_LABELS) as Ethnicity[]).map((e) => [
    ETHNICITY_LABELS[e],
    pct(share({ convert: 'convert' }, { ethnicities: [e], nativity: ['immigrant'] })),
    pct(share({ convert: 'convert' }, { ethnicities: [e], nativity: ['secondGen'] })),
    pct(share({ convert: 'convert' }, { ethnicities: [e], nativity: ['thirdGen'] })),
    pct(share({ convert: 'convert' }, { ethnicities: [e] })),
  ]),
)

const pairs: [string, Patch, string, Patch][] = [
  ["Bachelor's+", { minEducation: 'bachelors' }, '$250k+', { minIncome: 250_000 }],
  ['High school or less', {}, '$250k+', { minIncome: 250_000 }],
  ['Immigrant', { nativity: ['immigrant'] }, 'Married', { marital: ['married'] }],
  ['3rd gen+', { nativity: ['thirdGen'] }, 'Convert', { convert: 'convert' }],
  ['Prays all five', { praysFiveDaily: true }, 'Mosque weekly', { mosqueWeekly: true }],
  ['Black', { ethnicities: ['black'] }, '$100k+', { minIncome: 100_000 }],
  ['Sunni', { sects: ['sunni'] }, 'Mosque weekly', { mosqueWeekly: true }],
]
table(
  'Linked traits vs. multiplying shares (adults)',
  ['A', 'B', 'Share A', 'Share B', 'A × B', 'Model: both', 'Model ÷ (A × B)'],
  pairs.map(([aLabel, a, bLabel, b]) => {
    // "High school or less" is everyone minus some college+.
    const shareA = aLabel === 'High school or less' ? 1 - share({ minEducation: 'someCollege' }) : share(a)
    const both =
      aLabel === 'High school or less'
        ? share(b) - share({ ...b, minEducation: 'someCollege' })
        : share({ ...a, ...b })
    const shareB = share(b)
    return [aLabel, bLabel, pct(shareA), pct(shareB), pct(shareA * shareB), pct(both), (both / (shareA * shareB)).toFixed(2)]
  }),
)

const searches: [string, [string, Patch][]][] = [
  [
    'A sister looking for a brother',
    [
      ['Brothers 25–35', { sex: 'male', ageMin: 25, ageMax: 35 }],
      ['Never married', { marital: ['neverMarried'] }],
      ['5\'10"+', { heightMin: 70 }],
      ["Bachelor's+", { minEducation: 'bachelors' }],
      ['$100k+', { minIncome: 100_000 }],
      ['Prays all five', { praysFiveDaily: true }],
      ['Sunni', { sects: ['sunni'] }],
    ],
  ],
  [
    'A brother looking for a sister',
    [
      ['Sisters 22–30', { sex: 'female', ageMin: 22, ageMax: 30 }],
      ['Never married', { marital: ['neverMarried'] }],
      ['Arab or Desi', { ethnicities: ['arab', 'desi'] }],
      ["Bachelor's+", { minEducation: 'bachelors' }],
      ['Prays all five', { praysFiveDaily: true }],
      ['Born Muslim', { convert: 'bornMuslim' }],
    ],
  ],
]
for (const [title, steps] of searches) {
  let filters: Patch = {}
  let previous = 0
  let naive = 0
  const rows = steps.map(([label, patch], i) => {
    filters = { ...filters, ...patch }
    const c = count(filters)
    // Naive: apply each filter's share of the first step's group, as if traits were unrelated.
    naive = i === 0 ? c : naive * share(patch, steps[0][1])
    const row = [label, c.toLocaleString('en-US'), i === 0 ? '—' : pct(c / previous), Math.round(naive).toLocaleString('en-US')]
    previous = c
    return row
  })
  table(title, ['Filter added', 'Count', 'Kept from previous step', 'If traits were unrelated'], rows)
}
