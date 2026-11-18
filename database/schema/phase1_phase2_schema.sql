-- ============================================================
-- Marketplace App: Full Schema (Phase 1 + Phase 2)
-- Generated from individual migration files (001–013)
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- PHASE 1
-- ============================================================

-- Users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    username VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(150),
    avatar_url TEXT,
    phone VARCHAR(30),
    bio TEXT,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin', 'moderator')),
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Categories (self-referencing for subcategories)
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(120) NOT NULL UNIQUE,
    description TEXT,
    icon VARCHAR(50),
    parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Listings
CREATE TABLE listings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    title VARCHAR(200) NOT NULL,
    slug VARCHAR(250) NOT NULL,
    description TEXT NOT NULL,
    price NUMERIC(12, 2) NOT NULL CHECK (price >= 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'SYP' CONSTRAINT listings_currency_check CHECK (currency IN ('SYP', 'USD')),
    condition VARCHAR(20) NOT NULL DEFAULT 'used' CHECK (condition IN ('new', 'like_new', 'used', 'fair', 'poor')),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'sold', 'reserved', 'expired', 'removed')),
    location_city VARCHAR(100),
    location_zip VARCHAR(20),
    location_lat DOUBLE PRECISION,
    location_lng DOUBLE PRECISION,
    views_count INT NOT NULL DEFAULT 0,
    is_negotiable BOOLEAN NOT NULL DEFAULT TRUE,
    is_shipping_available BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Listing Images
CREATE TABLE listing_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    alt_text VARCHAR(255),
    sort_order INT NOT NULL DEFAULT 0,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    mime_type VARCHAR(50),
    file_size_bytes BIGINT,
    width INTEGER,
    height INTEGER,
    storage_key_original TEXT,
    storage_key_thumb TEXT,
    storage_key_medium TEXT,
    storage_key_large TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'processing'
        CHECK (status IN ('uploaded', 'processing', 'ready', 'failed', 'deleted')),
    processing_error TEXT
);

CREATE INDEX idx_listing_images_status ON listing_images (status);

-- Image Processing Jobs
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

-- Favorites
CREATE TABLE favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, listing_id)
);

-- ============================================================
-- PHASE 2
-- ============================================================

-- Conversations + Messages
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    last_message_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (listing_id, buyer_id, seller_id)
);

CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Reviews
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reviewed_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
    rating SMALLINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(200),
    body TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (reviewer_id, reviewed_user_id, listing_id)
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_username ON users (username);
CREATE INDEX idx_users_role ON users (role);

CREATE INDEX idx_categories_slug ON categories (slug);
CREATE INDEX idx_categories_parent ON categories (parent_id);
CREATE INDEX idx_categories_sort ON categories (sort_order);

CREATE INDEX idx_listings_user ON listings (user_id);
CREATE INDEX idx_listings_category ON listings (category_id);
CREATE INDEX idx_listings_status ON listings (status);
CREATE INDEX idx_listings_slug ON listings (slug);
CREATE INDEX idx_listings_price ON listings (price);
CREATE INDEX idx_listings_location ON listings (location_city, location_zip);
CREATE INDEX idx_listings_created ON listings (created_at DESC);
CREATE INDEX idx_listings_live_created ON listings (created_at DESC) WHERE deleted_at IS NULL AND status = 'active';

CREATE INDEX idx_listing_images_listing ON listing_images (listing_id);
CREATE INDEX idx_listing_images_primary ON listing_images (listing_id, is_primary);
CREATE INDEX idx_listing_images_live ON listing_images (listing_id, sort_order) WHERE deleted_at IS NULL;

CREATE INDEX idx_favorites_user ON favorites (user_id);
CREATE INDEX idx_favorites_listing ON favorites (listing_id);

CREATE INDEX idx_conversations_listing ON conversations (listing_id);
CREATE INDEX idx_conversations_buyer ON conversations (buyer_id);
CREATE INDEX idx_conversations_seller ON conversations (seller_id);

CREATE INDEX idx_messages_conversation ON messages (conversation_id);
CREATE INDEX idx_messages_sender ON messages (sender_id);
CREATE INDEX idx_messages_created ON messages (created_at DESC);

CREATE INDEX idx_reviews_reviewer ON reviews (reviewer_id);
CREATE INDEX idx_reviews_reviewed ON reviews (reviewed_user_id);
CREATE INDEX idx_reviews_listing ON reviews (listing_id);
CREATE INDEX idx_reviews_rating ON reviews (rating);

-- ============================================================
-- Arabic-aware search (migration 010)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE OR REPLACE FUNCTION normalize_search_text(input TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
RETURNS NULL ON NULL INPUT
AS $$
    SELECT btrim(regexp_replace(
        regexp_replace(
            -- hamza/alef forms, alef maqsura, ta marbuta, waw/ya hamza,
            -- Arabic-Indic and extended Arabic-Indic digits
            translate(lower(input), 'أإآٱىةؤئ٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹', 'اااايهوي01234567890123456789'),
            -- diacritics (tashkeel), superscript alef, tatweel,
            -- zero-width and direction marks
            '[\u064B-\u065F\u0670\u0640\u200B-\u200F]', '', 'g'
        ),
        '\s+', ' ', 'g'
    ))
$$;

ALTER TABLE listings
    ADD COLUMN search_text TEXT
    GENERATED ALWAYS AS (
        normalize_search_text(coalesce(title, '') || ' ' || coalesce(description, ''))
    ) STORED;

CREATE INDEX idx_listings_search_trgm
    ON listings USING gin (search_text gin_trgm_ops);

-- Arabic category names (migration 011)
ALTER TABLE categories ADD COLUMN name_ar VARCHAR(100);

-- ============================================================
-- 012_account_recovery_and_gdpr.sql
-- ============================================================

-- Migration 012: password reset, consent records and account deletion
--
-- users.terms_accepted_at / terms_version
--     When and which version of the Terms and Privacy Policy the user
--     accepted at sign-up (GDPR: demonstrable consent to the contract).
-- users.token_version
--     Copied into every login token. Changing or resetting the password
--     (or deleting the account) increments it, which invalidates all
--     tokens issued before, i.e. signs out every other session. A counter
--     is exact; comparing token timestamps (1 s precision) is not.
-- users.password_changed_at
--     When the password was last changed (informational).
-- users.deleted_at
--     Set when the user deletes their account. Personal data is erased in
--     the same transaction; the row stays so their messages in other
--     people's chats keep a (now anonymous) sender.
-- password_reset_tokens
--     One-time reset links. Only a SHA-256 hash of the token is stored.

ALTER TABLE users
    ADD COLUMN terms_accepted_at TIMESTAMPTZ,
    ADD COLUMN terms_version VARCHAR(20),
    ADD COLUMN token_version INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN password_changed_at TIMESTAMPTZ,
    ADD COLUMN deleted_at TIMESTAMPTZ;

CREATE TABLE password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash CHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_password_reset_tokens_user ON password_reset_tokens (user_id);
CREATE INDEX idx_password_reset_tokens_expires ON password_reset_tokens (expires_at);

-- ============================================================
-- 013_reports_and_moderation.sql
-- ============================================================

-- Migration 013: reports and moderation
--
-- listings.status 'pending_review'
--     Listings whose text matches the prohibited-terms list (weapons,
--     drugs, forged documents…) are held for a moderator instead of going
--     live. moderation_flags keeps the matched terms.
-- reports
--     Users report listings or other users. One open report per reporter
--     and target (partial unique index). Status follows the MVP spec:
--     open → under_review → resolved | dismissed.
-- moderation_actions
--     Audit log of every moderator decision, with its reason.

ALTER TABLE listings DROP CONSTRAINT listings_status_check;
ALTER TABLE listings ADD CONSTRAINT listings_status_check CHECK (
    status IN ('draft', 'active', 'sold', 'reserved', 'expired', 'removed', 'pending_review')
);
ALTER TABLE listings ADD COLUMN moderation_flags TEXT[] NOT NULL DEFAULT '{}';
CREATE INDEX idx_listings_pending_review
    ON listings (created_at)
    WHERE status = 'pending_review' AND deleted_at IS NULL;

CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id UUID REFERENCES users(id) ON DELETE SET NULL,
    target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('listing', 'user')),
    target_id UUID NOT NULL,
    reason VARCHAR(30) NOT NULL CHECK (reason IN (
        'prohibited_item', 'scam', 'counterfeit', 'offensive',
        'harassment', 'spam', 'wrong_category', 'other'
    )),
    details TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'open'
        CHECK (status IN ('open', 'under_review', 'resolved', 'dismissed')),
    resolution_note TEXT,
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX uq_reports_open_per_reporter_target
    ON reports (reporter_id, target_type, target_id)
    WHERE status IN ('open', 'under_review');
CREATE INDEX idx_reports_status_created ON reports (status, created_at DESC);
CREATE INDEX idx_reports_target ON reports (target_type, target_id);

CREATE TABLE moderation_actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    moderator_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(30) NOT NULL CHECK (action IN (
        'approve_listing', 'remove_listing', 'restore_listing',
        'suspend_user', 'reactivate_user', 'resolve_report', 'dismiss_report'
    )),
    target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('listing', 'user', 'report')),
    target_id UUID NOT NULL,
    reason TEXT,
    report_id UUID REFERENCES reports(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_moderation_actions_created ON moderation_actions (created_at DESC);
CREATE INDEX idx_moderation_actions_target ON moderation_actions (target_type, target_id);
