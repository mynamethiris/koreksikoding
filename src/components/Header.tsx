import { useCallback, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Moon, Sun, Play, History, Zap, Settings, Globe, Trophy, Wrench } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { useApp } from '@/store/AppContext';
import { FileUpload } from './FileUpload';
import { setLanguage } from '@/lib/i18n';

export function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const {
    files, activeFileId,
    isAnalyzing,
    runAnalysis,
    theme, toggleTheme,
  } = useApp();
  const [langFlash, setLangFlash] = useState(false);
  const [langVersion, setLangVersion] = useState(0);
  const langFlashTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const activeFile = files.find((f) => f.id === activeFileId);
  const isEditor = location.pathname === '/editor';
  const isHome = location.pathname === '/';
  const isGuides = location.pathname.startsWith('/guides');

  const toggleLanguage = useCallback(() => {
    setLanguage(i18n.language === 'id' ? 'en' : 'id');
    clearTimeout(langFlashTimerRef.current);
    setLangFlash(true);
    setLangVersion((v) => v + 1);
    langFlashTimerRef.current = setTimeout(() => setLangFlash(false), 1500);
  }, [i18n.language]);

  const handleAnalyze = useCallback(() => {
    runAnalysis();
  }, [runAnalysis]);

  const navItems = [
    { path: '/editor', label: t('header.editor'), icon: Zap },
    { path: '/challenges', label: t('header.challenges', 'Tantangan'), icon: Trophy },
    { path: '/history', label: t('header.history'), icon: History },
    { path: '/tools', label: t('header.tools'), icon: Wrench },
  ];

  const animFast = { duration: 0.2, ease: [0.25, 1, 0.35, 1] } as const;

  return (
    <header className={`flex items-center gap-2 px-3 sm:px-4 py-2 border-b border-border bg-card ${isGuides ? '' : 'backdrop-blur-md'} min-h-[52px] z-30`}>
      <div className="flex items-center gap-2 shrink-0">
        <button
          className="group"
          onClick={() => navigate('/')}
        >
          <motion.div
            className="w-7 h-7 rounded-lg flex items-center justify-center shadow-sm overflow-hidden"
            whileHover={{ scale: 1.2 }}
            whileTap={{ scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
          >
            <img
              src={theme === 'dark' ? '/logo/dark.svg' : '/logo/light.svg'}
              alt="KoreksiKoding"
              className="w-7 h-7"
            />
          </motion.div>
        </button>
        <span className="text-sm font-semibold text-foreground hidden sm:inline tracking-tight">
          KoreksiKoding
        </span>
      </div>

      <span className="sm:hidden text-sm font-medium text-foreground truncate ml-1">
        KoreksiKoding
      </span>

      {!isHome && (
      <nav className="hidden sm:flex items-center gap-0.5 shrink-0">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="relative flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors duration-200"
            >
              {isActive && (
                <div className="absolute inset-0 rounded-lg bg-accent/10 z-0" />
              )}
              <span className={`relative z-10 flex items-center gap-1.5 ${isActive ? 'text-accent' : 'text-muted-foreground hover:text-foreground'}`}>
                <Icon size={14} />
                <span>{item.label}</span>
              </span>
            </button>
          );
        })}
      </nav>
      )}

      <AnimatePresence>
        {isEditor && (
          <motion.div
            key="upload"
            layout
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={animFast}
            className="hidden sm:block"
          >
            <FileUpload />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-1.5 shrink-0 sm:ml-auto ml-auto">
        <AnimatePresence>
          {isEditor && (
            <motion.button
              key="analyze-desktop"
              layout
              layoutId="analyze-btn"
              onClick={handleAnalyze}
              disabled={isAnalyzing || !activeFile}
              data-analyze-btn
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={animFast}
              className="hidden sm:flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-lg bg-primary text-primary-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {isAnalyzing ? (
                <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              ) : (
                <Play size={14} fill="currentColor" />
              )}
              <span>{isAnalyzing ? t('header.analyzing') : t('header.analyze')}</span>
            </motion.button>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isEditor && (
            <motion.button
              key="analyze-mobile"
              layout
              layoutId="analyze-btn"
              onClick={handleAnalyze}
              disabled={isAnalyzing || !activeFile}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={animFast}
              className="flex sm:hidden items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
            >
              {isAnalyzing ? (
                <div className="w-3.5 h-3.5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              ) : (
                <Play size={13} fill="currentColor" />
              )}
            </motion.button>
          )}
        </AnimatePresence>

        <motion.button
          onClick={toggleTheme}
          className="p-2 rounded-lg hover:bg-accent/10 transition-colors text-muted-foreground"
        >
          <AnimatePresence mode="wait" initial={false}>
            {theme === 'dark' ? (
              <motion.div
                key="sun"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Sun size={16} />
              </motion.div>
            ) : (
              <motion.div
                key="moon"
                initial={{ rotate: 90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: -90, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Moon size={16} />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>

        <motion.button
          onClick={toggleLanguage}
          className="flex items-center justify-center px-2 py-1.5 rounded-lg hover:bg-accent/10 transition-colors text-muted-foreground overflow-hidden min-w-[36px] h-[36px]"
        >
          <AnimatePresence mode="wait">
            {langFlash ? (
              <motion.span
                key={`lang-${langVersion}`}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ duration: 0.15, ease: [0.25, 1, 0.35, 1] }}
                className="text-xs font-bold"
              >
                {i18n.language === 'id' ? 'EN' : 'ID'}
              </motion.span>
            ) : (
              <motion.span
                key={`globe-${langVersion}`}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ duration: 0.15, ease: [0.25, 1, 0.35, 1] }}
              >
                <Globe size={16} />
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>

        <motion.button
          onClick={() => navigate('/settings')}
          className={`hidden sm:flex p-2 rounded-lg transition-colors ${
            location.pathname === '/settings'
              ? 'bg-accent/10 text-accent'
              : 'hover:bg-accent/10 text-muted-foreground'
          }`}
        >
          <Settings size={16} />
        </motion.button>
      </div>

    </header>
  );
}
