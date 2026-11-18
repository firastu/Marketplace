'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useErrorText } from '@/i18n/errors';
import { Link } from '@/i18n/navigation';
import { useFormat } from '@/i18n/use-format';
import { ImageOff, MessagesSquare, WifiOff } from 'lucide-react';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { useInboxSocket } from '@/hooks/use-socket';
import { getImageUrl } from '@/services/listings.service';
import { Conversation, getMyConversations } from '@/services/messages.service';
import { Avatar } from '@/components/bits';
import { Button, buttonClass } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import styles from './page.module.css';

type State = { conversations: Conversation[] } | { error: unknown } | null;

export default function MessagesPage() {
  const { user } = useRequireAuth();
  const [state, setState] = useState<State>(null);
  const userId = user?.id;
  const t = useTranslations('inbox');
  const tc = useTranslations('common');
  const fmt = useFormat();
  const errorText = useErrorText();

  const load = useCallback(() => {
    getMyConversations()
      .then((conversations) => setState({ conversations }))
      .catch((error) =>
        // Keep showing what we have if a background refresh fails.
        setState((prev) => (prev && 'conversations' in prev ? prev : { error })),
      );
  }, []);

  useEffect(() => {
    if (userId) load();
  }, [userId, load]);

  // WebSocket — refresh the inbox when a conversation gets a new message
  useInboxSocket(load);

  return (
    <div className="container page page--narrow">
      <div className="page-title">
        <h1>{t('title')}</h1>
      </div>

      {(!user || state === null) && (
        <ul className={styles.list} aria-busy="true" aria-label={t('loading')}>
          {Array.from({ length: 5 }, (_, i) => (
            <li key={i} className={`skeleton ${styles.rowSkeleton}`} />
          ))}
        </ul>
      )}

      {state && 'error' in state && (
        <EmptyState
          icon={WifiOff}
          title={t('loadErrorTitle')}
          actions={
            <Button
              variant="primary"
              onClick={() => {
                setState(null);
                load();
              }}
            >
              {tc('tryAgain')}
            </Button>
          }
        >
          {errorText(state.error)}
        </EmptyState>
      )}

      {user && state && 'conversations' in state && state.conversations.length === 0 && (
        <EmptyState
          icon={MessagesSquare}
          title={t('emptyTitle')}
          actions={
            <Link href="/" className={buttonClass({ variant: 'primary' })}>
              {tc('browseListings')}
            </Link>
          }
        >
          {t('emptyBody')}
        </EmptyState>
      )}

      {user && state && 'conversations' in state && state.conversations.length > 0 && (
        <ul className={styles.list}>
          {state.conversations.map((conv) => {
            const other = conv.buyerId === user.id ? conv.seller : conv.buyer;
            const otherName = other?.displayName || other?.username || tc('user');
            const unread = conv.unreadCount ?? 0;
            const cover = conv.listing?.images?.[0];
            const last = conv.lastMessage;
            const listingTitle = conv.listing?.title ?? tc('listing');
            return (
              <li key={conv.id}>
                <Link
                  href={`/messages/${conv.id}`}
                  className={styles.row}
                  data-unread={unread > 0 || undefined}
                >
                  <span className={styles.thumb}>
                    {cover ? (
                      <img src={getImageUrl(cover, 'thumb')} alt="" loading="lazy" />
                    ) : (
                      <ImageOff aria-hidden="true" />
                    )}
                    <span className={styles.who}>
                      <Avatar name={otherName} size="sm" />
                    </span>
                  </span>
                  <span className={styles.text}>
                    <span className={styles.top}>
                      <span className={`${styles.name} clamp-1`} dir="auto">
                        {otherName}
                      </span>
                      <time className={styles.when} dateTime={conv.lastMessageAt}>
                        {fmt.shortWhen(last?.createdAt ?? conv.lastMessageAt)}
                      </time>
                    </span>
                    <span className={`${styles.listing} clamp-1`} dir="auto">
                      {conv.listing?.deletedAt
                        ? t('deleted', { title: listingTitle })
                        : listingTitle}
                    </span>
                    <span className={styles.bottom}>
                      <span className={`${styles.preview} clamp-1`} dir="auto">
                        {!last
                          ? t('noMessages')
                          : last.senderId === user.id
                            ? t('you', { text: last.body })
                            : last.body}
                      </span>
                      {unread > 0 && (
                        <span className="count-dot">
                          {unread > 99 ? '99+' : fmt.number(unread)}
                          <span className="visually-hidden"> {t('unread')}</span>
                        </span>
                      )}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
