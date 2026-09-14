import { useEffect, useMemo, useRef, useState } from 'react'
import { DEBUG_ENABLED, DebugButton } from './components/DebugButton'
import { EstimateSwitch } from './components/EstimateSwitch'
import { FilterPanel } from './components/FilterPanel'
import { layoutCircle, PeopleCircle, PersonIcon, PersonSymbol } from './components/PeopleCircle'
import { ShareButton } from './components/ShareButton'
import type { EstimateLevel } from './data/estimates'
import { countActive, countMatching, totalPopulation, type Filters } from './lib/filters'
import { formatCount, formatPercent } from './lib/format'
import { fromSearchParams, toSearchParams } from './lib/urlState'
import { useIsVisible } from './lib/useIsVisible'
import { useTweenedNumber } from './lib/useTweenedNumber'

export default function App() {
  // The search lives in the page address, so a shared link reopens the same search.
  const [initial] = useState(() => fromSearchParams(new URLSearchParams(window.location.search)))
  const [filters, setFilters] = useState<Filters>(initial.filters)
  const [estimate, setEstimate] = useState<EstimateLevel>(initial.estimate)
  const bayArea = filters.region === 'bayArea'
  const place = bayArea ? 'the Bay Area' : 'the US'
  const total = totalPopulation(estimate, filters.region)
  // The count animates every frame, so only recount when the inputs change.
  const count = useMemo(() => countMatching(filters, estimate), [filters, estimate])
  const layout = useMemo(() => layoutCircle(count, total), [count, total])
  const tweenedCount = useTweenedNumber(count)
  const displayedCount = formatCount(Math.round(tweenedCount))
  const countRef = useRef<HTMLDivElement>(null)
  const countVisible = useIsVisible(countRef)

  useEffect(() => {
    const params = toSearchParams({ filters, estimate })
    if (new URLSearchParams(window.location.search).has('debug')) params.set('debug', '')
    const query = params.toString()
    window.history.replaceState(null, '', query ? `${window.location.pathname}?${query}` : window.location.pathname)
  }, [filters, estimate])

  const filtered = Object.values(countActive(filters)).some((active) => active > 0)
  const shareText = filtered
    ? `Only ${formatCount(count)} Muslims in ${place} match my standards 😅 What are your odds?`
    : `There are about ${formatCount(total)} Muslims in ${place}. How many match your standards?`

  return (
    <div className="app">
      <PersonSymbol />

      <header className="header">
        <h1>
          Naseeb <span>Odds</span>
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
            Muslims in {place} · <strong>{formatPercent(count / total)}</strong> of the ummah here
          </div>

          <EstimateSwitch value={estimate} onChange={setEstimate} bayArea={bayArea} />

          <div className="result-actions">
            <div className="legend">
              <PersonIcon className="legend-icon" />
              <span>
                = {formatCount(layout.unit)} {layout.unit === 1 ? 'person' : 'people'}
              </span>
            </div>
            <ShareButton text={shareText} />
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
        {DEBUG_ENABLED && <DebugButton filters={filters} estimate={estimate} />}
      </footer>

      {/* On phones the results sit below the filters, so keep the count on screen. */}
      <div className="count-bar" hidden={countVisible} aria-hidden="true">
        <strong>{displayedCount}</strong>
        <span>Muslims · 1 icon = {formatCount(layout.unit)}</span>
      </div>
    </div>
  )
}
