import { createClient } from '@/lib/supabase/server';
import { SeedsPurchase } from '@/components/consumer/SeedsPurchase';

export default async function SeedsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: wallet } = await supabase
    .from('credit_wallets')
    .select('total_seeds_earned, seeds_allocated')
    .eq('consumer_id', user.id)
    .maybeSingle();

  const totalSeeds = Number(wallet?.total_seeds_earned ?? 0);
  const seedsAllocated = Number(wallet?.seeds_allocated ?? 0);
  const seedsBalance = totalSeeds - seedsAllocated;

  return <SeedsPurchase seedsBalance={seedsBalance} />;
}
