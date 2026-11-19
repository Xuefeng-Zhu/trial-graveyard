import type { Candidate } from '../../lib/email'
import { validateTrial, type TrialInput } from '../../domain/trial'
import { TrialFields } from '../editor/TrialFields'
import { formToTrial, type FormValues } from '../editor/formValues'
import styles from './seance.module.css'

export interface Row { candidate: Candidate; selected: boolean; values: FormValues }

export function ReviewRow({ row, onChange, attempted, onDuplicate }: {
  row: Row; onChange: (row: Row) => void; attempted: boolean; onDuplicate?: (input: TrialInput) => boolean;
}) {
  const { candidate, values, selected } = row
  const faint = candidate.confidence < .5
  const input = formToTrial(values)
  const errors = attempted && selected ? validateTrial(input) : undefined
  const duplicate = attempted && selected && !Object.keys(errors ?? {}).length && onDuplicate?.(input)
  return <fieldset className={styles.row}>
    <legend>{candidate.fields.name}</legend>
    <label className={styles.check}><input type="checkbox" checked={selected} onChange={event => onChange({ ...row, selected: event.target.checked })} />
      Select {candidate.fields.name}</label>
    <span className={styles.badge}>{faint ? 'Faint spirit' : 'Strong spirit'} · {Math.round(candidate.confidence * 100)}%</span>
    <p className="muted">{candidate.snippet}</p>
    <TrialFields values={values} change={next => onChange({ ...row, values: next })} errors={errors} />
    {duplicate && <p className="danger">A selected trial already has this service and charge date.</p>}
  </fieldset>
}
