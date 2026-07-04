// confirm.js
// Styled confirmation dialog — a polished replacement for window.confirm.
// Any action can request one via store.requestConfirm({ ...opts, onConfirm }).

import { useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, HelpCircle } from 'lucide-react';
import { useStore } from './store';

export function ConfirmHost() {
  const confirm = useStore((s) => s.confirmState);
  const closeConfirm = useStore((s) => s.closeConfirm);

  const cancel = useCallback(() => closeConfirm(), [closeConfirm]);
  const accept = useCallback(() => {
    confirm?.onConfirm?.();
    closeConfirm();
  }, [confirm, closeConfirm]);

  // Enter confirms, Escape cancels while the dialog is open.
  useEffect(() => {
    if (!confirm) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); cancel(); }
      else if (e.key === 'Enter') { e.preventDefault(); accept(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [confirm, cancel, accept]);

  const tone = confirm?.tone || 'primary';

  return (
    <AnimatePresence>
      {confirm && (
        <motion.div
          className="result-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={cancel}
        >
          <motion.div
            className="confirm-panel"
            role="alertdialog"
            aria-modal="true"
            initial={{ opacity: 0, scale: 0.92, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
          >
            <span className={`confirm-panel__icon confirm-panel__icon--${tone}`}>
              {tone === 'danger' ? <AlertTriangle size={22} /> : <HelpCircle size={22} />}
            </span>
            <h2 className="confirm-panel__title">{confirm.title}</h2>
            {confirm.message && <p className="confirm-panel__message">{confirm.message}</p>}

            <div className="confirm-panel__actions">
              <button type="button" className="confirm-btn confirm-btn--ghost" onClick={cancel}>
                {confirm.cancelLabel || 'Cancel'}
              </button>
              <button
                type="button"
                className={`confirm-btn confirm-btn--${tone}`}
                onClick={accept}
                autoFocus
              >
                {confirm.confirmLabel || 'Confirm'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
