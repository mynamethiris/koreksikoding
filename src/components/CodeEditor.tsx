import { useState, useEffect, useContext } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useApp } from '@/store/AppContext';
import { ScopedEditorContext } from '@/store/ScopedEditorContext';
import { motion, AnimatePresence } from 'motion/react';
import { getLanguageExtension, detectLanguageFromContent, LANGUAGES, LANG_DISPLAY } from '@/lib/api';
import { lineMarkerExtension, setLineMarkers, clearLineMarkers, scrollToLine, resultToErrors } from '@/lib/editor-markers';
import { EmptyState } from '@/components/EmptyState';
import CodeMirror from '@uiw/react-codemirror';
import { editorKeymap } from '@/lib/editor-keymap';
import { lightTheme, darkTheme } from '@/lib/editor-themes';
import type { EditorView } from '@codemirror/view';

export function CodeEditor({ hideToolbar }: { hideToolbar?: boolean }) {
  const { t } = useTranslation();
  const app = useApp();
  const scoped = useContext(ScopedEditorContext);
  const { theme, analysisResult } = app;
  const files = scoped ? scoped.files : app.files;
  const activeFileId = scoped ? scoped.activeFileId : app.activeFileId;
  const activeFile = files.find((f) => f.id === activeFileId);
  const updateFileContent = scoped ? scoped.updateFileContent : app.updateFileContent;
  const updateFileLanguage = scoped ? scoped.updateFileLanguage : app.updateFileLanguage;
  const setManualLanguage = scoped ? scoped.setManualLanguage : app.setManualLanguage;
  const [langPickerOpen, setLangPickerOpen] = useState(false);
  const [editorView, setEditorView] = useState<EditorView | null>(null);

  useEffect(() => {
    if (!activeFile) return;
    if (activeFile.manualLanguage) return;
    if (activeFile.content.length < 30) return;
    const detected = detectLanguageFromContent(activeFile.content);
    if (detected !== activeFile.language) {
      updateFileLanguage(activeFile.id, detected);
    }
  }, [activeFile?.content, activeFile?.name, activeFile?.language, activeFile?.id, activeFile?.manualLanguage, updateFileLanguage]);

  useEffect(() => {
    if (!editorView) return;
    if (analysisResult) {
      const errors = resultToErrors(analysisResult);
      editorView.dispatch({
        effects: errors.length > 0 ? setLineMarkers.of(errors) : clearLineMarkers.of(null),
      });
    } else {
      editorView.dispatch({ effects: clearLineMarkers.of(null) });
    }
  }, [editorView, analysisResult]);

  useEffect(() => {
    const handler = (e: CustomEvent<{ line: number }>) => {
      if (editorView) scrollToLine(editorView, e.detail.line);
    };
    window.addEventListener('korek:scrollToLine', handler as EventListener);
    return () => window.removeEventListener('korek:scrollToLine', handler as EventListener);
  }, [editorView]);

  return (
    <div className="flex flex-col h-full">
      {!hideToolbar && (
      <div className="flex items-center border-b border-border bg-muted min-h-[38px] shrink-0">
        <div className="flex items-center gap-2 px-3 flex-1 min-w-0">
          {activeFile && (
            <div className="relative shrink-0">
              <motion.button
                onClick={(e) => { e.stopPropagation(); setLangPickerOpen((o) => !o); }}
                className="flex items-center gap-1 px-2 py-1 text-xs rounded-md hover:bg-border transition-colors text-muted-foreground"
                title={t('codeEditor.language', 'Bahasa')}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <span className="text-xs">{LANG_DISPLAY[activeFile.language] || activeFile.language}</span>
                <ChevronDown size={10} />
              </motion.button>
              <AnimatePresence>
                {langPickerOpen && (
                  <>
                    <motion.div
                      className="fixed inset-0 z-40"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setLangPickerOpen(false)}
                    />
                    <motion.div
                      className="absolute top-full left-0 mt-1 z-50 bg-card border border-border rounded-lg p-1.5 min-w-[140px] max-h-72 overflow-y-auto shadow-lg space-y-0.5"
                      initial={{ opacity: 0, y: -4, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -4, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                    >
                      {LANGUAGES.map((lang) => (
                        <button
                          key={lang}
                          onClick={(e) => {
                            e.stopPropagation();
                            setManualLanguage(activeFile.id, lang);
                            setLangPickerOpen(false);
                          }}
                          className={`w-full text-left px-2.5 py-1.5 text-xs rounded-md transition-colors ${
                            activeFile.language === lang
                              ? 'bg-accent/10 text-accent font-medium'
                              : 'text-muted-foreground hover:bg-muted'
                          }`}
                        >
                          {activeFile.language === lang && <Check size={10} className="inline mr-1" />}
                          {LANG_DISPLAY[lang] || lang}
                        </button>
                      ))}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
      )}

      <div className="flex-1 min-h-0 overflow-auto">
        {activeFile ? (
          <CodeMirror
            key={activeFile.id}
            value={activeFile.content}
            onChange={(value) => updateFileContent(activeFile.id, value)}
            extensions={[
              getLanguageExtension(activeFile.language),
              editorKeymap,
              ...lineMarkerExtension(),
            ]}
            onCreateEditor={(view) => setEditorView(view)}
            theme={theme === 'dark' ? darkTheme : lightTheme}
            basicSetup={{
              lineNumbers: true,
              highlightActiveLineGutter: true,
              highlightActiveLine: true,
              bracketMatching: true,
              foldGutter: true,
              indentOnInput: true,
              tabSize: 2,
              autocompletion: true,
              highlightSelectionMatches: true,
            }}
            style={{ height: '100%', fontSize: '14px' }}
          />
        ) : (
          <EmptyState
            icon={<span className="text-xl font-mono font-bold">{'</>'}</span>}
            title={t('codeEditor.emptyTitle')}
            description={t('codeEditor.emptyDesc')}
          />
        )}
      </div>
    </div>
  );
}
