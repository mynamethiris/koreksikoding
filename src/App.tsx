import { useRef } from 'react';
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Toaster } from 'react-hot-toast';
import { MotionConfig, AnimatePresence, motion } from 'motion/react';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { AppProvider } from '@/store/AppContext';
import { ApiKeyNotification } from '@/components/ApiKeyNotification';
import { ScopedEditorProvider } from '@/store/ScopedEditorContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { EditorPage } from '@/pages/EditorPage';
import { RiwayatPage } from '@/pages/RiwayatPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { BerandaPage } from '@/pages/BerandaPage';
import { TantanganPage } from '@/pages/TantanganPage';
import { TerminalPage } from '@/pages/TerminalPage';
import { SharePage } from '@/pages/SharePage';
import { PromptPage } from '@/pages/PromptPage';
import { ToolsPage } from '@/pages/ToolsPage';
import { ConvertPage } from '@/pages/ConvertPage';
import { SnippetPage } from '@/pages/SnippetPage';
import { TypingTestPage } from '@/pages/TypingTestPage';
import { GuidesPage } from '@/pages/GuidesPage';
import { GuideDetail } from '@/pages/GuideDetail';
import '@/lib/i18n';

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <ErrorBoundary key={location.pathname}>
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          className="min-h-full"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
          <Routes location={location}>
            <Route path="/" element={<BerandaPage />} />
            <Route path="/editor" element={<EditorPage />} />
            <Route path="/history" element={<RiwayatPage />} />
            <Route path="/challenges" element={
              <ScopedEditorProvider storageKey="kk_tantangan_editor_store" legacyKey="kk_tantangan_session">
                <TantanganPage />
              </ScopedEditorProvider>
            } />
            <Route path="/terminal" element={<TerminalPage />} />
            <Route path="/share-code" element={<SharePage />} />
            <Route path="/prompt-builder" element={<PromptPage />} />
            <Route path="/tools" element={<ToolsPage />} />
            <Route path="/converter" element={<ConvertPage />} />
            <Route path="/snippet" element={<SnippetPage />} />
            <Route path="/typing-test" element={<TypingTestPage />} />
            <Route path="/guides" element={<GuidesPage />} />
            <Route path="/guides/:id" element={<GuideDetail />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </motion.div>
      </AnimatePresence>
    </ErrorBoundary>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <MotionConfig reducedMotion="user">
        <BrowserRouter>
          <AppProvider>
            <AppShell />
          </AppProvider>
        </BrowserRouter>
      </MotionConfig>
    </ErrorBoundary>
  );
}

function AppShell() {
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const isEditor = location.pathname === '/editor';
  return (
    <div className="h-screen flex flex-col bg-background text-foreground">
      <Header />
      <main ref={mainRef} className={`flex-1 min-h-0 overscroll-contain ${isEditor ? 'overflow-hidden' : 'overflow-y-auto'}`}>
        <AnimatedRoutes />
      </main>
      <BottomNav />
      <ApiKeyNotification />
      <Analytics />
      <SpeedInsights />
      <Toaster
        position="top-center"
        toastOptions={{
          className: 'text-sm',
          duration: 3000,
          style: {
            background: 'var(--color-card)',
            color: 'var(--color-card-foreground)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius)',
            padding: '12px 16px',
            boxShadow: 'var(--shadow)',
            zIndex: 9999,
            maxWidth: '360px',
            wordBreak: 'break-word',
          },
          success: {
            style: {
              background: 'var(--color-card)',
              color: 'var(--color-success)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius)',
              maxWidth: '360px',
              wordBreak: 'break-word',
            },
            iconTheme: {
              primary: 'var(--color-success)',
              secondary: 'var(--color-card)',
            },
          },
          error: {
            style: {
              background: 'var(--color-card)',
              color: 'var(--color-destructive)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius)',
              maxWidth: '360px',
              wordBreak: 'break-word',
            },
            iconTheme: {
              primary: 'var(--color-destructive)',
              secondary: 'var(--color-card)',
            },
          },
        }}
      />
    </div>
  );
}

function NotFoundPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-4">
      <span className="text-5xl font-mono font-bold text-muted-foreground">404</span>
      <p className="text-sm text-muted-foreground">{t('notFound.title')}</p>
      <button
        onClick={() => navigate('/')}
        className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        {t('notFound.back')}
      </button>
    </div>
  );
}
