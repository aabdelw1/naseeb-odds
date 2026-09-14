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

export function formatPercent(fraction: number): string {
  const pct = fraction * 100
  if (pct === 0) return '0%'
  if (pct >= 10) return `${pct.toFixed(0)}%`
  if (pct >= 1) return `${pct.toFixed(1)}%`
  if (pct >= 0.01) return `${pct.toFixed(2)}%`
  return '<0.01%'
}
