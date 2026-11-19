import { useRef, useState, type KeyboardEvent } from 'react'
import type { Grave } from '../../domain/trial'
import { pixelStateFor, type PixelKind } from '../../domain/pixelState'
import type { summarize } from '../../domain/selectors'
import type { ProgressState } from '../../state/storage'
import { PixelIcon } from '../../design/pixel/PixelIcon'
import { useMediaQuery } from '../../design/useMediaQuery'
import { Fireflies } from '../atmosphere/Fireflies'
import { Gravestone } from './Gravestone'
import { Hud, SceneTotals } from './Hud'
import styles from './scene.module.css'

const depth: Record<PixelKind, number> = { normal: 0, kept: 1, cancelled: 1, warning: 2, critical: 3 }
const directions: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -4, ArrowDown: 4 }

export function Scene({ graves, now, selected, summary, progress, onOpen, onExorcise }: {
  graves: Grave[]; now: Date; selected?: string; summary: ReturnType<typeof summarize>; progress: ProgressState;
  onOpen: (grave: Grave) => void; onExorcise: (grave: Grave) => void;
}) {
  const handheld = useMediaQuery('(max-width: 800px)')
  const field = useRef<HTMLDivElement>(null)
  const [focusId, setFocusId] = useState<string>()
  const tiles = graves.map(grave => ({ grave, rank: depth[pixelStateFor(grave, now).kind] })).sort((a, b) => a.rank - b.rank)
  const preferredId = focusId ?? selected ?? (handheld ? summary.next?.id : undefined)
  const currentIndex = Math.max(0, tiles.findIndex(tile => tile.grave.id === preferredId))
  const urgent = tiles.filter(tile => tile.rank >= depth.warning).length
  const wrap = (index: number) => (index + tiles.length) % tiles.length

  function turn(step: number) {
    const next = wrap(currentIndex + step)
    setFocusId(tiles[next].grave.id)
  }

  function navigate(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const direction = directions[event.key]
    if (!direction) return
    event.preventDefault()
    const next = wrap(index + (handheld ? Math.sign(direction) : direction))
    const target = tiles[next].grave.id
    setFocusId(target)
    requestAnimationFrame(() => field.current?.querySelectorAll<HTMLButtonElement>('button')[next]?.focus())
  }

  return <section className={styles.scene} aria-label="Pixel graveyard">
    <SceneTotals summary={summary} />
    <Fireflies />
    <div className={styles.field}>
      <button type="button" className={styles.arrow} aria-label="Previous grave" onClick={() => turn(-1)} disabled={tiles.length < 2}><PixelIcon name="left" size={3} /></button>
      <div className={styles.graves} ref={field} aria-label="Gravestones">
        {tiles.map(({ grave }, index) => <div key={grave.id} data-current={currentIndex === index}
          data-front={tiles.length < 5 || index >= Math.ceil(tiles.length / 2)}>
          <Gravestone grave={grave} now={now} style={progress.styleId} focused={index === currentIndex}
            selected={grave.id === selected} onFocus={() => setFocusId(grave.id)} onOpen={() => onOpen(grave)}
            onKeyDown={event => navigate(event, index)} />
        </div>)}
      </div>
      <button type="button" className={styles.arrow} aria-label="Next grave" onClick={() => turn(1)} disabled={tiles.length < 2}><PixelIcon name="right" size={3} /></button>
      <p className={styles.position} aria-live="polite">Grave {currentIndex + 1} of {tiles.length}</p>
    </div>
    <Hud summary={summary} progress={progress} now={now} urgent={urgent} onExorcise={onExorcise} />
  </section>
}
