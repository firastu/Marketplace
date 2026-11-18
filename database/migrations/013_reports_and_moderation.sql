-- Migration 013: reports and moderation
--
-- listings.status 'pending_review'
--     Listings whose text matches the prohibited-terms list (weapons,
--     drugs, forged documents…) are held for a moderator instead of going
--     live. moderation_flags keeps the matched terms.
-- reports
--     Users report listings or other users. One open report per reporter
--     and target (partial unique index). Status follows the MVP spec:
--     open → under_review → resolved | dismissed.
-- moderation_actions
--     Audit log of every moderator decision, with its reason.

ALTER TABLE listings DROP CONSTRAINT listings_status_check;
ALTER TABLE listings ADD CONSTRAINT listings_status_check CHECK (
    status IN ('draft', 'active', 'sold', 'reserved', 'expired', 'removed', 'pending_review')
);
ALTER TABLE listings ADD COLUMN moderation_flags TEXT[] NOT NULL DEFAULT '{}';
CREATE INDEX idx_listings_pending_review
    ON listings (created_at)
    WHERE status = 'pending_review' AND deleted_at IS NULL;

CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id UUID REFERENCES users(id) ON DELETE SET NULL,
    target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('listing', 'user')),
    target_id UUID NOT NULL,
    reason VARCHAR(30) NOT NULL CHECK (reason IN (
        'prohibited_item', 'scam', 'counterfeit', 'offensive',
        'harassment', 'spam', 'wrong_category', 'other'
    )),
    details TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'open'
        CHECK (status IN ('open', 'under_review', 'resolved', 'dismissed')),
    resolution_note TEXT,
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX uq_reports_open_per_reporter_target
    ON reports (reporter_id, target_type, target_id)
    WHERE status IN ('open', 'under_review');
CREATE INDEX idx_reports_status_created ON reports (status, created_at DESC);
CREATE INDEX idx_reports_target ON reports (target_type, target_id);

CREATE TABLE moderation_actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    moderator_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(30) NOT NULL CHECK (action IN (
        'approve_listing', 'remove_listing', 'restore_listing',
        'suspend_user', 'reactivate_user', 'resolve_report', 'dismiss_report'
    )),
    target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('listing', 'user', 'report')),
    target_id UUID NOT NULL,
    reason TEXT,
    report_id UUID REFERENCES reports(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_moderation_actions_created ON moderation_actions (created_at DESC);
CREATE INDEX idx_moderation_actions_target ON moderation_actions (target_type, target_id);
