import { useEffect, useRef, useState } from 'react'
import { track } from '../lib/analytics'
import { SEARCHERS, type Searcher } from '../lib/searchLog'

// A one-time question on landing: brother, sister, or just browsing? The filters say who
// someone is looking for, not who they are, and plenty of searches for sisters come from
// mothers and friends. Closing it counts as an answer of sorts: never ask again. The answer
// stays in this browser and rides along with searches; the FAQ explains that.

const STORAGE_KEY = 'naseeb-odds:searcher'
const LABELS: Record<Searcher, string> = { brother: 'A brother', sister: 'A sister', browsing: 'Just browsing' }

/** Long enough for the page to paint first, so it arrives as a question, not a wall. */
const APPEAR_AFTER_MS = 600

type Answer = Searcher | 'skipped'

function readAnswer(): Answer | null {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return stored === 'skipped' || SEARCHERS.includes(stored as Searcher) ? (stored as Answer) : null
  } catch {
    return null
  }
}

/** The visitor's answer (null until given or when dismissed), and whether to still ask. */
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
  const dialog = useRef<HTMLDialogElement>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setReady(true), APPEAR_AFTER_MS)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    // showModal gives the backdrop, the focus trap and Escape for free.
    if (ready && dialog.current && !dialog.current.open) dialog.current.showModal()
  }, [ready])

  if (!ready) return null
  const dismiss = () => onAnswer('skipped')

  return (
    <dialog
      className="ask"
      ref={dialog}
      aria-labelledby="ask-title"
      onCancel={(event) => {
        event.preventDefault()
        dismiss()
      }}
      // A click that lands on the dialog itself is a click on the backdrop around the card.
      onClick={(event) => {
        if (event.target === dialog.current) dismiss()
      }}
    >
      <h2 id="ask-title">Are you a…</h2>
      <div className="ask-options">
        {SEARCHERS.map((searcher) => (
          <button key={searcher} type="button" className="ask-option" onClick={() => onAnswer(searcher)}>
            {LABELS[searcher]}
          </button>
        ))}
      </div>
      <button type="button" className="ask-close" aria-label="Close" onClick={dismiss}>
        ✕
      </button>
    </dialog>
  )
}
