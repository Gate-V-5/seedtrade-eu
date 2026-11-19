-- Roll back application first. Export and retain any non-NULL details before dropping this column.
-- This DDL removes new offer-detail fields only; existing columns/rows remain.
ALTER TABLE b2b_offers DROP COLUMN details_json;
