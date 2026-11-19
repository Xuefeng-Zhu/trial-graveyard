import { useState, type FormEvent } from 'react'
import { validateTrial, type Grave, type TrialInput } from '../../domain/trial'
import { emptyValues, fromGrave, formToTrial, type FormValues } from './formValues'
import { TrialFields } from './TrialFields'

export function GraveForm({ grave, values, change, onSave, dateSource }: {
  grave?: Grave; values?: FormValues; change?: (values: FormValues) => void;
  onSave: (input: TrialInput) => void; dateSource?: string;
}) {
  const [local, setLocal] = useState(() => grave ? fromGrave(grave) : emptyValues)
  const [submitted, setSubmitted] = useState(false)
  const current = values ?? local
  const trial = formToTrial(current, grave)
  const errors = validateTrial(trial)
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitted(true)
    const invalid = Object.keys(errors)[0]
    if (invalid) {
      event.currentTarget.querySelector<HTMLElement>(`[id$="-${invalid}"]`)?.focus()
      return
    }
    onSave(trial)
  }
  return <form className="stack" noValidate onSubmit={submit}>
    <TrialFields values={current} change={change ?? setLocal} errors={submitted ? errors : undefined} autofocus dateSource={dateSource} />
    <div className="actions"><button className="primary" type="submit">{grave ? 'Save changes' : 'Bury trial'}</button></div>
  </form>
}
