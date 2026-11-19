import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { resolveBase } from './vite.base';

describe('resolveBase', () => {
  it('defaults to the GitHub Pages path', () => {
    expect(resolveBase({})).toBe('/trial-graveyard/');
  });
  it('uses / on Vercel', () => {
    expect(resolveBase({ VERCEL: '1' })).toBe('/');
  });
  it('lets VITE_BASE win over VERCEL', () => {
    expect(resolveBase({ VITE_BASE: '/app/', VERCEL: '1' })).toBe('/app/');
  });
  it('treats empty values as unset', () => {
    expect(resolveBase({ VITE_BASE: '', VERCEL: '' })).toBe('/trial-graveyard/');
    expect(resolveBase({ VITE_BASE: '  ', VERCEL: '1' })).toBe('/');
  });
  it('normalises slashes', () => {
    expect(resolveBase({ VITE_BASE: 'app' })).toBe('/app/');
    expect(resolveBase({ VITE_BASE: '/' })).toBe('/');
    expect(resolveBase({ VITE_BASE: 'https://cdn.example.com/x' })).toBe('https://cdn.example.com/x/');
  });
});

describe('asset paths', () => {
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(tsx?|css|html)$/.test(name) && !name.endsWith('.test.ts') && !name.endsWith('.test.tsx')) files.push(p);
    }
  };
  walk('src');
  files.push('index.html');

  it('never hardcodes the GitHub Pages base path', () => {
    const offenders = files.filter((f) => readFileSync(f, 'utf8').includes('/trial-graveyard'));
    expect(offenders).toEqual([]);
  });
});
