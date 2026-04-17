import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { awardCollectibles, buildAwardContext } from '@/lib/collectibles/award';
import type { AwardResult } from '@/lib/collectibles/types';
import { checkAchievements, type UnlockedAchievement } from '@/lib/achievements/check';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const purchaseId: string | undefined = body?.purchase_id;

    if (!purchaseId) {
      return NextResponse.json({ error: 'Informe purchase_id.' }, { status: 400 });
    }

    const service = createServiceClient();

    const { data: purchase, error: fetchErr } = await service
      .from('seed_purchases')
      .select('id, consumer_id, seeds_amount, price_paid, payment_status')
      .eq('id', purchaseId)
      .maybeSingle();

    if (fetchErr || !purchase) {
      return NextResponse.json({ error: 'Compra não encontrada.' }, { status: 404 });
    }

    if (purchase.consumer_id !== user.id) {
      return NextResponse.json({ error: 'Compra não pertence ao usuário.' }, { status: 403 });
    }

    const seedsToAdd = Number(purchase.seeds_amount);

    if (purchase.payment_status !== 'paid') {
      const { error: updateErr } = await service
        .from('seed_purchases')
        .update({
          payment_status: 'paid',
          paid_at: new Date().toISOString(),
        })
        .eq('id', purchase.id);

      if (updateErr) {
        console.error('[seeds/confirm] update error:', updateErr);
        return NextResponse.json(
          { error: 'Falha ao confirmar pagamento.', detail: updateErr.message },
          { status: 500 },
        );
      }

      const { data: wallet } = await service
        .from('credit_wallets')
        .select('id, total_seeds_earned, total_earned')
        .eq('consumer_id', user.id)
        .maybeSingle();

      if (wallet) {
        await service
          .from('credit_wallets')
          .update({
            total_seeds_earned: Number(wallet.total_seeds_earned ?? 0) + seedsToAdd,
            updated_at: new Date().toISOString(),
          })
          .eq('id', wallet.id);
      } else {
        await service.from('credit_wallets').insert({
          consumer_id: user.id,
          total_earned: 0,
          total_allocated: 0,
          total_seeds_earned: seedsToAdd,
          seeds_allocated: 0,
        });
      }

    }

    let unlockedAchievements: UnlockedAchievement[] = [];
    try {
      const achRes = await checkAchievements(user.id, service);
      unlockedAchievements = achRes.unlocked;
    } catch (e) {
      console.error('[seeds/confirm] achievements check error:', e);
    }

    let awarded: AwardResult[] = [];
    try {
      const ctx = await buildAwardContext(user.id, service);
      ctx.purchase_amount = Number(purchase.price_paid ?? 0);
      awarded = await awardCollectibles(user.id, 'purchase', ctx);
    } catch (e) {
      console.error('[seeds/confirm] collectibles error:', e);
    }

    const { data: walletAfter } = await service
      .from('credit_wallets')
      .select('total_seeds_earned, seeds_allocated')
      .eq('consumer_id', user.id)
      .maybeSingle();

    const balance =
      Number(walletAfter?.total_seeds_earned ?? 0) - Number(walletAfter?.seeds_allocated ?? 0);

    return NextResponse.json({
      seeds_added: seedsToAdd,
      new_balance: balance,
      collectibles: awarded.map((a) => ({
        slug: a.item.slug,
        name: a.item.name,
        emoji: a.item.emoji,
        rarity: a.item.rarity,
        new: a.new,
        bonus: a.bonus ?? 0,
        kind: a.kind,
      })),
      achievements: unlockedAchievements,
    });
  } catch (err) {
    console.error('[seeds/confirm] unexpected error:', err);
    const message = err instanceof Error ? err.message : 'Erro inesperado';
    return NextResponse.json({ error: 'Erro ao confirmar pagamento.', detail: message }, { status: 500 });
  }
}
