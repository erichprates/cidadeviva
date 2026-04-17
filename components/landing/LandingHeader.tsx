'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const NAV_LINKS: Array<{ href: string; label: string }> = [
  { href: '#como-funciona', label: 'Como funciona' },
  { href: '#projetos', label: 'Projetos' },
  { href: '#lojistas', label: 'Para lojistas' },
];

export function LandingHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [menuOpen]);

  return (
    <>
      <header
        className="fixed top-0 inset-x-0 z-50"
        style={{
          background: scrolled ? 'rgba(61, 43, 31, 0.92)' : 'transparent',
          backdropFilter: scrolled ? 'blur(10px)' : 'none',
          boxShadow: scrolled ? '0 1px 0 rgba(255,255,255,0.06)' : 'none',
          transition: 'background 220ms ease, backdrop-filter 220ms ease, box-shadow 220ms ease',
        }}
      >
        <div className="max-w-6xl mx-auto px-5 md:px-8 flex items-center justify-between" style={{ height: 64 }}>
          <Link href="/" aria-label="Cidade Viva" className="inline-flex items-center gap-2">
            <span
              className="grid place-items-center rounded-full font-display text-cv-white"
              style={{ width: 34, height: 34, background: '#1B7A4A', fontSize: 14, fontWeight: 700 }}
            >
              CV
            </span>
            <span className="font-display text-cv-white hidden sm:inline" style={{ fontSize: 17, fontWeight: 700 }}>
              Cidade Viva
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-7">
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="text-sm text-cv-white/85 hover:text-cv-white transition"
              >
                {l.label}
              </a>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-2">
            <Link
              href="/login"
              className="inline-flex items-center rounded-full border border-cv-white/30 text-cv-white px-4 py-2 text-sm hover:bg-cv-white/10 transition"
            >
              Entrar
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center rounded-full bg-cv-lime text-cv-earth px-4 py-2 text-sm font-semibold hover:bg-cv-lime/90 transition"
            >
              Começar
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Menu"
            aria-expanded={menuOpen}
            className="md:hidden grid place-items-center rounded-full text-cv-white"
            style={{ width: 40, height: 40, background: 'rgba(255,255,255,0.08)' }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {menuOpen ? (
                <>
                  <path d="M18 6L6 18" />
                  <path d="M6 6l12 12" />
                </>
              ) : (
                <>
                  <path d="M3 6h18" />
                  <path d="M3 12h18" />
                  <path d="M3 18h18" />
                </>
              )}
            </svg>
          </button>
        </div>
      </header>

      {/* Drawer mobile */}
      <div
        aria-hidden={!menuOpen}
        className="md:hidden fixed inset-0 z-40"
        style={{
          pointerEvents: menuOpen ? 'auto' : 'none',
          background: menuOpen ? 'rgba(61, 43, 31, 0.55)' : 'transparent',
          transition: 'background 240ms ease',
        }}
        onClick={() => setMenuOpen(false)}
      >
        <aside
          onClick={(e) => e.stopPropagation()}
          className="absolute top-0 right-0 h-full"
          style={{
            width: 'min(86vw, 320px)',
            background: '#3D2B1F',
            transform: menuOpen ? 'translateX(0)' : 'translateX(100%)',
            transition: 'transform 280ms cubic-bezier(0.22, 1, 0.36, 1)',
            paddingTop: 80,
            boxShadow: '-14px 0 40px rgba(0,0,0,0.35)',
          }}
        >
          <nav className="flex flex-col gap-1 px-4">
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setMenuOpen(false)}
                className="text-cv-white/90 text-base py-3 px-2 border-b border-cv-white/10"
              >
                {l.label}
              </a>
            ))}
          </nav>
          <div className="px-4 mt-6 flex flex-col gap-2">
            <Link
              href="/login"
              onClick={() => setMenuOpen(false)}
              className="inline-flex items-center justify-center rounded-full border border-cv-white/30 text-cv-white px-4 py-3 text-sm"
            >
              Entrar
            </Link>
            <Link
              href="/register"
              onClick={() => setMenuOpen(false)}
              className="inline-flex items-center justify-center rounded-full bg-cv-lime text-cv-earth px-4 py-3 text-sm font-semibold"
            >
              Começar
            </Link>
          </div>
        </aside>
      </div>
    </>
  );
}
