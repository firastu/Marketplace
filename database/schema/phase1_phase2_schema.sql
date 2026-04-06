-- ============================================================
-- Marketplace App: Full Schema (Phase 1 + Phase 2)
-- Generated from individual migration files
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
    currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
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
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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

CREATE INDEX idx_listing_images_listing ON listing_images (listing_id);
CREATE INDEX idx_listing_images_primary ON listing_images (listing_id, is_primary);

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
