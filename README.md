# Ummah Odds

A just-for-fun calculator, inspired by the "Female Delusion Calculator": start with every Muslim in the United States, apply filters, and watch the circle of people shrink.

Each icon stands for a number of people (10,000, 1,000, 100, …). As filters narrow the pool, the circle shrinks and the unit steps down.

## Run it

```bash
npm install
npm run dev
```

## Data

The numbers in `src/data/population.ts` are **estimates**, some researched and some approximated.

Researched:
- **Totals:** [Pew Research Center, 2017](https://www.pewresearch.org/religion/2017/07/26/demographic-portrait-of-muslim-americans/): ~3.45M Muslims in the US, ~2.15M adults.
- **Adult sex ratio:** [ISPU American Muslim Poll, 2025](https://ispu.org/poll/american-muslim-poll-2025-full-report-2/): 56% of adults are men.
- **Ethnicity:** Arab 23%, Black 23%, Desi 25%, White (non-Arab: Persian, Turkish, Afghan, Balkan, converts) 17%, Other 12%. No single survey measures Arab Muslims well, so this blends three estimates:
  - ISPU 2025 self-ID (Black 28%, Asian 24%, white 20%, Arab 12%). Its Arab figure is a floor, because many Arabs tick "white".
  - [Pew 2017](https://www.pewresearch.org/religion/2017/07/26/demographic-portrait-of-muslim-americans/) immigrant origins: 25% of immigrant Muslims come from the Middle East–North Africa, which works out to ~19% Arab and ~20% Black.
  - Top-down: [2.7–3.7M Arab Americans](https://en.wikipedia.org/wiki/Arab_Americans), 24–35% of them Muslim, is ~19–38% of US Muslims.
- **Height:** [CDC NHANES 2015–2018](https://www.cdc.gov/nchs/data/series/sr_03/sr03-046-508.pdf) by race, blended with [national averages](https://en.wikipedia.org/wiki/Human_height_by_country) for immigrant-heavy groups (South Asian, Arab).

Approximated: the 5-year age bands, marital status by age (shaped like the general US population), the share of divorced people with kids, and earnings (a log-normal curve per age band). Filters are treated as independent of each other, except height, which depends on sex and ethnicity. Improve these before quoting any result.

Filters: gender, age range, ethnicity (Arab / Black / Desi / White / Other), height range, marital status (never married / divorced, no kids / divorced with kids / widowed / married), and minimum income.

## Stack

React 18 + TypeScript + Vite.
