import { useTranslation } from 'react-i18next';
import { useApp } from '@/store/AppContext';
import { EmptyState } from '@/components/EmptyState';
import { Copy, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { motion } from 'motion/react';
import type { Duplication } from '@/types';

const SEVERITY_CONFIG: Record<string, { color: string; bg: string; icon: React.ElementType }> = {
  critical: { color: 'text-destructive', bg: 'bg-destructive/10', icon: AlertCircle },
  high: { color: 'text-warning', bg: 'bg-warning/10', icon: AlertTriangle },
  medium: { color: 'text-info', bg: 'bg-info/10', icon: Info },
  low: { color: 'text-muted-foreground', bg: 'bg-muted', icon: Copy },
};

function DuplicationItem({ item, index }: { item: Duplication; index: number }) {
  const { t, i18n } = useTranslation();
  const config = SEVERITY_CONFIG[item.severity] || SEVERITY_CONFIG.medium;
  const Icon = config.icon;
  const severityLabel = i18n.language === 'en'
    ? item.severity.charAt(0).toUpperCase() + item.severity.slice(1)
    : item.severity === 'critical' ? 'Kritis'
    : item.severity === 'high' ? 'Tinggi'
    : item.severity === 'medium' ? 'Sedang'
    : 'Rendah';

  return (
    <motion.div
      className="rounded-lg border border-border overflow-hidden"
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="px-3 py-2.5 space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md font-medium ${config.bg} ${config.color}`}>
            <Icon size={10} />
            {severityLabel}
          </span>
          <span className="text-[10px] font-mono text-muted-foreground">
            {t('duplication.lines', { start: item.lineStart, end: item.lineEnd })}
          </span>
          {item.category && (
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
              {item.category}
            </span>
          )}
        </div>
        <p className="text-xs text-foreground">{item.message}</p>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <Copy size={10} className="shrink-0" />
          <span>{t('duplication.duplicatedWith', { start: item.duplicatedWith.lineStart, end: item.duplicatedWith.lineEnd })}</span>
        </div>
        {item.fix && (
          <div className="p-2 rounded-lg bg-success/5 border border-success/20">
            <span className="text-[10px] font-semibold text-success uppercase tracking-wider">
              {i18n.language === 'en' ? 'Suggestion' : 'Saran'}
            </span>
            <p className="text-[11px] text-muted-foreground mt-0.5">{item.fix}</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export function DuplicationTab() {
  const { t } = useTranslation();
  const { analysisResult } = useApp();
  const duplications = analysisResult?.duplications || [];

  if (duplications.length === 0) {
    return (
      <EmptyState
        icon={<Copy size={24} className="text-success" />}
        title={t('analysis.noDuplications')}
        description={t('analysis.cleanDuplication')}
      />
    );
  }

  const criticalCount = duplications.filter((d) => d.severity === 'critical').length;
  const highCount = duplications.filter((d) => d.severity === 'high').length;
  const mediumCount = duplications.filter((d) => d.severity === 'medium').length;
  const lowCount = duplications.filter((d) => d.severity === 'low').length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-foreground">
          {t('duplication.found', { count: duplications.length })}
        </p>
        <div className="flex items-center gap-2 text-[10px]">
          {criticalCount > 0 && <span className="text-destructive">{criticalCount} critical</span>}
          {highCount > 0 && <span className="text-warning">{highCount} high</span>}
          {mediumCount > 0 && <span className="text-info">{mediumCount} medium</span>}
          {lowCount > 0 && <span className="text-muted-foreground">{lowCount} low</span>}
        </div>
      </div>
      <div className="space-y-2">
        {duplications.map((dup, i) => (
          <DuplicationItem key={i} item={dup} index={i} />
        ))}
      </div>
    </div>
  );
}
