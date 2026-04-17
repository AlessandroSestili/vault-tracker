-- Allow positions without ISIN (manual tracking)
ALTER TABLE positions ALTER COLUMN isin DROP NOT NULL;
ALTER TABLE positions ALTER COLUMN units DROP NOT NULL;
ALTER TABLE positions ADD COLUMN is_manual BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE positions ADD COLUMN current_value_eur NUMERIC(18,2);

-- Debts and credits
CREATE TABLE liabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('debt', 'credit')),
  amount NUMERIC(18,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  counterparty TEXT,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
