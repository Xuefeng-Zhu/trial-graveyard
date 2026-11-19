import { useCallback, useEffect, useRef, useState } from 'react';
import { validateTrial } from '../../domain/trial';
import type { Grave, TrialErrors, ValidTrial } from '../../domain/trial';
import { ConsentDeniedError, createMockProvider, scanEmails } from '../../lib/email';
import type { Candidate, EmailProvider } from '../../lib/email';
import { DEFAULT_CURRENCY } from '../../domain/trial';
import type { FormValues } from '../editor';

export type Phase = 'idle' | 'consent' | 'scanning' | 'review' | 'error';

export interface ReviewItem {
  key: string;
  checked: boolean;
  confidence: number;
  snippet: string;
  values: FormValues;
  errors: TrialErrors;
}

export interface UseSeanceOptions {
  existing: readonly Grave[];
  clock: () => Date;
  /** Delay between streamed emails. Tests pass 0. */
  delayMs?: number;
  onBury: (trial: ValidTrial) => void;
}

const LOOKBACK_DAYS = 60;

export const confidenceLabel = (c: number): string => (c >= 0.75 ? 'strong spirit' : 'faint spirit');

function toItem(c: Candidate): ReviewItem {
  const f = c.fields;
  return {
    key: c.key,
    checked: true,
    confidence: c.confidence,
    snippet: c.snippet,
    errors: {},
    values: {
      name: f.name,
      chargeAt: f.chargeDate.slice(0, 10),
      price: f.priceCents === undefined ? '' : (f.priceCents / 100).toFixed(2),
      currency: f.currency ?? DEFAULT_CURRENCY,
      cadence: f.cadence ?? 'monthly',
      cancelUrl: f.cancelUrl ?? '',
    },
  };
}

/** State machine for the séance. Email text lives only in this hook's state and is dropped on reset. */
export function useSeance({ existing, clock, delayMs, onBury }: UseSeanceOptions) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [progress, setProgress] = useState({ read: 0, found: 0 });
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [message, setMessage] = useState('');
  const consent = useRef<((ok: boolean) => void) | undefined>(undefined);
  const run = useRef(0);
  const provider = useRef<EmailProvider | undefined>(undefined);
  const clockRef = useRef(clock);
  clockRef.current = clock;

  provider.current ??= createMockProvider({
    ...(delayMs === undefined ? {} : { delayMs }),
    now: () => clockRef.current(),
    confirm: () =>
      new Promise<boolean>((resolve) => {
        consent.current = resolve;
        setPhase('consent');
      }),
  });

  const reset = useCallback((): void => {
    run.current += 1;
    consent.current?.(false);
    consent.current = undefined;
    void provider.current?.disconnect();
    setPhase('idle');
    setProgress({ read: 0, found: 0 });
    setItems([]);
    setMessage('');
  }, []);

  useEffect(
    () => () => {
      run.current += 1;
      void provider.current?.disconnect();
    },
    [],
  );

  const connect = async (): Promise<void> => {
    const p = provider.current;
    if (!p) return;
    const id = ++run.current;
    setMessage('');
    try {
      await p.connect();
      if (id !== run.current) return;
      setPhase('scanning');
      const now = clockRef.current();
      const since = new Date(now.getTime() - LOOKBACK_DAYS * 86_400_000);
      const found = await scanEmails(p.searchReceipts({ since }), existing, now, (pr) => {
        if (id === run.current) setProgress(pr);
      });
      if (id !== run.current) return;
      setItems(found.map(toItem));
      setPhase('review');
    } catch (e) {
      if (id !== run.current) return;
      if (e instanceof ConsentDeniedError) {
        setPhase('idle');
        setMessage('You turned the spirits away. They will wait.');
      } else {
        setPhase('error');
        setMessage('The séance fizzled. Close the panel and try again.');
      }
    }
  };

  const answerConsent = (ok: boolean): void => {
    consent.current?.(ok);
    consent.current = undefined;
    if (ok) setPhase('scanning');
  };

  const update = (key: string, patch: Partial<ReviewItem> | { values: Partial<FormValues> }): void =>
    setItems((list) =>
      list.map((it) => {
        if (it.key !== key) return it;
        if ('values' in patch && patch.values) return { ...it, values: { ...it.values, ...patch.values }, errors: {} };
        return { ...it, ...(patch as Partial<ReviewItem>) };
      }),
    );

  /** Validates all checked rows. Buries them only when every one is valid. Returns the count buried. */
  const burySelected = (): number => {
    const checked = items.filter((i) => i.checked);
    const results = checked.map((i) => ({ i, r: validateTrial(i.values) }));
    if (results.some(({ r }) => !r.ok)) {
      setItems((list) =>
        list.map((it) => {
          const hit = results.find(({ i }) => i.key === it.key);
          return hit && !hit.r.ok ? { ...it, errors: hit.r.errors } : it;
        }),
      );
      return 0;
    }
    for (const { r } of results) if (r.ok) onBury(r.value);
    return results.length;
  };

  return { phase, progress, items, message, connect, answerConsent, update, burySelected, reset };
}
