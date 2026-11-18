-- Migration 011: Arabic category names
--
-- The interface is becoming Arabic-first, so categories need an Arabic
-- name next to the English one. name_ar is optional: the client falls
-- back to name. Existing databases get names for the seeded categories;
-- fresh databases get them from seeds/001_seed_categories.sql.

ALTER TABLE categories ADD COLUMN name_ar VARCHAR(100);

UPDATE categories c
SET name_ar = v.name_ar
FROM (VALUES
    ('electronics', 'إلكترونيات'),
    ('vehicles', 'مركبات'),
    ('fashion', 'أزياء'),
    ('home-garden', 'المنزل والحديقة'),
    ('sports-leisure', 'رياضة وترفيه'),
    ('baby-kids', 'مستلزمات الأطفال'),
    ('books-media', 'كتب ووسائط'),
    ('pets', 'حيوانات أليفة'),
    ('services', 'خدمات'),
    ('other', 'أخرى'),
    ('smartphones', 'موبايلات'),
    ('laptops', 'لابتوبات'),
    ('tablets', 'تابلت'),
    ('tvs-audio', 'تلفزيونات وصوتيات'),
    ('cameras', 'كاميرات'),
    ('gaming', 'ألعاب فيديو'),
    ('womens-clothing', 'ملابس نسائية'),
    ('mens-clothing', 'ملابس رجالية'),
    ('shoes', 'أحذية'),
    ('accessories', 'إكسسوارات'),
    ('cars', 'سيارات'),
    ('motorcycles', 'دراجات نارية'),
    ('bicycles', 'دراجات هوائية'),
    ('vehicle-parts', 'قطع غيار وإكسسوارات')
) AS v(slug, name_ar)
WHERE c.slug = v.slug AND c.name_ar IS NULL;
