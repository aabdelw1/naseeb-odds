import { useEffect, useState, type RefObject } from 'react'

/** Whether the referenced element is at least partly on screen. */
export function useIsVisible(ref: RefObject<Element>): boolean {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const element = ref.current
    if (!element) return
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting))
    observer.observe(element)
    return () => observer.disconnect()
  }, [ref])

  return visible
}
