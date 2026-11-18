# Marketplace App

A production-oriented classifieds marketplace for Syria (similar to eBay Kleinanzeigen) built with a modular, scalable architecture designed to support web, Android, and iOS. Prices are in Syrian pounds (SYP) or US dollars (USD).

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | NestJS (Node.js + TypeScript) |
| Frontend | Next.js 15 (React 19, App Router), Arabic-first (RTL) with English under `/en`, via next-intl |
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
cp .env.example .env      # optional: database settings for compose + scripts
docker compose up -d      # starts PostgreSQL only, on localhost:5433
```

Verify it's running:
```bash
docker compose ps
```

### 2. Run Database Migrations

```bash
# Apply pending migrations (tracked in schema_migrations, safe to re-run)
bash database/scripts/migrate.sh

# Seed categories and demo data (once, on a fresh database)
bash database/scripts/seed.sh
```

Requires `psql` on your machine. If your database was migrated with the old
script (before migration tracking), run `bash database/scripts/migrate.sh --baseline 008` once.

### 3. Start the Backend

```bash
cd backend
cp .env.example .env      # then set JWT_SECRET (openssl rand -hex 32)
npm install
npm run start:dev
```

The API will be available at **http://localhost:3001/api**
Swagger docs at **http://localhost:3001/api/docs**

### 4. Start the Frontend

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

The web app will be available at **http://localhost:3000**

### Run everything in Docker instead

```bash
cp .env.example .env      # set JWT_SECRET
docker compose --profile app up -d --build
```

This starts PostgreSQL, runs the migrations once, then the API (port 3001)
and the web app (port 3000). Uploaded images are kept in the `uploads` volume.

### Quick demo on GitHub Codespaces (with the database)

For showing the app to others without renting a server:

1. On GitHub, open the repository → **Code** → **Codespaces** → **Create codespace**
   (pick the branch to demo).
2. In the codespace terminal run:
   ```bash
   bash scripts/codespace-demo.sh
   ```
   It builds and starts PostgreSQL, the API and the web app, loads the categories
   and demo listings, makes ports 3000/3001 public and prints the link to share.
   If it can't change the port visibility itself, set ports 3000 and 3001 to
   **Public** in the **Ports** tab.
3. Demo account: `alice@example.com` / `password123`.

The link works while the codespace is running; GitHub stops idle codespaces
(Settings → Codespaces → idle timeout) and the free monthly allowance is
limited (Settings → Billing). Anyone with the link can use the demo, so don't
put real data in it. Rerun the script after `git pull` to update.

## Tests & checks

```bash
cd backend
npm run lint && npm run typecheck
npm test              # unit tests
npm run test:e2e      # end-to-end tests against a real PostgreSQL

cd ../frontend
npm run lint && npm run typecheck && npm run build
```

The e2e suite needs the database from step 1 running. It creates, drops and
recreates its own `marketplace_test` database (it refuses to run against a
database whose name doesn't end in `_test`). CI (`.github/workflows/ci.yml`)
runs all of the above plus the migration scripts and both Docker builds.

## Database Management

| Command | Description |
|---|---|
| `bash database/scripts/migrate.sh` | Apply pending migrations |
| `bash database/scripts/migrate.sh --status` | List applied / pending migrations |
| `bash database/scripts/seed.sh` | Seed categories + demo data |
| `bash database/scripts/reset_db.sh` | Drop and recreate the database (`--yes` skips the prompt) |

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

### Hardening ✅ (security & correctness pass)
- [x] Public responses never contain password hashes, emails or phone numbers (REST and WebSocket)
- [x] Image cover / reorder / 15-image limit fixed; uploads validated from the actual bytes; originals private, EXIF/GPS stripped from public images
- [x] Listing delete is a soft delete (chats are kept); drafts/removed listings hidden from non-owners; owners can't set `removed`
- [x] WebSocket rooms only joinable by conversation participants; deactivated accounts are locked out
- [x] Reviews only after a real conversation; message length limit
- [x] Rate limiting (per user when logged in, per IP for guests), security headers, CORS allowlist
- [x] SYP / USD currencies, Arabic-friendly slugs, category filter includes subcategories
- [x] Tracked migrations, Dockerfiles + compose profile, CI, unit + e2e tests

### Arabic-first web app ✅
- [x] Arabic is the default language (right-to-left) at the existing URLs; English lives under `/en/...`; language switcher in the header, account menu and the phone "Me" tab; the choice is remembered
- [x] Every UI string in `frontend/messages/ar.json` / `en.json`; numbers, prices and dates formatted in one place (`frontend/src/i18n/config.ts`)
- [x] Arabic category names, translated API errors. Details: "Languages (i18n)" in `docs/README.md`

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
