import { dailyQuest } from '../../domain/xp';
import type { XpEntry } from '../../domain/xp';
import { toLocalIso } from '../../domain/trial';
import type { Grave } from '../../domain/trial';
import { PixelButton, REAPER_URL, REAPER_SIZE, Scroll } from '../../design/pixel';
import { nextToRise, statusText } from './format';
import styles from './cemetery.module.css';

export interface BottomHudProps {
  graves: readonly Grave[];
  now: Date;
  ledger: readonly XpEntry[];
  motion: boolean;
  onOpenQuests: () => void;
  onExorcise: (id: string) => void;
}

/** Reaper, daily quest, upcoming charge and the big Exorcise action. */
export function BottomHud({ graves, now, ledger, motion, onOpenQuests, onExorcise }: BottomHudProps) {
  const quest = dailyQuest(ledger, toLocalIso(now));
  const active = graves.filter((g) => g.status === 'active');
  const next = nextToRise(graves);
  return (
    <div className={styles.bottomHud} data-testid="bottom-hud">
      <button type="button" className={styles.quest} onClick={onOpenQuests}>
        <Scroll scale={3} />
        <span className={styles.questText}>
          <span className={styles.questTitle}>Daily Quest</span>
          <span>{quest.label}</span>
        </span>
      </button>
      <div className={styles.upcoming} aria-live="polite">
        {next ? (
          <>
            <span className={styles.upcomingTitle}>Next charge</span>
            <span>
              {next.name}: {statusText(next, now)}
            </span>
          </>
        ) : (
          <span>Nothing is stirring.</span>
        )}
      </div>
      <img
        className={styles.reaper}
        src={REAPER_URL}
        width={REAPER_SIZE.width}
        height={REAPER_SIZE.height}
        alt=""
        data-motion={motion ? 'animated' : 'still'}
      />
      <PixelButton
        variant="primary"
        className={styles.exorcise}
        disabled={!next}
        aria-describedby={next ? undefined : 'exorcise-none'}
        onClick={() => next && onExorcise(next.id)}
      >
        Exorcise Trials ({active.length})
      </PixelButton>
      {!next && (
        <span id="exorcise-none" className={styles.srOnly}>
          No active trials to exorcise.
        </span>
      )}
    </div>
  );
}
