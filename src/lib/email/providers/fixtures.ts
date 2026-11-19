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
    trial('mock-phantomflix', 19, 'Phantomflix <no-reply@mail.phantomflix.example>', 'Your Phantomflix free trial has started', 'Phantomflix', 3, '$13.99 per month', 'https://www.phantomflix.example/account/subscription'),
    trial('mock-wraithwave', 17, 'Wraithwave <no-reply@wraithwave.example>', 'Welcome to Wraithwave Premium: free for 30 days', 'Wraithwave Premium', 6, '$11.99 per month', 'https://www.wraithwave.example/account/subscription/'),
    trial('mock-crypticcloud', 15, 'Cryptic Cloud <mail@mail.crypticcloud.example>', 'Your Cryptic Cloud trial', 'Cryptic Cloud', 9, '$59.99 per month', 'https://account.crypticcloud.example/plans'),
    trial('mock-hexlingo', 13, 'Hexlingo <hello@hexlingo.example>', 'Your Hexlingo Max trial is active', 'Hexlingo Max', 12, '$29.99 per month', 'https://www.hexlingo.example/settings/subscription'),
    trial('mock-grimoire', 11, 'Grimoire+ <hello@grimoireplus.example>', 'Your Grimoire+ trial: you will be charged soon', 'Grimoire+', 15, '$17.00 per month', 'https://account.grimoireplus.example/subscription'),
    trial('mock-spectral', 9, 'Spectral Fitness <info@spectralfitness.example>', 'Your Spectral Fitness free trial', 'Spectral Fitness', 18, '$44.00 per month', 'https://members.spectralfitness.example/subscriptions'),
    trial('mock-ghoulgpt', 7, 'Ghoul GPT <noreply@mail.ghoulgpt.example>', 'Your Ghoul GPT Pro trial', 'Ghoul GPT Pro', 21, '$20.00 per month', 'https://chat.ghoulgpt.example/settings/subscription'),
    trial('mock-necroaudiobooks', 5, 'Necro Audiobooks <no-reply@necroaudiobooks.example>', 'Welcome to Necro Audiobooks: free for 30 days', 'Necro Audiobooks Plus', 25, '$14.95 per month', 'https://www.necroaudiobooks.example/account/membership'),
    {
      id: 'mock-renew-bansheebox',
      from: 'Banshee Box <no-reply@bansheebox.example>',
      subject: `Your Banshee Box Plus subscription renews on ${ahead(now, 7)}`,
      date: sent(8),
      text: `Hi there. Your Banshee Box Plus subscription renews on ${ahead(now, 7)}. You will be charged $119.88 per year. Manage it: https://www.bansheebox.example/account/plan`,
    },
    {
      id: 'mock-renew-cryptdrive',
      from: 'Tomb Tech <no-reply@mail.cryptdrive.example>',
      subject: `Your Crypt Drive+ plan renews on ${ahead(now, 11)}`,
      date: sent(4),
      text: `Your Crypt Drive+ subscription renews on ${ahead(now, 11)}. You will be charged $2.99 per month. Manage it: https://support.cryptdrive.example/billing`,
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
