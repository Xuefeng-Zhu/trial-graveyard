export const GITHUB_PAGES_BASE = '/trial-graveyard/';

type Env = Record<string, string | undefined>;

/**
 * Resolve the public base path. VITE_BASE wins, then '/' on Vercel,
 * otherwise the GitHub Pages path. Empty values count as unset.
 */
export function resolveBase(env: Env): string {
  const override = env.VITE_BASE?.trim();
  if (override) {
    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(override)) return override.endsWith('/') ? override : `${override}/`;
    const withLeading = override.startsWith('/') ? override : `/${override}`;
    return withLeading.endsWith('/') ? withLeading : `${withLeading}/`;
  }
  if (env.VERCEL) return '/';
  return GITHUB_PAGES_BASE;
}
