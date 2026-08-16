import { useState, useRef, Component, type ReactNode } from 'react';
import { AlertTriangle, AlertCircle, Info, CheckCircle, ChevronDown, Copy, Check, Wrench, Lightbulb, GraduationCap, Download, ExternalLink, Shield, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { useApp } from '@/store/AppContext';
import { EmptyState } from '@/components/EmptyState';
import { VulnerabilityTab } from '@/components/VulnerabilityTab';
import { DuplicationTab } from '@/components/DuplicationTab';
import { downloadFile, getCommunityLinks, getFileExtensionForLanguage } from '@/lib/api';
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
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-muted transition-colors"
      >
        <div className={`p-1 rounded-md ${bg}`}>
          <Icon size={11} className={text} />
        </div>
        <span className="text-[9px] font-mono text-muted-foreground shrink-0">{t('analysis.line')} {item.line}</span>
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

function CodeBlock({ code, language }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);
  const { t } = useTranslation();
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success(t('toast.codeCopied'));
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-muted border-b border-border">
        <span className="text-[10px] font-medium text-muted-foreground uppercase">{language || 'code'}</span>
        <button onClick={handleCopy} className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-md hover:bg-background transition-colors text-muted-foreground">
          {copied ? <Check size={10} className="text-success" /> : <Copy size={10} />}
          {copied ? t('analysis.copied') : t('analysis.copy')}
        </button>
      </div>
      <pre className="p-4 overflow-auto max-h-[300px] text-xs font-mono text-foreground bg-background">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function CopyBtn({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const { t } = useTranslation();
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success(`${label} ${t('analysis.copied').toLowerCase()}!`);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <motion.button onClick={handleCopy} className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
      {copied ? <Check size={12} className="text-success" /> : <Copy size={12} />}
      {copied ? t('analysis.copied') : t('analysis.copy')}
    </motion.button>
  );
}

function PerbaikanTab({ result, activeFile }: { result: NonNullable<ReturnType<typeof useApp>['analysisResult']>; activeFile: { name: string; language: string } | undefined }) {
  const { t } = useTranslation();
  const fixedCode = result.fixedCode?.trim() || '';
  if (!fixedCode) return <EmptyState icon={<Wrench size={24} />} title={t('analysis.noFixedCode')} />;
  return (
    <div className="space-y-4">
        <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground">{t('analysis.fixedCode')}</h4>
        <motion.button onClick={() => { 
          const ext = getFileExtensionForLanguage(activeFile?.language || '');
          downloadFile(fixedCode, activeFile?.name ? `fixed-${activeFile.name}` : `fixed.${ext}`, 'text/plain'); 
          toast.success(t('analysis.fileDownloaded')); 
        }}
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg hover:bg-muted text-muted-foreground transition-colors"
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Download size={12} /> Download
        </motion.button>
      </div>
      <CodeBlock code={fixedCode} language={activeFile?.language} />
      {result.changes.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">{t('analysis.changes')}</h4>
          <ul className="space-y-1.5">
            {result.changes.map((change, i) => (
              <motion.li key={i} className="flex items-start gap-2 text-sm text-foreground"
                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}>
                <div className="p-0.5 rounded bg-success/10 mt-0.5 shrink-0"><Check size={12} className="text-success" /></div>
                {change}
              </motion.li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function PenjelasanTab({ result }: { result: NonNullable<ReturnType<typeof useApp>['analysisResult']> }) {
  const { t } = useTranslation();
  if (result.explanation.length === 0) return <EmptyState icon={<Lightbulb size={24} />} title={t('analysis.noExplanation')} />;
  return (
    <div className="space-y-4">
      {result.explanation.map((exp, i) => (
        <motion.div key={i} className="border border-border rounded-xl p-4 space-y-3"
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: i * 0.08 }}>
          <h4 className="text-sm font-semibold text-accent">{exp.errorType}</h4>
          <div>
            <span className="text-[10px] uppercase font-semibold text-destructive tracking-wider">{t('analysis.cause')}</span>
            <p className="text-sm text-foreground mt-0.5">{exp.cause}</p>
          </div>
          <div>
            <span className="text-[10px] uppercase font-semibold text-success tracking-wider">{t('analysis.fixLabel')}</span>
            <p className="text-sm text-foreground mt-0.5">{exp.fix}</p>
          </div>
          <div className="space-y-3">
            <div>
              <span className="text-[10px] uppercase font-semibold text-destructive tracking-wider">{t('analysis.wrongExample')}</span>
              <pre className="mt-1 p-3 rounded-lg bg-destructive/10 text-xs font-mono text-foreground overflow-auto">{exp.wrongCode}</pre>
            </div>
            <div>
              <span className="text-[10px] uppercase font-semibold text-success tracking-wider">{t('analysis.correctExample')}</span>
              <pre className="mt-1 p-3 rounded-lg bg-success/10 text-xs font-mono text-foreground overflow-auto">{exp.correctCode}</pre>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-info/10 border border-info/20">
            <span className="text-[10px] uppercase font-semibold text-info tracking-wider">{t('analysis.tip')}</span>
            <p className="text-xs text-muted-foreground mt-0.5">{exp.tip}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function BelajarTab({ result }: { result: NonNullable<ReturnType<typeof useApp>['analysisResult']> }) {
  const { t } = useTranslation();
  if (result.concepts.length === 0) return <EmptyState icon={<GraduationCap size={24} />} title={t('analysis.noConcepts')} />;
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 items-start">
        {result.concepts.map((concept, i) => (
          <motion.div key={i} className="relative border border-border rounded-xl overflow-hidden"
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.08 }}>
            <div className="flex items-center gap-3 px-4 py-3 bg-accent/5 border-b border-border">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-accent text-accent-foreground text-[10px] font-bold shrink-0">{i + 1}</span>
              <h4 className="text-sm font-semibold text-foreground">{concept.title}</h4>
            </div>
            <div className="px-4 py-3 space-y-2">
              <p className="text-xs text-muted-foreground leading-relaxed">{concept.summary}</p>
              <details className="group">
                <summary className="text-xs font-medium text-accent cursor-pointer hover:underline">{t('analysis.learnMore')}</summary>
                <div className="mt-2 p-3 rounded-lg bg-muted text-xs text-muted-foreground leading-relaxed">{concept.content}</div>
              </details>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export function AnalysisPanel() {
  const { t } = useTranslation();
  const { analysisResult, isAnalyzing, analysisError, activeResultTab, setActiveResultTab, files, activeFileId, activeProvider, runAnalysis } = useApp();
  const showRefresh = useHasExceeded(isAnalyzing);
  const result = analysisResult;
  const activeFile = files.find((f) => f.id === activeFileId);

  const tabs = [
    { id: 'hasil', label: t('analysis.tabs.result'), Icon: CheckCircle },
    { id: 'perbaikan', label: t('analysis.tabs.fix'), Icon: Wrench },
    { id: 'penjelasan', label: t('analysis.tabs.explanation'), Icon: Lightbulb },
    { id: 'keamanan', label: t('analysis.tabs.security'), Icon: Shield },
    { id: 'duplikasi', label: t('analysis.tabs.duplication'), Icon: Copy },
  ];

  const handleExportMarkdown = () => {
    if (!result) return;
    const lines: string[] = [];
    lines.push(`# ${t('analysis.markdownExportTitle')}`);
    lines.push('');
    lines.push('## Summary');
    lines.push('');
    lines.push('| Metric | Value |');
    lines.push('|--------|-------|');
    lines.push(`| ${t('analysis.stat.score')} | ${result.score}/100 |`);
    lines.push(`| ${t('analysis.stat.error')} | ${result.errors.length} |`);
    lines.push(`| ${t('analysis.stat.warning')} | ${result.warnings.length} |`);
    lines.push(`| ${t('analysis.stat.suggestion')} | ${result.suggestions.length} |`);
    lines.push('');

    if (result.errors.length > 0) {
      lines.push(`## ${t('analysis.errors')} (${result.errors.length})`);
      lines.push('');
      for (const e of result.errors) {
        lines.push(`- **${t('analysis.line')} ${e.line}**: ${e.message}`);
        lines.push(`  - ${e.explanation}`);
        if (e.category) lines.push(`  - Category: \`${e.category}\``);
        lines.push('');
      }
    }
    if (result.warnings.length > 0) {
      lines.push(`## ${t('analysis.warnings')} (${result.warnings.length})`);
      lines.push('');
      for (const w of result.warnings) {
        lines.push(`- **${t('analysis.line')} ${w.line}**: ${w.message}`);
        lines.push(`  - ${w.explanation}`);
        if (w.category) lines.push(`  - Category: \`${w.category}\``);
        lines.push('');
      }
    }
    if (result.suggestions.length > 0) {
      lines.push(`## ${t('analysis.suggestions')} (${result.suggestions.length})`);
      lines.push('');
      for (const s of result.suggestions) {
        lines.push(`- **${t('analysis.line')} ${s.line}**: ${s.message}`);
        lines.push(`  - ${s.explanation}`);
        if (s.category) lines.push(`  - Category: \`${s.category}\``);
        lines.push('');
      }
    }
    if (result.fixedCode) {
      const ext = getFileExtensionForLanguage(activeFile?.language || '');
      lines.push(`## ${t('analysis.fixedCode')}`);
      lines.push('');
      lines.push(`\`\`\`${ext || ''}`);
      lines.push(result.fixedCode);
      lines.push('```');
      lines.push('');
    }
    if (result.changes.length > 0) {
      lines.push('## Changes Made');
      lines.push('');
      for (const c of result.changes) {
        lines.push(`- ${c}`);
      }
      lines.push('');
    }
    const md = lines.join('\n');
    downloadFile(md, 'hasil-analisis.md', 'text/markdown');
    toast.success(t('analysis.markdownExport'));
  };

  if (analysisError) {
    return <AsyncError error={analysisError} onRetry={runAnalysis} />;
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
                className={`relative flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors whitespace-nowrap ${
                  activeResultTab === tab.id ? 'text-accent' : 'text-muted-foreground hover:text-foreground'
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
                    <span className="flex items-center gap-1.5 ml-auto">
                      <span className="font-mono text-[10px] opacity-60">{result.tokenUsage.model}</span>
                    </span>
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
              <PerbaikanTab result={result} activeFile={activeFile} />
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
