import type { Cadence } from '../../domain/trial';

/** `source` is the matched substring of the normalized input. */
export type Field<T> = { value: T; confidence: number; source: string };

export interface ParseResult {
  name?: Field<string>;
  priceCents?: Field<number>;
  currency?: Field<string>;
  cadence?: Field<Cadence>;
  chargeAt?: Field<string>;
  cancelUrl?: Field<string>;
}
