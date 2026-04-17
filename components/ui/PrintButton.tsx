'use client';

export function PrintButton({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <button onClick={() => window.print()} className={`text-sm text-cv-green hover:underline no-print ${className}`}>
      {children}
    </button>
  );
}
