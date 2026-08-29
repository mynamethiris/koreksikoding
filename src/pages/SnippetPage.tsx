import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Code2, Copy, Check, ArrowLeft, FileCode2, Clock, ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useApp } from '@/store/AppContext';
import { getLanguageExtension, detectLanguageFromContent } from '@/lib/api';
import { lightTheme, darkTheme } from '@/lib/editor-themes';
import CodeMirror from '@uiw/react-codemirror';
import toast from 'react-hot-toast';
import type { Language } from '@/types';

const DAY_MS = 24 * 60 * 60 * 1000;
const LEGACY_STORAGE_PREFIX = 'kk_share_';

interface SnippetData {
  code: string;
  lang: string;
}

function getLangLabel(lang: string): string {
  const map: Record<string, string> = {
    javascript: 'JavaScript',
    typescript: 'TypeScript',
    python: 'Python',
    java: 'Java',
    c: 'C',
    cpp: 'C++',
    go: 'Go',
    rust: 'Rust',
    php: 'PHP',
    ruby: 'Ruby',
    jsx: 'JSX',
    tsx: 'TSX',
    html: 'HTML',
    css: 'CSS',
    sql: 'SQL',
    json: 'JSON',
    markdown: 'Markdown',
    yaml: 'YAML',
    shell: 'Shell',
  };
  return map[lang] || lang.toUpperCase();
}

export function SnippetPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { theme, setFiles } = useApp();
  const [snippet, setSnippet] = useState<SnippetData | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadLegacy = useCallback((key: string): SnippetData | null => {
    try {
      const raw = localStorage.getItem(LEGACY_STORAGE_PREFIX + key);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data.code || typeof data.code !== 'string') return null;
      if (Date.now() - data.ts > DAY_MS) {
        localStorage.removeItem(LEGACY_STORAGE_PREFIX + key);
        return null;
      }
      return { code: data.code, lang: data.lang || 'javascript' };
    } catch {
      return null;
    }
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps -- data fetching effect
  useEffect(() => {
    const id = searchParams.get('id');
    if (id) {
      fetch(`/api/paste/${id}`)
        .then((res) => {
          if (!res.ok) throw new Error('Not found');
          return res.text();
        })
        .then((code) => {
          const lang = detectLanguageFromContent(code);
          setSnippet({ code, lang });
          setLoading(false);
        })
        .catch(() => {
          setError(true);
          setLoading(false);
        });
      return;
    }

    const key = searchParams.get('key');
    if (key) {
      const data = loadLegacy(key);
      if (data) {
        setSnippet(data);
        setLoading(false);
        return;
      }
    }

    setError(true);
    setLoading(false);
  }, [searchParams, loadLegacy, setSnippet, setLoading, setError]);

  const handleCopy = useCallback(async () => {
    if (!snippet) return;
    try {
      await navigator.clipboard.writeText(snippet.code);
      setCopied(true);
      toast.success(t('analysis.copied'));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(i18n.language === 'en' ? 'Failed to copy' : 'Gagal menyalin');
    }
  }, [snippet, t, i18n.language]);

  const handleOpenInEditor = useCallback(() => {
    if (!snippet) return;
    setFiles([{
      id: crypto.randomUUID(),
      name: `snippet.${snippet.lang}`,
      language: snippet.lang as Language,
      content: snippet.code,
    }]);
    navigate('/editor');
  }, [snippet, setFiles, navigate]);

  if (loading) {
    return (
      <div className="flex flex-col min-h-[calc(100dvh-52px)]">
        <div className="px-3 sm:px-6 pt-3 sm:pt-4 pb-2 sm:pb-3 border-b border-border bg-card shrink-0">
          <div className="flex items-center justify-between max-w-6xl mx-auto">
            <button
              onClick={() => navigate('/share-code')}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft size={14} />
              {t('notFound.back')}
            </button>
            <div className="p-1.5 rounded-lg bg-accent/10 animate-pulse">
              <Code2 size={18} className="text-accent" />
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-0 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-center p-6">
            <div className="w-12 h-12 rounded-xl bg-muted border border-border flex items-center justify-center animate-pulse">
              <Code2 size={20} className="text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">
              {i18n.language === 'en' ? 'Loading shared code...' : 'Memuat kode berbagi...'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col min-h-[calc(100dvh-52px)]">
        <div className="px-3 sm:px-6 pt-3 sm:pt-4 pb-2 sm:pb-3 border-b border-border bg-card shrink-0">
          <div className="flex items-center justify-between max-w-6xl mx-auto">
            <button
              onClick={() => navigate('/share-code')}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft size={14} />
              {t('notFound.back')}
            </button>
            <div className="p-1.5 rounded-lg bg-accent/10">
              <Code2 size={18} className="text-accent" />
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-0 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4 text-center p-6 max-w-sm">
            <div className="w-16 h-16 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center">
              <FileCode2 size={28} className="text-destructive/60" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">{t('share.expired')}</h2>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                {i18n.language === 'en'
                  ? 'This link is no longer valid or has been stopped by the sender.'
                  : 'Tautan ini sudah tidak berlaku atau telah dihentikan oleh pengirim.'}
              </p>
            </div>
            <button
              onClick={() => navigate('/share-code')}
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <ArrowLeft size={13} />
              {i18n.language === 'en' ? 'Go to Share' : 'Ke Bagikan'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!snippet) return null;

  return (
    <div className="flex flex-col min-h-[calc(100dvh-52px)]">
      {/* Header */}
      <div className="px-3 sm:px-6 pt-3 sm:pt-4 pb-2 sm:pb-3 border-b border-border bg-card shrink-0">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-accent/10">
              <Code2 size={18} className="text-accent" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-foreground tracking-tight">
                {t('share.title')}
              </h1>
              <p className="text-[10px] text-muted-foreground hidden sm:block">
                {i18n.language === 'en' ? 'Shared code snippet — valid for 24 hours' : 'Cuplikan kode berbagi — berlaku 24 jam'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-accent/10 text-accent">
              <span className="w-1.5 h-1.5 rounded-full bg-accent/60" />
              {getLangLabel(snippet.lang)}
            </span>
            <span className="hidden sm:flex items-center gap-0.5 text-[10px] text-muted-foreground">
              <Clock size={10} />
              {i18n.language === 'en' ? 'Expires in 24h' : 'Kadaluarsa 24 jam'}
            </span>
            <button
              onClick={() => navigate('/share-code')}
              className="flex items-center gap-1 px-2 py-1 text-[10px] rounded-lg border border-border hover:bg-muted text-muted-foreground transition-colors"
            >
              <ArrowLeft size={12} />
              {i18n.language === 'en' ? 'Back' : 'Kembali'}
            </button>
          </div>
        </div>
      </div>

      {/* Code */}
      <div className="flex-1 min-h-0 flex items-center justify-center">
        <div className="max-w-4xl mx-auto w-full p-3 sm:p-6">
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-3 py-2 border-b border-border bg-muted shrink-0 flex justify-center">
              <span className="text-[10px] text-muted-foreground font-mono">
                {snippet.code.split('\n').length} {i18n.language === 'en' ? 'lines' : 'baris'} · {snippet.code.length.toLocaleString()} {i18n.language === 'en' ? 'chars' : 'karakter'}
              </span>
            </div>
            <div className="flex-1 min-h-0 overflow-auto">
              <CodeMirror
                value={snippet.code}
                readOnly
                editable={false}
                extensions={[getLanguageExtension(snippet.lang as Language)]}
                theme={theme === 'dark' ? darkTheme : lightTheme}
                basicSetup={{
                  lineNumbers: true,
                  highlightActiveLine: false,
                  highlightActiveLineGutter: false,
                  foldGutter: true,
                  bracketMatching: true,
                }}
                style={{ height: '100%', minHeight: '300px', fontSize: '13px' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Action bar */}
      <div className="px-3 sm:px-6 py-2.5 border-t border-border bg-card shrink-0">
        <div className="flex items-center gap-2 max-w-6xl mx-auto">
          <button
            onClick={handleCopy}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            {copied ? <Check size={13} className="text-success" /> : <Copy size={13} />}
            {copied ? t('analysis.copied') : t('analysis.copy')}
          </button>

          <div className="flex-1" />

          <button
            onClick={handleOpenInEditor}
            className="flex items-center justify-center gap-1.5 px-3 py-2 text-[11px] font-medium rounded-lg border border-border hover:bg-muted text-muted-foreground transition-colors"
          >
            <ExternalLink size={12} />
            {i18n.language === 'en' ? 'Open in editor' : 'Buka di editor'}
          </button>
        </div>
      </div>
    </div>
  );
}
