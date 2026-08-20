import { useState, useCallback } from 'react';
import { Terminal, Loader2, Trash2, AlertCircle, Info, Lightbulb, Copy, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { useApp } from '@/store/AppContext';
import { analyzeCode, getTerminalErrorPrompt, canAnalyze, recordAnalysis, sanitizeFixedCode, getCommunityLinks, parseAnalysisResponse, ApiError, getRateLimitRemaining } from '@/lib/api';
import { db } from '@/lib/db';
import { showApiKeyNotification } from '@/components/ApiKeyNotification';
import { AsyncError, AsyncLoading } from '@/components/AsyncStatus';
import { FadeIn } from '@/components/motion';
import toast from 'react-hot-toast';
import type { HistoryEntry, AnalysisResult } from '@/types';

export function TerminalPage() {
  const { t, i18n } = useTranslation();
  const { activeProvider } = useApp();
  const [errorText, setErrorText] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = useCallback(async () => {
    const trimmed = errorText.trim();
    if (!trimmed) return;

    if (!activeProvider.apiKey) {
      showApiKeyNotification();
      return;
    }

    if (!canAnalyze()) {
      toast.error(t('analysis.rateLimit', { remaining: getRateLimitRemaining() }));
      return;
    }

    setIsAnalyzing(true);
    setResult(null);
    setError(null);

    try {
      const prompt = getTerminalErrorPrompt();
      const { text: rawResponse, tokenUsage } = await analyzeCode(
        trimmed,
        'javascript',
        activeProvider,
        prompt,
      );

      const parsed = parseAnalysisResponse(rawResponse) as Record<string, unknown>;

      const analysisResult: AnalysisResult = {
        errors: (parsed.errors as any[]) || [],
        warnings: (parsed.warnings as any[]) || [],
        suggestions: (parsed.suggestions as any[]) || [],
        score: Math.max(0, Math.min(100, (parsed.score as number) || 0)),
        fixedCode: sanitizeFixedCode((parsed.fixedCode as string) || '') || '',
        changes: (parsed.changes as string[]) || [],
        explanation: (parsed.explanation as any[]) || [],
        concepts: (parsed.concepts as any[]) || [],
        exercise: null,
        tokenUsage,
        vulnerabilities: (parsed.vulnerabilities as any[]) || undefined,
        duplications: (parsed.duplications as any[]) || undefined,
      };

      setResult(analysisResult);
      recordAnalysis();

      try {
        const entry: HistoryEntry = {
          id: crypto.randomUUID(),
          code: trimmed,
          language: 'javascript',
          timestamp: Date.now(),
          score: analysisResult.score,
          errorCount: analysisResult.errors.length,
          warningCount: analysisResult.warnings.length,
          suggestionCount: analysisResult.suggestions.length,
          result: analysisResult,
        };
        await db.addHistory(entry);
      } catch (dbErr) {
        console.error('Failed to save terminal analysis history:', dbErr);
      }

      toast.success(t('analysis.analysisDone'));
    } catch (err) {
      let msg: string;
      if (err instanceof ApiError) {
        msg = err.message;
      } else if (err instanceof Error) {
        msg = err.message;
      } else {
        msg = t('analysis.errorUnknown', { error: String(err) });
      }
      setError(msg);
      toast.error(t('analysis.analysisFailed', { error: msg }));
    } finally {
      setIsAnalyzing(false);
    }
  }, [errorText, activeProvider, t]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleAnalyze();
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      const ta = e.currentTarget;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const val = ta.value;
      const newVal = val.substring(0, start) + '  ' + val.substring(end);
      setErrorText(newVal);
      requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = start + 2; });
    }
  };

  const handleCopy = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(t('analysis.copied'));
  }, [t]);

  return (
    <div className="flex flex-col h-[calc(100dvh-52px)]">
      <FadeIn>
        <div className="px-3 sm:px-6 pt-3 sm:pt-4 pb-2 sm:pb-3 border-b border-border bg-card shrink-0">
          <div className="flex items-center gap-2 max-w-6xl mx-auto mb-2">
            <div className="p-1.5 rounded-lg bg-accent/10">
              <Terminal size={18} className="text-accent" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-foreground tracking-tight">{t('terminal.title')}</h1>
              <p className="text-[10px] text-muted-foreground hidden sm:block">{t('terminal.hint')}</p>
            </div>
          </div>
        </div>
      </FadeIn>

      <div className="flex-1 min-h-0 flex flex-col sm:flex-row">
        <div className="sm:w-1/2 flex flex-col border-b sm:border-b-0 sm:border-r border-border min-w-0">
          <div className="flex items-center justify-between px-3 py-1.5 bg-muted border-b border-border shrink-0">
            <div className="flex items-center gap-1.5">
              <Terminal size={11} className="text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">
                {i18n.language === 'en' ? 'Error Input' : 'Input Error'}
              </span>
            </div>
          </div>
          <div className="flex-1 min-h-0 p-3 sm:p-4 flex flex-col gap-3 overflow-y-auto">
            <textarea
              value={errorText}
              onChange={(e) => setErrorText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('terminal.placeholder')}
              className="flex-1 min-h-[120px] w-full px-3 py-2.5 text-xs font-mono bg-muted border border-border rounded-lg resize-none focus:outline-none focus:ring-1 focus:ring-accent text-foreground placeholder:text-muted-foreground leading-relaxed"
            />
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing || !errorText.trim()}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-primary text-primary-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 size={12} className="animate-spin" />
                    {t('terminal.analyzing')}
                  </>
                ) : (
                  <>{t('terminal.analyzeBtn')}</>
                )}
              </button>
              {errorText && (
                <button
                  onClick={() => { setErrorText(''); setResult(null); setError(null); }}
                  className="flex items-center gap-1 px-3 py-2 text-xs rounded-lg hover:bg-muted text-muted-foreground transition-colors"
                >
                  <Trash2 size={12} />
                  {t('terminal.clear')}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="sm:w-1/2 flex flex-col min-w-0">
          <div className="flex items-center px-3 py-1.5 bg-muted border-b border-border shrink-0">
            <span className="text-xs font-medium text-muted-foreground">
              {i18n.language === 'en' ? 'Analysis Result' : 'Hasil Analisis'}
            </span>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4">
            <AnimatePresence mode="wait">
            {isAnalyzing && (
              <AsyncLoading label={t('terminal.analyzing')} onRefresh={handleAnalyze} />
            )}

            {error && (
              <AsyncError error={error} onRetry={handleAnalyze} />
            )}

            {!isAnalyzing && result && (
                <motion.div
                  key="result"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-3"
                >
                  {result.fixedCode && (
                    <div className="rounded-xl border border-border bg-card overflow-hidden">
                      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                        <span className="text-xs font-semibold text-foreground">{t('analysis.fixedCode')}</span>
                        <button
                          onClick={() => handleCopy(result.fixedCode)}
                          className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-md hover:bg-muted text-muted-foreground transition-colors"
                        >
                          <Copy size={10} />
                          {t('analysis.copy')}
                        </button>
                      </div>
                      <pre className="p-3 overflow-auto max-h-[200px] text-xs font-mono text-foreground bg-background leading-relaxed">
                        <code>{result.fixedCode}</code>
                      </pre>
                    </div>
                  )}

                  {result.errors.length > 0 && (
                    <div className="rounded-xl border border-border bg-card p-3 space-y-2">
                      <h3 className="text-xs font-semibold text-destructive flex items-center gap-1.5">
                        <AlertCircle size={12} />
                        {t('analysis.errors')} ({result.errors.length})
                      </h3>
                      {result.errors.map((err, i) => (
                        <div key={i} className="p-2 rounded-lg bg-destructive/5 border border-destructive/20 space-y-1">
                          <p className="text-xs text-foreground font-medium">{err.message}</p>
                          <p className="text-[11px] text-muted-foreground">{err.explanation}</p>
                          {err.category && (
                            <span className="inline-block text-[10px] px-2 py-0.5 rounded-md bg-destructive/10 text-destructive font-medium">
                              {err.category}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {result.suggestions.length > 0 && (
                    <div className="rounded-xl border border-border bg-card p-3 space-y-2">
                      <h3 className="text-xs font-semibold text-info flex items-center gap-1.5">
                        <Info size={12} />
                        {t('analysis.suggestions')} ({result.suggestions.length})
                      </h3>
                      {result.suggestions.map((sug, i) => (
                        <div key={i} className="p-2 rounded-lg bg-info/5 border border-info/20 space-y-1">
                          <p className="text-xs text-foreground">{sug.message}</p>
                          <p className="text-[11px] text-muted-foreground">{sug.explanation}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {result.explanation.length > 0 && (
                    <div className="rounded-xl border border-border bg-card p-3 space-y-2">
                      <h3 className="text-xs font-semibold text-accent flex items-center gap-1.5">
                        <Lightbulb size={12} />
                        {t('analysis.tabs.explanation')}
                      </h3>
                      {result.explanation.map((exp, i) => (
                        <div key={i} className="p-2 rounded-lg bg-muted space-y-1.5">
                          {exp.errorType && <p className="text-xs font-semibold text-foreground">{exp.errorType}</p>}
                          {exp.cause && <p className="text-[11px] text-muted-foreground"><span className="font-medium text-foreground">{t('analysis.cause')}:</span> {exp.cause}</p>}
                          {exp.fix && <p className="text-[11px] text-muted-foreground"><span className="font-medium text-success">{t('analysis.fixLabel')}:</span> {exp.fix}</p>}
                          {exp.tip && <p className="text-[11px] text-info italic">{exp.tip}</p>}
                        </div>
                      ))}
                    </div>
                  )}

                  {result.concepts.length > 0 && (
                    <div className="rounded-xl border border-border bg-card p-3 space-y-2">
                      <h3 className="text-xs font-semibold text-foreground">{t('analysis.tabs.learn')}</h3>
                      {result.concepts.map((concept, i) => (
                        <div key={i} className="p-2 rounded-lg bg-muted space-y-1">
                          <p className="text-xs font-medium text-foreground">{concept.title}</p>
                          <p className="text-[11px] text-muted-foreground">{concept.summary}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {result.fixedCode && (
                    <div className="flex flex-wrap gap-2">
                      {getCommunityLinks(result.fixedCode, 'terminal').map((link) => (
                        <a
                          key={link.url}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] px-2.5 py-1.5 rounded-lg bg-muted hover:bg-accent/10 text-muted-foreground hover:text-accent transition-colors"
                        >
                          <ExternalLink size={10} />
                          {link.title}
                        </a>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {!isAnalyzing && !result && !error && (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center gap-3 py-12 text-center"
                >
                  <div className="w-16 h-16 rounded-2xl bg-muted border border-border flex items-center justify-center text-muted-foreground opacity-80">
                    <Terminal size={28} />
                  </div>
                  <p className="text-sm text-muted-foreground">{t('terminal.noError')}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
