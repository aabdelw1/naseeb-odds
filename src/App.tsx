import { useMemo, useRef, useState } from 'react'
import { EstimateSwitch } from './components/EstimateSwitch'
import { FilterPanel } from './components/FilterPanel'
import { layoutCircle, PeopleCircle, PersonIcon, PersonSymbol } from './components/PeopleCircle'
import type { EstimateLevel } from './data/estimates'
import { countMatching, DEFAULT_FILTERS, totalPopulation, type Filters } from './lib/filters'
import { formatCount, formatPercent } from './lib/format'
import { useIsVisible } from './lib/useIsVisible'
import { useTweenedNumber } from './lib/useTweenedNumber'

export default function App() {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)
  const [estimate, setEstimate] = useState<EstimateLevel>('realistic')
  const total = totalPopulation(estimate)
  // The count animates every frame, so only recount when the inputs change.
  const count = useMemo(() => countMatching(filters, estimate), [filters, estimate])
  const layout = useMemo(() => layoutCircle(count, total), [count, total])
  const tweenedCount = useTweenedNumber(count)
  const displayedCount = formatCount(Math.round(tweenedCount))
  const countRef = useRef<HTMLDivElement>(null)
  const countVisible = useIsVisible(countRef)

  return (
    <div className="app">
      <PersonSymbol />

      <header className="header">
        <h1>
          Ummah <span>Odds</span>
        </h1>
        <p>What are the chances of finding your match in the US?</p>
      </header>

      <main className="layout">
        <FilterPanel filters={filters} onChange={setFilters} />

        <section className="results" aria-live="polite">
          <div className="count" ref={countRef}>
            {displayedCount}
          </div>
          <div className="count-caption">
            Muslims in the US · <strong>{formatPercent(count / total)}</strong> of the ummah here
          </div>

          <EstimateSwitch value={estimate} onChange={setEstimate} />

          <div className="legend">
            <PersonIcon className="legend-icon" />
            <span>
              = {formatCount(layout.unit)} {layout.unit === 1 ? 'person' : 'people'}
            </span>
          </div>

          {count === 0 ? (
            <p className="empty">Nobody left. Maybe lower those standards a little 😅</p>
          ) : (
            <PeopleCircle layout={layout} sex={filters.sex} />
          )}
        </section>
      </main>

      <footer className="footer">
        Estimates from Pew Research Center, ISPU American Muslim Poll (2025), US Religion Census (2020), BLS and CDC
        NHANES. Just for fun.
      </footer>

      {/* On phones the results sit below the filters, so keep the count on screen. */}
      <div className="count-bar" hidden={countVisible} aria-hidden="true">
        <strong>{displayedCount}</strong>
        <span>Muslims · 1 icon = {formatCount(layout.unit)}</span>
      </div>
    </div>
  )
}
