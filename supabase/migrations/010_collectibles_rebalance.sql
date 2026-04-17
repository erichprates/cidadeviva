-- Rebalance dos colecionáveis para marcos garantidos + lendários só em eventos especiais.

-- 1) Globo: prêmio do desafio semanal (alternado com Cesta de Frutas).
update collectible_items
set trigger_condition = '{"type": "weekly_challenge"}'
where slug = 'globo';

-- 2) Pá Dourada: ganha em compra de Seeds >= R$50 (vira conquista, não surpresa).
update collectible_items
set trigger_type = 'conquista',
    trigger_condition = '{"type": "purchase_above", "value": 50}'
where slug = 'pa_dourada';

-- 3) Marcos garantidos a cada 5 scans — pool de comuns:
update collectible_items
set trigger_type = 'marco',
    trigger_condition = '{"every_scans": 5, "tier": "comum"}'
where slug in ('pa', 'ancinho');

-- 4) Marcos garantidos a cada 5 scans — pool de incomuns:
update collectible_items
set trigger_type = 'marco',
    trigger_condition = '{"every_scans": 5, "tier": "incomum"}'
where slug = 'nuvem_chuva';
