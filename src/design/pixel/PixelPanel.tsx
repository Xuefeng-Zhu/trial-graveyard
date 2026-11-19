import type { HTMLAttributes, ReactNode } from 'react';
import styles from './pixel.module.css';

export interface PixelPanelProps extends HTMLAttributes<HTMLElement> {
  /** Heading text. Renders an h2 and labels the section with it. */
  title?: string;
  headingId?: string;
  children: ReactNode;
}

/** A framed panel with stepped pixel corners. */
export function PixelPanel({ title, headingId, children, className = '', ...rest }: PixelPanelProps) {
  const id = headingId ?? (title ? `panel-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}` : undefined);
  return (
    <section className={`${styles.panel} ${className}`} aria-labelledby={title ? id : undefined} {...rest}>
      {title && (
        <h2 id={id} className={styles.panelTitle}>
          {title}
        </h2>
      )}
      {children}
    </section>
  );
}
