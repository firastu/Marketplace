-- Seed 003: Sample images for development
-- Inserts image records + generated variants for the first 3 listings.
-- Images live in backend/uploads/listings/samples/

DO $$
DECLARE
    sample_listing RECORD;
    image_counter INT := 0;
    img_id UUID;
    listing_counter INT := 0;
BEGIN
    FOR sample_listing IN
        SELECT l.id, l.title FROM listings l
        WHERE l.status = 'active'
        LIMIT 3
    LOOP
        listing_counter := listing_counter + 1;

        -- Electronics image for first listing
        IF listing_counter = 1 THEN
            INSERT INTO listing_images (
                listing_id, url, status, is_primary, sort_order,
                mime_type, width, height,
                storage_key_original, storage_key_thumb, storage_key_medium, storage_key_large
            ) VALUES (
                sample_listing.id,
                '/uploads/listings/samples/sample_1_original.jpg',
                'ready', TRUE, 0,
                'jpeg', 1200, 900,
                'samples/sample_1_original.jpg',
                'samples/sample_1_thumb.jpg',
                'samples/sample_1_medium.jpg',
                'samples/sample_1_large.jpg'
            );
        END IF;

        -- Furniture image for second listing
        IF listing_counter = 2 THEN
            INSERT INTO listing_images (
                listing_id, url, status, is_primary, sort_order,
                mime_type, width, height,
                storage_key_original, storage_key_thumb, storage_key_medium, storage_key_large
            ) VALUES (
                sample_listing.id,
                '/uploads/listings/samples/sample_2_original.jpg',
                'ready', TRUE, 0,
                'jpeg', 1200, 900,
                'samples/sample_2_original.jpg',
                'samples/sample_2_thumb.jpg',
                'samples/sample_2_medium.jpg',
                'samples/sample_2_large.jpg'
            );
        END IF;

        -- Clothing image for third listing
        IF listing_counter = 3 THEN
            INSERT INTO listing_images (
                listing_id, url, status, is_primary, sort_order,
                mime_type, width, height,
                storage_key_original, storage_key_thumb, storage_key_medium, storage_key_large
            ) VALUES (
                sample_listing.id,
                '/uploads/listings/samples/sample_3_original.jpg',
                'ready', TRUE, 0,
                'jpeg', 1200, 900,
                'samples/sample_3_original.jpg',
                'samples/sample_3_thumb.jpg',
                'samples/sample_3_medium.jpg',
                'samples/sample_3_large.jpg'
            );
        END IF;
    END LOOP;
END $$;
