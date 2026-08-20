import { useState, useCallback } from 'react';
import { Wand2, Loader2, Copy, Check, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { useApp } from '@/store/AppContext';
import { analyzeCode, canAnalyze, getRateLimitRemaining, ApiError } from '@/lib/api';
import { AsyncError, AsyncLoading } from '@/components/AsyncStatus';
import { FadeIn } from '@/components/motion';
import toast from 'react-hot-toast';
import { showApiKeyNotification } from '@/components/ApiKeyNotification';

type Mode = 'maker' | 'fixer';
type Style = 'list' | 'analytic' | 'detail' | 'simple';
type Length = 'short' | 'medium' | 'long';

const STYLE_LABELS: Record<Style, Record<string, string>> = {
  list: { id: 'Daftar', en: 'List' },
  analytic: { id: 'Analitik', en: 'Analytical' },
  detail: { id: 'Detail', en: 'Detailed' },
  simple: { id: 'Sederhana', en: 'Simple' },
};

const LENGTH_LABELS: Record<Length, Record<string, string>> = {
  short: { id: 'Pendek', en: 'Short' },
  medium: { id: 'Sedang', en: 'Medium' },
  long: { id: 'Panjang', en: 'Long' },
};

function getMakerPrompt(lang: string, style: Style, length: Length): string {
  const styleDesc = {
    list: lang === 'id' ? 'gunakan format poin-poin/bullet list' : 'use bullet list format',
    analytic: lang === 'id' ? 'gunakan gaya analitik dengan data dan fakta' : 'use analytical style with data and facts',
    detail: lang === 'id' ? 'berikan penjelasan detail dan komprehensif' : 'provide detailed and comprehensive explanation',
    simple: lang === 'id' ? 'gunakan bahasa sederhana dan mudah dipahami' : 'use simple and easy-to-understand language',
  };
  const lengthDesc = {
    short: lang === 'id' ? 'pendek (maksimal 100 kata)' : 'short (max 100 words)',
    medium: lang === 'id' ? 'sedang (sekitar 200 kata)' : 'medium (around 200 words)',
    long: lang === 'id' ? 'panjang (sekitar 400 kata)' : 'long (around 400 words)',
  };

  if (lang === 'id') {
    return `Ubah prompt dasar ini agar ${styleDesc[style]} dan ${lengthDesc[length]}. Kembalikan JSON valid tanpa markdown fence, tidak ada teks tambahan.
Format: {"result":"<prompt yang sudah diubah>"}
Aturan:
- Pertahankan inti dan maksud dari prompt asli.
- Prompt hasil harus jelas, spesifik, dan menghindari ambiguitas.
- Tambahkan petunjuk output (format, bahasa, batasan) bila perlu.
JSON only.`;
  }

  return `Refine this base prompt to be ${styleDesc[style]} and ${lengthDesc[length]}. Return valid JSON only, no markdown fence, no extra text.
Format: {"result":"<the refined prompt>"}
Rules:
- Preserve the core intent of the original prompt.
- The output prompt must be clear, specific, and avoid ambiguity.
- Add output instructions (format, language, constraints) when helpful.
JSON only.`;
}

function getFixerPrompt(lang: string): string {
  if (lang === 'id') {
    return `Perbaiki prompt ini agar lebih rapi, efektif, dan jelas. Kembalikan JSON valid tanpa markdown fence, tidak ada teks tambahan.
Format: {"result":"<prompt yang sudah diperbaiki>"}
Aturan:
- Perbaiki grammar, struktur kalimat, dan kejelasan tanpa mengubah inti maksud prompt.
- Buat instruksi lebih spesifik dan hasilkan output yang konsisten.
- Tambahkan petunjuk format keluaran bila perlu.
JSON only.`;
  }

  return `Fix this prompt to be neater, more effective, and clearer. Return valid JSON only, no markdown fence, no extra text.
Format: {"result":"<the fixed prompt>"}
Rules:
- Fix grammar, sentence structure, and clarity without changing the core intent.
- Make instructions more specific for consistent output.
- Add output format instructions when needed.
JSON only.`;
}

export function PromptPage() {
  const { t, i18n } = useTranslation();
  const { activeProvider } = useApp();
  const [mode, setMode] = useState<Mode>('maker');
  const [style, setStyle] = useState<Style>('detail');
  const [length, setLength] = useState<Length>('medium');
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const lang = i18n.language === 'en' ? 'en' : 'id';

  const handleGenerate = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    if (!activeProvider.apiKey) {
      showApiKeyNotification();
      return;
    }

    if (!canAnalyze()) {
      toast.error(t('analysis.rateLimit', { remaining: getRateLimitRemaining() }));
      return;
    }

    setIsProcessing(true);
    setOutput('');
    setError(null);

    try {
      const prompt = mode === 'maker'
        ? getMakerPrompt(lang, style, length)
        : getFixerPrompt(lang);

      const { text } = await analyzeCode(trimmed, 'javascript', activeProvider, prompt);

      let cleaned = text.trim();
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      }
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Invalid JSON');

      const parsed = JSON.parse(jsonMatch[0]);
      setOutput(parsed.result || '');
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
      setIsProcessing(false);
    }
  }, [input, mode, style, length, lang, activeProvider, t]);

  const handleCopyOutput = useCallback(async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      toast.success(t('toast.copied'));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(i18n.language === 'en' ? 'Failed to copy' : 'Gagal menyalin');
    }
  }, [output, t, i18n.language]);

  return (
    <div className="flex flex-col h-[calc(100dvh-52px)]">
      <FadeIn>
        <div className="px-3 sm:px-6 pt-3 sm:pt-4 pb-2 sm:pb-3 border-b border-border bg-card shrink-0">
          <div className="flex items-center gap-2 max-w-6xl mx-auto mb-2">
            <div className="p-1.5 rounded-lg bg-accent/10">
              <Wand2 size={18} className="text-accent" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-foreground tracking-tight">{t('promptMaker.title')}</h1>
              <p className="text-[10px] text-muted-foreground hidden sm:block">{t('promptMaker.desc')}</p>
            </div>
          </div>
        </div>
      </FadeIn>

      <div className="flex-1 min-h-0 flex flex-col sm:flex-row">
        <div className="sm:w-1/2 flex flex-col border-b sm:border-b-0 sm:border-r border-border min-w-0">
          <div className="flex items-center justify-between px-3 py-1.5 bg-muted border-b border-border shrink-0">
            <div className="flex items-center gap-1.5">
              <Wand2 size={11} className="text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">
                {i18n.language === 'en' ? 'Input' : 'Masukan'}
              </span>
            </div>
          </div>
          <div className="flex-1 min-h-0 p-3 sm:p-4 flex flex-col gap-3 overflow-y-auto">
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setMode('maker'); setOutput(''); }}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                  mode === 'maker'
                    ? 'border-accent/30 bg-accent/10 text-accent'
                    : 'border-border hover:bg-muted text-muted-foreground'
                }`}
              >
                {t('promptMaker.maker')}
              </button>
              <button
                onClick={() => { setMode('fixer'); setOutput(''); }}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                  mode === 'fixer'
                    ? 'border-accent/30 bg-accent/10 text-accent'
                    : 'border-border hover:bg-muted text-muted-foreground'
                }`}
              >
                {t('promptMaker.fixer')}
              </button>
            </div>

            {mode === 'maker' && (
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">
                  {t('promptMaker.style')}
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {(Object.keys(STYLE_LABELS) as Style[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => setStyle(s)}
                      className={`px-2.5 py-1 text-[11px] font-medium rounded-md border transition-colors ${
                        style === s
                          ? 'border-accent/30 bg-accent/10 text-accent'
                          : 'border-border hover:bg-muted text-muted-foreground'
                      }`}
                    >
                      {STYLE_LABELS[s][lang]}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {mode === 'maker' && (
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">
                  {t('promptMaker.length')}
                </label>
                <div className="flex gap-1.5">
                  {(Object.keys(LENGTH_LABELS) as Length[]).map((l) => (
                    <button
                      key={l}
                      onClick={() => setLength(l)}
                      className={`px-2.5 py-1 text-[11px] font-medium rounded-md border transition-colors ${
                        length === l
                          ? 'border-accent/30 bg-accent/10 text-accent'
                          : 'border-border hover:bg-muted text-muted-foreground'
                      }`}
                    >
                      {LENGTH_LABELS[l][lang]}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-xl border border-border bg-card overflow-hidden flex-1 min-h-[120px] flex flex-col">
              <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
                <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">
                  {t('settings.customPrompt')}
                </span>
                <span className="text-[10px] text-muted-foreground tabular-nums">
                  {input.length} / 5000
                </span>
              </div>
              <textarea
                value={input}
                onChange={(e) => { if (e.target.value.length <= 5000) setInput(e.target.value); }}
                onKeyDown={(e) => {
                  if (e.key === 'Tab') {
                    e.preventDefault();
                    const ta = e.currentTarget;
                    const start = ta.selectionStart;
                    const end = ta.selectionEnd;
                    const val = ta.value;
                    const newVal = val.substring(0, start) + '  ' + val.substring(end);
                    setInput(newVal);
                    requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = start + 2; });
                  }
                }}
                placeholder={t('promptMaker.inputPlaceholder')}
                maxLength={5000}
                className="flex-1 w-full px-3 py-2.5 text-xs font-mono bg-transparent border-none resize-none focus:outline-none text-foreground placeholder:text-muted-foreground leading-relaxed"
              />
            </div>

            <button
              onClick={handleGenerate}
              disabled={isProcessing || !input.trim()}
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
            >
              {isProcessing ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  {t('promptMaker.generating')}
                </>
              ) : (
                <>
                  <Sparkles size={13} />
                  {mode === 'maker' ? t('promptMaker.generate') : t('promptMaker.fix')}
                </>
              )}
            </button>
          </div>
        </div>

        <div className="sm:w-1/2 flex flex-col min-w-0">
          <div className="flex items-center justify-between px-3 py-1.5 bg-muted border-b border-border shrink-0">
            <span className="text-xs font-medium text-muted-foreground">
              {i18n.language === 'en' ? 'Output' : 'Hasil'}
            </span>
            {output && (
              <button
                onClick={handleCopyOutput}
                className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-md hover:bg-background transition-colors text-muted-foreground"
              >
                {copied ? <Check size={10} className="text-success" /> : <Copy size={10} />}
                {t('promptMaker.copyOutput')}
              </button>
            )}
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4">
            <AnimatePresence mode="wait">
              {isProcessing && (
                <AsyncLoading label={t('promptMaker.generating')} onRefresh={handleGenerate} />
              )}

              {error && (
                <AsyncError error={error} onRetry={handleGenerate} />
              )}

              {!isProcessing && output && (
                <motion.div
                  key="output"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="rounded-xl border border-border bg-card p-3 sm:p-4">
                    <pre className="text-xs text-foreground whitespace-pre-wrap leading-relaxed font-mono">
                      {output}
                    </pre>
                  </div>
                </motion.div>
              )}

              {!isProcessing && !output && !error && (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center gap-3 py-8 text-center"
                >
                  <div className="w-16 h-16 rounded-2xl bg-muted border border-border flex items-center justify-center text-muted-foreground opacity-80">
                    <Wand2 size={28} />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {mode === 'maker'
                      ? (i18n.language === 'en' ? 'Your refined prompt will appear here' : 'Prompt hasil olah akan muncul di sini')
                      : (i18n.language === 'en' ? 'Your fixed prompt will appear here' : 'Prompt hasil perbaikan akan muncul di sini')
                    }
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
