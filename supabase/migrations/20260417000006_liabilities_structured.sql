ALTER TABLE liabilities
  ADD COLUMN IF NOT EXISTS subtype TEXT NOT NULL DEFAULT 'informal_debt',
  ADD COLUMN IF NOT EXISTS current_balance NUMERIC,
  ADD COLUMN IF NOT EXISTS monthly_payment NUMERIC,
  ADD COLUMN IF NOT EXISTS interest_rate NUMERIC,
  ADD COLUMN IF NOT EXISTS next_payment_date DATE,
  ADD COLUMN IF NOT EXISTS due_date DATE;

UPDATE liabilities
SET subtype = CASE
  WHEN type = 'credit' THEN 'informal_credit'
  ELSE 'informal_debt'
END;
