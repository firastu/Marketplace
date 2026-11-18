'use client';

import { ReactNode, useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  /** "sheet" rises from the bottom edge on phones. */
  variant?: 'dialog' | 'sheet';
  className?: string;
}

/**
 * Modal built on the native <dialog>: the browser provides the focus trap,
 * Escape to close, the inert background and the return of focus.
 */
export function Dialog({
  open,
  onClose,
  title,
  children,
  footer,
  variant = 'dialog',
  className,
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const t = useTranslations('common');

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) {
      el.showModal();
      // The browser focuses the first control (the close button). A form
      // can mark the field people should start in with `data-autofocus`.
      el.querySelector<HTMLElement>('[data-autofocus]')?.focus();
    }
    if (!open && el.open) el.close();
  }, [open]);

  return (
    // The dialog itself only handles a click on its backdrop; every control
    // inside is a real button, so keyboard users are not left out.
    <dialog
      ref={ref}
      className={['dialog', variant === 'sheet' && 'dialog--sheet', className]
        .filter(Boolean)
        .join(' ')}
      aria-labelledby={titleId}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      {open && (
        <>
          <div className="dialog__header">
            <h2 id={titleId} className="dialog__title">
              {title}
            </h2>
            <button type="button" className="btn btn--ghost btn--icon" onClick={onClose}>
              <X aria-hidden="true" />
              <span className="visually-hidden">{t('close')}</span>
            </button>
          </div>
          <div className="dialog__body">{children}</div>
          {footer && <div className="dialog__footer">{footer}</div>}
        </>
      )}
    </dialog>
  );
}
