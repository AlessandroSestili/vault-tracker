-- Accounts: each financial source (TradeRepublic, Revolut, cash, etc.)
create table accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('investment', 'cash', 'pension', 'crypto', 'other')),
  currency char(3) not null default 'EUR',
  created_at timestamptz not null default now()
);

-- Snapshots: timestamped value entries per account
create table snapshots (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  value numeric(18, 2) not null,
  recorded_at timestamptz not null default now(),
  note text
);

create index on snapshots (account_id, recorded_at desc);

-- View: latest snapshot per account
create view accounts_with_latest as
select
  a.*,
  s.value as latest_value,
  s.recorded_at as latest_recorded_at
from accounts a
left join lateral (
  select value, recorded_at
  from snapshots
  where account_id = a.id
  order by recorded_at desc
  limit 1
) s on true;
