-- Tipos de usuário
create type user_role as enum ('consumer', 'merchant', 'ngo_admin', 'platform_admin');

-- Usuários (extends auth.users)
create table profiles (
  id uuid references auth.users primary key,
  full_name text not null,
  role user_role not null default 'consumer',
  avatar_url text,
  created_at timestamptz default now()
);

-- Lojistas parceiros
create table merchants (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles,
  business_name text not null,
  document text, -- CNPJ ou CPF, opcional
  business_type text not null, -- 'padaria', 'salão', 'mercado', etc
  neighborhood text not null,
  city text not null default 'São José dos Campos',
  cashback_rate numeric(4,2) not null default 3.00, -- percentual da taxa
  status text not null default 'active', -- active, suspended, pending
  created_at timestamptz default now()
);

-- Comprovantes escaneados
create table receipts (
  id uuid primary key default gen_random_uuid(),
  consumer_id uuid references profiles not null,
  merchant_id uuid references merchants,
  image_url text not null, -- Storage path
  image_hash text not null, -- SHA-256 para deduplicação
  extracted_cnpj text, -- extraído pelo Vision
  extracted_merchant_name text, -- extraído pelo Vision
  extracted_amount numeric(10,2), -- valor extraído
  extracted_date date, -- data da compra extraída
  confidence_score numeric(3,2), -- 0.00 a 1.00
  status text not null default 'pending', -- pending, approved, rejected, suspicious
  rejection_reason text,
  credits_generated numeric(10,2) default 0,
  vision_raw jsonb, -- resposta raw do Claude Vision
  created_at timestamptz default now()
);

-- Índice de deduplicação
create unique index receipts_hash_idx on receipts(image_hash);
create unique index receipts_fingerprint_idx on receipts(extracted_cnpj, extracted_amount, extracted_date) where extracted_cnpj is not null;

-- Carteira de créditos
create table credit_wallets (
  id uuid primary key default gen_random_uuid(),
  consumer_id uuid references profiles not null unique,
  total_earned numeric(10,2) default 0,
  total_allocated numeric(10,2) default 0,
  balance numeric(10,2) generated always as (total_earned - total_allocated) stored,
  updated_at timestamptz default now()
);

-- Projetos sociais
create table projects (
  id uuid primary key default gen_random_uuid(),
  ngo_admin_id uuid references profiles not null,
  title text not null,
  description text not null,
  category text not null, -- 'saude', 'educacao', 'alimentacao', 'cultura'
  image_url text,
  goal_amount numeric(10,2) not null,
  current_amount numeric(10,2) default 0,
  beneficiaries_count int default 0,
  neighborhood text,
  status text default 'active', -- active, completed, paused
  created_at timestamptz default now()
);

-- Alocações de crédito para projetos
create table allocations (
  id uuid primary key default gen_random_uuid(),
  consumer_id uuid references profiles not null,
  project_id uuid references projects not null,
  receipt_id uuid references receipts,
  amount numeric(10,2) not null,
  created_at timestamptz default now()
);

-- Conquistas disponíveis
create table achievements (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  description text not null,
  icon text not null, -- emoji ou nome do ícone
  condition_type text not null, -- 'receipt_count', 'total_amount', 'streak_days', 'projects_supported'
  condition_value numeric not null
);

-- Conquistas desbloqueadas por usuário
create table user_achievements (
  id uuid primary key default gen_random_uuid(),
  consumer_id uuid references profiles not null,
  achievement_id uuid references achievements not null,
  unlocked_at timestamptz default now(),
  unique(consumer_id, achievement_id)
);

-- Faturas mensais dos lojistas
create table invoices (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid references merchants not null,
  period_start date not null,
  period_end date not null,
  total_scanned_amount numeric(10,2) not null,
  cashback_rate numeric(4,2) not null,
  invoice_amount numeric(10,2) not null,
  status text default 'pending', -- pending, paid, overdue
  paid_at timestamptz,
  created_at timestamptz default now()
);

-- RLS
alter table profiles enable row level security;
alter table merchants enable row level security;
alter table receipts enable row level security;
alter table credit_wallets enable row level security;
alter table projects enable row level security;
alter table allocations enable row level security;
alter table user_achievements enable row level security;
alter table invoices enable row level security;

-- Policies básicas
create policy "profiles_own" on profiles for all using (auth.uid() = id);
create policy "merchants_public_read" on merchants for select using (status = 'active');
create policy "receipts_own" on receipts for all using (auth.uid() = consumer_id);
create policy "wallets_own" on credit_wallets for all using (auth.uid() = consumer_id);
create policy "projects_public_read" on projects for select using (status = 'active');
create policy "allocations_own" on allocations for all using (auth.uid() = consumer_id);
create policy "achievements_public_read" on achievements for select using (true);
create policy "user_achievements_own" on user_achievements for all using (auth.uid() = consumer_id);
