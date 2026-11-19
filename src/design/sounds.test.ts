import { afterEach, expect, it, vi } from 'vitest'
import { playSound, setSoundEnabled } from './sounds'

afterEach(() => { setSoundEnabled(false); vi.unstubAllGlobals() })

it('starts muted and never creates an audio context', () => {
  const create = vi.fn()
  vi.stubGlobal('AudioContext', create)
  playSound('creak')
  expect(create).not.toHaveBeenCalled()
})
it('handles browsers without audio support and blocked audio contexts', () => {
  setSoundEnabled(true)
  vi.stubGlobal('AudioContext', undefined)
  expect(() => playSound('thunder')).not.toThrow()
  const unsupported = vi.fn(function () { throw new Error('Audio blocked') })
  vi.stubGlobal('AudioContext', unsupported)
  expect(() => playSound('thunder')).not.toThrow()
  expect(unsupported).toHaveBeenCalledOnce()
})
