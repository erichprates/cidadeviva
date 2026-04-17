import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkAchievements } from '@/lib/achievements/check';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let consumerId: string | null = user?.id ?? null;
  if (!consumerId) {
    const body = await request.json().catch(() => null);
    consumerId = body?.consumer_id ?? null;
  }
  if (!consumerId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const result = await checkAchievements(consumerId);
  return NextResponse.json(result);
}
