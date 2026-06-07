-- Rimozione completa di Stripe + sistema piani free/pro.
-- NON tocca auth.users né le tabelle dati (accounts, positions, liabilities,
-- snapshots, recurring_incomes): queste referenziano auth.users, non profiles.

-- Trigger e funzione che popolavano profiles alla registrazione
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

-- La tabella profiles conteneva solo plan + dati Stripe: nessun'altra tabella la referenzia
drop table if exists profiles;
