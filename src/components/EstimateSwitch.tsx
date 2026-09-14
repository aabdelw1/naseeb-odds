import { ESTIMATE_LEVELS, ESTIMATES, type EstimateLevel } from '../data/estimates'

const LABELS: Record<EstimateLevel, string> = {
  conservative: 'Conservative',
  realistic: 'Realistic',
  generous: 'Generous',
}

interface Props {
  value: EstimateLevel
  onChange: (value: EstimateLevel) => void
}

/** How hopeful the count is: moves the population total and survey rates within plausible ranges. */
export function EstimateSwitch({ value, onChange }: Props) {
  return (
    <div className="estimate">
      <div className="segmented segmented--compact" role="radiogroup" aria-label="Estimate">
        {ESTIMATE_LEVELS.map((level) => (
          <button
            key={level}
            type="button"
            role="radio"
            aria-checked={value === level}
            className={value === level ? 'is-active' : undefined}
            onClick={() => onChange(level)}
          >
            {LABELS[level]}
          </button>
        ))}
      </div>
      <p className="estimate-description">{ESTIMATES[value].description}</p>
    </div>
  )
}
