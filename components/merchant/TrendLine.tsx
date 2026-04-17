'use client';

import {
  LineChart,
  Line,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { formatBRL, formatDate } from '@/lib/format';

export interface DailyPoint {
  date: string; // ISO date (YYYY-MM-DD)
  volume: number;
}

interface LineTooltipProps {
  active?: boolean;
  payload?: Array<{ payload?: DailyPoint }>;
}

function CustomTooltip({ active, payload }: LineTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const p = payload[0]?.payload;
  if (!p) return null;
  return (
    <div
      className="rounded-lg px-2 py-1 text-[11px]"
      style={{
        background: '#FEFCF8',
        border: '1px solid rgba(27, 122, 74, 0.2)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
      }}
    >
      <span className="text-cv-earth/70">{formatDate(p.date)}</span>
      {' · '}
      <strong className="text-cv-green">{formatBRL(p.volume)}</strong>
    </div>
  );
}

export function TrendLine({ data }: { data: DailyPoint[] }) {
  const hasData = data.some((d) => d.volume > 0);
  if (!hasData) {
    return <div className="h-[60px]" />;
  }
  return (
    <div style={{ width: '100%', height: 60 }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
          <Tooltip cursor={{ stroke: 'rgba(27, 122, 74, 0.2)' }} content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="volume"
            stroke="#1B7A4A"
            strokeWidth={2}
            dot={false}
            isAnimationActive
            animationDuration={700}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
