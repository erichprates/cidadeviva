import type { CSSProperties } from 'react';

interface Props {
  variant?: 'default' | 'light'; // 'light' pra backgrounds escuros
  className?: string;
  style?: CSSProperties;
}

export function CidadeSocialFooter({ variant = 'default', className = '', style }: Props) {
  const isLight = variant === 'light';
  return (
    <div
      className={className}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        padding: '20px 12px 24px',
        color: isLight ? 'rgba(254,252,248,0.55)' : 'rgba(61, 43, 31, 0.55)',
        fontSize: 12,
        fontWeight: 500,
        letterSpacing: '0.02em',
        ...style,
      }}
    >
      <span>Um projeto</span>
      <img
        src="/cidade_social.png"
        alt="Cidade Social"
        loading="lazy"
        style={{
          height: 22,
          width: 'auto',
          display: 'block',
          opacity: isLight ? 0.85 : 0.75,
          filter: isLight ? 'brightness(0) invert(1)' : 'none',
        }}
      />
    </div>
  );
}
