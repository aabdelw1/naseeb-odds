// Breaks one search down step by step: how much each filter keeps, and what the final
// count would be without each filter. Run with: npx vite-node scripts/funnel.ts

import { ESTIMATE_LEVELS } from '../src/data/estimates'
import { countMatching, type Filters } from '../src/lib/filters'
import { ADULTS, count, pct } from '../src/test/helpers'

type Patch = Partial<Filters>

const steps: [string, Patch][] = [
  ['Brothers 27–34', { sex: 'male', ageMin: 27, ageMax: 34 }],
  ['Arab', { ethnicities: ['arab'] }],
  ['2nd or 3rd gen', { nativity: ['secondGen', 'thirdGen'] }],
  ['Never married', { marital: ['neverMarried'] }],
  ['5\'8"+', { heightMin: 68 }],
  ["Bachelor's+", { minEducation: 'bachelors' }],
  ['$100k+', { minIncome: 100_000 }],
  ['Prays all 5', { praysFiveDaily: true }],
  ['Sunni', { sects: ['sunni'] }],
  ['Born Muslim', { convert: 'bornMuslim' }],
]

const all: Patch = Object.assign({}, ...steps.map(([, patch]) => patch))
const base = steps[0][1]
const final = count(all)

console.log('| Filter added | Count | Kept from previous | Share of brothers 27–34 on its own | Final count without this filter |')
console.log('| --- | --- | --- | --- | --- |')
let filters: Patch = {}
let previous = 0
steps.forEach(([label, patch], i) => {
  filters = { ...filters, ...patch }
  const c = count(filters)
  const alone = i === 0 ? '—' : pct(count({ ...base, ...patch }) / count(base))
  const without = Object.assign({}, ...steps.filter((_, j) => j !== i).map(([, p]) => p))
  const withoutCount = i === 0 ? '—' : `${count(without).toLocaleString('en-US')} (×${(count(without) / final).toFixed(1)})`
  console.log(`| ${label} | ${c.toLocaleString('en-US')} | ${i === 0 ? '—' : pct(c / previous)} | ${alone} | ${withoutCount} |`)
  previous = c
})
console.log(`\nFinal: ${ESTIMATE_LEVELS.map((level) => `${level} ${countMatching({ ...ADULTS, ...all }, level)}`).join(' · ')}`)
