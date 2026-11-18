import { apiClient } from './api-client';
import type { ListingImage, PublicUser } from './listings.service';

export interface ConversationListing {
  id: string;
  title: string;
  price: number | string;
  currency: string;
  status: string;
  /** Set when the seller deleted the listing; the chat is kept. */
  deletedAt?: string | null;
  /** Cover photo only (empty when the listing has none or was deleted). */
  images?: ListingImage[];
}

export interface Conversation {
  id: string;
  listingId: string;
  buyerId: string;
  sellerId: string;
  lastMessageAt: string;
  unreadCount?: number;
  lastMessage?: { body: string; senderId: string; createdAt: string } | null;
  listing?: ConversationListing;
  buyer?: PublicUser;
  seller?: PublicUser;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  sender?: PublicUser;
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
