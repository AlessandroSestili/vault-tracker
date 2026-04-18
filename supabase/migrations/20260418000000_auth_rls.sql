-- Reset all data (fresh start)
truncate table position_snapshots, snapshots, liabilities, positions, accounts restart identity cascade;

-- Add user_id to main tables
alter table accounts  add column user_id uuid references auth.users(id) on delete cascade not null;
alter table positions add column user_id uuid references auth.users(id) on delete cascade not null;
alter table liabilities add column user_id uuid references auth.users(id) on delete cascade not null;

-- Enable RLS
alter table accounts         enable row level security;
alter table positions        enable row level security;
alter table liabilities      enable row level security;
alter table snapshots        enable row level security;
alter table position_snapshots enable row level security;

-- Policies: direct user_id match
create policy "own_accounts"    on accounts    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own_positions"   on positions   for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own_liabilities" on liabilities for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Policies: snapshots inherit from parent
create policy "own_snapshots" on snapshots for all
  using  (account_id  in (select id from accounts  where user_id = auth.uid()))
  with check (account_id in (select id from accounts  where user_id = auth.uid()));

create policy "own_position_snapshots" on position_snapshots for all
  using  (position_id in (select id from positions where user_id = auth.uid()))
  with check (position_id in (select id from positions where user_id = auth.uid()));

-- Recreate view with security_invoker so RLS is respected when queried
drop view if exists accounts_with_latest;
create view accounts_with_latest with (security_invoker = true) as
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
