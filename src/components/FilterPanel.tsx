import { useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react'
import type { Nativity } from '../data/background'
import { AGE_MAX, AGE_MIN, HEIGHT_MAX, HEIGHT_MIN, type Ethnicity } from '../data/population'
import type { Sect } from '../data/religion'
import {
  countActiveAdvanced,
  countActiveBasic,
  DEFAULT_FILTERS,
  EDUCATION_STEPS,
  INCOME_STEPS,
  type ConvertFilter,
  type Filters,
  type MaritalStatus,
  type MinEducation,
  type SexFilter,
} from '../lib/filters'
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

const SECT_OPTIONS: Option<Sect>[] = [
  { value: 'sunni', label: 'Sunni' },
  { value: 'shia', label: 'Shia' },
  { value: 'justMuslim', label: 'Just Muslim' },
  { value: 'other', label: 'Other' },
]

const NATIVITY_OPTIONS: Option<Nativity>[] = [
  { value: 'immigrant', label: 'Immigrant' },
  { value: 'secondGen', label: '2nd gen' },
  { value: 'thirdGen', label: '3rd gen+' },
]

const CONVERT_OPTIONS: Option<ConvertFilter>[] = [
  { value: 'any', label: 'Any' },
  { value: 'bornMuslim', label: 'Born Muslim' },
  { value: 'convert', label: 'Convert' },
]

const EDUCATION_LABELS: Record<MinEducation, string> = {
  any: 'Any',
  highSchool: 'High school+',
  someCollege: 'Some college+',
  bachelors: "Bachelor's+",
  graduate: 'Grad degree',
}

type Tab = 'basic' | 'advanced'

function toggle<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item]
}

interface Props {
  filters: Filters
  onChange: (filters: Filters) => void
}

export function FilterPanel({ filters, onChange }: Props) {
  const [tab, setTab] = useState<Tab>('basic')
  const update = (patch: Partial<Filters>) => onChange({ ...filters, ...patch })

  const tabs: { id: Tab; label: string; active: number }[] = [
    { id: 'basic', label: 'Basic', active: countActiveBasic(filters) },
    { id: 'advanced', label: 'Advanced', active: countActiveAdvanced(filters) },
  ]

  // Arrow keys move between tabs, per the ARIA tabs pattern.
  const onTabKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
    const next = tab === 'basic' ? 'advanced' : 'basic'
    setTab(next)
    document.getElementById(`tab-${next}`)?.focus()
  }

  return (
    <aside className="panel">
      <div className="tabs" role="tablist" aria-label="Filters" onKeyDown={onTabKeyDown}>
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            tabIndex={tab === t.id ? 0 : -1}
            className="tab"
            onClick={() => setTab(t.id)}
          >
            {t.label}
            {t.active > 0 && <span className="badge">{t.active}</span>}
          </button>
        ))}
      </div>

      <div className="tab-panel" role="tabpanel" id="panel-basic" aria-labelledby="tab-basic" hidden={tab !== 'basic'}>
        <Field label="Looking for">
          <Segmented
            label="Looking for"
            options={SEX_OPTIONS}
            value={filters.sex}
            onChange={(sex) => update({ sex })}
          />
        </Field>

        <Field label="Age" value={`${filters.ageMin} – ${filters.ageMax}${filters.ageMax === AGE_MAX ? '+' : ''}`}>
          <RangeSlider
            label="age"
            min={AGE_MIN}
            max={AGE_MAX}
            low={filters.ageMin}
            high={filters.ageMax}
            onChange={(ageMin, ageMax) => update({ ageMin, ageMax })}
          />
        </Field>

        <Field label="Ethnicity">
          <ChipGroup
            label="Ethnicity"
            options={ETHNICITY_OPTIONS}
            selected={filters.ethnicities}
            onToggle={(ethnicity) => update({ ethnicities: toggle(filters.ethnicities, ethnicity) })}
          />
        </Field>

        <Field label="Height" value={formatHeightRange(filters.heightMin, filters.heightMax, HEIGHT_MIN, HEIGHT_MAX)}>
          <RangeSlider
            label="height"
            min={HEIGHT_MIN}
            max={HEIGHT_MAX}
            low={filters.heightMin}
            high={filters.heightMax}
            formatValue={formatHeight}
            onChange={(heightMin, heightMax) => update({ heightMin, heightMax })}
          />
        </Field>

        <Field label="Marital status">
          <ChipGroup
            label="Marital status"
            options={MARITAL_OPTIONS}
            selected={filters.marital}
            onToggle={(status) => update({ marital: toggle(filters.marital, status) })}
          />
        </Field>

        <Field label="Min. income" value={formatIncome(filters.minIncome)}>
          <StepSlider
            label="Minimum income"
            steps={INCOME_STEPS}
            value={filters.minIncome}
            format={formatIncome}
            onChange={(minIncome) => update({ minIncome })}
          />
        </Field>
      </div>

      <div
        className="tab-panel"
        role="tabpanel"
        id="panel-advanced"
        aria-labelledby="tab-advanced"
        hidden={tab !== 'advanced'}
      >
        <Field label="Deen">
          <div className="toggles">
            <Toggle
              label="Prays all 5 daily"
              checked={filters.praysFiveDaily}
              onChange={(praysFiveDaily) => update({ praysFiveDaily })}
            />
            <Toggle
              label="Goes to mosque weekly"
              checked={filters.mosqueWeekly}
              onChange={(mosqueWeekly) => update({ mosqueWeekly })}
            />
          </div>
        </Field>

        <Field label="Sect">
          <ChipGroup
            label="Sect"
            options={SECT_OPTIONS}
            selected={filters.sects}
            onToggle={(sect) => update({ sects: toggle(filters.sects, sect) })}
          />
        </Field>

        <Field label="Education" value={EDUCATION_LABELS[filters.minEducation]}>
          <StepSlider
            label="Minimum education"
            steps={EDUCATION_STEPS}
            value={filters.minEducation}
            format={(level) => EDUCATION_LABELS[level]}
            onChange={(minEducation) => update({ minEducation })}
          />
        </Field>

        <Field label="Born in the US?">
          <ChipGroup
            label="Born in the US?"
            options={NATIVITY_OPTIONS}
            selected={filters.nativity}
            onToggle={(nativity) => update({ nativity: toggle(filters.nativity, nativity) })}
          />
        </Field>

        <Field label="Convert">
          <Segmented
            label="Convert"
            options={CONVERT_OPTIONS}
            value={filters.convert}
            onChange={(convert) => update({ convert })}
          />
        </Field>

        <p className="hint">Prayer, mosque and education filters only count adults.</p>
      </div>

      <button type="button" className="reset" onClick={() => onChange(DEFAULT_FILTERS)}>
        Reset filters
      </button>
    </aside>
  )
}

interface FieldProps {
  label: string
  /** Current value shown beside the label. */
  value?: string
  children: ReactNode
}

function Field({ label, value, children }: FieldProps) {
  return (
    <div className="field">
      {value === undefined ? (
        <h2 className="field-label">{label}</h2>
      ) : (
        <div className="field-head">
          <h2 className="field-label">{label}</h2>
          <span className="field-value">{value}</span>
        </div>
      )}
      {children}
    </div>
  )
}

interface SegmentedProps<T> {
  label: string
  options: Option<T>[]
  value: T
  onChange: (value: T) => void
}

function Segmented<T extends string>({ label, options, value, onChange }: SegmentedProps<T>) {
  return (
    <div className="segmented" role="radiogroup" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          className={value === option.value ? 'is-active' : undefined}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
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

interface ToggleProps {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}

function Toggle({ label, checked, onChange }: ToggleProps) {
  return (
    <label className="toggle">
      <span>{label}</span>
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
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

interface StepSliderProps<T> {
  label: string
  steps: T[]
  value: T
  format: (value: T) => string
  onChange: (value: T) => void
}

/** A "this much or more" slider over fixed steps; the fill runs from the value to the top. */
function StepSlider<T>({ label, steps, value, format, onChange }: StepSliderProps<T>) {
  const index = Math.max(0, steps.indexOf(value))
  const percent = `${(index / (steps.length - 1)) * 100}%`

  return (
    <div className="range" style={{ '--lo': percent, '--hi': '100%' } as CSSProperties}>
      <div className="range-track" />
      <div className="range-fill" />
      <input
        type="range"
        min={0}
        max={steps.length - 1}
        value={index}
        aria-label={label}
        aria-valuetext={format(value)}
        onChange={(e) => onChange(steps[Number(e.target.value)])}
      />
    </div>
  )
}
