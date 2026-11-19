import { formatMoney } from '../../domain/savings';
import { atRiskByCurrency } from '../../domain/selectors';
import type { Grave } from '../../domain/trial';

export interface AtRiskProps {
  graves: readonly Grave[];
  now: Date;
  className?: string;
}

/** "At risk this week: $X". Active, upcoming trials only. Renders nothing when nothing is at risk. */
export function AtRisk({ graves, now, className }: AtRiskProps) {
  const totals = atRiskByCurrency(graves, now);
  if (totals.length === 0) return null;
  return (
    <p className={className} data-testid="at-risk">
      At risk this week: <strong>{totals.map((t) => formatMoney(t.cents, t.currency)).join(', ')}</strong>
    </p>
  );
}
