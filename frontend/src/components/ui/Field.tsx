import {
  forwardRef,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';
import { ChevronDown } from 'lucide-react';

interface FieldProps {
  label: string;
  htmlFor: string;
  hint?: ReactNode;
  error?: string;
  /** Hide the label visually (it stays for screen readers). */
  hideLabel?: boolean;
  className?: string;
  children: ReactNode;
}

/** Label + control + hint/error, wired up for assistive technology. */
export function Field({ label, htmlFor, hint, error, hideLabel, className, children }: FieldProps) {
  return (
    <div className={['field', className].filter(Boolean).join(' ')}>
      <label htmlFor={htmlFor} className={hideLabel ? 'visually-hidden' : 'field__label'}>
        {label}
      </label>
      {children}
      {hint && !error && (
        <span id={`${htmlFor}-hint`} className="field__hint">
          {hint}
        </span>
      )}
      {error && (
        <span id={`${htmlFor}-error`} className="field__error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...rest }, ref) {
    return <input ref={ref} className={['input', className].filter(Boolean).join(' ')} {...rest} />;
  },
);

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...rest }, ref) {
  return (
    <textarea ref={ref} className={['textarea', className].filter(Boolean).join(' ')} {...rest} />
  );
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...rest }, ref) {
    return (
      <span className={['select', className].filter(Boolean).join(' ')}>
        <select ref={ref} {...rest}>
          {children}
        </select>
        <ChevronDown className="select__chevron" aria-hidden="true" />
      </span>
    );
  },
);
