'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { formatSeeds } from '@/lib/format';
import { SeedIcon } from '@/components/ui/SeedIcon';

export interface WeeklySeeds {
  week: string; // ex: 'S1'
  seeds: number;
}

interface TooltipRenderProps {
  active?: boolean;
  payload?: Array<{ payload?: WeeklySeeds }>;
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
        boxShadow: '0 6px 16px rgba(0,0,0,0.08)',
      }}
    >
      <div className="font-medium text-cv-earth">Semana {label}</div>
      <div className="text-cv-earth/80 mt-0.5">
        <strong className="text-cv-green inline-flex items-center gap-1">{formatSeeds(p.seeds)} <SeedIcon size={11} /></strong> plantados
      </div>
    </div>
  );
}

export function ImpactChart({ data }: { data: WeeklySeeds[] }) {
  const hasData = data.some((d) => d.seeds > 0);
  if (!hasData) {
    return (
      <div className="text-sm text-cv-earth/60 text-center py-12">
        Quando os consumidores começarem a plantar, a evolução aparece aqui.
      </div>
    );
  }
  return (
    <div style={{ width: '100%', height: 180 }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 12, right: 16, bottom: 0, left: 8 }}>
          <defs>
            <linearGradient id="cv-impact-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1B7A4A" stopOpacity={0.55} />
              <stop offset="100%" stopColor="#1B7A4A" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#E5E7EB" vertical={false} />
          <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fill: '#3D2B1F', fontSize: 11 }} />
          <YAxis hide />
          <Tooltip cursor={{ stroke: 'rgba(27, 122, 74, 0.2)' }} content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="seeds"
            stroke="#1B7A4A"
            strokeWidth={2}
            fill="url(#cv-impact-grad)"
            isAnimationActive
            animationDuration={800}
            activeDot={{ r: 4, fill: '#1B7A4A', stroke: '#FEFCF8', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
