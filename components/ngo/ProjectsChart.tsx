'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  ResponsiveContainer,
} from 'recharts';
import { formatSeeds } from '@/lib/format';
import { SeedIcon } from '@/components/ui/SeedIcon';

export interface ProjectRow {
  name: string;
  category: string;
  seeds: number;
}

const CAT_COLOR: Record<string, string> = {
  saude: '#1B7A4A',
  educacao: '#1B4A7A',
  alimentacao: '#E8A020',
  cultura: '#C63F83',
  meio_ambiente: '#149E99',
};

function colorFor(cat: string): string {
  return CAT_COLOR[cat] ?? '#3D2B1F';
}

interface TooltipRenderProps {
  active?: boolean;
  payload?: Array<{ payload?: ProjectRow & { __total?: number } }>;
}

function CustomTooltip({ active, payload }: TooltipRenderProps) {
  if (!active || !payload || payload.length === 0) return null;
  const p = payload[0]?.payload;
  if (!p) return null;
  const total = p.__total ?? 0;
  const pct = total > 0 ? Math.round((p.seeds / total) * 100) : 0;
  return (
    <div
      className="rounded-xl px-3 py-2 text-xs"
      style={{
        background: '#FEFCF8',
        border: '1px solid rgba(27, 122, 74, 0.2)',
        boxShadow: '0 6px 16px rgba(0,0,0,0.08)',
      }}
    >
      <div className="font-medium text-cv-earth">{p.name}</div>
      <div className="text-cv-earth/80 mt-0.5">
        <strong className="text-cv-green inline-flex items-center gap-1">{formatSeeds(p.seeds)} <SeedIcon size={11} /></strong> · {pct}%
      </div>
    </div>
  );
}

export function ProjectsChart({ data }: { data: ProjectRow[] }) {
  const hasData = data.some((d) => d.seeds > 0);
  if (!hasData) {
    return (
      <div className="text-sm text-cv-earth/60 text-center py-12">
        Seus projetos aparecerão aqui quando começarem a receber Seeds.
      </div>
    );
  }
  const total = data.reduce((s, d) => s + d.seeds, 0);
  const enriched = data.map((d) => ({ ...d, __total: total }));
  const height = Math.max(160, enriched.length * 56);

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <BarChart
          data={enriched}
          layout="vertical"
          margin={{ top: 8, right: 24, bottom: 8, left: 8 }}
        >
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="name"
            axisLine={false}
            tickLine={false}
            width={140}
            tick={{ fill: '#3D2B1F', fontSize: 12 }}
          />
          <Tooltip cursor={{ fill: 'rgba(61, 43, 31, 0.04)' }} content={<CustomTooltip />} />
          <Bar
            dataKey="seeds"
            radius={[0, 6, 6, 0]}
            isAnimationActive
            animationDuration={700}
            label={{
              position: 'right',
              formatter: (v) => formatSeeds(Number(v ?? 0)),
              fill: '#3D2B1F',
              fontSize: 11,
            }}
          >
            {enriched.map((d, i) => (
              <Cell key={i} fill={colorFor(d.category)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
