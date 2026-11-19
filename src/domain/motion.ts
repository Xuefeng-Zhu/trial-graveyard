import type { Stage } from './stage'

export function motionFor(stage: Stage) {
  return { sparks: stage === 'churning', hand: stage === 'zombie' || stage === 'overdue' }
}
