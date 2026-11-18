import { apiClient } from './api-client';

export interface Conversation {
  id: string;
  listingId: string;
  buyerId: string;
  sellerId: string;
  lastMessageAt: string;
  unreadCount?: number;
  /** deletedAt is set when the seller deleted the listing; the chat is kept. */
  listing?: { id: string; title: string; deletedAt?: string | null };
  buyer?: { id: string; username: string; displayName: string | null };
  seller?: { id: string; username: string; displayName: string | null };
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  sender?: { id: string; username: string; displayName: string | null };
}

export function getMyConversations(): Promise<Conversation[]> {
  return apiClient<Conversation[]>('/conversations', { auth: true });
}

export function getConversationMessages(conversationId: string): Promise<Message[]> {
  return apiClient<Message[]>(`/conversations/${conversationId}/messages`, { auth: true });
}

export function startConversation(listingId: string, body: string): Promise<{ conversation: Conversation; message: Message }> {
  return apiClient('/conversations', { method: 'POST', body: { listingId, body }, auth: true });
}

export function sendMessage(conversationId: string, body: string): Promise<Message> {
  return apiClient<Message>(`/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: { body },
    auth: true,
  });
}

export function getUnreadCount(): Promise<{ count: number }> {
  return apiClient<{ count: number }>('/conversations/unread-count', { auth: true });
}

/** Mark the other participant's messages as read (chat is open). */
export function markConversationRead(conversationId: string): Promise<{ updated: number }> {
  return apiClient<{ updated: number }>(`/conversations/${conversationId}/read`, {
    method: 'POST',
    auth: true,
  });
}
