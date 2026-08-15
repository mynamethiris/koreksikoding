import { useState, useCallback } from 'react';
import { Terminal, Loader2, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { useApp } from '@/store/AppContext';
import { analyzeCode, parseAnalysisResponse, getTerminalErrorPrompt, canAnalyze, recordAnalysis, sanitizeFixedCode } from '@/lib/api';
import { db } from '@/lib/db';
import toast from 'react-hot-toast';
import type { HistoryEntry } from '@/types';

export function TerminalErrorInput() {
  const { t } = useTranslation();
  const { activeProvider, setAnalysisResult, setIsAnalyzing, isAnalyzing } = useApp();
  const [errorText, setErrorText] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleAnalyze = useCallback(async () => {
    const trimmed = errorText.trim();
    if (!trimmed) return;

    if (!activeProvider.apiKey) {
      toast.error(t('analysis.noApiKey'));
      return;
    }

    if (!canAnalyze()) {
      toast.error(t('analysis.rateLimit'));
      return;
    }

    setIsAnalyzing(true);
    setAnalysisResult(null);

    try {
      const prompt = getTerminalErrorPrompt();
      const { text: rawResponse, tokenUsage } = await analyzeCode(
        trimmed,
        'javascript',
        activeProvider,
        prompt,
      );

      const parsed = parseAnalysisResponse(rawResponse) as Record<string, unknown>;

      const result = {
        errors: (parsed.errors as any[]) || [],
        warnings: (parsed.warnings as any[]) || [],
        suggestions: (parsed.suggestions as any[]) || [],
        score: Math.max(0, Math.min(100, (parsed.score as number) || 0)),
        fixedCode: sanitizeFixedCode((parsed.fixedCode as string) || '') || '',
        changes: (parsed.changes as string[]) || [],
        explanation: (parsed.explanation as any[]) || [],
        concepts: (parsed.concepts as any[]) || [],
        exercise: (parsed.exercise as any) || null,
        tokenUsage,
        refactoringScore: parsed.refactoringScore as any || undefined,
        vulnerabilities: (parsed.vulnerabilities as any[]) || undefined,
        duplications: (parsed.duplications as any[]) || undefined,
      };

      setAnalysisResult(result);
      recordAnalysis();

      const entry: HistoryEntry = {
        id: crypto.randomUUID(),
        code: trimmed,
        language: 'javascript',
        timestamp: Date.now(),
        score: result.score,
        errorCount: result.errors.length,
        warningCount: result.warnings.length,
        suggestionCount: result.suggestions.length,
        result,
      };
      await db.addHistory(entry);

      toast.success(t('analysis.analysisDone'));
    } catch (err) {
      console.error('Terminal analysis failed:', err);
      toast.error(t('analysis.analysisFailed', { error: err instanceof Error ? err.message : 'Unknown error' }));
    } finally {
      setIsAnalyzing(false);
    }
  }, [errorText, activeProvider, setIsAnalyzing, setAnalysisResult, t]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleAnalyze();
    }
  };

  return (
    <div className="border-t border-border bg-card">
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
      >
        <span className="flex items-center gap-1.5">
          <Terminal size={12} />
          {t('terminal.title')}
        </span>
        {isCollapsed ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
      </button>
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-2">
              <textarea
                value={errorText}
                onChange={(e) => setErrorText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t('terminal.placeholder')}
                rows={3}
                className="w-full px-3 py-2 text-xs font-mono bg-muted border border-border rounded-lg resize-none focus:outline-none focus:ring-1 focus:ring-accent text-foreground placeholder:text-muted-foreground"
              />
              <div className="flex items-center gap-2">
                <motion.button
                  onClick={handleAnalyze}
                  disabled={isAnalyzing || !errorText.trim()}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 size={11} className="animate-spin" />
                      {t('terminal.analyzing')}
                    </>
                  ) : (
                    t('terminal.analyzeBtn')
                  )}
                </motion.button>
                {errorText && (
                  <motion.button
                    onClick={() => setErrorText('')}
                    className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <Trash2 size={12} />
                  </motion.button>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground">{t('terminal.hint')}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
