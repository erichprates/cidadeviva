import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { extractReceipt, VisionServiceError } from '@/lib/vision/extract-receipt';
import { analyzeImageOrigin } from '@/lib/vision/screenshot-heuristics';
import { decideReceipt } from '@/lib/credits/calculator';
import { fuzzyMatchCnpj } from '@/lib/credits/merchant-match';
import type { Merchant } from '@/lib/supabase/types';
import { awardCollectibles, buildAwardContext } from '@/lib/collectibles/award';
import { checkWeeklyChallenge } from '@/lib/collectibles/weekly-challenge';
import type { AwardResult } from '@/lib/collectibles/types';
import { checkAchievements, type UnlockedAchievement } from '@/lib/achievements/check';

export const runtime = 'nodejs';
export const maxDuration = 60;

function normalizeCnpj(cnpj: string | null): string | null {
  if (!cnpj) return null;
  return cnpj.replace(/\D/g, '');
}

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const service = createServiceClient();

    // Garante que o profile existe (caso o trigger de auth não tenha rodado).
    const { error: profileErr } = await service.from('profiles').upsert(
      {
        id: user.id,
        full_name: (user.user_metadata?.full_name as string | undefined) ?? user.email?.split('@')[0] ?? 'Comunidade',
        role: 'consumer',
      },
      { onConflict: 'id', ignoreDuplicates: true },
    );
    if (profileErr) console.error('[scan] profile upsert error:', profileErr);

    const formData = await request.formData();
    const image = formData.get('image');
    const liveCapture = formData.get('live_capture') === '1';

    if (!(image instanceof File)) {
      return NextResponse.json({ error: 'Envie uma imagem no campo "image".' }, { status: 400 });
    }

    const arrayBuffer = await image.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const imageHash = crypto.createHash('sha256').update(buffer).digest('hex');

    const { data: existing } = await service
      .from('receipts')
      .select('id')
      .eq('image_hash', imageHash)
      .limit(1);

    if (existing && existing.length > 0) {
      return NextResponse.json(
        { error: 'Comprovante já cadastrado', code: 'duplicate_hash' },
        { status: 409 },
      );
    }

    const mediaType = (['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(image.type)
      ? image.type
      : 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';

    const ext = mediaType.split('/')[1];
    const storagePath = `${user.id}/${imageHash}.${ext}`;

    const { error: uploadErr } = await service.storage
      .from('receipts')
      .upload(storagePath, buffer, { contentType: mediaType, upsert: false });

    if (uploadErr && !uploadErr.message.includes('already exists')) {
      console.error('[scan] storage upload error:', uploadErr);
      return NextResponse.json(
        { error: 'Falha ao salvar a imagem.', detail: uploadErr.message },
        { status: 500 },
      );
    }

    console.log('[scan] image hash:', imageHash);

    const origin = liveCapture
      ? { likelyScreenshot: false, reason: null, exif: { has_camera_make: false, make: null, model: null, taken_at: null, width: null, height: null } }
      : await analyzeImageOrigin(buffer).catch((e) => {
          console.error('[scan] origin analysis error:', e);
          return { likelyScreenshot: false, reason: null, exif: { has_camera_make: false, make: null, model: null, taken_at: null, width: null, height: null } };
        });
    console.log('[scan] origin:', origin, 'live_capture:', liveCapture);

    const base64 = buffer.toString('base64');
    let vision;
    try {
      vision = await extractReceipt(base64, mediaType);
    } catch (err) {
      if (err instanceof VisionServiceError) {
        console.error('[scan] vision service unavailable:', err.message);
        return NextResponse.json(
          { error: 'Serviço temporariamente indisponível. Tente novamente em instantes.', code: 'vision_unavailable' },
          { status: 503 },
        );
      }
      throw err;
    }

    if (!liveCapture && origin.likelyScreenshot && !vision.is_suspicious) {
      vision.is_suspicious = true;
      vision.suspicion_reason = origin.reason;
    }

    if (
      vision.is_suspicious &&
      typeof vision.suspicion_reason === 'string' &&
      /(futuro|futura|future|2025|2026)/i.test(vision.suspicion_reason)
    ) {
      console.log('[scan] overriding date-only suspicion:', vision.suspicion_reason);
      vision.is_suspicious = false;
      vision.suspicion_reason = null;
    }

    if (vision.document_type === 'pix_bancario') {
      console.log('[scan] rejected: PIX bancário (app do banco)');
      return NextResponse.json(
        {
          status: 'rejected',
          rejection_reason: 'pix_not_accepted',
          credits_generated: 0,
          seeds_generated: 0,
          message: 'Comprovantes de PIX do app do banco não são aceitos. Escaneie o cupom da maquininha ou a nota fiscal do estabelecimento.',
        },
        { status: 400 },
      );
    }

    console.log('[scan] vision result:', {
      cnpj: vision.cnpj,
      merchant_name: vision.merchant_name,
      total_amount: vision.total_amount,
      purchase_date: vision.purchase_date,
      confidence: vision.confidence,
      is_suspicious: vision.is_suspicious,
      suspicion_reason: vision.suspicion_reason,
      document_type: vision.document_type,
      mock: (vision.raw as any)?.mock ?? false,
    });

    const normalizedCnpj = normalizeCnpj(vision.cnpj);
    const extractedDate = vision.purchase_date;
    const extractedAmount = vision.total_amount;

    if (normalizedCnpj && extractedAmount && extractedDate) {
      const { data: fingerprintHits } = await service
        .from('receipts')
        .select('id')
        .eq('extracted_cnpj', vision.cnpj)
        .eq('extracted_amount', extractedAmount)
        .eq('extracted_date', extractedDate)
        .limit(1);

      if (fingerprintHits && fingerprintHits.length > 0) {
        return NextResponse.json(
          { error: 'Este comprovante já foi registrado.', code: 'duplicate_fingerprint' },
          { status: 409 },
        );
      }
    }

    let merchant: Merchant | null = null;
    let matchType: 'exact' | 'fuzzy' | 'name' | 'none' = 'none';
    let fuzzyDistance: number | null = null;
    let fuzzyCandidate: string | null = null;

    if (vision.cnpj) {
      const { data, error } = await service
        .from('merchants')
        .select('*')
        .eq('document', vision.cnpj)
        .eq('status', 'active')
        .limit(1);
      if (error) console.log('[scan] merchant by cnpj error:', error.message);
      merchant = (data?.[0] as Merchant | undefined) ?? null;
      if (merchant) matchType = 'exact';
    }

    // Fuzzy por CNPJ quando o exato falha
    if (!merchant && vision.cnpj) {
      const { data: activeMerchants } = await service
        .from('merchants')
        .select('*')
        .eq('status', 'active')
        .not('document', 'is', null);
      const fuzzy = fuzzyMatchCnpj(vision.cnpj, (activeMerchants as Merchant[]) ?? []);
      if (fuzzy.merchant) {
        merchant = fuzzy.merchant;
        matchType = 'fuzzy';
        fuzzyDistance = fuzzy.distance;
        fuzzyCandidate = fuzzy.merchant.document;
        vision.confidence = Math.max(0, Number((vision.confidence - 0.1).toFixed(2)));
        console.log('[scan] fuzzy CNPJ match: extraído=%s banco=%s distância=%s', vision.cnpj, fuzzyCandidate, fuzzyDistance);
      } else {
        console.log('[scan] fuzzy CNPJ sem match único (candidatos=%d)', fuzzy.candidates);
      }
    }

    if (!merchant && vision.merchant_name) {
      const { data, error } = await service
        .from('merchants')
        .select('*')
        .ilike('business_name', `%${vision.merchant_name}%`)
        .eq('status', 'active')
        .limit(1);
      if (error) console.log('[scan] merchant by name error:', error.message);
      merchant = (data?.[0] as Merchant | undefined) ?? null;
      if (merchant) matchType = 'name';
    }

    console.log('[scan] merchant match:', {
      type: matchType,
      found: merchant ? { id: merchant.id, name: merchant.business_name, document: merchant.document, cashback_rate: merchant.cashback_rate } : null,
      searched_cnpj: vision.cnpj,
      searched_name: vision.merchant_name,
    });

    const decision = decideReceipt(vision, merchant);

    console.log('[scan] decision:', {
      status: decision.status,
      credits: decision.credits,
      seeds: decision.seeds,
      reason: decision.reason,
    });

    const { data: inserted, error: insertErr } = await service
      .from('receipts')
      .insert({
        consumer_id: user.id,
        merchant_id: merchant?.id ?? null,
        image_url: storagePath,
        image_hash: imageHash,
        extracted_cnpj: vision.cnpj,
        extracted_merchant_name: vision.merchant_name,
        extracted_amount: extractedAmount,
        extracted_date: extractedDate,
        confidence_score: vision.confidence,
        status: decision.status,
        rejection_reason: decision.reason,
        credits_generated: decision.credits,
        seeds_generated: decision.seeds,
        vision_raw: {
          ...(vision.raw as object ?? {}),
          match_type: matchType,
          fuzzy_distance: fuzzyDistance,
          fuzzy_candidate: fuzzyCandidate,
        },
      })
      .select('id, status, credits_generated, seeds_generated')
      .single();

    if (insertErr || !inserted) {
      console.error('[scan] insert receipts error:', insertErr);
      return NextResponse.json(
        { error: 'Falha ao registrar comprovante.', detail: insertErr?.message },
        { status: 500 },
      );
    }

    let awarded: AwardResult[] = [];
    let unlockedAchievements: UnlockedAchievement[] = [];

    if (decision.status === 'approved' && decision.credits > 0) {
      const { data: wallet } = await service
        .from('credit_wallets')
        .select('id, total_earned, total_seeds_earned')
        .eq('consumer_id', user.id)
        .maybeSingle();

      if (wallet) {
        await service
          .from('credit_wallets')
          .update({
            total_earned: Number(wallet.total_earned) + decision.credits,
            total_seeds_earned: Number(wallet.total_seeds_earned ?? 0) + decision.seeds,
            updated_at: new Date().toISOString(),
          })
          .eq('id', wallet.id);
      } else {
        await service.from('credit_wallets').insert({
          consumer_id: user.id,
          total_earned: decision.credits,
          total_allocated: 0,
          total_seeds_earned: decision.seeds,
          seeds_allocated: 0,
        });
      }

      try {
        const achRes = await checkAchievements(user.id, service);
        unlockedAchievements = achRes.unlocked;
      } catch (e) {
        console.error('[scan] achievements check error:', e);
      }

      try {
        const ctx = await buildAwardContext(user.id, service);
        awarded = await awardCollectibles(user.id, 'scan', ctx);
        const weekly = await checkWeeklyChallenge(user.id);
        if (weekly.awarded) awarded.push(weekly.awarded);
      } catch (e) {
        console.error('[scan] collectibles error:', e);
      }
    }

    return NextResponse.json({
      receipt_id: inserted.id,
      status: inserted.status,
      credits_generated: Number(inserted.credits_generated ?? 0),
      seeds_generated: Number(inserted.seeds_generated ?? 0),
      merchant_found: merchant
        ? { id: merchant.id, name: merchant.business_name, cashback_rate: merchant.cashback_rate }
        : null,
      message:
        decision.status === 'approved'
          ? `Você ganhou ${decision.seeds} 🌱 Seeds!`
          : decision.status === 'suspicious'
          ? 'Comprovante enviado para revisão.'
          : decision.status === 'rejected'
          ? decision.reason ?? 'Comprovante rejeitado.'
          : 'Comprovante recebido e aguardando validação.',
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
    console.error('[scan] unexpected error:', err);
    const message = err instanceof Error ? err.message : 'Erro inesperado';
    return NextResponse.json({ error: 'Erro ao processar o comprovante.', detail: message }, { status: 500 });
  }
}
