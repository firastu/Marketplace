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

## Next Steps (Priority Order)

1. **[ ] Phase 2: Favorites UI** — Heart button on listing cards + `/favorites` page
2. **[ ] Phase 2: Edit listing page** — Edit form + image management
3. **[ ] Phase 2: Reviews UI** — Rating display + leave review form
4. **[ ] Phase 2: Reports & moderation** — Report button + admin dashboard
5. **[ ] Polish** — Error states, loading states, mobile layout

---

## Lint & Typecheck Status

- **Backend**: ✅ 0 errors (1 pre-existing warning in `auth.module.ts`)
- **Frontend**: ✅ 0 errors

Run with: `cd backend && npm run lint && npm run typecheck` / `cd frontend && npm run lint && npm run typecheck`
