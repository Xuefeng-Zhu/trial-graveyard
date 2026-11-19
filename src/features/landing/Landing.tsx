import styles from './landing.module.css'

export function Landing({ onSummon, onAdd, daylight, reduced }: {
  onSummon: () => void; onAdd: () => void; daylight: boolean; reduced: boolean;
}) {
  return <section className={styles.landing} data-daylight-landing={daylight}>
    <div className={styles.content}>
      <h1>Trial Graveyard</h1>
      <p>Every free trial is a grave. Cancel before it rises.</p>
      <div className="actions"><button className="primary" onClick={onSummon}>Summon demo graveyard</button>
        <button onClick={onAdd}>Add your first trial</button></div>
    </div>
    {!daylight && <img data-static={reduced} className={`${styles.reaper} pixel`} width="147" height="168" alt=""
      src={`${import.meta.env.BASE_URL}pixel/reaper.png`} />}
  </section>
}
