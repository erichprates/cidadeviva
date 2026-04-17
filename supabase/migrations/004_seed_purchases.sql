-- Compra de pacotes de Seeds via PIX (simulado)
create table if not exists seed_purchases (
  id uuid primary key default gen_random_uuid(),
  consumer_id uuid references profiles not null,
  package_type text not null, -- 'broto' | 'muda' | 'arvore' | 'livre'
  seeds_amount numeric not null,
  price_full numeric not null,
  discount_percent numeric not null default 0,
  price_paid numeric not null,
  payment_method text default 'pix',
  payment_status text default 'pending', -- pending | paid | failed
  pix_code text, -- código PIX simulado
  paid_at timestamptz,
  created_at timestamptz default now()
);

alter table seed_purchases enable row level security;

drop policy if exists "purchases_own" on seed_purchases;
create policy "purchases_own" on seed_purchases
  for all using (auth.uid() = consumer_id);

create index if not exists seed_purchases_consumer_idx on seed_purchases (consumer_id, created_at desc);
