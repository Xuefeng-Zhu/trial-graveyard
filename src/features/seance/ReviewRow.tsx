import { useId } from 'react';
import { CADENCES } from '../../domain/trial';
import type { FormValues } from '../editor';
import { confidenceLabel } from './useSeance';
import type { ReviewItem } from './useSeance';
import styles from './seance.module.css';

export interface ReviewRowProps {
  item: ReviewItem;
  onChecked: (checked: boolean) => void;
  onEdit: (values: Partial<FormValues>) => void;
}

export function ReviewRow({ item, onChecked, onEdit }: ReviewRowProps) {
  const id = useId();
  const { values, errors } = item;
  const field = (key: keyof FormValues, label: string, type = 'text') => {
    const errId = `${id}-${key}-err`;
    return (
      <div className={styles.field}>
        <label htmlFor={`${id}-${key}`}>{label}</label>
        <input
          id={`${id}-${key}`}
          className={styles.input}
          type={type}
          value={values[key]}
          aria-invalid={errors[key] ? true : undefined}
          aria-describedby={errors[key] ? errId : undefined}
          onChange={(e) => onEdit({ [key]: e.target.value })}
        />
        {errors[key] && (
          <p id={errId} className={styles.error}>
            {errors[key]}
          </p>
        )}
      </div>
    );
  };

  return (
    <li className={styles.row}>
      <div className={styles.rowHead}>
        <input
          id={`${id}-pick`}
          type="checkbox"
          checked={item.checked}
          onChange={(e) => onChecked(e.target.checked)}
        />
        <label htmlFor={`${id}-pick`}>Bury {item.values.name || 'this trial'}</label>
        <span className={styles.badge}>{confidenceLabel(item.confidence)}</span>
      </div>
      <blockquote className={styles.snippet}>{item.snippet}</blockquote>
      <div className={styles.fields}>
        {field('name', 'Name')}
        {field('chargeAt', 'Charge date', 'date')}
        {field('price', 'Price')}
        <div className={styles.field}>
          <label htmlFor={`${id}-cadence`}>Cadence</label>
          <select
            id={`${id}-cadence`}
            className={styles.input}
            value={values.cadence}
            onChange={(e) => onEdit({ cadence: e.target.value })}
          >
            {CADENCES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>
    </li>
  );
}
