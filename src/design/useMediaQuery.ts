import { useCallback, useSyncExternalStore } from 'react'

export function useMediaQuery(query: string) {
  const subscribe = useCallback((update: () => void) => {
    const media = typeof matchMedia === 'function' ? matchMedia(query) : undefined
    media?.addEventListener?.('change', update)
    return () => media?.removeEventListener?.('change', update)
  }, [query])
  return useSyncExternalStore(subscribe, () => typeof matchMedia === 'function' && matchMedia(query).matches, () => false)
}
