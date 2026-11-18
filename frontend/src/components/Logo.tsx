import { SITE_NAME } from '@/config/site';
import styles from './Logo.module.css';

/**
 * The mark: a souk archway with something for sale beneath it. Drawn in
 * currentColor so it follows the theme; the dot carries the accent.
 */
export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg
      className={styles.mark}
      width={size}
      height={size}
      viewBox="0 0 32 32"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="currentColor"
        d="M4 29V15C4 8.4 9.4 3 16 3s12 5.4 12 12v14h-7V15a5 5 0 0 0-10 0v14H4Z"
      />
      <circle className={styles.dot} cx="16" cy="23.5" r="4" />
    </svg>
  );
}

export function Logo({ size }: { size?: number }) {
  return (
    <span className={styles.logo}>
      <LogoMark size={size} />
      <span className={styles.word}>{SITE_NAME}</span>
    </span>
  );
}
