'use client';

import Link from 'next/link';

export function ConsumerHeader() {
  return (
    <div
      className="w-full flex items-center justify-center"
      style={{ paddingTop: 20, paddingBottom: 12 }}
    >
      <Link href="/dashboard" aria-label="Cidade Viva — Início" className="inline-flex max-w-full">
        <img
          src="/logo.svg"
          alt="Cidade Viva"
          style={{ height: 42, width: 'auto', display: 'block', maxWidth: '60vw' }}
        />
      </Link>
    </div>
  );
}
