import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { CADENCES, validateTrial } from '../../domain/trial';
import type { TrialErrors, TrialField, ValidTrial } from '../../domain/trial';
import { EMPTY_VALUES } from './formValues';
import type { FormValues } from './formValues';
import styles from './editor.module.css';

export interface GraveFormProps {
  initial?: FormValues;
  /** Merged into the form whenever `prefillVersion` changes (used by the paste box). */
  prefill?: Partial<FormValues>;
  prefillVersion?: number;
  /** Focus the name field on mount. Defaults to true. */
  autoFocus?: boolean;
  submitLabel?: string;
  onSubmit: (trial: ValidTrial) => void;
  onCancel?: () => void;
}

const FIELD_ORDER: TrialField[] = ['name', 'chargeAt', 'price', 'currency', 'cadence', 'cancelUrl'];

export function GraveForm({
  initial = EMPTY_VALUES,
  prefill,
  prefillVersion = 0,
  autoFocus = true,
  submitLabel = 'Bury it in the graveyard',
  onSubmit,
  onCancel,
}: GraveFormProps) {
  const [values, setValues] = useState<FormValues>(initial);
  const [errors, setErrors] = useState<TrialErrors>({});
  const formRef = useRef<HTMLFormElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  // R1.4: the name field has focus when the editor opens.
  useEffect(() => {
    if (autoFocus) nameRef.current?.focus();
    // Only on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (prefillVersion > 0 && prefill) setValues((v) => ({ ...v, ...prefill }));
    // Only re-run when a new paste result arrives.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefillVersion]);

  const set = (field: keyof FormValues) => (value: string) => {
    setValues((v) => ({ ...v, [field]: value }));
    setErrors((e) => {
      if (!e[field]) return e;
      const { [field]: _removed, ...rest } = e;
      return rest;
    });
  };

  const handleSubmit = (event: FormEvent): void => {
    event.preventDefault();
    const result = validateTrial(values);
    if (!result.ok) {
      setErrors(result.errors);
      const first = FIELD_ORDER.find((f) => result.errors[f]);
      if (first) formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      return;
    }
    setErrors({});
    onSubmit(result.value);
    setValues(initial);
    nameRef.current?.focus();
  };

  const field = (
    name: keyof FormValues,
    label: string,
    input: (props: Record<string, unknown>) => JSX.Element,
  ) => {
    const id = `grave-form-${name}`;
    const error = errors[name];
    const props = {
      id,
      name,
      className: styles.input,
      'aria-invalid': error ? true : undefined,
      'aria-describedby': error ? `${id}-error` : undefined,
    };
    return (
      <div className={styles.field}>
        <label htmlFor={id}>{label}</label>
        {input(props)}
        {error && (
          <p id={`${id}-error`} className={styles.error} role="alert">
            {error}
          </p>
        )}
      </div>
    );
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate className={styles.form} aria-label="Grave details">
      {field('name', 'Name', (p) => (
        <input
          {...p}
          ref={nameRef}
          type="text"
          autoComplete="off"
          value={values.name}
          onChange={(e) => set('name')(e.target.value)}
        />
      ))}
      {field('chargeAt', 'Charge date', (p) => (
        <input {...p} type="date" value={values.chargeAt} onChange={(e) => set('chargeAt')(e.target.value)} />
      ))}
      {field('price', 'Price', (p) => (
        <input
          {...p}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={values.price}
          onChange={(e) => set('price')(e.target.value)}
        />
      ))}
      {field('currency', 'Currency', (p) => (
        <input
          {...p}
          type="text"
          maxLength={3}
          autoComplete="off"
          value={values.currency}
          onChange={(e) => set('currency')(e.target.value)}
        />
      ))}
      {field('cadence', 'Cadence', (p) => (
        <select {...p} value={values.cadence} onChange={(e) => set('cadence')(e.target.value)}>
          {CADENCES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      ))}
      {field('cancelUrl', 'Cancel URL (optional)', (p) => (
        <input
          {...p}
          type="text"
          inputMode="url"
          autoComplete="off"
          placeholder="https://"
          value={values.cancelUrl}
          onChange={(e) => set('cancelUrl')(e.target.value)}
        />
      ))}
      <div className={styles.actions}>
        <button type="submit" className={styles.primary}>
          {submitLabel}
        </button>
        {onCancel && (
          <button type="button" className={styles.secondary} onClick={onCancel}>
            Never mind
          </button>
        )}
      </div>
    </form>
  );
}
