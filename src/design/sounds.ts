type Sound = 'creak' | 'thunder'
let enabled = false

export function setSoundEnabled(value: boolean) {
  enabled = value
}

export function playSound(sound: Sound) {
  if (!enabled || typeof AudioContext === 'undefined') return
  let audio: AudioContext | undefined
  try {
    audio = new AudioContext()
    const start = audio.currentTime
    const duration = sound === 'creak' ? .6 : 1
    const gain = audio.createGain()
    gain.gain.setValueAtTime(.001, start)
    gain.gain.exponentialRampToValueAtTime(.13, start + .035)
    gain.gain.exponentialRampToValueAtTime(.001, start + duration)
    gain.connect(audio.destination)
    const filter = audio.createBiquadFilter()
    filter.type = sound === 'creak' ? 'bandpass' : 'lowpass'
    filter.frequency.setValueAtTime(sound === 'creak' ? 170 : 230, start)
    filter.frequency.exponentialRampToValueAtTime(sound === 'creak' ? 370 : 40, start + duration)
    filter.connect(gain)
    const source = sound === 'creak' ? audio.createOscillator() : audio.createBufferSource()
    if ('frequency' in source) {
      source.type = 'sawtooth'
      source.frequency.setValueAtTime(90, start)
      source.frequency.exponentialRampToValueAtTime(140, start + duration)
    } else {
      const buffer = audio.createBuffer(1, audio.sampleRate, audio.sampleRate)
      const samples = buffer.getChannelData(0)
      for (let index = 0; index < samples.length; index++) samples[index] = Math.random() * 2 - 1
      source.buffer = buffer
    }
    source.connect(filter)
    const context = audio
    source.onended = () => { void context.close().catch(() => {}) }
    source.start()
    source.stop(start + duration)
  } catch {
    void audio?.close().catch(() => {})
  }
}
