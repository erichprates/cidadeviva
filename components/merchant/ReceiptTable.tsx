import { Badge } from '../ui/Badge';
import type { Receipt } from '@/lib/supabase/types';
import { formatBRL, formatDate } from '@/lib/format';

const statusMap = {
  approved: { tone: 'green' as const, label: 'Aprovado' },
  pending: { tone: 'earth' as const, label: 'Pendente' },
  suspicious: { tone: 'amber' as const, label: 'Em revisão' },
  rejected: { tone: 'red' as const, label: 'Rejeitado' },
};

export function ReceiptTable({ receipts }: { receipts: Receipt[] }) {
  if (!receipts.length) {
    return <div className="text-cv-earth/60 text-sm">Nenhum comprovante ainda.</div>;
  }

  return (
    <div className="bg-cv-white rounded-2xl border border-cv-earth/5 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-cv-sand text-cv-earth/70">
          <tr>
            <th className="text-left px-4 py-3">Data</th>
            <th className="text-left px-4 py-3">Valor</th>
            <th className="text-left px-4 py-3">Cliente</th>
            <th className="text-left px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {receipts.map((r) => {
            const s = statusMap[r.status] ?? statusMap.pending;
            return (
              <tr key={r.id} className="border-t border-cv-earth/5">
                <td className="px-4 py-3">{r.extracted_date ? formatDate(r.extracted_date) : formatDate(r.created_at)}</td>
                <td className="px-4 py-3">{formatBRL(Number(r.extracted_amount ?? 0))}</td>
                <td className="px-4 py-3 font-mono text-xs">{r.consumer_id.slice(0, 8)}</td>
                <td className="px-4 py-3"><Badge tone={s.tone}>{s.label}</Badge></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
