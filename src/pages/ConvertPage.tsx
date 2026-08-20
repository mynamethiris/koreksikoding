import { useState, useCallback, useEffect, useRef } from 'react';
import { ArrowRightLeft, Loader2, Copy, Check, Trash2, ArrowLeftRight, Code2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { useApp } from '@/store/AppContext';
import { analyzeCode, getLanguageExtension, getConvertPrompt, canAnalyze, getRateLimitRemaining, ApiError, extractJSON } from '@/lib/api';
import { lightTheme, darkTheme } from '@/lib/editor-themes';
import { AsyncError, AsyncLoading } from '@/components/AsyncStatus';
import { showApiKeyNotification } from '@/components/ApiKeyNotification';
import { FadeIn } from '@/components/motion';
import CodeMirror from '@uiw/react-codemirror';
import { editorKeymap } from '@/lib/editor-keymap';
import toast from 'react-hot-toast';
import type { Language } from '@/types';

const TARGET_LANGUAGES: { id: Language; label: string }[] = [
  { id: 'python', label: 'Python' },
  { id: 'javascript', label: 'JavaScript' },
  { id: 'typescript', label: 'TypeScript' },
  { id: 'java', label: 'Java' },
  { id: 'cpp', label: 'C++' },
  { id: 'go', label: 'Go' },
];

interface ConvertResult {
  code: string;
  explanation: string;
  differences: string[];
  warnings: string[];
}

export function ConvertPage() {
  const { t, i18n } = useTranslation();
  const { theme, activeProvider } = useApp();
  const [sourceCode, setSourceCode] = useState('');
  const [targetLang, setTargetLang] = useState<Language>('python');
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ConvertResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [mobileTab, setMobileTab] = useState<'source' | 'result'>('source');
  const prevMobileTabRef = useRef(mobileTab);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    if (!isMobile) return;
    if (!isConverting && result) {
      setMobileTab('result');
    }
  }, [isConverting, result, isMobile]);

  const handleConvert = useCallback(async () => {
    if (!sourceCode.trim()) {
      toast.error(i18n.language === 'en' ? 'No code to convert' : 'Tidak ada kode untuk dikonversi');
      return;
    }

    if (!activeProvider.apiKey) {
      showApiKeyNotification();
      return;
    }

    if (!canAnalyze()) {
      toast.error(t('analysis.rateLimit', { remaining: getRateLimitRemaining() }));
      return;
    }

    setIsConverting(true);
    setResult(null);
    setError(null);

    try {
      const prompt = getConvertPrompt(targetLang);
      const { text } = await analyzeCode(sourceCode, 'auto', activeProvider, prompt);

      const parsed = extractJSON(text) as Record<string, any>;

      setResult({
        code: parsed.convertedCode || '',
        explanation: parsed.explanation || '',
        differences: parsed.differences || [],
        warnings: parsed.warnings || [],
      });

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
      setIsConverting(false);
    }
  }, [sourceCode, targetLang, activeProvider, i18n.language, t]);

  const handleCopy = useCallback(() => {
    if (!result?.code) return;
    navigator.clipboard.writeText(result.code);
    setCopied(true);
    toast.success(t('analysis.copied'));
    setTimeout(() => setCopied(false), 2000);
  }, [result, t]);

  const handleClear = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  const TAB_ORDER = ['source', 'result'] as const;

  if (isMobile) {
    const prevIdx = TAB_ORDER.indexOf(prevMobileTabRef.current);
    const currIdx = TAB_ORDER.indexOf(mobileTab);
    const slideDir = currIdx >= prevIdx ? 1 : -1;

    return (
      <div className="flex flex-col h-[calc(100dvh-52px)]">
        <FadeIn>
          <div className="px-3 pt-3 pb-2 border-b border-border bg-card shrink-0">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-accent/10">
                <ArrowRightLeft size={18} className="text-accent" />
              </div>
              <h1 className="text-sm font-bold text-foreground tracking-tight">{t('convertPage.title')}</h1>
            </div>
            <div className="flex items-center gap-1 flex-wrap">
              {TARGET_LANGUAGES.map((lang) => (
                <button
                  key={lang.id}
                  onClick={() => { setTargetLang(lang.id); setResult(null); }}
                  className={`px-2 py-1 text-[10px] font-medium rounded-md border transition-colors ${
                    targetLang === lang.id
                      ? 'border-accent/30 bg-accent/10 text-accent'
                      : 'border-border hover:bg-muted text-muted-foreground'
                  }`}
                >
                  {lang.label}
                </button>
              ))}
              <button
                onClick={handleConvert}
                disabled={isConverting || !sourceCode.trim()}
                className="ml-auto flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {isConverting ? <Loader2 size={11} className="animate-spin" /> : <ArrowRightLeft size={11} />}
                {t('convert.convertBtn', { lang: TARGET_LANGUAGES.find((l) => l.id === targetLang)?.label })}
              </button>
            </div>
          </div>
        </FadeIn>

        <div className="flex border-b border-border bg-muted shrink-0">
          {(['source', 'result'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => { prevMobileTabRef.current = mobileTab; setMobileTab(tab); }}
              className={`flex-1 py-2.5 text-xs font-medium text-center transition-all relative border-b-2 ${
                mobileTab === tab
                  ? 'text-accent border-accent bg-accent/10'
                  : 'text-muted-foreground border-transparent hover:text-foreground hover:bg-muted/50'
              }`}
            >
              {tab === 'source' ? (i18n.language === 'en' ? 'Source' : 'Sumber') : (i18n.language === 'en' ? 'Result' : 'Hasil')}
              {mobileTab === tab && (
                <motion.div
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent"
                  layoutId="convert-mobile-tab"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
            </button>
          ))}
        </div>

        <div className="flex-1 min-h-0 overflow-hidden">
          <AnimatePresence mode="wait" custom={slideDir}>
            <motion.div
              key={mobileTab}
              custom={slideDir}
              className="h-full"
              initial={{ opacity: 0, x: slideDir * 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: slideDir * -40 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            >
              {mobileTab === 'source' ? (
                <div className="h-full">
                  <CodeMirror
                    value={sourceCode}
                    onChange={(v) => setSourceCode(v)}
                    extensions={[getLanguageExtension('javascript'), editorKeymap]}
                    theme={theme === 'dark' ? darkTheme : lightTheme}
                    basicSetup={{
                      lineNumbers: true,
                      highlightActiveLine: true,
                      highlightActiveLineGutter: true,
                      foldGutter: true,
                      bracketMatching: true,
                      indentOnInput: true,
                      tabSize: 2,
                      closeBrackets: true,
                      autocompletion: true,
                    }}
                    style={{ height: '100%', fontSize: '13px' }}
                  />
                </div>
              ) : (
                <div className="h-full overflow-y-auto p-3 space-y-3">
              {isConverting && (
                <AsyncLoading label={t('convert.converting')} onRefresh={handleConvert} />
              )}
              {error && <AsyncError error={error} onRetry={handleConvert} />}
                  {!isConverting && result?.code && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">
                          {TARGET_LANGUAGES.find((l) => l.id === targetLang)?.label}
                        </span>
                        <button
                          onClick={handleCopy}
                          className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-md hover:bg-muted text-muted-foreground transition-colors"
                        >
                          {copied ? <Check size={10} className="text-success" /> : <Copy size={10} />}
                          {t('analysis.copy')}
                        </button>
                      </div>
                      <div className="rounded-xl border border-border bg-card overflow-hidden">
                        <pre className="p-3 overflow-auto max-h-[50vh] text-xs font-mono text-foreground bg-background leading-relaxed">
                          <code>{result.code}</code>
                        </pre>
                      </div>
                      {(result.explanation || result.differences.length > 0 || result.warnings.length > 0) && (
                        <div className="rounded-xl border border-border bg-card p-3 space-y-2 text-[11px]">
                          {result.explanation && (
                            <p><span className="font-semibold text-accent">{i18n.language === 'en' ? 'Explanation' : 'Penjelasan'}:</span> <span className="text-muted-foreground">{result.explanation}</span></p>
                          )}
                          {result.differences.length > 0 && (
                            <p><span className="font-semibold text-info">{i18n.language === 'en' ? 'Differences' : 'Perbedaan'}:</span> <span className="text-muted-foreground">{result.differences.length}</span></p>
                          )}
                          {result.warnings.length > 0 && (
                            <p><span className="font-semibold text-warning">{i18n.language === 'en' ? 'Warnings' : 'Peringatan'}:</span> <span className="text-muted-foreground">{result.warnings.length}</span></p>
                          )}
                        </div>
                      )}
                    </>
                  )}
                  {!isConverting && !result && !error && (
                    <div className="flex flex-col items-center gap-3 py-12 text-center">
                      <div className="w-14 h-14 rounded-2xl bg-muted border border-border flex items-center justify-center text-muted-foreground opacity-80">
                        <ArrowRightLeft size={24} />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {i18n.language === 'en' ? 'Converted code will appear here' : 'Kode hasil konversi akan muncul di sini'}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-52px)]">
      <FadeIn>
        <div className="px-3 sm:px-6 pt-3 sm:pt-4 pb-2 sm:pb-3 border-b border-border bg-card shrink-0">
          <div className="flex items-center justify-between max-w-6xl mx-auto mb-2 sm:mb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-accent/10">
                <ArrowRightLeft size={18} className="text-accent" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-foreground tracking-tight">{t('convertPage.title')}</h1>
                <p className="text-[10px] text-muted-foreground hidden sm:block">{t('convertPage.subtitle')}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 max-w-6xl mx-auto flex-wrap">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="font-mono text-foreground opacity-60">{i18n.language === 'en' ? 'auto-detect' : 'auto-deteksi'}</span>
              <ArrowLeftRight size={10} className="mx-1" />
              <span className="font-mono text-foreground">{TARGET_LANGUAGES.find((l) => l.id === targetLang)?.label}</span>
            </div>

            <div className="flex items-center gap-1 ml-auto flex-wrap">
              {TARGET_LANGUAGES.map((lang) => (
                <button
                  key={lang.id}
                  onClick={() => { setTargetLang(lang.id); setResult(null); }}
                  className={`px-2 py-1 text-[10px] sm:text-[11px] font-medium rounded-md border transition-colors ${
                    targetLang === lang.id
                      ? 'border-accent/30 bg-accent/10 text-accent'
                      : 'border-border hover:bg-muted text-muted-foreground'
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5 ml-2">
              <button
                onClick={handleConvert}
                disabled={isConverting || !sourceCode.trim()}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {isConverting ? (
                  <>
                    <Loader2 size={12} className="animate-spin" />
                    {t('convert.converting')}
                  </>
                ) : (
                  <>
                    <ArrowRightLeft size={12} />
                    {t('convert.convertBtn', { lang: TARGET_LANGUAGES.find((l) => l.id === targetLang)?.label })}
                  </>
                )}
              </button>
              {result && (
                <button
                  onClick={handleClear}
                  className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
                  title={t('convert.clearResult')}
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          </div>
        </div>
      </FadeIn>

      <div className="flex-1 min-h-0 flex">
        <div className="w-1/2 flex flex-col border-r border-border min-w-0">
          <div className="flex items-center px-3 py-1.5 bg-muted border-b border-border shrink-0">
            <div className="flex items-center gap-1.5">
              <Code2 size={11} className="text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">
                {i18n.language === 'en' ? 'Source' : 'Sumber'}
              </span>
            </div>
          </div>
          <div className="flex-1 min-h-0 overflow-auto">
            <CodeMirror
              value={sourceCode}
              onChange={(v) => setSourceCode(v)}
              extensions={[getLanguageExtension('javascript'), editorKeymap]}
              theme={theme === 'dark' ? darkTheme : lightTheme}
              basicSetup={{
                lineNumbers: true,
                highlightActiveLine: true,
                highlightActiveLineGutter: true,
                foldGutter: true,
                bracketMatching: true,
                indentOnInput: true,
                tabSize: 2,
                closeBrackets: true,
                autocompletion: true,
              }}
              style={{ height: '100%', fontSize: '13px' }}
            />
          </div>
        </div>

        <div className="w-1/2 flex flex-col min-w-0">
          <div className="flex items-center justify-between px-3 py-1.5 bg-muted border-b border-border shrink-0">
            <span className="text-xs font-medium text-muted-foreground">
              {TARGET_LANGUAGES.find((l) => l.id === targetLang)?.label?.toUpperCase() || 'RESULT'}
            </span>
            {result?.code && (
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-md hover:bg-background transition-colors text-muted-foreground"
              >
                {copied ? <Check size={10} className="text-success" /> : <Copy size={10} />}
                {t('analysis.copy')}
              </button>
            )}
          </div>
          <div className="flex-1 min-h-0 overflow-auto">
            <AnimatePresence mode="wait">
            {isConverting && (
              <AsyncLoading label={t('convert.converting')} onRefresh={handleConvert} />
            )}
            {error && <AsyncError error={error} onRetry={handleConvert} />}

              {!isConverting && result?.code && (
                <motion.div
                  key="result"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full"
                >
                  <CodeMirror
                    value={result.code}
                    readOnly
                    editable={false}
                    extensions={[getLanguageExtension(targetLang)]}
                    theme={theme === 'dark' ? darkTheme : lightTheme}
                    basicSetup={{
                      lineNumbers: true,
                      highlightActiveLine: false,
                      highlightActiveLineGutter: false,
                      foldGutter: true,
                      bracketMatching: true,
                    }}
                    style={{ height: '100%', fontSize: '13px' }}
                  />
                </motion.div>
              )}

              {!isConverting && !result && !error && (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center h-full gap-3 text-center p-4"
                >
                  <div className="w-14 h-14 rounded-2xl bg-muted border border-border flex items-center justify-center text-muted-foreground opacity-80">
                    <ArrowRightLeft size={24} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {i18n.language === 'en' ? 'Converted code will appear here' : 'Kode hasil konversi akan muncul di sini'}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {result && (result.explanation || result.differences.length > 0 || result.warnings.length > 0) && (
        <div className="border-t border-border bg-card px-3 sm:px-4 py-2.5 shrink-0 overflow-x-auto">
          <div className="flex items-start gap-4 max-w-6xl mx-auto text-[10px] sm:text-[11px]">
            {result.explanation && (
              <div className="min-w-0">
                <span className="font-semibold text-accent">{i18n.language === 'en' ? 'Explanation' : 'Penjelasan'}:</span>
                <span className="text-muted-foreground ml-1">{result.explanation}</span>
              </div>
            )}
            {result.differences.length > 0 && (
              <div className="shrink-0">
                <span className="font-semibold text-info">{i18n.language === 'en' ? 'Differences' : 'Perbedaan'}:</span>
                <span className="text-muted-foreground ml-1">{result.differences.length}</span>
              </div>
            )}
            {result.warnings.length > 0 && (
              <div className="shrink-0">
                <span className="font-semibold text-warning">{i18n.language === 'en' ? 'Warnings' : 'Peringatan'}:</span>
                <span className="text-muted-foreground ml-1">{result.warnings.length}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
