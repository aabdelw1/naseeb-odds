const numberFormat = new Intl.NumberFormat('en-US')

export function formatCount(n: number): string {
  return numberFormat.format(n)
}

export function formatHeight(inches: number): string {
  return `${Math.floor(inches / 12)}'${inches % 12}"`
}

export function formatHeightRange(min: number, max: number, lowest: number, highest: number): string {
  if (min <= lowest && max >= highest) return 'Any'
  if (min <= lowest) return `Up to ${formatHeight(max)}`
  if (max >= highest) return `${formatHeight(min)}+`
  return `${formatHeight(min)} – ${formatHeight(max)}`
}

export function formatIncome(minIncome: number): string {
  return minIncome === 0 ? 'Any' : `$${minIncome / 1000}k+`
}

const percentFormat = new Intl.NumberFormat('en-US', { maximumSignificantDigits: 3 })

/** A share as a percentage to three significant figures, so tiny shares still show their size. */
export function formatPercent(fraction: number): string {
  return `${percentFormat.format(fraction * 100)}%`
}
