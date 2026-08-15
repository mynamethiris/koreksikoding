import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ReactNode } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
}

export function Modal({ open, onClose, title, children, className = '' }: ModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            className="absolute inset-0 bg-black/80"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
          />
          <motion.div
            className={`relative w-full max-w-md rounded-xl border border-border bg-card ${className}`}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
          >
            {title && (
              <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                <h3 className="text-base font-semibold text-card-foreground">{title}</h3>
                <button
                  onClick={onClose}
                  className="p-1 rounded-md hover:bg-muted transition-colors text-muted-foreground"
                >
                  <X size={16} />
                </button>
              </div>
            )}
            <div className="p-6">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel,
  confirmDanger = false,
  confirmAccent = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string;
  confirmLabel?: string;
  confirmDanger?: boolean;
  confirmAccent?: boolean;
}) {
  const { t } = useTranslation();
  const resolvedConfirmLabel = confirmLabel || t('modal.confirmDelete');
  const getButtonStyle = () => {
    if (confirmDanger) return 'bg-destructive hover:bg-destructive/90 text-white';
    if (confirmAccent) return 'bg-accent hover:bg-accent/90 text-accent-foreground';
    return 'bg-primary hover:bg-primary/90 text-primary-foreground';
  };

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="text-sm text-muted-foreground mb-5">{message}</p>
      <div className="flex items-center gap-2 justify-end">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors"
        >
          {t('modal.cancel')}
        </button>
        <button
          onClick={async () => { await onConfirm(); onClose(); }}
          className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${getButtonStyle()}`}
        >
          {resolvedConfirmLabel}
        </button>
      </div>
    </Modal>
  );
}
