import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { WelcomeFlow, type WelcomeProject } from '@/components/consumer/WelcomeFlow';
import { seedsFromAmount } from '@/lib/credits/calculator';

export const dynamic = 'force-dynamic';

export default async function WelcomePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: projects } = await supabase
    .from('projects')
    .select('id, title, category, cover_image_url, current_seeds, current_amount, goal_seeds, goal_amount')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(3);

  const items: WelcomeProject[] = (projects ?? []).map((p) => ({
    id: p.id as string,
    title: p.title as string,
    category: p.category as string,
    cover_image_url: (p.cover_image_url as string | null) ?? null,
    current_seeds: Number(p.current_seeds ?? 0) || seedsFromAmount(Number(p.current_amount ?? 0)),
    goal_seeds: Number(p.goal_seeds ?? 0) || seedsFromAmount(Number(p.goal_amount ?? 0)),
  }));

  return <WelcomeFlow projects={items} />;
}
