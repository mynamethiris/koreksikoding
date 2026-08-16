import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, ArrowRight, Loader2, Copy, Check, FileCode, ArrowLeftRight, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { useApp } from '@/store/AppContext';
import { analyzeCode, getConvertPrompt, canAnalyze, getRateLimitRemaining, ApiError } from '@/lib/api';
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

interface ConvertModalProps {
  open: boolean;
  onClose: () => void;
}

interface ConvertResult {
  code: string;
  explanation: string;
  differences: string[];
  warnings: string[];
}

interface DiffLine {
  type: 'same' | 'removed' | 'added';
  text: string;
}

function computeDiff(original: string, converted: string): DiffLine[] {
  const origLines = original.split('\n');
  const convLines = converted.split('\n');
  const result: DiffLine[] = [];
  const maxLen = Math.max(origLines.length, convLines.length);
  for (let i = 0; i < maxLen; i++) {
    const orig = origLines[i];
    const conv = convLines[i];
    if (orig !== undefined && conv !== undefined) {
      if (orig.trim() === conv.trim()) {
        result.push({ type: 'same', text: orig });
      } else {
        if (orig !== undefined) result.push({ type: 'removed', text: orig });
        if (conv !== undefined) result.push({ type: 'added', text: conv });
      }
    } else if (orig !== undefined) {
      result.push({ type: 'removed', text: orig });
    } else if (conv !== undefined) {
      result.push({ type: 'added', text: conv });
    }
  }
  return result;
}

export function ConvertModal({ open, onClose }: ConvertModalProps) {
  const { t, i18n } = useTranslation();
  const { files, activeFileId, activeProvider, setFiles, setActiveFileId } = useApp();
  const [targetLang, setTargetLang] = useState<Language>('python');
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ConvertResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'code' | 'diff' | 'details'>('code');

  const activeFile = files.find((f) => f.id === activeFileId);

  useEffect(() => {
    if (!open) {
      setResult(null);
      setCopied(false);
      setActiveTab('code');
    }
  }, [open]);

  const handleLangChange = (lang: Language) => {
    if (lang !== targetLang) {
      setResult(null);
      setTargetLang(lang);
      setActiveTab('code');
    }
  };

  const handleClear = () => {
    setResult(null);
    setError(null);
    setActiveTab('code');
  };

  const diffLines = useMemo(() => {
    if (!result) return [];
    return computeDiff(activeFile?.content || '', result.code);
  }, [result, activeFile?.content]);

  const diffStats = useMemo(() => {
    const added = diffLines.filter((l) => l.type === 'added').length;
    const removed = diffLines.filter((l) => l.type === 'removed').length;
    return { added, removed };
  }, [diffLines]);

  const handleConvert = async () => {
    if (!activeFile) {
      toast.error(t('analysis.noCode'));
      return;
    }
    if (!activeProvider.apiKey) {
      toast.error(t('analysis.noApiKey'));
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
      const { text } = await analyzeCode(activeFile.content, activeFile.language, activeProvider, prompt);

      let cleaned = text.trim();
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      }
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Invalid JSON response');

      const parsed = JSON.parse(jsonMatch[0]);
      setResult({
        code: parsed.convertedCode || '',
        explanation: parsed.explanation || '',
        differences: parsed.differences || [],
        warnings: parsed.warnings || [],
      });
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
  };

  const handleLoadToEditor = () => {
    if (!result?.code) return;
    const newFile = {
      id: crypto.randomUUID(),
      name: `converted.${targetLang === 'cpp' ? 'cpp' : targetLang}`,
      language: targetLang,
      content: result.code,
    };
    setFiles([...files, newFile]);
    setActiveFileId(newFile.id);
    toast.success(t('analysis.fileLoaded'));
    onClose();
  };

  const handleCopy = () => {
    if (!result?.code) return;
    navigator.clipboard.writeText(result.code);
    setCopied(true);
    toast.success(t('toast.codeCopied'));
    setTimeout(() => setCopied(false), 2000);
  };

  const modal = (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4">
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="relative z-10 w-full max-w-sm sm:max-w-2xl max-h-[90dvh] sm:max-h-[85dvh] flex flex-col bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 border-b border-border shrink-0">
              <h3 className="text-sm font-semibold text-foreground">{t('header.convert')}</h3>
              <div className="flex items-center gap-1">
                {result && (
                  <motion.button
                    onClick={handleClear}
                    className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
                    title={t('convert.clearResult')}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <Trash2 size={14} />
                  </motion.button>
                )}
                <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">
                  {t('convert.targetLang')}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {TARGET_LANGUAGES.map((lang) => (
                    <button
                      key={lang.id}
                      onClick={() => handleLangChange(lang.id)}
                      className={`px-2 sm:px-3 py-1.5 sm:py-2 text-[11px] sm:text-xs font-medium rounded-lg border transition-colors ${
                        targetLang === lang.id
                          ? 'border-accent/30 bg-accent/10 text-accent'
                          : 'border-border hover:bg-muted text-muted-foreground'
                      }`}
                    >
                      {lang.label}
                    </button>
                  ))}
                </div>
              </div>

              {activeFile && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <FileCode size={12} className="shrink-0" />
                  <span className="truncate">
                    <span className="font-mono text-foreground">{activeFile.name}</span>
                    <span className="ml-1 opacity-60">({activeFile.language})</span>
                    <ArrowLeftRight size={10} className="mx-1.5 inline" />
                    <span className="font-mono text-foreground">{TARGET_LANGUAGES.find((l) => l.id === targetLang)?.label}</span>
                  </span>
                </div>
              )}

              {error && !result && (
                <div className="p-3 rounded-xl border border-destructive/20 bg-destructive/5 space-y-2">
                  <p className="text-xs text-destructive leading-relaxed break-words">{error}</p>
                  <button
                    onClick={handleConvert}
                    className="flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    {t('analysis.retry')}
                  </button>
                </div>
              )}

              {!result ? (
                <motion.button
                  onClick={handleConvert}
                  disabled={isConverting || !activeFile}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg bg-primary text-primary-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  {isConverting ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      {t('convert.converting')}
                    </>
                  ) : (
                    <>
                      <ArrowRight size={14} />
                      {t('convert.convertBtn', { lang: TARGET_LANGUAGES.find((l) => l.id === targetLang)?.label })}
                    </>
                  )}
                </motion.button>
              ) : (
                <div className="space-y-3">
                  <div className="flex border-b border-border">
                    {(['code', 'diff', 'details'] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`relative px-3 py-2 text-[11px] sm:text-xs font-medium transition-colors ${
                          activeTab === tab ? 'text-accent' : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {tab === 'code' ? (i18n.language === 'en' ? 'Code' : 'Kode') : tab === 'diff' ? (i18n.language === 'en' ? 'Diff' : 'Perbedaan') : (i18n.language === 'en' ? 'Details' : 'Detail')}
                        {activeTab === tab && (
                          <motion.div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" layoutId="convert-tab" />
                        )}
                      </button>
                    ))}
                  </div>

                  <AnimatePresence mode="wait">
                    {activeTab === 'code' && (
                      <motion.div
                        key="code"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.15 }}
                        className="rounded-xl border border-border overflow-hidden"
                      >
                        <div className="flex items-center justify-between px-3 py-2 bg-muted border-b border-border">
                          <span className="text-[10px] font-medium text-muted-foreground uppercase">{targetLang}</span>
                          <button onClick={handleCopy} className="p-1.5 rounded-md hover:bg-background transition-colors text-muted-foreground">
                            {copied ? <Check size={12} className="text-success" /> : <Copy size={12} />}
                          </button>
                        </div>
                        <pre className="p-3 sm:p-4 overflow-auto max-h-[250px] sm:max-h-[350px] text-[11px] sm:text-xs font-mono text-foreground bg-background leading-relaxed">
                          <code>{result.code}</code>
                        </pre>
                      </motion.div>
                    )}

                    {activeTab === 'diff' && (
                      <motion.div
                        key="diff"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.15 }}
                        className="rounded-xl border border-border overflow-hidden"
                      >
                        <div className="flex items-center justify-between px-3 py-2 bg-muted border-b border-border">
                          <div className="flex items-center gap-3 text-[10px]">
                            <span className="text-success">+{diffStats.added} {i18n.language === 'en' ? 'added' : 'ditambahkan'}</span>
                            <span className="text-destructive">-{diffStats.removed} {i18n.language === 'en' ? 'removed' : 'dihapus'}</span>
                          </div>
                        </div>
                        <div className="overflow-auto max-h-[250px] sm:max-h-[350px] bg-background">
                          {diffLines.length === 0 ? (
                            <p className="p-4 text-xs text-muted-foreground text-center">{i18n.language === 'en' ? 'No differences found' : 'Tidak ada perbedaan'}</p>
                          ) : (
                            diffLines.map((line, i) => (
                              <div
                                key={i}
                                className={`px-3 py-0.5 text-[11px] sm:text-xs font-mono border-l-2 ${
                                  line.type === 'added'
                                    ? 'bg-success/5 border-l-success text-success'
                                    : line.type === 'removed'
                                    ? 'bg-destructive/5 border-l-destructive text-destructive'
                                    : 'border-l-transparent text-muted-foreground'
                                }`}
                              >
                                <span className="inline-block w-4 text-[10px] opacity-40 select-none mr-2">
                                  {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
                                </span>
                                {line.text || '\u00A0'}
                              </div>
                            ))
                          )}
                        </div>
                      </motion.div>
                    )}

                    {activeTab === 'details' && (
                      <motion.div
                        key="details"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.15 }}
                        className="space-y-3"
                      >
                        {result.explanation && (
                          <div className="p-3 rounded-xl bg-info/5 border border-info/20">
                            <p className="text-[11px] sm:text-xs font-medium text-info mb-1.5">{i18n.language === 'en' ? 'Explanation' : 'Penjelasan'}</p>
                            <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed">{result.explanation}</p>
                          </div>
                        )}

                        {result.differences.length > 0 && (
                          <div className="p-3 rounded-xl border border-border">
                            <p className="text-[11px] sm:text-xs font-medium text-foreground mb-2">{i18n.language === 'en' ? 'Key Differences' : 'Perbedaan Utama'}</p>
                            <div className="space-y-1.5">
                              {result.differences.map((d, i) => (
                                <div key={i} className="flex items-start gap-2 text-[11px] sm:text-xs text-muted-foreground">
                                  <ArrowLeftRight size={10} className="text-accent mt-0.5 shrink-0" />
                                  <span>{d}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {result.warnings.length > 0 && (
                          <div className="p-3 rounded-xl border border-warning/20 bg-warning/5">
                            <p className="text-[11px] sm:text-xs font-medium text-warning mb-2">{i18n.language === 'en' ? 'Warnings' : 'Peringatan'}</p>
                            <div className="space-y-1">
                              {result.warnings.map((w, i) => (
                                <p key={i} className="text-[11px] sm:text-xs text-muted-foreground">• {w}</p>
                              ))}
                            </div>
                          </div>
                        )}

                        {!result.explanation && result.differences.length === 0 && result.warnings.length === 0 && (
                          <p className="text-xs text-muted-foreground text-center py-4">{i18n.language === 'en' ? 'No additional details' : 'Tidak ada detail tambahan'}</p>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="flex gap-2 pt-1">
                    <motion.button
                      onClick={handleLoadToEditor}
                      className="flex-1 px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                    >
                      {t('convert.loadToEditor')}
                    </motion.button>
                    <motion.button
                      onClick={handleClear}
                      className="px-4 py-2 text-sm font-medium rounded-lg border border-border hover:bg-muted transition-colors text-muted-foreground"
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                    >
                      {t('convert.convertAgain')}
                    </motion.button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return createPortal(modal, document.body);
}
