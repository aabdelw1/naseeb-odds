import { toSearchParams, type SearchState } from './urlState'

/**
 * How long the search has to sit still before the address is rewritten.
 *
 * Safari refuses more than about 100 history writes in 30 seconds and throws a SecurityError on
 * the next one, which used to take the whole app down mid-drag. Dragging a slider changes the
 * search on every frame, so a drag has to end in one write instead of hundreds. Anything above
 * 300ms keeps even continuous dragging under Safari's ceiling.
 */
export const URL_UPDATE_DELAY_MS = 400

/**
 * The address for a search, keeping the debug flag when it is already switched on and whatever
 * hash is on the address, so writing the search doesn't close the Learn more page.
 */
export function searchUrl(search: SearchState, pathname: string, currentSearch: string, hash = ''): string {
  const params = toSearchParams(search)
  if (new URLSearchParams(currentSearch).has('debug')) params.set('debug', '')
  const query = params.toString()
  return `${query ? `${pathname}?${query}` : pathname}${hash}`
}

/** Rewrites the address, never throwing: losing a shareable link beats losing the page. */
export function writeSearchUrl(url: string): void {
  try {
    window.history.replaceState(null, '', url)
  } catch {
    // Browsers rate-limit history writes. Skipping one only costs a shareable address.
  }
}
