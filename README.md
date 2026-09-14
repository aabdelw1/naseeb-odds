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

- **Religion and background:** [Pew 2017 full report](https://www.pewresearch.org/wp-content/uploads/sites/7/2017/07/U.S.-MUSLIMS-FULL-REPORT.pdf):
  - Prays all 5 daily: 42% overall, 39% of men, 45% of women, rising from 33% at 18–29 to 53% at 55+.
  - Mosque weekly: 43% overall, 48% of men, 37% of women (Sunni 50%, Shia 17%).
  - Sect: Sunni 55%, Shia 16%, just Muslim 14%.
  - Education by birthplace: 38% of immigrants and 21% of US-born have a college degree or more.
  - Generation: immigrant 58%, 2nd gen 18%, 3rd gen+ 24%. Converts: 23%.

Approximated: the 5-year age bands, the generation mix within each ethnicity, converts by generation, how many young adults have finished degrees, marital status by age (shaped like the general US population), the share of divorced people with kids, and earnings (a log-normal curve per age band). Most filters are treated as independent of each other. The exceptions: height depends on sex and ethnicity; generation depends on ethnicity; prayer and mosque attendance depend on sex and sect (prayer also on age); education and converts depend on generation. Improve these before quoting any result.

Filters: gender, age range, ethnicity (Arab / Black / Desi / White / Other), height range, marital status (never married / divorced, no kids / divorced with kids / widowed / married), and minimum income.

Advanced filters: prays all 5 daily, goes to mosque weekly, sect (Sunni / Shia / Just Muslim / Other), minimum education, born in the US (immigrant / 2nd gen / 3rd gen+), and convert (born Muslim / convert).

## Stack

React 18 + TypeScript + Vite.
