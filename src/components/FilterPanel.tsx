import type { CSSProperties } from 'react'
import { AGE_MAX, AGE_MIN } from '../data/population'
import { DEFAULT_FILTERS, type Filters, type SexFilter } from '../lib/filters'

const SEX_OPTIONS: { value: SexFilter; label: string }[] = [
  { value: 'any', label: 'Anyone' },
  { value: 'male', label: 'Brothers' },
  { value: 'female', label: 'Sisters' },
]

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
        <AgeRange
          min={filters.ageMin}
          max={filters.ageMax}
          onChange={(ageMin, ageMax) => update({ ageMin, ageMax })}
        />
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
