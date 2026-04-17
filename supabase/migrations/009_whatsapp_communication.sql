-- Campos de WhatsApp no perfil
alter table profiles add column if not exists phone text;
alter table profiles add column if not exists whatsapp_optin boolean default true;

-- Logs de mensagens enviadas pela ONG
create table if not exists message_logs (
  id uuid primary key default gen_random_uuid(),
  ngo_admin_id uuid references profiles not null,
  recipients_count int default 0,
  segment text not null,
  content text not null,
  status text default 'simulated', -- 'simulated' | 'sent' | 'failed'
  sent_at timestamptz default now()
);

-- Configuração da Evolution API (uma por ONG)
create table if not exists whatsapp_config (
  id uuid primary key default gen_random_uuid(),
  ngo_admin_id uuid references profiles not null unique,
  instance_name text,
  api_url text,
  api_key text,
  phone_number text,
  is_connected boolean default false,
  created_at timestamptz default now()
);

alter table message_logs enable row level security;
alter table whatsapp_config enable row level security;

drop policy if exists "logs_own" on message_logs;
create policy "logs_own" on message_logs
  for all using (auth.uid() = ngo_admin_id);

drop policy if exists "config_own" on whatsapp_config;
create policy "config_own" on whatsapp_config
  for all using (auth.uid() = ngo_admin_id);

create index if not exists message_logs_ngo_idx on message_logs (ngo_admin_id, sent_at desc);
