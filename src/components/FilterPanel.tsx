import type { CSSProperties } from 'react'
import { AGE_MAX, AGE_MIN } from '../data/population'
import { DEFAULT_FILTERS, INCOME_STEPS, type Filters, type MaritalStatus, type SexFilter } from '../lib/filters'
import { formatIncome } from '../lib/format'

const SEX_OPTIONS: { value: SexFilter; label: string }[] = [
  { value: 'any', label: 'Anyone' },
  { value: 'male', label: 'Brothers' },
  { value: 'female', label: 'Sisters' },
]

const MARITAL_OPTIONS: { value: MaritalStatus; label: string }[] = [
  { value: 'neverMarried', label: 'Never married' },
  { value: 'divorcedNoKids', label: 'Divorced, no kids' },
  { value: 'divorcedWithKids', label: 'Divorced with kids' },
  { value: 'widowed', label: 'Widowed' },
  { value: 'married', label: 'Married' },
]

interface Props {
  filters: Filters
  onChange: (filters: Filters) => void
}

export function FilterPanel({ filters, onChange }: Props) {
  const update = (patch: Partial<Filters>) => onChange({ ...filters, ...patch })

  const toggleMarital = (status: MaritalStatus) =>
    update({
      marital: filters.marital.includes(status)
        ? filters.marital.filter((s) => s !== status)
        : [...filters.marital, status],
    })

  return (
    <aside className="panel">
      <div className="field">
        <h2 className="field-label">Looking for</h2>
        <div className="segmented" role="radiogroup" aria-label="Looking for">
          {SEX_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={filters.sex === option.value}
              className={filters.sex === option.value ? 'is-active' : undefined}
              onClick={() => update({ sex: option.value })}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <div className="field-head">
          <h2 className="field-label">Age</h2>
          <span className="field-value">
            {filters.ageMin} – {filters.ageMax}
            {filters.ageMax === AGE_MAX ? '+' : ''}
          </span>
        </div>
        <AgeRange
          min={filters.ageMin}
          max={filters.ageMax}
          onChange={(ageMin, ageMax) => update({ ageMin, ageMax })}
        />
      </div>

      <div className="field">
        <h2 className="field-label">Marital status</h2>
        <div className="chips" role="group" aria-label="Marital status">
          {MARITAL_OPTIONS.map((option) => {
            const active = filters.marital.includes(option.value)
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={active}
                className={active ? 'chip is-active' : 'chip'}
                onClick={() => toggleMarital(option.value)}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="field">
        <div className="field-head">
          <h2 className="field-label">Min. income</h2>
          <span className="field-value">{formatIncome(filters.minIncome)}</span>
        </div>
        <IncomeSlider value={filters.minIncome} onChange={(minIncome) => update({ minIncome })} />
      </div>

      <button type="button" className="reset" onClick={() => onChange(DEFAULT_FILTERS)}>
        Reset filters
      </button>
    </aside>
  )
}

interface AgeRangeProps {
  min: number
  max: number
  onChange: (min: number, max: number) => void
}

function AgeRange({ min, max, onChange }: AgeRangeProps) {
  const toPercent = (age: number) => `${((age - AGE_MIN) / (AGE_MAX - AGE_MIN)) * 100}%`
  // When both thumbs sit at the top, lift the min thumb so it can still be dragged down.
  const minOnTop = min > (AGE_MIN + AGE_MAX) / 2

  return (
    <div className="range" style={{ '--lo': toPercent(min), '--hi': toPercent(max) } as CSSProperties}>
      <div className="range-track" />
      <div className="range-fill" />
      <input
        type="range"
        min={AGE_MIN}
        max={AGE_MAX}
        value={min}
        aria-label="Minimum age"
        style={{ zIndex: minOnTop ? 3 : 2 }}
        onChange={(e) => onChange(Math.min(Number(e.target.value), max), max)}
      />
      <input
        type="range"
        min={AGE_MIN}
        max={AGE_MAX}
        value={max}
        aria-label="Maximum age"
        onChange={(e) => onChange(min, Math.max(Number(e.target.value), min))}
      />
    </div>
  )
}

interface IncomeSliderProps {
  value: number
  onChange: (minIncome: number) => void
}

function IncomeSlider({ value, onChange }: IncomeSliderProps) {
  const index = Math.max(0, INCOME_STEPS.indexOf(value))
  const percent = `${(index / (INCOME_STEPS.length - 1)) * 100}%`

  // The fill runs from the chosen minimum to the top: "this much or more".
  return (
    <div className="range" style={{ '--lo': percent, '--hi': '100%' } as CSSProperties}>
      <div className="range-track" />
      <div className="range-fill" />
      <input
        type="range"
        min={0}
        max={INCOME_STEPS.length - 1}
        value={index}
        aria-label="Minimum income"
        aria-valuetext={formatIncome(value)}
        onChange={(e) => onChange(INCOME_STEPS[Number(e.target.value)])}
      />
    </div>
  )
}
