-- Groenics Phase 4: Strategic reporting configuration
-- Run after SECURITY_AND_DATA_PROTECTION_UPGRADE.sql.

ALTER TABLE business_settings
  ADD COLUMN IF NOT EXISTS monthly_revenue_target NUMERIC(14,2)
  NOT NULL DEFAULT 0
  CHECK (monthly_revenue_target >= 0);

COMMENT ON COLUMN business_settings.monthly_revenue_target IS
  'Founder-defined monthly collection target used by the strategic Reports page.';
