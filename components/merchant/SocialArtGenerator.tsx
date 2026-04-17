'use client';

import { useEffect, useRef, useState } from 'react';

export interface ArtData {
  merchantName: string;
  city: string;
  month: string;            // ex: "Abril 2026"
  familiesImpacted: number; // total beneficiaries
  projectsCount: number;
  totalSeeds: number;
}

type Format = 'feed' | 'stories';

const DISPLAY_FONT = `"Outfit", Georgia, "Times New Roman", serif`;
const BODY_FONT = `"Plus Jakarta Sans", Arial, Helvetica, sans-serif`;

const COLORS = {
  earth: '#3D2B1F',
  lime: '#8DC63F',
  green: '#1B7A4A',
  white: '#FEFCF8',
};

function formatNumber(n: number): string {
  return new Intl.NumberFormat('pt-BR').format(Math.floor(n));
}

// SVG da marca inline (mesmos paths de public/logo.svg) — permite override da cor
// sem depender de fetch externo ou CSS filter (evita bugs com html2canvas).
function LogoMark({ color, height = 40 }: { color: string; height?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="20 218 790 192"
      style={{ height, width: 'auto', display: 'block' }}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden
    >
      <g fill={color}>
        <path d="M197.93,310.67c0-25.81,16.79-41.03,41.36-41.03,20.63,0,35.84,10.6,40.01,29.19h-15.33c-3.04-9.69-11.38-15.33-24.68-15.33-17.7,0-26.49,9.24-26.49,27.16s8.68,26.94,26.49,26.94c13.41,0,21.53-5.3,24.68-14.99h15.33c-5.41,20.96-21.53,28.97-40.01,28.97-24.8,0-41.36-15.33-41.36-40.91Z" />
        <path d="M285.6,271.33h13.75v14.65h-13.75v-14.65ZM285.72,293.54h13.64v56.69h-13.64v-56.69Z" />
        <path d="M304.99,321.6c0-18.71,11.61-30.09,29.64-30.09,6.31,0,12.29,1.69,16.68,6.09v-26.26h13.64v78.9h-13.53v-6.2c-3.61,4.62-8.79,7.33-17.81,7.44-17.92.11-28.63-11.84-28.63-29.87ZM334.63,338.51c10.71,0,16.91-5.52,16.91-14.77v-4.17c0-10.26-5.64-15.33-16.12-15.33s-16.57,5.52-16.57,17.24,6.54,17.02,15.78,17.02Z" />
        <path d="M399.66,291.51c18.26-.11,25.92,7.89,25.92,22.2v36.52h-13.64v-5.64c-3.27,3.49-8,6.65-17.58,6.54-13.98-.23-23.89-6.31-23.89-18.94,0-15.78,15.89-18.15,33.02-18.26l8.34-.11v-.79c0-6.43-2.03-9.02-12.17-9.02-9.47,0-11.95,2.37-12.29,8h-14.09c.56-14.43,9.47-20.29,26.37-20.51ZM395.26,338.73c10.6,0,16.57-3.04,16.57-10.26v-4.06l-7.55.23c-16.46.56-20.06,2.59-20.06,7.89,0,3.83,2.37,6.2,11.05,6.2Z" />
        <path d="M430.99,321.6c0-18.71,11.61-30.09,29.64-30.09,6.31,0,12.29,1.69,16.68,6.09v-26.26h13.64v78.9h-13.53v-6.2c-3.61,4.62-8.79,7.33-17.81,7.44-17.92.11-28.63-11.84-28.63-29.87ZM460.63,338.51c10.71,0,16.91-5.52,16.91-14.77v-4.17c0-10.26-5.64-15.33-16.12-15.33s-16.57,5.52-16.57,17.24,6.54,17.02,15.78,17.02Z" />
        <path d="M527.91,291.51c18.94,0,31.22,11.27,31.11,29.87l-.11,4.85h-47.68c.79,7.55,6.31,12.4,16.34,12.4,8.9,0,13.86-3.04,15.89-8.79h14.65c-3.83,14.65-15.44,21.64-30.54,21.64-19.27,0-31.11-11.38-31.11-29.87s12.51-30.09,31.45-30.09ZM527.57,304.25c-9.13,0-15.22,4.06-15.67,11.5h31.67c-.68-7.33-6.65-11.5-16.01-11.5Z" />
        <path d="M570.39,271.33h16.46l25.7,57.48,25.7-57.48h16.34l-35.95,78.9h-12.06l-36.18-78.9Z" />
        <path d="M658.52,271.33h13.75v14.65h-13.75v-14.65ZM658.63,293.54h13.64v56.69h-13.64v-56.69Z" />
        <path d="M677.91,293.54h16.01l17.47,37.87,17.7-37.87h15.44l-27.73,56.69h-11.27l-27.61-56.69Z" />
        <path d="M771.56,291.51c18.26-.11,25.92,7.89,25.92,22.2v36.52h-13.64v-5.64c-3.27,3.49-8,6.65-17.58,6.54-13.98-.23-23.89-6.31-23.89-18.94,0-15.78,15.89-18.15,33.02-18.26l8.34-.11v-.79c0-6.43-2.03-9.02-12.17-9.02-9.47,0-11.95,2.37-12.29,8h-14.09c.56-14.43,9.47-20.29,26.37-20.51ZM767.17,338.73c10.6,0,16.57-3.04,16.57-10.26v-4.06l-7.55.23c-16.46.56-20.06,2.59-20.06,7.89,0,3.83,2.37,6.2,11.05,6.2Z" />
        <path d="M151.32,283.34c-17.88-17.21-44.49-16.32-61.02.42-16.53,16.74-16.35,43.72.26,60.3,16.63,16.61,43.59,17.06,60.68.01l20.3,20.27c-28.2,28.18-73.56,27.72-101.26.01-27.74-27.74-27.87-73-.23-100.93,27.4-27.7,72.92-28.77,101.48-.3l-20.2,20.21Z" />
        <path d="M121.72,312.52h-29.49s0,.04,0,.06c0,16.5,13.37,29.87,29.87,29.87,8.19,0,15.6-3.3,21-8.63l-21.38-21.3Z" />
        <path d="M115.96,301.54c-3.17-6.01-9.74-9.9-16.93-9.07.15,9.32,6.97,16.29,15.33,17.17,0,0,0,.01,0,.02,12.89,1.43,24.29-8.72,24.14-21.58-10.36-.92-19.09,4.94-22.54,13.46Z" />
      </g>
    </svg>
  );
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

function ArtCanvas({ format, data }: { format: Format; data: ArtData }) {
  const isFeed = format === 'feed';
  const width = 1080;
  const height = isFeed ? 1080 : 1920;
  const padding = isFeed ? 80 : 110;
  const nameSize = isFeed ? 52 : 64;
  const numberSize = isFeed ? 96 : 120;
  const labelSize = isFeed ? 24 : 28;
  const phraseSize = isFeed ? 22 : 26;
  const blockGap = isFeed ? 56 : 88;

  const stats: Array<{ number: string; label: string }> = [
    { number: formatNumber(data.familiesImpacted), label: 'famílias impactadas' },
    { number: formatNumber(data.projectsCount), label: 'projetos sociais apoiados' },
    { number: formatNumber(data.totalSeeds), label: 'Seeds gerados' },
  ];

  return (
    <div
      style={{
        width,
        height,
        background: COLORS.earth,
        color: COLORS.white,
        padding,
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: BODY_FONT,
        // evita aliasing estranho em bordas ao capturar
        WebkitFontSmoothing: 'antialiased',
      }}
    >
      {/* SOCIAL FOOTER NO TOPO */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          marginBottom: isFeed ? 40 : 56,
          color: 'rgba(254,252,248,0.6)',
          fontSize: isFeed ? 18 : 22,
          fontWeight: 500,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
        }}
      >
        <span>Um projeto</span>
        <img
          src="/cidade_social.png"
          alt="Cidade Social"
          crossOrigin="anonymous"
          style={{
            height: isFeed ? 36 : 48,
            width: 'auto',
            display: 'block',
            filter: 'brightness(0) invert(1)',
          }}
        />
      </div>

      {/* TOPO */}
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            fontFamily: DISPLAY_FONT,
            fontWeight: 800,
            fontSize: nameSize,
            lineHeight: 1.05,
            letterSpacing: '-0.02em',
            color: COLORS.white,
          }}
        >
          {data.merchantName}
        </div>
        <div
          style={{
            marginTop: 16,
            fontSize: isFeed ? 22 : 26,
            color: 'rgba(254,252,248,0.6)',
          }}
        >
          {data.city} · {data.month}
        </div>
        <div
          style={{
            width: 120,
            height: 2,
            background: COLORS.lime,
            margin: isFeed ? '48px auto' : '64px auto',
          }}
        />
      </div>

      {/* STATS */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: blockGap,
          flex: isFeed ? 0 : 1,
          justifyContent: isFeed ? 'flex-start' : 'center',
        }}
      >
        {stats.map((s, i) => (
          <div key={i} style={{ textAlign: 'center' }}>
            <div
              style={{
                fontFamily: DISPLAY_FONT,
                fontWeight: 800,
                fontSize: numberSize,
                lineHeight: 1,
                letterSpacing: '-0.03em',
                color: COLORS.lime,
              }}
            >
              {s.number}
            </div>
            <div
              style={{
                marginTop: 12,
                fontSize: labelSize,
                color: 'rgba(254,252,248,0.8)',
                fontWeight: 400,
              }}
            >
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* FRASE */}
      <div
        style={{
          marginTop: isFeed ? 64 : 88,
          textAlign: 'center',
          fontStyle: 'italic',
          fontWeight: 400,
          fontSize: phraseSize,
          lineHeight: 1.5,
          color: 'rgba(254,252,248,0.7)',
        }}
      >
        Cada compra dos nossos clientes
        <br />
        transforma vidas reais.
      </div>

      {/* RODAPÉ */}
      <div
        style={{
          marginTop: 'auto',
          paddingTop: isFeed ? 48 : 72,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <LogoMark color={COLORS.white} height={isFeed ? 56 : 72} />
        <div
          style={{
            fontSize: isFeed ? 16 : 20,
            color: 'rgba(254,252,248,0.55)',
            letterSpacing: '0.02em',
          }}
        >
          cidadeviva.app
        </div>
      </div>
    </div>
  );
}

interface Props {
  data: ArtData;
}

export function SocialArtGenerator({ data }: Props) {
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<Format>('feed');
  const [generating, setGenerating] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const captureRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    const onEsc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onEsc);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  const previewScale = format === 'feed' ? 0.32 : 0.22;
  const previewW = Math.round(1080 * previewScale);
  const previewH = Math.round((format === 'feed' ? 1080 : 1920) * previewScale);

  const download = async () => {
    if (!captureRef.current) return;
    setErr(null);
    setGenerating(true);
    try {
      const html2canvasModule = await import('html2canvas');
      const html2canvas = html2canvasModule.default;
      const canvas = await html2canvas(captureRef.current, {
        backgroundColor: COLORS.earth,
        scale: 1,
        useCORS: true,
        logging: false,
        width: format === 'feed' ? 1080 : 1080,
        height: format === 'feed' ? 1080 : 1920,
      });
      const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('Falha ao gerar imagem.');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const monthSlug = slugify(data.month);
      const nameSlug = slugify(data.merchantName);
      a.href = url;
      a.download = `cidadeviva-${nameSlug}-${monthSlug}-${format}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      console.error('[social-art] error:', e);
      setErr('Não foi possível gerar a imagem. Tente novamente.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center rounded-full bg-cv-lime text-cv-earth px-5 py-2.5 text-sm font-bold hover:bg-cv-lime/90 active:scale-95 transition"
      >
        🎨 Gerar arte para divulgação
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          style={{ background: 'rgba(61, 43, 31, 0.7)' }}
          onClick={() => setOpen(false)}
        >
          <style>{`
            @keyframes cv-sag-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
            @keyframes cv-sag-in { from { transform: translateY(12px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
            .cv-sag { animation: cv-sag-up 300ms cubic-bezier(0.22, 1, 0.36, 1); }
            @media (min-width: 640px) { .cv-sag { animation: cv-sag-in 260ms cubic-bezier(0.22, 1, 0.36, 1); } }
          `}</style>
          <div
            onClick={(e) => e.stopPropagation()}
            className="cv-sag w-full sm:max-w-lg bg-cv-white p-6 sm:p-8"
            style={{
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              borderBottomLeftRadius: 24,
              borderBottomRightRadius: 24,
              maxHeight: '92dvh',
              overflowY: 'auto',
              paddingBottom: 'calc(24px + env(safe-area-inset-bottom))',
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-display text-cv-earth" style={{ fontSize: 22, fontWeight: 700 }}>
                  Arte para redes sociais ✨
                </h3>
                <p className="mt-1 text-sm text-cv-earth/70">Pronta para postar no Instagram e WhatsApp.</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fechar"
                className="text-cv-earth/50 hover:text-cv-earth -mt-2 -mr-2 p-2"
              >
                ✕
              </button>
            </div>

            <div className="mt-5 flex gap-2 rounded-full p-1 bg-cv-earth/5">
              {(
                [
                  ['feed', 'Feed (1:1)'],
                  ['stories', 'Stories (9:16)'],
                ] as const
              ).map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setFormat(k)}
                  className="flex-1 rounded-full px-3 py-2 text-sm font-medium transition"
                  style={{
                    background: format === k ? '#FEFCF8' : 'transparent',
                    color: '#3D2B1F',
                    boxShadow: format === k ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* PREVIEW */}
            <div className="mt-5 flex justify-center">
              <div
                style={{
                  width: previewW,
                  height: previewH,
                  overflow: 'hidden',
                  borderRadius: 12,
                  boxShadow: '0 10px 30px rgba(0,0,0,0.18)',
                }}
              >
                <div
                  style={{
                    transform: `scale(${previewScale})`,
                    transformOrigin: 'top left',
                    width: 1080,
                    height: format === 'feed' ? 1080 : 1920,
                  }}
                >
                  <ArtCanvas format={format} data={data} />
                </div>
              </div>
            </div>

            <div className="mt-3 text-xs text-cv-earth/60 text-center">
              Dados de <strong>{data.month}</strong>: {formatNumber(data.familiesImpacted)} famílias · {formatNumber(data.projectsCount)} projetos · {formatNumber(data.totalSeeds)} 🌱
            </div>

            {err && <div className="mt-3 text-sm text-red-600 text-center">{err}</div>}

            <button
              type="button"
              onClick={download}
              disabled={generating}
              className="mt-6 w-full inline-flex items-center justify-center rounded-full bg-cv-green text-cv-white px-5 py-3.5 text-base font-semibold active:scale-[0.98] disabled:opacity-60 transition"
            >
              {generating ? (
                <span className="inline-flex items-center gap-2">
                  <span
                    className="rounded-full border-2 border-cv-white/40 border-t-cv-white"
                    style={{ width: 16, height: 16, animation: 'spin 800ms linear infinite' }}
                  />
                  Gerando arte...
                </span>
              ) : (
                '⬇️ Baixar imagem PNG'
              )}
            </button>
          </div>
        </div>
      )}

      {/* OFF-SCREEN captura em tamanho real */}
      <div
        aria-hidden
        style={{
          position: 'fixed',
          left: -99999,
          top: 0,
          pointerEvents: 'none',
          opacity: 0,
        }}
      >
        <div ref={captureRef}>
          <ArtCanvas format={format} data={data} />
        </div>
      </div>
    </>
  );
}
