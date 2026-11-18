'use client';

import { Languages } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { LOCALE_NAMES, LOCALE_SHORT_NAMES, LOCALES } from '@/i18n/config';

interface Props {
  className?: string;
  /**
   * Also render the short name ("EN" / "عربي"). The parent's CSS decides
   * which of `[data-label="short"]` and `[data-label="full"]` is visible.
   */
  responsive?: boolean;
  onSwitch?: () => void;
}

/**
 * Switches between Arabic and English and stays on the same page. It is a
 * real link to the other language's URL (crawlable, works without JS); the
 * click handler only adds the current query string and hash, which the
 * server-rendered link cannot know. The choice is remembered in a cookie.
 */
export function LanguageSwitcher({ className, responsive, onSwitch }: Props) {
  const locale = useLocale();
  const t = useTranslations('nav');
  const pathname = usePathname();
  const router = useRouter();
  const other = LOCALES.find((l) => l !== locale) ?? locale;
  const name = LOCALE_NAMES[other];

  return (
    <Link
      href={pathname}
      locale={other}
      hrefLang={other}
      lang={other}
      className={className}
      aria-label={t('switchLanguage', { language: name })}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        onSwitch?.();
        const { search, hash } = window.location;
        router.replace(`${pathname}${search}${hash}`, { locale: other, scroll: false });
      }}
    >
      <Languages aria-hidden="true" />
      {responsive && <span data-label="short">{LOCALE_SHORT_NAMES[other]}</span>}
      <span data-label="full">{name}</span>
    </Link>
  );
}
