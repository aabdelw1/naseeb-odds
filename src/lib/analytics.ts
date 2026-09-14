// Anonymous usage stats sent to Umami (https://umami.is): page views plus a few events about
// which settings people use. Nothing identifies a visitor. The tracker script in index.html
// only sends data from naseebodds.com; during local development events are just logged.

export type EventData = Record<string, string | number>

declare global {
  interface Window {
    umami?: { track: (event: string, data?: EventData) => void }
  }
}

const queue: [string, EventData | undefined][] = []
const settleTimers = new Map<string, ReturnType<typeof setTimeout>>()
let waitingForTracker = false

export function track(event: string, data?: EventData): void {
  if (import.meta.env.DEV) console.debug('[analytics]', event, data ?? '')
  queue.push([event, data])
  flush()
}

/** Sends an event once `key` has been quiet for `delayMs`, so a dragged slider only reports where it stops. */
export function trackSettled(key: string, event: string, data: EventData, delayMs = 1000): void {
  clearTimeout(settleTimers.get(key))
  settleTimers.set(
    key,
    setTimeout(() => {
      settleTimers.delete(key)
      track(event, data)
    }, delayMs),
  )
}

/** Rough size of a search result, so stats group similar searches. */
export function resultBucket(count: number): string {
  if (count === 0) return '0'
  if (count < 100) return '1–99'
  if (count < 1_000) return '100–999'
  if (count < 10_000) return '1k–10k'
  if (count < 100_000) return '10k–100k'
  return '100k+'
}

// The tracker script loads after the app starts, so hold events until it's ready (up to ~10s).
function flush(): void {
  if (typeof window === 'undefined') return
  const umami = window.umami
  if (umami) {
    for (const [event, data] of queue.splice(0)) {
      try {
        umami.track(event, data)
      } catch {
        // Analytics must never break the app.
      }
    }
    return
  }
  if (waitingForTracker) return
  waitingForTracker = true
  let attempts = 0
  const timer = setInterval(() => {
    attempts += 1
    if (!window.umami && attempts < 40) return
    clearInterval(timer)
    waitingForTracker = false
    if (window.umami) flush()
    else queue.length = 0
  }, 250)
}
