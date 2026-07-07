-- Groenics task handover upgrade
-- Run this in Supabase SQL Editor to store WhatsApp numbers for task handovers.

ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS assigned_to_phone TEXT;
