'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { useInboxSocket } from '@/hooks/use-socket';
import { getMyConversations, Conversation } from '@/services/messages.service';

export default function MessagesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const loadConversations = useCallback(() => {
    getMyConversations()
      .then(setConversations)
      .catch((err) => console.error('Failed to load conversations:', err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (user) {
      loadConversations();
    }
  }, [authLoading, user, router, loadConversations]);

  // WebSocket — refresh inbox when a conversation gets a new message
  useInboxSocket(
    useCallback(() => {
      loadConversations();
    }, [loadConversations]),
  );

  if (authLoading || loading) return <div className="loading">Loading...</div>;
  if (!user) return null;

  return (
    <div className="page" style={{ maxWidth: 680 }}>
      <h1 style={{ marginBottom: '1.5rem' }}>Messages</h1>

      {conversations.length === 0 ? (
        <div className="empty">
          <p>No conversations yet. Message a seller from any listing.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {conversations.map((conv) => {
            const other = conv.buyerId === user.id ? conv.seller : conv.buyer;
            const hasUnread = (conv.unreadCount ?? 0) > 0;
            return (
              <Link
                key={conv.id}
                href={`/messages/${conv.id}`}
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <div
                  className="card"
                  style={{
                    padding: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.25rem',
                    borderLeft: hasUnread ? '3px solid var(--color-primary)' : undefined,
                    background: hasUnread ? 'rgba(59,130,246,0.04)' : undefined,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontWeight: 600 }}>
                      {conv.listing?.title || 'Listing'}
                    </div>
                    {hasUnread && (
                      <span
                        style={{
                          background: 'var(--color-primary)',
                          color: '#fff',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          borderRadius: '9999px',
                          minWidth: 20,
                          height: 20,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '0 6px',
                        }}
                      >
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--color-text-light)' }}>
                    with {other?.displayName || other?.username || 'Unknown'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-light)' }}>
                    {new Date(conv.lastMessageAt).toLocaleString()}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
