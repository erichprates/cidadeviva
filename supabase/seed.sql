-- Seed data for Cidade Viva
-- NOTE: merchants.profile_id e projects.ngo_admin_id são opcionais no seed (ajuste após criar usuários reais).

-- Lojistas parceiros (São José dos Campos)
insert into merchants (business_name, document, business_type, neighborhood, city, cashback_rate, status) values
  ('Padaria do Zé', null, 'padaria', 'Vila Adyanna', 'São José dos Campos', 4.00, 'active'),
  ('Mercado Família', '12.345.678/0001-90', 'mercado', 'Centro', 'São José dos Campos', 3.00, 'active'),
  ('Salão Beleza Natural', null, 'salão', 'Jardim Aquarius', 'São José dos Campos', 5.00, 'active'),
  ('Farmácia Vida', '98.765.432/0001-10', 'farmácia', 'Urbanova', 'São José dos Campos', 3.50, 'active');

-- Projetos sociais (ngo_admin_id precisa ser preenchido com um profile existente; usando uuid fictício placeholder)
-- Em produção, rode este bloco após criar ao menos um profile ngo_admin.
-- Aqui usamos um uuid nil (00000000-...) que você deve atualizar depois OU remova a constraint para seed.
-- Para que o seed não falhe, assumimos um ngo_admin profile já existir com id abaixo:
-- Substitua '00000000-0000-0000-0000-000000000001' pelo id real.

-- insert into projects (ngo_admin_id, title, description, category, goal_amount, current_amount, status, neighborhood) values
--   ('00000000-0000-0000-0000-000000000001', 'Farmácia Comunitária', 'Garantir medicamentos essenciais para famílias em vulnerabilidade no bairro.', 'saude', 5000.00, 1840.00, 'active', 'Centro'),
--   ('00000000-0000-0000-0000-000000000001', 'Horta Escola Municipal', 'Implantar hortas nas escolas para educação ambiental e alimentação saudável.', 'educacao', 3000.00, 920.00, 'active', 'Vila Adyanna'),
--   ('00000000-0000-0000-0000-000000000001', 'Cesta Solidária Semanal', 'Cestas básicas semanais para 40 famílias da comunidade.', 'alimentacao', 8000.00, 3200.00, 'active', 'Urbanova');

-- Conquistas
insert into achievements (slug, title, description, icon, condition_type, condition_value) values
  ('primeira_nota', 'Primeira Nota!', 'Escaneou seu primeiro comprovante', '🎉', 'receipt_count', 1),
  ('guardiao_saude', 'Guardião da Saúde', 'Apoiou 3 vezes projetos de saúde', '💚', 'projects_supported', 3),
  ('consumidor_consciente', 'Consumidor Consciente', '10 comprovantes escaneados', '🌱', 'receipt_count', 10),
  ('transformador_local', 'Transformador Local', '50 Seeds geradas', '⭐', 'total_amount', 50),
  ('semana_ativa', 'Semana Ativa', '7 dias consecutivos escaneando', '🔥', 'streak_days', 7);
