import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { EditorFile, Language } from '@/types';

const EDITOR_LANG_KEY = 'kk_editor_language';
const DEFAULT_LANGUAGE: Language = 'javascript';

export interface ScopedEditorState {
  files: EditorFile[];
  activeFileId: string | null;
  activeFile: EditorFile | undefined;
  setFiles: (files: EditorFile[]) => void;
  addFile: (file: EditorFile) => void;
  removeFile: (id: string) => void;
  updateFileContent: (id: string, content: string) => void;
  updateFileLanguage: (id: string, language: Language) => void;
  setManualLanguage: (id: string, language: Language) => void;
  setActiveFileId: (id: string) => void;
  reset: () => void;
}

export const ScopedEditorContext = createContext<ScopedEditorState | null>(null);

function defaultLanguage(): Language {
  try {
    return (localStorage.getItem(EDITOR_LANG_KEY) as Language) || DEFAULT_LANGUAGE;
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

function makeDefaultFile(): EditorFile {
  return { id: crypto.randomUUID(), name: 'untitled', language: defaultLanguage(), content: '' };
}

function readStored(storageKey: string, legacyKey: string | null): { files: EditorFile[]; activeFileId: string | null } {
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.files) && parsed.files.length > 0) {
        return {
          files: parsed.files.map((f: any) => ({ ...f, manualLanguage: !!f.manualLanguage })),
          activeFileId: parsed.activeFileId,
        };
      }
    }
  } catch {}
  if (legacyKey) {
    try {
      const raw = localStorage.getItem(legacyKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        const maybe = Array.isArray(parsed.files) ? parsed : parsed.session;
        if (maybe && Array.isArray(maybe.files) && maybe.files.length > 0) {
        const files = maybe.files.map((f: any) => ({ ...f, manualLanguage: !!f.manualLanguage }));
        localStorage.setItem(storageKey, JSON.stringify({ files, activeFileId: maybe.activeFileId }));
        return { files, activeFileId: maybe.activeFileId };
        }
      }
    } catch {}
  }
  return { files: [], activeFileId: null };
}

export function useScopedEditorStore(storageKey: string, legacyKey: string | null = null): ScopedEditorState {
  const [files, setFilesState] = useState<EditorFile[]>(() => {
    const saved = readStored(storageKey, legacyKey);
    return saved.files.length ? saved.files : [makeDefaultFile()];
  });
  const [activeFileId, setActiveFileIdState] = useState<string | null>(() => {
    return readStored(storageKey, legacyKey).activeFileId;
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ files, activeFileId }));
    } catch {}
  }, [storageKey, files, activeFileId]);

  useEffect(() => {
    const flush = () => {
      try { localStorage.setItem(storageKey, JSON.stringify({ files, activeFileId })); } catch {}
    };
    window.addEventListener('beforeunload', flush);
    return () => window.removeEventListener('beforeunload', flush);
  }, [storageKey, files, activeFileId]);

  useEffect(() => {
    if (files.length === 0) {
      if (activeFileId !== null) setActiveFileIdState(null);
    } else if (!files.find((f) => f.id === activeFileId)) {
      setActiveFileIdState(files[0].id);
    }
  }, [files, activeFileId]);

  const setFiles = useCallback((newFiles: EditorFile[]) => {
    setFilesState(newFiles);
    if (newFiles.length > 0 && !newFiles.find((f) => f.id === activeFileId)) {
      setActiveFileIdState(newFiles[0].id);
    }
  }, [activeFileId]);

  const addFile = useCallback((file: EditorFile) => {
    setFilesState((prev) => [...prev, file]);
    setActiveFileIdState(file.id);
  }, []);

  const removeFile = useCallback((id: string) => {
    setFilesState((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const updateFileContent = useCallback((id: string, content: string) => {
    setFilesState((prev) => prev.map((f) => (f.id === id ? { ...f, content } : f)));
  }, []);

  const updateFileLanguage = useCallback((id: string, language: Language) => {
    setFilesState((prev) => prev.map((f) => (f.id === id ? { ...f, language } : f)));
    try { localStorage.setItem(EDITOR_LANG_KEY, language); } catch {}
  }, []);

  const setManualLanguage = useCallback((id: string, language: Language) => {
    setFilesState((prev) => prev.map((f) => (f.id === id ? { ...f, language, manualLanguage: true } : f)));
    try { localStorage.setItem(EDITOR_LANG_KEY, language); } catch {}
  }, []);

  const setActiveFileId = useCallback((id: string) => setActiveFileIdState(id), []);

  const reset = useCallback(() => {
    const f = makeDefaultFile();
    setFilesState([f]);
    setActiveFileIdState(f.id);
  }, []);

  const activeFile = files.find((f) => f.id === activeFileId);

  return {
    files,
    activeFileId,
    activeFile,
    setFiles,
    addFile,
    removeFile,
    updateFileContent,
    updateFileLanguage,
    setManualLanguage,
    setActiveFileId,
    reset,
  };
}

export function useScopedEditor(): ScopedEditorState {
  const ctx = useContext(ScopedEditorContext);
  if (!ctx) throw new Error('useScopedEditor must be used within a ScopedEditorProvider');
  return ctx;
}

export function ScopedEditorProvider({ storageKey, legacyKey, children }: { storageKey: string; legacyKey?: string; children: ReactNode }) {
  const value = useScopedEditorStore(storageKey, legacyKey);
  return <ScopedEditorContext.Provider value={value}>{children}</ScopedEditorContext.Provider>;
}
