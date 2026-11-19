export function SeanceButton({ onOpen }: { onOpen: () => void }) {
  return <button type="button" onClick={onOpen}><span aria-hidden="true">✤&nbsp;</span>Inbox Séance</button>
}
