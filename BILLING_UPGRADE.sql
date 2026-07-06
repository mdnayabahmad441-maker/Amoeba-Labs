-- Groenics billing upgrade
-- Run this in Supabase SQL Editor before using the upgraded Billing page.

-- Existing invoices.amount remains the invoice total for backwards compatibility.
-- Existing invoices.status is VARCHAR in the setup guide, so the new
-- 'Partially Paid' status works without an enum migration.

CREATE TABLE IF NOT EXISTS invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  service_name TEXT NOT NULL,
  description TEXT,
  quantity DECIMAL(10, 2) NOT NULL DEFAULT 1,
  rate DECIMAL(12, 2) NOT NULL DEFAULT 0,
  amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  amount DECIMAL(12, 2) NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  method VARCHAR(50) NOT NULL DEFAULT 'UPI',
  reference TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(payment_date);

ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Use these permissive policies only for the current private-owner portal setup.
-- Tighten them later if you add multiple portal users or teams.
CREATE POLICY "Allow authenticated invoice item access"
ON invoice_items
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow authenticated payment access"
ON payments
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Backfill one line item for old invoices that only have a single amount.
INSERT INTO invoice_items (invoice_id, service_name, description, quantity, rate, amount)
SELECT
  invoices.id,
  'Services rendered',
  invoices.notes,
  1,
  invoices.amount,
  invoices.amount
FROM invoices
WHERE NOT EXISTS (
  SELECT 1
  FROM invoice_items
  WHERE invoice_items.invoice_id = invoices.id
);
