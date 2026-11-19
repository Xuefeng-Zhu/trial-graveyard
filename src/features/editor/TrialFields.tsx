import { useId } from 'react'
import { cadences } from '../../domain/trial'
import type { FormValues } from './formValues'
import styles from './editor.module.css'

export function TrialFields({ values, change, errors = {}, autofocus = false, dateSource }: {
  values: FormValues; change: (values: FormValues) => void; errors?: Partial<Record<keyof FormValues, string>>;
  autofocus?: boolean; dateSource?: string;
}) {
  const id = useId()
  return <div className={styles.fields}>
    {([
      ['name', 'Service name', 'text', 'e.g. Phantomflix'],
      ['chargeAt', 'Charge date', 'date', ''],
      ['priceCents', 'Price', 'text', '0.00'],
      ['currency', 'Currency', 'text', 'USD'],
      ['cadence', 'Billing cadence', 'select', ''],
      ['cancelUrl', 'Cancellation URL', 'url', 'https://'],
    ] as const).map(([key, label, type, placeholder]) => {
      const error = errors[key]
      const fieldId = `${id}-${key}`
      const changeValue = (value: string) => change({ ...values, [key]: value })
      return <div className={styles.field} key={key}>
        <label htmlFor={fieldId}>{label}{key === 'cancelUrl' && <small> (optional)</small>}</label>
        {type === 'select'
          ? <select id={fieldId} value={values[key]} onChange={event => changeValue(event.target.value)}
            aria-invalid={!!error} aria-describedby={error ? `${fieldId}-error` : undefined}>
            {cadences.map(cadence => <option key={cadence} value={cadence}>{cadence}</option>)}
          </select>
          : <input id={fieldId} value={values[key]} onChange={event => changeValue(event.target.value)}
            type={type} placeholder={placeholder} autoComplete="off" autoFocus={autofocus && key === 'name'}
            inputMode={key === 'priceCents' ? 'decimal' : undefined}
            aria-invalid={!!error} aria-describedby={error ? `${fieldId}-error` : key === 'chargeAt' && dateSource ? `${fieldId}-source` : undefined} />}
        {key === 'chargeAt' && dateSource && <small id={`${fieldId}-source`}>Read from “{dateSource}”. Check this date before saving.</small>}
        {error && <small id={`${fieldId}-error`} className="danger">{error}</small>}
      </div>
    })}
  </div>
}
