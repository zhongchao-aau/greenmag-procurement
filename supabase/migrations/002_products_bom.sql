-- Migration: 002_products_bom.sql
-- Products, Product Variants, and Bill of Materials

-- =============================================
-- PRODUCTS TABLE
-- =============================================
create table products (
  id          uuid primary key default uuid_generate_v4(),
  code        text not null unique,
  name        text not null,
  description text,
  category    text,
  status      lifecycle_status not null default 'active',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid references profiles(id)
);

-- Auto-generate product code
create or replace function set_product_code()
returns trigger language plpgsql as $$
begin
  if new.code is null or new.code = '' then
    new.code := next_gm_id('product', 'GM-PRD-');
  end if;
  return new;
end;
$$;

create trigger trg_product_code
  before insert on products
  for each row execute function set_product_code();

create trigger trg_products_updated_at
  before update on products
  for each row execute function update_updated_at_column();

-- =============================================
-- PRODUCT VARIANTS TABLE
-- =============================================
create table product_variants (
  id          uuid primary key default uuid_generate_v4(),
  product_id  uuid not null references products(id) on delete cascade,
  code        text not null unique,
  name        text not null,
  description text,
  status      lifecycle_status not null default 'active',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Auto-generate variant code
create or replace function set_variant_code()
returns trigger language plpgsql as $$
begin
  if new.code is null or new.code = '' then
    new.code := next_gm_id('variant', 'GM-VAR-');
  end if;
  return new;
end;
$$;

create trigger trg_variant_code
  before insert on product_variants
  for each row execute function set_variant_code();

create trigger trg_variants_updated_at
  before update on product_variants
  for each row execute function update_updated_at_column();

-- =============================================
-- BILL OF MATERIALS TABLE
-- =============================================
create table bill_of_materials (
  id           uuid primary key default uuid_generate_v4(),
  variant_id   uuid not null references product_variants(id) on delete cascade,
  component_id uuid not null references components(id),
  quantity     numeric(12,4) not null check (quantity > 0),
  unit         text,
  notes        text,
  created_at   timestamptz not null default now(),
  unique (variant_id, component_id)
);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

-- Products: authenticated users can read, admins can manage
alter table products enable row level security;

create policy "authenticated users can view products"
  on products for select
  to authenticated
  using (true);

create policy "admins can manage products"
  on products for all
  to authenticated
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

-- Product Variants: same pattern
alter table product_variants enable row level security;

create policy "authenticated users can view variants"
  on product_variants for select
  to authenticated
  using (true);

create policy "admins can manage variants"
  on product_variants for all
  to authenticated
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

-- Bill of Materials: same pattern
alter table bill_of_materials enable row level security;

create policy "authenticated users can view bom"
  on bill_of_materials for select
  to authenticated
  using (true);

create policy "admins can manage bom"
  on bill_of_materials for all
  to authenticated
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );
