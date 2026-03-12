-- Seed 002: Demo data for development
-- Creates demo users and sample listings

-- Demo users (passwords are bcrypt hash of 'password123')
INSERT INTO users (email, password_hash, username, display_name, bio, is_verified) VALUES
('alice@example.com', '$2b$10$xPPOz6GhBQYmMljBxIjpveVRAuliHMCGLnhSS1GSxMTvd9bnr19sy', 'alice', 'Alice Johnson', 'I love selling vintage items!', TRUE),
('bob@example.com', '$2b$10$xPPOz6GhBQYmMljBxIjpveVRAuliHMCGLnhSS1GSxMTvd9bnr19sy', 'bob', 'Bob Smith', 'Tech enthusiast and collector.', TRUE),
('charlie@example.com', '$2b$10$xPPOz6GhBQYmMljBxIjpveVRAuliHMCGLnhSS1GSxMTvd9bnr19sy', 'charlie', 'Charlie Brown', 'Looking for great deals.', FALSE);

-- Demo listings
INSERT INTO listings (user_id, category_id, title, slug, description, price, condition, status, location_city, location_zip, is_negotiable)
SELECT
    u.id,
    c.id,
    'iPhone 14 Pro - Excellent Condition',
    'iphone-14-pro-excellent-condition',
    'Selling my iPhone 14 Pro 256GB in excellent condition. Comes with original box and charger. Minor scratches on the edges, screen is perfect.',
    799.00,
    'like_new',
    'active',
    'Berlin',
    '10115',
    TRUE
FROM users u, categories c
WHERE u.username = 'alice' AND c.slug = 'smartphones';

INSERT INTO listings (user_id, category_id, title, slug, description, price, condition, status, location_city, location_zip, is_negotiable)
SELECT
    u.id,
    c.id,
    'IKEA KALLAX Shelf Unit',
    'ikea-kallax-shelf-unit',
    'White KALLAX shelf unit 4x4. In great condition, just some minor marks. Self-pickup in Munich.',
    45.00,
    'used',
    'active',
    'Munich',
    '80331',
    TRUE
FROM users u, categories c
WHERE u.username = 'bob' AND c.slug = 'home-garden';

INSERT INTO listings (user_id, category_id, title, slug, description, price, condition, status, location_city, location_zip, is_negotiable)
SELECT
    u.id,
    c.id,
    'Mountain Bike - Trek Marlin 7',
    'mountain-bike-trek-marlin-7',
    'Trek Marlin 7, size L, 2023 model. Ridden about 500km. Perfect for trails and commuting.',
    650.00,
    'like_new',
    'active',
    'Hamburg',
    '20095',
    FALSE
FROM users u, categories c
WHERE u.username = 'charlie' AND c.slug = 'bicycles';
