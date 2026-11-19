import { useSyncExternalStore } from 'react'

const query = '(prefers-reduced-motion: reduce)'
const media = () => typeof matchMedia === 'function' ? matchMedia(query) : undefined

function subscribe(onChange: () => void) {
  const setting = media()
  setting?.addEventListener?.('change', onChange)
  return () => setting?.removeEventListener?.('change', onChange)
}

export function useReducedMotion() {
  return useSyncExternalStore(subscribe, () => media()?.matches ?? false, () => false)
}
