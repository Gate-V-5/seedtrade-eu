-- Additive, local work-package migration; no production execution. Existing rows keep NULL details.
ALTER TABLE b2b_offers ADD COLUMN details_json JSON NULL;
