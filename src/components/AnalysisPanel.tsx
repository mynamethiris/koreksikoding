import { useState, Component, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, AlertCircle, Info, CheckCircle, ChevronDown, Copy, Check, Wrench, Lightbulb, Download, ExternalLink, Shield, RefreshCw, XCircle, Loader2, BookOpen, PenLine } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import type { AnalysisResult, AnalysisError, IssueHint } from '@/types';
import { useApp } from '@/store/AppContext';
import { EmptyState } from '@/components/EmptyState';
import { VulnerabilityTab } from '@/components/VulnerabilityTab';
import { DuplicationTab } from '@/components/DuplicationTab';
import { downloadFile, getCommunityLinks } from '@/lib/api';
import { AsyncError } from '@/components/AsyncStatus';
import { useHasExceeded } from '@/lib/useSlowTimer';
import toast from 'react-hot-toast';

const STAT_COLORS: Record<string, { border: string; bg: string; text: string }> = {
  destructive: { border: 'border-destructive', bg: 'bg-destructive/10', text: 'text-destructive' },
  warning: { border: 'border-warning', bg: 'bg-warning/10', text: 'text-warning' },
  info: { border: 'border-info', bg: 'bg-info/10', text: 'text-info' },
  success: { border: 'border-success', bg: 'bg-success/10', text: 'text-success' },
};

class TabErrorBoundary extends Component<{ children: ReactNode; fallback?: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) return this.props.fallback || <EmptyState icon={<AlertTriangle size={24} />} title="Gagal memuat tab" />;
    return this.props.children;
  }
}

function StatCard({ label, count, colorKey, icon: Icon, delay = 0 }: { label: string; count: number; colorKey: string; icon: React.ElementType; delay?: number }) {
  const c = STAT_COLORS[colorKey];
  return (
    <motion.div
      className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${c.border} ${c.text}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className={`p-1.5 rounded-md ${c.bg}`}>
        <Icon size={14} />
      </div>
      <div>
        <div className="text-base font-bold tabular-nums leading-tight">{count}</div>
        <div className="text-[9px] uppercase tracking-wider opacity-60 font-medium hidden sm:block">{label}</div>
      </div>
    </motion.div>
  );
}

function ErrorItem({ item, type, index }: { item: { line: number; message: string; explanation: string; category?: string }; type: 'error' | 'warning' | 'suggestion'; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const { t } = useTranslation();
  const colorMap = {
    error: { text: 'text-destructive', bg: 'bg-destructive/10', Icon: AlertCircle },
    warning: { text: 'text-warning', bg: 'bg-warning/10', Icon: AlertTriangle },
    suggestion: { text: 'text-info', bg: 'bg-info/10', Icon: Info },
  };
  const { text, bg, Icon } = colorMap[type];

  const communityLinks = getCommunityLinks(item.message, 'code');

  return (
    <motion.div
      className={`rounded-lg border border-border overflow-hidden ${expanded ? bg : ''}`}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.03, ease: [0.16, 1, 0.3, 1] }}
    >
      <button
        onClick={() => {
          setExpanded(!expanded);
          if (item.line > 0) {
            window.dispatchEvent(new CustomEvent('korek:scrollToLine', { detail: { line: item.line } }));
          }
        }}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-muted transition-colors"
      >
        <div className={`p-1 rounded-md ${bg}`}>
          <Icon size={11} className={text} />
        </div>
        {item.line > 0 && (
          <span className="text-[9px] font-mono text-muted-foreground shrink-0">
            {t('analysis.line')} {item.line}
          </span>
        )}
        <span className="text-xs flex-1 text-foreground truncate">{item.message}</span>
        <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }} className="text-muted-foreground">
          <ChevronDown size={14} />
        </motion.div>
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}>
            <div className="px-3 pb-2 pt-1 border-t border-border">
              <p className="text-[11px] text-muted-foreground leading-relaxed">{item.explanation}</p>
              {item.category && (
                <span className={`inline-block mt-2 text-[10px] px-2 py-0.5 rounded-md font-medium ${bg} ${text}`}>{item.category}</span>
              )}
              <div className="flex items-center gap-2 mt-2">
                {communityLinks.map((link) => (
                  <a
                    key={link.url}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-md bg-muted hover:bg-accent/10 text-muted-foreground hover:text-accent transition-colors"
                  >
                    <ExternalLink size={10} />
                    {link.title}
                  </a>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function HintLevel({ hint }: { hint: IssueHint }) {
  const { t } = useTranslation();
  return (
    <li className="flex items-start gap-2">
      <span className="mt-2 w-1 h-1 rounded-full bg-accent/70 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-sm text-foreground leading-relaxed">{hint.text}</p>
        {(hint.wrongExample || hint.rightExample) && (
          <div className="grid grid-cols-1 gap-2 mt-2">
            {hint.wrongExample && (
              <pre className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-[10px] font-mono text-foreground overflow-auto whitespace-pre">
                <span className="block text-[9px] font-sans uppercase tracking-wider text-destructive mb-1">{t('analysis.wrongExample')}</span>
                {hint.wrongExample}
              </pre>
            )}
            {hint.rightExample && (
              <pre className="p-2.5 rounded-lg bg-success/10 border border-success/20 text-[10px] font-mono text-foreground overflow-auto whitespace-pre">
                <span className="block text-[9px] font-sans uppercase tracking-wider text-success mb-1">{t('analysis.correctExample')}</span>
                {hint.rightExample}
              </pre>
            )}
          </div>
        )}
      </div>
    </li>
  );
}

function HintCard({ issue, onUnlock }: { issue: AnalysisError; onUnlock: () => void }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [unlocked, setUnlocked] = useState(0);
  const hints = issue.hints || [];
  const totalHints = hints.length;
  const canOpenNext = unlocked < totalHints;

  if (hints.length === 0) return null;

  const unlockNext = () => {
    setUnlocked((prev) => prev + 1);
    onUnlock();
  };

  return (
    <motion.div
      className="rounded-lg border border-border overflow-hidden"
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-muted transition-colors">
        {issue.line > 0 && (
          <span className="text-[9px] font-mono text-muted-foreground shrink-0">{t('analysis.line')} {issue.line}</span>
        )}
        <span className="text-xs flex-1 text-foreground truncate">{issue.message}</span>
        {unlocked < totalHints && (
          <span className="text-[9px] text-muted-foreground shrink-0">{unlocked}/{totalHints}</span>
        )}
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }} className="text-muted-foreground">
          <ChevronDown size={14} />
        </motion.div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}>
            <div className="px-3 pb-3 pt-2 border-t border-border space-y-3">
              <ul className="space-y-2.5">
                {hints.slice(0, unlocked).map((hint, i) => <HintLevel key={i} hint={hint} />)}
              </ul>
              {canOpenNext ? (
                <motion.button
                  onClick={unlockNext}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  className="w-full inline-flex items-center justify-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
                >
                  <Lightbulb size={11} />
                  {t('analysis.review.openHint')}
                </motion.button>
              ) : (
                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-accent/5 text-accent border border-accent/20">
                  <PenLine size={13} className="shrink-0 mt-0.5 text-accent" />
                  <p className="text-[11px] text-foreground">{t('analysis.review.yourTurn')}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function ReviewTab({ result }: { result: AnalysisResult }) {
  const { t } = useTranslation();
  const { runVerify, isVerifying, verifyResult, verifyError, bumpReviewMetrics } = useApp();
  const issues = [...result.errors, ...result.warnings, ...result.suggestions];

  const statusChip = (status: string) => {
    if (status === 'fixed') return <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md bg-success/10 text-success"><Check size={10} /> {t('analysis.review.statusFixed')}</span>;
    if (status === 'new') return <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md bg-warning/10 text-warning"><AlertCircle size={10} /> {t('analysis.review.statusNew')}</span>;
    return <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md bg-destructive/10 text-destructive"><XCircle size={10} /> {t('analysis.review.statusNotFixed')}</span>;
  };

  if (issues.length === 0) {
    return <EmptyState icon={<CheckCircle size={24} className="text-success" />} title={t('analysis.cleanCode')} description={t('analysis.review.noIssues')} />;
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-border p-4 space-y-1">
        <h4 className="text-sm font-semibold text-foreground">{t('analysis.review.title')}</h4>
        <p className="text-xs text-muted-foreground leading-relaxed">{t('analysis.review.desc')}</p>
      </div>

      <div className="space-y-1.5">
        {issues.map((issue) => (
          <HintCard key={issue.id} issue={issue} onUnlock={() => bumpReviewMetrics(1)} />
        ))}
      </div>

      <div className="rounded-xl border border-border p-4 space-y-3">
        <div className="flex items-start gap-2">
          <PenLine size={15} className="text-accent shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-foreground">{t('analysis.review.verifyTitle')}</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">{t('analysis.review.verifyDesc')}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <motion.button
            onClick={runVerify}
            disabled={isVerifying}
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-accent/10 text-accent hover:bg-accent/20 disabled:opacity-60 transition-colors"
          >
            {isVerifying ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle size={13} />}
            {isVerifying ? t('analysis.review.verifying') : t('analysis.review.verifyBtn')}
          </motion.button>
          {result.metrics && result.metrics.attempts > 0 && (
            <span className="text-[10px] text-muted-foreground">
              {t('analysis.review.attempts', { count: result.metrics.attempts })} - {t('analysis.review.hintsOpened', { count: result.metrics.hintsOpened })}
            </span>
          )}
        </div>

        {verifyError && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30">
            <XCircle size={14} className="text-destructive shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs text-destructive">{verifyError}</p>
              <button onClick={runVerify} className="flex items-center gap-1 text-[10px] mt-1 text-muted-foreground hover:text-foreground transition-colors">
                <RefreshCw size={9} /> {t('analysis.retry')}
              </button>
            </div>
          </div>
        )}

        {verifyResult && (
          <motion.div
            key="verdict"
            className={`rounded-lg border p-3 space-y-3 ${verifyResult.verdict === 'pass' ? 'bg-success/10 border-success/30' : verifyResult.verdict === 'partial' ? 'bg-warning/10 border-warning/30' : 'bg-destructive/10 border-destructive/30'}`}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
          >
            <div className="flex items-center gap-2">
              <CheckCircle size={15} className={verifyResult.verdict === 'pass' ? 'text-success' : 'hidden'} />
              <AlertCircle size={15} className={verifyResult.verdict === 'partial' ? 'text-warning' : 'hidden'} />
              <XCircle size={15} className={verifyResult.verdict === 'fail' ? 'text-destructive' : 'hidden'} />
              <h5 className="text-sm font-semibold text-foreground">
                {verifyResult.verdict === 'pass' ? t('analysis.review.verdictPass') : verifyResult.verdict === 'partial' ? t('analysis.review.verdictPartial') : t('analysis.review.verdictFail')}
              </h5>
            </div>
            {verifyResult.perIssue.map((v, i) => (
              <div key={i} className="flex items-start gap-2">
                {statusChip(v.status)}
                <div className="min-w-0 flex-1">
                  {v.line > 0 && <span className="text-[10px] font-mono text-muted-foreground">{t('analysis.line')} {v.line}</span>}
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{v.feedback || v.issue}</p>
                </div>
              </div>
            ))}
            {verifyResult.newIssues.length > 0 && (
              <div>
                <span className="text-[10px] uppercase font-semibold tracking-wider text-warning">{t('analysis.review.newIssues')}</span>
                <ul className="mt-1 space-y-1">
                  {verifyResult.newIssues.map((n, i) => (
                    <li key={i} className="text-[11px] text-foreground">{n.line > 0 && <span className="font-mono text-[10px] text-muted-foreground">{t('analysis.line')} {n.line}. </span>}{n.message}</li>
                  ))}
                </ul>
              </div>
            )}
            <div>
              <span className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">{t('analysis.review.feedback')}</span>
              <p className="text-xs text-foreground leading-relaxed mt-0.5">{verifyResult.feedback}</p>
            </div>
            {verifyResult.recap && verifyResult.recap.length > 0 && (
              <div>
                <span className="inline-flex items-center gap-1 text-[10px] uppercase font-semibold tracking-wider text-info"><BookOpen size={10} /> {t('analysis.review.recap')}</span>
                <ul className="mt-1 space-y-1.5">
                  {verifyResult.recap.map((r, i) => (
                    <li key={i} className="text-[11px] text-foreground"><strong className="text-accent">{r.title}</strong> - {r.summary}</li>
                  ))}
                </ul>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}

function PenjelasanTab({ result }: { result: AnalysisResult }) {
  const { t } = useTranslation();
  const issues = [...result.errors, ...result.warnings, ...result.suggestions];
  const hasConcepts = result.concepts.length > 0;
  if (issues.length === 0 && !hasConcepts) return <EmptyState icon={<Lightbulb size={24} />} title={t('analysis.noExplanation')} />;
  return (
    <div className="space-y-4">
      {issues.map((issue, i) => (
        <motion.div key={issue.id || i} className="border border-border rounded-xl p-4 space-y-2"
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: i * 0.08 }}>
          <div className="flex items-center gap-2 flex-wrap">
            {issue.line > 0 && (
              <span className="text-[10px] font-mono text-muted-foreground">{t('analysis.line')} {issue.line}</span>
            )}
            {issue.category && (
              <span className={`inline-block text-[10px] px-2 py-0.5 rounded-md font-medium ${STAT_COLORS.info.bg} ${STAT_COLORS.info.text}`}>{issue.category}</span>
            )}
          </div>
          <p className="text-sm font-medium text-foreground">{issue.message}</p>
          <p className="text-xs text-muted-foreground leading-relaxed">{issue.explanation}</p>
        </motion.div>
      ))}
      {hasConcepts && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{t('analysis.concepts')}</h4>
          <div className="space-y-2">
            {result.concepts.map((concept, i) => (
              <motion.div key={i} className="border border-border rounded-xl p-4 space-y-2"
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.08 }}>
                <h5 className="text-sm font-semibold text-accent">{concept.title}</h5>
                <p className="text-xs text-foreground">{concept.summary}</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{concept.content}</p>
              </motion.div>
            ))}
          </div>
        </div>
      )}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-info/10 border border-info/20">
        <Lightbulb size={13} className="text-info shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground">{t('analysis.review.practiceNote')}</p>
      </div>
    </div>
  );
}


export function AnalysisPanel() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { analysisResult, isAnalyzing, analysisError, analysisErrorType, activeResultTab, setActiveResultTab, activeProvider, runAnalysis, verifyResult } = useApp();
  const showRefresh = useHasExceeded(isAnalyzing);
  const result = analysisResult;

  const tabs = [
    { id: 'hasil', label: t('analysis.tabs.result'), Icon: CheckCircle },
    { id: 'perbaikan', label: t('analysis.tabs.fix'), Icon: Wrench },
    { id: 'penjelasan', label: t('analysis.tabs.explanation'), Icon: Lightbulb },
    { id: 'keamanan', label: t('analysis.tabs.security'), Icon: Shield },
    { id: 'duplikasi', label: t('analysis.tabs.duplication'), Icon: Copy },
  ];

  const handleExportMarkdown = () => {
    if (!result) return;
    const issues = [...result.errors, ...result.warnings, ...result.suggestions] as AnalysisError[];
    const SEVERITY_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    const L: string[] = [];
    const categoryLabel = t('analysis.exportCategory');

    const exportIssue = (item: AnalysisError) => {
      L.push(`- **${t('analysis.line')} ${item.line}**: ${item.message}`);
      L.push(`  - ${item.explanation}`);
      if (item.category) L.push(`  - ${categoryLabel}: \`${item.category}\``);
      L.push('');
    };
    const exportIssueList = (items: AnalysisError[]) => {
      for (const item of items) exportIssue(item);
    };
    const severityLabel = (sev: string) => t(`vulnerability.${sev}`, sev);
    const severityTally = (list: { severity: string }[]) => {
      const counts: Record<string, number> = {};
      for (const item of list) counts[item.severity] = (counts[item.severity] || 0) + 1;
      return (Object.entries(counts) as [string, number][])
        .sort(([a], [b]) => (SEVERITY_ORDER[a] ?? 4) - (SEVERITY_ORDER[b] ?? 4))
        .filter(([, n]) => n > 0)
        .map(([sev, n]) => `${n} ${severityLabel(sev)}`)
        .join(', ');
    };

    L.push(`# ${t('analysis.markdownExportTitle')}`);
    L.push('');

    // Tab Hasil
    L.push(`## ${t('analysis.tabs.result')}`);
    L.push('');
    L.push(`| ${t('analysis.exportMetric')} | ${t('analysis.exportValue')} |`);
    L.push('|---|---|');
    L.push(`| ${t('analysis.stat.score')} | ${result.score}/100 |`);
    L.push(`| ${t('analysis.stat.error')} | ${result.errors.length} |`);
    L.push(`| ${t('analysis.stat.warning')} | ${result.warnings.length} |`);
    L.push(`| ${t('analysis.stat.suggestion')} | ${result.suggestions.length} |`);
    if (result.tokenUsage) {
      L.push(`| ${t('analysis.stat.tokenIn')} | ${result.tokenUsage.input.toLocaleString()} |`);
      L.push(`| ${t('analysis.stat.tokenOut')} | ${result.tokenUsage.output.toLocaleString()} |`);
      if (result.tokenUsage.model) L.push(`| ${t('analysis.stat.model')} | ${result.tokenUsage.model} |`);
    }
    L.push('');
    if (result.errors.length > 0) {
      L.push(`### ${t('analysis.errors')} (${result.errors.length})`);
      L.push('');
      exportIssueList(result.errors);
    }
    if (result.warnings.length > 0) {
      L.push(`### ${t('analysis.warnings')} (${result.warnings.length})`);
      L.push('');
      exportIssueList(result.warnings);
    }
    if (result.suggestions.length > 0) {
      L.push(`### ${t('analysis.suggestions')} (${result.suggestions.length})`);
      L.push('');
      exportIssueList(result.suggestions);
    }
    if (issues.length === 0) {
      L.push(`> ${t('analysis.cleanCode')} - ${t('analysis.cleanDesc')}`);
      L.push('');
    }

    // Tab Perbaikan
    L.push('---');
    L.push('');
    L.push(`## ${t('analysis.tabs.fix')}`);
    L.push('');
    L.push(t('analysis.review.desc'));
    L.push('');
    const hinted = issues.filter((issue) => (issue.hints || []).length > 0);
    for (const issue of hinted) {
      const lineLabel = issue.line > 0 ? `${t('analysis.line')} ${issue.line} - ` : '';
      L.push(`### ${lineLabel}${issue.message}`);
      L.push('');
      for (const hint of issue.hints || []) {
        L.push(`- ${hint.text}`);
        if (hint.wrongExample) {
          L.push('');
          L.push(`  *${t('analysis.wrongExample')}:*`);
          L.push('');
          L.push('  ```');
          L.push(hint.wrongExample.split('\n').map((ln) => `  ${ln}`).join('\n'));
          L.push('  ```');
        }
        if (hint.rightExample) {
          L.push('');
          L.push(`  *${t('analysis.correctExample')}:*`);
          L.push('');
          L.push('  ```');
          L.push(hint.rightExample.split('\n').map((ln) => `  ${ln}`).join('\n'));
          L.push('  ```');
        }
        L.push('');
      }
      L.push(`> ${t('analysis.review.yourTurn')}`);
      L.push('');
    }
    if (result.metrics && result.metrics.attempts > 0) {
      L.push(`${t('analysis.review.attempts', { count: result.metrics.attempts })} - ${t('analysis.review.hintsOpened', { count: result.metrics.hintsOpened })}`);
      L.push('');
    }
    if (verifyResult) {
      L.push(`### ${t('analysis.review.verifyTitle')}`);
      L.push('');
      L.push(t('analysis.review.verifyDesc'));
      L.push('');
      const verdictLabel = verifyResult.verdict === 'pass' ? t('analysis.review.verdictPass')
        : verifyResult.verdict === 'partial' ? t('analysis.review.verdictPartial')
        : t('analysis.review.verdictFail');
      L.push(`**${verdictLabel}**`);
      L.push('');
      for (const v of verifyResult.perIssue) {
        const statusLabel = v.status === 'fixed' ? t('analysis.review.statusFixed')
          : v.status === 'new' ? t('analysis.review.statusNew')
          : t('analysis.review.statusNotFixed');
        const lineLabel = v.line > 0 ? ` (${t('analysis.line')} ${v.line})` : '';
        L.push(`- **[${statusLabel}]** ${lineLabel} ${v.feedback || v.issue}`);
      }
      L.push('');
      if (verifyResult.newIssues.length > 0) {
        L.push(`**${t('analysis.review.newIssues')}**`);
        L.push('');
        for (const n of verifyResult.newIssues) {
          L.push(`- ${n.line > 0 ? `${t('analysis.line')} ${n.line}. ` : ''}${n.message}`);
        }
        L.push('');
      }
      L.push(`**${t('analysis.review.feedback')}**: ${verifyResult.feedback}`);
      L.push('');
      if ((verifyResult.recap || []).length > 0) {
        L.push(`**${t('analysis.review.recap')}**`);
        L.push('');
        for (const r of verifyResult.recap || []) {
          L.push(`- **${r.title}** - ${r.summary}`);
        }
        L.push('');
      }
    }

    // Tab Penjelasan
    L.push('---');
    L.push('');
    L.push(`## ${t('analysis.tabs.explanation')}`);
    L.push('');
    if (issues.length === 0 && result.concepts.length === 0) {
      L.push(`> ${t('analysis.noExplanation')}`);
      L.push('');
    }
    for (const issue of issues) {
      const lineLabel = issue.line > 0 ? `${t('analysis.line')} ${issue.line}` : '';
      const catLabel = issue.category ? ` (${issue.category})` : '';
      L.push(`**${issue.message}**${catLabel}${lineLabel ? ` - ${lineLabel}` : ''}`);
      L.push('');
      L.push(issue.explanation);
      L.push('');
    }
    if (result.concepts.length > 0) {
      L.push(`### ${t('analysis.concepts')}`);
      L.push('');
      for (const concept of result.concepts) {
        L.push(`**${concept.title}**`);
        L.push('');
        L.push(concept.summary);
        L.push('');
        L.push(concept.content);
        L.push('');
      }
    }
    L.push(`> ${t('analysis.review.practiceNote')}`);
    L.push('');

    // Tab Keamanan
    L.push('---');
    L.push('');
    L.push(`## ${t('analysis.tabs.security')}`);
    L.push('');
    const vulnerabilities = result.vulnerabilities || [];
    if (vulnerabilities.length === 0) {
      L.push(`> ${t('analysis.noVulnerabilities', 'Tidak ada celah keamanan ditemukan')} - ${t('analysis.cleanSecurity', 'Kode Anda aman dari ancaman umum.')}`);
      L.push('');
    } else {
      L.push(`**${vulnerabilities.length} ${t('analysis.exportFindings')}** (${severityTally(vulnerabilities)})`);
      L.push('');
      for (const v of [...vulnerabilities].sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 4) - (SEVERITY_ORDER[b.severity] ?? 4))) {
        const cweLabel = v.cwe ? ` (${v.cwe})` : '';
        L.push(`- **${severityLabel(v.severity)}** - ${t('analysis.line')} ${v.line}${cweLabel}: ${v.message}`);
        L.push(`  - ${v.fix}`);
        if (v.category) L.push(`  - ${categoryLabel}: ${v.category}`);
      }
      L.push('');
    }

    // Tab Duplikasi
    L.push('---');
    L.push('');
    L.push(`## ${t('analysis.tabs.duplication')}`);
    L.push('');
    const duplications = result.duplications || [];
    if (duplications.length === 0) {
      L.push(`> ${t('analysis.noDuplications')} - ${t('analysis.cleanDuplication')}`);
      L.push('');
    } else {
      L.push(`**${t('duplication.found', { count: duplications.length })}** (${severityTally(duplications)})`);
      L.push('');
      for (const d of duplications) {
        L.push(`- **${severityLabel(d.severity)}** ${t('duplication.lines', { start: d.lineStart, end: d.lineEnd })}${d.category ? ` (${d.category})` : ''}: ${d.message}`);
        L.push(`  - ${t('duplication.duplicatedWith', { start: d.duplicatedWith.lineStart, end: d.duplicatedWith.lineEnd })}`);
        if (d.fix) L.push(`  - ${i18n.language === 'en' ? 'Suggestion' : 'Saran'}: ${d.fix}`);
      }
      L.push('');
    }

    const md = L.join('\n');
    downloadFile(md, 'hasil-analisis.md', 'text/markdown');
    toast.success(t('analysis.markdownExport'));
  };

  if (analysisError) {
    return <AsyncError
      error={analysisError}
      onRetry={runAnalysis}
      onSwitchProvider={analysisErrorType === 'modelUnavailable' ? () => navigate('/settings') : undefined}
    />;
  }

  if (isAnalyzing) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-5 p-4">
        <div className="w-48 space-y-3">
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-accent/20"
              animate={{ x: ['-100%', '100%'] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>
          <div className="h-3 bg-muted rounded-full w-32 overflow-hidden">
            <motion.div
              className="h-full bg-accent/20"
              animate={{ x: ['-100%', '100%'] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut', delay: 0.2 }}
            />
          </div>
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-medium text-foreground">{t('analysis.analyzing')}</p>
          <p className="text-xs text-muted-foreground">{t('analysis.sendingTo', { provider: activeProvider.name })}</p>
          {showRefresh && (
            <motion.button
              onClick={runAnalysis}
              className="flex items-center gap-1.5 mt-2 mx-auto px-3 py-1.5 text-xs font-medium rounded-lg border border-border hover:bg-muted text-muted-foreground transition-colors"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <RefreshCw size={11} />
              {t('analysis.refresh')}
            </motion.button>
          )}
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <EmptyState
        icon={<span className="text-xl font-mono font-bold">{'{ }'}</span>}
        title={t('analysis.emptyTitle')}
        description={t('analysis.emptyDesc')}
      />
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex border-b border-border">
        <div className="flex overflow-x-auto scrollbar-none min-w-0">
          {tabs.map((tab) => {
            const Icon = tab.Icon;
            return (
              <button key={tab.id} onClick={() => setActiveResultTab(tab.id)}
                className={`relative flex items-center gap-1.5 px-3 py-2.5 text-xs transition-colors whitespace-nowrap ${
                  activeResultTab === tab.id
                    ? 'text-accent font-semibold bg-accent/10'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
                }`}>
                <Icon size={13} />
                <span className="hidden sm:inline">{tab.label}</span>
                {activeResultTab === tab.id && (
                  <motion.div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent rounded-full"
                    layoutId="result-tab" transition={{ type: 'spring', stiffness: 400, damping: 30 }} />
                )}
              </button>
            );
          })}
        </div>
        <div className="shrink-0 px-2 flex items-center border-l border-border">
          <motion.button
            onClick={handleExportMarkdown}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg hover:bg-muted text-muted-foreground transition-colors"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            title="Export ke Markdown"
          >
            <Download size={12} />
            <span className="hidden sm:inline">MD</span>
          </motion.button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        <AnimatePresence mode="wait">
          {activeResultTab === 'hasil' && (
            <motion.div key="hasil" className="space-y-5"
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}>
              <TabErrorBoundary>
              <div className="grid grid-cols-4 gap-2">
                <StatCard label={t('analysis.stat.error')} count={result.errors.length} colorKey="destructive" icon={AlertCircle} delay={0} />
                <StatCard label={t('analysis.stat.warning')} count={result.warnings.length} colorKey="warning" icon={AlertTriangle} delay={0.05} />
                <StatCard label={t('analysis.stat.suggestion')} count={result.suggestions.length} colorKey="info" icon={Info} delay={0.1} />
                <StatCard label={t('analysis.stat.score')} count={result.score} colorKey="success" icon={CheckCircle} delay={0.15} />
              </div>
              {result.tokenUsage && (
                <div className="flex items-center gap-4 px-4 py-2.5 rounded-xl border border-border bg-muted/50 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <span className="font-medium">{t('analysis.stat.tokenIn')}:</span>
                    <span className="font-mono tabular-nums">{result.tokenUsage.input.toLocaleString()}</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="font-medium">{t('analysis.stat.tokenOut')}:</span>
                    <span className="font-mono tabular-nums">{result.tokenUsage.output.toLocaleString()}</span>
                  </span>
                  {result.tokenUsage.model && (
                    <div className="flex items-center gap-1.5 ml-auto">
                      <span className="font-mono text-[10px] opacity-60">{result.tokenUsage.model}</span>
                    </div>
                  )}
                </div>
              )}
              {result.errors.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-semibold uppercase tracking-wider text-destructive mb-2">{t('analysis.errors')} ({result.errors.length})</h4>
                  <div className="space-y-1">{result.errors.map((e, i) => <ErrorItem key={i} item={e} type="error" index={i} />)}</div>
                </div>
              )}
              {result.warnings.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-semibold uppercase tracking-wider text-warning mb-2">{t('analysis.warnings')} ({result.warnings.length})</h4>
                  <div className="space-y-1">{result.warnings.map((e, i) => <ErrorItem key={i} item={e} type="warning" index={i} />)}</div>
                </div>
              )}
              {result.suggestions.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-semibold uppercase tracking-wider text-info mb-2">{t('analysis.suggestions')} ({result.suggestions.length})</h4>
                  <div className="space-y-1.5">{result.suggestions.map((e, i) => <ErrorItem key={i} item={e} type="suggestion" index={i} />)}</div>
                </div>
              )}
              {result.errors.length === 0 && result.warnings.length === 0 && result.suggestions.length === 0 && (
                <EmptyState icon={<CheckCircle size={28} className="text-success" />} title={t('analysis.cleanCode')} description={t('analysis.cleanDesc')} />
              )}
              </TabErrorBoundary>
            </motion.div>
          )}

          {activeResultTab === 'perbaikan' && (
            <motion.div key="perbaikan" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}>
              <TabErrorBoundary>
              <ReviewTab result={result} />
              </TabErrorBoundary>
            </motion.div>
          )}

          {activeResultTab === 'penjelasan' && (
            <motion.div key="penjelasan" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}>
              <TabErrorBoundary>
              <PenjelasanTab result={result} />
              </TabErrorBoundary>
            </motion.div>
          )}

          {activeResultTab === 'keamanan' && (
            <motion.div key="keamanan" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}>
              <TabErrorBoundary>
              <VulnerabilityTab />
              </TabErrorBoundary>
            </motion.div>
          )}

          {activeResultTab === 'duplikasi' && (
            <motion.div key="duplikasi" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}>
              <TabErrorBoundary>
              <DuplicationTab />
              </TabErrorBoundary>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
