import { US_MUSLIM_POPULATION } from './population'

// How hopeful the count is. The biggest uncertainties are how many Muslims live in the US
// (or the Bay Area) and how far survey rates could be off, so each level moves those within
// plausible ranges. "Realistic" is what the model is calibrated and tested against.

export type EstimateLevel = 'conservative' | 'realistic' | 'generous'

export interface Estimate {
  /** Muslims of all ages in the US. */
  population: number
  /** Muslims of all ages in the nine-county Bay Area. */
  bayAreaPopulation: number
  /** Log-odds added to prayer and mosque rates; 0.25 is about 6 points near 40%. */
  practiceShift: number
  /** Multiplier on median earnings. */
  earningsFactor: number
  description: string
  bayAreaDescription: string
}

/** Least to most hopeful. */
export const ESTIMATE_LEVELS: EstimateLevel[] = ['conservative', 'realistic', 'generous']

export const ESTIMATES: Record<EstimateLevel, Estimate> = {
  conservative: {
    population: 3_450_000,
    // US Religion Census 2020 county counts: Alameda 57,322, Santa Clara 40,626, San Mateo
    // 11,268, Contra Costa 11,218, San Francisco 9,130, Marin 7,112, Solano 1,214, Sonoma
    // 1,024, Napa 165.
    bayAreaPopulation: 139_000,
    practiceShift: -0.25,
    earningsFactor: 0.9,
    description: "Pew's 2017 count of 3.45M, with survey rates at the low end",
    bayAreaDescription: 'US Religion Census 2020 county count of 139k, with survey rates at the low end',
  },
  realistic: {
    population: US_MUSLIM_POPULATION,
    // Between the census count and the Bay Area Muslim Study's estimate.
    bayAreaPopulation: 195_000,
    practiceShift: 0,
    earningsFactor: 1,
    description: 'US Religion Census 2020 count of 4.5M, with survey rates as reported',
    bayAreaDescription: 'About 195k, between the 2020 census count and the Bay Area Muslim Study',
  },
  generous: {
    population: 5_500_000,
    // The Bay Area Muslim Study (2013): 250,000, 3.5% of the area's population.
    bayAreaPopulation: 250_000,
    practiceShift: 0.25,
    earningsFactor: 1.1,
    description: 'A 2026 estimate of 5.5M, with survey rates at the high end',
    bayAreaDescription: "The Bay Area Muslim Study's estimate of 250k, with survey rates at the high end",
  },
}
