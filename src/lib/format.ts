const numberFormat = new Intl.NumberFormat('en-US')

export function formatCount(n: number): string {
  return numberFormat.format(n)
}

export function formatPercent(fraction: number): string {
  const pct = fraction * 100
  if (pct === 0) return '0%'
  if (pct >= 10) return `${pct.toFixed(0)}%`
  if (pct >= 1) return `${pct.toFixed(1)}%`
  if (pct >= 0.01) return `${pct.toFixed(2)}%`
  return '<0.01%'
}
