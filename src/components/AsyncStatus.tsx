import { Loader2, RefreshCw, AlertCircle, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { useHasExceeded } from '@/lib/useSlowTimer';

export function AsyncLoading({
  label,
  onRefresh,
  threshold = 10000,
}: {
  label: string;
  onRefresh?: () => void;
  threshold?: number;
}) {
  const { t } = useTranslation();
  const showRefresh = useHasExceeded(true, threshold);

  return (
    <motion.div
      key="loading"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center gap-4 py-12 text-center"
    >
      <Loader2 size={28} className="animate-spin text-accent" />
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <AnimatePresence>
          {showRefresh && onRefresh && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-2 pt-2"
            >
              <p className="text-[10px] text-muted-foreground">{t('analysis.sendRefresh')}</p>
              <motion.button
                onClick={onRefresh}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border hover:bg-muted text-muted-foreground transition-colors"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                <RefreshCw size={11} />
                {t('analysis.refresh')}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export function AsyncError({
  error,
  onRetry,
  onRefresh,
  onSwitchProvider,
}: {
  error: string;
  onRetry?: () => void;
  onRefresh?: () => void;
  onSwitchProvider?: () => void;
}) {
  const { t } = useTranslation();
  const action = onRetry ?? onRefresh;
  const label = onRetry ? t('analysis.retry') : onRefresh ? t('analysis.refresh') : '';
  return (
    <motion.div
      key="error"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center gap-4 py-12 text-center px-4"
    >
      <div className="w-14 h-14 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center">
        <AlertCircle size={24} className="text-destructive" />
      </div>
      <p className="text-xs text-muted-foreground max-w-sm break-words leading-relaxed">{error}</p>
      <div className="flex items-center gap-2">
      {action && (
        <motion.button
          onClick={action}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
        >
          {label}
        </motion.button>
      )}
      {onSwitchProvider && (
        <motion.button
          onClick={onSwitchProvider}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-lg border border-border hover:bg-muted text-muted-foreground transition-colors"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
        >
          <Settings size={12} />
          {t('analysis.openSettings')}
        </motion.button>
      )}
      </div>
    </motion.div>
  );
}
