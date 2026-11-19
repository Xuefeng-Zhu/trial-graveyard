import '@testing-library/jest-dom/vitest'
import 'fake-indexeddb/auto'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'
import fc from 'fast-check'

fc.configureGlobal({ seed: 261031, numRuns: 200 })
afterEach(cleanup)
