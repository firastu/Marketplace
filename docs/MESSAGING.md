# Messaging Architecture

This document explains how the real-time messaging system works in the Marketplace application.

## Design Principles

1. **PostgreSQL is the source of truth** — every message is persisted before being delivered.
2. **WebSockets for live delivery** — Socket.IO pushes messages instantly to connected clients.
3. **REST for history** — conversation history is always loaded via REST API on page open.
4. **Graceful offline handling** — messages sent while a user is offline are stored with `is_read = false` and surfaced on their next visit.

## Data Flow

### Sending a Message

```
User A types message and clicks Send
         │
         ▼
Frontend calls POST /api/conversations/:id/messages
         │
         ▼
MessagesService.sendMessage()
  ├── Validates sender is a conversation participant
  ├── Saves message to PostgreSQL (is_read = false)
  ├── Updates conversation.last_message_at
  ├── Loads full message with sender relation
  └── Calls MessagesGateway.emitNewMessage()
         │
         ├── Emits 'newMessage' to conversation:{id} room
         │     └── User B's chat page receives it instantly
         │
         ├── Emits 'conversationUpdated' to user:{recipientId} room
         │     └── User B's inbox refreshes
         │
         └── Emits 'unreadCountChanged' to user:{recipientId} room
               └── User B's header badge updates
```

### Receiving Messages While Online

```
User B has the chat page open
         │
         ▼
Socket receives 'newMessage' event
         │
         ▼
useConversationSocket hook fires callback
         │
         ▼
Message is added to React state (with deduplication)
         │
         ▼
Chat auto-scrolls to bottom
```

### Receiving Messages While Offline

```
User B is offline — no WebSocket connection
         │
Messages accumulate in DB with is_read = false
         │
User B logs in
         │
         ├── useUnreadCount() calls GET /conversations/unread-count
         │     └── Header badge shows: Messages (3)
         │
         ├── User visits /messages inbox
         │     └── GET /conversations returns each conversation 
         │         with unreadCount field → blue indicator shown
         │
         └── User opens a conversation
               └── GET /conversations/:id/messages
                     ├── Marks all messages from other party as read
                     └── Returns full message history
```

## Database Tables

### conversations
```sql
CREATE TABLE conversations (
    id UUID PRIMARY KEY,
    listing_id UUID REFERENCES listings(id),
    buyer_id UUID REFERENCES users(id),
    seller_id UUID REFERENCES users(id),
    last_message_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ,
    UNIQUE (listing_id, buyer_id, seller_id)
);
```

### messages
```sql
CREATE TABLE messages (
    id UUID PRIMARY KEY,
    conversation_id UUID REFERENCES conversations(id),
    sender_id UUID REFERENCES users(id),
    body TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,  -- ← key column for tracking
    created_at TIMESTAMPTZ
);
```

## WebSocket Rooms

| Room Pattern            | Who Joins                        | Events Received                    |
| ----------------------- | -------------------------------- | ---------------------------------- |
| `user:{userId}`         | Auto-joined on WS connect        | `conversationUpdated`, `unreadCountChanged` |
| `conversation:{convId}` | Client emits `joinConversation`   | `newMessage`                       |

## Security

- JWT is verified on WebSocket handshake — unauthenticated connections are rejected.
- `assertParticipant()` ensures only `buyerId` or `sellerId` can read/write messages in a conversation.
- Users cannot message themselves.
- One conversation per (listing, buyer, seller) — enforced by unique constraint.

## Future Improvements

- **Redis pub/sub** — for horizontal scaling across multiple backend instances.
- **Typing indicators** — emit `typing` events via WebSocket.
- **Message pagination** — for conversations with very long history.
- **Push notifications** — integrate with service workers for browser push when the tab is closed.
- **Read receipts** — show "seen" status to the sender.
