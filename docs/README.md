# Marketplace Application

A full-featured, eBay Kleinanzeigen–style marketplace built with **NestJS**, **Next.js 15**, and **PostgreSQL**. Users can list items for sale, browse listings, negotiate prices via real-time messaging, and leave reviews.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Backend API Reference](#backend-api-reference)
  - [Auth](#auth-module)
  - [Users](#users-module)
  - [Categories](#categories-module)
  - [Listings](#listings-module)
  - [Uploads](#uploads-module)
  - [Favorites](#favorites-module)
  - [Conversations & Messages](#conversations--messages-module)
  - [Reviews](#reviews-module)
- [Real-time Messaging (WebSocket)](#real-time-messaging-websocket)
- [Database Schema](#database-schema)
- [Frontend Pages](#frontend-pages)
- [Environment Variables](#environment-variables)
- [Swagger API Docs](#swagger-api-docs)

---

## Architecture Overview

```
┌──────────────┐        REST + WebSocket        ┌──────────────┐
│  Next.js 15  │  ◄────────────────────────►    │   NestJS 10  │
│  (Frontend)  │     /api/* proxy rewrite        │  (Backend)   │
│  port 3000   │     Socket.IO /chat             │  port 3001   │
└──────────────┘                                 └──────┬───────┘
                                                        │
                                                        ▼
                                                 ┌──────────────┐
                                                 │ PostgreSQL 16│
                                                 │  port 5433   │
                                                 └──────────────┘
```

- **Source of truth**: PostgreSQL stores all data — users, listings, conversations, messages, reviews.
- **REST API**: Full CRUD for all resources, paginated where appropriate.
- **WebSocket (Socket.IO)**: Real-time message delivery. Messages are **always** persisted to the database first, then pushed via WebSocket.
- **Offline support**: When a user is offline, messages accumulate in the database with `is_read = false`. On next login, the unread count is fetched via REST. If the user is online (WebSocket connected), they receive instant `newMessage` and `unreadCountChanged` events.

---

## Tech Stack

| Layer        | Technology                                      |
| ------------ | ----------------------------------------------- |
| **Frontend** | Next.js 15, React 19, App Router, TypeScript    |
| **Backend**  | NestJS 10, TypeORM, Passport JWT, Socket.IO     |
| **Database** | PostgreSQL 16 (Docker)                           |
| **Auth**     | JWT (7-day expiry), bcrypt password hashing       |
| **Uploads**  | Multer disk storage, served statically            |
| **Docs**     | Swagger/OpenAPI at `/api/docs`                    |

---

## Getting Started

### Prerequisites

- Node.js ≥ 18 (tested on v22 via nvm)
- Docker & Docker Compose
- npm

### 1. Start the database

```bash
cd marketplace-app
docker compose up -d
```

This starts PostgreSQL on port **5433** with credentials defined in `docker-compose.yml`.

### 2. Run database migrations

```bash
# Connect to the running PostgreSQL container and run migrations in order
docker exec -i marketplace-db psql -U marketplace -d marketplace_db \
  < backend/src/database/migrations/001_create_users.sql \
  < backend/src/database/migrations/002_create_categories.sql \
  < backend/src/database/migrations/003_create_listings.sql \
  < backend/src/database/migrations/004_create_listing_images.sql \
  < backend/src/database/migrations/005_create_favorites.sql \
  < backend/src/database/migrations/006_create_messages.sql \
  < backend/src/database/migrations/007_create_reviews.sql
```

### 3. Seed sample data (optional)

```bash
docker exec -i marketplace-db psql -U marketplace -d marketplace_db \
  < backend/src/database/seeds/seed.sql
```

### 4. Start the backend

```bash
cd backend
cp .env.example .env   # or use existing .env
npm install
npm run start:dev       # Runs on http://localhost:3001
```

### 5. Start the frontend

```bash
cd frontend
npm install
npm run dev             # Runs on http://localhost:3000
```

### 6. Open the app

- **Frontend**: http://localhost:3000
- **Swagger docs**: http://localhost:3001/api/docs
- **LAN access**: http://YOUR_IP:3000 (CORS is configured for any origin)

---

## Project Structure

```
marketplace-app/
├── backend/
│   ├── src/
│   │   ├── main.ts                 # App bootstrap, CORS, Swagger, static files
│   │   ├── app.module.ts           # Root module — imports all feature modules
│   │   ├── common/                 # Shared: pagination DTO, paginate helper
│   │   ├── database/
│   │   │   ├── database.module.ts  # TypeORM + PostgreSQL config
│   │   │   ├── migrations/         # SQL migration files (001–007)
│   │   │   └── seeds/              # Sample data
│   │   └── modules/
│   │       ├── auth/               # JWT auth, login, register, guards
│   │       ├── users/              # User entity, profile lookup
│   │       ├── categories/         # Category tree (parent/child)
│   │       ├── listings/           # Listing CRUD, images, status
│   │       ├── uploads/            # Multer image upload
│   │       ├── favorites/          # Bookmark listings
│   │       ├── messages/           # Conversations, messages, WebSocket gateway
│   │       └── reviews/            # User-to-user reviews & ratings
│   ├── uploads/                    # Static uploaded images
│   ├── .env                        # Environment variables
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── app/                    # Next.js App Router pages
│   │   │   ├── page.tsx            # Home — listing grid
│   │   │   ├── login/              # Login form
│   │   │   ├── register/           # Registration form
│   │   │   ├── listings/
│   │   │   │   ├── [id]/           # Listing detail + Contact Seller
│   │   │   │   ├── create/         # Create listing form
│   │   │   │   └── my/             # My listings management
│   │   │   └── messages/
│   │   │       ├── page.tsx        # Inbox (conversation list)
│   │   │       └── [id]/           # Chat thread (real-time)
│   │   ├── components/
│   │   │   └── Header.tsx          # Nav with unread message badge
│   │   ├── hooks/
│   │   │   ├── use-auth.tsx        # AuthContext + useAuth hook
│   │   │   └── use-socket.ts       # Socket.IO hooks (conversation, inbox, unread)
│   │   └── services/
│   │       ├── api-client.ts       # Base fetch wrapper with auth
│   │       ├── auth.service.ts     # Auth API calls + localStorage
│   │       ├── listings.service.ts # Listings API calls
│   │       └── messages.service.ts # Conversations + messages API calls
│   ├── .env.local                  # NEXT_PUBLIC_API_URL=/api
│   ├── next.config.js              # API proxy rewrites
│   └── package.json
└── docker-compose.yml
```

---

## Backend API Reference

All endpoints are prefixed with `/api`. Protected endpoints require `Authorization: Bearer <token>`.

### Auth Module

| Method | Endpoint           | Auth | Description                    |
| ------ | ------------------ | ---- | ------------------------------ |
| POST   | `/auth/register`   | No   | Register a new user            |
| POST   | `/auth/login`      | No   | Login, returns JWT + user      |
| GET    | `/auth/me`         | Yes  | Get current user profile       |

**Register** body: `{ username, email, password, displayName? }`
**Login** body: `{ email, password }`
**Response**: `{ user: {...}, accessToken: "jwt..." }`

### Users Module

| Method | Endpoint       | Auth | Description             |
| ------ | -------------- | ---- | ----------------------- |
| GET    | `/users/:id`   | No   | Get public user profile |

### Categories Module

| Method | Endpoint             | Auth | Description                       |
| ------ | -------------------- | ---- | --------------------------------- |
| GET    | `/categories`        | No   | Get root categories with children |
| GET    | `/categories/:slug`  | No   | Get category by slug              |

### Listings Module

| Method | Endpoint               | Auth | Description                          |
| ------ | ---------------------- | ---- | ------------------------------------ |
| GET    | `/listings`            | No   | Get all active listings (paginated)  |
| GET    | `/listings/my`         | Yes  | Get current user's listings          |
| GET    | `/listings/:id`        | No   | Get listing by ID with images        |
| POST   | `/listings`            | Yes  | Create a new listing                 |
| PUT    | `/listings/:id`        | Yes  | Update a listing (owner only)        |
| PATCH  | `/listings/:id/status` | Yes  | Change listing status                |
| DELETE | `/listings/:id`        | Yes  | Delete a listing (owner only)        |

**Create** body: `{ title, description, price, categoryId, condition?, currency?, locationCity?, locationZip?, isNegotiable?, isShippingAvailable? }`

**Status values**: `draft`, `active`, `sold`, `reserved`, `expired`, `removed`

**Condition values**: `new`, `like_new`, `used`, `fair`, `poor`

### Uploads Module

| Method | Endpoint                        | Auth | Description                        |
| ------ | ------------------------------- | ---- | ---------------------------------- |
| POST   | `/uploads/listings/:listingId`  | Yes  | Upload image (multipart/form-data) |
| DELETE | `/uploads/images/:imageId`      | Yes  | Delete an image (owner only)       |

**Upload**: Send `file` field as `multipart/form-data`. Accepts JPEG, PNG, WebP, GIF up to 5 MB.
Add `?primary=true` query parameter to set as primary image.

### Favorites Module

| Method | Endpoint                | Auth | Description                |
| ------ | ----------------------- | ---- | -------------------------- |
| GET    | `/favorites`            | Yes  | Get my favorited listings  |
| POST   | `/favorites/:listingId` | Yes  | Add listing to favorites   |
| DELETE | `/favorites/:listingId` | Yes  | Remove from favorites      |

### Conversations & Messages Module

| Method | Endpoint                         | Auth | Description                                      |
| ------ | -------------------------------- | ---- | ------------------------------------------------ |
| GET    | `/conversations`                 | Yes  | Get all my conversations (with unread counts)    |
| GET    | `/conversations/unread-count`    | Yes  | Get total unread message count                   |
| GET    | `/conversations/:id/messages`    | Yes  | Get messages in a conversation (marks as read)   |
| POST   | `/conversations`                 | Yes  | Start a new conversation about a listing         |
| POST   | `/conversations/:id/messages`    | Yes  | Send a message in a conversation                 |

**Start conversation** body: `{ listingId: "uuid", body: "message text" }`
**Send message** body: `{ body: "message text" }`

**How messages are tracked**:
- Every message is stored in the `messages` table with `is_read = false` by default.
- When a user opens a conversation (`GET /conversations/:id/messages`), all messages from the **other** participant are marked `is_read = true`.
- `GET /conversations/unread-count` counts all unread messages across all conversations for the current user.
- `GET /conversations` returns each conversation with an `unreadCount` field.
- This ensures that when a seller logs in after being offline, they immediately see how many new messages arrived and which conversations have unread content.

### Reviews Module

| Method | Endpoint                     | Auth | Description                      |
| ------ | ---------------------------- | ---- | -------------------------------- |
| GET    | `/reviews/user/:userId`      | No   | Get all reviews for a user       |
| GET    | `/reviews/user/:userId/rating` | No | Get average rating and count     |
| POST   | `/reviews`                   | Yes  | Leave a review                   |
| PUT    | `/reviews/:id`               | Yes  | Update your review               |
| DELETE | `/reviews/:id`               | Yes  | Delete your review               |

**Create review** body: `{ reviewedUserId, listingId?, rating (1-5), title?, body? }`

---

## Real-time Messaging (WebSocket)

The application uses **Socket.IO** for live message delivery. WebSockets supplement the REST API — they are not a replacement. All messages are persisted to PostgreSQL first.

### Connection

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001/chat', {
  auth: { token: 'your-jwt-token' },
  transports: ['websocket', 'polling'],
});
```

The server verifies the JWT on connection. Invalid/missing tokens are disconnected immediately.

### Rooms

| Room                        | Purpose                              |
| --------------------------- | ------------------------------------ |
| `user:{userId}`             | Auto-joined on connect. Personal notifications. |
| `conversation:{id}`         | Joined/left by client. Live messages for an open chat. |

### Server → Client Events

| Event                  | Payload                                | Description                                    |
| ---------------------- | -------------------------------------- | ---------------------------------------------- |
| `newMessage`           | Full message object with sender info   | Sent to `conversation:{id}` room               |
| `conversationUpdated`  | `{ conversationId, lastMessageAt }`    | Sent to `user:{recipientId}` room              |
| `unreadCountChanged`   | (no payload)                           | Sent to `user:{recipientId}` — refresh badge   |

### Client → Server Events

| Event                | Payload                   | Description                        |
| -------------------- | ------------------------- | ---------------------------------- |
| `joinConversation`   | `{ conversationId }`      | Subscribe to live messages         |
| `leaveConversation`  | `{ conversationId }`      | Unsubscribe from live messages     |

### Offline Message Handling

When a user is **offline** (WebSocket disconnected):
1. Messages from other users are saved to PostgreSQL with `is_read = false`.
2. When the user logs in and opens any page, the frontend calls `GET /conversations/unread-count`.
3. The header shows a red badge with the unread count (e.g., "Messages (3)").
4. The inbox page shows a blue indicator on conversations with unread messages.
5. Opening a conversation marks all messages as read and clears the indicators.
6. The WebSocket connection is established, so any subsequent messages arrive in real-time.

---

## Database Schema

### Entity Relationship Diagram

```
users
  ├── listings (one-to-many)
  │     ├── listing_images (one-to-many)
  │     ├── conversations (one-to-many, via listing_id)
  │     └── reviews (one-to-many, via listing_id)
  ├── favorites (one-to-many)
  ├── conversations (as buyer or seller)
  │     └── messages (one-to-many)
  └── reviews (as reviewer or reviewed)

categories
  ├── children (self-referencing)
  └── listings (one-to-many)
```

### Tables

| Table             | Key Columns                                                              |
| ----------------- | ------------------------------------------------------------------------ |
| `users`           | id, email, username, display_name, password_hash, role, is_active        |
| `categories`      | id, name, slug, parent_id, icon, sort_order                             |
| `listings`        | id, user_id, category_id, title, slug, price, condition, status, location |
| `listing_images`  | id, listing_id, url, is_primary, sort_order                             |
| `favorites`       | id, user_id, listing_id (unique together)                               |
| `conversations`   | id, listing_id, buyer_id, seller_id, last_message_at                    |
| `messages`        | id, conversation_id, sender_id, body, **is_read**, created_at           |
| `reviews`         | id, reviewer_id, reviewed_user_id, listing_id, rating, title, body      |

### Migrations

Migrations are plain SQL files in `backend/src/database/migrations/`, numbered 001–007. They must be run in order against the PostgreSQL database.

---

## Frontend Pages

| Route                  | Component          | Description                                   |
| ---------------------- | ------------------ | --------------------------------------------- |
| `/`                    | Home               | Paginated listing grid with images and prices |
| `/login`               | Login              | Email + password login form                   |
| `/register`            | Register           | Username, email, password, display name form  |
| `/listings/:id`        | Listing Detail     | Full listing info + "Contact Seller" button   |
| `/listings/create`     | Create Listing     | Form to post a new listing                    |
| `/listings/my`         | My Listings        | Manage own listings, delete action            |
| `/messages`            | Inbox              | All conversations with unread indicators      |
| `/messages/:id`        | Chat Thread        | Real-time chat with speech bubble UI          |

### Key Frontend Features

- **AuthProvider**: Global React context for login state, wraps the entire app.
- **Socket.IO hooks**: `useConversationSocket`, `useInboxSocket`, `useUnreadCount` for real-time updates.
- **API proxy**: Next.js rewrites `/api/*` to `http://localhost:3001/api/*`, enabling LAN access from any device.
- **Unread badge**: Red notification badge in the header showing total unread messages across all conversations.

---

## Environment Variables

### Backend (`backend/.env`)

| Variable              | Default               | Description                    |
| --------------------- | --------------------- | ------------------------------ |
| `POSTGRES_HOST`       | `localhost`           | Database host                  |
| `POSTGRES_PORT`       | `5433`                | Database port                  |
| `POSTGRES_USER`       | `marketplace`         | Database user                  |
| `POSTGRES_PASSWORD`   | `marketplace_secret`  | Database password              |
| `POSTGRES_DB`         | `marketplace_db`      | Database name                  |
| `JWT_SECRET`          | (required)            | Secret for JWT signing         |
| `JWT_EXPIRES_IN`      | `7d`                  | Token expiry duration          |
| `PORT`                | `3001`                | Backend HTTP port              |
| `NODE_ENV`            | `development`         | Environment                    |

### Frontend (`frontend/.env.local`)

| Variable               | Default | Description                          |
| ---------------------- | ------- | ------------------------------------ |
| `NEXT_PUBLIC_API_URL`  | `/api`  | API base URL (relative for LAN)      |

---

## Swagger API Docs

Interactive API documentation is available at:

```
http://localhost:3001/api/docs
```

All endpoints are documented with:
- Operation summaries
- Request/response descriptions
- Bearer auth requirement indicators
- WebSocket event documentation in the API description
