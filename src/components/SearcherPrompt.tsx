import { useState } from 'react'
import { track } from '../lib/analytics'
import { SEARCHERS, type Searcher } from '../lib/searchLog'

// An optional, one-time question: is the visitor a brother, a sister, or just browsing? The
// filters say who someone is looking for, not who they are, and plenty of searches for sisters
// come from mothers and friends. The answer stays in this browser and rides along with searches.

const STORAGE_KEY = 'naseeb-odds:searcher'
const LABELS: Record<Searcher, string> = { brother: 'Brother', sister: 'Sister', browsing: 'Just browsing' }

type Answer = Searcher | 'skipped'

function readAnswer(): Answer | null {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return stored === 'skipped' || SEARCHERS.includes(stored as Searcher) ? (stored as Answer) : null
  } catch {
    return null
  }
}

/** The visitor's answer (null until given or when skipped), and whether to still ask. */
export function useSearcher(): { searcher: Searcher | null; asking: boolean; answer: (answer: Answer) => void } {
  const [stored, setStored] = useState<Answer | null>(readAnswer)
  const answer = (value: Answer) => {
    setStored(value)
    track('searcher', { searcher: value })
    try {
      window.localStorage.setItem(STORAGE_KEY, value)
    } catch {
      // Private browsing: ask again next time, no harm done.
    }
  }
  return { searcher: stored === null || stored === 'skipped' ? null : stored, asking: stored === null, answer }
}

export function SearcherPrompt({ onAnswer }: { onAnswer: (answer: Answer) => void }) {
  return (
    <div className="searcher" role="group" aria-labelledby="searcher-label">
      <span id="searcher-label" className="searcher-label">
        Quick one, for our anonymous stats. I'm a…
      </span>
      <div className="searcher-options">
        {SEARCHERS.map((searcher) => (
          <button key={searcher} type="button" className="chip" onClick={() => onAnswer(searcher)}>
            {LABELS[searcher]}
          </button>
        ))}
        <button type="button" className="searcher-skip" aria-label="Skip this question" onClick={() => onAnswer('skipped')}>
          ✕
        </button>
      </div>
    </div>
  )
}
