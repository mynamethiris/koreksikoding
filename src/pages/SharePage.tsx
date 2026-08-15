import { useState, useCallback, useEffect } from 'react';
import { Share2, Copy, Check, Clock, Square } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useApp } from '@/store/AppContext';
import { FadeIn } from '@/components/motion';
import { getLanguageExtension } from '@/lib/api';
import { lightTheme, darkTheme } from '@/lib/editor-themes';
import CodeMirror from '@uiw/react-codemirror';
import { editorKeymap } from '@/lib/editor-keymap';
import toast from 'react-hot-toast';

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

function formatTimeLeft(ms: number): string {
  if (ms <= 0) return '0:00:00';
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function SharePage() {
  const { t, i18n } = useTranslation();
  const { theme } = useApp();
  const [code, setCode] = useState('');
  const [language] = useState('javascript');
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [expiresAt, setExpiresAt] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (!expiresAt) return;
    const interval = setInterval(() => {
      const left = Math.max(0, expiresAt - Date.now());
      setTimeLeft(left);
      if (left <= 0) {
        setShareUrl('');
        setExpiresAt(0);
        clearInterval(interval);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  const handleShare = useCallback(() => {
    if (!code.trim()) {
      toast.error(i18n.language === 'en' ? 'No code to share' : 'Tidak ada kode untuk dibagikan');
      return;
    }

    const timestamp = Date.now();
    const data = { code, lang: language, ts: timestamp };
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(data))));
    const url = `${window.location.origin}/editor#snippet=${encoded}`;

    setShareUrl(url);
    setExpiresAt(timestamp + TWO_HOURS_MS);
    setTimeLeft(TWO_HOURS_MS);
  }, [code, language, i18n.language]);

  const handleCopy = useCallback(async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success(t('share.copied'));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(i18n.language === 'en' ? 'Failed to copy' : 'Gagal menyalin');
    }
  }, [shareUrl, t, i18n.language]);

  const handleStop = useCallback(() => {
    setShareUrl('');
    setExpiresAt(0);
    setTimeLeft(0);
    setCode('');
  }, []);

  return (
    <div className="flex flex-col h-[calc(100dvh-52px)]">
      <FadeIn>
        <div className="px-3 sm:px-6 pt-3 sm:pt-4 pb-2 sm:pb-3 border-b border-border bg-card shrink-0">
          <div className="flex items-center gap-2 max-w-4xl mx-auto mb-2">
            <div className="p-1.5 rounded-lg bg-accent/10">
              <Share2 size={18} className="text-accent" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-foreground tracking-tight">{t('share.title')}</h1>
              <p className="text-[10px] text-muted-foreground hidden sm:block">
                {i18n.language === 'en' ? 'Write or paste code, then generate a shareable link (valid 2 hours)' : 'Ketik atau tempel kode, lalu buat link berbagi (berlaku 2 jam)'}
              </p>
            </div>
          </div>
        </div>
      </FadeIn>

      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <div className="flex-1 min-h-0 flex flex-col max-w-4xl mx-auto w-full p-3 sm:p-6 gap-3">
          <div className="flex-1 min-h-[200px] sm:min-h-0 max-h-[50vh] sm:max-h-none rounded-xl border border-border bg-card overflow-hidden">
            <CodeMirror
              value={code}
              onChange={(v) => setCode(v)}
              extensions={[getLanguageExtension(language), editorKeymap]}
              theme={theme === 'dark' ? darkTheme : lightTheme}
              basicSetup={{
                lineNumbers: true,
                highlightActiveLine: true,
                highlightActiveLineGutter: true,
                foldGutter: true,
                bracketMatching: true,
                indentOnInput: true,
                tabSize: 2,
                autocompletion: true,
              }}
              style={{ height: '100%', fontSize: '13px' }}
            />
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {!shareUrl ? (
              <button
                onClick={handleShare}
                disabled={!code.trim()}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-primary text-primary-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {t('share.shareBtn')}
              </button>
            ) : (
              <>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="flex-1 min-w-0 px-3 py-2 text-[11px] font-mono bg-muted border border-border rounded-lg truncate text-foreground">
                    {shareUrl}
                  </div>
                  <button
                    onClick={handleCopy}
                    className="p-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors shrink-0"
                  >
                    {copied ? <Check size={16} className="text-success" /> : <Copy size={16} />}
                  </button>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock size={12} className={timeLeft < 300000 ? 'text-destructive' : ''} />
                    <span className={timeLeft < 300000 ? 'text-destructive font-medium' : ''}>
                      {t('share.expiresIn', { time: formatTimeLeft(timeLeft) })}
                    </span>
                  </div>

                  <button
                    onClick={handleStop}
                    className="flex items-center gap-1 text-[11px] px-3 py-1.5 rounded-lg hover:bg-destructive/10 hover:text-destructive text-muted-foreground border border-border transition-colors"
                  >
                    <Square size={11} />
                    {i18n.language === 'en' ? 'Stop' : 'Hentikan'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
