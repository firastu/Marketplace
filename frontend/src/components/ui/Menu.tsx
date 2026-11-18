'use client';

import { ReactNode, useEffect, useId, useRef, useState } from 'react';

interface MenuProps {
  /** Accessible name of the trigger button. */
  label: string;
  trigger: ReactNode;
  triggerClassName?: string;
  /** Receives a function that closes the menu, for use in item handlers. */
  children: (close: () => void) => ReactNode;
}

/** Small popover menu: closes on outside click, Escape and item activation. */
export function Menu({ label, trigger, triggerClassName, children }: MenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="menu" ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        className={triggerClassName ?? 'btn btn--ghost btn--icon'}
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={label}
        onClick={() => setOpen((v) => !v)}
      >
        {trigger}
      </button>
      {open && (
        <div id={listId} className="menu__list">
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}
