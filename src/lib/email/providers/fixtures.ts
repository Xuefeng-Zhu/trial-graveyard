import type { EmailMessage } from '../types';

const DAY = 86_400_000;
const pad = (n: number): string => String(n).padStart(2, '0');

/** Calendar date `YYYY-MM-DD` (local) `days` after `now`. */
function ahead(now: Date, days: number): string {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + days);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * 13 realistic emails: 8 trial confirmations, 2 renewal notices and 3
 * distractors. Email dates are 1 to 20 days before `now`; charge dates are
 * 3 to 25 days after it, so stages vary and the demo never goes stale.
 */
export function buildFixtures(now: Date): EmailMessage[] {
  const sent = (daysAgo: number): string => new Date(now.getTime() - daysAgo * DAY).toISOString();
  const trial = (
    id: string,
    daysAgo: number,
    from: string,
    subject: string,
    service: string,
    days: number,
    price: string,
    cancel: string,
  ): EmailMessage => ({
    id,
    from,
    subject,
    date: sent(daysAgo),
    text: `Welcome aboard!\nYour ${service} free trial has started. Your trial ends on ${ahead(now, days)}. After that you will be charged ${price}.\nManage your plan: ${cancel}`,
  });

  return [
    trial('mock-disney', 19, 'Disney+ <no-reply@mail.disneyplus.com>', 'Your Disney+ free trial has started', 'Disney+', 3, '$13.99 per month', 'https://www.disneyplus.com/account/subscription'),
    trial('mock-spotify', 17, 'Spotify <no-reply@spotify.com>', 'Welcome to Spotify Premium: free for 30 days', 'Spotify Premium', 6, '$11.99 per month', 'https://www.spotify.com/account/subscription/'),
    trial('mock-adobe', 15, 'Adobe <mail@mail.adobe.com>', 'Your Adobe Creative Cloud trial', 'Adobe Creative Cloud', 9, '$59.99 per month', 'https://account.adobe.com/plans'),
    trial('mock-duolingo', 13, 'Duolingo <hello@duolingo.com>', 'Your Duolingo Max trial is active', 'Duolingo Max', 12, '$29.99 per month', 'https://www.duolingo.com/settings/subscription'),
    trial('mock-nyt', 11, 'The New York Times <nytimes@nytimes.com>', 'Your New York Times trial: you will be charged soon', 'New York Times', 15, '$17.00 per month', 'https://myaccount.nytimes.com/seg/subscription'),
    trial('mock-peloton', 9, 'Peloton <info@onepeloton.com>', 'Your Peloton free trial', 'Peloton', 18, '$44.00 per month', 'https://members.onepeloton.com/preferences/subscriptions'),
    trial('mock-chatgpt', 7, 'OpenAI <noreply@tm.openai.com>', 'Your ChatGPT Plus trial', 'ChatGPT Plus', 21, '$20.00 per month', 'https://chat.openai.com/#settings/manage-subscription'),
    trial('mock-audible', 5, 'Audible <no-reply@audible.com>', 'Welcome to Audible: free for 30 days', 'Audible Premium Plus', 25, '$14.95 per month', 'https://www.audible.com/account/membership'),
    {
      id: 'mock-renew-dropbox',
      from: 'Dropbox <no-reply@dropbox.com>',
      subject: `Your Dropbox Plus subscription renews on ${ahead(now, 7)}`,
      date: sent(8),
      text: `Hi there. Your Dropbox Plus subscription renews on ${ahead(now, 7)}. You will be charged $119.88 per year. Manage it: https://www.dropbox.com/account/plan`,
    },
    {
      id: 'mock-renew-icloud',
      from: 'Apple <no-reply@email.icloud.com>',
      subject: `Your iCloud+ plan renews on ${ahead(now, 11)}`,
      date: sent(4),
      text: `Your iCloud+ subscription renews on ${ahead(now, 11)}. You will be charged $2.99 per month. Manage it: https://support.apple.com/billing`,
    },
    {
      id: 'mock-ship',
      from: 'Parcel Post <orders@parcelpost.example>',
      subject: 'Your order has shipped',
      date: sent(3),
      text: `Good news, your order #48213 has shipped. Estimated delivery ${ahead(now, 4)}. Track it at https://track.parcelpost.example/48213`,
    },
    {
      id: 'mock-newsletter',
      from: 'Crypt Weekly <news@cryptweekly.example>',
      subject: 'Crypt Weekly newsletter: ten haunted houses',
      date: sent(2),
      text: 'This week: ten haunted houses worth a visit, and a ghost story from our readers. Read more on our site.',
    },
    {
      id: 'mock-password',
      from: 'Accounts <security@accounts.example>',
      subject: 'Reset your password',
      date: sent(1),
      text: 'We received a request to reset your password. Use code 482913 within 15 minutes. If this was not you, ignore this email.',
    },
  ];
}
