import { describe, expect, it, vi } from 'vitest'
import appSource from '../App.tsx?raw'
import { DEFAULT_FILTERS, type Filters } from '../lib/filters'
import { searchUrl, URL_UPDATE_DELAY_MS, writeSearchUrl } from '../lib/urlSync'

const search = (overrides: Partial<Filters> = {}) => ({
  filters: { ...DEFAULT_FILTERS, ...overrides },
  estimate: 'realistic' as const,
})

describe('the address for a search', () => {
  it('stays bare when nothing has been chosen', () => {
    expect(searchUrl(search(), '/', '')).toBe('/')
  })

  it('carries the chosen settings', () => {
    expect(searchUrl(search({ sex: 'female' }), '/', '')).toContain('sex=female')
  })

  it('keeps the debug flag once it is switched on', () => {
    expect(searchUrl(search(), '/', '?debug')).toContain('debug')
  })
})

describe('writing the address', () => {
  // Safari throws a SecurityError after about 100 history writes in 30 seconds. Dragging a
  // slider changes the search on every frame, so both guards below matter: the write waits for
  // the drag to finish, and a refused write is swallowed instead of tearing down the app.
  it('survives a browser that refuses the write', () => {
    const replaceState = vi.fn(() => {
      throw new Error('SecurityError: too many history writes')
    })
    vi.stubGlobal('window', { history: { replaceState } })
    expect(() => writeSearchUrl('/?sex=female')).not.toThrow()
    expect(replaceState).toHaveBeenCalled()
    vi.unstubAllGlobals()
  })

  it('waits long enough to stay under the browser limit', () => {
    // 100 writes per 30 seconds is one every 300ms.
    expect(URL_UPDATE_DELAY_MS).toBeGreaterThanOrEqual(300)
  })

  it('is never called straight from a filter change', () => {
    expect(appSource).not.toMatch(/history\.replaceState/)
    expect(appSource).toMatch(/setTimeout\(\(\) => writeSearchUrl/)
  })
})
