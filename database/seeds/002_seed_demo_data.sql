-- Seed 002: Demo data for development
-- Creates demo users and sample listings

-- Demo users (passwords are bcrypt hash of 'password123')
INSERT INTO users (email, password_hash, username, display_name, bio, is_verified) VALUES
('alice@example.com', '$2b$10$wTUO52hQvnYlQjD5wqBHSeSAhfuVD3vR5fR15PottWxngQMgD4lLO', 'alice', 'Alice Johnson', 'I love selling vintage items!', TRUE),
('bob@example.com', '$2b$10$wTUO52hQvnYlQjD5wqBHSeSAhfuVD3vR5fR15PottWxngQMgD4lLO', 'bob', 'Bob Smith', 'Tech enthusiast and collector.', TRUE),
('charlie@example.com', '$2b$10$wTUO52hQvnYlQjD5wqBHSeSAhfuVD3vR5fR15PottWxngQMgD4lLO', 'charlie', 'Charlie Brown', 'Looking for great deals.', FALSE);

-- Demo listings
INSERT INTO listings (user_id, category_id, title, slug, description, price, currency, condition, status, location_city, is_negotiable)
SELECT
    u.id,
    c.id,
    'iPhone 14 Pro - Excellent Condition',
    'iphone-14-pro-excellent-condition',
    'Selling my iPhone 14 Pro 256GB in excellent condition. Comes with original box and charger. Minor scratches on the edges, screen is perfect.',
    650.00,
    'USD',
    'like_new',
    'active',
    'Damascus',
    TRUE
FROM users u, categories c
WHERE u.username = 'alice' AND c.slug = 'smartphones';

INSERT INTO listings (user_id, category_id, title, slug, description, price, currency, condition, status, location_city, is_negotiable)
SELECT
    u.id,
    c.id,
    'مكتبة خشب بيضاء ٤×٤',
    'مكتبة-خشب-بيضاء',
    'مكتبة خشب بيضاء بحالة ممتازة، فيها بعض الخدوش البسيطة. الاستلام من حلب. White wooden shelf unit, pickup in Aleppo.',
    5500.00,
    'SYP',
    'used',
    'active',
    'Aleppo',
    TRUE
FROM users u, categories c
WHERE u.username = 'bob' AND c.slug = 'home-garden';

INSERT INTO listings (user_id, category_id, title, slug, description, price, currency, condition, status, location_city, is_negotiable)
SELECT
    u.id,
    c.id,
    'Mountain Bike - Trek Marlin 7',
    'mountain-bike-trek-marlin-7',
    'Trek Marlin 7, size L, 2023 model. Ridden about 500km. Perfect for trails and commuting. Pickup in Homs.',
    420.00,
    'USD',
    'like_new',
    'active',
    'Homs',
    FALSE
FROM users u, categories c
WHERE u.username = 'charlie' AND c.slug = 'bicycles';
