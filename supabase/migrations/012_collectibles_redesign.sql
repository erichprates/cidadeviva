-- Redesenha completamente o catálogo de colecionáveis com ícones 3D e nova raridade "épico".
-- CASCADE limpa user_collectibles — dados de teste são recriados naturalmente conforme usuários escaneiam.

truncate collectible_items cascade;

insert into collectible_items (slug, name, emoji, description, rarity, rarity_score, trigger_type, trigger_condition) values
  -- COMUNS
  ('bota', 'Bota do Plantador', '🥾', 'Primeiros passos na jornada consciente.', 'comum', 1, 'conquista', '{"type": "scan_count", "value": 1}'),
  ('rastelo', 'Rastelo Fiel', '🌾', 'Para quem cultiva com paciência.', 'comum', 1, 'surpresa', '{"chance": 0.15}'),
  ('pa', 'Pá do Trabalhador', '🪚', 'Ferramentas de quem não desiste.', 'comum', 1, 'surpresa', '{"chance": 0.15}'),

  -- INCOMUNS
  ('regador', 'Regador Verde', '🪣', 'Você está nutrindo a comunidade.', 'incomum', 10, 'conquista', '{"type": "scan_count", "value": 10}'),
  ('cerca', 'Cerca da Comunidade', '🏡', 'Apoiou 3 projetos diferentes.', 'incomum', 10, 'conquista', '{"type": "projects_count", "value": 3}'),
  ('mangueira', 'Mangueira da Persistência', '🟢', '7 dias consecutivos escaneando.', 'incomum', 10, 'sequencia', '{"days": 7}'),
  ('nuvem_chuva', 'Nuvem de Chuva', '🌧️', 'Desafio semanal: 5 scans em 7 dias.', 'incomum', 10, 'desafio', '{"type": "weekly_scans", "value": 5}'),

  -- RAROS
  ('celeiro', 'Celeiro da Abundância', '🏚️', 'Atingiu o nível Árvore.', 'raro', 30, 'conquista', '{"type": "level", "value": "Árvore"}'),
  ('celeiro_2', 'Celeiro Antigo', '🏠', 'Escaneou 25 comprovantes.', 'raro', 30, 'conquista', '{"type": "scan_count", "value": 25}'),
  ('carrinho_mao', 'Carrinho de Mão', '🛒', '30 dias consecutivos escaneando.', 'raro', 30, 'sequencia', '{"days": 30}'),
  ('girassol', 'Girassol Dourado', '🌻', 'Comprou Seeds pela primeira vez.', 'raro', 30, 'conquista', '{"type": "purchase", "value": 1}'),
  ('cesta_vegetais', 'Cesta Solidária', '🧺', 'Desafio semanal: plant em 2 projetos.', 'raro', 30, 'desafio', '{"type": "weekly_plants", "value": 2}'),
  ('fertilizante', 'Fertilizante Especial', '🌱', 'Gerou 200 Seeds escaneando.', 'raro', 30, 'conquista', '{"type": "seeds_earned", "value": 200}'),
  ('pinheiros', 'Pinheiros da Serra', '🌲', 'Apoiou o mesmo projeto 5 vezes.', 'raro', 30, 'surpresa', '{"chance": 0.04}'),
  ('floresta', 'Floresta Viva', '🌳', 'Gerou 500 Seeds no total.', 'raro', 30, 'conquista', '{"type": "seeds_earned", "value": 500}'),
  ('arvore', 'Árvore Centenária', '🌴', 'Item surpresa raro.', 'raro', 30, 'surpresa', '{"chance": 0.03}'),

  -- ÉPICOS
  ('balde_agua', 'Balde Dourado', '🪣', 'Comprou Seeds acima de R$20.', 'epico', 60, 'conquista', '{"type": "purchase_above", "value": 20}'),
  ('flor_especial', 'Flor Especial', '🌸', 'Apoiou todos os projetos ativos.', 'epico', 60, 'conquista', '{"type": "all_projects", "value": 1}'),
  ('flor_lilas', 'Flor Lilás', '💜', 'Item épico surpresa.', 'epico', 60, 'surpresa', '{"chance": 0.01}'),
  ('nuvem_pouca_chuva', 'Nuvem Rara', '⛅', 'Sequência de 14 dias consecutivos.', 'epico', 60, 'sequencia', '{"days": 14}'),

  -- LENDÁRIOS
  ('rastelo_dourado', 'Rastelo Dourado', '✨', 'Item lendário surpresa.', 'lendario', 100, 'surpresa', '{"chance": 0.005}'),
  ('regador_dourado', 'Regador Dourado', '💛', 'Gerou 1000 Seeds no total.', 'lendario', 100, 'conquista', '{"type": "seeds_earned", "value": 1000}'),
  ('bota_dourada', 'Bota Dourada', '👑', 'Escaneou 100 comprovantes.', 'lendario', 100, 'conquista', '{"type": "scan_count", "value": 100}'),
  ('pa_dourada', 'Pá Dourada', '⚡', 'Comprou Seeds acima de R$50.', 'lendario', 100, 'conquista', '{"type": "purchase_above", "value": 50}'),
  ('trator_dourado', 'Trator Dourado', '🚜', 'Item lendário surpresa.', 'lendario', 100, 'surpresa', '{"chance": 0.003}'),
  ('trator', 'Trator Lendário', '🚛', 'Atingiu o nível Floresta.', 'lendario', 100, 'conquista', '{"type": "level", "value": "Floresta"}'),
  ('mao_solidaria', 'Mão Solidária', '🤝', 'Plantou em 10 projetos diferentes.', 'lendario', 100, 'conquista', '{"type": "projects_count", "value": 10}'),
  ('globo', 'Globo do Impacto', '🌍', 'O item mais especial do Cidade Viva.', 'lendario', 100, 'surpresa', '{"chance": 0.002}');
