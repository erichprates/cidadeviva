import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { MIN_SEEDS_TO_PLANT, reaisFromSeeds } from '@/lib/credits/calculator';
import { awardCollectibles, buildAwardContext } from '@/lib/collectibles/award';
import { checkWeeklyChallenge } from '@/lib/collectibles/weekly-challenge';
import type { AwardResult } from '@/lib/collectibles/types';
import { checkAchievements, type UnlockedAchievement } from '@/lib/achievements/check';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const projectId: string | undefined = body?.project_id;
  const seeds: number | undefined = body?.seeds;

  if (!projectId || !seeds || seeds <= 0 || !Number.isFinite(seeds)) {
    return NextResponse.json({ error: 'Informe project_id e quantidade de Seeds válida.' }, { status: 400 });
  }

  const seedsToPlant = Math.floor(seeds);

  const service = createServiceClient();

  const { data: wallet } = await service
    .from('credit_wallets')
    .select('id, total_seeds_earned, seeds_allocated, total_allocated')
    .eq('consumer_id', user.id)
    .maybeSingle();

  const totalSeeds = Number(wallet?.total_seeds_earned ?? 0);
  const allocatedSeeds = Number(wallet?.seeds_allocated ?? 0);
  const seedsBalance = totalSeeds - allocatedSeeds;

  if (seedsBalance < MIN_SEEDS_TO_PLANT) {
    return NextResponse.json(
      { error: `Você precisa de pelo menos ${MIN_SEEDS_TO_PLANT} Seeds para plantar 🌱` },
      { status: 400 },
    );
  }

  if (seedsToPlant < MIN_SEEDS_TO_PLANT) {
    return NextResponse.json(
      { error: `Plante no mínimo ${MIN_SEEDS_TO_PLANT} Seeds 🌱` },
      { status: 400 },
    );
  }

  if (seedsToPlant > seedsBalance) {
    return NextResponse.json({ error: 'Saldo de Seeds insuficiente.' }, { status: 400 });
  }

  const { data: project } = await service
    .from('projects')
    .select('id, current_amount, goal_amount, status')
    .eq('id', projectId)
    .maybeSingle();

  if (!project || project.status !== 'active') {
    return NextResponse.json({ error: 'Projeto indisponível.' }, { status: 404 });
  }

  const reaisAmount = reaisFromSeeds(seedsToPlant);

  const { error: allocErr } = await service.from('allocations').insert({
    consumer_id: user.id,
    project_id: projectId,
    amount: reaisAmount,
    seeds_amount: seedsToPlant,
  });
  if (allocErr) {
    return NextResponse.json({ error: 'Falha ao registrar plantio.', detail: allocErr.message }, { status: 500 });
  }

  if (wallet) {
    await service
      .from('credit_wallets')
      .update({
        seeds_allocated: allocatedSeeds + seedsToPlant,
        total_allocated: Number(wallet.total_allocated ?? 0) + reaisAmount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', wallet.id);
  }

  await service
    .from('projects')
    .update({ current_amount: Number(project.current_amount) + reaisAmount })
    .eq('id', projectId);

  let unlockedAchievements: UnlockedAchievement[] = [];
  try {
    const achRes = await checkAchievements(user.id, service);
    unlockedAchievements = achRes.unlocked;
  } catch (e) {
    console.error('[allocate] achievements check error:', e);
  }

  let awarded: AwardResult[] = [];
  try {
    const ctx = await buildAwardContext(user.id, service);
    awarded = await awardCollectibles(user.id, 'plant', ctx);
    const weekly = await checkWeeklyChallenge(user.id);
    if (weekly.awarded) awarded.push(weekly.awarded);
  } catch (e) {
    console.error('[allocate] collectibles error:', e);
  }

  return NextResponse.json({
    success: true,
    message: `Você plantou ${seedsToPlant} 🌱 Seeds (R$ ${reaisAmount.toFixed(2)}) neste projeto!`,

    seeds_planted: seedsToPlant,
    reais_equivalent: reaisAmount,
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
}
