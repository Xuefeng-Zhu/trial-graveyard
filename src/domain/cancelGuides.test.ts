import { describe, expect, it } from 'vitest';
import { cancelGuides, getCancelGuide, normalizeService, searchUrl } from './cancelGuides';

const FICTIONAL = [
  'Phantomflix',
  'Wraithwave',
  'Cryptic Cloud',
  'Hexlingo',
  'Banshee Box',
  'Grimoire+',
  'Spectral Fitness',
  'Necro Audiobooks',
  'Ghoul GPT Pro',
];

describe('normalizeService', () => {
  it('lowercases and strips punctuation but keeps plus', () => {
    expect(normalizeService(' Cryptic  Cloud! ')).toBe('crypticcloud');
    expect(normalizeService('Grimoire+')).toBe('grimoire+');
    expect(normalizeService('Grimoire')).not.toBe(normalizeService('Grimoire+'));
  });
});

describe('getCancelGuide', () => {
  it.each(FICTIONAL)('has a *.example guide with 2 to 4 steps for %s', (name) => {
    const guide = getCancelGuide(name);
    expect(guide.known).toBe(true);
    expect(new URL(guide.cancelUrl as string).hostname.endsWith('.example')).toBe(true);
    expect(guide.steps.length).toBeGreaterThanOrEqual(2);
    expect(guide.steps.length).toBeLessThanOrEqual(4);
  });

  it('keeps every guide between 2 and 4 steps', () => {
    for (const g of Object.values(cancelGuides)) {
      expect(g.steps.length).toBeGreaterThanOrEqual(2);
      expect(g.steps.length).toBeLessThanOrEqual(4);
    }
  });

  it('prefers the saved cancel url', () => {
    expect(getCancelGuide('Netflix', 'https://mine.example/x').cancelUrl).toBe('https://mine.example/x');
    expect(getCancelGuide('NETFLIX').cancelUrl).toBe('https://www.netflix.com/cancelplan');
  });

  it('gives unknown services a generic guide and a search link', () => {
    const guide = getCancelGuide('ToString & Co');
    expect(guide.known).toBe(false);
    expect(guide.cancelUrl).toBeUndefined();
    expect(guide.steps.length).toBeGreaterThanOrEqual(2);
    expect(guide.searchUrl).toBe(searchUrl('ToString & Co'));
    expect(guide.searchUrl).toContain('how%20to%20cancel%20ToString%20%26%20Co');
    expect(getCancelGuide('constructor').known).toBe(false);
  });

  it('keeps a saved url for unknown services', () => {
    expect(getCancelGuide('Mystery', 'https://m.example').cancelUrl).toBe('https://m.example');
  });
});
