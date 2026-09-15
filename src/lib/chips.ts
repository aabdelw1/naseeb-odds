/**
 * Picking in a chip group where everything selected means "Any". From Any, tapping a chip
 * narrows to just that chip; tapping others adds them, and tapping a picked chip removes it.
 * Ending up with nothing or everything picked goes back to Any. Results keep `all`'s order.
 */
export function pickChip<T>(selected: readonly T[], all: readonly T[], value: T): T[] {
  const isAny = all.every((option) => selected.includes(option))
  const picked = isAny ? [] : selected
  const next = picked.includes(value) ? picked.filter((option) => option !== value) : [...picked, value]
  return next.length === 0 || next.length === all.length ? [...all] : all.filter((option) => next.includes(option))
}
