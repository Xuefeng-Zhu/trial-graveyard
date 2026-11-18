import type { Cadence } from '../../../domain/trial';

export interface Fixture {
  id: string;
  text: string;
  /** Expected values. Omitted keys must be absent from the result. */
  expected: {
    name?: string;
    priceCents?: number;
    currency?: string;
    cadence?: Cadence;
    /** Calendar date `YYYY-MM-DD` */
    date?: string;
    cancelUrl?: string;
  };
}

export const REF_DATE = new Date(2026, 9, 1, 12, 0, 0);

export const FIXTURES: Fixture[] = [
  {
    id: 'netflix',
    text: `Welcome to Netflix!
Your free trial ends on October 31, 2026. After that you will be charged $15.49/month.
Manage your membership: https://www.netflix.com/cancelplan`,
    expected: {
      name: 'Netflix',
      priceCents: 1549,
      currency: 'USD',
      cadence: 'monthly',
      date: '2026-10-31',
      cancelUrl: 'https://www.netflix.com/cancelplan',
    },
  },
  {
    id: 'audible',
    text: `Thanks for joining Audible.
Your Audible Premium Plus trial ends Nov 14, 2026.
Then $14.95 per month. Cancel anytime at https://www.audible.com/account/membership`,
    expected: {
      name: 'Audible Premium Plus',
      priceCents: 1495,
      currency: 'USD',
      cadence: 'monthly',
      date: '2026-11-14',
      cancelUrl: 'https://www.audible.com/account/membership',
    },
  },
  {
    id: 'spotify',
    text: `Your free Spotify Premium trial is active.
First charge on 2026-11-02: $11.99 a month.
https://www.spotify.com/account/subscription/`,
    expected: {
      name: 'Spotify Premium',
      priceCents: 1199,
      currency: 'USD',
      cadence: 'monthly',
      date: '2026-11-02',
      cancelUrl: 'https://www.spotify.com/account/subscription/',
    },
  },
  {
    id: 'adobe',
    text: `Welcome to Adobe Creative Cloud. Your trial ends 10/28/2026.
You will be charged US$59.99/mo unless you cancel.
https://account.adobe.com/plans`,
    expected: {
      name: 'Adobe Creative Cloud',
      priceCents: 5999,
      currency: 'USD',
      cadence: 'monthly',
      date: '2026-10-28',
      cancelUrl: 'https://account.adobe.com/plans',
    },
  },
  {
    id: 'yearly-plan',
    text: `Your Notion Plus trial ends 3 December 2026.
Your plan renews on 3 December 2026 at $96.00 billed annually.`,
    expected: {
      name: 'Notion Plus',
      priceCents: 9600,
      currency: 'USD',
      cadence: 'yearly',
      date: '2026-12-03',
    },
  },
  {
    id: 'euro-prefix',
    text: `Welcome to Deezer. Your trial ends on 15 November 2026. Then €10,99 per month.`,
    expected: {
      name: 'Deezer',
      priceCents: 1099,
      currency: 'EUR',
      cadence: 'monthly',
      date: '2026-11-15',
    },
  },
  {
    id: 'euro-suffix',
    text: `Dein Abo: 9,99 € monatlich. Erste Abbuchung 2026-11-20. See https://www.dazn.com/help for more.`,
    expected: {
      priceCents: 999,
      currency: 'EUR',
      date: '2026-11-20',
      cancelUrl: 'https://www.dazn.com/help',
      name: 'Dazn',
    },
  },
  {
    id: 'gbp',
    text: `Your Disney Plus subscription: a £7.99 per month plan. First charge on 5 Nov 2026.`,
    expected: {
      name: 'Disney Plus',
      priceCents: 799,
      currency: 'GBP',
      cadence: 'monthly',
      date: '2026-11-05',
    },
  },
  {
    id: 'iso-code',
    text: `Welcome to Proton. Trial ends 2026-12-24. You will be charged CAD 48.00 weekly... just kidding, annually.`,
    expected: {
      name: 'Proton',
      priceCents: 4800,
      currency: 'CAD',
      cadence: 'weekly',
      date: '2026-12-24',
    },
  },
  {
    id: 'thousands',
    text: `Your Enterprise Suite trial ends Oct 31, 2026. First charge: $1,299.00 per year.`,
    expected: {
      name: 'Enterprise Suite',
      priceCents: 129900,
      currency: 'USD',
      cadence: 'yearly',
      date: '2026-10-31',
    },
  },
  {
    id: 'free-then-paid',
    text: `Welcome to Hulu. $0.00 due today, then $7.99/month. Trial ends on Oct 20.`,
    expected: {
      name: 'Hulu',
      priceCents: 799,
      currency: 'USD',
      cadence: 'monthly',
      date: '2026-10-20',
    },
  },
  {
    id: 'yearless-rolls-over',
    text: `Welcome to Duolingo. Your trial ends Jan 5. Then $6.99/mo.`,
    expected: {
      name: 'Duolingo',
      priceCents: 699,
      currency: 'USD',
      cadence: 'monthly',
      date: '2027-01-05',
    },
  },
  {
    id: 'labelled-beats-bare',
    text: `Order placed 2026-09-15. Your Dropbox trial ends 2026-10-15. Then $11.99/month.`,
    expected: {
      name: 'Dropbox',
      priceCents: 1199,
      currency: 'USD',
      cadence: 'monthly',
      date: '2026-10-15',
    },
  },
  {
    id: 'unicode-spaces',
    text: 'Your\u00a0Calm\u00a0trial ends\u00a0Oct\u00a031,\u00a02026.\u2003Then $69.99\u00a0per\u00a0year.',
    expected: {
      name: 'Calm',
      priceCents: 6999,
      currency: 'USD',
      cadence: 'yearly',
      date: '2026-10-31',
    },
  },
  {
    id: 'no-match',
    text: 'Hello! Thanks for being a customer. We hope you are enjoying the product.',
    expected: {},
  },
  {
    id: 'empty',
    text: '',
    expected: {},
  },
];
