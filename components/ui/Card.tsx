export function Card({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={`bg-cv-white rounded-2xl border border-cv-earth/5 p-6 ${className}`}>{children}</div>
  );
}
