import { useEffect, useMemo, useRef, useState } from 'react'
import { DEBUG_ENABLED, DebugButton } from './components/DebugButton'
import { EstimateSwitch } from './components/EstimateSwitch'
import { FilterPanel } from './components/FilterPanel'
import { layoutCircle, PeopleCircle, PersonIcon, PersonSymbol } from './components/PeopleCircle'
import { SearcherPrompt, useSearcher } from './components/SearcherPrompt'
import { ShareButton } from './components/ShareButton'
import type { EstimateLevel } from './data/estimates'
import { ABOUT_HASH } from './lib/aboutPage'
import { resultBucket, track, trackSettled } from './lib/analytics'
import { countActive, countMatching, totalPopulation, type Filters } from './lib/filters'
import { formatCount, formatPercent } from './lib/format'
import { logSearch, SEARCH_SETTLE_MS } from './lib/searchLogClient'
import { searchUrl, URL_UPDATE_DELAY_MS, writeSearchUrl } from './lib/urlSync'
import { changedSettings, fromSearchParams, toSearchParams, type SearchState } from './lib/urlState'
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
  const activeFilters = Object.values(countActive(filters)).reduce((sum, active) => sum + active, 0)

  useEffect(() => {
    const settings = [...toSearchParams(initial).keys()].length
    if (settings > 0) track('shared-link-open', { settings })
  }, [initial])

  // The address carries the search so links are shareable, but it is only rewritten once the
  // search settles. Safari throws after about 100 history writes in 30 seconds, and dragging a
  // slider changes the search on every frame, which used to crash the app mid-drag.
  useEffect(() => {
    const timer = setTimeout(() => {
      // Built at write time, not when the timer was set: the reader may have opened Learn more
      // in between, and that hash has to survive.
      const { pathname, search, hash } = window.location
      writeSearchUrl(searchUrl({ filters, estimate }, pathname, search, hash))
    }, URL_UPDATE_DELAY_MS)
    return () => clearTimeout(timer)
  }, [filters, estimate])

  const previousSearch = useRef<SearchState>(initial)
  useEffect(() => {
    // Anonymous usage stats: which settings people change (sent once a slider settles) and
    // roughly how many people the search leaves.
    const search: SearchState = { filters, estimate }
    const changes = changedSettings(previousSearch.current, search)
    previousSearch.current = search
    if (changes.length === 0) return
    for (const { setting, value } of changes) trackSettled(`setting:${setting}`, 'filter', { setting, value })
    trackSettled('search', 'search', { result: resultBucket(count), filters: activeFilters }, 2000)
  }, [filters, estimate, count, activeFilters])

  // The anonymous search log (worker/). A search counts once it has sat still, and the one the
  // page opened with doesn't count at all: whoever shared the link chose it, not this visitor.
  const { searcher, asking, answer } = useSearcher()
  const searcherRef = useRef(searcher)
  useEffect(() => {
    searcherRef.current = searcher
  }, [searcher])
  const initialQuery = useMemo(() => toSearchParams(initial).toString(), [initial])
  useEffect(() => {
    if (toSearchParams({ filters, estimate }).toString() === initialQuery) return
    const timer = setTimeout(() => logSearch(searcherRef.current, estimate, filters, count), SEARCH_SETTLE_MS)
    return () => clearTimeout(timer)
  }, [filters, estimate, count, initialQuery])

  const shareText =
    activeFilters > 0
      ? ` ${formatCount(count)} total for me`
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
            <ShareButton text={shareText} placement="results" nudgeKey={count} />
          </div>

          {count === 0 ? (
            <p className="empty">Nobody left. Maybe lower those standards a little 😅</p>
          ) : (
            <PeopleCircle layout={layout} sex={filters.sex} />
          )}
        </section>
      </main>

      <footer className="footer">
        <a className="learn-more" href={ABOUT_HASH}>
          What is this? Learn more
        </a>
        <span>
          Estimates from Pew Research Center, ISPU American Muslim Poll (2025), US Religion Census (2020), BLS and CDC
          NHANES. Just for fun.
        </span>
        {DEBUG_ENABLED && <DebugButton filters={filters} estimate={estimate} />}
      </footer>

      {asking && <SearcherPrompt onAnswer={answer} />}

      {/* On phones the results sit below the filters, so keep the count on screen. */}
      <div className="count-bar" hidden={countVisible}>
        <strong aria-hidden="true">{displayedCount}</strong>
        {/* Kept short: the bubble is one line, and it has to fit on a 320px phone. */}
        <span aria-hidden="true">Muslims · {formatPercent(count / total)}</span>
        <ShareButton text={shareText} placement="count bar" />
      </div>
    </div>
  )
}
