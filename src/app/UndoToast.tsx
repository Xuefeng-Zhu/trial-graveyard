import { useEffect } from 'react';
import { UNDO_WINDOW_MS } from '../state/store';
import styles from './app.module.css';

export interface UndoToastProps {
  /** Identifies the status change; a new value restarts the 10 s window. */
  changeKey: number;
  message: string;
  onUndo: () => void;
  onExpire: () => void;
}

export function UndoToast({ changeKey, message, onUndo, onExpire }: UndoToastProps) {
  useEffect(() => {
    const id = setTimeout(onExpire, UNDO_WINDOW_MS);
    return () => clearTimeout(id);
  }, [changeKey, onExpire]);

  return (
    <div role="status" className={styles.toast}>
      <span>{message}</span>
      <button type="button" className={styles.toastButton} onClick={onUndo}>
        Undo
      </button>
    </div>
  );
}
