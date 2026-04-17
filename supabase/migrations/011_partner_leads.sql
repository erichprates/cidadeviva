-- Leads de lojistas interessados em ser parceiros (formulário público da landing).
create table if not exists partner_leads (
  id uuid primary key default gen_random_uuid(),
  business_name text not null,
  contact_name text,
  email text not null,
  phone text,
  message text,
  created_at timestamptz default now(),
  processed boolean default false,
  notes text
);

alter table partner_leads enable row level security;

-- Qualquer um (incluindo anônimos) pode enviar o formulário.
drop policy if exists "partner_leads_insert_public" on partner_leads;
create policy "partner_leads_insert_public" on partner_leads
  for insert with check (true);

-- Só platform_admin lê a tabela.
drop policy if exists "partner_leads_read_admin" on partner_leads;
create policy "partner_leads_read_admin" on partner_leads
  for select using (
    auth.uid() in (select id from profiles where role = 'platform_admin')
  );

create index if not exists partner_leads_created_idx on partner_leads (created_at desc);
