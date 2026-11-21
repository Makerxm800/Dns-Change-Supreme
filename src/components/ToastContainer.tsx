import React from 'react';
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warn' | 'info';
  title: string;
  message?: string;
}

interface Props {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<Props> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[80] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((t) => {
        const colors =
          t.type === 'success'
            ? 'border-emerald-500/40 bg-emerald-950/90 text-emerald-100'
            : t.type === 'error'
              ? 'border-rose-500/40 bg-rose-950/90 text-rose-100'
              : t.type === 'warn'
                ? 'border-amber-500/40 bg-amber-950/90 text-amber-100'
                : 'border-sky-500/40 bg-slate-900/95 text-slate-100';

        const Icon =
          t.type === 'success'
            ? CheckCircle2
            : t.type === 'error'
              ? XCircle
              : t.type === 'warn'
                ? AlertTriangle
                : Info;

        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 shadow-2xl backdrop-blur-md transition-all ${colors}`}
          >
            <Icon className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold">{t.title}</div>
              {t.message && <div className="text-xs opacity-85 mt-0.5 break-words">{t.message}</div>}
            </div>
            <button
              onClick={() => onDismiss(t.id)}
              className="opacity-70 hover:opacity-100 p-0.5 rounded"
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
