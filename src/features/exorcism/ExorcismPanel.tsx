import { getCancelGuide } from '../../domain/cancelGuides'
import type { Grave } from '../../domain/trial'

export function ExorcismPanel({ grave, confirm }: { grave: Grave; confirm: () => void }) {
  const guide = getCancelGuide(grave.name, grave.cancelUrl)
  return <div className="stack">
    <h3>Cancel with the provider</h3>
    {guide.demo && <p className="muted">This fictional service uses a sample link.</p>}
    <ol className="stack">{guide.steps.map(step => <li key={step}>{step}</li>)}</ol>
    {guide.url
      ? <div><a className="button" href={guide.url} target="_blank" rel="noopener noreferrer">Open cancellation page</a></div>
      : <div><a className="button" href={guide.searchUrl} target="_blank" rel="noopener noreferrer">Open web search</a></div>}
    <p>Confirm after you have cancelled the trial with the provider.</p>
    <div><button className="primary" onClick={confirm}>It’s exorcised</button></div>
  </div>
}
