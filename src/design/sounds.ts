/**
 * Sound helper. Muted by default (R8.9, H3.1) and only ever called from user actions,
 * so sound is never the only signal. Everything is synthesised with Web Audio; there are no audio files.
 */
export type SoundName = 'cancel' | 'keep' | 'undo' | 'creak' | 'thunder';

const FREQUENCY = { cancel: 220, keep: 330, undo: 262 } as const;

/** Master gain ceiling for the synthesised effects (H3). */
export const MAX_GAIN = 0.15;

let enabled = false;

export function setSoundEnabled(value: boolean): void {
  enabled = value;
}

export function isSoundEnabled(): boolean {
  return enabled;
}

/** Slow sawtooth glide 90 -> 140 Hz through a bandpass filter, 0.6 s. */
function creak(ctx: AudioContext): number {
  const osc = ctx.createOscillator();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  const t = ctx.currentTime;
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(90, t);
  osc.frequency.linearRampToValueAtTime(140, t + 0.6);
  filter.type = 'bandpass';
  filter.frequency.value = 400;
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(MAX_GAIN, t + 0.1);
  gain.gain.linearRampToValueAtTime(0, t + 0.6);
  osc.connect(filter).connect(gain).connect(ctx.destination);
  osc.start();
  osc.stop(t + 0.6);
  osc.onended = () => void ctx.close();
  return 0.6;
}

/** Noise burst through a falling low-pass filter, fast attack, 1 s decay. */
function thunder(ctx: AudioContext): number {
  const length = Math.floor(ctx.sampleRate * 1);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  const t = ctx.currentTime;
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(1200, t);
  filter.frequency.exponentialRampToValueAtTime(80, t + 1);
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(MAX_GAIN, t + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 1);
  src.connect(filter).connect(gain).connect(ctx.destination);
  src.start();
  src.onended = () => void ctx.close();
  return 1;
}

function tone(ctx: AudioContext, hz: number): number {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.value = hz;
  gain.gain.value = 0.05;
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.25);
  osc.onended = () => void ctx.close();
  return 0.25;
}

/** Plays a short effect. Does nothing while muted or when Web Audio is unavailable. */
export function playSound(name: SoundName): void {
  if (!enabled) return;
  const Ctor = (globalThis as { AudioContext?: typeof AudioContext }).AudioContext;
  if (!Ctor) return;
  try {
    const ctx = new Ctor();
    if (name === 'creak') creak(ctx);
    else if (name === 'thunder') thunder(ctx);
    else tone(ctx, FREQUENCY[name]);
  } catch {
    // Sound is optional; ignore failures.
  }
}
