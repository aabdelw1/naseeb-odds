import { describe, expect, it } from 'vitest'
import html from '../../index.html?raw'
import aboutPageSource from '../lib/aboutPage.ts?raw'
import manifest from '../../public/site.webmanifest?raw'
import robots from '../../public/robots.txt?raw'
import sitemap from '../../public/sitemap.xml?raw'

const SITE = 'https://naseebodds.com/'

const first = (pattern: RegExp) => html.match(pattern)?.[1]
const collapse = (s: string) => s.replace(/\s+/g, ' ').trim()

interface StructuredData {
  '@graph': { '@type': string; url?: string; mainEntity?: { name: string; acceptedAnswer: { text: string } }[] }[]
}

describe('SEO', () => {
  it('has a descriptive title and a search-snippet-length description', () => {
    const title = first(/<title>([^<]+)<\/title>/) ?? ''
    expect(title).toContain('Naseeb Odds')
    expect(title.length).toBeLessThanOrEqual(60)
    const description = first(/<meta name="description" content="([^"]+)"/) ?? ''
    expect(description.length).toBeGreaterThanOrEqual(70)
    expect(description.length).toBeLessThanOrEqual(160)
  })

  it('points the canonical URL and link previews at the live domain', () => {
    expect(first(/<link rel="canonical" href="([^"]+)"/)).toBe(SITE)
    expect(first(/property="og:url" content="([^"]+)"/)).toBe(SITE)
    expect(first(/property="og:image" content="([^"]+)"/)).toBe(`${SITE}og-image.png`)
  })

  it('has valid structured data whose FAQ matches the questions shown on the page', () => {
    const data = JSON.parse(first(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/) ?? '{}') as StructuredData
    expect(data['@graph'].find((node) => node['@type'] === 'WebApplication')?.url).toBe(SITE)
    const questions = data['@graph'].find((node) => node['@type'] === 'FAQPage')?.mainEntity ?? []
    expect(questions.length).toBeGreaterThan(0)
    const body = collapse(html.slice(html.indexOf('<body>')))
    for (const question of questions) {
      expect(body).toContain(`<h3>${question.name}</h3>`)
      expect(body).toContain(`<p>${question.acceptedAnswer.text}</p>`)
    }
  })

  it('lets crawlers find the sitemap', () => {
    expect(robots).toContain(`Sitemap: ${SITE}sitemap.xml`)
    expect(sitemap).toContain(`<loc>${SITE}</loc>`)
  })

  it('keeps the about and FAQ text in the page, with Learn more only changing how it is shown', () => {
    // Moving it out of index.html, or hiding it before the app starts, would take the only
    // text a crawler can read away from the home page.
    expect(html).toMatch(/<section id="about"/)
    expect(html).toContain('id="about-back"')
    // A reader without JavaScript has no way to open Learn more, so the text shows in place.
    expect(html).toMatch(/<noscript>[\s\S]*?#about \{[\s\S]*?display: block;[\s\S]*?<\/noscript>/)
    // Hiding belongs to the stylesheet, which loads in the head. Hiding it from the app instead
    // shows the FAQ for a moment on every load, before the bundle runs.
    expect(aboutPageSource).not.toMatch(/classList\.add\(.(has-about-page)/)
  })

  it('offers a favicon Google Search will show', () => {
    // Google only shows a favicon that is square and a multiple of 48px, and also looks for
    // /favicon.ico. A 32x32 icon alone leaves the generic globe in search results.
    const shipped = Object.keys(import.meta.glob('../../public/*')).map((path) => path.split('/').pop())
    const icons = [...html.matchAll(/<link rel="icon"[^>]*href="[^"]*?([\w.-]+)"/g)].map((match) => match[1])
    expect(icons).toContain('favicon.ico')
    expect(icons.some((icon) => /-(48|96|192)\.png$/.test(icon))).toBe(true)
    for (const icon of icons) expect(shipped).toContain(icon)
  })

  it('has a web app manifest with large icons', () => {
    const parsed = JSON.parse(manifest) as { name: string; icons: { sizes: string }[] }
    expect(parsed.name).toBe('Naseeb Odds')
    expect(parsed.icons.map((icon) => icon.sizes)).toEqual(expect.arrayContaining(['192x192', '512x512']))
  })
})
