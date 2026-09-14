import { useState } from 'react'
import { track } from '../lib/analytics'

interface Props {
  /** Message sent along with the link to the current search. */
  text: string
}

/** Shares the current search link: the native share sheet on phones, otherwise copies it. */
export function ShareButton({ text }: Props) {
  const [copied, setCopied] = useState(false)

  const share = async () => {
    const url = window.location.href
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Naseeb Odds', text, url })
        track('share', { method: 'share sheet' })
        return
      } catch (error) {
        // Closing the share sheet isn't a failure; anything else falls back to copying.
        if (error instanceof DOMException && error.name === 'AbortError') return
      }
    }
    try {
      await navigator.clipboard.writeText(`${text} ${url}`)
      track('share', { method: 'copied link' })
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard access denied; the link is still in the address bar.
    }
  }

  return (
    <button type="button" className="share-button" onClick={share}>
      {copied ? 'Link copied!' : 'Share this search'}
    </button>
  )
}
