import { useState, useRef, useCallback } from 'react';
import { Upload, FolderOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { useApp } from '@/store/AppContext';
import { detectLanguage } from '@/lib/api';
import type { EditorFile, Language } from '@/types';

const LANGUAGES: Language[] = [
  'python', 'javascript', 'typescript', 'jsx', 'tsx', 'java', 'c', 'cpp',
  'cs', 'go', 'rust', 'php', 'ruby', 'kotlin', 'swift', 'dart',
  'html', 'css', 'sql', 'json', 'xml', 'yaml',
];

export function FileUpload() {
  const { t } = useTranslation();
  const { addFile } = useApp();
  const [showLangSelect, setShowLangSelect] = useState(false);
  const [pendingFile, setPendingFile] = useState<{ name: string; content: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const ext = file.name.split('.').pop()?.toLowerCase();
      const knownExts = ['py', 'js', 'ts', 'jsx', 'tsx', 'java', 'c', 'cpp', 'cs', 'go', 'rs', 'php', 'rb', 'kt', 'swift', 'dart', 'html', 'css', 'sql', 'json', 'xml', 'yml', 'yaml'];
      if (!ext || !knownExts.includes(ext)) {
        setPendingFile({ name: file.name, content });
        setShowLangSelect(true);
        return;
      }
      const newFile: EditorFile = {
        id: crypto.randomUUID(),
        name: file.name,
        language: detectLanguage(file.name),
        content,
      };
      addFile(newFile);
    };
    reader.readAsText(file);
  }, [addFile]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(processFile);
    e.target.value = '';
  }, [processFile]);

  const handleLangSelect = useCallback((lang: Language) => {
    if (!pendingFile) return;
    const newFile: EditorFile = {
      id: crypto.randomUUID(),
      name: pendingFile.name,
      language: lang,
      content: pendingFile.content,
    };
    addFile(newFile);
    setPendingFile(null);
    setShowLangSelect(false);
  }, [pendingFile, addFile]);

  return (
    <div className="relative">
      <input ref={fileInputRef} id="file-upload" name="file-upload" type="file" multiple className="hidden" onChange={handleFileChange}
        accept=".py,.js,.ts,.jsx,.tsx,.java,.c,.cpp,.cs,.go,.rs,.php,.rb,.kt,.swift,.dart,.html,.css,.sql,.json,.xml,.yml,.yaml" />
      <input ref={folderInputRef} id="folder-upload" name="folder-upload" type="file" className="hidden" onChange={handleFileChange}
        /* @ts-expect-error webkitdirectory is non-standard */
        webkitdirectory="" multiple />

      <div className="flex items-center gap-1">
        <motion.button onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-secondary hover:bg-accent/10 text-secondary-foreground transition-colors"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Upload size={13} />
          <span className="hidden sm:inline">{t('header.upload')}</span>
        </motion.button>
        <motion.button onClick={() => folderInputRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-secondary hover:bg-accent/10 text-secondary-foreground transition-colors"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <FolderOpen size={13} />
          <span className="hidden sm:inline">{t('header.folder')}</span>
        </motion.button>
      </div>

      <AnimatePresence>
        {showLangSelect && (
          <>
            <motion.div
              className="fixed inset-0 z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setShowLangSelect(false); setPendingFile(null); }}
            />
            <motion.div
              className="absolute top-full left-0 mt-2 z-50 bg-card border border-border rounded-xl p-3 w-56"
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            >
              <p className="text-xs text-muted-foreground mb-2 px-1">
                {t('fileUpload.selectLang', { name: pendingFile?.name })}
              </p>
              <div className="max-h-60 overflow-y-auto space-y-0.5">
                {LANGUAGES.map((lang) => (
                  <button key={lang} onClick={() => handleLangSelect(lang)}
                    className="w-full text-left px-2.5 py-1.5 text-sm rounded-lg hover:bg-accent/10 text-foreground transition-colors">
                    {lang}
                  </button>
                ))}
              </div>
              <button onClick={() => { setShowLangSelect(false); setPendingFile(null); }}
                className="mt-2 w-full text-xs text-muted-foreground hover:text-destructive py-1 transition-colors">
                {t('fileUpload.cancel')}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
