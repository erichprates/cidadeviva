'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getCategory } from '@/lib/categories';
import { ProjectCover } from '@/components/ui/ProjectCover';
import { seedsFromAmount } from '@/lib/credits/calculator';
import { formatSeeds } from '@/lib/format';
import { SeedIcon } from '@/components/ui/SeedIcon';

export interface WelcomeProject {
  id: string;
  title: string;
  category: string;
  cover_image_url: string | null;
  current_seeds: number;
  goal_seeds: number;
}

interface Props {
  projects: WelcomeProject[];
}

const ONBOARDING_KEY = 'cv_onboarding_done';

export function WelcomeFlow({ projects }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);

  useEffect(() => {
    // Se já fez onboarding, manda direto pro dashboard.
    if (typeof window === 'undefined') return;
    if (localStorage.getItem(ONBOARDING_KEY) === 'true') {
      router.replace('/dashboard');
    }
  }, [router]);

  const finish = (target: '/scan' | '/dashboard') => {
    try { localStorage.setItem(ONBOARDING_KEY, 'true'); } catch {}
    router.replace(target);
  };

  const next = () => {
    setDirection(1);
    if (step < 3) setStep((s) => s + 1);
  };

  const skip = () => finish('/dashboard');

  const screens = [
    <Screen1 key="0" onNext={next} />,
    <Screen2 key="1" onNext={next} />,
    <Screen3 key="2" projects={projects} onNext={next} />,
    <Screen4 key="3" onScan={() => finish('/scan')} onDash={() => finish('/dashboard')} />,
  ];

  return (
    <div className="min-h-screen bg-cv-sand flex flex-col">
      <style>{`
        @keyframes cv-soft-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.08); }
        }
        @keyframes cv-fade-in {
          from { opacity: 0; transform: translateX(${direction === 1 ? '20px' : '-20px'}); }
          to { opacity: 1; transform: translateX(0); }
        }
        .cv-pulse { animation: cv-soft-pulse 2.4s ease-in-out infinite; display: inline-block; }
        .cv-screen { animation: cv-fade-in 350ms ease-out; }
      `}</style>

      <header className="flex items-center justify-between px-4 gap-3" style={{ paddingTop: 24, paddingBottom: 12 }}>
        <Link href="/" className="inline-flex min-w-0 flex-1">
          <img
            src="/logo.svg"
            alt="Cidade Viva"
            style={{ height: 37, width: 'auto', display: 'block', maxWidth: '60vw' }}
          />
        </Link>
        {step < 3 && (
          <button
            type="button"
            onClick={skip}
            className="text-sm text-cv-earth/55 hover:text-cv-earth px-3 py-1.5 rounded-full"
          >
            Pular
          </button>
        )}
      </header>

      <main className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-md cv-screen" key={step}>
          {screens[step]}
        </div>
      </main>

      <footer className="flex justify-center pb-6 pt-3">
        <div className="flex gap-2">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className="rounded-full transition-all"
              style={{
                width: i === step ? 22 : 8,
                height: 8,
                background: i === step ? '#1B7A4A' : 'rgba(61,43,31,0.2)',
              }}
            />
          ))}
        </div>
      </footer>
    </div>
  );
}

function Screen1({ onNext }: { onNext: () => void }) {
  return (
    <div className="text-center">
      <div className="cv-pulse inline-block"><SeedIcon size={96} /></div>
      <h1 className="font-display mt-6 text-cv-earth" style={{ fontSize: 28, fontWeight: 700 }}>
        Bem-vindo ao Cidade Viva!
      </h1>
      <p className="mt-3 text-cv-earth/75 text-base">
        Cada compra que você faz pode transformar sua cidade. Veja como:
      </p>
      <button
        type="button"
        onClick={onNext}
        className="mt-8 inline-flex items-center justify-center rounded-full bg-cv-green text-cv-white px-8 py-3.5 text-base font-semibold active:scale-95 transition"
      >
        Começar →
      </button>
    </div>
  );
}

function Screen2({ onNext }: { onNext: () => void }) {
  const steps = [
    { emoji: '🧾', title: 'Escaneie seu comprovante', desc: 'NF, recibo ou cupom de qualquer compra.' },
    { emoji: '🌱', title: 'Ganhe Seeds', desc: 'Cada compra gera Seeds proporcional ao valor.' },
    { emoji: '🌳', title: 'Plante em projetos', desc: 'Direcione seus Seeds para causas da sua cidade.' },
  ];
  return (
    <div>
      <h2 className="font-display text-center text-cv-earth" style={{ fontSize: 24, fontWeight: 700 }}>
        Como funciona
      </h2>
      <div className="mt-6 space-y-4">
        {steps.map((s, i) => (
          <div
            key={i}
            className="rounded-2xl bg-cv-white p-4 flex items-start gap-4 border border-cv-earth/5"
          >
            <div style={{ fontSize: 36, lineHeight: 1 }}>{s.emoji}</div>
            <div className="flex-1">
              <div className="font-display text-cv-earth" style={{ fontSize: 16, fontWeight: 700 }}>
                {s.title}
              </div>
              <div className="text-sm text-cv-earth/70 mt-0.5">{s.desc}</div>
            </div>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={onNext}
        className="mt-8 w-full inline-flex items-center justify-center rounded-full bg-cv-green text-cv-white px-6 py-3.5 text-base font-semibold active:scale-[0.98] transition"
      >
        Entendi →
      </button>
    </div>
  );
}

function Screen3({ projects, onNext }: { projects: WelcomeProject[]; onNext: () => void }) {
  return (
    <div>
      <h2 className="font-display text-center text-cv-earth" style={{ fontSize: 24, fontWeight: 700 }}>
        Veja o que você pode impactar
      </h2>
      <p className="mt-2 text-center text-sm text-cv-earth/70">
        Projetos sociais reais esperando suas Seeds.
      </p>
      <div className="mt-5 space-y-3">
        {projects.length === 0 && (
          <div className="rounded-2xl bg-cv-white p-6 text-center text-sm text-cv-earth/60 border border-cv-earth/5">
            Em breve teremos projetos no seu bairro.
          </div>
        )}
        {projects.slice(0, 3).map((p) => {
          const cat = getCategory(p.category);
          const goal = Number(p.goal_seeds) || seedsFromAmount(0);
          const cur = Number(p.current_seeds) || 0;
          const pct = Math.min(100, Math.round((cur / Math.max(1, goal)) * 100));
          return (
            <div
              key={p.id}
              className="rounded-2xl bg-cv-white border border-cv-earth/5 overflow-hidden"
            >
              <ProjectCover coverUrl={p.cover_image_url} category={p.category} height={80} />
              <div className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-display text-cv-earth truncate" style={{ fontSize: 14, fontWeight: 700 }}>
                    {p.title}
                  </div>
                  <span
                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold shrink-0"
                    style={{ background: cat.bg, color: cat.fg }}
                  >
                    {cat.emoji} {cat.label}
                  </span>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-cv-sand overflow-hidden">
                  <div className="h-full bg-cv-lime" style={{ width: `${pct}%` }} />
                </div>
                <div className="mt-1 text-[11px] text-cv-earth/60 inline-flex items-center gap-1">
                  {formatSeeds(cur)} / {formatSeeds(goal)} <SeedIcon size={11} /> · {pct}%
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <button
        type="button"
        onClick={onNext}
        className="mt-6 w-full inline-flex items-center justify-center rounded-full bg-cv-green text-cv-white px-6 py-3.5 text-base font-semibold active:scale-[0.98] transition"
      >
        Quero participar →
      </button>
    </div>
  );
}

function Screen4({ onScan, onDash }: { onScan: () => void; onDash: () => void }) {
  return (
    <div className="text-center">
      <div style={{ fontSize: 96, lineHeight: 1 }} className="cv-pulse">📷</div>
      <h2 className="font-display mt-6 text-cv-earth" style={{ fontSize: 26, fontWeight: 700 }}>
        Escaneie sua primeira nota!
      </h2>
      <p className="mt-3 text-cv-earth/75 text-base">
        Aponte a câmera para qualquer comprovante de compra e ganhe seus primeiros Seeds.
      </p>
      <button
        type="button"
        onClick={onScan}
        className="mt-8 w-full inline-flex items-center justify-center rounded-full bg-cv-green text-cv-white px-6 py-4 text-lg font-semibold active:scale-[0.98] transition"
      >
        Escanear agora 📷
      </button>
      <button
        type="button"
        onClick={onDash}
        className="mt-3 text-sm text-cv-earth/60 hover:text-cv-earth"
      >
        Ver meu painel →
      </button>
    </div>
  );
}
