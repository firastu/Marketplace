Below is a **clear implementation plan for the image system** of your marketplace, designed for a **small first version**:

* **1 backend server**
* **1 separate large storage machine for images**
* **no large cloud infrastructure**
* **simple enough for AI agents to implement feature by feature**
* **structured so it can scale later without redesigning everything**

---

# Image System Implementation Plan

## 1. Goal

Build an image pipeline for marketplace listings that allows users to:

* upload images for a listing
* store image metadata in the main database
* store actual image files on a dedicated image storage unit
* generate optimized versions of images
* fetch listing images efficiently
* delete or reorder images safely
* keep the design simple enough for one backend server

The system should support:

* listing thumbnails
* listing detail images
* future moderation support
* future migration to object storage or CDN if needed

---

# 2. High-Level Architecture

## Components

### A. Backend Server

Responsible for:

* authentication
* upload validation
* metadata persistence
* image processing orchestration
* image URL generation
* listing APIs

### B. Main Database

Responsible for:

* image metadata
* relation between listing and images
* image processing state
* ordering
* soft deletion flags

### C. Storage Unit

Responsible for:

* storing original images
* storing generated variants
* serving files through static file hosting or via Nginx

---

# 3. Core Design Decision

## Store metadata in DB, not image bytes

The database must store:

* image ID
* listing ID
* file paths
* processing status
* order
* dimensions
* mime type
* file size

The actual file bytes must live on the storage unit.

This gives:

* simpler DB
* faster metadata queries
* easier future migration
* better separation of concerns

---

# 4. Functional Scope

## Version 1 must support

### Upload

A seller uploads one or more images for a listing.

### Storage

The system saves:

* original image
* optimized image variants

### Retrieval

Clients can fetch:

* thumbnail image
* medium image
* large image

### Ordering

Seller can reorder listing images.

### Deletion

Seller can delete images.

### Main Image

The first image or explicitly selected image becomes the listing cover image.

---

# 5. File Storage Strategy

## Directory Layout

Use deterministic paths on the storage unit.

Example:

```text
/images/
  listings/
    123/
      original/
        img_1001.jpg
        img_1002.jpg
      thumb/
        img_1001.webp
        img_1002.webp
      medium/
        img_1001.webp
        img_1002.webp
      large/
        img_1001.webp
        img_1002.webp
```

Where:

* `123` = listing ID
* each image keeps one internal image identifier

## Why this structure

* easy to debug
* easy to move
* easy to delete per listing
* clear separation by variant

---

# 6. Image Variants

## Required variants

### A. Original

Purpose:

* preserve uploaded source
* future reprocessing
* moderation reference

### B. Thumbnail

Purpose:

* search results
* seller profile cards
* category pages

Suggested size:

* width around 320 px

### C. Medium

Purpose:

* listing detail gallery preview

Suggested size:

* width around 900 px

### D. Large

Purpose:

* image viewer / zoom

Suggested size:

* width around 1600 px

## Format

Use:

* original keeps original format
* generated variants use WebP first
* keep JPEG fallback only if needed later

---

# 7. Database Schema

## Table: listing_images

```sql
listing_images
--------------
id
listing_id
storage_key_original
storage_key_thumb
storage_key_medium
storage_key_large
original_filename
mime_type
file_size_bytes
width_original
height_original
sort_order
is_cover
status
processing_error
created_at
updated_at
deleted_at
```

## Field Meaning

### id

Internal image ID

### listing_id

The listing to which the image belongs

### storage_key_*

Relative path or storage path

### mime_type

Original upload mime type

### file_size_bytes

Original file size

### width_original / height_original

Original dimensions

### sort_order

Controls display order

### is_cover

Marks main image

### status

Possible values:

* `uploaded`
* `processing`
* `ready`
* `failed`
* `deleted`

### processing_error

Stores last processing error

### deleted_at

Soft delete support

---

# 8. Upload Workflow

## Step-by-step flow

### Step 1: Client uploads image

Endpoint example:

```http
POST /listings/:listingId/images
```

### Step 2: Backend validates

Validate:

* authenticated seller
* seller owns listing
* file count limit
* max file size
* allowed mime types
* image content is valid

### Step 3: Save temporary file

Backend temporarily stores the uploaded file on local temp disk.

### Step 4: Insert metadata row

Create DB row with:

* listing ID
* original filename
* status = `uploaded`
* temporary metadata if known

### Step 5: Move original to storage unit

Store original file under deterministic path.

### Step 6: Start processing

Generate variants:

* thumb
* medium
* large

### Step 7: Update DB

After successful processing:

* save dimensions
* save storage keys
* set status = `ready`

### Step 8: Return response

Return image metadata and generated URLs.

---

# 9. Processing Strategy

## Recommended approach for your setup

Because you only have:

* 1 backend server
* 1 storage machine

use a **simple internal job system** first.

## Option A: Immediate processing

After upload, backend processes image before responding.

### Pros

* easiest to implement
* no job queue required

### Cons

* slower upload response
* heavy CPU work on backend

## Option B: Background processing on same server

Recommended.

Flow:

* upload succeeds
* backend stores original
* DB row status = `processing`
* backend creates internal job
* background worker process on same server generates variants
* DB updated to `ready`

### Why this is better

* upload response is faster
* processing is isolated
* future queue migration is easy

---

# 10. Internal Job Model

Use a simple DB-backed or Redis-backed job mechanism.

## Minimal version

Create a table like:

```sql
image_jobs
----------
id
image_id
job_type
status
attempt_count
last_error
created_at
updated_at
```

Job types:

* `generate_variants`
* `delete_files`
* `reprocess_image`

Job statuses:

* `pending`
* `running`
* `done`
* `failed`

## Worker behavior

A background process on the backend server:

* polls pending jobs
* locks one job
* processes it
* updates status

This avoids needing RabbitMQ at the start.

---

# 11. API Design

## Upload image

```http
POST /listings/:listingId/images
```

Response:

```json
{
  "imageId": 1001,
  "status": "processing"
}
```

## Get listing images

```http
GET /listings/:listingId/images
```

Response:

```json
[
  {
    "id": 1001,
    "sortOrder": 1,
    "isCover": true,
    "status": "ready",
    "urls": {
      "thumb": "/media/listings/123/thumb/img_1001.webp",
      "medium": "/media/listings/123/medium/img_1001.webp",
      "large": "/media/listings/123/large/img_1001.webp"
    },
    "width": 1200,
    "height": 900
  }
]
```

## Reorder images

```http
PATCH /listings/:listingId/images/order
```

Payload:

```json
{
  "imageIds": [1002, 1001, 1003]
}
```

## Set cover image

```http
PATCH /listings/:listingId/images/:imageId/cover
```

## Delete image

```http
DELETE /listings/:listingId/images/:imageId
```

---

# 12. Serving Images

## Recommended setup

The storage unit should expose image files through Nginx or a simple file server.

Example public path:

```text
/media/listings/123/thumb/img_1001.webp
```

The backend should only return URLs, not stream image bytes itself.

## Why

This keeps backend free from static file delivery work.

---

# 13. Validation Rules

## Upload constraints

Define clear rules:

### File types

Allow:

* JPEG
* PNG
* WebP

Reject:

* SVG
* GIF animation
* unknown formats

### File size

Set a max size per upload, for example:

* 10 MB per image

### Image count per listing

Set a max, for example:

* 10 or 15 images

### Minimum dimensions

Reject extremely small images

### Corrupt image detection

Try decoding file server-side before accepting

---

# 14. Image Processing Rules

## Required operations

### Auto-rotate by EXIF

Fix phone camera orientation automatically.

### Strip metadata

Remove unnecessary EXIF for privacy and smaller files.

### Resize

Generate target variants.

### Compress

Use quality settings for WebP.

### Keep aspect ratio

Never stretch image.

### Safe filenames

Do not trust user filenames for final storage paths.

---

# 15. Security Rules

## Must implement

### Authorization

Only listing owner can upload, reorder, or delete images.

### File type verification

Check actual file content, not only extension.

### Safe storage path generation

Never build paths directly from user input.

### Upload limits

Prevent abuse and disk flooding.

### Rate limiting

Limit upload frequency per user.

### Soft delete first

Mark DB row deleted before physical cleanup.

---

# 16. Deletion Strategy

## Delete flow

When user deletes image:

### Step 1

Mark image as deleted in DB:

* status = `deleted`
* set `deleted_at`

### Step 2

Remove image from listing response

### Step 3

Create cleanup job to remove:

* original
* thumb
* medium
* large

## Why soft delete first

Safer in case deletion fails halfway.

---

# 17. Cover Image Rules

## Business rule

Each listing should have at most one cover image.

## Behavior

* first uploaded image becomes cover automatically
* if cover image is deleted, next image by `sort_order` becomes cover
* seller can manually change cover image

---

# 18. Failure Handling

## Processing failures

If image processing fails:

* keep original if already saved
* set status = `failed`
* store error message
* allow retry

## Read behavior

Clients should not display failed images as normal images.

---

# 19. Performance Principles for Your Small Setup

Because you only have one backend server:

## Keep these rules

### Rule 1

Do not process too many images in parallel.

### Rule 2

Limit simultaneous processing jobs.

### Rule 3

Return thumbnails in list pages, never large images.

### Rule 4

Do not let backend proxy static images.

### Rule 5

Use lazy loading on frontend.

---

# 20. Migration-Friendly Design

Even though you start with:

* 1 backend server
* 1 storage machine

design paths and metadata so later you can migrate to:

* S3-compatible storage
* CDN
* external worker queue

## How

Always store image paths as logical storage keys, not hardcoded physical paths.

Example good:

```text
listings/123/thumb/img_1001.webp
```

Example bad:

```text
/mnt/storage1/usedstuff/listings/123/thumb/img_1001.webp
```

The DB should store logical keys. URL generation can map them to current host.

---

# 21. AI Agent Implementation Phases

This section is for your AI agents so they can build in order.

## Phase 1: Metadata Model

Implement:

* `listing_images` table
* image status model
* image ordering model
* cover image model

## Phase 2: Upload Endpoint

Implement:

* authenticated upload endpoint
* validation
* temp file handling
* metadata insert
* original file persistence

## Phase 3: Processing Worker

Implement:

* background worker loop
* image variant generation
* DB status updates
* retry support

## Phase 4: Read API

Implement:

* get listing images endpoint
* URL generation
* only ready images exposed publicly

## Phase 5: Management API

Implement:

* reorder images
* set cover image
* delete image
* cleanup jobs

## Phase 6: Frontend Contract

Implement response structure for:

* listing cards
* listing detail page
* seller listing management UI

## Phase 7: Reliability

Implement:

* retries
* failure logging
* processing metrics
* disk usage monitoring

---

# 22. End Product Definition

The final image feature should behave like this:

## Seller side

* seller uploads images for a listing
* images are validated
* originals are stored
* optimized variants are generated in background
* seller can reorder images
* seller can choose cover image
* seller can delete images

## Buyer side

* buyer sees thumbnails in list views
* buyer sees medium or large images on listing page
* images load fast because static files are served directly from storage host
* broken or failed images are hidden from public view

## System side

* DB holds metadata only
* storage unit holds actual files
* backend coordinates upload and processing
* worker on backend server handles image generation
* design is simple and future-proof

---

# 23. Explicit Non-Goals for Version 1

Do not implement yet:

* CDN integration
* distributed queues
* image deduplication
* AI moderation
* watermarking
* virus scanning pipeline
* multi-region storage
* advanced transformations on demand

These can come later.

---

# 24. Recommended Final Technical Summary

## Minimal implementation stack

### On backend server

* backend API
* auth
* upload handling
* DB access
* background worker
* optional Nginx for API reverse proxy

### On storage unit

* image file storage
* static serving via Nginx

### In database

* `listing_images`
* optional `image_jobs`

---

# 25. One-Sentence Product Summary for Agents

**Implement a simple marketplace image pipeline where the backend stores image metadata in the database, saves original and generated image variants on a dedicated storage machine, processes images asynchronously with a lightweight internal worker, and serves ready-to-use image URLs for listing cards and detail pages without requiring cloud-scale infrastructure.**

If you want, I can turn this into a **developer-ready spec file** in a cleaner format like:

* `overview`
* `requirements`
* `data model`
* `API contracts`
* `processing workflow`
* `acceptance criteria`
