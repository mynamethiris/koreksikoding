import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { CodeEditor } from '@/components/CodeEditor';
import { AnalysisPanel } from '@/components/AnalysisPanel';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { useApp } from '@/store/AppContext';

const TAB_ORDER = ['editor', 'analysis'] as const;

export function EditorPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { isAnalyzing, analysisResult } = useApp();
  const [mobileTab, setMobileTab] = useState<'editor' | 'analysis'>('editor');
  const [isMobile, setIsMobile] = useState(false);
  const prevMobileTabRef = useRef(mobileTab);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    if (!isMobile) return;
    if (!isAnalyzing && analysisResult) {
      setMobileTab('analysis');
    }
  }, [isAnalyzing, analysisResult, isMobile]);

  const handleMobileTabChange = (tab: 'editor' | 'analysis') => {
    prevMobileTabRef.current = mobileTab;
    setMobileTab(tab);
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        document.querySelector<HTMLButtonElement>('[data-analyze-btn]')?.click();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.startsWith('#snippet=')) return;
    navigate('/snippet' + hash, { replace: true });
  }, [navigate]);

  if (isMobile) {
    const prevIdx = TAB_ORDER.indexOf(prevMobileTabRef.current);
    const currIdx = TAB_ORDER.indexOf(mobileTab);
    const slideDir = currIdx >= prevIdx ? 1 : -1;

    return (
      <div className="flex flex-col h-[calc(100dvh-52px-56px)]">
        <div className="flex border-b border-border bg-muted shrink-0">
          {TAB_ORDER.map((tab) => (
            <button
              key={tab}
              onClick={() => handleMobileTabChange(tab)}
              className={`flex-1 py-2.5 text-xs font-medium text-center transition-colors relative ${
                mobileTab === tab ? 'text-accent' : 'text-muted-foreground'
              }`}
            >
              {tab === 'editor' ? t('editorPage.editorTab') : t('editorPage.analysisTab')}
              {mobileTab === tab && (
                <motion.div
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent"
                  layoutId="mobile-tab"
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
              {mobileTab === 'editor' && <CodeEditor />}
              {mobileTab === 'analysis' && <AnalysisPanel />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-52px)]">
      <div className="flex-1 min-h-0 flex">
        <div className="w-1/2 flex flex-col border-r border-border min-w-0">
          <div className="flex-1 min-h-0">
            <CodeEditor />
          </div>
        </div>

        <div className="w-1/2 flex flex-col min-w-0">
          <div className="flex-1 min-h-0 overflow-hidden">
            <AnalysisPanel />
          </div>
        </div>
      </div>
    </div>
  );
}
