-- ============================================================
-- METO STORE - Supabase setup (run statements ONE BY ONE in SQL Editor)
-- If you see "cannot insert multiple commands into a prepared statement",
-- run each statement separately (each block ending with a semicolon).
-- ============================================================

-- 1) Extensions
create extension if not exists pgcrypto;

-- 2) updated_at helper
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 3) profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'customer' check (role in ('admin','merchant','customer')),
  full_name text,
  phone text,
  region text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4) profiles updated_at trigger
drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- 5) auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role, full_name)
  values (
    new.id,
    'customer',
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- 6) signup trigger
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- 7) backfill profiles
insert into public.profiles (id)
select id from auth.users
on conflict (id) do nothing;

-- 8) admin helper
create or replace function public.is_admin(uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p where p.id = uid and p.role = 'admin'
  );
$$;

-- 9) merchant_accounts
create table if not exists public.merchant_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  balance_egp numeric(14,2) not null default 0 check (balance_egp >= 0),
  margin_percent numeric(6,2) not null default 0 check (margin_percent >= 0 and margin_percent <= 100),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 10) merchant_accounts trigger
drop trigger if exists trg_merchant_accounts_updated_at on public.merchant_accounts;
create trigger trg_merchant_accounts_updated_at
before update on public.merchant_accounts
for each row execute function public.set_updated_at();

-- 11) merchant_accounts index
create index if not exists idx_merchant_accounts_user_id on public.merchant_accounts(user_id);

-- 12) wallet_ledger (append-only)
create table if not exists public.wallet_ledger (
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

-- 13) wallet_ledger indexes
create index if not exists idx_wallet_ledger_merchant_created on public.wallet_ledger(merchant_id, created_at desc);
create index if not exists idx_wallet_ledger_reference on public.wallet_ledger(reference_type, reference_id);

-- 14) prevent ledger mutation function
create or replace function public.prevent_ledger_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'wallet_ledger is append-only';
end;
$$;

-- 15) prevent ledger mutation trigger
drop trigger if exists trg_wallet_ledger_no_update on public.wallet_ledger;
create trigger trg_wallet_ledger_no_update
before update or delete on public.wallet_ledger
for each row execute function public.prevent_ledger_mutation();

-- 16) orders
create table if not exists public.orders (
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

-- 17) orders trigger
drop trigger if exists trg_orders_updated_at on public.orders;
create trigger trg_orders_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

-- 18) orders indexes
create index if not exists idx_orders_merchant_created on public.orders(merchant_id, created_at desc);
create index if not exists idx_orders_merchant_status on public.orders(merchant_id, status);
create index if not exists idx_orders_user_created on public.orders(user_id, created_at desc);
create index if not exists idx_orders_status_created on public.orders(status, created_at desc);
create index if not exists idx_orders_delivered_at on public.orders(delivered_at desc);

-- 19) store_settings
create table if not exists public.store_settings (
  id int primary key default 1 check (id = 1),
  egp_rate numeric(10,4) not null default 50.0000 check (egp_rate > 0),
  fazer_balance numeric(14,4),
  fazer_balance_currency text,
  fazer_balance_updated_at timestamptz,
  packages_synced_at timestamptz,
  updated_at timestamptz not null default now()
);

-- 20) store_settings seed row
insert into public.store_settings (id) values (1) on conflict (id) do nothing;

-- 21) store_settings trigger
drop trigger if exists trg_store_settings_updated_at on public.store_settings;
create trigger trg_store_settings_updated_at
before update on public.store_settings
for each row execute function public.set_updated_at();

-- 22) fazer_packages cache
create table if not exists public.fazer_packages (
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

-- 23) fazer_packages indexes
create index if not exists idx_fazer_packages_game on public.fazer_packages(game_id, active);
create index if not exists idx_fazer_packages_updated on public.fazer_packages(updated_at desc);

-- 24) RPC: admin_credit_merchant
create or replace function public.admin_credit_merchant(
  p_merchant_id uuid,
  p_amount numeric,
  p_note text default null,
  p_reference_type text default 'admin',
  p_reference_id text default null
)
returns table (merchant_id uuid, new_balance numeric, ledger_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_balance numeric(14,2);
  v_ledger_id uuid;
begin
  if not (public.is_admin() or auth.role() = 'service_role') then
    raise exception 'forbidden';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'amount_must_be_positive';
  end if;

  select (m.balance_egp + round(p_amount,2))
    into v_new_balance
  from public.merchant_accounts m
  where m.id = p_merchant_id
  for update;

  if not found then
    raise exception 'merchant_not_found';
  end if;

  update public.merchant_accounts
     set balance_egp = v_new_balance, updated_at = now()
   where id = p_merchant_id;

  insert into public.wallet_ledger
    (merchant_id, amount, entry_type, reference_type, reference_id, balance_after, note, created_by)
  values
    (p_merchant_id, round(p_amount,2), 'admin_credit', p_reference_type, p_reference_id, v_new_balance, p_note, auth.uid())
  returning id into v_ledger_id;

  return query select p_merchant_id, v_new_balance, v_ledger_id;
end;
$$;

-- 25) RPC: debit_merchant_for_order
create or replace function public.debit_merchant_for_order(
  p_merchant_id uuid,
  p_amount numeric,
  p_order_ref text,
  p_note text default null
)
returns table (merchant_id uuid, new_balance numeric, ledger_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_balance numeric(14,2);
  v_ledger_id uuid;
  v_owner uuid;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'amount_must_be_positive';
  end if;

  select m.user_id into v_owner
  from public.merchant_accounts m
  where m.id = p_merchant_id and m.is_active = true;

  if not found then
    raise exception 'merchant_not_found_or_inactive';
  end if;

  if not (public.is_admin() or auth.role() = 'service_role') then
    raise exception 'forbidden';
  end if;

  if exists (
    select 1 from public.wallet_ledger wl
    where wl.merchant_id = p_merchant_id
      and wl.entry_type = 'order_debit'
      and wl.reference_id = p_order_ref
  ) then
    raise exception 'order_already_debited';
  end if;

  select (m.balance_egp - round(p_amount,2))
    into v_new_balance
  from public.merchant_accounts m
  where m.id = p_merchant_id
  for update;

  if v_new_balance < 0 then
    raise exception 'insufficient_balance';
  end if;

  update public.merchant_accounts
     set balance_egp = v_new_balance, updated_at = now()
   where id = p_merchant_id;

  insert into public.wallet_ledger
    (merchant_id, amount, entry_type, reference_type, reference_id, balance_after, note, created_by)
  values
    (p_merchant_id, -round(p_amount,2), 'order_debit', 'order', p_order_ref, v_new_balance, p_note, auth.uid())
  returning id into v_ledger_id;

  return query select p_merchant_id, v_new_balance, v_ledger_id;
end;
$$;

-- 26) RPC: admin_set_merchant_margin
create or replace function public.admin_set_merchant_margin(
  p_merchant_id uuid,
  p_margin_percent numeric
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (public.is_admin() or auth.role() = 'service_role') then
    raise exception 'forbidden';
  end if;
  if p_margin_percent is null or p_margin_percent < 0 or p_margin_percent > 100 then
    raise exception 'invalid_margin';
  end if;

  update public.merchant_accounts
     set margin_percent = round(p_margin_percent,2), updated_at = now()
   where id = p_merchant_id;

  if not found then
    raise exception 'merchant_not_found';
  end if;
end;
$$;

-- 26b) RPC: refund_merchant_for_order
create or replace function public.refund_merchant_for_order(
  p_merchant_id uuid,
  p_amount numeric,
  p_order_ref text,
  p_note text default null
)
returns table (merchant_id uuid, new_balance numeric, ledger_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_balance numeric(14,2);
  v_ledger_id uuid;
  v_owner uuid;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'amount_must_be_positive';
  end if;

  select m.user_id into v_owner
  from public.merchant_accounts m
  where m.id = p_merchant_id;

  if not found then
    raise exception 'merchant_not_found';
  end if;

  if not (public.is_admin() or auth.role() = 'service_role') then
    raise exception 'forbidden';
  end if;

  if exists (
    select 1 from public.wallet_ledger wl
    where wl.merchant_id = p_merchant_id
      and wl.entry_type = 'refund'
      and wl.reference_id = p_order_ref
  ) then
    raise exception 'order_already_refunded';
  end if;

  select abs(amount) into v_owner
  from public.wallet_ledger
  where merchant_id = p_merchant_id
    and entry_type = 'order_debit'
    and reference_id = p_order_ref;

  if v_owner is null then
    raise exception 'cannot_refund_order_that_was_never_debited';
  end if;

  if p_amount > v_owner then
    raise exception 'refund_amount_exceeds_debited_amount';
  end if;

  select (m.balance_egp + round(p_amount,2))
    into v_new_balance
  from public.merchant_accounts m
  where m.id = p_merchant_id
  for update;

  update public.merchant_accounts
     set balance_egp = v_new_balance, updated_at = now()
   where id = p_merchant_id;

  insert into public.wallet_ledger
    (merchant_id, amount, entry_type, reference_type, reference_id, balance_after, note, created_by)
  values
    (p_merchant_id, round(p_amount,2), 'refund', 'order', p_order_ref, v_new_balance, p_note, auth.uid())
  returning id into v_ledger_id;

  return query select p_merchant_id, v_new_balance, v_ledger_id;
end;
$$;

-- 27) revoke function execute from public, anon, authenticated
revoke all on function public.admin_credit_merchant(uuid,numeric,text,text,text) from public, anon, authenticated;
revoke all on function public.debit_merchant_for_order(uuid,numeric,text,text) from public, anon, authenticated;
revoke all on function public.admin_set_merchant_margin(uuid,numeric) from public, anon, authenticated;
revoke all on function public.refund_merchant_for_order(uuid,numeric,text,text) from public, anon, authenticated;

-- 28) grant execute exclusively to service_role (trusted backend only)
grant execute on function public.admin_credit_merchant(uuid,numeric,text,text,text) to service_role;
grant execute on function public.debit_merchant_for_order(uuid,numeric,text,text) to service_role;
grant execute on function public.admin_set_merchant_margin(uuid,numeric) to service_role;
grant execute on function public.refund_merchant_for_order(uuid,numeric,text,text) to service_role;

-- 33) enable RLS: profiles
alter table public.profiles enable row level security;

-- 34) enable RLS: merchant_accounts
alter table public.merchant_accounts enable row level security;

-- 35) enable RLS: wallet_ledger
alter table public.wallet_ledger enable row level security;

-- 36) enable RLS: orders
alter table public.orders enable row level security;

-- 37) enable RLS: store_settings
alter table public.store_settings enable row level security;

-- 38) enable RLS: fazer_packages
alter table public.fazer_packages enable row level security;

-- 39) profiles policies
drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin" on public.profiles
for select using (auth.uid() = id or public.is_admin());

-- 40)
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
for update using (auth.uid() = id)
with check (auth.uid() = id and role = (select p.role from public.profiles p where p.id = auth.uid()));

-- 41)
drop policy if exists "profiles_admin_update" on public.profiles;
create policy "profiles_admin_update" on public.profiles
for update using (public.is_admin()) with check (public.is_admin());

-- 42) merchant_accounts policies
drop policy if exists "merchant_accounts_select_own_or_admin" on public.merchant_accounts;
create policy "merchant_accounts_select_own_or_admin" on public.merchant_accounts
for select using (public.is_admin() or user_id = auth.uid());

-- 43)
drop policy if exists "merchant_accounts_admin_insert" on public.merchant_accounts;
create policy "merchant_accounts_admin_insert" on public.merchant_accounts
for insert with check (public.is_admin());

-- 44) wallet_ledger policy (read only; no insert/update/delete for clients)
drop policy if exists "wallet_ledger_select_own_or_admin" on public.wallet_ledger;
create policy "wallet_ledger_select_own_or_admin" on public.wallet_ledger
for select using (
  public.is_admin() or exists (
    select 1 from public.merchant_accounts m
    where m.id = wallet_ledger.merchant_id and m.user_id = auth.uid()
  )
);

-- 45) orders policies
drop policy if exists "orders_select_own_or_admin" on public.orders;
create policy "orders_select_own_or_admin" on public.orders
for select using (
  public.is_admin()
  or user_id = auth.uid()
  or exists (
    select 1 from public.merchant_accounts m
    where m.id = orders.merchant_id and m.user_id = auth.uid()
  )
);

-- 46)
drop policy if exists "orders_insert_authenticated" on public.orders;
create policy "orders_insert_authenticated" on public.orders
for insert with check (
  public.is_admin()
  or user_id = auth.uid()
  or exists (
    select 1 from public.merchant_accounts m
    where m.id = orders.merchant_id and m.user_id = auth.uid()
  )
);

-- 47)
drop policy if exists "orders_update_admin_or_service" on public.orders;
create policy "orders_update_admin_or_service" on public.orders
for update using (public.is_admin()) with check (public.is_admin());

-- 48) store_settings policies
drop policy if exists "store_settings_select_all" on public.store_settings;
create policy "store_settings_select_all" on public.store_settings
for select using (true);

-- 49)
drop policy if exists "store_settings_update_admin" on public.store_settings;
create policy "store_settings_update_admin" on public.store_settings
for update using (public.is_admin()) with check (public.is_admin());

-- 50) fazer_packages policy
drop policy if exists "fazer_packages_select_active" on public.fazer_packages;
create policy "fazer_packages_select_active" on public.fazer_packages
for select using (active = true or public.is_admin());

-- ============================================================
-- AFTER SETUP (run manually, replace values):
-- 1) Make yourself admin:
--    update public.profiles set role = 'admin'
--    where id = (select id from auth.users where email = 'YOUR_EMAIL@example.com' limit 1);
-- 2) Create merchant account for a merchant user:
--    insert into public.merchant_accounts (user_id, margin_percent)
--    values ('MERCHANT_USER_UUID', 5.00);
-- ============================================================
