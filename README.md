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
| GET | `/api/users/:id` | Get user profile |
| GET | `/api/categories` | List root categories |
| GET | `/api/categories/:slug` | Get category by slug |
| GET | `/api/listings` | List active listings (paginated) |
| GET | `/api/listings/:id` | Get listing details |
| POST | `/api/listings` | Create listing |
| GET | `/api/favorites/:userId` | Get user favorites |
| POST | `/api/favorites/:userId/:listingId` | Add to favorites |
| DELETE | `/api/favorites/:userId/:listingId` | Remove from favorites |

## Development Phases

### Phase 1 (Current)
- [x] Auth (register, login)
- [x] Users
- [x] Categories (with subcategories)
- [x] Listings (CRUD)
- [x] Favorites (backend)
- [x] Messages (conversations)
- [x] Reviews

### Phase 2 (Planned)
- [ ] Listing search & filter
- [ ] Image upload wiring (frontend)
- [ ] Favorites UI
- [ ] Listing edit page
- [ ] Reviews UI
- [ ] Reports & moderation
- [ ] Order-ready architecture

### Future
- [ ] Redis (cache, sessions, rate limiting)
- [ ] Elasticsearch (search)
- [ ] Mobile clients (React Native or similar)
- [ ] Image upload (S3/MinIO)
- [ ] Push notifications
