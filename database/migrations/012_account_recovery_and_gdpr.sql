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
