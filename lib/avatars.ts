// Cores do avatar baseadas na primeira letra do nome.
// A-F: verde, G-M: âmbar, N-S: coral, T-Z: purple.

export interface AvatarColor {
  bg: string;
  fg: string;
}

const PALETTE: Record<'green' | 'amber' | 'coral' | 'purple', AvatarColor> = {
  green: { bg: '#1B7A4A', fg: '#FEFCF8' },
  amber: { bg: '#E8A020', fg: '#3D2B1F' },
  coral: { bg: '#FF7A45', fg: '#FEFCF8' },
  purple: { bg: '#7A4FCF', fg: '#FEFCF8' },
};

export function colorForName(name: string | null | undefined): AvatarColor {
  const ch = (name ?? '?').trim().charAt(0).toUpperCase();
  if (ch >= 'A' && ch <= 'F') return PALETTE.green;
  if (ch >= 'G' && ch <= 'M') return PALETTE.amber;
  if (ch >= 'N' && ch <= 'S') return PALETTE.coral;
  if (ch >= 'T' && ch <= 'Z') return PALETTE.purple;
  return PALETTE.green;
}

export function initials(name: string | null | undefined, max = 2): string {
  const trimmed = (name ?? '').trim();
  if (!trimmed) return '?';
  return (
    trimmed
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, max)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('') || '?'
  );
}

export function firstName(full: string | null | undefined): string {
  return (full ?? '').trim().split(/\s+/)[0] || 'Plantador';
}

export function timeAgoPt(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const sec = Math.max(0, Math.floor(ms / 1000));
  if (sec < 60) return 'agora há pouco';
  const min = Math.floor(sec / 60);
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `há ${d} dia${d === 1 ? '' : 's'}`;
  const w = Math.floor(d / 7);
  if (w < 5) return `há ${w} semana${w === 1 ? '' : 's'}`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `há ${mo} mês${mo === 1 ? '' : 'es'}`;
  const y = Math.floor(d / 365);
  return `há ${y} ano${y === 1 ? '' : 's'}`;
}
