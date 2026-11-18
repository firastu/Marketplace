'use client';

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import { CircleAlert, CircleCheck, Info } from 'lucide-react';
import { Dialog } from './Dialog';
import { Button } from './Button';

type ToastTone = 'info' | 'success' | 'error';
interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
}

interface ConfirmOptions {
  title: string;
  message?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface FeedbackContextValue {
  toast: (message: string, tone?: ToastTone) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

const TOAST_ICONS = { info: Info, success: CircleCheck, error: CircleAlert };

/** App-wide toasts and confirmation dialogs (replaces alert / confirm). */
export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [pending, setPending] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((ok: boolean) => void) | null>(null);
  const nextId = useRef(1);

  const toast = useCallback((message: string, tone: ToastTone = 'info') => {
    const id = nextId.current++;
    setToasts((prev) => [...prev.slice(-2), { id, message, tone }]);
    window.setTimeout(
      () => setToasts((prev) => prev.filter((t) => t.id !== id)),
      tone === 'error' ? 6000 : 3500,
    );
  }, []);

  const confirm = useCallback((options: ConfirmOptions) => {
    resolver.current?.(false);
    setPending(options);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const settle = useCallback((ok: boolean) => {
    resolver.current?.(ok);
    resolver.current = null;
    setPending(null);
  }, []);

  const value = useMemo(() => ({ toast, confirm }), [toast, confirm]);

  return (
    <FeedbackContext.Provider value={value}>
      {children}

      <Dialog
        open={!!pending}
        onClose={() => settle(false)}
        title={pending?.title ?? ''}
        footer={
          <>
            <Button onClick={() => settle(false)}>{pending?.cancelLabel ?? 'Cancel'}</Button>
            <Button variant={pending?.danger ? 'danger' : 'primary'} onClick={() => settle(true)}>
              {pending?.confirmLabel ?? 'Confirm'}
            </Button>
          </>
        }
      >
        {pending?.message}
      </Dialog>

      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => {
          const Icon = TOAST_ICONS[t.tone];
          return (
            <div key={t.id} className={`toast toast--${t.tone}`}>
              <Icon aria-hidden="true" />
              <span>{t.message}</span>
            </div>
          );
        })}
      </div>
    </FeedbackContext.Provider>
  );
}

function useFeedback(): FeedbackContextValue {
  const ctx = useContext(FeedbackContext);
  if (!ctx) throw new Error('useToast / useConfirm must be used within FeedbackProvider');
  return ctx;
}

export function useToast() {
  return useFeedback().toast;
}

export function useConfirm() {
  return useFeedback().confirm;
}

/** Message of an unknown thrown value, for toasts and inline errors. */
export function errorText(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}
