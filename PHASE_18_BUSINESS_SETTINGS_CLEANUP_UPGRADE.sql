-- Groenics Phase 18: Business Settings cleanup
-- Run after PHASE_17_EMPLOYEES_VENTURES_UPGRADE.sql.

BEGIN;

ALTER TABLE business_settings
  ADD COLUMN IF NOT EXISTS currency_code TEXT NOT NULL DEFAULT 'INR',
  ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata';

ALTER TABLE business_settings DROP CONSTRAINT IF EXISTS business_settings_currency_code_check;
ALTER TABLE business_settings ADD CONSTRAINT business_settings_currency_code_check
  CHECK (currency_code IN ('INR', 'USD', 'GBP', 'EUR', 'AED'));

ALTER TABLE business_settings DROP CONSTRAINT IF EXISTS business_settings_timezone_check;
ALTER TABLE business_settings ADD CONSTRAINT business_settings_timezone_check
  CHECK (timezone IN (
    'Asia/Kolkata', 'Asia/Dubai', 'Europe/London',
    'Europe/Berlin', 'America/New_York', 'America/Los_Angeles', 'UTC'
  ));

UPDATE business_settings
SET currency_code = COALESCE(NULLIF(currency_code, ''), 'INR'),
    timezone = COALESCE(NULLIF(timezone, ''), 'Asia/Kolkata');

COMMIT;
