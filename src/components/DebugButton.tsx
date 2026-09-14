import { useState } from 'react'
import type { EstimateLevel } from '../data/estimates'
import { debugReport } from '../lib/debug'
import type { Filters } from '../lib/filters'

/** Shown when running locally, or on the deployed site with ?debug in the URL. */
export const DEBUG_ENABLED = import.meta.env.DEV || new URLSearchParams(window.location.search).has('debug')

interface Props {
  filters: Filters
  estimate: EstimateLevel
}

/** Copies the current search, with a step-by-step breakdown, as JSON (and logs it to the console). */
export function DebugButton({ filters, estimate }: Props) {
  const [status, setStatus] = useState<'idle' | 'copied' | 'logged'>('idle')

  const copy = async () => {
    const text = JSON.stringify(debugReport(filters, estimate), null, 2)
    console.log(`[ummah-odds debug]\n${text}`)
    try {
      await navigator.clipboard.writeText(text)
      setStatus('copied')
    } catch {
      setStatus('logged')
    }
    setTimeout(() => setStatus('idle'), 2000)
  }

  return (
    <button type="button" className="debug-button" onClick={copy}>
      {status === 'copied' ? 'Copied!' : status === 'logged' ? "Couldn't copy; see the console" : 'Copy debug info'}
    </button>
  )
}
