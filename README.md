# Ummah Odds

A just-for-fun calculator, inspired by the "Female Delusion Calculator": start with every Muslim in the United States, apply filters, and watch the circle of people shrink.

Each icon stands for a number of people (10,000, 1,000, 100, …). As filters narrow the pool, the circle shrinks and the unit steps down.

## Run it

```bash
npm install
npm run dev
```

## Data

The numbers are **estimates**, some researched and some approximated.

**How the numbers combine.** [`src/lib/model.ts`](src/lib/model.ts) builds a synthetic population of US Muslims out of ~37,000 cells, one per combination of age band, sex, ethnicity, generation, education, marital status and sect. Each cell also carries its odds of praying all five, going to mosque weekly and being a convert, plus an earnings curve. The cell sizes and odds are then calibrated ("raked") until the whole population reproduces every published figure below at once. The filters add up the matching cells, so traits that go together in real life go together in the app. For example, $250k+ earners are mostly degree holders, immigrants are more often married, and converts are mostly US-born.

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
  - Education by birthplace: 38% of immigrants and 21% of US-born have a college degree or more.
  - Generation: immigrant 58%, 2nd gen 18%, 3rd gen+ 24%. Converts: 23%.
  - By birthplace: immigrants are older and 70% married, while US-born adults are 45% under 30 and 29% married.
  - Prayer and mosque rates by sex, age, degree, birthplace, marriage, sect and origin.
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
- how strongly praying all five and weekly mosque attendance overlap

Height depends on sex, ethnicity and birthplace. Improve these before quoting any result.

## Estimate

The Conservative / Realistic / Generous switch under the count sets how hopeful the count is. It moves the biggest uncertainties within plausible ranges:

| | Conservative | Realistic (default) | Generous |
| --- | --- | --- | --- |
| US Muslims | 3.45M (Pew 2017) | 4.5M (US Religion Census 2020) | 5.5M (a 2026 estimate) |
| Prayer and mosque rates | ~6 points lower | as reported | ~6 points higher |
| Earnings | 10% lower | as reported | 10% higher |

The model is calibrated and tested at Realistic.

Filters, in three tabs:
- **Basics:** gender, age range, ethnicity (Arab / Black / Desi / White / Other), and born in the US (immigrant / 2nd gen / 3rd gen+).
- **Life:** marital status (never married / divorced, no kids / divorced with kids / widowed / married), height range, minimum education, and minimum income.
- **Deen:** prays all 5 daily, goes to mosque weekly, sect (Sunni / Shia / Just Muslim / Other), and convert (born Muslim / convert).

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

## Stack

React 18 + TypeScript + Vite.
