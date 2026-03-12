-- Migration 003: Create listings table
-- Phase 1

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

CREATE INDEX idx_listings_user ON listings (user_id);
CREATE INDEX idx_listings_category ON listings (category_id);
CREATE INDEX idx_listings_status ON listings (status);
CREATE INDEX idx_listings_slug ON listings (slug);
CREATE INDEX idx_listings_price ON listings (price);
CREATE INDEX idx_listings_location ON listings (location_city, location_zip);
CREATE INDEX idx_listings_created ON listings (created_at DESC);
