/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { contrastRatio } from './contrast';
import { MAX_GAIN, isSoundEnabled, playSound, setSoundEnabled } from './sounds';


function block(selector: string): Record<string, string> {
  const start = css.indexOf(selector + ' {');
  const body = css.slice(start, css.indexOf('}', start));
  return Object.fromEntries([...body.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6});/g)].map((m) => [m[1]!, m[2]!]));
}

const read = (f: string): string => readFileSync(join(process.cwd(), 'src/design', f), 'utf8');
const css = read('tokens.css');
const night = block(':root');
const day = { ...night, ...block(":root[data-theme='daylight']") };

describe.each([
  ['night', night],
  ['daylight', day],
])('%s theme contrast (WCAG AA 4.5:1)', (_name, t) => {
  const backgrounds = ['color-bg', 'color-surface'];
  const texts = [
    'color-text',
    'color-text-muted',
    'color-accent',
    'color-danger',
    'stage-sealed',
    'stage-cracked',
    'stage-churning',
    'stage-zombie',
    'stage-overdue',
  ];
  for (const bg of backgrounds) {
    for (const fg of texts) {
      it(`${fg} on ${bg}`, () => {
        expect(contrastRatio(t[fg]!, t[bg]!)).toBeGreaterThanOrEqual(4.5);
      });
    }
  }
  it('accent button text on accent', () => {
    expect(contrastRatio(t['color-accent-contrast']!, t['color-accent']!)).toBeGreaterThanOrEqual(4.5);
  });
  it('focus ring is visible (3:1) on both backgrounds', () => {
    for (const bg of backgrounds) {
      expect(contrastRatio(t['color-focus']!, t[bg]!)).toBeGreaterThanOrEqual(3);
    }
  });
});

describe('reduced motion block', () => {
  it('disables animation and limits transitions to opacity under 200 ms', () => {
    const global = read('global.css');
    expect(global).toContain('@media (prefers-reduced-motion: reduce)');
    expect(global).toContain('animation: none !important');
    expect(global).toContain('transition-property: opacity !important');
    expect(css).toContain('--fade-duration: 150ms');
  });
});

describe('sounds', () => {
  afterEach(() => {
    setSoundEnabled(false);
    vi.unstubAllGlobals();
  });

  it('is muted by default and creates no audio context', () => {
    const ctor = vi.fn();
    vi.stubGlobal('AudioContext', ctor);
    expect(isSoundEnabled()).toBe(false);
    playSound('cancel');
    expect(ctor).not.toHaveBeenCalled();
  });

  it('plays once unmuted', () => {
    const node = { connect: vi.fn(() => node), frequency: {}, gain: {}, start: vi.fn(), stop: vi.fn() };
    const ctor = vi.fn(function () {
      return {
        createOscillator: () => node,
        createGain: () => node,
        destination: {},
        currentTime: 0,
        close: vi.fn(),
      };
    });
    vi.stubGlobal('AudioContext', ctor);
    setSoundEnabled(true);
    playSound('keep');
    expect(ctor).toHaveBeenCalledOnce();
    expect(node.start).toHaveBeenCalled();
  });

  it('does not throw without Web Audio or when it fails', () => {
    setSoundEnabled(true);
    expect(() => playSound('undo')).not.toThrow();
    vi.stubGlobal('AudioContext', () => {
      throw new Error('blocked');
    });
    expect(() => playSound('undo')).not.toThrow();
  });

  function audioNode() {
    const makeParam = () => ({ value: 0, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() });
    const node: Record<string, unknown> = {
      frequency: makeParam(),
      gain: makeParam(),
      start: vi.fn(),
      stop: vi.fn(),
      getChannelData: () => new Float32Array(10),
    };
    node.connect = vi.fn(() => node);
    return node;
  }

  it.each(['creak', 'thunder'] as const)('synthesises %s with a capped gain', (name) => {
    const node = audioNode();
    const close = vi.fn();
    const ctor = vi.fn(function () {
      return {
        createOscillator: () => node,
        createGain: () => node,
        createBiquadFilter: () => node,
        createBuffer: () => node,
        createBufferSource: () => node,
        destination: {},
        currentTime: 0,
        sampleRate: 10,
        close,
      };
    });
    vi.stubGlobal('AudioContext', ctor);
    setSoundEnabled(true);
    playSound(name);
    expect(ctor).toHaveBeenCalledOnce();
    expect(node.start).toHaveBeenCalled();
    (node.onended as () => void)();
    expect(close).toHaveBeenCalled();
    const peaks = (node.gain as { linearRampToValueAtTime: ReturnType<typeof vi.fn> }).linearRampToValueAtTime.mock.calls.map(
      (c: number[]) => c[0] ?? 0,
    );
    expect(Math.max(...peaks)).toBeLessThanOrEqual(MAX_GAIN);
  });

  it('is silent for new sounds while muted', () => {
    const ctor = vi.fn();
    vi.stubGlobal('AudioContext', ctor);
    playSound('creak');
    playSound('thunder');
    expect(ctor).not.toHaveBeenCalled();
  });
});
