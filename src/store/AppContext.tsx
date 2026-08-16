import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { EditorFile, AnalysisResult, Theme, AIProvider, HistoryEntry } from '@/types';
import { analyzeCode, parseAnalysisResponse, canAnalyze, recordAnalysis, sanitizeCode, sanitizeFixedCode, getRateLimitRemaining, ApiError } from '@/lib/api';
import { decryptApiKey } from '@/lib/crypto';
import { db } from '@/lib/db';
import toast from 'react-hot-toast';

interface AppState {
  files: EditorFile[];
  activeFileId: string | null;
  analysisResult: AnalysisResult | null;
  isAnalyzing: boolean;
  analysisError: string | null;
  theme: Theme;
  providers: AIProvider[];
  activeProvider: AIProvider;
  activeResultTab: string;
  customPrompt: string;
}

interface AppContextType extends AppState {
  setFiles: (files: EditorFile[]) => void;
  addFile: (file: EditorFile) => void;
  removeFile: (id: string) => void;
  updateFileContent: (id: string, content: string) => void;
  updateFileName: (id: string, name: string) => void;
  setActiveFileId: (id: string) => void;
  setAnalysisResult: (result: AnalysisResult | null) => void;
  setIsAnalyzing: (v: boolean) => void;
  setAnalysisError: (v: string | null) => void;
  clearAnalysisError: () => void;
  runAnalysis: () => Promise<void>;
  toggleTheme: () => void;
  setActiveProvider: (provider: AIProvider) => void;
  setProviders: (providers: AIProvider[]) => void;
  setActiveResultTab: (tab: string) => void;
  setCustomPrompt: (prompt: string) => void;
  clearAll: () => void;
}

const EDITOR_STATE_KEY = 'kk_editor_state';
const ANALYSIS_STATE_KEY = 'kk_analysis_state';
const CUSTOM_PROMPT_KEY = 'kk_custom_prompt';

function loadEditorState(): { files: EditorFile[]; activeFileId: string | null } {
  try {
    const raw = localStorage.getItem(EDITOR_STATE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.files) && parsed.files.length > 0) {
        return { files: parsed.files, activeFileId: parsed.activeFileId };
      }
    }
  } catch { }
  return { files: [], activeFileId: null };
}

function loadAnalysisState(): AnalysisResult | null {
  try {
    const raw = localStorage.getItem(ANALYSIS_STATE_KEY);
    if (raw) {
      const result = JSON.parse(raw);
      if (result && typeof result === 'object') {
        if (typeof result.fixedCode === 'string') {
          const cleaned = result.fixedCode.replace(/^```(?:\w*)\s*\n?/, '').replace(/\n?```\s*$/, '').trim();
          const langPattern = /^(python|javascript|typescript|jsx|tsx|java|c|cpp|cs|go|rust|php|ruby|kotlin|swift|dart|html|css|sql|json|xml|yaml)\s*\n/i;
          result.fixedCode = cleaned.replace(langPattern, '').trim() || '// Kode perbaikan tidak tersedia';
        } else if (!result.fixedCode) {
          result.fixedCode = '// Kode perbaikan tidak tersedia';
        }
        if (!Array.isArray(result.errors)) result.errors = [];
        if (!Array.isArray(result.warnings)) result.warnings = [];
        if (!Array.isArray(result.suggestions)) result.suggestions = [];
        if (!Array.isArray(result.explanation)) result.explanation = [];
        if (!Array.isArray(result.concepts)) result.concepts = [];
        if (typeof result.score !== 'number') result.score = 0;
        return result;
      }
    }
  } catch { }
  return null;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const saved = loadEditorState();
  const [files, setFilesState] = useState<EditorFile[]>(saved.files);
  const [activeFileId, setActiveFileId] = useState<string | null>(saved.activeFileId);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(() => loadAnalysisState());
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem('kk_theme') as Theme) || 'dark';
  });
  const [providers, setProvidersState] = useState<AIProvider[]>(() => {
    try {
      const stored = localStorage.getItem('kk_providers');
      if (stored) {
        const parsed = JSON.parse(stored);
        const defaults = [
          { id: 'gemini', name: 'Gemini', endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent', model: 'gemini-2.0-flash', apiKey: '', isDefault: true },
          { id: 'groq', name: 'Groq', endpoint: 'https://api.groq.com/openai/v1/chat/completions', model: 'qwen3-32b', apiKey: '', isDefault: true },
        ];
        return defaults.map((dp) => {
          const custom = parsed.find((p: any) => p.id === dp.id);
          return custom ? { ...dp, ...custom, apiKey: custom.apiKey } : dp;
        }).concat(parsed.filter((p: any) => !p.isDefault));
      }
    } catch { }
    return [
      { id: 'gemini', name: 'Gemini', endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent', model: 'gemini-2.0-flash', apiKey: '', isDefault: true },
      { id: 'groq', name: 'Groq', endpoint: 'https://api.groq.com/openai/v1/chat/completions', model: 'qwen3-32b', apiKey: '', isDefault: true },
    ];
  });
  const [activeProvider, setActiveProviderState] = useState<AIProvider>(() => {
    try {
      const activeId = localStorage.getItem('kk_active_provider') || 'gemini';
      const stored = localStorage.getItem('kk_providers');
      const defaults: AIProvider[] = [
        { id: 'gemini', name: 'Gemini', endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent', model: 'gemini-2.0-flash', apiKey: '', isDefault: true },
        { id: 'groq', name: 'Groq', endpoint: 'https://api.groq.com/openai/v1/chat/completions', model: 'qwen3-32b', apiKey: '', isDefault: true },
      ];
      if (stored) {
        const parsed = JSON.parse(stored);
        const all = defaults.map((dp) => {
          const custom = parsed.find((p: any) => p.id === dp.id);
          return custom ? { ...dp, ...custom, apiKey: custom.apiKey } : dp;
        }).concat(parsed.filter((p: any) => !p.isDefault));
        return all.find((p: AIProvider) => p.id === activeId) || all[0];
      }
      return defaults[0];
    } catch {
      return { id: 'gemini', name: 'Gemini', endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent', model: 'gemini-2.0-flash', apiKey: '', isDefault: true };
    }
  });
  const [activeResultTab, setActiveResultTab] = useState(() => {
    return localStorage.getItem('kk_active_result_tab') || 'hasil';
  });
  const [customPrompt, setCustomPromptState] = useState(() => {
    return localStorage.getItem(CUSTOM_PROMPT_KEY) || '';
  });

  const { t } = useTranslation();
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      localStorage.setItem(EDITOR_STATE_KEY, JSON.stringify({ files, activeFileId }));
    }, 500);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [files, activeFileId]);

  const saveAnalysisTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (saveAnalysisTimerRef.current) clearTimeout(saveAnalysisTimerRef.current);
    saveAnalysisTimerRef.current = setTimeout(() => {
      if (analysisResult) {
        localStorage.setItem(ANALYSIS_STATE_KEY, JSON.stringify(analysisResult));
      } else {
        localStorage.removeItem(ANALYSIS_STATE_KEY);
      }
    }, 300);
    return () => { if (saveAnalysisTimerRef.current) clearTimeout(saveAnalysisTimerRef.current); };
  }, [analysisResult]);

  useEffect(() => { localStorage.setItem('kk_active_result_tab', activeResultTab); }, [activeResultTab]);

  useEffect(() => { localStorage.setItem(CUSTOM_PROMPT_KEY, customPrompt); }, [customPrompt]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const decrypted = await Promise.all(providers.map(async (p) => ({
        ...p,
        apiKey: await decryptApiKey(p.apiKey),
      })));
      if (!cancelled) {
        const same = decrypted.every((d, i) => d.apiKey === providers[i].apiKey);
        if (!same) {
          setProvidersState(decrypted);
          setActiveProviderState((prev) => {
            const match = decrypted.find((d) => d.id === prev.id);
            return match || prev;
          });
        }
      }
    })();
    return () => { cancelled = true; };
  }, [providers]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.classList.toggle('light', theme === 'light');
  }, [theme]);

  const setFiles = useCallback((newFiles: EditorFile[]) => {
    setFilesState(newFiles);
    if (newFiles.length > 0 && !newFiles.find((f) => f.id === activeFileId)) {
      setActiveFileId(newFiles[0].id);
    }
  }, [activeFileId]);

  const addFile = useCallback((file: EditorFile) => {
    setFilesState((prev) => [...prev, file]);
    setActiveFileId(file.id);
  }, []);

  const removeFile = useCallback((id: string) => {
    setFilesState((prev) => prev.filter((f) => f.id !== id));
  }, []);

  useEffect(() => {
    if (files.length === 0) {
      if (activeFileId !== null) setActiveFileId(null);
    } else if (!files.find((f) => f.id === activeFileId)) {
      setActiveFileId(files[0].id);
    }
  }, [files, activeFileId]);

  const updateFileContent = useCallback((id: string, content: string) => {
    setFilesState((prev) => prev.map((f) => (f.id === id ? { ...f, content } : f)));
  }, []);

  const updateFileName = useCallback((id: string, name: string) => {
    setFilesState((prev) => prev.map((f) => (f.id === id ? { ...f, name } : f)));
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('kk_theme', next);
      document.documentElement.classList.toggle('dark', next === 'dark');
      document.documentElement.classList.toggle('light', next === 'light');
      return next;
    });
  }, []);

  const setActiveProvider = useCallback((provider: AIProvider) => {
    setActiveProviderState(provider);
    localStorage.setItem('kk_active_provider', provider.id);
  }, []);

  const setProviders = useCallback((newProviders: AIProvider[]) => {
    setProvidersState(newProviders);
  }, []);

  const setCustomPrompt = useCallback((prompt: string) => {
    setCustomPromptState(prompt);
  }, []);

  const runAnalysis = useCallback(async () => {
    const file = files.find((f) => f.id === activeFileId);
    if (!file || !file.content.trim()) {
      toast.error(t('analysis.noCode'));
      return;
    }
    if (!activeProvider.apiKey) {
      toast.error(t('analysis.noApiKey'));
      return;
    }
    if (!canAnalyze()) {
      toast.error(t('analysis.rateLimit', { remaining: getRateLimitRemaining() }));
      return;
    }

    setIsAnalyzing(true);
    setAnalysisResult(null);
    setAnalysisError(null);

    try {
      const sanitized = sanitizeCode(file.content);
      const { text: rawResponse, tokenUsage } = await analyzeCode(sanitized, file.language, activeProvider);
      const parsed = parseAnalysisResponse(rawResponse) as Record<string, unknown>;

      const result: AnalysisResult = {
        errors: (parsed.errors as any[]) || [],
        warnings: (parsed.warnings as any[]) || [],
        suggestions: (parsed.suggestions as any[]) || [],
        score: Math.max(0, Math.min(100, (parsed.score as number) || 0)),
        fixedCode: sanitizeFixedCode((parsed.fixedCode as string) || '') || file.content,
        changes: (parsed.changes as string[]) || [],
        explanation: (parsed.explanation as any[]) || [],
        concepts: (parsed.concepts as any[]) || [],
        exercise: (parsed.exercise as any) || null,
        tokenUsage,
        refactoringScore: parsed.refactoringScore as any || undefined,
        vulnerabilities: (parsed.vulnerabilities as any[]) || undefined,
        duplications: (parsed.duplications as any[]) || undefined,
      };

      setAnalysisResult(result);
      recordAnalysis();

      try {
        const entry: HistoryEntry = {
          id: crypto.randomUUID(),
          code: file.content,
          language: file.language,
          timestamp: Date.now(),
          score: result.score,
          errorCount: result.errors.length,
          warningCount: result.warnings.length,
          suggestionCount: result.suggestions.length,
          result,
        };
        await db.addHistory(entry);
      } catch (dbErr) {
        console.error('Failed to save analysis history:', dbErr);
      }

      toast.success(t('analysis.analysisDone'));
    } catch (err) {
      let msg: string;
      if (err instanceof ApiError) {
        msg = err.message;
      } else if (err instanceof Error) {
        msg = err.message;
      } else {
        msg = t('analysis.errorUnknown', { error: String(err) });
      }
      setAnalysisError(msg);
      toast.error(t('analysis.analysisFailed', { error: msg }));
    } finally {
      setIsAnalyzing(false);
    }
  }, [files, activeFileId, activeProvider, t]);

  const clearAnalysisError = useCallback(() => setAnalysisError(null), []);

  const clearAll = useCallback(() => {
    setFilesState([]);
    setActiveFileId(null);
    setAnalysisResult(null);
    setIsAnalyzing(false);
    setAnalysisError(null);
  }, []);

  return (
    <AppContext.Provider
      value={{
        files,
        activeFileId,
        analysisResult,
        isAnalyzing,
        analysisError,
        setAnalysisError,
        clearAnalysisError,
        runAnalysis,
        theme,
        providers,
        activeProvider,
        activeResultTab,
        customPrompt,
        setFiles,
        addFile,
        removeFile,
        updateFileContent,
        updateFileName,
        setActiveFileId,
        setAnalysisResult,
        setIsAnalyzing,
        toggleTheme,
        setActiveProvider,
        setProviders,
        setActiveResultTab,
        setCustomPrompt,
        clearAll,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
