'use client';

import { FormEvent, Fragment, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, CircleAlert, ImageOff, Send } from 'lucide-react';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { useConversationSocket } from '@/hooks/use-socket';
import { getImageUrl } from '@/services/listings.service';
import {
  Conversation,
  getConversationMessages,
  getMyConversations,
  markConversationRead,
  Message,
  sendMessage,
} from '@/services/messages.service';
import { clockTime, dayKey, dayLabel } from '@/utils/format';
import { Avatar, Price, StatusBadge } from '@/components/bits';
import { errorText, useToast } from '@/components/ui/Feedback';
import styles from './page.module.css';

export default function ConversationPage() {
  const { user } = useRequireAuth();
  const { id: conversationId } = useParams<{ id: string }>();
  const toast = useToast();

  const [messages, setMessages] = useState<Message[] | null>(null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loadError, setLoadError] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const threadRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const userId = user?.id;

  const loadMessages = useCallback(() => {
    if (!conversationId) return;
    getConversationMessages(conversationId)
      .then((loaded) => {
        setMessages(loaded);
        setLoadError('');
      })
      // A missing or foreign conversation must not look like an empty chat.
      .catch((err) => setLoadError(errorText(err, 'Could not load this conversation')));
  }, [conversationId]);

  // Initial load — REST API for history, plus who and what the chat is about
  useEffect(() => {
    if (!userId) return;
    loadMessages();
    getMyConversations()
      .then((all) => setConversation(all.find((c) => c.id === conversationId) ?? null))
      .catch(() => {});
  }, [userId, conversationId, loadMessages]);

  // WebSocket — real-time incoming messages
  const handleIncoming = useCallback(
    (msg: Message) => {
      setMessages((prev) => {
        // Avoid duplicates (the sender already appended its own message)
        if (!prev || prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      // The user is looking at it, so it must not count as unread.
      if (msg.senderId !== userId) {
        markConversationRead(msg.conversationId).catch(() => {});
      }
    },
    [userId],
  );
  // After a dropped connection, reload what was missed while offline.
  useConversationSocket(userId ? conversationId : null, handleIncoming, loadMessages);

  // Keep the newest message in view.
  useEffect(() => {
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
    // also when the listing bar appears and the thread gets shorter
  }, [messages, conversation]);

  const resizeInput = () => {
    const el = inputRef.current;
    if (!el) return;
    el.style.blockSize = 'auto';
    el.style.blockSize = `${Math.min(el.scrollHeight, 140)}px`;
  };

  const handleSend = async (e?: FormEvent) => {
    e?.preventDefault();
    const text = body.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      const msg = await sendMessage(conversationId, text);
      setMessages((prev) =>
        prev && !prev.some((m) => m.id === msg.id) ? [...prev, msg] : (prev ?? [msg]),
      );
      setBody('');
      requestAnimationFrame(resizeInput);
    } catch (err) {
      // The text stays in the box so nothing typed is lost.
      toast(errorText(err, 'Message not sent. Check your connection.'), 'error');
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const other = conversation
    ? conversation.buyerId === userId
      ? conversation.seller
      : conversation.buyer
    : null;
  const otherName = other?.displayName || other?.username || 'Chat';
  const listing = conversation?.listing;
  const cover = listing?.images?.[0];
  const listingGone = !!listing?.deletedAt;

  return (
    <div className={styles.chat}>
      <header className={styles.head}>
        <div className={`container ${styles.headInner}`}>
          <Link href="/messages" className="btn btn--ghost btn--icon" aria-label="Back to chats">
            <ArrowLeft aria-hidden="true" className="icon-flip" />
          </Link>
          {conversation ? (
            <>
              <Avatar name={otherName} size="sm" />
              <h1 className={`${styles.name} clamp-1`} dir="auto">
                {other ? <Link href={`/users/${other.id}`}>{otherName}</Link> : otherName}
              </h1>
            </>
          ) : (
            <h1 className={styles.name}>
              {loadError ? 'Chat' : <span className={`skeleton ${styles.skName}`} />}
            </h1>
          )}
        </div>

        {listing && (
          <div className={`container ${styles.context}`}>
            <span className={styles.contextThumb}>
              {cover ? (
                <img src={getImageUrl(cover, 'thumb')} alt="" />
              ) : (
                <ImageOff aria-hidden="true" />
              )}
            </span>
            <span className={styles.contextText}>
              {listingGone ? (
                <span className="clamp-1" dir="auto">
                  {listing.title}
                </span>
              ) : (
                <Link
                  href={`/listings/${listing.id}`}
                  className={`${styles.contextTitle} clamp-1`}
                  dir="auto"
                >
                  {listing.title}
                </Link>
              )}
              <span className={styles.contextMeta}>
                <Price price={listing.price} currency={listing.currency} />
                {listingGone ? (
                  <span className="badge">Listing deleted</span>
                ) : (
                  listing.status !== 'active' && <StatusBadge status={listing.status} />
                )}
              </span>
            </span>
          </div>
        )}
      </header>

      <div
        ref={threadRef}
        className={styles.thread}
        role="log"
        aria-label="Messages"
        aria-busy={messages === null && !loadError}
      >
        <div className={`container ${styles.threadInner}`}>
          {loadError && (
            <div className="notice notice--danger" role="alert">
              <CircleAlert aria-hidden="true" />
              <span className="notice__body">
                {loadError}{' '}
                <button type="button" className="link" onClick={loadMessages}>
                  Try again
                </button>
              </span>
            </div>
          )}

          {messages === null && !loadError && (
            <>
              <span className={`skeleton ${styles.skBubble}`} />
              <span className={`skeleton ${styles.skBubble} ${styles.own}`} />
              <span className={`skeleton ${styles.skBubble}`} />
            </>
          )}

          {messages?.length === 0 && <p className={styles.none}>No messages yet. Say hello.</p>}

          {messages?.map((msg, i) => {
            const own = msg.senderId === userId;
            const prev = messages[i - 1];
            const newDay = !prev || dayKey(prev.createdAt) !== dayKey(msg.createdAt);
            const grouped = !newDay && prev.senderId === msg.senderId;
            return (
              <Fragment key={msg.id}>
                {newDay && (
                  <p className={styles.day}>
                    <span>{dayLabel(msg.createdAt)}</span>
                  </p>
                )}
                <div
                  className={`${styles.message} ${own ? styles.own : ''}`}
                  data-grouped={grouped || undefined}
                >
                  <p className={styles.bubble} dir="auto">
                    <span className="visually-hidden">{own ? 'You: ' : `${otherName}: `}</span>
                    {msg.body}
                  </p>
                  <time className={styles.time} dateTime={msg.createdAt} dir="ltr">
                    {clockTime(msg.createdAt)}
                  </time>
                </div>
              </Fragment>
            );
          })}
        </div>
      </div>

      <form onSubmit={handleSend} className={styles.composer}>
        <div className={`container ${styles.composerInner}`}>
          <textarea
            ref={inputRef}
            className={styles.input}
            value={body}
            onChange={(e) => {
              setBody(e.target.value);
              resizeInput();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                void handleSend();
              }
            }}
            placeholder="Write a message"
            aria-label="Message"
            rows={1}
            maxLength={5000}
            enterKeyHint="send"
            dir="auto"
            disabled={!!loadError}
          />
          <button
            type="submit"
            className={styles.send}
            disabled={sending || !body.trim() || !!loadError}
            aria-label="Send message"
          >
            <Send aria-hidden="true" className="icon-flip" />
          </button>
        </div>
      </form>
    </div>
  );
}
