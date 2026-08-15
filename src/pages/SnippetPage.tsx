import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Code2, Copy, Check, ArrowLeft, Share2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useApp } from '@/store/AppContext';
import { getLanguageExtension } from '@/lib/api';
import { lightTheme, darkTheme } from '@/lib/editor-themes';
import CodeMirror from '@uiw/react-codemirror';
import toast from 'react-hot-toast';
import type { Language } from '@/types';

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

interface SnippetData {
  code: string;
  lang: string;
  ts: number;
}

function decodeSnippet(hash: string): SnippetData | null {
  try {
    if (!hash.startsWith('#snippet=')) return null;
    const encoded = hash.slice(9);
    const data = JSON.parse(decodeURIComponent(escape(atob(encoded))));
    if (!data.code || typeof data.code !== 'string') return null;
    return { code: data.code, lang: data.lang || 'javascript', ts: data.ts || 0 };
  } catch {
    return null;
  }
}

export function SnippetPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { theme } = useApp();
  const [snippet, setSnippet] = useState<SnippetData | null>(null);
  const [copied, setCopied] = useState(false);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const data = decodeSnippet(window.location.hash);
    if (!data) {
      setExpired(true);
      return;
    }
    if (Date.now() - data.ts > TWO_HOURS_MS) {
      setExpired(true);
      return;
    }
    setSnippet(data);
    window.location.hash = '';
  }, []);

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

  const handleStop = useCallback(() => {
    setSnippet(null);
    window.location.hash = '';
    navigate('/');
  }, [navigate]);

  if (expired) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100dvh-52px)] gap-4 text-center p-6">
        <div className="w-16 h-16 rounded-2xl bg-muted border border-border flex items-center justify-center text-muted-foreground opacity-80">
          <Share2 size={28} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">{t('share.expired')}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {i18n.language === 'en' ? 'This link is no longer valid or has been stopped.' : 'Link ini sudah tidak berlaku atau telah dihentikan.'}
          </p>
        </div>
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <ArrowLeft size={14} />
          {t('notFound.back')}
        </button>
      </div>
    );
  }

  if (!snippet) return null;

  return (
    <div className="flex flex-col h-[calc(100dvh-52px)]">
      <div className="px-3 sm:px-6 pt-3 sm:pt-4 pb-2 sm:pb-3 border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-2 max-w-4xl mx-auto mb-2">
          <div className="p-1.5 rounded-lg bg-accent/10">
            <Code2 size={18} className="text-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-bold text-foreground tracking-tight">{t('share.title')}</h1>
            <p className="text-[10px] text-muted-foreground">
              {i18n.language === 'en' ? 'Shared code snippet' : 'Kode berbagi snippet'}
              <span className="ml-2 font-mono text-foreground/60">{snippet.lang}</span>
            </p>
          </div>
        </div>
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
          style={{ height: '100%', fontSize: '13px' }}
        />
      </div>

      <div className="px-3 sm:px-6 py-2.5 border-t border-border bg-card shrink-0">
        <div className="flex items-center gap-2 max-w-4xl mx-auto">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            {copied ? <Check size={13} className="text-success" /> : <Copy size={13} />}
            {copied ? t('analysis.copied') : t('analysis.copy')}
          </button>
          <button
            onClick={handleStop}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg border border-border hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-colors"
          >
            {i18n.language === 'en' ? 'Stop & Close' : 'Hentikan & Tutup'}
          </button>
        </div>
      </div>
    </div>
  );
}
