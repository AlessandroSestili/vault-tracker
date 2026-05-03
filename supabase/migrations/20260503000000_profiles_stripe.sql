-- Profiles table: plan + Stripe data
create table profiles (
  id                     uuid primary key references auth.users(id) on delete cascade,
  plan                   text not null default 'free' check (plan in ('free', 'pro', 'gifted')),
  stripe_customer_id     text unique,
  stripe_subscription_id text,
  stripe_price_id        text,
  subscription_status    text,
  created_at             timestamptz default now()
);

alter table profiles enable row level security;

create policy "own_profile" on profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- Service role bypass for webhook updates
create policy "service_role_profile" on profiles
  for all to service_role using (true) with check (true);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
