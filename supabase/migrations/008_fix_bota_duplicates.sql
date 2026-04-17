-- Cleanup do bug de duplicatas da Bota do Plantador.
-- A award engine antiga avaliava 'conquista' em qualquer evento, então a Bota
-- (scan_count >= 1) era reavaliada em compras de Seeds e disparava duplicata
-- toda vez (+5 🌱 de bônus em cada). Após o fix em lib/collectibles/award.ts,
-- normalizamos os contadores para 1.

update user_collectibles
set quantity = 1, obtained_count = 1
where item_id = (select id from collectible_items where slug = 'bota');

-- NOTA: o bônus em Seeds (seeds_bonus_earned) já foi creditado no
-- credit_wallets.total_seeds_earned. Não revertemos automaticamente para não
-- mexer no saldo do usuário; se quiser estornar, descomente abaixo.
--
-- with refunded as (
--   select uc.consumer_id, uc.seeds_bonus_earned as refund
--   from user_collectibles uc
--   where uc.item_id = (select id from collectible_items where slug = 'bota')
--     and uc.seeds_bonus_earned > 0
-- )
-- update credit_wallets cw
-- set total_seeds_earned = greatest(0, cw.total_seeds_earned - r.refund),
--     updated_at = now()
-- from refunded r
-- where cw.consumer_id = r.consumer_id;

update user_collectibles
set seeds_bonus_earned = 0
where item_id = (select id from collectible_items where slug = 'bota');
