import { useEffect, useRef, useState } from 'react'
import { track } from '../lib/analytics'

interface Props {
  /** Message sent along with the link to the current search. */
  text: string
  /** Where the button sits, for usage stats. The count bar's is icon-only. */
  placement: 'results' | 'count bar'
  /** The first time this changes, the button glows to draw the eye. */
  nudgeKey?: unknown
}

/** Shares the current search link: the native share sheet on phones, otherwise copies it. */
export function ShareButton({ text, placement, nudgeKey }: Props) {
  const [copied, setCopied] = useState(false)
  const [nudging, setNudging] = useState(false)
  const initialKey = useRef(nudgeKey)

  // Glow once, the first time the search changes, so people notice they can share their result.
  useEffect(() => {
    if (nudgeKey !== initialKey.current) setNudging(true)
  }, [nudgeKey])

  const share = async () => {
    const url = window.location.href
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Naseeb Odds', text, url })
        track('share', { method: 'share sheet', placement })
        return
      } catch (error) {
        // Closing the share sheet isn't a failure; anything else falls back to copying.
        if (error instanceof DOMException && error.name === 'AbortError') return
      }
    }
    try {
      await navigator.clipboard.writeText(`${text} ${url}`)
      track('share', { method: 'copied link', placement })
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard access denied; the link is still in the address bar.
    }
  }

  const compact = placement === 'count bar'
  const label = copied ? 'Link copied!' : 'Share my odds'
  const className = ['share-button', compact && 'share-button--compact', nudging && 'share-button--nudge']
    .filter(Boolean)
    .join(' ')

  return (
    <button type="button" className={className} onClick={share} aria-label={compact ? label : undefined}>
      {copied ? <CheckIcon /> : <ShareIcon />}
      {!compact && <span>{label}</span>}
    </button>
  )
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v12" />
      <path d="M7 8l5-5 5 5" />
      <path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  )
}
