-- Adiciona moeda "Seed" — camada de apresentação sobre os créditos em reais.
-- Conversão: 1 Seed = R$ 0,10 (Math.floor(reais / 0.10)).

alter table receipts add column if not exists seeds_generated numeric default 0;
alter table credit_wallets add column if not exists total_seeds_earned numeric default 0;
alter table credit_wallets add column if not exists seeds_allocated numeric default 0;

-- (Opcional) registrar quantidade de Seeds em cada alocação para histórico:
alter table allocations add column if not exists seeds_amount numeric default 0;
