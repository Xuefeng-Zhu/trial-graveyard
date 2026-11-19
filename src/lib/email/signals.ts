/** Email-specific signals: subject keywords and sender domain to service name. */

const SUBJECT_KEYWORDS = ['trial', 'free for', 'will be charged', 'renews on'] as const;

/** Subjects of mail that is never a trial, such as shipping or password resets. */
const DISTRACTOR_SUBJECT = /\b(?:shipped|shipment|delivery|delivered|newsletter|password|verification code|order\s+#?\d)/i;

const SENDER_SERVICES: ReadonlyArray<readonly [string, string]> = [
  ['disneyplus.com', 'Disney+'],
  ['spotify.com', 'Spotify Premium'],
  ['adobe.com', 'Adobe Creative Cloud'],
  ['duolingo.com', 'Duolingo Max'],
  ['nytimes.com', 'The New York Times'],
  ['onepeloton.com', 'Peloton'],
  ['openai.com', 'ChatGPT Plus'],
  ['audible.com', 'Audible'],
  ['netflix.com', 'Netflix'],
  ['dropbox.com', 'Dropbox'],
  ['icloud.com', 'iCloud+'],
];

export function subjectSignals(subject: string): string[] {
  const lower = subject.toLowerCase();
  return SUBJECT_KEYWORDS.filter((k) => lower.includes(k)).map((k) => `subject:${k}`);
}

export function isDistractorSubject(subject: string): boolean {
  return DISTRACTOR_SUBJECT.test(subject);
}

/** Domain of a `From` header such as `Name <a@mail.example.com>`, lowercased. */
export function senderDomain(from: string): string | undefined {
  const m = /@([a-z0-9.-]+\.[a-z]{2,})\b/i.exec(from);
  return m?.[1]?.toLowerCase();
}

/** Known service for a sender domain (subdomains included). */
export function knownService(domain: string | undefined): string | undefined {
  if (domain === undefined) return undefined;
  return SENDER_SERVICES.find(([d]) => domain === d || domain.endsWith(`.${d}`))?.[1];
}

/** Fallback name from an unknown domain: `mail.acme.com` becomes `Acme`. */
export function domainLabel(domain: string | undefined): string | undefined {
  if (domain === undefined) return undefined;
  const parts = domain.split('.');
  const label = parts[parts.length - 2];
  return label ? label.charAt(0).toUpperCase() + label.slice(1) : undefined;
}
