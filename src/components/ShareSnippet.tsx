import { useState, useCallback, useEffect } from 'react';
import { Share2, Copy, Check, ChevronDown, ChevronUp, Link, Clock, Square } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { useApp } from '@/store/AppContext';
import toast from 'react-hot-toast';

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

function formatTimeLeft(ms: number): string {
  if (ms <= 0) return '0:00';
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ShareSnippet() {
  const { t, i18n } = useTranslation();
  const { files, activeFileId } = useApp();
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [expiresAt, setExpiresAt] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);

  const activeFile = files.find((f) => f.id === activeFileId);

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
    if (!activeFile || !activeFile.content) return;

    const timestamp = Date.now();
    const data = {
      code: activeFile.content,
      lang: activeFile.language,
      ts: timestamp,
    };

    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(data))));
    const url = `${window.location.origin}/editor#snippet=${encoded}`;

    setShareUrl(url);
    setExpiresAt(timestamp + TWO_HOURS_MS);
    setTimeLeft(TWO_HOURS_MS);
  }, [activeFile]);

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
  }, []);

  if (!activeFile || !activeFile.content) return null;

  return (
    <div className="border-t border-border bg-card">
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
      >
        <span className="flex items-center gap-1.5">
          <Share2 size={12} />
          {t('share.title')}
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
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>{t('share.size', { size: formatSize(new Blob([activeFile.content]).size) })}</span>
                <span className="font-mono">{activeFile.language}</span>
              </div>

              {!shareUrl ? (
                <button
                  onClick={handleShare}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  <Link size={11} />
                  {t('share.shareBtn')}
                </button>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <div className="flex-1 min-w-0 px-2 py-1.5 text-[10px] font-mono bg-muted border border-border rounded-lg truncate text-foreground">
                      {shareUrl}
                    </div>
                    <button
                      onClick={handleCopy}
                      className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors shrink-0"
                    >
                      {copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <Clock size={10} className={timeLeft < 300000 ? 'text-destructive' : ''} />
                      <span className={timeLeft < 300000 ? 'text-destructive font-medium' : ''}>
                        {t('share.expiresIn', { time: formatTimeLeft(timeLeft) })}
                      </span>
                    </div>
                    <button
                      onClick={handleStop}
                      className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-md hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-colors"
                    >
                      <Square size={9} />
                      {i18n.language === 'en' ? 'Stop' : 'Hentikan'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
