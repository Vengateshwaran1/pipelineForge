// toast.js
// Non-blocking toast notifications — a modern replacement for window.alert.
// Toasts live in the Zustand store; this renders + auto-dismisses them.

import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, XCircle, Info } from 'lucide-react';
import { useStore } from './store';

const ICONS = { success: CheckCircle2, error: XCircle, info: Info };
const DEFAULT_DURATION = 4500;

function Toast({ toast }) {
  const dismiss = useStore((s) => s.dismissToast);

  useEffect(() => {
    const timer = setTimeout(() => dismiss(toast.id), toast.duration || DEFAULT_DURATION);
    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, dismiss]);

  const Icon = ICONS[toast.type] || Info;

  return (
    <motion.div
      layout
      className={`toast toast--${toast.type}`}
      initial={{ opacity: 0, y: -16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -12, scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
      onClick={() => dismiss(toast.id)}
    >
      <span className="toast__icon"><Icon size={18} strokeWidth={2.2} /></span>
      <div className="toast__body">
        {toast.title && <strong className="toast__title">{toast.title}</strong>}
        {toast.message && <span className="toast__message">{toast.message}</span>}
      </div>
    </motion.div>
  );
}

export function ToastHost() {
  const toasts = useStore((s) => s.toasts);

  return (
    <div className="toast-host">
      <AnimatePresence>
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} />
        ))}
      </AnimatePresence>
    </div>
  );
}
