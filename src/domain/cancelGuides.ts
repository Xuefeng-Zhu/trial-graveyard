export interface CancelGuide {
  cancelUrl: string;
  steps: readonly string[];
}

export interface ResolvedGuide {
  cancelUrl?: string;
  steps: readonly string[];
  /** Always present: a web search for how to cancel this service. */
  searchUrl: string;
  known: boolean;
}

/** Lowercases and strips everything except letters, digits and `+`, so "Grimoire+" stays distinct. */
export function normalizeService(name: string): string {
  return name.toLowerCase().replace(/[^\p{L}\p{N}+]/gu, '');
}

export const cancelGuides: Readonly<Record<string, CancelGuide>> = {
  phantomflix: {
    cancelUrl: 'https://phantomflix.example/account/cancel',
    steps: ['Sign in to Phantomflix.', 'Open Account, then Membership.', 'Choose "Release my soul" and confirm.'],
  },
  wraithwave: {
    cancelUrl: 'https://wraithwave.example/settings/plan',
    steps: ['Sign in to Wraithwave.', 'Open Settings, then Plan.', 'Select "Fade away" and confirm.'],
  },
  crypticcloud: {
    cancelUrl: 'https://crypticcloud.example/billing',
    steps: ['Sign in to Cryptic Cloud.', 'Open Billing.', 'Pick "Downgrade to free" and confirm.'],
  },
  hexlingo: {
    cancelUrl: 'https://hexlingo.example/settings/subscription',
    steps: ['Open Hexlingo settings.', 'Choose Subscription.', 'Tap "End trial" and confirm.'],
  },
  bansheebox: {
    cancelUrl: 'https://bansheebox.example/account',
    steps: ['Sign in to Banshee Box.', 'Open Account.', 'Choose "Cancel box" and confirm.'],
  },
  'grimoire+': {
    cancelUrl: 'https://grimoire.example/membership',
    steps: ['Sign in to Grimoire+.', 'Open Membership.', 'Select "Close the book" and confirm.'],
  },
  spectralfitness: {
    cancelUrl: 'https://spectralfitness.example/membership/cancel',
    steps: ['Sign in to Spectral Fitness.', 'Open Membership.', 'Choose Cancel and confirm.'],
  },
  necroaudiobooks: {
    cancelUrl: 'https://necroaudiobooks.example/account/membership',
    steps: ['Sign in to Necro Audiobooks.', 'Open Account, then Membership.', 'Choose "Cancel membership" and confirm.'],
  },
  ghoulgptpro: {
    cancelUrl: 'https://ghoulgpt.example/settings/billing',
    steps: ['Sign in to Ghoul GPT.', 'Open Settings, then Billing.', 'Choose "Cancel Pro" and confirm.'],
  },
  netflix: {
    cancelUrl: 'https://www.netflix.com/cancelplan',
    steps: ['Sign in to Netflix.', 'Open Account.', 'Choose Cancel Membership and confirm.'],
  },
  audible: {
    cancelUrl: 'https://www.audible.com/account/membership',
    steps: ['Sign in to Audible.', 'Open Account Details.', 'Choose Cancel membership and confirm.'],
  },
  spotifypremium: {
    cancelUrl: 'https://www.spotify.com/account/subscription/',
    steps: ['Sign in to Spotify.', 'Open Manage your plan.', 'Choose Cancel Premium and confirm.'],
  },
};

const GENERIC_STEPS: readonly string[] = [
  'Sign in to the service.',
  'Look for Account, Billing or Subscription settings.',
  'Choose cancel and keep the confirmation email.',
];

export function searchUrl(name: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(`how to cancel ${name}`)}`;
}

/**
 * Cancel steps for a service. A known service uses its local guide. The grave's own saved
 * cancel link wins over the guide's link, since the user put it there.
 * Unknown services get a generic guide. A web search link is always included.
 */
export function getCancelGuide(name: string, savedCancelUrl?: string): ResolvedGuide {
  const known = Object.hasOwn(cancelGuides, normalizeService(name))
    ? cancelGuides[normalizeService(name)]
    : undefined;
  const cancelUrl = savedCancelUrl ?? known?.cancelUrl;
  return {
    ...(cancelUrl ? { cancelUrl } : {}),
    steps: known ? known.steps : GENERIC_STEPS,
    searchUrl: searchUrl(name),
    known: known !== undefined,
  };
}
