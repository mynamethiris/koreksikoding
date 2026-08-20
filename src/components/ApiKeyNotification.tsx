import { motion, AnimatePresence } from 'motion/react';
import { Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState, useCallback } from 'react';

let showNotificationFn: (() => void) | null = null;

export function showApiKeyNotification() {
  showNotificationFn?.();
}

export function ApiKeyNotification() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);

  const show = useCallback(() => setVisible(true), []);

  useEffect(() => {
    showNotificationFn = show;
    return () => { showNotificationFn = null; };
  }, [show]);

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => setVisible(false), 5000);
    return () => clearTimeout(timer);
  }, [visible]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -16, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -16, scale: 0.96 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="fixed top-3 left-1/2 -translate-x-1/2 z-[9999] max-w-sm w-[calc(100%-2rem)] flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-card text-xs text-foreground shadow-lg"
        >
          <Settings size={14} className="text-accent shrink-0 mt-0.5" />
          <span className="flex-1 leading-snug">{t('analysis.noApiKeyToast')}</span>
          <button
            onClick={() => {
              setVisible(false);
              navigate('/settings?highlight=provider');
            }}
            className="shrink-0 flex items-center gap-1 text-[11px] font-medium text-accent px-2 py-1 rounded-md border border-accent/30 hover:bg-accent/10 transition-colors"
          >
            {t('analysis.goToSettings')}
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
