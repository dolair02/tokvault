-- Run in the connected TokVault Supabase project. No public access.
create table if not exists public.vault_backups (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  constraint valid_backup_payload check (jsonb_typeof(payload) = 'object' and payload->>'version' = '1')
);
alter table public.vault_backups enable row level security;
revoke all on public.vault_backups from anon;
grant select, insert, update, delete on public.vault_backups to authenticated;
drop policy if exists "Own vault backups" on public.vault_backups;
create policy "Own vault backups" on public.vault_backups for all to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
