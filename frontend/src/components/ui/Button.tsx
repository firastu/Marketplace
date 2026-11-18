import { ButtonHTMLAttributes, forwardRef, ReactNode } from 'react';
import { LoaderCircle } from 'lucide-react';

export type ButtonVariant = 'secondary' | 'primary' | 'accent' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface StyleOptions {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  icon?: boolean;
  className?: string;
}

/** Class list for anything that should look like a button (e.g. a Link). */
export function buttonClass({
  variant = 'secondary',
  size = 'md',
  block,
  icon,
  className,
}: StyleOptions = {}): string {
  return [
    'btn',
    variant !== 'secondary' && `btn--${variant}`,
    size !== 'md' && `btn--${size}`,
    block && 'btn--block',
    icon && 'btn--icon',
    className,
  ]
    .filter(Boolean)
    .join(' ');
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, StyleOptions {
  loading?: boolean;
  children?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size, block, icon, className, loading, disabled, children, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={buttonClass({ variant, size, block, icon, className })}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && <LoaderCircle className="btn__spinner" aria-hidden="true" />}
      {icon && loading ? null : children}
    </button>
  );
});
