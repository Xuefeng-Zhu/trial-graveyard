import { useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { PixelButton } from '../../design/pixel';
import { BACKUP_ERROR, parseBackup } from '../../state/backup';
import type { ImportMode } from '../../state/backup';
import type { PersistedSlice } from '../../state/storage';
import styles from './cemetery.module.css';

export const CLEAR_PHRASE = 'DELETE';

export interface DataToolsProps {
  onExport: () => void;
  onImport: (data: PersistedSlice, mode: ImportMode) => void;
  onClear: () => void;
}

/** Export, import and reset controls for the on-device data. */
export function DataTools({ onExport, onImport, onClear }: DataToolsProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<PersistedSlice | null>(null);
  const [message, setMessage] = useState('');
  const [clearing, setClearing] = useState(false);
  const [typed, setTyped] = useState('');

  const pick = async (e: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    let text = '';
    try {
      text = await file.text();
    } catch {
      text = '';
    }
    const result = parseBackup(text);
    if (result.ok) {
      setPending(result.data);
      setMessage('');
    } else {
      setPending(null);
      setMessage(result.error || BACKUP_ERROR);
    }
  };

  const choose = (mode: ImportMode): void => {
    if (!pending) return;
    onImport(pending, mode);
    setMessage(
      mode === 'merge'
        ? `Merged ${pending.graves.length} graves from the backup.`
        : `Replaced your graveyard with ${pending.graves.length} graves from the backup.`,
    );
    setPending(null);
  };

  const closeClear = (): void => {
    setClearing(false);
    setTyped('');
  };

  return (
    <section aria-labelledby="data-heading" className={styles.dataTools}>
      <h3 id="data-heading">Your data</h3>
      <p className={styles.hint}>Everything lives on this device only. Export a backup before clearing or switching browsers.</p>
      <div className={styles.row}>
        <PixelButton onClick={onExport}>Export graveyard (JSON)</PixelButton>
        <PixelButton onClick={() => fileRef.current?.click()}>Import graveyard (JSON)</PixelButton>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          aria-label="Graveyard backup file"
          className={styles.srOnly}
          tabIndex={-1}
          onChange={(e) => void pick(e)}
        />
        <PixelButton variant="danger" onClick={() => setClearing(true)}>
          Clear all data
        </PixelButton>
      </div>

      {pending && (
        <div role="group" aria-label="Import options" className={styles.dataBox}>
          <p>
            This backup holds {pending.graves.length} graves. Merge adds the ones you do not have yet. Replace swaps your
            whole graveyard for the backup.
          </p>
          <div className={styles.row}>
            <PixelButton onClick={() => choose('merge')}>Merge</PixelButton>
            <PixelButton variant="danger" onClick={() => choose('replace')}>
              Replace
            </PixelButton>
            <PixelButton variant="ghost" onClick={() => setPending(null)}>
              Cancel import
            </PixelButton>
          </div>
        </div>
      )}

      {clearing && (
        <div role="group" aria-label="Confirm clear all data" className={styles.dataBox}>
          <p>This deletes every grave and all progress, and cannot be undone. Type {CLEAR_PHRASE} to confirm.</p>
          <label>
            Confirmation
            <input value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
          </label>
          <div className={styles.row}>
            <PixelButton
              variant="danger"
              disabled={typed.trim() !== CLEAR_PHRASE}
              onClick={() => {
                onClear();
                closeClear();
                setMessage('The graveyard is empty.');
              }}
            >
              Clear everything
            </PixelButton>
            <PixelButton variant="ghost" onClick={closeClear}>
              Keep my data
            </PixelButton>
          </div>
        </div>
      )}

      {message && <p role="status">{message}</p>}
    </section>
  );
}
