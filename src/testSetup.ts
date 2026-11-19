import 'fake-indexeddb/auto'
import { afterEach } from 'vitest'
import fc from 'fast-check'

fc.configureGlobal({ seed: 261031, numRuns: 200 })
if (typeof document !== 'undefined') {
  await import('@testing-library/jest-dom/vitest')
  const { cleanup } = await import('@testing-library/react')
  afterEach(cleanup)
  // jsdom has no native canvas. Canvas-specific tests supply their own context.
  HTMLCanvasElement.prototype.getContext = () => null
  window.scrollTo = () => {}
}
