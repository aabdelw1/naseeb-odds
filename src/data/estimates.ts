import { US_MUSLIM_POPULATION } from './population'

// How hopeful the count is. The biggest uncertainties are how many Muslims live in the US
// and how far survey rates could be off, so each level moves those within plausible
// ranges. "Realistic" is what the model is calibrated and tested against.

export type EstimateLevel = 'conservative' | 'realistic' | 'generous'

export interface Estimate {
  /** Muslims of all ages. */
  population: number
  /** Log-odds added to prayer and mosque rates; 0.25 is about 6 points near 40%. */
  practiceShift: number
  /** Multiplier on median earnings. */
  earningsFactor: number
  description: string
}

/** Least to most hopeful. */
export const ESTIMATE_LEVELS: EstimateLevel[] = ['conservative', 'realistic', 'generous']

export const ESTIMATES: Record<EstimateLevel, Estimate> = {
  conservative: {
    population: 3_450_000,
    practiceShift: -0.25,
    earningsFactor: 0.9,
    description: "Pew's 2017 count of 3.45M, with survey rates at the low end",
  },
  realistic: {
    population: US_MUSLIM_POPULATION,
    practiceShift: 0,
    earningsFactor: 1,
    description: 'US Religion Census 2020 count of 4.5M, with survey rates as reported',
  },
  generous: {
    population: 5_500_000,
    practiceShift: 0.25,
    earningsFactor: 1.1,
    description: 'A 2026 estimate of 5.5M, with survey rates at the high end',
  },
}
