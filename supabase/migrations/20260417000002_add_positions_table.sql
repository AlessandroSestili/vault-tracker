-- Create positions table (individual instruments: ETF, stock, crypto, etc.)
CREATE TABLE positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  isin TEXT NOT NULL,
  units NUMERIC(18,6) NOT NULL,
  broker TEXT NOT NULL DEFAULT '',
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Migrate existing accounts with ISIN/units into positions
INSERT INTO positions (isin, units, broker, display_name, created_at)
SELECT isin, units, name, name, created_at
FROM accounts
WHERE isin IS NOT NULL AND units IS NOT NULL;

-- Remove instrument columns from accounts (accounts are now platforms/manual buckets only)
ALTER TABLE accounts DROP COLUMN IF EXISTS isin;
ALTER TABLE accounts DROP COLUMN IF EXISTS units;
