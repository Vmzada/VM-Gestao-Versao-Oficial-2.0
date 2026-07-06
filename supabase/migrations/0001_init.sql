-- VM Gestão Financeira - initial schema
-- Run in the Supabase SQL editor, or via `supabase db push` if using the CLI.

create extension if not exists "pgcrypto";

-- ============================================================
-- profiles
-- ============================================================
create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  business_name text not null,
  owner_name text not null,
  phone text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = user_id);
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = user_id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = user_id);
create policy "profiles_delete_own" on public.profiles
  for delete using (auth.uid() = user_id);

-- ============================================================
-- products
-- ============================================================
create table public.products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  category text not null,
  barcode text,
  sale_price numeric(10, 2) not null,
  cost_price numeric(10, 2),
  stock_quantity numeric(10, 2) not null default 0,
  min_stock_quantity numeric(10, 2) not null default 0,
  unit text not null default 'un',
  photo_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index products_user_id_idx on public.products (user_id);
create index products_barcode_idx on public.products (barcode);

alter table public.products enable row level security;

create policy "products_select_own" on public.products
  for select using (auth.uid() = user_id);
create policy "products_insert_own" on public.products
  for insert with check (auth.uid() = user_id);
create policy "products_update_own" on public.products
  for update using (auth.uid() = user_id);
create policy "products_delete_own" on public.products
  for delete using (auth.uid() = user_id);

-- ============================================================
-- courts
-- ============================================================
create table public.courts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  type text not null check (type in ('futebol', 'volei')),
  price_per_hour numeric(10, 2) not null,
  photo_url text,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index courts_user_id_idx on public.courts (user_id);

alter table public.courts enable row level security;

create policy "courts_select_own" on public.courts
  for select using (auth.uid() = user_id);
create policy "courts_insert_own" on public.courts
  for insert with check (auth.uid() = user_id);
create policy "courts_update_own" on public.courts
  for update using (auth.uid() = user_id);
create policy "courts_delete_own" on public.courts
  for delete using (auth.uid() = user_id);

-- ============================================================
-- court_bookings
-- ============================================================
create table public.court_bookings (
  id uuid primary key default gen_random_uuid(),
  court_id uuid not null references public.courts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  customer_name text not null,
  customer_phone text,
  booking_date date not null,
  start_time time not null,
  end_time time not null,
  total_amount numeric(10, 2) not null,
  status text not null default 'pendente' check (status in ('pendente', 'confirmada', 'cancelada', 'concluida')),
  notes text,
  created_at timestamptz not null default now(),
  constraint court_bookings_time_check check (end_time > start_time)
);

create index court_bookings_user_id_idx on public.court_bookings (user_id);
create index court_bookings_court_id_idx on public.court_bookings (court_id);
create index court_bookings_date_idx on public.court_bookings (booking_date);

alter table public.court_bookings enable row level security;

create policy "court_bookings_select_own" on public.court_bookings
  for select using (auth.uid() = user_id);
create policy "court_bookings_insert_own" on public.court_bookings
  for insert with check (auth.uid() = user_id);
create policy "court_bookings_update_own" on public.court_bookings
  for update using (auth.uid() = user_id);
create policy "court_bookings_delete_own" on public.court_bookings
  for delete using (auth.uid() = user_id);

-- ============================================================
-- sales
-- ============================================================
create table public.sales (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  total_amount numeric(10, 2) not null,
  payment_method text not null,
  status text not null default 'concluida',
  created_at timestamptz not null default now()
);

create index sales_user_id_idx on public.sales (user_id);
create index sales_created_at_idx on public.sales (created_at);

alter table public.sales enable row level security;

create policy "sales_select_own" on public.sales
  for select using (auth.uid() = user_id);
create policy "sales_insert_own" on public.sales
  for insert with check (auth.uid() = user_id);
create policy "sales_update_own" on public.sales
  for update using (auth.uid() = user_id);
create policy "sales_delete_own" on public.sales
  for delete using (auth.uid() = user_id);

-- ============================================================
-- sale_items
-- (no user_id column — ownership is derived through the parent sale)
-- ============================================================
create table public.sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete restrict,
  product_name text not null,
  quantity numeric(10, 2) not null,
  unit_price numeric(10, 2) not null,
  subtotal numeric(10, 2) not null
);

create index sale_items_sale_id_idx on public.sale_items (sale_id);
create index sale_items_product_id_idx on public.sale_items (product_id);

alter table public.sale_items enable row level security;

create policy "sale_items_select_own" on public.sale_items
  for select using (
    exists (
      select 1 from public.sales
      where sales.id = sale_items.sale_id and sales.user_id = auth.uid()
    )
  );
create policy "sale_items_insert_own" on public.sale_items
  for insert with check (
    exists (
      select 1 from public.sales
      where sales.id = sale_items.sale_id and sales.user_id = auth.uid()
    )
  );
create policy "sale_items_update_own" on public.sale_items
  for update using (
    exists (
      select 1 from public.sales
      where sales.id = sale_items.sale_id and sales.user_id = auth.uid()
    )
  );
create policy "sale_items_delete_own" on public.sale_items
  for delete using (
    exists (
      select 1 from public.sales
      where sales.id = sale_items.sale_id and sales.user_id = auth.uid()
    )
  );
