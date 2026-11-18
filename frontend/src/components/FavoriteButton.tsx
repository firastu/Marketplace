'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Heart } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useFavorites } from '@/hooks/use-favorites';
import { loginHref } from '@/hooks/use-require-auth';
import { errorText, useToast } from '@/components/ui/Feedback';
import styles from './FavoriteButton.module.css';

interface Props {
  listingId: string;
  title: string;
  /** "overlay": round button on a photo. "button": labelled button. */
  variant?: 'overlay' | 'button';
}

export function FavoriteButton({ listingId, title, variant = 'overlay' }: Props) {
  const { user } = useAuth();
  const { isFavorite, toggle } = useFavorites();
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const on = isFavorite(listingId);

  const handleClick = async () => {
    if (!user) {
      router.push(loginHref(pathname));
      return;
    }
    setBusy(true);
    try {
      const nowOn = await toggle(listingId);
      toast(nowOn ? 'Saved to your favorites' : 'Removed from favorites', 'success');
    } catch (err) {
      toast(errorText(err, 'Could not update favorites'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const label = on ? `Remove ${title} from favorites` : `Save ${title} to favorites`;

  if (variant === 'button') {
    return (
      <button
        type="button"
        className={`btn ${styles.labelled}`}
        aria-pressed={on}
        disabled={busy}
        onClick={handleClick}
      >
        <Heart aria-hidden="true" className={on ? styles.on : undefined} />
        {on ? 'Saved' : 'Save'}
        <span className="visually-hidden">: {title}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      className={styles.overlay}
      aria-pressed={on}
      aria-label={label}
      disabled={busy}
      onClick={handleClick}
    >
      <Heart aria-hidden="true" className={on ? styles.on : undefined} />
    </button>
  );
}
