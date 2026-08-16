import { useCallback, useState, useEffect } from 'react';
import { Plus, X, PencilLine, Eraser } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useApp } from '@/store/AppContext';
import { motion, AnimatePresence } from 'motion/react';
import { getLanguageExtension, detectLanguage, detectLanguageFromContent } from '@/lib/api';
import { EmptyState } from '@/components/EmptyState';
import type { EditorFile, Language } from '@/types';
import CodeMirror from '@uiw/react-codemirror';
import { editorKeymap } from '@/lib/editor-keymap';
import { lightTheme, darkTheme } from '@/lib/editor-themes';

function TabRenameInput({ name, onRename, onCancel }: { name: string; onRename: (name: string) => void; onCancel: () => void }) {
  const [value, setValue] = useState(name);
  const inputRef = useCallback((node: HTMLInputElement | null) => {
    node?.focus();
    node?.select();
  }, []);

  const handleBlur = () => {
    const trimmed = value.trim();
    if (trimmed && trimmed !== name) {
      onRename(trimmed);
    } else {
      onCancel();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <input
      ref={inputRef}
      id="tab-rename"
      name="tab-rename"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className="w-24 px-1 py-0 text-xs bg-transparent border-none outline-none"
      onClick={(e) => e.stopPropagation()}
    />
  );
}

export function CodeEditor({ challengeMode = false }: { challengeMode?: boolean }) {
  const { t } = useTranslation();
  const { files, activeFileId, updateFileContent, addFile, removeFile, setActiveFileId, updateFileName, updateFileLanguage, theme, analysisResult, clearAll } = useApp();
  const [renamingId, setRenamingId] = useState<string | null>(null);

  const activeFile = files.find((f) => f.id === activeFileId);

  useEffect(() => {
    if (!activeFile) return;
    if (!/^file-\d+$/.test(activeFile.name)) return;
    if (activeFile.content.length < 30) return;
    const detected = detectLanguageFromContent(activeFile.content);
    if (detected !== activeFile.language) {
      updateFileLanguage(activeFile.id, detected);
    }
  }, [activeFile?.content, activeFile?.name, activeFile?.language, activeFile?.id, updateFileLanguage]);

  const handleAddTab = useCallback(() => {
    const id = crypto.randomUUID();
    const newFile: EditorFile = {
      id,
      name: `file-${files.length + 1}`,
      language: 'javascript' as Language,
      content: '',
    };
    addFile(newFile);
  }, [files.length, addFile]);

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const droppedFiles = e.dataTransfer.files;
    if (!droppedFiles.length) return;
    Array.from(droppedFiles).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const content = ev.target?.result as string;
        addFile({
          id: crypto.randomUUID(),
          name: file.name,
          language: detectLanguage(file.name),
          content,
        });
      };
      reader.readAsText(file);
    });
  }, [addFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  return (
    <div className="flex flex-col h-full" onDrop={handleFileDrop} onDragOver={handleDragOver}>
      {!challengeMode && (
        <div className="flex items-center border-b border-border bg-muted min-h-[38px]">
        <div className="flex items-center overflow-x-auto flex-1 scrollbar-none">
          {files.map((file) => (
            <div
              key={file.id}
              className={`group relative flex items-center gap-1.5 px-3 py-2 text-xs border-r border-border cursor-pointer transition-colors whitespace-nowrap ${
                activeFileId === file.id
                  ? 'bg-background text-foreground'
                  : 'text-muted-foreground hover:bg-background'
              }`}
              onClick={() => setActiveFileId(file.id)}
              onDoubleClick={(e) => { e.stopPropagation(); setRenamingId(file.id); }}
            >
              {activeFileId === file.id && (
                <motion.div
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent"
                  layoutId="editor-tab"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              {renamingId === file.id ? (
                <TabRenameInput
                  name={file.name}
                  onRename={(name) => { updateFileName(file.id, name); setRenamingId(null); }}
                  onCancel={() => setRenamingId(null)}
                />
              ) : (
                <>
                  <span>{file.name}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); setRenamingId(file.id); }}
                    className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-accent transition-opacity rounded"
                    title={t('codeEditor.rename')}
                  >
                    <PencilLine size={11} />
                  </button>
                </>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); removeFile(file.id); }}
                className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-destructive transition-opacity rounded"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
        <div className="flex items-center">
          <motion.button
            onClick={handleAddTab}
            className="p-2 rounded-md hover:bg-border transition-colors"
            whileHover={{ scale: 0.9 }}
            whileTap={{ scale: 1.1 }}
          >
            <Plus size={14} className="text-muted-foreground" />
          </motion.button>
          <motion.button
            onClick={() => {
              if (files.length === 0 && !analysisResult) return;
              clearAll();
            }}
            className="p-2 rounded-md hover:bg-destructive/10 hover:text-destructive transition-colors text-muted-foreground"
            whileHover={{ scale: 0.9 }}
            whileTap={{ scale: 1.1 }}
            title={t('codeEditor.clearAll')}
          >
            <Eraser size={14} />
          </motion.button>
        </div>
      </div>
      )}

      <div className="flex-1 min-h-0 overflow-auto">
        <AnimatePresence mode="wait">
          {activeFile ? (
            <motion.div
              key={activeFile.id}
              className="h-full"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            >
              <CodeMirror
                key={activeFile.id}
                defaultValue={activeFile.content}
                onChange={(value) => updateFileContent(activeFile.id, value)}
                extensions={[
                  getLanguageExtension(activeFile.language),
                  editorKeymap,
                ]}
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
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              className="h-full"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            >
              <EmptyState
                icon={<span className="text-xl font-mono font-bold">{'</>'}</span>}
                title={t('codeEditor.emptyTitle')}
                description={t('codeEditor.emptyDesc')}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
