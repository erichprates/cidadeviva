'use client';

import { useEffect, useState } from 'react';

export function FadeIn({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShown(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  return (
    <div
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? 'translateY(0)' : 'translateY(8px)',
        transition: 'opacity 380ms ease-out, transform 380ms ease-out',
      }}
    >
      {children}
    </div>
  );
}
