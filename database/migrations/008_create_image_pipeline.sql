-- Migration 008: Image pipeline (listing_images + image_jobs)
-- Based on docs/Images.md

-- ── Extend listing_images ──────────────────────────────────────────────────

ALTER TABLE listing_images
  ADD COLUMN mime_type VARCHAR(50),
  ADD COLUMN file_size_bytes BIGINT,
  ADD COLUMN width INTEGER,
  ADD COLUMN height INTEGER,
  ADD COLUMN storage_key_original TEXT,
  ADD COLUMN storage_key_thumb TEXT,
  ADD COLUMN storage_key_medium TEXT,
  ADD COLUMN storage_key_large TEXT,
  ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'processing'
    CHECK (status IN ('uploaded', 'processing', 'ready', 'failed', 'deleted')),
  ADD COLUMN processing_error TEXT,
  ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN deleted_at TIMESTAMPTZ;

ALTER TABLE listing_images
  ALTER COLUMN status DROP DEFAULT;

CREATE INDEX idx_listing_images_status ON listing_images (status);

-- ── image_jobs ────────────────────────────────────────────────────────────
-- Minimal DB-backed job queue for image processing (avoids RabbitMQ)

CREATE TABLE image_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    image_id UUID NOT NULL REFERENCES listing_images(id) ON DELETE CASCADE,
    job_type VARCHAR(30) NOT NULL
      CHECK (job_type IN ('generate_variants', 'delete_files', 'reprocess')),
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
      CHECK (status IN ('pending', 'running', 'done', 'failed')),
    attempt_count INT NOT NULL DEFAULT 0,
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_image_jobs_status ON image_jobs (status);
CREATE INDEX idx_image_jobs_image ON image_jobs (image_id);
