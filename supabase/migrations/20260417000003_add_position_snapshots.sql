CREATE TABLE position_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  position_id UUID NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
  value_eur NUMERIC(18,2) NOT NULL,
  recorded_at DATE NOT NULL DEFAULT CURRENT_DATE,
  UNIQUE(position_id, recorded_at)
);
