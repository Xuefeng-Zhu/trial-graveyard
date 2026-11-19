import { buildHauntingIcs } from '../../domain/haunting';
import { buildIcs } from '../../domain/ics';
import type { Grave } from '../../domain/trial';

/** Builds the .ics file and downloads it with a Blob and an anchor (design section 7). */
export function downloadIcs(graves: readonly Grave[], now: Date, filename: string): void {
  saveCalendar(buildIcs(graves, now), filename);
}

/** Downloads the haunting reminders (48 hours before and the morning of the charge) for one or many graves. */
export function downloadHauntingIcs(graves: readonly Grave[], now: Date, filename: string): void {
  saveCalendar(buildHauntingIcs(graves, now), filename);
}

function saveCalendar(text: string, filename: string): void {
  const blob = new Blob([text], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
