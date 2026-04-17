-- Contestations (lojista → comprovante)
create table if not exists contestations (
  id uuid primary key default gen_random_uuid(),
  receipt_id uuid references receipts not null,
  merchant_id uuid references merchants not null,
  reason text not null,
  status text default 'pending',
  resolved_at timestamptz,
  created_at timestamptz default now()
);

alter table contestations enable row level security;

drop policy if exists "contestations_merchant" on contestations;
create policy "contestations_merchant" on contestations
  for all using (
    merchant_id in (select id from merchants where profile_id = auth.uid())
  );

-- Metas em Seeds nos projetos
alter table projects add column if not exists goal_seeds numeric default 0;
alter table projects add column if not exists current_seeds numeric default 0;
