import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { seedsFromAmount } from '@/lib/credits/calculator';

export const runtime = 'nodejs';

async function assertNgo() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (profile?.role !== 'ngo_admin' && profile?.role !== 'platform_admin') return null;
  return user;
}

export async function POST(request: Request) {
  const ngo = await assertNgo();
  if (!ngo) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });

  const { receipt_id, merchant_id } = await request.json();
  if (!receipt_id || !merchant_id) return NextResponse.json({ error: 'Dados faltando.' }, { status: 400 });

  const service = createServiceClient();
  const { data: receipt } = await service.from('receipts').select('*').eq('id', receipt_id).single();
  if (!receipt) return NextResponse.json({ error: 'Comprovante não encontrado.' }, { status: 404 });

  const { data: merchant } = await service.from('merchants').select('*').eq('id', merchant_id).single();
  if (!merchant) return NextResponse.json({ error: 'Lojista inválido.' }, { status: 400 });

  const amount = Number(receipt.extracted_amount ?? 0);
  if (amount <= 0) return NextResponse.json({ error: 'Valor inválido no comprovante.' }, { status: 400 });

  const credits = Number((amount * (Number(merchant.cashback_rate) / 100)).toFixed(2));
  const seeds = seedsFromAmount(credits);

  const { error: updErr } = await service.from('receipts').update({
    status: 'approved',
    merchant_id,
    credits_generated: credits,
    seeds_generated: seeds,
    rejection_reason: null,
  }).eq('id', receipt_id);
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  const { data: wallet } = await service
    .from('credit_wallets')
    .select('id, total_earned, total_seeds_earned')
    .eq('consumer_id', receipt.consumer_id)
    .maybeSingle();

  if (wallet) {
    await service.from('credit_wallets').update({
      total_earned: Number(wallet.total_earned) + credits,
      total_seeds_earned: Number(wallet.total_seeds_earned ?? 0) + seeds,
      updated_at: new Date().toISOString(),
    }).eq('id', wallet.id);
  } else {
    await service.from('credit_wallets').insert({
      consumer_id: receipt.consumer_id,
      total_earned: credits,
      total_seeds_earned: seeds,
      total_allocated: 0,
      seeds_allocated: 0,
    });
  }

  // Busca nome do consumidor
  const { data: profile } = await service.from('profiles').select('full_name').eq('id', receipt.consumer_id).maybeSingle();

  return NextResponse.json({
    success: true,
    message: `Aprovado! ${seeds} Seeds liberadas para ${profile?.full_name ?? 'consumidor'}.`,
    seeds,
  });
}
