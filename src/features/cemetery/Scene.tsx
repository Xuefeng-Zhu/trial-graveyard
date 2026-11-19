import { useState } from 'react'
import { countdown, getViewState } from '../../domain/stage'
import { formatMoney } from '../../domain/savings'
import type { Grave } from '../../domain/trial'
import styles from './scene.module.css'

export function Scene({ graves, now, onOpen }: { graves: Grave[]; now: Date; onOpen: (grave: Grave) => void }) {
  const [focus, setFocus] = useState(0)
  return <section className={styles.scene} aria-label="Pixel graveyard">
    <div className={styles.graves}>
      {graves.map((grave, index) => {
        const state = getViewState(grave, now)
        const pose = state.kind === 'grave' ? state.stage : state.kind
        const label = state.kind === 'grave' ? countdown(state.remainingMs) : grave.status
        return <button className={styles.stone} data-pose={pose} key={grave.id}
          aria-describedby={`grave-description-${grave.id}`}
          tabIndex={index === Math.min(focus, graves.length - 1) ? 0 : -1}
          onFocus={() => setFocus(index)} onClick={() => onOpen(grave)} onKeyDown={event => {
            const directions: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -3, ArrowDown: 3 }
            const offset = directions[event.key]
            if (!offset) return
            event.preventDefault()
            const buttons = event.currentTarget.parentElement?.querySelectorAll('button')
            buttons?.[(index + offset + graves.length) % graves.length]?.focus()
          }}>
          <svg viewBox="0 0 40 40" width="40" height="40" aria-hidden="true" shapeRendering="crispEdges">
            <path fill="#5e517d" d="M2 38V33H6V12H9V7H14V3H26V7H31V12H34V33H38V38Z"/>
            <path fill="#cbbbe7" d="M7 33V13H11V8H16V5H24V8H29V13H32V33Z"/>
            {pose !== 'sealed' && <path fill="none" stroke="#50366b" d="M25 6v8h-5v7h4v9h-3"/>}
          </svg>
          <strong>{grave.name}</strong>{' '}<small>{label}</small>
          <span hidden id={`grave-description-${grave.id}`}>{pose}, {formatMoney(grave.priceCents, grave.currency)}</span>
        </button>
      })}
    </div>
    <img className={`${styles.reaper} pixel`} src={`${import.meta.env.BASE_URL}pixel/reaper.png`} width="98" height="112" alt="" />
  </section>
}
