import { PixelIcon } from '../../design/pixel/PixelIcon'
export function SeanceButton({ onOpen }: { onOpen: () => void }) {
  return <button type="button" onClick={onOpen}><PixelIcon name="crystal" />&nbsp;Inbox Séance</button>
}
