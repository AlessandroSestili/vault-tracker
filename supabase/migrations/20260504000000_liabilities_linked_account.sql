ALTER TABLE liabilities
  ADD COLUMN IF NOT EXISTS linked_account_id uuid REFERENCES accounts(id) ON DELETE SET NULL;
