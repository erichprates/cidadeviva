'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { formatBRL, formatSeeds } from '@/lib/format';
import { SeedIcon } from '../ui/SeedIcon';

export interface EsgPoint {
  label: string;       // ex: 'Nov/25'
  volume: number;      // R$
  seeds: number;       // Seeds gerados
  families: number;    // famílias impactadas estimadas
}

interface TooltipRenderProps {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; color?: string; payload?: EsgPoint }>;
  label?: string | number;
}

function CustomTooltip({ active, payload, label }: TooltipRenderProps) {
  if (!active || !payload || payload.length === 0) return null;
  const p = payload[0]?.payload;
  if (!p) return null;
  return (
    <div
      className="rounded-xl px-3 py-2 text-xs"
      style={{
        background: '#FEFCF8',
        border: '1px solid rgba(27, 122, 74, 0.2)',
        boxShadow: '0 6px 16px rgba(0,0,0,0.1)',
      }}
    >
      <div className="font-medium text-cv-earth">{label}</div>
      <div className="mt-1 space-y-0.5 text-cv-earth/80">
        <div>Volume: <strong className="text-cv-green">{formatBRL(p.volume)}</strong></div>
        <div>Seeds: <strong className="inline-flex items-center gap-1" style={{ color: '#6B9E1F' }}>{formatSeeds(p.seeds)} <SeedIcon size={11} /></strong></div>
        <div>Famílias: <strong className="text-cv-gold">{p.families}</strong></div>
      </div>
    </div>
  );
}

export function EsgEvolutionChart({ data }: { data: EsgPoint[] }) {
  const hasData = data.some((d) => d.volume > 0 || d.seeds > 0 || d.families > 0);
  if (!hasData) {
    return (
      <div className="text-sm text-cv-earth/60 text-center py-12">
        Dados aparecerão conforme comprovantes forem escaneados.
      </div>
    );
  }
  return (
    <div style={{ width: '100%', height: 200 }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 12, right: 16, bottom: 0, left: 8 }}>
          <CartesianGrid stroke="#E5E7EB" vertical={false} />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#3D2B1F', fontSize: 11 }} />
          <YAxis hide />
          <Tooltip cursor={{ stroke: 'rgba(27, 122, 74, 0.2)' }} content={<CustomTooltip />} />
          <Legend iconType="circle" iconSize={9} wrapperStyle={{ fontSize: 11, color: '#3D2B1F' }} />
          <Line name="Volume rastreado" type="monotone" dataKey="volume" stroke="#1B7A4A" strokeWidth={2} dot={{ r: 3 }} isAnimationActive animationDuration={700} />
          <Line name="Seeds gerados" type="monotone" dataKey="seeds" stroke="#8DC63F" strokeWidth={2} dot={{ r: 3 }} isAnimationActive animationDuration={700} />
          <Line name="Famílias impactadas" type="monotone" dataKey="families" stroke="#E8A020" strokeWidth={2} dot={{ r: 3 }} isAnimationActive animationDuration={700} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
