import { useState } from 'react'
import { FilterPanel } from './components/FilterPanel'
import { layoutCircle, PeopleCircle, PersonIcon, PersonSymbol } from './components/PeopleCircle'
import { TOTAL_POPULATION } from './data/population'
import { countMatching, DEFAULT_FILTERS, type Filters } from './lib/filters'
import { formatCount, formatPercent } from './lib/format'
import { useTweenedNumber } from './lib/useTweenedNumber'

export default function App() {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)
  const count = countMatching(filters)
  const layout = layoutCircle(count, TOTAL_POPULATION)
  const displayedCount = useTweenedNumber(count)

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
          <div className="count">{formatCount(Math.round(displayedCount))}</div>
          <div className="count-caption">
            Muslims in the US · <strong>{formatPercent(count / TOTAL_POPULATION)}</strong> of the ummah here
          </div>

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
        Rough estimates: totals from Pew Research Center (2017); marital and income splits approximated. Just for fun.
      </footer>
    </div>
  )
}
