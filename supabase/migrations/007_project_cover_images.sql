-- Capas placeholder do Unsplash (gratuito) — substituir por fotos reais quando disponíveis.
-- URLs com ?w=1200&q=80 servem versões otimizadas direto do CDN.

update projects set
  cover_image_url = 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=1200&q=80&auto=format&fit=crop'
where title = 'Farmácia Comunitária' and (cover_image_url is null or cover_image_url = '');

update projects set
  cover_image_url = 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=1200&q=80&auto=format&fit=crop'
where title = 'Horta Escola Municipal' and (cover_image_url is null or cover_image_url = '');

update projects set
  cover_image_url = 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=1200&q=80&auto=format&fit=crop'
where title = 'Cesta Solidária Semanal' and (cover_image_url is null or cover_image_url = '');

-- Capas de updates já existentes (idempotente)
update project_updates set
  image_url = 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=1200&q=80&auto=format&fit=crop'
where title = 'Primeira remessa de medicamentos' and (image_url is null or image_url = '');

update project_updates set
  image_url = 'https://images.unsplash.com/photo-1592991538534-00972b6f59ed?w=1200&q=80&auto=format&fit=crop'
where title = 'Horta plantada!' and (image_url is null or image_url = '');

-- Fallback genérico para qualquer projeto ativo sem capa (categoria → tema)
update projects set cover_image_url = case category
  when 'saude' then 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=1200&q=80&auto=format&fit=crop'
  when 'educacao' then 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=1200&q=80&auto=format&fit=crop'
  when 'alimentacao' then 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=1200&q=80&auto=format&fit=crop'
  when 'cultura' then 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200&q=80&auto=format&fit=crop'
  when 'meio_ambiente' then 'https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?w=1200&q=80&auto=format&fit=crop'
  else 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1200&q=80&auto=format&fit=crop'
end
where status = 'active' and (cover_image_url is null or cover_image_url = '');
