# Marketplace Implementation Progress

> This file tracks completed work, current state, and next steps. Updated after each session.

---

## What's Done

### Phase 0 — Setup & Normalization
- [x] Added `typecheck` scripts to both `package.json` files
- [x] Deleted empty `orders.module.ts` stub
- [x] Deleted unused `frontend/src/features/` directory
- [x] Updated spec §5.6 to reflect WebSocket reality
- [x] Updated README Phase 1/2 checklist
- [x] Fixed ESLint 9 flat config on both sides
- [x] Fixed all pre-existing lint errors (unused vars, `any` types, `OneToMany` import, `auth.module.ts` cast)

### Phase 1 — Search & Filter
- [x] Created `SearchListingsDto` with keyword, price range, condition, city filters
- [x] Extended `findAll()` with `SelectQueryBuilder` + `applyFilters()` (ILIKE keyword, price range, condition, city, sortBy)
- [x] Updated `GET /listings` with combined `GetListingsQueryDto` (IntersectionType)
- [x] Refactored frontend `getListings()` to accept `ListingSearchParams` object
- [x] Rewrote home page with collapsible filter panel, search bar, URL persistence, listing count
- [x] Created `/categories` page with root categories + subcategories navigation

### Image Pipeline — Backend
- [x] **Migration 008** (`008_create_image_pipeline.sql`): Extends `listing_images` with `mime_type`, `file_size_bytes`, `width`, `height`, `storage_key_original/thumb/medium/large`, `status`, `processing_error`, `updated_at`, `deleted_at` + new `image_jobs` table
- [x] **Schema** updated in `phase1_phase2_schema.sql`
- [x] **ListingImage entity** rewritten with all new fields + `ImageStatus` type union
- [x] **ImageJob entity** created (`id`, `imageId`, `jobType`, `status`, `attemptCount`, `lastError`, timestamps)
- [x] **ImageProcessingService** created: `processImage()` (Sharp with rotate, resize to 320/900/1600px WebP variants), `deleteImageFiles()`, `buildImageUrls()`
- [x] **listings.service.ts** rewritten: `addImage()`, `getListingImages()`, `removeImage()` (soft-delete), `setCoverImage()`, `reorderImages()`. `findAll()` now filters `deleted_at IS NULL`
- [x] **listings.controller.ts** rewritten: all image endpoints (`GET/POST/:id/images`, `PATCH/:id/images/order`, `PATCH/:id/images/:id/cover`, `DELETE/:id/images/:id`). Routes placed before `/:id` to avoid UUID conflict
- [x] **uploads.controller.ts** simplified: kept `POST /uploads/listings/:listingId` as backward-compat alias
- [x] **listings.module.ts** updated to include `ImageJob` entity and export `ImageProcessingService`
- [x] **main.ts** Swagger docs updated to v0.3.0 with image pipeline documentation
- [x] **ImageFileValidator** created in `src/common/image-upload.utils.ts` — validates via magic bytes (file-type), falls back to browser MIME type if detection fails
- [x] `getListingImages` fixed: filter now correctly uses `IsNull()` instead of `Not(IsNull())` to return active (non-deleted) images

### Image Pipeline — Frontend
- [x] **`api-client.ts`** updated: added `multipart: boolean` option to skip `Content-Type: application/json`
- [x] **`listings.service.ts`** rewritten: Added `ListingImage` interface with all new fields, `ImageStatus` type, `getImageUrl()`, `getPrimaryImage()`, `getListingImages()`, `uploadImage()`, `deleteImage()`, `setCoverImage()`, `reorderImages()`
- [x] **`listings/create/page.tsx`** rewritten: 2-step flow (form → image upload step). Shows drop zone, pending preview thumbnails, uploaded image strip with delete/cover badge, `uploadImage()` per file, skip option
- [x] **`listings/[id]/page.tsx`** updated: uses `getImageUrl(img, 'large')` for main, `getImageUrl(img, 'thumb')` for strip, click-to-swap, `!img.deletedAt` filter, `setActiveImage` state

### Sample Data
- [x] **`backend/scripts/generate-samples.js`**: Node script generating 3 sets of placeholder images (Electronics/Furniture/Clothing) at 4 resolutions each using Sharp SVG rendering
- [x] Generated 12 files in `backend/uploads/listings/samples/`
- [x] **`database/seeds/003_seed_sample_images.sql`**: PL/pgSQL seed linking sample images to the first 3 active listings

### Bugs Fixed (this session)
- [x] 3× `null as any` casts in `setCoverImage()` and `reorderImages()` → replaced with `Not(IsNull())`
- [x] `getListingImages` inverted filter: `Not(IsNull())` → `IsNull()` (was returning deleted images instead of active ones)
- [x] `image-processing.service.ts`: removed `processingError: null` (entity field is `string`, not nullable), switched to `findOneOrFail`
- [x] `listings.service.ts`: switched to `findOneOrFail` for `setCoverImage` return type
- [x] `ListingImage` interface: added `deletedAt: string | null` field
- [x] `listings/[id]/page.tsx`: filter by `deletedAt` instead of `status !== 'deleted'`
- [x] `frontend/src/app/listings/create/page.tsx`: removed unused `getPrimaryImage` import
- [x] `listings.controller.ts`: duplicate `FileInterceptor` import removed
- [x] `uploads.controller.ts`: `Query` decorator re-added after rewrite
- [x] **Image upload always rejected PNG**: `ImageFileValidator` returned `false` when `file.buffer` was undefined (disk storage mode doesn't always populate buffer). Fixed: removed `!file.buffer` early return — now accepts files with no buffer if browser MIME type is valid
- [x] **Sharp import broken**: Missing `esModuleInterop: true` in `tsconfig.json` caused `(0, sharp_1.default) is not a function` — Sharp is CommonJS with no `.default`. Added `esModuleInterop: true` and rebuilt
- [x] **Images not showing (path mismatch)**: `processImage()` built paths as `join(process.cwd(), "uploads", rawPath)` where `rawPath = "uploads/listings/<uuid>.png"`, creating double `uploads`. Fixed: `UPLOAD_DIR` env var (`./uploads`) resolved with `realpathSync` fallback, shared across `main.ts`, `image-upload.utils.ts`, `image-processing.service.ts` — consistent path regardless of working directory
- [x] **Images not showing (Next.js proxy)**: Stray `package-lock.json` in project root confused Next.js (it used project root as workspace, ignoring `frontend/next.config.js`). Deleted stray file. Images now go directly to `http://localhost:3001/uploads/...` via `NEXT_PUBLIC_BACKEND_URL` env var — no proxy needed
- [x] **`buildImageUrl` missing `listings/` prefix**: URLs were `/uploads/<storageKey>` but storage key already contains `listingId/thumb/...`, missing the `listings/` segment. Fixed to `/uploads/listings/<storageKey>`
- [x] **Image zoom/lightbox**: Added full-screen lightbox on listing detail page — scroll to zoom (0.5x–4x), drag to pan when zoomed, ← → to navigate images, Escape to close, keyboard +/-/0 zoom controls

### Hardening Pass — security, correctness, tooling
All verified by the new backend test suite (`npm test`, `npm run test:e2e`).

**Security**
- [x] Password hashes and emails were returned to anonymous users by `GET /listings` and `GET /listings/:id` (and to chat partners / review readers). Fixed: `passwordHash` has `select: false`; `User.toJSON()` emits public fields only (covers REST and Socket.IO); own account via `toSelfUser()` (`users/user-views.ts`)
- [x] WebSocket `joinConversation` let any logged-in user subscribe to any chat → participant check with ack
- [x] Deactivated users could still log in / use tokens / open sockets → checked on login, on every request (JwtStrategy re-reads the user) and on socket connect
- [x] JWT strategy fell back to `"fallback-secret"` → `getOrThrow`
- [x] Uploads: magic-byte check never ran (disk storage has no buffer, `file-type` not installed) and the stored extension came from the client filename (an `.html` "image" was served from `/uploads`). Now memory storage → sharp decodes the bytes → only JPEG/PNG/WebP, stored under the detected extension, nothing written before ownership + format checks
- [x] Originals (with EXIF/GPS) were publicly served → `/uploads/listings/*/original/*` returns 404; variants are re-encoded without metadata
- [x] Rate limiting (`@nestjs/throttler`): per user when logged in, per IP for guests (Syrian mobile carriers use carrier-grade NAT), stricter on auth and writes. `helmet` headers. CORS allowlist via `CORS_ORIGINS` (REST + Socket.IO)
- [x] Reviews required no interaction → need a conversation about the listing in which the reviewed user replied; `listingId` required

**Correctness**
- [x] Image queries used `Not(IsNull())` (= deleted images only): every upload became cover with sortOrder 0, set-cover 404, reorder 400, 15-image cap never applied. `deletedAt` is now a `@DeleteDateColumn`, so TypeORM excludes deleted images everywhere automatically
- [x] Search hid listings whose images were all deleted; images returned unordered → ordered by `sortOrder`
- [x] Deleting the cover image left no cover → next image promoted; delete checks the image belongs to the listing in the URL
- [x] Listing delete was a hard delete that cascaded to conversations/messages → soft delete (migration 009 `deleted_at`); chats kept and labelled "listing deleted"
- [x] Drafts/removed/expired listings visible to anyone by ID → owner/staff only. Owners can no longer set `removed`, nor edit a moderator-removed listing. Deactivated sellers' listings hidden. View counter now increments (not for the owner)
- [x] Category filter ignored subcategories; `%`/`_` in search matched everything; malformed filters / unknown categories / oversize fields caused 500s → 400s
- [x] Slugs dropped Arabic letters; emails were case-sensitive at login
- [x] Conversations list ran one COUNT per conversation → one grouped query; messages capped at 5000 chars
- [x] Frontend: filter changes pushed the *previous* filter state to the URL (stale closure); owners couldn't open their own drafts (no token sent)

**Syria basics**
- [x] Currency: `SYP` (default) / `USD` only (migration 009 + DTO + create form selector + currency filter); prices formatted without decimals for SYP ("SYP 1,500,000", "$650", 0 = "Free"); ZIP field removed from the form; demo data moved to Damascus/Aleppo/Homs

**Tooling**
- [x] `migrate.sh` tracks applied files in `schema_migrations` (one transaction each, `--status`, `--baseline`), default port 5433 to match compose; shared `db-env.sh`; explicit env overrides `.env`
- [x] Dockerfiles (backend, frontend standalone) + compose profile `app` (migrate → backend → frontend, uploads volume); `docker compose up -d` still starts only Postgres
- [x] GitHub Actions CI: backend lint/typecheck/unit/e2e/build, migration scripts, frontend lint/typecheck/build, Docker builds
- [x] `.env.example` files (root, backend, frontend); `lint` no longer auto-fixes (`lint:fix` does)

---

## Current State

**What works:**
- Image upload flow (create listing → upload images → view on detail page)
- Browse view shows listings with image thumbnails
- Image variants (thumb/medium/large) generated via Sharp
- Image validation (magic bytes + browser MIME fallback)
- Static file serving at `/uploads`
- Soft delete for images
- Set cover image, reorder images
- Image zoom/lightbox on detail page

**What needs to be done:**
1. Phase 2 — Favorites UI (heart button on listing cards + `/favorites` page)
2. Phase 2 — Edit listing page (edit form + image management)
3. Phase 2 — Reviews UI (rating display + leave review form)
4. Phase 2 — Reports & moderation (report button + admin dashboard)
5. Polish — error states, loading states, mobile layout

---

## Key Files

### Backend Created/Modified
| File | Description |
|------|-------------|
| `database/migrations/008_create_image_pipeline.sql` | Image pipeline schema |
| `database/seeds/003_seed_sample_images.sql` | Sample image seed |
| `backend/src/modules/listings/listing-image.entity.ts` | Extended with new fields |
| `backend/src/modules/listings/image-job.entity.ts` | Job tracking entity |
| `backend/src/modules/listings/image-processing.service.ts` | Sharp processing |
| `backend/src/modules/listings/listings.service.ts` | All image operations |
| `backend/src/modules/listings/listings.controller.ts` | Image API endpoints |
| `backend/src/modules/listings/listings.module.ts` | Module wiring |
| `backend/src/modules/uploads/uploads.controller.ts` | Simplified alias |
| `backend/src/common/image-upload.utils.ts` | Shared upload validator + storage |
| `backend/scripts/generate-samples.js` | Sample image generator |

### Frontend Created/Modified
| File | Description |
|------|-------------|
| `frontend/src/services/listings.service.ts` | Image types + API methods + `getImageUrl` |
| `frontend/src/services/api-client.ts` | Multipart support |
| `frontend/src/app/page.tsx` | Browse with filters |
| `frontend/src/app/categories/page.tsx` | Category navigation |
| `frontend/src/app/listings/create/page.tsx` | 2-step create flow |
| `frontend/src/app/listings/[id]/page.tsx` | Image gallery + zoom lightbox |
| `frontend/.env.local` | `NEXT_PUBLIC_BACKEND_URL=http://localhost:3001` |

---

## Next Steps (Priority Order) — towards "Kleinanzeigen for Syria"

1. **[ ] Arabic first** — i18n (e.g. next-intl), Arabic default + RTL layout, English second; Arabic-normalised search (hamza forms, ة/ه, ى/ي, diacritics, Arabic-Indic digits) with a `pg_trgm` index
2. **[ ] Syrian locations** — governorate → city/area table (Arabic + English names) replacing free-text city
3. **[ ] Syrian categories + attributes** — real estate (rooms, m², floor, ownership document), cars (make, model, year, km, fuel, gearbox), phones, solar/batteries/generators, jobs, building materials, livestock; per-category filters; price types (on request / free / swap)
4. **[ ] Phone-first accounts** — +963 numbers with OTP (local SMS gateway or WhatsApp), password reset, optional Call/WhatsApp buttons on listings
5. **[ ] Server-rendered listing/search pages** — fast first load on slow connections, Google indexing, link previews when shared on WhatsApp/Telegram/Facebook
6. **[ ] Trust & safety** — reports + admin moderation (spec MVP), block user, prohibited-items keyword filter (weapons, drugs), verified-phone badge
7. **[ ] Phase 2 UI** — edit listing, favorites, reviews, seller profile pages
8. **[ ] Engagement** — saved searches with alerts, listing expiry + renew, push / Telegram notifications
9. **[ ] Scale** — refresh tokens, background image queue (`image_jobs`), S3/MinIO + CDN, Redis (rate limits, sockets), monitoring

---

## Independent review pass (second opinion)

Found by reading the code and exercising the running app (API probes + browser flows); each fix has a test that fails without it where practical.

**Fixed — backend**
- Private originals (EXIF/GPS) were downloadable through alternative URL spellings (`%6Friginal`, `//original`, `/thumb/../original`, `%2F`); responses also printed the original's storage path
- Duplicate simultaneous requests (register, favorite, review, start conversation) and NUL characters in text crashed with 500 → 409 / 400; a raced conversation start now reuses the conversation
- WebSocket auth ran after "connected", so an immediate `joinConversation` could be rejected and the chat got no live messages → auth moved into a namespace middleware
- Unread badge never refreshed after reading; new `POST /conversations/:id/read`
- `GET /categories/:slug` 200-with-empty-body → 404; inactive subcategories hidden; favorites no longer show taken-down listings; image list honours deactivated sellers; deleting an image of a deleted listing was a 500; stable paging order
- Demo seed users could not log in (hash did not match `password123`)

**Fixed — frontend**
- Browse page ignored URL changes (Back/Forward, "Browse" link), fetched on every keystroke, showed errors as "No listings found"
- One socket per session (was one per hook during connect, never closed); rejoin + reload after reconnect; unlimited reconnect attempts
- Offline/5xx at startup logged the user out; expired tokens left a half-working UI
- Retrying a failed photo upload re-sent finished files; repeated "Contact Seller" clicks spammed the seller; "My listings" stopped at 20
- Docker image no longer routes REST through the Next.js proxy (all guests shared one rate-limit bucket)

**Known, not fixed (need a decision or belong to the roadmap)**
- Photos of a soft-deleted listing stay publicly reachable by URL (files are kept so a moderator can restore) → purge after a retention period or check the DB before serving
- JWT in `localStorage`, no refresh/revocation; open sockets are not closed when an account is deactivated
- Messages, conversations, reviews and favorites lists are unpaginated
- Price sort and price range compare SYP and USD amounts as plain numbers
- Category filter covers one level of subcategories only
- No edit-listing / mark-as-sold / favorites / reviews / report UI although the API exists; listings go live before any photo is uploaded (spec asks for at least one image)
- Swagger UI (`/api/docs`) is served in production too
- Mobile header overflows at phone width; category icons render as text ("laptop"); enum values shown raw ("like_new")

---

## Lint & Typecheck Status

- **Backend**: ✅ 0 errors, 0 warnings; 13 unit + 60 e2e tests passing
- **Frontend**: ✅ 0 errors

Run with: `cd backend && npm run lint && npm run typecheck && npm test && npm run test:e2e` / `cd frontend && npm run lint && npm run typecheck`
