-- Migration 010: Arabic-aware search for listings
--
-- People spell the same Arabic word in several ways (أيفون / ايفون /
-- آيفون, سيارة / سياره, مستشفى / مستشفي), add diacritics or tatweel, and
-- type digits as ٤٣ or 43. Plain ILIKE treats all of these as different.
--
-- normalize_search_text() folds them into one form; listings.search_text
-- stores the normalised title + description (kept up to date by
-- PostgreSQL as a generated column) with a trigram index, so substring
-- search stays fast. The API normalises the query with the same function.
--
-- pg_trgm is a trusted extension (PostgreSQL 13+): the database owner can
-- create it without superuser rights.

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
