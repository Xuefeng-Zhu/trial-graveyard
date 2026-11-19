import { useEffect, useState } from 'react';

/** Returns the current time, refreshed every `intervalMs` and whenever the tab becomes visible. */
export function useNow(intervalMs = 60_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const tick = (): void => setNow(new Date());
    const onVisibility = (): void => {
      if (document.visibilityState === 'visible') tick();
    };
    const id = setInterval(tick, intervalMs);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [intervalMs]);
  return now;
}
