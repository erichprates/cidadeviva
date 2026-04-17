import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

type PackageType = 'broto' | 'muda' | 'arvore' | 'livre';

const MIN_SEEDS = 50;
const MIN_PRICE = 5;

function generatePixCode(): string {
  const ts = Date.now();
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `PIX-CIDADEVIVA-${ts}-${rand}`;
}

function priceFull(pkg: PackageType, seeds: number, pricePaid: number, discount: number): number {
  if (discount <= 0) return pricePaid;
  return Number((pricePaid / (1 - discount / 100)).toFixed(2));
}

function discountFor(pkg: PackageType, pricePaid: number): number {
  if (pkg === 'broto') return 0;
  if (pkg === 'muda') return 10;
  if (pkg === 'arvore') return 20;
  // livre
  if (pricePaid >= 100) return 20;
  if (pricePaid >= 50) return 10;
  if (pricePaid >= 20) return 5;
  return 0;
}

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const packageType = body?.package_type as PackageType | undefined;
    const seedsAmount = Number(body?.seeds_amount);
    const pricePaid = Number(body?.price_paid);

    if (!packageType || !['broto', 'muda', 'arvore', 'livre'].includes(packageType)) {
      return NextResponse.json({ error: 'Tipo de pacote inválido.' }, { status: 400 });
    }

    if (!Number.isFinite(seedsAmount) || seedsAmount < MIN_SEEDS) {
      return NextResponse.json(
        { error: `Quantidade mínima é ${MIN_SEEDS} Seeds.` },
        { status: 400 },
      );
    }

    if (!Number.isFinite(pricePaid) || pricePaid < MIN_PRICE) {
      return NextResponse.json(
        { error: `Valor mínimo é R$ ${MIN_PRICE},00.` },
        { status: 400 },
      );
    }

    const discount = discountFor(packageType, pricePaid);
    const full = priceFull(packageType, seedsAmount, pricePaid, discount);
    const pixCode = generatePixCode();
    const service = createServiceClient();

    await service.from('profiles').upsert(
      {
        id: user.id,
        full_name: (user.user_metadata?.full_name as string | undefined) ?? user.email?.split('@')[0] ?? 'Comunidade',
        role: 'consumer',
      },
      { onConflict: 'id', ignoreDuplicates: true },
    );

    const { data: inserted, error } = await service
      .from('seed_purchases')
      .insert({
        consumer_id: user.id,
        package_type: packageType,
        seeds_amount: seedsAmount,
        price_full: full,
        discount_percent: discount,
        price_paid: pricePaid,
        payment_method: 'pix',
        payment_status: 'pending',
        pix_code: pixCode,
      })
      .select('id, pix_code, seeds_amount, price_paid, created_at')
      .single();

    if (error || !inserted) {
      console.error('[seeds/purchase] insert error:', error);
      return NextResponse.json(
        { error: 'Falha ao registrar compra.', detail: error?.message },
        { status: 500 },
      );
    }

    const expiresAt = new Date(new Date(inserted.created_at).getTime() + 30 * 60 * 1000).toISOString();

    return NextResponse.json({
      purchase_id: inserted.id,
      pix_code: inserted.pix_code,
      seeds_amount: Number(inserted.seeds_amount),
      price_paid: Number(inserted.price_paid),
      discount_percent: discount,
      expires_at: expiresAt,
    });
  } catch (err) {
    console.error('[seeds/purchase] unexpected error:', err);
    const message = err instanceof Error ? err.message : 'Erro inesperado';
    return NextResponse.json({ error: 'Erro ao criar compra.', detail: message }, { status: 500 });
  }
}
