import { buildIcs } from '../../domain/ics';
import type { Grave } from '../../domain/trial';

/** Builds the .ics file and downloads it with a Blob and an anchor (design section 7). */
export function downloadIcs(graves: readonly Grave[], now: Date, filename: string): void {
  const blob = new Blob([buildIcs(graves, now)], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
