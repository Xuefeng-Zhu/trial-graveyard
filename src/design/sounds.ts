/**
 * Sound helper. Muted by default (R8.9) and only ever called from user actions,
 * so sound is never the only signal.
 */
export type SoundName = 'cancel' | 'keep' | 'undo';

const FREQUENCY: Record<SoundName, number> = { cancel: 220, keep: 330, undo: 262 };

let enabled = false;

export function setSoundEnabled(value: boolean): void {
  enabled = value;
}

export function isSoundEnabled(): boolean {
  return enabled;
}

/** Plays a short tone. Does nothing while muted or when Web Audio is unavailable. */
export function playSound(name: SoundName): void {
  if (!enabled) return;
  const Ctor = (globalThis as { AudioContext?: typeof AudioContext }).AudioContext;
  if (!Ctor) return;
  try {
    const ctx = new Ctor();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = FREQUENCY[name];
    gain.gain.value = 0.05;
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
    osc.onended = () => void ctx.close();
  } catch {
    // Sound is optional; ignore failures.
  }
}
