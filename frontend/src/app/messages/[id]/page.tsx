'use client';

import { useEffect, useState, useRef, useCallback, FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { useConversationSocket } from '@/hooks/use-socket';
import {
  getConversationMessages,
  sendMessage,
  Message,
} from '@/services/messages.service';

export default function ConversationPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const conversationId = params.id as string;

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Initial load — REST API for history
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (user && conversationId) {
      getConversationMessages(conversationId)
        .then(setMessages)
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [authLoading, user, conversationId, router]);

  // WebSocket — real-time incoming messages
  const handleIncoming = useCallback(
    (msg: Message) => {
      setMessages((prev) => {
        // Avoid duplicates (sender already appends optimistically)
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    },
    [],
  );
  useConversationSocket(user ? conversationId : null, handleIncoming);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    setSending(true);
    try {
      const msg = await sendMessage(conversationId, body.trim());
      setMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]);
      setBody('');
    } catch {
      alert('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  if (authLoading || loading) return <div className="loading">Loading...</div>;
  if (!user) return null;

  return (
    <div className="page" style={{ maxWidth: 680 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <Link href="/messages" className="btn btn-secondary" style={{ padding: '0.375rem 0.75rem' }}>
          ← Back
        </Link>
        <h1 style={{ fontSize: '1.25rem' }}>Conversation</h1>
      </div>

      {/* Message thread */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          minHeight: 200,
          maxHeight: 500,
          overflowY: 'auto',
          padding: '1rem',
          background: 'var(--color-white)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius)',
          marginBottom: '1rem',
        }}
      >
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--color-text-light)', padding: '2rem 0' }}>
            No messages yet
          </div>
        )}
        {messages.map((msg) => {
          const isOwn = msg.senderId === user.id;
          return (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: isOwn ? 'flex-end' : 'flex-start',
              }}
            >
              <div
                style={{
                  maxWidth: '75%',
                  padding: '0.625rem 1rem',
                  borderRadius: isOwn ? '1rem 1rem 0.25rem 1rem' : '1rem 1rem 1rem 0.25rem',
                  background: isOwn ? 'var(--color-primary)' : 'var(--color-border)',
                  color: isOwn ? 'var(--color-white)' : 'var(--color-text)',
                  fontSize: '0.9375rem',
                  lineHeight: '1.4',
                }}
              >
                {msg.body}
              </div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-light)', marginTop: '0.25rem' }}>
                {msg.sender?.displayName || msg.sender?.username} ·{' '}
                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Send form */}
      <form onSubmit={handleSend} style={{ display: 'flex', gap: '0.5rem' }}>
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Type a message..."
          style={{
            flex: 1,
            padding: '0.625rem 0.875rem',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius)',
            fontSize: '0.9375rem',
            fontFamily: 'inherit',
          }}
          autoFocus
        />
        <button
          type="submit"
          className="btn btn-primary"
          disabled={sending || !body.trim()}
          style={{ width: 'auto' }}
        >
          {sending ? '...' : 'Send'}
        </button>
      </form>
    </div>
  );
}
