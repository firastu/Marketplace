'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { getUnreadCount } from '@/services/messages.service';

let globalSocket: Socket | null = null;

function getSocket(): Socket | null {
  if (typeof window === 'undefined') return null;

  const token = localStorage.getItem('token');
  if (!token) return null;

  if (globalSocket?.connected) return globalSocket;

  // Determine the backend host for the WebSocket connection.
  // The REST API goes through Next.js rewrites (/api → localhost:3001/api),
  // but WebSockets must connect directly to the backend.
  const wsUrl =
    typeof window !== 'undefined' && window.location.hostname !== 'localhost'
      ? `http://${window.location.hostname}:3001`
      : 'http://localhost:3001';

  globalSocket = io(`${wsUrl}/chat`, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 10,
  });

  return globalSocket;
}

export function disconnectSocket() {
  if (globalSocket) {
    globalSocket.disconnect();
    globalSocket = null;
  }
}

/**
 * Hook: subscribe to real-time messages in a specific conversation.
 */
export function useConversationSocket(
  conversationId: string | null,
  onNewMessage: (msg: any) => void,
) {
  const callbackRef = useRef(onNewMessage);
  callbackRef.current = onNewMessage;

  useEffect(() => {
    if (!conversationId) return;

    const socket = getSocket();
    if (!socket) return;

    socket.emit('joinConversation', { conversationId });

    const handler = (msg: any) => {
      callbackRef.current(msg);
    };

    socket.on('newMessage', handler);

    return () => {
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
  callbackRef.current = onConversationUpdated;

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handler = (data: any) => {
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
    if (!isLoggedIn) {
      setCount(0);
      return;
    }
    const socket = getSocket();
    if (!socket) return;

    const handler = () => refresh();
    socket.on('unreadCountChanged', handler);
    // Also refresh when we navigate to a conversation (messages get marked read)
    socket.on('conversationUpdated', handler);

    return () => {
      socket.off('unreadCountChanged', handler);
      socket.off('conversationUpdated', handler);
    };
  }, [isLoggedIn, refresh]);

  return { unreadCount: count, refreshUnread: refresh };
}
