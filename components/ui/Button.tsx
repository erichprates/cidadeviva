import { forwardRef } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'gold';

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const styles: Record<Variant, string> = {
  primary: 'bg-cv-green text-cv-white hover:bg-cv-green/90',
  secondary: 'bg-cv-white text-cv-earth border border-cv-earth/15 hover:bg-cv-sand',
  ghost: 'text-cv-earth hover:bg-cv-white',
  gold: 'bg-cv-gold text-cv-earth hover:bg-cv-gold/90',
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = 'primary', className = '', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      {...rest}
      className={`inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed ${styles[variant]} ${className}`}
    />
  );
});
