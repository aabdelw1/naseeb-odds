# Ummah Odds

A just-for-fun calculator, inspired by the "Female Delusion Calculator": start with every Muslim in the United States, apply filters, and watch the circle of people shrink.

Each icon stands for a number of people (10,000, 1,000, 100, …). As filters narrow the pool, the circle shrinks and the unit steps down.

## Run it

```bash
npm install
npm run dev
```

## Data

The numbers in `src/data/population.ts` are **rough placeholders**. Totals follow Pew Research Center's 2017 estimate (~3.45M total, ~2.15M adults). The 5-year age bands and the 50/50 sex split are interpolated, so improve them before quoting any result.

## Stack

React 18 + TypeScript + Vite.
