-- Sistema de itens colecionáveis ("loot") + bônus de Seeds em duplicatas.

create table if not exists collectible_items (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  emoji text not null,
  description text not null,
  rarity text not null, -- 'comum' | 'incomum' | 'raro' | 'lendario'
  rarity_score int not null, -- comum=1, incomum=10, raro=30, lendario=100
  trigger_type text not null, -- 'conquista' | 'surpresa' | 'desafio' | 'sequencia'
  trigger_condition jsonb -- ex: {"type": "scan_count", "value": 1}
);

create table if not exists user_collectibles (
  id uuid primary key default gen_random_uuid(),
  consumer_id uuid references profiles not null,
  item_id uuid references collectible_items not null,
  quantity int default 1,
  first_obtained_at timestamptz default now(),
  obtained_count int default 1,
  seeds_bonus_earned int default 0,
  unique (consumer_id, item_id)
);

alter table user_collectibles enable row level security;
alter table collectible_items enable row level security;

drop policy if exists "collectibles_own" on user_collectibles;
create policy "collectibles_own" on user_collectibles
  for all using (auth.uid() = consumer_id);

drop policy if exists "collectible_items_public" on collectible_items;
create policy "collectible_items_public" on collectible_items
  for select using (true);

create index if not exists user_collectibles_consumer_idx on user_collectibles (consumer_id);

-- Seed dos itens colecionáveis (idempotente)
insert into collectible_items (slug, name, emoji, description, rarity, rarity_score, trigger_type, trigger_condition) values
  ('bota', 'Bota do Plantador', '🥾', 'Primeiros passos na jornada consciente.', 'comum', 1, 'conquista', '{"type": "scan_count", "value": 1}'),
  ('pa', 'Pá do Trabalhador', '🪚', 'Ferramentas de quem não desiste.', 'comum', 1, 'surpresa', '{"chance": 0.1}'),
  ('ancinho', 'Ancinho Fiel', '🌾', 'Para quem cultiva com paciência.', 'comum', 1, 'surpresa', '{"chance": 0.1}'),
  ('regador', 'Regador Verde', '🪣', 'Você está nutrindo a comunidade.', 'incomum', 10, 'conquista', '{"type": "scan_count", "value": 10}'),
  ('saco_sementes', 'Saco de Sementes', '🌱', 'Plantador dedicado de impacto.', 'incomum', 10, 'conquista', '{"type": "seeds_earned", "value": 50}'),
  ('mangueira', 'Mangueira da Persistência', '🟢', 'Sequência de 7 dias consecutivos.', 'incomum', 10, 'sequencia', '{"days": 7}'),
  ('cerca', 'Cerca da Comunidade', '🏡', 'Apoiou 3 projetos diferentes.', 'incomum', 10, 'conquista', '{"type": "projects_count", "value": 3}'),
  ('carrinho_mao', 'Carrinho de Mão', '🛒', 'Sequência de 30 dias consecutivos.', 'raro', 30, 'sequencia', '{"days": 30}'),
  ('celeiro', 'Celeiro da Abundância', '🏚️', 'Atingiu o nível Árvore.', 'raro', 30, 'conquista', '{"type": "level", "value": "Árvore"}'),
  ('girassol', 'Girassol Dourado', '🌻', 'Comprou Seeds pela primeira vez.', 'raro', 30, 'conquista', '{"type": "purchase", "value": 1}'),
  ('trator', 'Trator Lendário', '🚜', 'Atingiu o nível Floresta.', 'lendario', 100, 'conquista', '{"type": "level", "value": "Floresta"}'),
  ('globo', 'Globo do Impacto', '🌍', 'Item lendário surpresa — pouquíssimos têm.', 'lendario', 100, 'surpresa', '{"chance": 0.005}'),
  ('pa_dourada', 'Pá Dourada', '✨', 'O item mais raro do Cidade Viva.', 'lendario', 100, 'surpresa', '{"chance": 0.005}'),
  ('nuvem_chuva', 'Nuvem de Chuva', '🌧️', 'Desafio semanal: 5 scans em 7 dias.', 'incomum', 10, 'desafio', '{"type": "weekly_scans", "value": 5}'),
  ('cesta_frutas', 'Cesta de Frutas', '🧺', 'Desafio semanal: plant em 2 projetos.', 'raro', 30, 'desafio', '{"type": "weekly_plants", "value": 2}')
on conflict (slug) do nothing;
