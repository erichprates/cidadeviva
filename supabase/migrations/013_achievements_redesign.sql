-- Redesenha as conquistas com nova escada de dificuldade + ícones 3D.
-- CASCADE limpa user_achievements — todos reconquistam conforme o uso.

truncate achievements cascade;

insert into achievements (slug, title, description, icon, condition_type, condition_value) values
  ('primeira_nota',          'Primeira Nota!',          'Escaneou seu primeiro comprovante',          '🌱', 'receipt_count',      1),
  ('consumidor_consciente',  'Consumidor Consciente',   '10 comprovantes escaneados',                 '🌿', 'receipt_count',      10),
  ('semana_ativa',           'Semana Ativa',            '7 dias consecutivos escaneando',             '🔥', 'streak_days',        7),
  ('guardiao_saude',         'Guardião da Saúde',       'Apoiou 3 vezes projetos de saúde',           '💊', 'projects_supported', 3),
  ('plantador_dedicado',     'Plantador Dedicado',      '50 comprovantes escaneados',                 '🌳', 'receipt_count',      50),
  ('transformador_local',    'Transformador Local',     '2.000 Seeds gerados',                        '⭐', 'total_amount',       2000),
  ('embaixador_cidade',      'Embaixador da Cidade',    'Apoiou todos os projetos ativos',            '🏆', 'all_projects',       1),
  ('guardiao_floresta',      'Guardião da Floresta',    '5.000 Seeds gerados',                        '🌲', 'total_amount',       5000),
  ('lenda_comunidade',       'Lenda da Comunidade',     '10.000 Seeds gerados',                       '👑', 'total_amount',       10000),
  ('doador_exponencial',     'Doador Exponencial',      '30 dias consecutivos escaneando',            '🌍', 'streak_days',        30);
