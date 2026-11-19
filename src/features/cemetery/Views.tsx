import type { ReactNode } from 'react';
import { dailyQuest, DECORATIONS, GRAVESTONE_STYLES, XP_VALUES } from '../../domain/xp';
import type { Progress, XpEntry } from '../../domain/xp';
import { toLocalIso } from '../../domain/trial';
import type { Grave } from '../../domain/trial';
import { Decoration, PixelBadge, PixelButton, PixelPanel, GravestoneArt, Scroll } from '../../design/pixel';
import { CountdownHero, StatsPanel } from '../haunting';
import { Mausoleum } from '../graveyard';
import { nextToRise, statusText } from './format';
import styles from './cemetery.module.css';

export interface QuestsViewProps {
  progress: Progress;
  ledger: readonly XpEntry[];
  graves: readonly Grave[];
  now: Date;
  onExorcise: (id: string) => void;
}

export function QuestsView({ progress, ledger, graves, now, onExorcise }: QuestsViewProps) {
  const quest = dailyQuest(ledger, toLocalIso(now));
  const next = nextToRise(graves);
  return (
    <div className={styles.viewGrid}>
      <PixelPanel title="Daily quest">
        <p className={styles.questLine}>
          <Scroll scale={3} /> <strong>{quest.label}</strong>
        </p>
        <progress className={styles.bar} max={quest.goal} value={quest.done} aria-label="Daily quest progress" />
        <p>{quest.complete ? 'Done for today. Rest easy.' : 'Resets every day. No streaks, no pressure.'}</p>
        {next ? (
          <PixelButton variant="primary" onClick={() => onExorcise(next.id)}>
            Exorcise {next.name}
          </PixelButton>
        ) : (
          <p>Nothing is stirring. Every grave is quiet.</p>
        )}
      </PixelPanel>
      <PixelPanel title="Level and XP">
        <p>
          <strong>Level {progress.level}</strong>, {progress.xp} XP
        </p>
        <progress
          className={styles.bar}
          max={1}
          value={progress.progress}
          aria-label={`Progress to level ${progress.level + 1}`}
        />
        <ul className={styles.plain}>
          <li>Add a trial: {XP_VALUES.add} XP</li>
          <li>Review a trial: {XP_VALUES.review} XP</li>
          <li>Confirm a cancellation: {XP_VALUES.cancel} XP</li>
        </ul>
        <p className={styles.hint}>XP is only for fun. It never changes your savings.</p>
        {next && (
          <p>
            Next to rise: <strong>{next.name}</strong> ({statusText(next, now)})
          </p>
        )}
      </PixelPanel>
    </div>
  );
}

export interface CollectionViewProps {
  progress: Progress;
  styleId: string;
  onSelectStyle: (id: string) => void;
}

export function CollectionView({ progress, styleId, onSelectStyle }: CollectionViewProps) {
  return (
    <div className={styles.viewGrid}>
      <PixelPanel title="Gravestone styles">
        <ul className={styles.collection}>
          {GRAVESTONE_STYLES.map((s) => {
            const unlocked = progress.level >= s.level;
            return (
              <li key={s.id} className={styles.collectItem}>
                <GravestoneArt kind="normal" styleId={s.id} scale={3} />
                <PixelButton
                  className={unlocked ? undefined : styles.lockedButton}
                  aria-pressed={styleId === s.id}
                  disabled={!unlocked}
                  onClick={() => onSelectStyle(s.id)}
                >
                  {s.label}
                </PixelButton>
                {!unlocked && <PixelBadge>Locked: unlocks at level {s.level}</PixelBadge>}
              </li>
            );
          })}
        </ul>
      </PixelPanel>
      <PixelPanel title="Decorations">
        <ul className={styles.collection}>
          {DECORATIONS.map((d) => {
            const unlocked = progress.level >= d.level;
            return (
              <li key={d.id} className={`${styles.collectItem} ${unlocked ? '' : styles.locked}`}>
                <Decoration id={d.id} />
                <span>{d.label}</span>
                <PixelBadge tone={unlocked ? 'success' : 'neutral'}>
                  {unlocked ? 'Unlocked' : `Locked: unlocks at level ${d.level}`}
                </PixelBadge>
              </li>
            );
          })}
        </ul>
      </PixelPanel>
    </div>
  );
}

export interface SavingsViewProps {
  graves: readonly Grave[];
  now: Date;
  motion: boolean;
  onExport: (graves: Grave[], filename: string) => void;
  onHaunt: (graves: Grave[], filename: string) => void;
  share: ReactNode;
}

export function SavingsView({ graves, now, motion, onExport, onHaunt, share }: SavingsViewProps) {
  const active = graves.filter((g) => g.status === 'active');
  return (
    <div className={styles.viewGrid}>
      <PixelPanel aria-label="Savings">
        <Mausoleum graves={graves} reduced={!motion} />
      </PixelPanel>
      <PixelPanel>
        <CountdownHero graves={graves} now={now} reducedMotion={!motion} />
      </PixelPanel>
      <PixelPanel>
        <StatsPanel graves={graves} now={now} />
      </PixelPanel>
      <PixelPanel title="Share and export">
        <div className={styles.row}>
          {share}
          {active.length > 0 && (
            <>
              <PixelButton onClick={() => onExport(active, 'trial-graveyard.ics')}>
                Export all active to calendar
              </PixelButton>
              <PixelButton onClick={() => onHaunt(active, 'trial-graveyard-hauntings.ics')}>
                Export all hauntings
              </PixelButton>
            </>
          )}
        </div>
      </PixelPanel>
    </div>
  );
}

export interface SettingsViewProps {
  daylight: boolean;
  soundOn: boolean;
  calm: boolean;
  onToggleDaylight: () => void;
  onToggleSound: () => void;
  onToggleCalm: () => void;
  onSummon: () => void;
}

export function SettingsView(p: SettingsViewProps) {
  return (
    <PixelPanel title="Settings">
      <div className={styles.row}>
        <PixelButton aria-pressed={p.daylight} onClick={p.onToggleDaylight}>
          {p.daylight ? 'Daylight mode: on' : 'Daylight mode: off'}
        </PixelButton>
        <PixelButton aria-pressed={p.calm} onClick={p.onToggleCalm}>
          {p.calm ? 'Calm mode: on' : 'Calm mode: off'}
        </PixelButton>
        <PixelButton aria-pressed={p.soundOn} onClick={p.onToggleSound}>
          {p.soundOn ? 'Sound: on' : 'Sound: off'}
        </PixelButton>
        <PixelButton onClick={p.onSummon}>Summon demo graveyard</PixelButton>
      </div>
      <p className={styles.hint}>
        Daylight swaps the pixel scene for a plain list. Calm stops all decorative motion. Sound is off until you turn
        it on.
      </p>
    </PixelPanel>
  );
}
