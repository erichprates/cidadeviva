'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { SeedIcon } from '../ui/SeedIcon';

export type RankingTab = 'seeds' | 'colecao';
export type RankingPeriod = 'week' | 'month' | 'all';

export function RankingTabs({ active }: { active: RankingTab }) {
  const pathname = usePathname() ?? '/ranking';
  const params = useSearchParams();
  const period = (params?.get('period') as RankingPeriod) ?? 'all';

  const link = (tab: RankingTab) => {
    const sp = new URLSearchParams();
    sp.set('tab', tab);
    if (tab === 'seeds') sp.set('period', period);
    return `${pathname}?${sp.toString()}`;
  };

  return (
    <div className="grid grid-cols-2 gap-2 mb-4">
      <Link
        href={link('seeds')}
        className="rounded-full py-2.5 inline-flex items-center justify-center gap-1.5 text-sm font-medium transition"
        style={{
          background: active === 'seeds' ? '#1B7A4A' : 'rgba(61,43,31,0.06)',
          color: active === 'seeds' ? '#FEFCF8' : '#3D2B1F',
        }}
      >
        <SeedIcon size={14} /> Maiores Impactadores
      </Link>
      <Link
        href={link('colecao')}
        className="rounded-full py-2.5 text-center text-sm font-medium transition"
        style={{
          background: active === 'colecao' ? '#E8A020' : 'rgba(61,43,31,0.06)',
          color: active === 'colecao' ? '#3D2B1F' : '#3D2B1F',
        }}
      >
        ✨ Colecionadores
      </Link>
    </div>
  );
}

export function PeriodFilter({ active }: { active: RankingPeriod }) {
  const pathname = usePathname() ?? '/ranking';
  const link = (period: RankingPeriod) => {
    const sp = new URLSearchParams();
    sp.set('tab', 'seeds');
    sp.set('period', period);
    return `${pathname}?${sp.toString()}`;
  };
  const opt: Array<[RankingPeriod, string]> = [
    ['week', 'Semana'],
    ['month', 'Mês'],
    ['all', 'Geral'],
  ];
  return (
    <div className="inline-flex rounded-full p-1 mb-4" style={{ background: 'rgba(61,43,31,0.06)' }}>
      {opt.map(([p, label]) => (
        <Link
          key={p}
          href={link(p)}
          className="px-4 py-1.5 rounded-full text-xs font-medium transition"
          style={{
            background: active === p ? '#FEFCF8' : 'transparent',
            color: '#3D2B1F',
            boxShadow: active === p ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
          }}
        >
          {label}
        </Link>
      ))}
    </div>
  );
}
