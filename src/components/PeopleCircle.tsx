import type { SexFilter } from '../lib/filters'

const VIEW = 1000
const CENTER = VIEW / 2
const MAX_RADIUS = VIEW * 0.42
const MIN_RADIUS_FRACTION = 0.2
/** How hard the circle shrinks as the pool narrows: 10x fewer people ≈ 70% the radius. */
const SHRINK_EXPONENT = 0.15
/** Enough for 5.5M people at 10,000 per icon, so the opening circle stays full at every estimate. */
const MAX_ICONS = 600
const MIN_ICON_SIZE = 24
const ICON_FILL = 0.92
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5))

export interface CircleLayout {
  radius: number
  /** People per icon: 1, 10, 100, ... */
  unit: number
  icons: number
  iconSize: number
}

export function layoutCircle(count: number, total: number): CircleLayout {
  // The radius follows the real count, not the icon count, so the circle keeps
  // shrinking even when the unit steps down and the number of icons jumps back up.
  const fraction = total === 0 ? 0 : count / total
  const radius = MAX_RADIUS * Math.max(MIN_RADIUS_FRACTION, Math.pow(fraction, SHRINK_EXPONENT))

  // Most icons this circle can hold while each stays legible; the unit is the
  // smallest power of ten that fits within that.
  const capacity = Math.max(
    1,
    Math.min(MAX_ICONS, Math.floor(Math.PI * ((radius * ICON_FILL) / MIN_ICON_SIZE) ** 2)),
  )
  let unit = 1
  while (count / unit > capacity) unit *= 10

  const icons = count === 0 ? 0 : Math.max(1, Math.round(count / unit))
  const spacing = radius * Math.sqrt(Math.PI / Math.max(icons, 1))
  const iconSize = Math.min(spacing * ICON_FILL, radius * 1.4)
  return { radius, unit, icons, iconSize }
}

export function PersonIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="-0.5 -0.5 1 1" className={className} aria-hidden="true">
      <use href="#person" x={-0.5} y={-0.5} width={1} height={1} />
    </svg>
  )
}

/** Shared symbol; render once near the root so every <use href="#person"> resolves. */
export function PersonSymbol() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
      <symbol id="person" viewBox="-0.5 -0.5 1 1">
        <circle cx="0" cy="-0.24" r="0.17" fill="currentColor" />
        <path d="M-0.33 0.47 C-0.33 0.08 -0.2 -0.01 0 -0.01 C0.2 -0.01 0.33 0.08 0.33 0.47 Z" fill="currentColor" />
      </symbol>
    </svg>
  )
}

interface Props {
  layout: CircleLayout
  sex: SexFilter
}

export function PeopleCircle({ layout, sex }: Props) {
  const { radius, unit, icons, iconSize } = layout

  return (
    <svg
      viewBox={`0 0 ${VIEW} ${VIEW}`}
      className="people-circle"
      role="img"
      aria-label={`${icons} icons, each representing ${unit} people`}
    >
      <circle
        className="halo"
        r={1}
        style={{ transform: `translate(${CENTER}px, ${CENTER}px) scale(${icons === 0 ? 0 : radius + iconSize * 0.6})` }}
      />
      {Array.from({ length: icons }, (_, i) => {
        // Sunflower (Vogel) spiral: packs any number of points evenly into a disc.
        const rho = radius * Math.sqrt((i + (icons === 1 ? 0 : 0.5)) / icons)
        const theta = i * GOLDEN_ANGLE
        const x = CENTER + rho * Math.cos(theta)
        const y = CENTER + rho * Math.sin(theta)
        const iconSex = sex === 'any' ? (i % 2 === 0 ? 'male' : 'female') : sex
        return (
          <use
            key={i}
            href="#person"
            x={-0.5}
            y={-0.5}
            width={1}
            height={1}
            className={`person person--${iconSex}`}
            style={{ transform: `translate(${x}px, ${y}px) scale(${iconSize})` }}
          />
        )
      })}
    </svg>
  )
}
