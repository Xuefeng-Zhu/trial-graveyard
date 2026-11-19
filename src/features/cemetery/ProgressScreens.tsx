import { dailyQuest, decorations, levelForXp, MAX_LEVEL, styles as stoneStyles, totalXp, xpForLevel, xpProgress, type StyleId } from '../../domain/xp'
import { PixelIcon } from '../../design/pixel/PixelIcon'
import type { ProgressState } from '../../state/storage'
import styles from './menus.module.css'

export function Quests({ now, progress }: { now: Date; progress: ProgressState }) {
  const xp = totalXp(progress.ledger)
  const level = levelForXp(xp)
  return <section className={styles.menu}>
    <header><h1>Quests</h1></header>
    <div className={styles.cards}>
      <article className={styles.card}>
        <div className={styles.art}><PixelIcon name="quest" size={7} /></div>
        <h2>Daily Quest</h2>
        <p>Cancel 1 trial <strong>({dailyQuest(progress.ledger, now)}/1)</strong></p>
      </article>
      <article className={styles.card}>
        <div className={styles.art}><PixelIcon name="skull" size={7} /></div>
        <h2>Level {level}</h2>
        <p>{xp} XP{level < MAX_LEVEL ? ` · ${xpForLevel(level + 1)} XP for the next level` : ' · Maximum level'}</p>
        <progress aria-label="Level progress" max={1} value={xpProgress(xp)} />
        <p className="muted">XP unlocks cosmetics. Your savings come from confirmed cancellations.</p>
        <ul><li>Add a trial · 10 XP</li><li>Review a trial · 5 XP</li><li>Confirm a cancellation · 25 XP</li></ul>
      </article>
    </div>
  </section>
}

export function Collection({ progress, selectStyle }: { progress: ProgressState; selectStyle: (id: StyleId) => void }) {
  const level = levelForXp(totalXp(progress.ledger))
  return <section className={styles.menu}>
    <header><h1>Collection</h1></header>
    <section className="stack" aria-label="Gravestone styles">
      <h2>Gravestone styles</h2>
      <div className={styles.collect}>
        {stoneStyles.map(style => <button key={style.id} data-style={style.id} disabled={level < style.level} aria-pressed={progress.styleId === style.id}
          onClick={() => selectStyle(style.id)} className={styles.loot}>
          <PixelIcon name="grave" size={5} /><strong>{style.label}</strong>
          <small>{level < style.level ? `Locked · Lv. ${style.level}` : progress.styleId === style.id ? 'Selected' : 'Equip'}</small>
        </button>)}
      </div>
    </section>
    <section className="stack" aria-label="Decorations">
      <h2>Decorations</h2>
      <div className={styles.collect}>
        {decorations.map(item => <article key={item.id} className={styles.loot}>
          <PixelIcon name={item.id} size={5} /><strong>{item.label}</strong><small>{level >= item.level ? 'Unlocked' : `Locked · Lv. ${item.level}`}</small>
        </article>)}
      </div>
    </section>
  </section>
}
