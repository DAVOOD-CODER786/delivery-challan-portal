-- Run this in the Supabase SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.delivery_challans (
  id uuid primary key default gen_random_uuid(),
  dc_number text not null unique,
  dc_date date not null,
  from_address text not null,
  to_address text not null,
  vehicle_number text not null,
  driver_name text not null,
  driver_phone text not null,
  receiver_name text not null,
  receiver_phone text not null,
  materials jsonb not null default '[]'::jsonb,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint materials_array check (jsonb_typeof(materials) = 'array')
);

create index if not exists delivery_challans_date_idx on public.delivery_challans (dc_date desc);
create index if not exists delivery_challans_vehicle_idx on public.delivery_challans (vehicle_number);
create index if not exists delivery_challans_number_idx on public.delivery_challans (dc_number);

alter table public.delivery_challans enable row level security;

-- Any authenticated member of this portal can read shared DC history.
drop policy if exists "Authenticated users can read DCs" on public.delivery_challans;
create policy "Authenticated users can read DCs"
on public.delivery_challans for select to authenticated using (true);

-- Authenticated users can create DCs, attributed to their own account.
drop policy if exists "Users can create DCs as themselves" on public.delivery_challans;
create policy "Users can create DCs as themselves"
on public.delivery_challans for insert to authenticated
with check (auth.uid() = created_by);

-- Records are intentionally immutable from this starter portal. Add a reviewed admin-only
-- update/delete policy if your business needs corrections or cancellations.
grant select, insert on public.delivery_challans to authenticated;
