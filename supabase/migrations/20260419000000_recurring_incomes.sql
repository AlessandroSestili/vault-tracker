create table if not exists recurring_incomes (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete cascade not null,
  account_id   uuid references accounts(id) on delete cascade not null,
  name         text not null,
  amount       numeric not null,
  currency     text not null default 'EUR',
  day_of_month smallint not null check (day_of_month between 1 and 31),
  created_at   timestamptz default now()
);

alter table recurring_incomes enable row level security;

create policy "own_recurring_incomes" on recurring_incomes
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
