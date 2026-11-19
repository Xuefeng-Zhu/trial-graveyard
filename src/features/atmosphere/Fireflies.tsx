import styles from './atmosphere.module.css'

export function Fireflies() {
  return <div className={styles.fireflies} aria-hidden="true">{Array.from({ length: 7 }, (_, index) => <i key={index} />)}</div>
}

export function Celebration() {
  return <div className={styles.celebration} aria-hidden="true">
    <span aria-hidden="true">✦</span><span aria-hidden="true">✧</span><span aria-hidden="true">✦</span>
  </div>
}
