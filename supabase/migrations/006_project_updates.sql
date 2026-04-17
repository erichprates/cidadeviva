-- Atualizações dos projetos pela ONG
create table if not exists project_updates (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects not null,
  title text not null,
  content text not null,
  image_url text,
  created_at timestamptz default now()
);

alter table project_updates enable row level security;

drop policy if exists "updates_public_read" on project_updates;
create policy "updates_public_read" on project_updates
  for select using (true);

drop policy if exists "updates_ngo_write" on project_updates;
create policy "updates_ngo_write" on project_updates
  for insert with check (
    auth.uid() in (
      select id from profiles where role in ('ngo_admin', 'platform_admin')
    )
  );

drop policy if exists "updates_ngo_delete" on project_updates;
create policy "updates_ngo_delete" on project_updates
  for delete using (
    auth.uid() in (
      select id from profiles where role in ('ngo_admin', 'platform_admin')
    )
  );

create index if not exists project_updates_project_idx on project_updates (project_id, created_at desc);

-- Impacto concreto dos projetos
alter table projects add column if not exists impact_unit text default 'beneficiados';
alter table projects add column if not exists impact_per_seed numeric default 0.1;
alter table projects add column if not exists cover_image_url text;
alter table projects add column if not exists story text;
alter table projects add column if not exists created_by_name text;

-- Atualiza projetos existentes com dados ricos
update projects set
  story = 'A Farmácia Comunitária nasceu da necessidade real de famílias em vulnerabilidade social que não conseguem arcar com o custo de medicamentos básicos. Fundada pela Cidade Social em parceria com o posto de saúde do Centro, já atendemos mais de 48 famílias cadastradas.',
  impact_unit = 'medicamentos distribuídos',
  impact_per_seed = 0.5,
  created_by_name = 'Carlos Cidade'
where title = 'Farmácia Comunitária';

update projects set
  story = 'A Horta Escola Municipal transforma o pátio da escola em laboratório vivo de educação ambiental. As crianças aprendem a plantar, colher e entender de onde vem o alimento. O excedente vai para a merenda escolar.',
  impact_unit = 'crianças impactadas',
  impact_per_seed = 1.2,
  created_by_name = 'Carlos Cidade'
where title = 'Horta Escola Municipal';

update projects set
  story = 'Toda semana, voluntários da Cidade Social montam e distribuem cestas básicas para famílias cadastradas em situação de vulnerabilidade. Com seu apoio, conseguimos manter a regularidade e ampliar o número de famílias atendidas.',
  impact_unit = 'cestas distribuídas',
  impact_per_seed = 0.8,
  created_by_name = 'Carlos Cidade'
where title = 'Cesta Solidária Semanal';

-- Seed de atualizações dos projetos (idempotente)
insert into project_updates (project_id, title, content)
select p.id, 'Primeira remessa de medicamentos',
  'Graças ao apoio de vocês, conseguimos comprar a primeira remessa com 47 medicamentos básicos. 12 famílias já foram atendidas essa semana!'
from projects p
where p.title = 'Farmácia Comunitária'
  and not exists (
    select 1 from project_updates u
    where u.project_id = p.id and u.title = 'Primeira remessa de medicamentos'
  );

insert into project_updates (project_id, title, content)
select p.id, 'Horta plantada!',
  'As crianças do 3º ano plantaram hoje as primeiras mudas de alface e cenoura. A empolgação foi enorme! Obrigado a todos que tornaram isso possível.'
from projects p
where p.title = 'Horta Escola Municipal'
  and not exists (
    select 1 from project_updates u
    where u.project_id = p.id and u.title = 'Horta plantada!'
  );
