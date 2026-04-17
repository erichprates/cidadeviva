'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { formatBRL } from '@/lib/format';

export interface WeeklyVolume {
  semana: string;
  volume: number;
  comprovantes: number;
}

interface TooltipRenderProps {
  active?: boolean;
  payload?: Array<{ payload?: WeeklyVolume }>;
  label?: string | number;
}

function CustomTooltip({ active, payload, label }: TooltipRenderProps) {
  if (!active || !payload || payload.length === 0) return null;
  const v = payload[0]?.payload;
  if (!v) return null;
  return (
    <div
      className="rounded-xl px-3 py-2 text-xs"
      style={{
        background: '#FEFCF8',
        border: '1px solid rgba(27, 122, 74, 0.2)',
        boxShadow: '0 6px 16px rgba(0,0,0,0.08)',
      }}
    >
      <div className="font-medium text-cv-earth">{label}</div>
      <div className="text-cv-earth/75 mt-0.5">
        <strong className="text-cv-green">{formatBRL(v.volume)}</strong> · {v.comprovantes} comprovante{v.comprovantes === 1 ? '' : 's'}
      </div>
    </div>
  );
}

export function VolumeChart({ data }: { data: WeeklyVolume[] }) {
  const hasData = data.some((d) => d.volume > 0 || d.comprovantes > 0);

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
        <BarChart data={data} margin={{ top: 16, right: 8, bottom: 0, left: 8 }}>
          <CartesianGrid stroke="#E5E7EB" vertical={false} />
          <XAxis
            dataKey="semana"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#3D2B1F', fontSize: 12 }}
          />
          <YAxis hide />
          <Tooltip cursor={{ fill: 'rgba(27, 122, 74, 0.06)' }} content={<CustomTooltip />} />
          <Bar
            dataKey="volume"
            fill="#1B7A4A"
            radius={[4, 4, 0, 0]}
            isAnimationActive
            animationDuration={700}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
