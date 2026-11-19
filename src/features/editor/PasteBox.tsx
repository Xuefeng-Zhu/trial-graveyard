import { useId, useState, type ReactNode } from 'react'
import { parseWithFallback, type ParseResult } from '../../lib/parse'
import { useGraveyard } from '../../state/store'
import styles from './editor.module.css'

export function PasteBox({ now, onParsed, extra }: { now: Date; onParsed: (parsed: ParseResult) => void; extra?: ReactNode }) {
  const id = useId()
  const [text, setText] = useState('')
  const [message, setMessage] = useState('')
  const enabled = useGraveyard(state => state.settings.llmFallback)
  async function parse() {
    const result = await parseWithFallback(text, now, enabled)
    if (Object.keys(result).length) {
      onParsed(result)
      setMessage('Fields filled. Review them before saving.')
    } else setMessage('Nothing haunting here. Try the form instead.')
  }
  return <section className={styles.reader} aria-label="Receipt reader">
    <label htmlFor={id}>Paste a receipt</label>
    <textarea id={id} value={text} onChange={event => setText(event.target.value)} placeholder="Paste a confirmation email or receipt…" maxLength={50_000} />
    <div className="actions"><button type="button" onClick={parse}>Read receipt</button>{extra}</div>
    <p role="status" className="status">{message}</p>
  </section>
}
