# Cidade Viva

Social cashback: cada compra transforma sua cidade.

## Stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS (paleta Cidade Viva)
- Supabase (Postgres + Auth + Storage)
- Claude Vision (`claude-sonnet-4-20250514`) para OCR de comprovantes

## Setup

```bash
cp .env.local.example .env.local
# preencha as variáveis

npm install
npm run dev
```

### Supabase

1. Crie um projeto Supabase.
2. Rode `supabase/migrations/001_initial.sql`.
3. Rode `supabase/seed.sql` (edite os `ngo_admin_id` dos projetos antes).
4. Crie o bucket `receipts` (privado).

### Fluxo principal

- `/scan` → `POST /api/scan` com a imagem.
- Vision extrai CNPJ, valor, data, confiança.
- Deduplicação por SHA-256 e por fingerprint (CNPJ + valor + data).
- Créditos gerados = valor × taxa do lojista.
- Consumidor aloca créditos em projetos via `POST /api/allocate`.
