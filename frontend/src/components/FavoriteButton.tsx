'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useErrorText } from '@/i18n/errors';
import { usePathname, useRouter } from '@/i18n/navigation';
import { Heart } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useFavorites } from '@/hooks/use-favorites';
import { loginHref } from '@/hooks/use-require-auth';
import { useToast } from '@/components/ui/Feedback';
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
  const t = useTranslations();
  const errorText = useErrorText();
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
      toast(nowOn ? t('feedback.favoriteAdded') : t('feedback.favoriteRemoved'), 'success');
    } catch (err) {
      toast(errorText(err, t('feedback.favoriteFailed')), 'error');
    } finally {
      setBusy(false);
    }
  };

  const label = t(on ? 'bits.favorite.remove' : 'bits.favorite.add', { title });

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
        <span aria-hidden="true">{on ? t('bits.favorite.saved') : t('bits.favorite.save')}</span>
        <span className="visually-hidden">{label}</span>
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
