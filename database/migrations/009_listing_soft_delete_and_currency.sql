-- Migration 009: listing soft delete + Syrian currencies
--
-- 1. Soft delete. Deleting a listing used to DELETE the row, which cascaded
--    to conversations and messages and erased the buyer's chat history.
--    The app now sets deleted_at instead.
-- 2. Currencies. Prices are in Syrian pounds (SYP) or US dollars (USD).
--    EUR was only the default inherited from the original template; any
--    such rows are relabelled USD (the closest in value) so the new CHECK
--    constraint can be added. Review them if this database has real data.

ALTER TABLE listings ADD COLUMN deleted_at TIMESTAMPTZ;

DO $$
DECLARE
    relabelled INT;
BEGIN
    UPDATE listings SET currency = 'USD' WHERE currency NOT IN ('SYP', 'USD');
    GET DIAGNOSTICS relabelled = ROW_COUNT;
    IF relabelled > 0 THEN
        RAISE NOTICE 'Relabelled % listing(s) from a non-Syrian currency to USD', relabelled;
    END IF;
END $$;

ALTER TABLE listings ALTER COLUMN currency SET DEFAULT 'SYP';
ALTER TABLE listings
    ADD CONSTRAINT listings_currency_check CHECK (currency IN ('SYP', 'USD'));

-- Browse/search only reads live, active listings, newest first.
CREATE INDEX idx_listings_live_created
    ON listings (created_at DESC)
    WHERE deleted_at IS NULL AND status = 'active';

-- Listing pages only read live images, in display order.
CREATE INDEX idx_listing_images_live
    ON listing_images (listing_id, sort_order)
    WHERE deleted_at IS NULL;
