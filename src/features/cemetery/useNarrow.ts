import { useEffect, useState } from 'react';

export const NARROW_QUERY = '(max-width: 900px)';

function query(): MediaQueryList | undefined {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia(NARROW_QUERY)
    : undefined;
}

/** True on phones and small tablets, where the details panel becomes a modal bottom sheet. */
export function useNarrow(): boolean {
  const [narrow, setNarrow] = useState<boolean>(() => query()?.matches ?? false);
  useEffect(() => {
    const mql = query();
    if (!mql) return undefined;
    const onChange = (): void => setNarrow(mql.matches);
    onChange();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);
  return narrow;
}
