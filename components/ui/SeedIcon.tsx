import type { CSSProperties } from 'react';

interface Props {
  size?: number;
  className?: string;
  style?: CSSProperties;
}

export function SeedIcon({ size = 16, className = '', style }: Props) {
  return (
    <img
      src="/assets/moeda.png"
      alt=""
      aria-hidden
      className={className}
      style={{
        width: size,
        height: size,
        objectFit: 'contain',
        display: 'inline-block',
        verticalAlign: 'middle',
        ...style,
      }}
    />
  );
}
