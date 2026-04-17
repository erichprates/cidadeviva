import { getCategory } from '@/lib/categories';

interface Props {
  coverUrl?: string | null;
  category?: string | null;
  title?: string;
  height: number;
  titleSize?: number;
  children?: React.ReactNode; // badges/overlays adicionais
  className?: string;
  // Quando quiser que o título fique em cima do overlay e não centralizado absoluto
  // (ex: detail page tem gradiente escuro vindo da base). Default: centralizado.
  titlePosition?: 'center' | 'bottom-left';
}

const OVERLAY_COLOR = 'rgba(27, 122, 74, 0.80)'; // --cv-green a 80%

export function ProjectCover({
  coverUrl,
  category,
  title,
  height,
  titleSize = 18,
  children,
  className = '',
  titlePosition = 'center',
}: Props) {
  const cat = getCategory(category);
  const url = coverUrl && coverUrl.trim() ? coverUrl : cat.defaultCover;

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{ height, background: cat.gradient }}
    >
      {/* Foto em preto e branco */}
      {url && (
        <img
          src={url}
          alt=""
          aria-hidden
          loading="lazy"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            filter: 'grayscale(100%) contrast(0.95)',
            display: 'block',
          }}
        />
      )}

      {/* Overlay verde */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background: OVERLAY_COLOR,
        }}
      />

      {/* Título sobreposto */}
      {title && titlePosition === 'center' && (
        <div className="absolute inset-0 grid place-items-center px-4 text-center pointer-events-none">
          <h3
            className="font-display"
            style={{
              color: '#FEFCF8',
              fontSize: titleSize,
              fontWeight: 700,
              lineHeight: 1.15,
              letterSpacing: '-0.01em',
              textShadow: '0 2px 8px rgba(0,0,0,0.25)',
              maxWidth: '90%',
            }}
          >
            {title}
          </h3>
        </div>
      )}
      {title && titlePosition === 'bottom-left' && (
        <div
          className="absolute left-0 right-0 bottom-0 px-4 pb-4 pt-12 pointer-events-none"
          style={{
            background: 'linear-gradient(to top, rgba(0,0,0,0.35), rgba(0,0,0,0))',
          }}
        >
          <h3
            className="font-display"
            style={{
              color: '#FEFCF8',
              fontSize: titleSize,
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: '-0.015em',
              textShadow: '0 2px 8px rgba(0,0,0,0.3)',
            }}
          >
            {title}
          </h3>
        </div>
      )}

      {children}
    </div>
  );
}
