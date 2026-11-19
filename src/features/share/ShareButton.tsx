import { useState } from 'react'
import { buildShareSummary } from '../../domain/shareCard'
import type { Grave } from '../../domain/trial'
import { downloadFile } from '../daylight/downloadIcs'
import { drawShareCard } from './drawShareCard'

export function ShareButton({ graves }: { graves: Grave[] }) {
  const [notice, setNotice] = useState('')
  const [pending, setPending] = useState(false)
  const summary = buildShareSummary(graves)
  if (!summary.slain) return null

  async function share() {
    setPending(true)
    setNotice('')
    try {
      const blob = await drawShareCard(summary)
      const file = new File([blob], 'my-graveyard.png', { type: 'image/png' })
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], text: '#KiroweenHackathon26' })
          setNotice('Graveyard card shared.')
          return
        } catch (error) {
          if (error && typeof error === 'object' && 'name' in error && error.name === 'AbortError') return
        }
      }
      downloadFile(blob, file.name)
      setNotice('Graveyard card downloaded.')
    } catch {
      setNotice('The graveyard card could not be drawn in this browser.')
    } finally { setPending(false) }
  }

  return <div className="stack">
    <div><button disabled={pending} onClick={share}>Share my graveyard</button></div>
    <p className="status" role="status">{notice}</p>
  </div>
}
