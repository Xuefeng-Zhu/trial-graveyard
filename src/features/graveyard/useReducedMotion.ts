import { useMediaQuery } from '../../design/useMediaQuery'

export function useReducedMotion() {
  return useMediaQuery('(prefers-reduced-motion: reduce)')
}
