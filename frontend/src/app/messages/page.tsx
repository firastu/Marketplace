'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ImageOff, MessagesSquare, WifiOff } from 'lucide-react';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { useInboxSocket } from '@/hooks/use-socket';
import { getImageUrl } from '@/services/listings.service';
import { Conversation, getMyConversations } from '@/services/messages.service';
import { shortWhen } from '@/utils/format';
import { Avatar } from '@/components/bits';
import { Button, buttonClass } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { errorText } from '@/components/ui/Feedback';
import styles from './page.module.css';

type State = { conversations: Conversation[] } | { error: string } | null;

export default function MessagesPage() {
  const { user } = useRequireAuth();
  const [state, setState] = useState<State>(null);
  const userId = user?.id;

  const load = useCallback(() => {
    getMyConversations()
      .then((conversations) => setState({ conversations }))
      .catch((err) =>
        // Keep showing what we have if a background refresh fails.
        setState((prev) =>
          prev && 'conversations' in prev
            ? prev
            : { error: errorText(err, 'Could not load your chats') },
        ),
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
        <h1>Chats</h1>
      </div>

      {(!user || state === null) && (
        <ul className={styles.list} aria-busy="true" aria-label="Loading chats">
          {Array.from({ length: 5 }, (_, i) => (
            <li key={i} className={`skeleton ${styles.rowSkeleton}`} />
          ))}
        </ul>
      )}

      {state && 'error' in state && (
        <EmptyState
          icon={WifiOff}
          title="Could not load your chats"
          actions={
            <Button
              variant="primary"
              onClick={() => {
                setState(null);
                load();
              }}
            >
              Try again
            </Button>
          }
        >
          {state.error}
        </EmptyState>
      )}

      {user && state && 'conversations' in state && state.conversations.length === 0 && (
        <EmptyState
          icon={MessagesSquare}
          title="No chats yet"
          actions={
            <Link href="/" className={buttonClass({ variant: 'primary' })}>
              Browse listings
            </Link>
          }
        >
          Message a seller from any listing and the conversation shows up here.
        </EmptyState>
      )}

      {user && state && 'conversations' in state && state.conversations.length > 0 && (
        <ul className={styles.list}>
          {state.conversations.map((conv) => {
            const other = conv.buyerId === user.id ? conv.seller : conv.buyer;
            const otherName = other?.displayName || other?.username || 'User';
            const unread = conv.unreadCount ?? 0;
            const cover = conv.listing?.images?.[0];
            const last = conv.lastMessage;
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
                      <time className={styles.when} dateTime={conv.lastMessageAt} dir="ltr">
                        {shortWhen(last?.createdAt ?? conv.lastMessageAt)}
                      </time>
                    </span>
                    <span className={`${styles.listing} clamp-1`} dir="auto">
                      {conv.listing?.title ?? 'Listing'}
                      {conv.listing?.deletedAt && ' (deleted)'}
                    </span>
                    <span className={styles.bottom}>
                      <span className={`${styles.preview} clamp-1`} dir="auto">
                        {last ? (
                          <>
                            {last.senderId === user.id && 'You: '}
                            {last.body}
                          </>
                        ) : (
                          'No messages yet'
                        )}
                      </span>
                      {unread > 0 && (
                        <span className="count-dot">
                          {unread > 99 ? '99+' : unread}
                          <span className="visually-hidden"> unread</span>
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
