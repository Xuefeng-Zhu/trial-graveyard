import type { ButtonHTMLAttributes } from 'react';
import styles from './pixel.module.css';

export interface PixelButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
}

/** Chunky pixel-bordered button. At least 44 px tall so it is easy to hit on touch screens. */
export function PixelButton({ variant = 'secondary', className = '', type = 'button', ...rest }: PixelButtonProps) {
  return <button type={type} className={`${styles.button} ${styles[variant]} ${className}`} {...rest} />;
}

/** Class names for links that should look like a PixelButton. */
export const pixelLinkClass = (variant: PixelButtonProps['variant'] = 'secondary'): string =>
  `${styles.button} ${styles[variant]}`;
