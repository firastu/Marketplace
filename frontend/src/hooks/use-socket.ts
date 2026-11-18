'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { getUnreadCount, Message } from '@/services/messages.service';

let globalSocket: Socket | null = null;
let globalSocketToken: string | null = null;

/**
 * One shared socket per logged-in user. The previous version only reused
 * the socket once it was `connected`, so every hook that mounted while the
 * first connection was still being established opened another one; the
 * extra sockets were never closed, not even on logout.
 */
function getSocket(): Socket | null {
  if (typeof window === 'undefined') return null;

  const token = localStorage.getItem('token');
  if (!token) {
    disconnectSocket();
    return null;
  }

  if (globalSocket && globalSocketToken === token) return globalSocket;
  disconnectSocket(); // different account

  // The REST API goes through Next.js rewrites (/api → backend), but
  // WebSockets connect directly to the backend. NEXT_PUBLIC_BACKEND_URL
  // wins (production / Docker); otherwise assume port 3001 on this host,
  // which also works when testing from a phone on the same LAN.
  const wsUrl =
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    `${window.location.protocol}//${window.location.hostname}:3001`;

  globalSocket = io(`${wsUrl}/chat`, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 15000,
    // Keep trying: mobile connections drop for minutes at a time.
    reconnectionAttempts: Infinity,
  });
  globalSocketToken = token;

  return globalSocket;
}

export function disconnectSocket() {
  if (globalSocket) {
    globalSocket.disconnect();
    globalSocket = null;
  }
  globalSocketToken = null;
}

/**
 * Hook: subscribe to real-time messages in a specific conversation.
 *
 * `onReconnect` is called when the connection comes back after a drop, so
 * the page can reload what it missed in the meantime.
 */
export function useConversationSocket(
  conversationId: string | null,
  onNewMessage: (msg: Message) => void,
  onReconnect?: () => void,
) {
  const callbackRef = useRef(onNewMessage);
  const reconnectRef = useRef(onReconnect);
  useEffect(() => {
    callbackRef.current = onNewMessage;
    reconnectRef.current = onReconnect;
  });

  useEffect(() => {
    if (!conversationId) return;

    const socket = getSocket();
    if (!socket) return;

    // Rooms live on the server per connection: after every reconnect the
    // room has to be joined again, otherwise live messages silently stop.
    let connectedBefore = socket.connected;
    const join = () => {
      socket.emit('joinConversation', { conversationId });
      if (connectedBefore) reconnectRef.current?.();
      connectedBefore = true;
    };
    if (socket.connected) socket.emit('joinConversation', { conversationId });
    socket.on('connect', join);

    const handler = (msg: Message) => {
      if (msg.conversationId === conversationId) callbackRef.current(msg);
    };
    socket.on('newMessage', handler);

    return () => {
      socket.off('connect', join);
      socket.off('newMessage', handler);
      socket.emit('leaveConversation', { conversationId });
    };
  }, [conversationId]);
}

/**
 * Hook: subscribe to conversation-level updates (for the inbox).
 */
export function useInboxSocket(
  onConversationUpdated: (data: {
    conversationId: string;
    lastMessageAt: string;
  }) => void,
) {
  const callbackRef = useRef(onConversationUpdated);
  useEffect(() => {
    callbackRef.current = onConversationUpdated;
  });

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handler = (data: { conversationId: string; lastMessageAt: string }) => {
      callbackRef.current(data);
    };

    socket.on('conversationUpdated', handler);

    return () => {
      socket.off('conversationUpdated', handler);
    };
  }, []);
}

/**
 * Hook: track unread message count with real-time updates.
 * Loads initial count from REST, then listens for WebSocket events.
 */
export function useUnreadCount(isLoggedIn: boolean) {
  const [count, setCount] = useState(0);

  const refresh = useCallback(() => {
    if (!isLoggedIn) return;
    getUnreadCount()
      .then((res) => setCount(res.count))
      .catch(() => {});
  }, [isLoggedIn]);

  // Load on mount / login
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Real-time updates via WebSocket
  useEffect(() => {
    if (!isLoggedIn) return;
    const socket = getSocket();
    if (!socket) return;

    // The server sends unreadCountChanged for new messages and when this
    // user reads a conversation. Refresh after a reconnect too: events
    // sent while offline are not replayed.
    const handler = () => refresh();
    socket.on('unreadCountChanged', handler);
    socket.on('connect', handler);

    return () => {
      socket.off('unreadCountChanged', handler);
      socket.off('connect', handler);
    };
  }, [isLoggedIn, refresh]);

  return { unreadCount: isLoggedIn ? count : 0, refreshUnread: refresh };
}
