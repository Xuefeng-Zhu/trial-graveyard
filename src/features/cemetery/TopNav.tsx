import { PixelIcon, type IconName } from '../../design/pixel/PixelIcon'
import styles from '../../app/app.module.css'

export const screens = {
  graveyard: { label: 'Graveyard', icon: 'grave' },
  quests: { label: 'Quests', icon: 'quest' },
  collection: { label: 'Collection', icon: 'chest' },
  add: { label: 'Add trial', icon: 'plus' },
  savings: { label: 'Savings', icon: 'coin' },
  settings: { label: 'Settings', icon: 'gear' },
} as const satisfies Record<string, { label: string; icon: IconName }>

export type Screen = keyof typeof screens

export function TopNav({ screen, navigate }: { screen: Screen; navigate: (screen: Screen) => void }) {
  return <nav className={styles.nav} aria-label="Main navigation">
    {Object.entries(screens).map(([key, { label, icon }]) => <a key={key} href={`#${key}`} aria-current={screen === key ? 'page' : undefined}
      onClick={event => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
        event.preventDefault()
        navigate(key as Screen)
      }}>
      <PixelIcon name={icon} /><span>{label}</span>
    </a>)}
  </nav>
}
