'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { COLLECTIBLE_EVENT } from './CollectibleToast';

interface TabProps {
  href: string;
  label: string;
  active: boolean;
  icon: React.ReactNode;
  badge?: boolean;
}

function Tab({ href, label, active, icon, badge }: TabProps) {
  return (
    <Link
      href={href}
      className="relative flex flex-col items-center justify-center gap-1 pt-2 pb-1 transition-transform duration-150 active:scale-95"
    >
      <span
        className="relative transition-opacity duration-200"
        style={{
          color: active ? '#8DC63F' : '#F5F0E8',
          opacity: active ? 1 : 0.6,
        }}
      >
        {icon}
        {badge && (
          <span
            aria-label="Item novo"
            className="absolute"
            style={{
              top: -2,
              right: -4,
              width: 9,
              height: 9,
              borderRadius: '50%',
              background: '#FF4D4F',
              boxShadow: '0 0 0 2px #3D2B1F',
            }}
          />
        )}
      </span>
      <span
        className="font-sans transition-opacity duration-200"
        style={{
          fontSize: '10px',
          color: active ? '#8DC63F' : '#F5F0E8',
          opacity: active ? 1 : 0.6,
          fontWeight: active ? 600 : 400,
          letterSpacing: '0.01em',
        }}
      >
        {label}
      </span>
    </Link>
  );
}

function HomeIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" />
    </svg>
  );
}

function LeafIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 20c0-8 6-14 14-14 0 8-6 14-14 14Z" />
      <path d="M5 20c4-4 8-7 14-14" />
    </svg>
  );
}

function CameraIcon({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 8h3l2-2.5h6L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  );
}

function TrophyIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 4h10v3a5 5 0 0 1-10 0V4Z" />
      <path d="M5 5H3v2a3 3 0 0 0 3 3" />
      <path d="M19 5h2v2a3 3 0 0 1-3 3" />
      <path d="M9 14h6v2a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2v-2Z" />
      <path d="M8 21h8" />
    </svg>
  );
}

function PersonIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c1.5-4 5-6 8-6s6.5 2 8 6" />
    </svg>
  );
}

const PENDING_KEY = 'cv_pending_collectibles';
export const LAST_SEEN_KEY = 'last_seen_collectible';

export function markCollectiblesSeen() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LAST_SEEN_KEY, new Date().toISOString());
    localStorage.removeItem(PENDING_KEY);
    window.dispatchEvent(new CustomEvent('cv:collectibles-seen'));
  } catch {
    // best-effort
  }
}

export function BottomNav() {
  const pathname = usePathname() ?? '';
  const router = useRouter();
  const [hasPending, setHasPending] = useState(false);

  useEffect(() => {
    const read = () => {
      try {
        setHasPending(localStorage.getItem(PENDING_KEY) === '1');
      } catch {
        setHasPending(false);
      }
    };
    read();
    const onAward = () => {
      try { localStorage.setItem(PENDING_KEY, '1'); } catch {}
      setHasPending(true);
    };
    const onSeen = () => setHasPending(false);
    const onStorage = () => read();
    window.addEventListener(COLLECTIBLE_EVENT, onAward);
    window.addEventListener('cv:collectibles-seen', onSeen);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(COLLECTIBLE_EVENT, onAward);
      window.removeEventListener('cv:collectibles-seen', onSeen);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const isHome = pathname === '/dashboard' || pathname === '/';
  const isProjects = pathname.startsWith('/projects') || pathname.startsWith('/seeds');
  const isRanking = pathname.startsWith('/ranking');
  const isPerfil = pathname.startsWith('/perfil');

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40"
      style={{
        background: '#3D2B1F',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div
        className="relative mx-auto max-w-xl"
        style={{ height: '64px' }}
      >
        <div className="grid grid-cols-5 h-full">
          <Tab href="/dashboard" label="Início" active={isHome} icon={<HomeIcon />} />
          <Tab href="/projects" label="Projetos" active={isProjects} icon={<LeafIcon />} />

          <div className="relative flex items-center justify-center">
            <button
              type="button"
              aria-label="Escanear comprovante"
              onClick={() => router.push('/scan')}
              className="absolute grid place-items-center rounded-full transition-transform duration-150 active:scale-[0.92]"
              style={{
                width: '64px',
                height: '64px',
                background: '#1B7A4A',
                boxShadow: '0 4px 20px rgba(27, 122, 74, 0.5)',
                border: '3px solid rgba(141, 198, 63, 0.4)',
                transform: 'translateY(-20px)',
                color: '#FFFFFF',
              }}
            >
              <CameraIcon />
            </button>
          </div>

          <Tab href="/ranking" label="Ranking" active={isRanking} icon={<TrophyIcon />} />
          <Tab
            href="/perfil"
            label="Perfil"
            active={isPerfil}
            icon={<PersonIcon />}
            badge={hasPending && !isPerfil}
          />
        </div>
      </div>
    </nav>
  );
}
