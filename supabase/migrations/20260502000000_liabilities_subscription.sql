-- Add subscription support to liabilities table
ALTER TABLE liabilities
  ADD COLUMN IF NOT EXISTS billing_cycle text CHECK (billing_cycle IN ('monthly', 'quarterly', 'semiannual', 'annual')),
  ADD COLUMN IF NOT EXISTS day_of_month smallint CHECK (day_of_month >= 1 AND day_of_month <= 31);
