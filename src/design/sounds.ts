let enabled = false

export function setSoundEnabled(value: boolean) {
  enabled = value
}

export function playSound(_sound: 'creak' | 'thunder') {
  if (!enabled || typeof AudioContext === 'undefined') return
}
