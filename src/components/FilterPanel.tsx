import type { CSSProperties } from 'react'
import { AGE_MAX, AGE_MIN, HEIGHT_MAX, HEIGHT_MIN, type Ethnicity } from '../data/population'
import { DEFAULT_FILTERS, INCOME_STEPS, type Filters, type MaritalStatus, type SexFilter } from '../lib/filters'
import { formatHeight, formatHeightRange, formatIncome } from '../lib/format'

interface Option<T> {
  value: T
  label: string
}

const SEX_OPTIONS: Option<SexFilter>[] = [
  { value: 'any', label: 'Anyone' },
  { value: 'male', label: 'Brothers' },
  { value: 'female', label: 'Sisters' },
]

const ETHNICITY_OPTIONS: Option<Ethnicity>[] = [
  { value: 'arab', label: 'Arab' },
  { value: 'black', label: 'Black' },
  { value: 'desi', label: 'Desi' },
  { value: 'white', label: 'White' },
  { value: 'other', label: 'Other' },
]

const MARITAL_OPTIONS: Option<MaritalStatus>[] = [
  { value: 'neverMarried', label: 'Never married' },
  { value: 'divorcedNoKids', label: 'Divorced, no kids' },
  { value: 'divorcedWithKids', label: 'Divorced with kids' },
  { value: 'widowed', label: 'Widowed' },
  { value: 'married', label: 'Married' },
]

function toggle<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item]
}

interface Props {
  filters: Filters
  onChange: (filters: Filters) => void
}

export function FilterPanel({ filters, onChange }: Props) {
  const update = (patch: Partial<Filters>) => onChange({ ...filters, ...patch })

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
        <RangeSlider
          label="age"
          min={AGE_MIN}
          max={AGE_MAX}
          low={filters.ageMin}
          high={filters.ageMax}
          onChange={(ageMin, ageMax) => update({ ageMin, ageMax })}
        />
      </div>

      <div className="field">
        <h2 className="field-label">Ethnicity</h2>
        <ChipGroup
          label="Ethnicity"
          options={ETHNICITY_OPTIONS}
          selected={filters.ethnicities}
          onToggle={(ethnicity) => update({ ethnicities: toggle(filters.ethnicities, ethnicity) })}
        />
      </div>

      <div className="field">
        <div className="field-head">
          <h2 className="field-label">Height</h2>
          <span className="field-value">
            {formatHeightRange(filters.heightMin, filters.heightMax, HEIGHT_MIN, HEIGHT_MAX)}
          </span>
        </div>
        <RangeSlider
          label="height"
          min={HEIGHT_MIN}
          max={HEIGHT_MAX}
          low={filters.heightMin}
          high={filters.heightMax}
          formatValue={formatHeight}
          onChange={(heightMin, heightMax) => update({ heightMin, heightMax })}
        />
      </div>

      <div className="field">
        <h2 className="field-label">Marital status</h2>
        <ChipGroup
          label="Marital status"
          options={MARITAL_OPTIONS}
          selected={filters.marital}
          onToggle={(status) => update({ marital: toggle(filters.marital, status) })}
        />
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

interface ChipGroupProps<T> {
  label: string
  options: Option<T>[]
  selected: T[]
  onToggle: (value: T) => void
}

function ChipGroup<T extends string>({ label, options, selected, onToggle }: ChipGroupProps<T>) {
  return (
    <div className="chips" role="group" aria-label={label}>
      {options.map((option) => {
        const active = selected.includes(option.value)
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            className={active ? 'chip is-active' : 'chip'}
            onClick={() => onToggle(option.value)}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

interface RangeSliderProps {
  /** Lowercase noun for accessible names, e.g. "age" gives "Minimum age". */
  label: string
  min: number
  max: number
  low: number
  high: number
  formatValue?: (value: number) => string
  onChange: (low: number, high: number) => void
}

function RangeSlider({ label, min, max, low, high, formatValue = String, onChange }: RangeSliderProps) {
  const toPercent = (value: number) => `${((value - min) / (max - min)) * 100}%`
  // When both thumbs sit at the top, lift the low thumb so it can still be dragged down.
  const lowOnTop = low > (min + max) / 2

  return (
    <div className="range" style={{ '--lo': toPercent(low), '--hi': toPercent(high) } as CSSProperties}>
      <div className="range-track" />
      <div className="range-fill" />
      <input
        type="range"
        min={min}
        max={max}
        value={low}
        aria-label={`Minimum ${label}`}
        aria-valuetext={formatValue(low)}
        style={{ zIndex: lowOnTop ? 3 : 2 }}
        onChange={(e) => onChange(Math.min(Number(e.target.value), high), high)}
      />
      <input
        type="range"
        min={min}
        max={max}
        value={high}
        aria-label={`Maximum ${label}`}
        aria-valuetext={formatValue(high)}
        onChange={(e) => onChange(low, Math.max(Number(e.target.value), low))}
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
