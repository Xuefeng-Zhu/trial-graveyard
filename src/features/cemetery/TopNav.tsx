import { Coin, Flame, Skull } from '../../design/pixel';
import styles from './cemetery.module.css';

export type View = 'graveyard' | 'quests' | 'collection' | 'add' | 'savings' | 'settings';

export const NAV_ITEMS: ReadonlyArray<{ view: View; label: string }> = [
  { view: 'graveyard', label: 'Graveyard' },
  { view: 'quests', label: 'Quests' },
  { view: 'collection', label: 'Collection' },
  { view: 'add', label: 'Add trial' },
  { view: 'savings', label: 'Savings' },
  { view: 'settings', label: 'Settings' },
];

export interface TopNavProps {
  view: View;
  onView: (view: View) => void;
  level: number;
  /** e.g. "$127.00 saved" */
  saved: string;
}

/**
 * Header and navigation in one place. On wide screens the nav is a pill in the top HUD.
 * On phones the same nav sits at the bottom and the header stays compact.
 */
export function TopNav({ view, onView, level, saved }: TopNavProps) {
  return (
    <header className={styles.hud}>
      <h1 className={styles.logo}>
        <Skull scale={3} />
        <span>Trial Graveyard</span>
      </h1>
      <nav className={styles.nav} aria-label="Main">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.view}
            type="button"
            className={`${styles.navItem} ${styles[`nav-${item.view}`] ?? ''}`}
            aria-label={item.view === 'add' ? item.label : undefined}
            aria-current={view === item.view ? 'page' : undefined}
            onClick={() => onView(item.view)}
          >
            {view === item.view && (
              <span className={styles.navMarker} aria-hidden="true">
                {'\u25B6'}
              </span>
            )}
            {item.view === 'add' ? (
              <>
                <span className={styles.full}>{item.label}</span>
                <span className={styles.short} aria-hidden="true">
                  Add
                </span>
              </>
            ) : (
              item.label
            )}
          </button>
        ))}
      </nav>
      <div className={styles.stats}>
        <button
          type="button"
          className={styles.level}
          aria-label={`Level ${level}, open collection`}
          onClick={() => onView('collection')}
        >
          <Flame scale={2} />
          <span aria-hidden="true">Lv. {level}</span>
        </button>
        <p className={styles.saved} data-testid="saved-counter">
          <Coin scale={2} />
          <span>{saved}</span>
        </p>
      </div>
    </header>
  );
}
