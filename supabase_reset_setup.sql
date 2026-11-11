-- ============================================================
-- METO STORE - DESTRUCTIVE RESET + SETUP
-- Drops app tables/functions in public schema (keeps auth.users) then recreates.
-- Run via psql for full-file execution:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase_reset_setup.sql
-- Supabase SQL Editor may reject multi-command prepared execution; if so run
-- blocks/statements one-by-one or use psql.
-- ============================================================

-- RESET (order matters due to FKs)
drop trigger if exists on_auth_user_created on auth.users;

drop table if exists public.wallet_ledger cascade;
drop table if exists public.orders cascade;
drop table if exists public.merchant_accounts cascade;
drop table if exists public.fazer_packages cascade;
drop table if exists public.store_settings cascade;
drop table if exists public.profiles cascade;

drop function if exists public.admin_set_merchant_margin(uuid, numeric) cascade;
drop function if exists public.debit_merchant_for_order(uuid, numeric, text, text) cascade;
drop function if exists public.admin_credit_merchant(uuid, numeric, text, text, text) cascade;
drop function if exists public.prevent_ledger_mutation() cascade;
drop function if exists public.is_admin(uuid) cascade;
drop function if exists public.handle_new_user() cascade;
drop function if exists public.set_updated_at() cascade;

-- SETUP
create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'customer' check (role in ('admin','merchant','customer')),
  full_name text,
  phone text,
  region text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_profiles_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role, full_name)
  values (new.id, 'customer', coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

insert into public.profiles (id) select id from auth.users on conflict (id) do nothing;

create or replace function public.is_admin(uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles p where p.id = uid and p.role = 'admin');
$$;

create table public.merchant_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  balance_egp numeric(14,2) not null default 0 check (balance_egp >= 0),
  margin_percent numeric(6,2) not null default 0 check (margin_percent >= 0 and margin_percent <= 100),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_merchant_accounts_updated_at before update on public.merchant_accounts
for each row execute function public.set_updated_at();
create index idx_merchant_accounts_user_id on public.merchant_accounts(user_id);

create table public.wallet_ledger (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchant_accounts(id) on delete restrict,
  amount numeric(14,2) not null,
  entry_type text not null check (entry_type in ('admin_credit','order_debit','refund','adjustment')),
  reference_type text,
  reference_id text,
  balance_after numeric(14,2) not null,
  note text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  constraint wallet_ledger_amount_not_zero check (amount <> 0)
);
create index idx_wallet_ledger_merchant_created on public.wallet_ledger(merchant_id, created_at desc);
create index idx_wallet_ledger_reference on public.wallet_ledger(reference_type, reference_id);

create or replace function public.prevent_ledger_mutation()
returns trigger language plpgsql as $$
begin raise exception 'wallet_ledger is append-only'; end; $$;
create trigger trg_wallet_ledger_no_update before update or delete on public.wallet_ledger
for each row execute function public.prevent_ledger_mutation();

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_ref text not null unique,
  user_id uuid references public.profiles(id) on delete set null,
  merchant_id uuid references public.merchant_accounts(id) on delete set null,
  player_id text not null,
  zone_id text,
  game_id text not null,
  region text not null,
  account_region text,
  status text not null default 'pending'
    check (status in ('pending','processing','success','failed','incomplete','cancelled')),
  total_egp numeric(14,2) not null check (total_egp >= 0),
  items jsonb not null default '[]'::jsonb,
  fazer_transaction_id text,
  fazer_response jsonb,
  error_message text,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_orders_updated_at before update on public.orders
for each row execute function public.set_updated_at();
create index idx_orders_merchant_created on public.orders(merchant_id, created_at desc);
create index idx_orders_merchant_status on public.orders(merchant_id, status);
create index idx_orders_user_created on public.orders(user_id, created_at desc);
create index idx_orders_status_created on public.orders(status, created_at desc);
create index idx_orders_delivered_at on public.orders(delivered_at desc);

create table public.store_settings (
  id int primary key default 1 check (id = 1),
  egp_rate numeric(10,4) not null default 50.0000 check (egp_rate > 0),
  fazer_balance numeric(14,4),
  fazer_balance_currency text,
  fazer_balance_updated_at timestamptz,
  packages_synced_at timestamptz,
  updated_at timestamptz not null default now()
);
insert into public.store_settings (id) values (1);
create trigger trg_store_settings_updated_at before update on public.store_settings
for each row execute function public.set_updated_at();

create table public.fazer_packages (
  offer_id text primary key,
  game_id text not null,
  category text,
  name text not null,
  diamonds int default 0,
  bonus_diamonds int default 0,
  currency_name text,
  cost_usd numeric(12,4),
  regions jsonb,
  active boolean not null default true,
  raw jsonb,
  updated_at timestamptz not null default now()
);
create index idx_fazer_packages_game on public.fazer_packages(game_id, active);
create index idx_fazer_packages_updated on public.fazer_packages(updated_at desc);

create or replace function public.admin_credit_merchant(
  p_merchant_id uuid, p_amount numeric, p_note text default null,
  p_reference_type text default 'admin', p_reference_id text default null
)
returns table (merchant_id uuid, new_balance numeric, ledger_id uuid)
language plpgsql security definer set search_path = public as $$
declare v_new_balance numeric(14,2); v_ledger_id uuid;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'amount_must_be_positive'; end if;
  select (m.balance_egp + round(p_amount,2)) into v_new_balance
  from public.merchant_accounts m where m.id = p_merchant_id for update;
  if not found then raise exception 'merchant_not_found'; end if;
  update public.merchant_accounts set balance_egp = v_new_balance, updated_at = now() where id = p_merchant_id;
  insert into public.wallet_ledger (merchant_id, amount, entry_type, reference_type, reference_id, balance_after, note, created_by)
  values (p_merchant_id, round(p_amount,2), 'admin_credit', p_reference_type, p_reference_id, v_new_balance, p_note, auth.uid())
  returning id into v_ledger_id;
  return query select p_merchant_id, v_new_balance, v_ledger_id;
end; $$;

create or replace function public.debit_merchant_for_order(
  p_merchant_id uuid, p_amount numeric, p_order_ref text, p_note text default null
)
returns table (merchant_id uuid, new_balance numeric, ledger_id uuid)
language plpgsql security definer set search_path = public as $$
declare v_new_balance numeric(14,2); v_ledger_id uuid; v_owner uuid;
begin
  if p_amount is null or p_amount <= 0 then raise exception 'amount_must_be_positive'; end if;
  select m.user_id into v_owner from public.merchant_accounts m
  where m.id = p_merchant_id and m.is_active = true;
  if not found then raise exception 'merchant_not_found_or_inactive'; end if;
  if not (public.is_admin() or auth.uid() = v_owner or auth.role() = 'service_role') then
    raise exception 'forbidden';
  end if;
  if exists (
    select 1 from public.wallet_ledger wl
    where wl.merchant_id = p_merchant_id and wl.entry_type = 'order_debit' and wl.reference_id = p_order_ref
  ) then raise exception 'order_already_debited'; end if;
  select (m.balance_egp - round(p_amount,2)) into v_new_balance
  from public.merchant_accounts m where m.id = p_merchant_id for update;
  if v_new_balance < 0 then raise exception 'insufficient_balance'; end if;
  update public.merchant_accounts set balance_egp = v_new_balance, updated_at = now() where id = p_merchant_id;
  insert into public.wallet_ledger (merchant_id, amount, entry_type, reference_type, reference_id, balance_after, note, created_by)
  values (p_merchant_id, -round(p_amount,2), 'order_debit', 'order', p_order_ref, v_new_balance, p_note, auth.uid())
  returning id into v_ledger_id;
  return query select p_merchant_id, v_new_balance, v_ledger_id;
end; $$;

create or replace function public.admin_set_merchant_margin(p_merchant_id uuid, p_margin_percent numeric)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  if p_margin_percent is null or p_margin_percent < 0 or p_margin_percent > 100 then raise exception 'invalid_margin'; end if;
  update public.merchant_accounts set margin_percent = round(p_margin_percent,2), updated_at = now()
  where id = p_merchant_id;
  if not found then raise exception 'merchant_not_found'; end if;
end; $$;

revoke all on function public.admin_credit_merchant(uuid,numeric,text,text,text) from public, anon;
revoke all on function public.debit_merchant_for_order(uuid,numeric,text,text) from public, anon;
revoke all on function public.admin_set_merchant_margin(uuid,numeric) from public, anon;
grant execute on function public.admin_credit_merchant(uuid,numeric,text,text,text) to authenticated, service_role;
grant execute on function public.debit_merchant_for_order(uuid,numeric,text,text) to authenticated, service_role;
grant execute on function public.admin_set_merchant_margin(uuid,numeric) to authenticated, service_role;

alter table public.profiles enable row level security;
alter table public.merchant_accounts enable row level security;
alter table public.wallet_ledger enable row level security;
alter table public.orders enable row level security;
alter table public.store_settings enable row level security;
alter table public.fazer_packages enable row level security;

create policy "profiles_select_own_or_admin" on public.profiles for select using (auth.uid() = id or public.is_admin());
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id)
  with check (auth.uid() = id and role = (select p.role from public.profiles p where p.id = auth.uid()));
create policy "profiles_admin_update" on public.profiles for update using (public.is_admin()) with check (public.is_admin());

create policy "merchant_accounts_select_own_or_admin" on public.merchant_accounts
  for select using (public.is_admin() or user_id = auth.uid());
create policy "merchant_accounts_admin_insert" on public.merchant_accounts for insert with check (public.is_admin());

create policy "wallet_ledger_select_own_or_admin" on public.wallet_ledger for select using (
  public.is_admin() or exists (select 1 from public.merchant_accounts m where m.id = wallet_ledger.merchant_id and m.user_id = auth.uid())
);

create policy "orders_select_own_or_admin" on public.orders for select using (
  public.is_admin() or user_id = auth.uid()
  or exists (select 1 from public.merchant_accounts m where m.id = orders.merchant_id and m.user_id = auth.uid())
);
create policy "orders_insert_authenticated" on public.orders for insert with check (
  public.is_admin() or user_id = auth.uid()
  or exists (select 1 from public.merchant_accounts m where m.id = orders.merchant_id and m.user_id = auth.uid())
);
create policy "orders_update_admin_or_service" on public.orders for update using (public.is_admin()) with check (public.is_admin());

create policy "store_settings_select_all" on public.store_settings for select using (true);
create policy "store_settings_update_admin" on public.store_settings for update using (public.is_admin()) with check (public.is_admin());
create policy "fazer_packages_select_active" on public.fazer_packages for select using (active = true or public.is_admin());

-- AFTER RUN (manual):
-- update public.profiles set role = 'admin' where id = (select id from auth.users where email = 'YOUR_EMAIL@example.com' limit 1);
-- insert into public.merchant_accounts (user_id, margin_percent) values ('MERCHANT_USER_UUID', 5.00);
