'use client';

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { formatSeeds } from '@/lib/format';
import { SeedIcon } from '../ui/SeedIcon';

export interface ProjectSeeds {
  name: string;
  value: number;
  color: string;
}

interface PieTooltipProps {
  active?: boolean;
  payload?: Array<{
    value?: number;
    name?: string;
    payload?: { __total?: number };
  }>;
}

function CustomTooltip({ active, payload }: PieTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const p = payload[0];
  if (!p) return null;
  const value = Number(p.value ?? 0);
  const name = p.name ?? '';
  const total = p.payload?.__total ?? 0;
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div
      className="rounded-xl px-3 py-2 text-xs"
      style={{
        background: '#FEFCF8',
        border: '1px solid rgba(27, 122, 74, 0.2)',
        boxShadow: '0 6px 16px rgba(0,0,0,0.08)',
      }}
    >
      <div className="font-medium text-cv-earth">{name}</div>
      <div className="text-cv-earth/75 mt-0.5">
        <strong className="text-cv-green inline-flex items-center gap-1">{formatSeeds(value)} <SeedIcon size={11} /></strong> · {pct}%
      </div>
    </div>
  );
}

export function SeedsChart({ data }: { data: ProjectSeeds[] }) {
  const total = data.reduce((s, d) => s + Number(d.value ?? 0), 0);

  if (total <= 0 || data.length === 0) {
    return (
      <div className="text-sm text-cv-earth/60 text-center py-12">
        Dados aparecerão conforme comprovantes forem escaneados.
      </div>
    );
  }

  const enriched = data.map((d) => ({ ...d, __total: total }));

  return (
    <div style={{ width: '100%', height: 240 }} className="relative">
      <ResponsiveContainer>
        <PieChart>
          <Tooltip content={<CustomTooltip />} />
          <Pie
            data={enriched}
            dataKey="value"
            nameKey="name"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={2}
            isAnimationActive
            animationDuration={700}
          >
            {enriched.map((d, i) => (
              <Cell key={i} fill={d.color} stroke="#FEFCF8" strokeWidth={2} />
            ))}
          </Pie>
          <Legend
            verticalAlign="bottom"
            iconType="circle"
            iconSize={9}
            formatter={(value, entry) => {
              const payload = entry?.payload as unknown as { value?: number } | undefined;
              const v = Number(payload?.value ?? 0);
              return (
                <span style={{ color: '#3D2B1F', fontSize: 12 }}>
                  {value} · <strong>{formatSeeds(v)}</strong>
                </span>
              );
            }}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Label central do donut */}
      <div
        className="absolute inset-0 grid place-items-center pointer-events-none"
        style={{ paddingBottom: 60 /* evita sobrepor a legend */ }}
      >
        <div className="text-center">
          <div className="font-display text-cv-earth" style={{ fontSize: 22, fontWeight: 700, lineHeight: 1 }}>
            {formatSeeds(total)}
          </div>
          <div className="text-[10px] text-cv-earth/60 uppercase tracking-wide mt-0.5">Seeds totais</div>
        </div>
      </div>
    </div>
  );
}
