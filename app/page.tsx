import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { PartnerLeadForm } from '@/components/landing/PartnerLeadForm';
import { CidadeSocialFooter } from '@/components/ui/CidadeSocialFooter';
import { getCategory } from '@/lib/categories';
import { ProjectCover } from '@/components/ui/ProjectCover';
import { colorForName, initials } from '@/lib/avatars';
import { seedsFromAmount } from '@/lib/credits/calculator';
import { formatSeeds } from '@/lib/format';
import { SeedIcon } from '@/components/ui/SeedIcon';

export const dynamic = 'force-dynamic';

// Emojis decorativos do hero (colecionáveis).
const FLOATING: Array<{ emoji: string; top: string; left: string; size: number; delay: string; dur: string }> = [
  { emoji: '🥾', top: '14%', left: '8%', size: 36, delay: '0s', dur: '3.6s' },
  { emoji: '🪣', top: '22%', left: '88%', size: 44, delay: '0.6s', dur: '4.2s' },
  { emoji: '🌱', top: '55%', left: '6%', size: 52, delay: '1.2s', dur: '3.2s' },
  { emoji: '🏚️', top: '70%', left: '84%', size: 40, delay: '0.3s', dur: '3.8s' },
  { emoji: '🚜', top: '80%', left: '18%', size: 48, delay: '0.9s', dur: '4.4s' },
  { emoji: '🌍', top: '35%', left: '78%', size: 34, delay: '1.5s', dur: '3.4s' },
  { emoji: '✨', top: '60%', left: '70%', size: 30, delay: '0.2s', dur: '3s' },
];

const LEVELS = [
  { emoji: '🌱', name: 'Broto', range: '0 – 99 Seeds' },
  { emoji: '🌿', name: 'Muda', range: '100 – 499 Seeds' },
  { emoji: '🌳', name: 'Árvore', range: '500 – 1.999 Seeds' },
  { emoji: '🌲', name: 'Floresta', range: '2.000+ Seeds' },
];

const TESTIMONIALS = [
  {
    quote: 'Escanei o cupom do mercado e em 3 segundos já tinha Seeds na carteira. Simples demais.',
    name: 'João S.',
    meta: 'Broto 🌱 · São José dos Campos',
  },
  {
    quote: 'Nossos clientes adoraram saber que as compras deles ajudam a Farmácia Comunitária do bairro.',
    name: 'Maria L.',
    meta: 'Proprietária · Mercado Família',
  },
  {
    quote: 'Vi as fotos das crianças na horta escola que apoiei. Isso não tem preço.',
    name: 'Ana R.',
    meta: 'Árvore 🌳 · Jardim Aquarius',
  },
];

const BENEFITS = [
  { emoji: '📊', title: 'Relatório ESG automático', desc: 'Dados de impacto prontos para auditorias e redes sociais.' },
  { emoji: '👥', title: 'Fidelização real', desc: 'Consumidores conscientes voltam mais. Seeds criam hábito.' },
  { emoji: '💰', title: 'Marketing com propósito', desc: 'Associe sua marca a projetos que a comunidade ama.' },
];

export default async function LandingPage() {
  const supabase = createClient();
  const { data: projects } = await supabase
    .from('projects')
    .select('id, title, category, neighborhood, cover_image_url, current_amount, goal_amount, current_seeds, goal_seeds, impact_unit, impact_per_seed')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(3);

  const heroStats = [
    { emoji: '🌱', label: '+5.973 Seeds plantados' },
    { emoji: '🏪', label: '6 lojistas parceiros' },
    { emoji: '👥', label: '253 famílias impactadas' },
  ];

  return (
    <>
      <style>{`
        @keyframes cv-fade-up {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes cv-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes cv-pulse-soft {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.08); }
        }
        .cv-fade-up { animation: cv-fade-up 700ms cubic-bezier(0.22, 1, 0.36, 1) both; }
        .cv-float { animation: cv-float var(--dur, 3.6s) ease-in-out infinite; }
        .cv-pulse-soft { animation: cv-pulse-soft 2.4s ease-in-out infinite; display: inline-block; }
        html { scroll-behavior: smooth; }
      `}</style>

      <LandingHeader />

      <main className="bg-cv-earth">
        {/* SEÇÃO 1 — HERO */}
        <section className="relative overflow-hidden" style={{ background: '#3D2B1F' }}>
          {/* emojis flutuantes decorativos */}
          <div aria-hidden className="absolute inset-0 pointer-events-none" style={{ zIndex: 0 }}>
            {FLOATING.map((f, i) => (
              <span
                key={i}
                className="cv-float absolute"
                style={{
                  top: f.top,
                  left: f.left,
                  fontSize: f.size,
                  opacity: 0.15,
                  animationDelay: f.delay,
                  ['--dur' as string]: f.dur,
                }}
              >
                {f.emoji}
              </span>
            ))}
          </div>

          <div className="relative max-w-6xl mx-auto px-5 md:px-8 text-center" style={{ paddingTop: 128, paddingBottom: 96, zIndex: 1 }}>
            <div className="cv-fade-up" style={{ animationDelay: '0ms' }}>
              <span
                className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold"
                style={{ background: 'rgba(141, 198, 63, 0.2)', color: '#B9DE73' }}
              >
                <SeedIcon size={12} /> Ecossistema de Impacto Local
              </span>
            </div>

            <h1
              className="cv-fade-up font-display text-cv-white mt-6 max-w-4xl mx-auto"
              style={{
                fontSize: 'clamp(40px, 7vw, 72px)',
                fontWeight: 800,
                lineHeight: 1.05,
                letterSpacing: '-0.02em',
                animationDelay: '120ms',
              }}
            >
              Cada compra que você faz pode transformar sua cidade.
            </h1>

            <p
              className="cv-fade-up mt-6 text-cv-white/75 max-w-2xl mx-auto"
              style={{ fontSize: 'clamp(16px, 2vw, 19px)', lineHeight: 1.55, animationDelay: '240ms' }}
            >
              Escaneie seu comprovante, ganhe Seeds e plante em projetos sociais reais da sua comunidade.
            </p>

            <div className="cv-fade-up mt-8 flex flex-wrap items-center justify-center gap-3" style={{ animationDelay: '360ms' }}>
              <Link
                href="/register"
                className="inline-flex items-center rounded-full bg-cv-lime text-cv-earth px-6 py-3.5 text-base font-bold hover:bg-cv-lime/90 active:scale-95 transition"
              >
                Começar agora →
              </Link>
              <a
                href="#como-funciona"
                className="inline-flex items-center rounded-full border border-cv-white/30 text-cv-white px-6 py-3.5 text-base font-medium hover:bg-cv-white/10 transition"
              >
                Como funciona ↓
              </a>
            </div>

            <div className="cv-fade-up mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2" style={{ animationDelay: '480ms' }}>
              {heroStats.map((s) => (
                <div key={s.label} className="text-cv-white/75 text-sm">
                  <span className="mr-1">{s.emoji}</span>
                  <strong className="text-cv-white">{s.label.replace(s.emoji, '').trim().split(' ')[0]}</strong>{' '}
                  <span>{s.label.replace(s.emoji, '').trim().split(' ').slice(1).join(' ')}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SEÇÃO 2 — COMO FUNCIONA */}
        <section id="como-funciona" style={{ background: '#F5F0E8' }}>
          <div className="max-w-6xl mx-auto px-5 md:px-8 py-24">
            <h2
              className="font-display text-cv-earth text-center"
              style={{ fontSize: 'clamp(30px, 4.5vw, 44px)', fontWeight: 700, letterSpacing: '-0.01em' }}
            >
              Simples assim.
            </h2>
            <p className="mt-2 text-cv-earth/70 text-center max-w-xl mx-auto">
              Três passos e sua compra vira impacto real no bairro.
            </p>

            <div className="mt-12 grid md:grid-cols-3 gap-5">
              {[
                { n: '01', emoji: '🧾', title: 'Escaneie', desc: 'Fotografe qualquer comprovante — NF, recibo ou cupom. Nossa IA lê os dados em segundos.' },
                { n: '02', emoji: '🌱', title: 'Ganhe Seeds', desc: 'Cada compra gera Seeds proporcionais ao valor. Quanto mais você compra consciente, mais Seeds acumula.' },
                { n: '03', emoji: '🌳', title: 'Plante', desc: 'Direcione seus Seeds para projetos sociais reais da sua cidade. Veja o impacto acontecer.' },
              ].map((s, i) => (
                <div
                  key={s.n}
                  className="cv-fade-up rounded-2xl bg-cv-white p-6"
                  style={{
                    border: '1px solid rgba(61, 43, 31, 0.12)',
                    animationDelay: `${i * 140}ms`,
                  }}
                >
                  <div className="font-display text-cv-lime" style={{ fontSize: 40, fontWeight: 800, lineHeight: 1 }}>
                    {s.n}
                  </div>
                  <div style={{ fontSize: 48, lineHeight: 1, marginTop: 12 }}>{s.emoji}</div>
                  <h3 className="mt-4 font-display text-cv-earth" style={{ fontSize: 22, fontWeight: 600 }}>
                    {s.title}
                  </h3>
                  <p className="mt-2 text-cv-earth/75" style={{ fontSize: 15, lineHeight: 1.55 }}>
                    {s.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SEÇÃO 3 — PROJETOS */}
        <section id="projetos" style={{ background: '#3D2B1F' }}>
          <div className="max-w-6xl mx-auto px-5 md:px-8 py-24">
            <h2
              className="font-display text-cv-white text-center"
              style={{ fontSize: 'clamp(30px, 4.5vw, 44px)', fontWeight: 700, letterSpacing: '-0.01em' }}
            >
              Onde seu dinheiro vai.
            </h2>
            <p className="mt-2 text-cv-white/70 text-center">Projetos reais, impacto mensurável.</p>

            <div className="mt-12 grid md:grid-cols-3 gap-5">
              {(projects ?? []).length === 0 && (
                <div className="md:col-span-3 rounded-2xl bg-cv-white/5 border border-cv-white/10 p-10 text-center text-cv-white/60">
                  Em breve novos projetos.
                </div>
              )}
              {(projects ?? []).map((p, i) => {
                const cat = getCategory(p.category as string);
                const cur = Number(p.current_seeds ?? 0) || seedsFromAmount(Number(p.current_amount ?? 0));
                const goal = Number(p.goal_seeds ?? 0) || seedsFromAmount(Number(p.goal_amount ?? 0));
                const pct = Math.min(100, Math.round((cur / Math.max(1, goal)) * 100));
                const impactPerSeed = Number(p.impact_per_seed ?? 0);
                const impactNow = Math.floor(cur * impactPerSeed);
                const impactUnit = (p.impact_unit as string | null) ?? 'beneficiados';
                return (
                  <div
                    key={p.id as string}
                    className="cv-fade-up rounded-2xl overflow-hidden"
                    style={{
                      background: '#FEFCF8',
                      border: '1px solid rgba(255,255,255,0.1)',
                      animationDelay: `${i * 140}ms`,
                    }}
                  >
                    <ProjectCover
                      coverUrl={p.cover_image_url as string | null}
                      category={p.category as string}
                      title={p.title as string}
                      height={160}
                      titleSize={18}
                    />
                    <div className="p-5">
                      <span
                        className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold"
                        style={{ background: cat.bg, color: cat.fg }}
                      >
                        {cat.emoji} {cat.label}
                      </span>
                      {p.neighborhood && (
                        <div className="mt-3 text-cv-earth/55 text-xs">📍 {p.neighborhood as string}</div>
                      )}
                      <div className="mt-4 h-2 rounded-full bg-cv-sand overflow-hidden">
                        <div className="h-full bg-cv-lime" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="mt-1.5 text-xs text-cv-earth/70 inline-flex items-center gap-1">
                        <strong className="text-cv-green">{formatSeeds(cur)}</strong> / {formatSeeds(goal)} <SeedIcon size={11} /> · {pct}%
                      </div>
                      {impactPerSeed > 0 && (
                        <div
                          className="mt-3 rounded-lg px-3 py-2 text-xs"
                          style={{ background: 'rgba(141, 198, 63, 0.18)' }}
                        >
                          ≈ <strong className="text-cv-green">{formatSeeds(impactNow)}</strong>{' '}
                          <span className="text-cv-earth/75">{impactUnit} possíveis</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-12 text-center">
              <p className="text-cv-white/80 text-lg">Quer apoiar esses projetos?</p>
              <Link
                href="/register"
                className="mt-4 inline-flex items-center rounded-full bg-cv-lime text-cv-earth px-6 py-3 text-base font-bold hover:bg-cv-lime/90 active:scale-95 transition"
              >
                Criar minha conta →
              </Link>
            </div>
          </div>
        </section>

        {/* SEÇÃO 4 — LOJISTAS */}
        <section id="lojistas" style={{ background: '#F5F0E8' }}>
          <div className="max-w-6xl mx-auto px-5 md:px-8 py-24">
            <div className="text-center">
              <span
                className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold"
                style={{ background: 'rgba(27, 122, 74, 0.12)', color: '#1B7A4A' }}
              >
                🏪 Para estabelecimentos
              </span>
              <h2
                className="mt-5 font-display text-cv-earth max-w-3xl mx-auto"
                style={{ fontSize: 'clamp(30px, 4.5vw, 44px)', fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1.1 }}
              >
                Transforme sua loja num agente de impacto.
              </h2>
            </div>

            <div className="mt-12 grid md:grid-cols-3 gap-5">
              {BENEFITS.map((b, i) => (
                <div
                  key={b.title}
                  className="cv-fade-up rounded-2xl bg-cv-white p-6"
                  style={{ border: '1px solid rgba(61, 43, 31, 0.12)', animationDelay: `${i * 120}ms` }}
                >
                  <div style={{ fontSize: 36, lineHeight: 1 }}>{b.emoji}</div>
                  <h3 className="mt-4 font-display text-cv-earth" style={{ fontSize: 18, fontWeight: 700 }}>
                    {b.title}
                  </h3>
                  <p className="mt-2 text-cv-earth/75 text-sm" style={{ lineHeight: 1.55 }}>
                    {b.desc}
                  </p>
                </div>
              ))}
            </div>

            <div
              className="mt-10 rounded-2xl p-7 md:p-9 flex flex-col md:flex-row items-center justify-between gap-5"
              style={{ background: '#3D2B1F', color: '#FEFCF8' }}
            >
              <div>
                <div className="font-display" style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.2 }}>
                  A partir de 3% sobre vendas rastreadas.
                </div>
                <div className="mt-1 text-cv-white/75 text-sm">
                  Você só paga pelo que converte.
                </div>
              </div>
              <PartnerLeadForm />
            </div>
          </div>
        </section>

        {/* SEÇÃO 5 — SEEDS */}
        <section style={{ background: '#8DC63F' }}>
          <div className="max-w-6xl mx-auto px-5 md:px-8 py-24">
            <div className="text-center">
              <h2
                className="font-display text-cv-earth inline-flex items-center gap-3"
                style={{ fontSize: 'clamp(30px, 4.5vw, 44px)', fontWeight: 700, letterSpacing: '-0.01em' }}
              >
                Conheça os Seeds <SeedIcon size={40} />
              </h2>
              <p className="mt-2 text-cv-earth/80 text-lg">
                A moeda do bem que nunca perde valor.
              </p>
            </div>

            <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-4">
              {LEVELS.map((lvl, i) => (
                <div
                  key={lvl.name}
                  className="cv-fade-up rounded-2xl p-5 text-center"
                  style={{ background: '#FEFCF8', animationDelay: `${i * 100}ms` }}
                >
                  <div style={{ fontSize: 40, lineHeight: 1 }}>{lvl.emoji}</div>
                  <div className="mt-2 font-display text-cv-earth" style={{ fontSize: 18, fontWeight: 700 }}>
                    {lvl.name}
                  </div>
                  <div className="mt-1 text-cv-earth/65 text-xs">{lvl.range}</div>
                </div>
              ))}
            </div>

            <div
              className="mt-10 rounded-2xl p-6 md:p-8 text-center max-w-3xl mx-auto"
              style={{ background: 'rgba(61, 43, 31, 0.08)' }}
            >
              <p className="text-cv-earth" style={{ fontSize: 17, lineHeight: 1.6 }}>
                <strong className="inline-flex items-center gap-1.5">R$ 1,00 em compras = 1 Seed <SeedIcon size={16} /></strong>
                <br />
                <span className="text-cv-earth/80">50 Seeds = você pode plantar seu primeiro projeto.</span>
              </p>
            </div>
          </div>
        </section>

        {/* SEÇÃO 6 — DEPOIMENTOS */}
        <section style={{ background: '#F5F0E8' }}>
          <div className="max-w-6xl mx-auto px-5 md:px-8 py-24">
            <h2
              className="font-display text-cv-earth text-center"
              style={{ fontSize: 'clamp(30px, 4.5vw, 44px)', fontWeight: 700, letterSpacing: '-0.01em' }}
            >
              Quem já está transformando
            </h2>

            <div className="mt-12 grid md:grid-cols-3 gap-5">
              {TESTIMONIALS.map((t, i) => {
                const c = colorForName(t.name);
                return (
                  <blockquote
                    key={t.name}
                    className="cv-fade-up rounded-2xl bg-cv-white p-6"
                    style={{ border: '1px solid rgba(61, 43, 31, 0.08)', animationDelay: `${i * 120}ms` }}
                  >
                    <div className="font-display text-cv-lime" style={{ fontSize: 40, lineHeight: 1 }}>“</div>
                    <p className="mt-1 text-cv-earth" style={{ fontSize: 15.5, lineHeight: 1.55 }}>
                      {t.quote}
                    </p>
                    <footer className="mt-5 flex items-center gap-3">
                      <span
                        className="grid place-items-center rounded-full shrink-0"
                        style={{ width: 40, height: 40, background: c.bg, color: c.fg, fontWeight: 700 }}
                      >
                        {initials(t.name)}
                      </span>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-cv-earth truncate">{t.name}</div>
                        <div className="text-xs text-cv-earth/60 truncate">{t.meta}</div>
                      </div>
                    </footer>
                  </blockquote>
                );
              })}
            </div>
          </div>
        </section>

        {/* SEÇÃO 7 — CTA FINAL */}
        <section style={{ background: '#1B7A4A' }}>
          <div className="max-w-3xl mx-auto px-5 md:px-8 py-24 text-center text-cv-white">
            <div className="cv-pulse-soft inline-block"><SeedIcon size={80} /></div>
            <h2
              className="mt-6 font-display"
              style={{ fontSize: 'clamp(34px, 6vw, 56px)', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.05 }}
            >
              Comece agora. Sua cidade precisa de você.
            </h2>
            <div className="mt-8 flex flex-col items-center gap-3">
              <Link
                href="/register"
                className="inline-flex items-center rounded-full bg-cv-lime text-cv-earth px-8 py-4 text-lg font-bold hover:bg-cv-lime/90 active:scale-95 transition"
              >
                Criar conta grátis →
              </Link>
              <Link href="/login" className="text-cv-white/80 text-sm hover:text-cv-white">
                Já tem conta? Entrar →
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer style={{ background: '#2D1F16', color: '#FEFCF8' }}>
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-12">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <Link href="/" className="inline-flex items-center gap-2">
              <span
                className="grid place-items-center rounded-full font-display"
                style={{ width: 36, height: 36, background: '#8DC63F', color: '#3D2B1F', fontSize: 14, fontWeight: 700 }}
              >
                CV
              </span>
              <span className="font-display" style={{ fontSize: 18, fontWeight: 700 }}>Cidade Viva</span>
            </Link>
            <nav className="flex flex-wrap items-center gap-5 text-sm text-cv-white/75">
              <a href="#como-funciona" className="hover:text-cv-white">Sobre</a>
              <a href="#projetos" className="hover:text-cv-white">Projetos</a>
              <a href="#lojistas" className="hover:text-cv-white">Para Lojistas</a>
              <Link href="/login" className="hover:text-cv-white">Entrar</Link>
            </nav>
          </div>
          <CidadeSocialFooter variant="light" style={{ marginTop: 20, padding: '16px 0 0' }} />
          <div className="mt-6 pt-6 border-t border-cv-white/10 flex flex-col md:flex-row md:items-center md:justify-between gap-2 text-xs text-cv-white/55">
            <div>Operado por Cidade Social · São José dos Campos</div>
            <div>© 2026 Cidade Viva. Transformando consumo em impacto.</div>
          </div>
        </div>
      </footer>
    </>
  );
}
