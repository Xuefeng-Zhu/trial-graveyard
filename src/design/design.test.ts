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

describe('retro pixel palette', () => {
  const palette = {
    midnight: '#120f23',
    deepPurple: '#2c2142',
    violet: '#8b5cf6',
    lavender: '#b8a9d9',
    green: '#a8ff60',
    orange: '#ffb14a',
    red: '#ff586e',
    moonlight: '#f2ecff',
  };

  it('defines every palette colour as a token', () => {
    for (const [name, hex] of Object.entries({
      'palette-midnight': palette.midnight,
      'palette-deep-purple': palette.deepPurple,
      'palette-violet': palette.violet,
      'palette-lavender': palette.lavender,
      'palette-green': palette.green,
      'palette-orange': palette.orange,
      'palette-red': palette.red,
      'palette-moonlight': palette.moonlight,
    })) {
      expect(night[name]).toBe(hex);
    }
  });

  it.each([
    ['moonlight', 'midnight'],
    ['moonlight', 'deepPurple'],
    ['lavender', 'midnight'],
    ['lavender', 'deepPurple'],
    ['green', 'midnight'],
    ['green', 'deepPurple'],
    ['orange', 'midnight'],
    ['orange', 'deepPurple'],
    ['red', 'midnight'],
    ['red', 'deepPurple'],
    ['midnight', 'green'],
    ['midnight', 'lavender'],
  ] as const)('%s text on %s is at least 4.5:1', (fg, bg) => {
    expect(contrastRatio(palette[fg], palette[bg])).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps the warning tone readable in both themes', () => {
    for (const t of [night, day]) {
      for (const bg of ['color-bg', 'color-surface']) {
        expect(contrastRatio(t['color-warn']!, t[bg]!)).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it('loads Press Start 2P and Inter from packages, not a CDN', () => {
    const fonts = read('fonts.ts');
    expect(fonts).toContain('@fontsource/press-start-2p/400.css');
    expect(fonts).toContain('@fontsource/inter/400.css');
    expect(fonts).not.toMatch(/https?:/);
    expect(css).toContain("--font-display: 'Press Start 2P'");
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

  it.each(['creak', 'thunder', 'select', 'celebrate'] as const)('synthesises %s with a capped gain', (name) => {
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
    playSound('select');
    playSound('celebrate');
    expect(ctor).not.toHaveBeenCalled();
  });
});
