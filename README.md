# Marketplace App

A production-oriented marketplace application (similar to eBay Kleinanzeigen) built with a modular, scalable architecture designed to support web, Android, and iOS.

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | NestJS (Node.js + TypeScript) |
| Frontend | Next.js 15 (React 19, App Router) |
| Database | PostgreSQL 16 |
| Infrastructure | Docker, Docker Compose |
| API Docs | Swagger (auto-generated) |

## Project Structure

```
marketplace-app/
├── backend/          # NestJS API server
├── frontend/         # Next.js web app
├── database/         # SQL migrations, seeds, schema
├── infra/            # Docker configs
├── docker-compose.yml
└── .env
```

## Prerequisites

- **Node.js** >= 18
- **Docker** and **Docker Compose**
- **npm** (comes with Node.js)

## Quick Start

### 1. Start PostgreSQL

```bash
cd marketplace-app
docker compose up -d
```

Verify it's running:
```bash
docker compose ps
```

### 2. Run Database Migrations

```bash
# Apply all migration files
bash database/scripts/migrate.sh

# Seed categories and demo data
bash database/scripts/seed.sh
```

### 3. Start the Backend

```bash
cd backend
npm install
npm run start:dev
```

The API will be available at **http://localhost:3001/api**
Swagger docs at **http://localhost:3001/api/docs**

### 4. Start the Frontend

```bash
cd frontend
npm install
npm run dev
```

The web app will be available at **http://localhost:3000**

## Database Management

| Command | Description |
|---|---|
| `bash database/scripts/migrate.sh` | Run all migrations |
| `bash database/scripts/seed.sh` | Seed categories + demo data |
| `bash database/scripts/reset_db.sh` | Drop and recreate the database |

### Connect with DBeaver / pgAdmin

| Setting | Value |
|---|---|
| Host | `localhost` |
| Port | `5433` |
| Database | `marketplace_db` |
| User | `marketplace` |
| Password | `marketplace_secret` |

## API Endpoints (Phase 1)

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Get current user |
| GET | `/api/users/:id` | Get user profile |
| GET | `/api/categories` | List root categories |
| GET | `/api/categories/:slug` | Get category by slug |
| GET | `/api/listings` | List active listings (paginated, filterable) |
| GET | `/api/listings/my` | Get my listings |
| GET | `/api/listings/:id` | Get listing details |
| POST | `/api/listings` | Create listing |
| PUT | `/api/listings/:id` | Update listing |
| PATCH | `/api/listings/:id/status` | Change listing status |
| DELETE | `/api/listings/:id` | Delete listing |
| GET | `/api/listings/:id/images` | List listing images |
| POST | `/api/listings/:id/images` | Upload image |
| PATCH | `/api/listings/:id/images/order` | Reorder images |
| PATCH | `/api/listings/:id/images/:imageId/cover` | Set cover image |
| DELETE | `/api/listings/:id/images/:imageId` | Soft-delete image |
| POST | `/api/uploads/listings/:listingId` | Upload image (alias) |
| GET | `/api/favorites` | Get my favorites |
| POST | `/api/favorites/:listingId` | Add to favorites |
| DELETE | `/api/favorites/:listingId` | Remove from favorites |
| GET | `/api/conversations` | List conversations |
| GET | `/api/conversations/:id/messages` | Get messages |
| POST | `/api/conversations` | Start conversation |
| POST | `/api/conversations/:id/messages` | Send message |
| GET | `/api/reviews/user/:userId` | Get user reviews |
| POST | `/api/reviews` | Create review |

## Development Phases

### Phase 1 ✅ Complete
- [x] Auth (register, login, JWT)
- [x] Users
- [x] Categories (with subcategories)
- [x] Listings CRUD (create, read, update, delete, status)
- [x] Listing search & filter (keyword, price, condition, city, sort)
- [x] Image pipeline backend (upload, Sharp processing, variants: thumb/medium/large/webp)
- [x] Image pipeline frontend (upload in create flow, display with variants, zoom lightbox)
- [x] Listing images (set cover, reorder, soft-delete)
- [x] Favorites backend
- [x] Messages (conversations + WebSocket gateway)
- [x] Reviews backend
- [x] Sample image data (generate-samples.js + seed)

### Phase 2 (In Progress)
- [ ] Favorites UI (heart button on listing cards + /favorites page)
- [ ] Listing edit page (edit form + image management)
- [ ] Reviews UI (rating display + leave review form)
- [ ] Reports & moderation (report button + admin dashboard)
- [ ] Order-ready architecture

### Future
- [ ] Redis (cache, sessions, rate limiting)
- [ ] Elasticsearch (advanced search)
- [ ] Mobile clients (React Native)
- [ ] S3/MinIO image storage
- [ ] Push notifications
