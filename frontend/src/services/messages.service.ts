import { apiClient } from './api-client';

export interface Conversation {
  id: string;
  listingId: string;
  buyerId: string;
  sellerId: string;
  lastMessageAt: string;
  unreadCount?: number;
  listing?: { id: string; title: string };
  buyer?: { id: string; username: string; displayName: string };
  seller?: { id: string; username: string; displayName: string };
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  sender?: { id: string; username: string; displayName: string };
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
