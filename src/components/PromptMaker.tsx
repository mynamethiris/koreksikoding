import { useState, useCallback } from 'react';
import { Wand2, Loader2, Copy, Check, ArrowDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { useApp } from '@/store/AppContext';
import { analyzeCode } from '@/lib/api';
import toast from 'react-hot-toast';

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
    return `Ubah prompt dasar ini menjadi prompt yang ${styleDesc[style]} dan ${lengthDesc[length]}. Return valid JSON:
{"result":"prompt yang sudah diubah"}
Pertahankan inti/maksud dari prompt asli. JSON only.`;
  }

  return `Transform this base prompt to be ${styleDesc[style]} and ${lengthDesc[length]}. Return valid JSON:
{"result":"the transformed prompt"}
Preserve the core intent of the original prompt. JSON only.`;
}

function getFixerPrompt(lang: string): string {
  if (lang === 'id') {
    return `Perbaiki prompt ini agar lebih rapi, efektif, dan jelas. Return valid JSON:
{"result":"prompt yang sudah diperbaiki"}
Perbaiki grammar, struktur kalimat, dan kejelasan tanpa mengubah inti prompt. JSON only.`;
  }

  return `Fix this prompt to be neater, more effective, and clearer. Return valid JSON:
{"result":"the fixed prompt"}
Fix grammar, sentence structure, and clarity without changing the core intent. JSON only.`;
}

interface PromptMakerProps {
  onUseAsCustom?: (prompt: string) => void;
}

export function PromptMaker({ onUseAsCustom }: PromptMakerProps) {
  const { t, i18n } = useTranslation();
  const { activeProvider } = useApp();
  const [mode, setMode] = useState<Mode>('maker');
  const [style, setStyle] = useState<Style>('detail');
  const [length, setLength] = useState<Length>('medium');
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [copied, setCopied] = useState(false);

  const lang = i18n.language === 'en' ? 'en' : 'id';

  const handleGenerate = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    if (!activeProvider.apiKey) {
      toast.error(t('analysis.noApiKey'));
      return;
    }

    setIsProcessing(true);
    setOutput('');

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
      toast.error(t('analysis.analysisFailed', { error: err instanceof Error ? err.message : 'Unknown error' }));
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
      toast.error('Gagal menyalin');
    }
  }, [output, t]);

  const handleUseAsCustom = useCallback(() => {
    if (!output || !onUseAsCustom) return;
    onUseAsCustom(output);
    toast.success(t('promptMaker.useAsCustomDone'));
  }, [output, onUseAsCustom, t]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setMode('maker')}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
            mode === 'maker'
              ? 'border-accent/30 bg-accent/10 text-accent'
              : 'border-border hover:bg-muted text-muted-foreground'
          }`}
        >
          {t('promptMaker.maker')}
        </button>
        <button
          onClick={() => setMode('fixer')}
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
        <div className="space-y-2">
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
        <div className="space-y-2">
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

      <div className="space-y-1.5">
        <label className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">
          {t('settings.customPrompt')}
        </label>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t('promptMaker.inputPlaceholder')}
          rows={4}
          className="w-full px-3 py-2 text-xs bg-muted border border-border rounded-lg resize-none focus:outline-none focus:ring-1 focus:ring-accent text-foreground placeholder:text-muted-foreground"
        />
      </div>

      <motion.button
        onClick={handleGenerate}
        disabled={isProcessing || !input.trim()}
        className="w-full flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-primary text-primary-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        {isProcessing ? (
          <>
            <Loader2 size={13} className="animate-spin" />
            {t('promptMaker.generating')}
          </>
        ) : (
          <>
            <Wand2 size={13} />
            {mode === 'maker' ? t('promptMaker.generate') : t('promptMaker.fix')}
          </>
        )}
      </motion.button>

      <AnimatePresence>
        {output && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="space-y-2"
          >
            <div className="flex items-center justify-between">
              <label className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">
                {t('promptMaker.outputLabel')}
              </label>
              <div className="flex items-center gap-1.5">
                <motion.button
                  onClick={handleCopyOutput}
                  className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-md hover:bg-muted text-muted-foreground transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {copied ? <Check size={10} className="text-success" /> : <Copy size={10} />}
                  {t('promptMaker.copyOutput')}
                </motion.button>
                {onUseAsCustom && (
                  <motion.button
                    onClick={handleUseAsCustom}
                    className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-md bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <ArrowDown size={10} />
                    {t('promptMaker.useAsCustom')}
                  </motion.button>
                )}
              </div>
            </div>
            <div className="p-3 text-xs bg-muted border border-border rounded-lg text-foreground whitespace-pre-wrap leading-relaxed max-h-[300px] overflow-y-auto">
              {output}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
