import { pixelStateFor, statusText } from '../../domain/pixelState'
import { formatMoney, monthlyCents, cadenceSuffix } from '../../domain/savings'
import type { Grave } from '../../domain/trial'
import type { StyleId } from '../../domain/xp'
import { PixelIcon } from '../../design/pixel/PixelIcon'
import { formatEpitaph } from '../../domain/epitaph'
import { useId, type KeyboardEvent, type CSSProperties } from 'react'
import styles from './scene.module.css'

export function monogram(name: string) {
  const words = name.trim().split(/\s+/)
  return (words.length > 1 ? words.map(word => Array.from(word)[0]).slice(0, 2).join('') : Array.from(words[0]).slice(0, 2).join('')).toUpperCase()
}

const brandColors = ['#36286e', '#216045', '#60325d', '#853a50', '#2e4d79', '#725223']
export function monogramColor(name: string) {
  return brandColors[Array.from(name.toLowerCase()).reduce((sum, char) => sum + char.codePointAt(0)!, 0) % brandColors.length]
}

export function Gravestone({ grave, now, selected, focused, style, onOpen, onFocus, onKeyDown }: {
  grave: Grave; now: Date; selected: boolean; focused: boolean; style: StyleId; onOpen: () => void;
  onFocus: () => void; onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
}) {
  const epitaphId = useId()
  const state = pixelStateFor(grave, now)
  const price = state.kind === 'kept' ? formatMoney(monthlyCents(grave), grave.currency) + '/mo'
    : formatMoney(grave.priceCents, grave.currency) + (state.kind === 'cancelled' ? ' saved' : cadenceSuffix[grave.cadence])
  const epitaph = state.kind === 'cancelled' ? formatEpitaph(grave) : undefined
  return <button className={styles.grave} type="button" data-kind={state.kind} data-style={style} aria-pressed={selected}
    tabIndex={focused ? 0 : -1} onClick={onOpen} onFocus={onFocus} onKeyDown={onKeyDown} title={epitaph ?? grave.name} aria-describedby={epitaph ? epitaphId : undefined}>
    <span className={styles.stone}>
      <svg className={styles.stoneArt} viewBox="0 0 48 52" aria-hidden="true" shapeRendering="crispEdges">
        <path fill="#100b23" d="M4 49V44H8V15H10V10H13V7H17V4H31V7H35V10H38V15H40V44H44V49Z"/>
        <path fill="var(--stone-edge)" d="M5 48V44H9V15H11V10H14V7H18V5H30V7H34V10H37V15H39V44H43V48Z"/>
        <path fill="var(--stone-face)" d="M12 43V16H14V11H17V9H20V7H28V9H32V11H34V16H36V43Z"/>
        <path fill="var(--stone-light)" d="M13 16H15V12H18V10H21V8H28V9H22V11H19V13H16V17H14V40H13Z"/>
        <path fill="var(--stone-shadow)" d="M34 15H36V43H31V41H34ZM9 42H19V44H36V46H9Z"/>
        <path fill="var(--stone-face)" d="M6 45H12V44H39V45H42V47H6Z"/>
        <path fill="#161026" opacity=".44" d="M10 22H12V24H10ZM35 30H37V31H35ZM17 15H19V16H17ZM31 34H34V35H31ZM13 39H16V40H13Z"/>
        {state.kind === 'warning' || state.kind === 'critical' ? <path className={styles.crack} fill="none" strokeWidth="1.25" d="M28 6H32V10H35V14H38V21H35V25M10 32H12V36H15V40H12V45H9M36 37H39V41H36V45H43"/> : null}
        {state.kind === 'cancelled' && <>
          <path fill="#57773f" d="M4 48v-4h3v3h5v-5h2v4h4v3H4Zm25 1v-4h5v-3h3v4h5v-2h2v5Z"/>
          <path fill="#dca0ee" d="M8 42h2v2H8zM35 40h2v2h-2zM39 43h2v2h-2z"/>
        </>}
        {state.hand && <path className={styles.hand} fill="#92af55" stroke="#1c271b" d="M39 49v-4h-2v-4h2v2h1v-6h2v4h1v-5h2v6h2v6h-3v1z"/>}
        {state.sparks && <path className={styles.sparks} fill="#ffd288" d="M41 21h2v2h-2zM43 13h1v2h-1zM5 32h2v2H5zM4 40h1v1H4z"/>}
      </svg>
      <span className={styles.monogram} style={{ '--brand-color': monogramColor(grave.name) } as CSSProperties} aria-hidden="true">
        {state.kind === 'kept' ? <PixelIcon name="ghost" /> : monogram(grave.name)}
      </span>
      <span className={styles.plaque}><strong>{grave.name}</strong><span>{price}</span></span>
    </span>
    <span className={styles.badge}>{state.label}</span>
    {epitaph && <span id={epitaphId} hidden>{epitaph}</span>}
    {(state.kind === 'normal' || state.kind === 'warning' || state.kind === 'critical') && <span className="sr-only">{statusText[state.kind]}</span>}
  </button>
}
