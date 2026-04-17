type Tone = 'green' | 'gold' | 'amber' | 'earth' | 'red';

const tones: Record<Tone, string> = {
  green: 'bg-cv-green/10 text-cv-green',
  gold: 'bg-cv-gold/15 text-cv-gold',
  amber: 'bg-amber-100 text-amber-800',
  earth: 'bg-cv-earth/10 text-cv-earth',
  red: 'bg-red-100 text-red-700',
};

export function Badge({ tone = 'green', children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}
