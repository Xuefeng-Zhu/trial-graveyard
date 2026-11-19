import type { Grave } from '../../domain/trial'
import { formatEpitaph } from '../../domain/epitaph'

export function Tombstone({ grave }: { grave: Grave }) {
  return <p>{formatEpitaph(grave)}</p>
}
