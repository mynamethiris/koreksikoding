import { useState, useCallback, useEffect, useMemo } from 'react';
import { Share2, Copy, Check, Square, LinkIcon, ExternalLink, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useApp } from '@/store/AppContext';
import { FadeIn } from '@/components/motion';
import { getLanguageExtension } from '@/lib/api';
import { lightTheme, darkTheme } from '@/lib/editor-themes';
import CodeMirror from '@uiw/react-codemirror';
import { editorKeymap } from '@/lib/editor-keymap';
import toast from 'react-hot-toast';

const DAY_MS = 24 * 60 * 60 * 1000;
const STORAGE_KEY = 'kk_share_active';

interface ActivePaste {
  id: string;
  createdAt: number;
}

function getInitialActivePaste(): ActivePaste | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data.id || typeof data.id !== 'string') return null;
    if (Date.now() - data.createdAt > DAY_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function formatTimeLeft(ms: number): string {
  if (ms <= 0) return '0h 0m';
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  return `${hours}h ${minutes}m`;
}

export function SharePage() {
  const { t, i18n } = useTranslation();
  const { theme } = useApp();
  const [code, setCode] = useState('');
  const [language] = useState('plaintext');
  const [activePaste, setActivePaste] = useState<ActivePaste | null>(() => getInitialActivePaste());
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const saveActive = useCallback((id: string) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ id, createdAt: Date.now() }));
  }, []);

  const clearActive = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps -- sync with external storage
  useEffect(() => {
    if (!activePaste) return;
    if (Date.now() - activePaste.createdAt >= DAY_MS) {
      clearActive();
      setActivePaste(null);
    }
  }, [activePaste, clearActive]);

  const timeLeft = useMemo(() => {
    if (!activePaste) return 0;
    return Math.max(0, DAY_MS - (now - activePaste.createdAt));
  }, [activePaste, now]);

  const shareUrl = activePaste
    ? `${window.location.origin}/snippet?id=${activePaste.id}`
    : '';

  const handleShare = useCallback(async () => {
    if (!code.trim()) {
      toast.error(i18n.language === 'en' ? 'No code to share' : 'Tidak ada kode untuk dibagikan');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/paste', {
        method: 'POST',
        body: code,
      });

      if (res.status !== 201 && res.status !== 206) {
        throw new Error(`HTTP ${res.status}`);
      }

      const text = await res.text();
      const pasteUrl = text.trim();
      const id = pasteUrl.split('/').pop();

      if (!id) throw new Error('Invalid paste URL');

      saveActive(id);
      setActivePaste({ id, createdAt: Date.now() });
      setCode('');
      toast.success(i18n.language === 'en' ? 'Share link created!' : 'Tautan berbagi dibuat!');
    } catch {
      toast.error(i18n.language === 'en' ? 'Failed to create paste. Try again.' : 'Gagal membuat paste. Coba lagi.');
    } finally {
      setLoading(false);
    }
  }, [code, i18n.language, saveActive]);

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

  const handleStop = useCallback(async () => {
    if (!activePaste) return;
    setDeleting(true);
    try {
      await fetch(`/api/paste/${activePaste.id}`, { method: 'DELETE' });
    } catch { /* ignore */ }
    clearActive();
    setActivePaste(null);
    setDeleting(false);
    toast.success(i18n.language === 'en' ? 'Share link stopped' : 'Tautan berbagi dihentikan');
  }, [activePaste, i18n.language, clearActive]);

  const handleOpenLink = useCallback(() => {
    if (shareUrl) window.open(shareUrl, '_blank');
  }, [shareUrl]);

  return (
    <div className="flex flex-col min-h-[calc(100dvh-52px)]">
      <FadeIn>
        <div className="px-3 sm:px-6 pt-3 sm:pt-4 pb-2 sm:pb-3 border-b border-border bg-card shrink-0">
          <div className="flex items-center gap-2 max-w-6xl mx-auto mb-2">
            <div className="p-1.5 rounded-lg bg-accent/10">
              <Share2 size={18} className="text-accent" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-foreground tracking-tight">{t('share.title')}</h1>
              <p className="text-[10px] text-muted-foreground hidden sm:block">
                {i18n.language === 'en'
                  ? 'Share code online — valid for 1 day, one active link at a time'
                  : 'Bagikan kode secara online, berlaku 1 hari, satu tautan aktif'}
              </p>
            </div>
          </div>
        </div>
      </FadeIn>

      <div className="flex-1 min-h-0 flex flex-col">
        {!activePaste ? (
          <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full p-3 sm:p-6 gap-4">
            <div className="flex-1 min-h-0 flex flex-col rounded-xl border border-border bg-card overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted shrink-0">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-destructive/60" />
                  <div className="w-2 h-2 rounded-full bg-warning/60" />
                  <div className="w-2 h-2 rounded-full bg-success/60" />
                  <span className="ml-1.5 text-[10px] text-muted-foreground font-mono">{language}</span>
                </div>
                <span className="text-[10px] text-muted-foreground tabular-nums">
                  {code.length} {i18n.language === 'en' ? 'chars' : 'karakter'}
                </span>
              </div>
              <div className="flex-1 min-h-0 overflow-hidden">
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
            </div>

            <div className="flex flex-col sm:flex-row items-stretch gap-3 shrink-0">
              <button
                onClick={handleShare}
                disabled={!code.trim() || loading}
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    {i18n.language === 'en' ? 'Creating...' : 'Membuat...'}
                  </>
                ) : (
                  <>
                    <Share2 size={13} />
                    {t('share.shareBtn')}
                  </>
                )}
              </button>

              <div className="flex items-center gap-2 shrink-0">
                <span className="hidden sm:block text-[10px] text-muted-foreground px-3">
                  {i18n.language === 'en' ? 'Max 1 day · One link at a time' : 'Maks 1 hari · Satu tautan'}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center max-w-4xl mx-auto w-full p-3 sm:p-6 gap-4">
            <div className="w-full max-w-lg">
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="p-4 sm:p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-accent/10 shrink-0">
                      <LinkIcon size={24} className="text-accent" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-sm font-bold text-foreground tracking-tight">
                        {i18n.language === 'en' ? 'Share link active' : 'Tautan berbagi aktif'}
                      </h2>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {i18n.language === 'en'
                          ? 'Valid for 1 day. Stop to create a new one.'
                          : 'Berlaku 1 hari. Hentikan untuk membuat yang baru.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex-1 min-w-0 px-3 py-2.5 text-[11px] font-mono bg-muted border border-border rounded-lg truncate text-foreground">
                      {shareUrl}
                    </div>
                    <button
                      onClick={handleCopy}
                      className="p-2.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors shrink-0"
                      aria-label={i18n.language === 'en' ? 'Copy link' : 'Salin tautan'}
                    >
                      {copied ? <Check size={16} className="text-success" /> : <Copy size={16} />}
                    </button>
                    <button
                      onClick={handleOpenLink}
                      className="p-2.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors shrink-0"
                      aria-label={i18n.language === 'en' ? 'Open link' : 'Buka tautan'}
                    >
                      <ExternalLink size={16} />
                    </button>
                  </div>

                  {timeLeft > 0 && (
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono">
                      <span className="w-2 h-2 rounded-full bg-warning/60" />
                      {i18n.language === 'en' ? 'Expires in' : 'Kadaluarsa dalam'} {formatTimeLeft(timeLeft)}
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-2 border-t border-border">
                    <button
                      onClick={handleStop}
                      disabled={deleting}
                      className="flex-1 flex items-center justify-center gap-1 text-[11px] px-3 py-1.5 rounded-lg hover:bg-destructive/10 hover:text-destructive text-muted-foreground border border-border transition-colors disabled:opacity-40"
                    >
                      <Square size={11} />
                      {deleting
                        ? (i18n.language === 'en' ? 'Stopping...' : 'Menghentikan...')
                        : (i18n.language === 'en' ? 'Stop sharing' : 'Hentikan berbagi')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}