# Naseeb Odds

A just-for-fun calculator, inspired by the "Female Delusion Calculator": start with every Muslim in the United States, apply filters, and watch the circle of people shrink.

Each icon stands for a number of people (10,000, 1,000, 100, …). As filters narrow the pool, the circle shrinks and the unit steps down.

## Run it

```bash
npm install
npm run dev
```

## Data

The numbers are **estimates**, some researched and some approximated.

**How the numbers combine.** [`src/lib/model.ts`](src/lib/model.ts) builds a synthetic population of US Muslims out of ~37,000 cells, one per combination of age band, sex, ethnicity, generation, education, marital status and sect. Each cell also carries its odds of praying all five, going to mosque weekly, wearing hijab and being a convert, plus an earnings curve. The cell sizes and odds are then calibrated ("raked") until the whole population reproduces every published figure below at once. The filters add up the matching cells, so traits that go together in real life go together in the app. For example, $250k+ earners are mostly degree holders, immigrants are more often married, and converts are mostly US-born.

Researched:
- **Total:** ~4.5M Muslims of all ages, per the [US Religion Census 2020](https://www.usreligioncensus.org/node/1641). This is consistent with [Pew's 2023–24 finding](https://www.pewresearch.org/religious-landscape-study/religious-tradition/muslim/) that about 1% of US adults are Muslim. The age mix follows [Pew 2017](https://www.pewresearch.org/religion/2017/07/26/demographic-portrait-of-muslim-americans/).
- **Adult sex ratio:** [ISPU American Muslim Poll, 2025](https://ispu.org/poll/american-muslim-poll-2025-full-report-2/): 56% of adults are men.
- **Ethnicity:** Arab 23%, Black 23%, Desi 25%, White (non-Arab: Persian, Turkish, Afghan, Balkan, converts) 17%, Other 12%. No single survey measures Arab Muslims well, so this blends three estimates:
  - ISPU 2025 self-ID (Black 28%, Asian 24%, white 20%, Arab 12%). Its Arab figure is a floor, because many Arabs tick "white".
  - [Pew 2017](https://www.pewresearch.org/religion/2017/07/26/demographic-portrait-of-muslim-americans/) immigrant origins: 25% of immigrant Muslims come from the Middle East–North Africa, which works out to ~19% Arab and ~20% Black.
  - Top-down: [2.7–3.7M Arab Americans](https://en.wikipedia.org/wiki/Arab_Americans), 24–35% of them Muslim, is ~19–38% of US Muslims.
- **Height:** US-born Muslims use [CDC NHANES 2015–2018](https://www.cdc.gov/nchs/data/series/sr_03/sr03-046-508.pdf) averages for their race, since children of immigrants grow taller than their parents. Immigrants use [home-country averages](https://en.wikipedia.org/wiki/Human_height_by_country).
- **Education gaps between groups:** [ISPU 2025](https://ispu.org/poll/american-muslim-poll-2025-full-report-2/) found 35% of Black, 14% of White and 10% of Asian Muslims have a high school diploma or less.

- **Religion and background:** [Pew 2017 full report](https://www.pewresearch.org/wp-content/uploads/sites/7/2017/07/U.S.-MUSLIMS-FULL-REPORT.pdf):
  - Prays all 5 daily: 42% overall, 39% of men, 45% of women, rising from 33% at 18–29 to 53% at 55+.
  - Mosque weekly: 43% overall, 48% of men, 37% of women (Sunni 50%, Shia 17%).
  - Sect: Sunni 55%, Shia 16%, just Muslim 14%.
  - Education by birthplace: 38% of immigrants and 21% of US-born have a college degree or more. The model scales these up to [Pew's 2023–24 figures](https://www.pewresearch.org/short-reads/2025/06/18/how-us-muslims-compare-with-other-americans-religiously-and-demographically/) (44% college graduates, 26% postgraduate), keeping the gap between immigrants and US-born.
  - Degrees by age and sex follow the general US pattern ([Census CPS 2024](https://www.census.gov/data/tables/2024/demo/educational-attainment/cps-detailed-tables.html), [NCES](https://nces.ed.gov/programs/digest/d23/tables/dt23_104.20.asp)). For example, ages 25–29: women 45.5%, men 34.9%.
  - Generation: immigrant 58%, 2nd gen 18%, 3rd gen+ 24%. Converts: 23%.
  - By birthplace: immigrants are older and 70% married, while US-born adults are 45% under 30 and 29% married.
  - Prayer and mosque rates by sex, age, degree, birthplace, marriage, sect and origin.
  - Hijab: 38% of Muslim women always wear a headcover in public and 5% most of the time, so the filter counts 43%. The only split Pew gives is by education: 44% of women without a degree always cover against 24% of graduates. Muslim women hold degrees far more often now than in 2017, so those two rates no longer average to Pew's own overall rate; the model keeps the gap between them and moves both until they do.
- **Earnings:**
  - Earnings by education: [BLS usual weekly earnings by education](https://www.bls.gov/charts/usual-weekly-earnings/usual-weekly-earnings-by-quartiles-and-selected-deciles-by-education.htm) (medians and spread). The income filter is personal earnings.
  - Employment: 60% of Muslim adults work (Pew). Degree holders are more likely to work, following [BLS employment rates by education](https://www.bls.gov/news.release/empsit.t04.htm).
  - US-born earnings by background: [Pew's second-generation Americans](https://www.pewresearch.org/social-trends/2013/02/07/chapter-2-demographic-portrait-of-adult-children-of-immigrants/) household incomes.
  - Relative standing by ethnicity: [ISPU 2025](https://ispu.org/poll/american-muslim-poll-2025-full-report-2/) household incomes of $100k+ (White 44%, Asian 34%, Arab 19%, Black 7%).

Approximated:
- the starting shape of marital status by age (general US pattern), later calibrated to Pew
- the share of divorced people with kids
- generation and sect mix within each ethnicity
- converts by generation and ethnicity
- how many young adults have finished degrees
- earnings by age and for women
- how strongly religious practices overlap
- who wears hijab beyond Pew's two published rates (`HIJAB_TILTS`): more likely with prayer and mosque attendance, among immigrants, among Sunni women, with age, and among converts. The tilts decide who covers; the published rates still decide how many. The generation fade applies to women born into Islam, so the overall third-generation rate is higher rather than lower, since most third-generation Muslim women are Black American converts and their daughters.

Height depends on sex, ethnicity and birthplace. Improve these before quoting any result.

## Estimate

The Conservative / Realistic / Generous switch under the count sets how hopeful the count is. It moves the biggest uncertainties within plausible ranges:

| | Conservative | Realistic (default) | Generous |
| --- | --- | --- | --- |
| US Muslims | 3.45M (Pew 2017) | 4.5M (US Religion Census 2020) | 5.5M (a 2026 estimate) |
| Bay Area Muslims | 139k (US Religion Census 2020, nine counties) | 195k (in between) | 250k (Bay Area Muslim Study, 2013) |
| Prayer and mosque rates | ~6 points lower | as reported | ~6 points higher |
| Earnings | 10% lower | as reported | 10% higher |

The model is calibrated and tested at Realistic.

## Bay Area

The Bay Area option is hidden in the app for now (`SHOW_REGION_FILTER` in [`FilterPanel.tsx`](src/components/FilterPanel.tsx)). The model and tests still cover it.

Choosing **Bay Area** switches to a second set of population cells. They are re-weighted to [The Bay Area Muslim Study](https://ispu.org/research-areas/the-bay-area-muslim-study/) (ISPU / One Nation Bay Area, 2013, 1,100+ respondents), keeping the national age and sex mix:
- **Ethnicity:** South Asian 30%, Arab 23%, Afghan/White/Iranian 25%, African American 9%, other 13%.
- **Background:** 64% immigrants; married 59%, never married 33%; Sunni 75%, just Muslim 14%.
- **Education:** 60% have a bachelor's or higher (vs 31% of Muslims nationally), with the study's gaps between groups.
- **Earnings:** 1.3× the national level for the same education, age and sex. [BLS](https://www.bls.gov/regions/west/news-release/occupationalemploymentandwages_sanjose.htm) mean wages run 44–71% above the national average, part of which the Bay Area's education mix already explains. Income gaps by ethnicity follow the study's $100k+ households (South Asian 49% down to African American and Afghan 10%).

How many Bay Area Muslims there are is uncertain. [US Religion Census 2020](https://www.thearda.com/us-religion/census/congregational-membership?y=2020&t=0&c=06001) county counts add up to about 139k (Alameda 57k, Santa Clara 41k, San Mateo 11k, Contra Costa 11k, San Francisco 9k, Marin 7k, others 2k), while the Bay Area Muslim Study estimated 250k. The estimate switch covers that range.

The Bay Area is not modeled separately for heights, prayer or conversion; those follow the national cells. White Muslims there are mostly Afghan, so they earn less than White (mostly Iranian) Muslims nationally.

Filters, in three tabs. Chip groups start on **Any**; tapping chips narrows to just those, and removing them all goes back to Any.
- **Basics:** gender, age range, ethnicity (Arab / Black / Desi / White / Other), and born in the US (immigrant / 2nd gen / 3rd gen+).
- **Life:** marital status (never married / divorced, no kids / divorced with kids / widowed / married), height range, minimum education, and minimum income.
- **Deen:** prays all 5 daily, goes to mosque weekly, wears hijab (narrows the sisters and leaves the brothers alone; greyed out only when the search is for brothers), sect (Sunni / Shia / Just Muslim / Other), and convert (born Muslim / convert).

## Tests

```bash
npm test
```

- [`invariants.test.ts`](src/test/invariants.test.ts) checks the basic rules:
  - Counts are whole, never negative, and never above the total.
  - Adding a filter never raises the count.
  - A filter's options add up to the whole.
  - Raising minimum income or education only shrinks the pool.

  It covers every pair of filter values and 300 random combinations of all filters.
- [`calibration.test.ts`](src/test/calibration.test.ts) checks that the model reproduces each published figure it is built from.
- [`plausibility.test.ts`](src/test/plausibility.test.ts) checks relationships that must hold for combinations to make sense. For example, each step up in education raises every income tier, and immigrants are more often married at every age.

```bash
npm run report
```

Prints cross-tabs (earnings by degree, marriage by age and birthplace, converts by ethnicity and generation, and more) and shows how much linked traits differ from simply multiplying their shares.

```bash
npx vite-node scripts/funnel.ts
```

Breaks one search down step by step. For each filter it shows the share of people it keeps and what the final count would be without it, at every estimate level. Edit the steps at the top of the script to try your own search.

## Debugging

When running locally, or on the deployed site with `?debug` in the URL, the footer shows a **Copy debug info** button. It copies the current search as JSON (and logs it to the console):
- the estimate level, count and total
- only the filters that differ from the defaults
- a step-by-step breakdown: the count after each filter, the share it kept, and the final count without it

Spreading `changed` over `DEFAULT_FILTERS` reproduces the count.

## SEO and sharing

- **Tags:** `index.html` has the title, meta description, canonical URL, Open Graph and Twitter preview tags, a web app manifest, and JSON-LD structured data (`WebApplication` and `FAQPage`).
- **Readable content:** a plain-HTML "What is Naseeb Odds?" section with an FAQ sits below the app, so search engines can read it without running JavaScript. [`src/test/seo.test.ts`](src/test/seo.test.ts) keeps the FAQ structured data in sync with it.
- **Crawlers:** `public/robots.txt` and `public/sitemap.xml` point them at https://naseebodds.com/.
- **Shareable searches:** the page address holds the search (e.g. `?sex=female&age=23-28&prays=1`), and the gold **Share my odds** button (also in the phone count bar) sends that link, so every share opens the same search. The address is rewritten only once the search has been still for `URL_UPDATE_DELAY_MS`: Safari refuses more than about 100 history writes in 30 seconds, and a dragged slider changes the search on every frame.
- **Search guides:** plain HTML pages in `public/` that answer the questions people actually search for, each with its own title, description, canonical, FAQ structured data and links back to the calculator: `/muslims-in-america/`, `/single-muslims/` and `/divorce-and-remarriage/`. They are served as-is by GitHub Pages, share `public/article.css`, and are checked by [`src/test/articles.test.ts`](src/test/articles.test.ts). Add a page by dropping a folder in `public/` and listing it in `public/sitemap.xml`; the test fails until both are done.
- **Search log:** an anonymous record of settled searches, kept in Cloudflare D1 by a small Worker, for seeing what brothers and sisters actually search for. What it stores, what it never stores, and how to query it: [`worker/README.md`](worker/README.md).
- **Learn more page:** the about and FAQ text stays as plain HTML in `index.html`, where crawlers read it without running the app, and [`src/lib/aboutPage.ts`](src/lib/aboutPage.ts) turns it into a second view at `#about` with a back button. It is only hidden once the app has started, so with no JavaScript the text still renders under the calculator.
- **Icons and preview card:** generated with `swift scripts/generate-icons.swift public`, then `node scripts/make-favicon-ico.mjs public/favicon-48.png public/favicon.ico` for the `.ico`. Google Search only shows a favicon that is square and a multiple of 48px, and also looks for `/favicon.ico`, so both ship.

To get indexed:
1. Add the site to [Google Search Console](https://search.google.com/search-console), verifying with a DNS TXT record at the registrar.
2. Submit `https://naseebodds.com/sitemap.xml`.
3. Do the same in [Bing Webmaster Tools](https://www.bing.com/webmasters).

## Analytics

Anonymous usage stats go to [Umami Cloud](https://cloud.umami.is) (cookie-free, so no consent banner). The script in `index.html` only counts `naseebodds.com`, so local development isn't tracked, and it leaves the search out of page-view URLs.

- **Page views:** automatic, with visitor counts, countries, devices and referrers.
- **Events** (sent through [`src/lib/analytics.ts`](src/lib/analytics.ts)):

| Event | Data | When |
| --- | --- | --- |
| `filter` | `setting`, `value` (as in the link, or `default`) | A filter or the estimate changes; sliders report once they settle |
| `search` | `result` (size range, e.g. `100–999`), `filters` (how many are on) | Two seconds after the search stops changing |
| `tab` | `tab` | A filter tab is opened |
| `reset` | none | Reset filters is clicked |
| `share` | `method` (`share sheet` or `copied link`), `placement` (`results` or `count bar`) | A search is shared |
| `shared-link-open` | `settings` (how many are in the link) | Someone opens a shared search link |

When running locally, events are logged to the console instead.

## Deploy

The site deploys to GitHub Pages at https://naseebodds.com via [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml). Every push to `main`:
1. installs dependencies
2. runs the tests
3. builds the site (served from the domain root, so `vite.config.ts` sets no base path)
4. publishes `dist`

One-time setup:
- In the repo, go to **Settings → Pages → Build and deployment** and set **Source** to **GitHub Actions**.
- Under **Custom domain**, enter `naseebodds.com`. A custom Actions workflow doesn't need a `CNAME` file.
- At the domain registrar (Squarespace), remove the default website records and add these:

| Type | Name | Data |
| --- | --- | --- |
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |
| AAAA | @ | 2606:50c0:8000::153 |
| AAAA | @ | 2606:50c0:8001::153 |
| AAAA | @ | 2606:50c0:8002::153 |
| AAAA | @ | 2606:50c0:8003::153 |
| CNAME | www | aabdelw1.github.io |

- Once GitHub's DNS check passes and the certificate is issued, tick **Enforce HTTPS**.

The social preview tags in `index.html` use absolute `https://naseebodds.com/` URLs; update them if the domain changes.

## Stack

React 18 + TypeScript + Vite.
