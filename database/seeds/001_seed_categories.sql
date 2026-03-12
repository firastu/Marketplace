-- Seed 001: Default categories
-- Marketplace categories with subcategories

INSERT INTO categories (name, slug, description, icon, parent_id, sort_order) VALUES
('Electronics', 'electronics', 'Smartphones, computers, cameras and more', 'laptop', NULL, 1),
('Vehicles', 'vehicles', 'Cars, motorcycles, bicycles', 'car', NULL, 2),
('Fashion', 'fashion', 'Clothing, shoes, accessories', 'shirt', NULL, 3),
('Home & Garden', 'home-garden', 'Furniture, appliances, garden tools', 'home', NULL, 4),
('Sports & Leisure', 'sports-leisure', 'Sports equipment, outdoor, hobbies', 'dumbbell', NULL, 5),
('Baby & Kids', 'baby-kids', 'Toys, clothing, strollers', 'baby', NULL, 6),
('Books & Media', 'books-media', 'Books, music, movies, games', 'book', NULL, 7),
('Pets', 'pets', 'Pet supplies and accessories', 'paw', NULL, 8),
('Services', 'services', 'Offered and requested services', 'tools', NULL, 9),
('Other', 'other', 'Everything else', 'box', NULL, 10);

-- Subcategories for Electronics
INSERT INTO categories (name, slug, description, icon, parent_id, sort_order)
SELECT sub.n, sub.s, sub.d, sub.i, c.id, sub.so
FROM (VALUES
    ('Smartphones', 'smartphones', 'Mobile phones and accessories', 'smartphone', 1),
    ('Laptops', 'laptops', 'Notebooks and laptops', 'laptop', 2),
    ('Tablets', 'tablets', 'Tablets and e-readers', 'tablet', 3),
    ('TVs & Audio', 'tvs-audio', 'Televisions, speakers, headphones', 'tv', 4),
    ('Cameras', 'cameras', 'Digital cameras and equipment', 'camera', 5),
    ('Gaming', 'gaming', 'Consoles, games, accessories', 'gamepad', 6)
) AS sub(n, s, d, i, so)
CROSS JOIN categories c WHERE c.slug = 'electronics';

-- Subcategories for Vehicles
INSERT INTO categories (name, slug, description, icon, parent_id, sort_order)
SELECT sub.n, sub.s, sub.d, sub.i, c.id, sub.so
FROM (VALUES
    ('Cars', 'cars', 'Passenger vehicles', 'car', 1),
    ('Motorcycles', 'motorcycles', 'Motorcycles and scooters', 'motorcycle', 2),
    ('Bicycles', 'bicycles', 'Bicycles and e-bikes', 'bicycle', 3),
    ('Parts & Accessories', 'vehicle-parts', 'Vehicle parts and accessories', 'wrench', 4)
) AS sub(n, s, d, i, so)
CROSS JOIN categories c WHERE c.slug = 'vehicles';

-- Subcategories for Fashion
INSERT INTO categories (name, slug, description, icon, parent_id, sort_order)
SELECT sub.n, sub.s, sub.d, sub.i, c.id, sub.so
FROM (VALUES
    ('Women''s Clothing', 'womens-clothing', 'Dresses, tops, pants, jackets', 'dress', 1),
    ('Men''s Clothing', 'mens-clothing', 'Shirts, pants, suits, jackets', 'tshirt', 2),
    ('Shoes', 'shoes', 'All types of footwear', 'shoe', 3),
    ('Accessories', 'accessories', 'Bags, watches, jewelry', 'watch', 4)
) AS sub(n, s, d, i, so)
CROSS JOIN categories c WHERE c.slug = 'fashion';
