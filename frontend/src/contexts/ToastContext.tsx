import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { Check, Info } from 'lucide-react';

interface Toast {
  id: number;
  message: string;
  icon?: 'check' | 'info';
  action?: { label: string; onClick: () => void };
}

interface ToastValue {
  showToast: (message: string, opts?: Omit<Toast, 'id' | 'message'>) => void;
}

const ToastContext = createContext<ToastValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const showToast = useCallback<ToastValue['showToast']>(
    (message, opts) => {
      const id = nextId.current++;
      setToasts((t) => [...t.slice(-2), { id, message, ...opts }]);
      window.setTimeout(() => dismiss(id), opts?.action ? 5000 : 2800);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="toast">
            {t.icon === 'info' ? <Info size={18} /> : <Check size={18} />}
            <span>{t.message}</span>
            {t.action && (
              <button
                className="toast__action"
                onClick={() => {
                  t.action?.onClick();
                  dismiss(t.id);
                }}
              >
                {t.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

