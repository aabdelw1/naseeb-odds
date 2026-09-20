import { describe, expect, it } from 'vitest'
import sitemap from '../../public/sitemap.xml?raw'

// The plain-HTML guides in public/. They are the pages that can rank for questions the
// calculator itself can't, so each one has to carry its own search tags and stay linked up.

const pages = import.meta.glob('../../public/*/index.html', { query: '?raw', import: 'default', eager: true }) as Record<
  string,
  string
>

const SITE = 'https://naseebodds.com'
const slugOf = (path: string) => path.split('/').slice(-2)[0]
const first = (html: string, pattern: RegExp) => html.match(pattern)?.[1]
const collapse = (s: string) => s.replace(/\s+/g, ' ').trim()

interface Graph {
  '@graph': { '@type': string; mainEntityOfPage?: string; mainEntity?: { name: string; acceptedAnswer: { text: string } }[] }[]
}

describe('the guides', () => {
  it('ships the ones the sitemap promises', () => {
    expect(Object.keys(pages).map(slugOf).sort()).toEqual([
      'divorce-and-remarriage',
      'muslims-in-america',
      'single-muslims',
    ])
  })

  for (const [path, html] of Object.entries(pages)) {
    const slug = slugOf(path)
    const url = `${SITE}/${slug}/`

    describe(slug, () => {
      it('has a title and description sized for a search result', () => {
        const title = first(html, /<title>([^<]+)<\/title>/) ?? ''
        expect(title).toContain('Naseeb Odds')
        expect(title.length).toBeLessThanOrEqual(65)
        const description = collapse(first(html, /<meta\s+name="description"\s+content="([^"]+)"/s) ?? '')
        expect(description.length).toBeGreaterThanOrEqual(70)
        expect(description.length).toBeLessThanOrEqual(170)
      })

      it('points at its own address, and the sitemap lists it', () => {
        expect(first(html, /<link rel="canonical" href="([^"]+)"/)).toBe(url)
        expect(first(html, /property="og:url" content="([^"]+)"/)).toBe(url)
        expect(sitemap).toContain(`<loc>${url}</loc>`)
      })

      it('has structured data whose questions are answered on the page', () => {
        const data = JSON.parse(first(html, /<script type="application\/ld\+json">([\s\S]*?)<\/script>/) ?? '{}') as Graph
        expect(data['@graph'].find((node) => node['@type'] === 'Article')?.mainEntityOfPage).toBe(url)
        const questions = data['@graph'].find((node) => node['@type'] === 'FAQPage')?.mainEntity ?? []
        expect(questions.length).toBeGreaterThanOrEqual(3)
        const body = collapse(html.slice(html.indexOf('<body>')))
        for (const question of questions) {
          // The answer has to be readable on the page, not only in the structured data.
          // Article paragraphs wrap across lines, so match the text rather than the whole tag.
          expect(body).toContain(`<h3>${question.name}</h3>`)
          expect(body).toContain(question.acceptedAnswer.text)
        }
      })

      it('leads back to the calculator and across to the other guides', () => {
        expect(html).toContain('href="/article.css"')
        expect(html).toMatch(/<h1>/)
        expect(html).toContain('href="/"')
        const others = Object.keys(pages).map(slugOf).filter((other) => other !== slug)
        for (const other of others) expect(html).toContain(`href="/${other}/"`)
      })
    })
  }
})
