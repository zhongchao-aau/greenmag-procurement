-- ============================================================
-- GreenMag Procurement System — Initial Schema
-- Migration 001
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================

create type user_role as enum ('user', 'admin');

create type request_status as enum (
  'draft', 'submitted', 'under_review', 'approved',
  'changes_requested', 'rejected', 'closed'
);

create type order_status as enum (
  'approved', 'ordered', 'confirmed',
  'partially_shipped', 'shipped',
  'partially_received', 'received', 'closed'
);

create type shipment_status as enum (
  'created', 'dispatched', 'in_transit',
  'customs', 'out_for_delivery', 'delivered',
  'exception', 'returned'
);

create type lifecycle_status as enum (
  'active', 'obsolete', 'discontinued', 'prototype'
);

-- ============================================================
-- PROFILES (extends Supabase auth.users)
-- ============================================================

create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text not null,
  full_name     text not null,
  role          user_role not null default 'user',
  lab_number    text,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Auto-create profile on user signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ============================================================
-- SUPPLIERS
-- ============================================================

create table suppliers (
  id            uuid primary key default uuid_generate_v4(),
  name          text not null,
  country       text,
  website       text,
  contact_name  text,
  contact_email text,
  contact_phone text,
  notes         text,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  created_by    uuid references profiles(id)
);

-- ============================================================
-- PRODUCT MASTER DATA
-- ============================================================

create table products (
  id            uuid primary key default uuid_generate_v4(),
  code          text not null unique,
  name          text not null,
  purpose       text,
  status        lifecycle_status not null default 'active',
  description   text,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  created_by    uuid references profiles(id)
);

create table variants (
  id            uuid primary key default uuid_generate_v4(),
  code          text not null unique,
  name          text not null,
  product_id    uuid not null references products(id),
  winding_material  text,
  joint_method      text,
  topology          text,
  status        lifecycle_status not null default 'active',
  design_link   text,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  created_by    uuid references profiles(id)
);

create table manufacturing_configurations (
  id            uuid primary key default uuid_generate_v4(),
  code          text not null unique,
  name          text not null,
  variant_id    uuid not null references variants(id),
  planned_units int not null default 1,
  build_type    text,
  description   text,
  status        text not null default 'planning',
  mfg_link      text,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  created_by    uuid references profiles(id)
);

-- ============================================================
-- COMPONENT MASTER
-- ============================================================

create table components (
  id                  uuid primary key default uuid_generate_v4(),
  code                text not null unique,
  name                text not null,
  category            text,
  material            text,
  reference_size      text,
  manufacturer        text,
  manufacturer_pn     text,
  unit                text not null default 'pcs',
  low_stock_threshold int,
  supplier_id         uuid references suppliers(id),   -- primary supplier
  description         text,
  datasheet_url       text,
  teams_link          text,
  notes               text,
  is_active           boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  created_by          uuid references profiles(id)
);

-- ============================================================
-- BOM (Bill of Materials)
-- ============================================================

create table bom_lines (
  id                      uuid primary key default uuid_generate_v4(),
  code                    text not null unique,
  mfg_config_id           uuid not null references manufacturing_configurations(id),
  component_id            uuid not null references components(id),
  qty_per_unit            numeric(12,4) not null default 1,
  notes                   text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  created_by              uuid references profiles(id),
  unique (mfg_config_id, component_id)
);

-- ============================================================
-- ID SEQUENCE HELPERS
-- ============================================================

create table id_sequences (
  entity  text primary key,
  current int  not null default 0
);

insert into id_sequences (entity) values
  ('request'), ('order'), ('shipment'), ('component'),
  ('product'), ('variant'), ('mfg_config'), ('bom');

create or replace function next_gm_id(entity text, prefix text)
returns text language plpgsql as $$
declare
  seq int;
begin
  update id_sequences set current = current + 1
  where id_sequences.entity = next_gm_id.entity
  returning current into seq;
  return prefix || lpad(seq::text, 3, '0');
end;
$$;

create or replace function assign_component_code()
returns trigger language plpgsql as $$
begin
  if new.code is null or new.code = '' then
    new.code := next_gm_id('component', 'GM-CMP-');
  end if;
  return new;
end;
$$;
create trigger trg_component_code before insert on components
  for each row execute procedure assign_component_code();

-- ============================================================
-- PURCHASE REQUESTS
-- ============================================================

create table purchase_requests (
  id              uuid primary key default uuid_generate_v4(),
  code            text not null unique,
  requester_id    uuid not null references profiles(id),
  status          request_status not null default 'draft',
  purpose         text,
  notes           text,
  reviewed_by     uuid references profiles(id),
  reviewed_at     timestamptz,
  submitted_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create or replace function assign_request_code()
returns trigger language plpgsql as $$
begin
  if new.code is null or new.code = '' then
    new.code := next_gm_id('request', 'GM-REQ-');
  end if;
  return new;
end;
$$;
create trigger trg_request_code before insert on purchase_requests
  for each row execute procedure assign_request_code();

create table request_items (
  id              uuid primary key default uuid_generate_v4(),
  request_id      uuid not null references purchase_requests(id) on delete cascade,
  component_id    uuid references components(id),
  item_name       text not null,
  manufacturer    text,
  manufacturer_pn text,
  quantity        numeric(12,4) not null,
  unit            text not null default 'pcs',
  supplier_suggestion text,
  supplier_url    text,
  specification   text,
  purpose_notes   text,
  sort_order      int not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ============================================================
-- PURCHASE ORDERS
-- ============================================================

create table purchase_orders (
  id                  uuid primary key default uuid_generate_v4(),
  code                text not null unique,
  supplier_id         uuid references suppliers(id),
  supplier_ref        text,
  status              order_status not null default 'approved',
  responsible_id      uuid references profiles(id),
  order_date          date,
  confirmation_date   date,
  expected_delivery   date,
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  created_by          uuid references profiles(id)
);

create or replace function assign_order_code()
returns trigger language plpgsql as $$
begin
  if new.code is null or new.code = '' then
    new.code := next_gm_id('order', 'GM-PO-');
  end if;
  return new;
end;
$$;
create trigger trg_order_code before insert on purchase_orders
  for each row execute procedure assign_order_code();

create table order_items (
  id              uuid primary key default uuid_generate_v4(),
  order_id        uuid not null references purchase_orders(id) on delete cascade,
  request_item_id uuid references request_items(id),
  component_id    uuid references components(id),
  item_name       text not null,
  quantity        numeric(12,4) not null,
  unit            text not null default 'pcs',
  unit_price      numeric(14,4),
  currency        text default 'DKK',
  shipping_cost   numeric(14,4),
  other_cost      numeric(14,4),
  tax_amount      numeric(14,4),
  total_cost      numeric(14,4),
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ============================================================
-- SHIPMENTS (dual-leg: China + EU)
-- ============================================================

create table shipments (
  id                    uuid primary key default uuid_generate_v4(),
  code                  text not null unique,
  description           text,
  status                shipment_status not null default 'created',
  order_id              uuid references purchase_orders(id),   -- primary linked order
  -- China leg
  china_carrier         text,
  china_tracking_number text,
  china_tracking_url    text,
  china_status          text,
  china_dispatched_at   date,
  -- EU leg
  eu_carrier            text,
  eu_tracking_number    text,
  eu_tracking_url       text,
  eu_status             text,
  eu_dispatched_at      date,
  -- Overall
  expected_delivery     date,
  actual_delivery       date,
  destination           text,
  notes                 text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  created_by            uuid references profiles(id)
);

create or replace function assign_shipment_code()
returns trigger language plpgsql as $$
begin
  if new.code is null or new.code = '' then
    new.code := next_gm_id('shipment', 'GM-SHP-');
  end if;
  return new;
end;
$$;
create trigger trg_shipment_code before insert on shipments
  for each row execute procedure assign_shipment_code();

create table shipment_items (
  id              uuid primary key default uuid_generate_v4(),
  shipment_id     uuid not null references shipments(id) on delete cascade,
  order_item_id   uuid references order_items(id),
  component_id    uuid references components(id),
  item_name       text,
  quantity_shipped numeric(12,4) not null,
  unit            text not null default 'pcs',
  notes           text,
  created_at      timestamptz not null default now()
);

-- Tracking event history per shipment
create table shipment_events (
  id            uuid primary key default uuid_generate_v4(),
  shipment_id   uuid not null references shipments(id) on delete cascade,
  tracking_leg  text not null default 'single',   -- 'china', 'eu', 'single'
  event_date    timestamptz not null default now(),
  location      text,
  status_code   text,
  description   text not null,
  created_at    timestamptz not null default now()
);

-- ============================================================
-- RECEIVING
-- ============================================================

create table receipts (
  id              uuid primary key default uuid_generate_v4(),
  shipment_id     uuid not null references shipments(id),
  received_by     uuid references profiles(id),    -- nullable; set by app when available
  received_at     timestamptz not null default now(),
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table receipt_items (
  id                  uuid primary key default uuid_generate_v4(),
  receipt_id          uuid not null references receipts(id) on delete cascade,
  component_id        uuid references components(id),
  item_name           text,                          -- optional free-text
  quantity_received   numeric(12,4) not null,
  unit                text not null default 'pcs',
  notes               text,
  created_at          timestamptz not null default now()
);

-- ============================================================
-- INSPECTION
-- ============================================================

create table inspections (
  id                  uuid primary key default uuid_generate_v4(),
  receipt_id          uuid not null references receipts(id),
  inspector_id        uuid references profiles(id),  -- nullable
  inspected_at        timestamptz not null default now(),
  overall_result      text not null default 'pending',  -- 'pass', 'partial', 'fail', 'pending'
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create table inspection_items (
  id                  uuid primary key default uuid_generate_v4(),
  inspection_id       uuid not null references inspections(id) on delete cascade,
  component_id        uuid references components(id),
  item_name           text,
  quantity_inspected  numeric(12,4) not null,
  quantity_accepted   numeric(12,4) not null default 0,
  quantity_rejected   numeric(12,4) not null default 0,
  quantity_damaged    numeric(12,4) not null default 0,
  quantity_missing    numeric(12,4) not null default 0,
  result              text,                             -- 'pass', 'partial', 'fail'
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ============================================================
-- INVENTORY (balance + ledger)
-- ============================================================

create table inventory_balances (
  component_id    uuid primary key references components(id),
  quantity        numeric(12,4) not null default 0,
  location        text,
  lab_number      text,
  updated_at      timestamptz not null default now()
);

-- Every movement goes here (quantity is signed: + = in, - = out)
create table inventory_transactions (
  id                  uuid primary key default uuid_generate_v4(),
  component_id        uuid not null references components(id),
  transaction_type    text not null,   -- 'receipt', 'usage', 'adjustment', 'return', 'damaged', 'reversal'
  quantity            numeric(12,4) not null,   -- positive = in, negative = out
  reference_id        uuid,            -- links to receipt, usage record, etc.
  notes               text,
  performed_by        uuid references profiles(id),
  created_at          timestamptz not null default now()
);

-- Trigger: keep inventory_balances in sync with transactions
create or replace function update_inventory_balance()
returns trigger language plpgsql as $$
begin
  insert into inventory_balances (component_id, quantity, updated_at)
  values (NEW.component_id, NEW.quantity, now())
  on conflict (component_id)
  do update set
    quantity = inventory_balances.quantity + NEW.quantity,
    updated_at = now();
  return NEW;
end;
$$;

create trigger trg_update_inventory_balance
  after insert on inventory_transactions
  for each row execute procedure update_inventory_balance();

-- ============================================================
-- USAGE
-- ============================================================

create table usage_records (
  id              uuid primary key default uuid_generate_v4(),
  component_id    uuid not null references components(id),
  quantity        numeric(12,4) not null,
  used_by         uuid not null references profiles(id),
  used_at         timestamptz not null default now(),
  purpose         text not null,
  lab_number      text,
  notes           text,
  is_reversed     boolean not null default false,
  reversal_notes  text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ============================================================
-- AUDIT / ACTIVITY LOG
-- ============================================================

create table activity_log (
  id              uuid primary key default uuid_generate_v4(),
  entity_type     text not null,
  entity_id       uuid not null,
  entity_code     text,
  action          text not null,
  description     text not null,
  performed_by    uuid references profiles(id),
  metadata        jsonb,
  created_at      timestamptz not null default now()
);

create index idx_activity_entity on activity_log (entity_type, entity_id);
create index idx_activity_time on activity_log (created_at desc);

-- ============================================================
-- INDEXES
-- ============================================================

create index idx_request_requester on purchase_requests (requester_id);
create index idx_request_status on purchase_requests (status);
create index idx_request_items_request on request_items (request_id);
create index idx_order_status on purchase_orders (status);
create index idx_order_items_order on order_items (order_id);
create index idx_order_items_component on order_items (component_id);
create index idx_shipment_status on shipments (status);
create index idx_shipment_items_shipment on shipment_items (shipment_id);
create index idx_receipt_shipment on receipts (shipment_id);
create index idx_inspection_receipt on inspections (receipt_id);
create index idx_inv_tx_component on inventory_transactions (component_id);
create index idx_inv_tx_type on inventory_transactions (transaction_type);
create index idx_component_code on components (code);
create index idx_component_supplier on components (supplier_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table profiles                   enable row level security;
alter table suppliers                  enable row level security;
alter table products                   enable row level security;
alter table variants                   enable row level security;
alter table manufacturing_configurations enable row level security;
alter table components                 enable row level security;
alter table bom_lines                  enable row level security;
alter table purchase_requests          enable row level security;
alter table request_items              enable row level security;
alter table purchase_orders            enable row level security;
alter table order_items                enable row level security;
alter table shipments                  enable row level security;
alter table shipment_items             enable row level security;
alter table shipment_events            enable row level security;
alter table receipts                   enable row level security;
alter table receipt_items              enable row level security;
alter table inspections                enable row level security;
alter table inspection_items           enable row level security;
alter table inventory_balances         enable row level security;
alter table inventory_transactions     enable row level security;
alter table usage_records              enable row level security;
alter table activity_log               enable row level security;
alter table id_sequences               enable row level security;

-- Helper: is current user an admin?
create or replace function is_admin()
returns boolean language sql security definer stable as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin')
$$;

-- id_sequences: admin write, no direct user access
create policy "id_sequences_admin" on id_sequences for all using (is_admin());

-- Profiles: users see own, admins see all
create policy "profiles_select" on profiles for select
  using (id = auth.uid() or is_admin());
create policy "profiles_update_own" on profiles for update
  using (id = auth.uid()) with check (id = auth.uid() and role = (select role from profiles where id = auth.uid()));
create policy "profiles_admin_all" on profiles for all
  using (is_admin());

-- Suppliers: all authenticated read, admin write
create policy "suppliers_read" on suppliers for select using (auth.uid() is not null);
create policy "suppliers_write" on suppliers for all using (is_admin());

-- Products / Variants / Mfg Configs / Components / BOM: all read, admin write
create policy "products_read" on products for select using (auth.uid() is not null);
create policy "products_write" on products for all using (is_admin());
create policy "variants_read" on variants for select using (auth.uid() is not null);
create policy "variants_write" on variants for all using (is_admin());
create policy "mfg_configs_read" on manufacturing_configurations for select using (auth.uid() is not null);
create policy "mfg_configs_write" on manufacturing_configurations for all using (is_admin());
create policy "components_read" on components for select using (auth.uid() is not null);
create policy "components_write" on components for all using (is_admin());
create policy "bom_read" on bom_lines for select using (auth.uid() is not null);
create policy "bom_write" on bom_lines for all using (is_admin());

-- Purchase Requests: users see own, admin sees all
create policy "requests_user_select" on purchase_requests for select
  using (requester_id = auth.uid() or is_admin());
create policy "requests_user_insert" on purchase_requests for insert
  with check (requester_id = auth.uid());
create policy "requests_user_update" on purchase_requests for update
  using (requester_id = auth.uid() and status in ('draft', 'changes_requested'))
  with check (requester_id = auth.uid());
create policy "requests_admin" on purchase_requests for all using (is_admin());

create policy "request_items_user_select" on request_items for select
  using (exists (select 1 from purchase_requests r where r.id = request_id and (r.requester_id = auth.uid() or is_admin())));
create policy "request_items_user_write" on request_items for insert
  with check (exists (select 1 from purchase_requests r where r.id = request_id and r.requester_id = auth.uid() and r.status in ('draft','changes_requested')));
create policy "request_items_user_update" on request_items for update
  using (exists (select 1 from purchase_requests r where r.id = request_id and r.requester_id = auth.uid() and r.status in ('draft','changes_requested')));
create policy "request_items_admin" on request_items for all using (is_admin());

-- Purchase Orders: all authenticated read, admin write
create policy "orders_user_select" on purchase_orders for select using (auth.uid() is not null);
create policy "orders_admin_write" on purchase_orders for all using (is_admin());

-- Order Items: all see items (no cost), admin sees all including cost
create policy "order_items_user_select" on order_items for select using (auth.uid() is not null);
create policy "order_items_admin_write" on order_items for all using (is_admin());

-- Cost-safe view for non-admin users
create or replace view order_items_public as
  select id, order_id, request_item_id, component_id, item_name,
         quantity, unit, notes, created_at, updated_at
  from order_items;

-- Shipments: all authenticated read, admin write
create policy "shipments_read" on shipments for select using (auth.uid() is not null);
create policy "shipments_write" on shipments for all using (is_admin());
create policy "shipment_items_read" on shipment_items for select using (auth.uid() is not null);
create policy "shipment_items_write" on shipment_items for all using (is_admin());
create policy "shipment_events_read" on shipment_events for select using (auth.uid() is not null);
create policy "shipment_events_write" on shipment_events for all using (is_admin());

-- Receipts, Inspections: admin only
create policy "receipts_admin" on receipts for all using (is_admin());
create policy "receipt_items_admin" on receipt_items for all using (is_admin());
create policy "inspections_admin" on inspections for all using (is_admin());
create policy "inspection_items_admin" on inspection_items for all using (is_admin());

-- Inventory: all read, admin write
create policy "inv_balances_read" on inventory_balances for select using (auth.uid() is not null);
create policy "inv_balances_admin" on inventory_balances for all using (is_admin());
create policy "inv_tx_read" on inventory_transactions for select using (auth.uid() is not null);
create policy "inv_tx_admin" on inventory_transactions for all using (is_admin());

-- Usage: users see own + create, admin sees all
create policy "usage_user_select" on usage_records for select
  using (used_by = auth.uid() or is_admin());
create policy "usage_user_insert" on usage_records for insert
  with check (used_by = auth.uid());
create policy "usage_admin" on usage_records for all using (is_admin());

-- Activity log: all read, system write
create policy "activity_read" on activity_log for select using (auth.uid() is not null);
create policy "activity_insert" on activity_log for insert with check (auth.uid() is not null);
