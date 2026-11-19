import { addHours, formatISO, subDays } from 'date-fns'
import { createGrave, type Grave, type Status } from '../domain/trial'

const examples: [string, string, number, number, Status][] = [
  ['phantomflix', 'Phantomflix', 1399, 252, 'active'],
  ['hexlingo', 'Hexlingo', 899, 122, 'active'],
  ['cryptic-cloud', 'Cryptic Cloud', 1299, 57, 'active'],
  ['wraithwave', 'Wraithwave Premium', 1999, 3, 'active'],
  ['banshee-box', 'Banshee Box', 1199, 95, 'cancelled'],
  ['grimoire', 'Grimoire+', 599, 168, 'kept'],
  ['hollowtv', 'Hollowtv', 1599, -18, 'active'],
  ['moonnotes', 'Moonnotes Plus', 499, 30, 'active'],
]

export function demoGraves(now: Date): Grave[] {
  return examples.map(([slug, name, priceCents, hours, status]) => ({
    ...createGrave({ name, priceCents, cadence: 'monthly', currency: 'USD',
      chargeAt: formatISO(addHours(now, hours)),
      cancelUrl: `https://${slug}.example/account` }, subDays(now, 10), `demo-${slug}`),
    status,
    ...(status === 'cancelled' ? { cancelledAt: formatISO(subDays(now, 2)) } : {}),
    ...(status === 'kept' ? { keptAt: formatISO(subDays(now, 2)) } : {}),
  }))
}
