import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { EditorFile, AnalysisResult, AnalysisError, IssueHint, Theme, AIProvider, HistoryEntry, Language, VerifyResult, ReviewMetrics, Vulnerability, Duplication } from '@/types';
import { analyzeCode, parseAnalysisResponse, canAnalyze, recordAnalysis, getRateLimitRemaining, detectLanguageFromContent, LANG_DISPLAY, fetchAvailableModels, saveProviders, scanSecurityDuplication, ApiError } from '@/lib/api';
import { getVerifier } from '@/lib/verify';
import { ConfirmModal } from '@/components/Modal';
import { decryptApiKey } from '@/lib/crypto';
import { db } from '@/lib/db';
import toast from 'react-hot-toast';
import { showApiKeyNotification } from '@/components/ApiKeyNotification';

interface AnalysisContext {
  originalCode: string | null;
  language: Language | null;
}

interface AppState {
  files: EditorFile[];
  activeFileId: string | null;
  analysisResult: AnalysisResult | null;
  isAnalyzing: boolean;
  analysisError: string | null;
  isVerifying: boolean;
  verifyResult: VerifyResult | null;
  verifyError: string | null;
  analysisConfirmOpen: boolean;
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
  updateFileLanguage: (id: string, language: Language) => void;
  setManualLanguage: (id: string, language: Language) => void;
  setActiveFileId: (id: string) => void;
  setAnalysisResult: (result: AnalysisResult | null) => void;
  setIsAnalyzing: (v: boolean) => void;
  setAnalysisError: (v: string | null) => void;
  analysisErrorType: 'modelUnavailable' | 'noApiKey' | null;
  clearAnalysisError: () => void;
  runAnalysis: () => Promise<void>;
  requestAnalysis: () => void;
  setAnalysisConfirmOpen: (open: boolean) => void;
  runVerify: () => Promise<void>;
  setVerifyResult: (result: VerifyResult | null) => void;
  bumpReviewMetrics: (hintsOpened: number) => void;
  toggleTheme: () => void;
  setActiveProvider: (provider: AIProvider) => void;
  setProviders: (providers: AIProvider[]) => void;
  setActiveResultTab: (tab: string) => void;
  setCustomPrompt: (prompt: string) => void;
  clearAll: () => void;
}

const EDITOR_STATE_KEY = 'kk_koreksi_editor_state';
const EDITOR_LEGACY_KEY = 'kk_editor_state';
const EDITOR_LANG_KEY = 'kk_editor_language';
const ANALYSIS_STATE_KEY = 'kk_analysis_state';
const CUSTOM_PROMPT_KEY = 'kk_custom_prompt';

const LANGUAGE_SIBLING_GROUPS: string[][] = [
  ['javascript', 'jsx', 'ts', 'typescript', 'tsx'],
  ['c', 'cpp'],
];

function isSiblingLanguage(a: Language, b: Language): boolean {
  if (a === b) return true;
  return LANGUAGE_SIBLING_GROUPS.some((group) => group.includes(a) && group.includes(b));
}

function loadEditorState(): { files: EditorFile[]; activeFileId: string | null } {
  try {
    const raw = localStorage.getItem(EDITOR_STATE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.files) && parsed.files.length > 0) {
        return {
          files: parsed.files.map((f: any) => ({ ...f, manualLanguage: !!f.manualLanguage })),
          activeFileId: parsed.activeFileId,
        };
      }
    }
  } catch { }
  try {
    const raw = localStorage.getItem(EDITOR_LEGACY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.files) && parsed.files.length > 0) {
        const files = parsed.files.map((f: any) => ({ ...f, manualLanguage: !!f.manualLanguage }));
        localStorage.setItem(EDITOR_STATE_KEY, JSON.stringify({ files, activeFileId: parsed.activeFileId }));
        localStorage.removeItem(EDITOR_LEGACY_KEY);
        return { files, activeFileId: parsed.activeFileId };
      }
    }
  } catch { }
  return { files: [], activeFileId: null };
}

function defaultEditorFile(): EditorFile {
  const lang = (localStorage.getItem(EDITOR_LANG_KEY) as Language) || 'javascript';
  return { id: crypto.randomUUID(), name: 'untitled', language: lang, content: '' };
}

function loadAnalysisState(): { result: AnalysisResult | null; context: AnalysisContext | null } {
  try {
    const raw = localStorage.getItem(ANALYSIS_STATE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed?.result?.errors)) {
        return {
          result: parsed.result as AnalysisResult,
          context: { originalCode: parsed.originalCode ?? null, language: parsed.language ?? null },
        };
      }
      if (Array.isArray(parsed?.errors)) {
        return { result: parsed as AnalysisResult, context: null };
      }
    }
  } catch { }
  return { result: null, context: null };
}

function normalizeHints(value: unknown): IssueHint[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const hints = value
    .map((item) => {
      const raw = (item ?? {}) as Record<string, unknown>;
      const level = raw.level === 2 ? 2 : raw.level === 3 ? 3 : 1;
      const text = typeof raw.text === 'string' ? raw.text.trim() : '';
      const wrongExample = typeof raw.wrongExample === 'string' && raw.wrongExample.trim() ? raw.wrongExample.trim() : undefined;
      const rightExample = typeof raw.rightExample === 'string' && raw.rightExample.trim() ? raw.rightExample.trim() : undefined;
      const hint: IssueHint = { level, text };
      if (wrongExample) hint.wrongExample = wrongExample;
      if (rightExample) hint.rightExample = rightExample;
      return text ? hint : null;
    })
    .filter((h): h is IssueHint => h !== null);
  return hints.length > 0 ? hints : undefined;
}

function normalizeIssues(items: unknown): AnalysisError[] {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => {
      if (typeof item === 'string') {
        return { line: 0, message: item, explanation: '', category: '', severity: 'suggestion' as const };
      }
      const raw = (item ?? {}) as Record<string, unknown>;
      const severity: AnalysisError['severity'] | undefined =
        raw.severity === 'error' ? 'error'
        : raw.severity === 'warning' ? 'warning'
        : raw.severity === 'suggestion' ? 'suggestion'
        : undefined;
      return {
        id: typeof raw.id === 'string' ? raw.id : undefined,
        line: typeof raw.line === 'number' ? raw.line : 0,
        message: typeof raw.message === 'string' ? raw.message : String(raw.message ?? raw.title ?? ''),
        explanation: typeof raw.explanation === 'string' ? raw.explanation : String(raw.explanation ?? raw.fix ?? ''),
        category: typeof raw.category === 'string' ? raw.category : undefined,
        hints: normalizeHints(raw.hints),
        severity,
      };
    })
    .filter((item) => item.message.trim().length > 0);
}

function withIds(items: AnalysisError[], prefix: string): AnalysisError[] {
  return items.map((item, i) => (item.id ? item : { ...item, id: `${prefix}${i + 1}` }));
}

type VulnerabilitySeverity = 'critical' | 'high' | 'medium' | 'low';
const SEVERITY_VALUES: readonly string[] = ['critical', 'high', 'medium', 'low'];

function normalizeSeverity(raw: unknown): VulnerabilitySeverity {
  return SEVERITY_VALUES.includes(String(raw ?? '')) ? (String(raw) as VulnerabilitySeverity) : 'medium';
}

function normalizeLineNumber(raw: unknown): number {
  return typeof raw === 'number' && raw > 0 && Number.isFinite(raw) ? Math.floor(raw) : 0;
}

function normalizeText(raw: unknown): string {
  return typeof raw === 'string' ? raw.trim() : '';
}

function normalizeVulnerabilities(items: unknown): Vulnerability[] | undefined {
  if (!Array.isArray(items) || items.length === 0) return undefined;
  const list = items
    .map((item) => {
      const raw = (item ?? {}) as Record<string, unknown>;
      const message = normalizeText(raw.message);
      if (!message) return null;
      const cwe = normalizeText(raw.cwe);
      return {
        line: normalizeLineNumber(raw.line),
        message,
        severity: normalizeSeverity(raw.severity),
        category: normalizeText(raw.category),
        fix: normalizeText(raw.fix),
        ...(cwe ? { cwe } : {}),
      } satisfies Vulnerability;
    })
    .filter((v): v is Vulnerability => v !== null);
  return list.length > 0 ? list : undefined;
}

function normalizeDuplications(items: unknown): Duplication[] | undefined {
  if (!Array.isArray(items) || items.length === 0) return undefined;
  const list = items
    .map((item) => {
      const raw = (item ?? {}) as Record<string, unknown>;
      const message = normalizeText(raw.message);
      const pair = (raw.duplicatedWith ?? {}) as Record<string, unknown>;
      const hasDuplicate = typeof pair.lineStart === 'number' && typeof pair.lineEnd === 'number';
      if (!message || !hasDuplicate) return null;
      return {
        lineStart: normalizeLineNumber(raw.lineStart),
        lineEnd: normalizeLineNumber(raw.lineEnd),
        message,
        severity: normalizeSeverity(raw.severity),
        category: normalizeText(raw.category),
        fix: normalizeText(raw.fix),
        duplicatedWith: {
          lineStart: normalizeLineNumber(pair.lineStart),
          lineEnd: normalizeLineNumber(pair.lineEnd),
        },
      } satisfies Duplication;
    })
    .filter((d): d is Duplication => d !== null);
  return list.length > 0 ? list : undefined;
}

/**
 * Merges the dedicated security-scan pass findings into a result,
 * deduped against what the main analysis pass already reported.
 */
function mergeSecurityFindings(
  result: AnalysisResult,
  parsed: Record<string, unknown> | null,
): void {
  if (!parsed) return;
  if (typeof parsed === 'object' && 'vulnerabilities' in parsed) {
    const scanned = normalizeVulnerabilities(parsed.vulnerabilities);
    if (scanned) {
      const existing = result.vulnerabilities ?? [];
      const seen = new Set(existing.map((v) => `${v.line}|${v.message}`));
      result.vulnerabilities = [...existing, ...scanned.filter((v) => !seen.has(`${v.line}|${v.message}`))];
    }
  }
  if (typeof parsed === 'object' && 'duplications' in parsed) {
    const scanned = normalizeDuplications(parsed.duplications);
    if (scanned) {
      const existing = result.duplications ?? [];
      const seen = new Set(existing.map((d) => `${d.lineStart}-${d.lineEnd}|${d.message}`));
      result.duplications = [...existing, ...scanned.filter((d) => !seen.has(`${d.lineStart}-${d.lineEnd}|${d.message}`))];
    }
  }
}

function buildAnalysisResult(
  parsed: Record<string, unknown>,
  tokenUsage: { input: number; output: number; model?: string } | undefined,
): AnalysisResult {
  return {
    errors: withIds(normalizeIssues(parsed.errors), 'e'),
    warnings: withIds(normalizeIssues(parsed.warnings), 'w'),
    suggestions: withIds(normalizeIssues(parsed.suggestions), 's'),
    score: Math.max(0, Math.min(100, (parsed.score as number) || 0)),
    concepts: (parsed.concepts as any[]) || [],
    exercise: (parsed.exercise as any) || null,
    metrics: { attempts: 0, hintsOpened: 0 },
    tokenUsage,
    refactoringScore: parsed.refactoringScore as any || undefined,
    vulnerabilities: normalizeVulnerabilities(parsed.vulnerabilities),
    duplications: normalizeDuplications(parsed.duplications),
  };
}

export function collectIssues(result: AnalysisResult): AnalysisError[] {
  return [...result.errors, ...result.warnings, ...result.suggestions];
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const saved = loadEditorState();
  const savedAnalysis = loadAnalysisState();
  const [files, setFilesState] = useState<EditorFile[]>(() => saved.files.length ? saved.files : [defaultEditorFile()]);
  const [activeFileId, setActiveFileId] = useState<string | null>(saved.activeFileId);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(() => savedAnalysis.result);
  const [analysisContextState, setAnalysisContextState] = useState<AnalysisContext | null>(() => savedAnalysis.context);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisErrorType, setAnalysisErrorType] = useState<'modelUnavailable' | 'noApiKey' | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [analysisConfirmOpen, setAnalysisConfirmOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem('kk_theme') as Theme) || 'dark';
  });
  const [providers, setProvidersState] = useState<AIProvider[]>(() => {
    const defaultGemini = { id: 'gemini', name: 'Gemini', endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent', model: 'gemini-3.5-flash', apiKey: '', isDefault: true, recommended: ['gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-2.5-flash'] };
    const defaultGroq = { id: 'groq', name: 'Groq', endpoint: 'https://api.groq.com/openai/v1/chat/completions', model: 'groq/compound-mini', apiKey: '', isDefault: true, recommended: ['groq/compound-mini', 'qwen/qwen3.6-27b', 'openai/gpt-oss-120b'] };
    const defaults = [defaultGemini, defaultGroq];
    try {
      const stored = localStorage.getItem('kk_providers');
      if (stored) {
        const parsed = JSON.parse(stored);
        return defaults.map((dp) => {
          const custom = parsed.find((p: any) => p.id === dp.id);
          return custom ? { ...dp, ...custom, apiKey: custom.apiKey } : dp;
        }).concat(parsed.filter((p: any) => !p.isDefault));
      }
    } catch { }
    return defaults;
  });
  const [activeProvider, setActiveProviderState] = useState<AIProvider>(() => {
    try {
      const activeId = localStorage.getItem('kk_active_provider') || 'gemini';
      const stored = localStorage.getItem('kk_providers');
      const defaults: AIProvider[] = [
        { id: 'gemini', name: 'Gemini', endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent', model: 'gemini-3.5-flash', apiKey: '', isDefault: true, recommended: ['gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-2.5-flash'] },
        { id: 'groq', name: 'Groq', endpoint: 'https://api.groq.com/openai/v1/chat/completions', model: 'groq/compound-mini', apiKey: '', isDefault: true, recommended: ['groq/compound-mini', 'qwen/qwen3.6-27b', 'openai/gpt-oss-120b'] },
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
      return { id: 'gemini', name: 'Gemini', endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent', model: 'gemini-3.5-flash', apiKey: '', isDefault: true, recommended: ['gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-2.5-flash'] };
    }
  });
  const [activeResultTab, setActiveResultTab] = useState(() => {
    return localStorage.getItem('kk_active_result_tab') || 'hasil';
  });
  const [customPrompt, setCustomPromptState] = useState(() => {
    return localStorage.getItem(CUSTOM_PROMPT_KEY) || '';
  });

  const { t } = useTranslation();

  useEffect(() => {
    try {
      localStorage.setItem(EDITOR_STATE_KEY, JSON.stringify({ files, activeFileId }));
    } catch { }
  }, [files, activeFileId]);

  useEffect(() => {
    const flush = () => {
      try { localStorage.setItem(EDITOR_STATE_KEY, JSON.stringify({ files, activeFileId })); } catch { }
    };
    window.addEventListener('beforeunload', flush);
    return () => window.removeEventListener('beforeunload', flush);
  }, [files, activeFileId]);

  useEffect(() => {
    try {
      if (analysisResult) {
        localStorage.setItem(ANALYSIS_STATE_KEY, JSON.stringify({
          result: analysisResult,
          originalCode: analysisContextState?.originalCode ?? null,
          language: analysisContextState?.language ?? null,
        }));
      } else {
        localStorage.removeItem(ANALYSIS_STATE_KEY);
      }
    } catch { }
  }, [analysisResult, analysisContextState]);

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

  const updateFileLanguage = useCallback((id: string, language: Language) => {
    setFilesState((prev) => prev.map((f) => (f.id === id ? { ...f, language } : f)));
    try { localStorage.setItem(EDITOR_LANG_KEY, language); } catch { }
  }, []);

  const setManualLanguage = useCallback((id: string, language: Language) => {
    setFilesState((prev) => prev.map((f) => (f.id === id ? { ...f, language, manualLanguage: true } : f)));
    try { localStorage.setItem(EDITOR_LANG_KEY, language); } catch { }
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

  const runVerify = useCallback(async () => {
    const file = files.find((f) => f.id === activeFileId);
    if (!file || !file.content.trim()) {
      toast.error(t('analysis.noCode'));
      return;
    }
    if (!analysisResult || !analysisContextState?.originalCode || !analysisContextState.language) {
      toast.error(t('analysis.review.legacyAnalysis'));
      return;
    }
    const issues = collectIssues(analysisResult);
    if (issues.length === 0) {
      toast.error(t('analysis.review.verifyNoIssues'));
      return;
    }
    if (!activeProvider.apiKey) {
      const fallback = providers.find((p) => p.id !== activeProvider.id && p.apiKey);
      if (fallback) {
        setActiveProvider(fallback);
      } else {
        showApiKeyNotification();
        return;
      }
    }

    setIsVerifying(true);
    setVerifyError(null);
    try {
      const verify = getVerifier(analysisContextState.language);
      const result = await verify({
        language: analysisContextState.language,
        originalCode: analysisContextState.originalCode,
        modifiedCode: file.content,
        issues,
        provider: activeProvider,
      });
      setAnalysisResult((prev) => {
        if (!prev) return prev;
        const metrics: ReviewMetrics = {
          attempts: (prev.metrics?.attempts ?? 0) + 1,
          hintsOpened: prev.metrics?.hintsOpened ?? 0,
          lastVerdict: result.verdict,
        };
        return { ...prev, metrics };
      });
      setVerifyResult(result);
      if (result.verdict === 'pass') {
        toast.success(t('analysis.review.verdictPassToast'));
      } else {
        toast.error(t('analysis.review.verdictFailToast'));
      }
    } catch (err) {
      let msg: string;
      if (err instanceof ApiError) {
        msg = err.message;
      } else if (err instanceof Error) {
        msg = err.message;
      } else {
        msg = t('analysis.errorUnknown', { error: String(err) });
      }
      setVerifyError(msg);
      toast.error(t('analysis.review.verifyFailed', { error: msg }));
    } finally {
      setIsVerifying(false);
    }
  }, [files, activeFileId, analysisResult, analysisContextState, activeProvider, providers, setActiveProvider, t]);

  const bumpReviewMetrics = useCallback((hintsOpened: number) => {
    if (hintsOpened === 0) return;
    setAnalysisResult((prev) => {
      if (!prev) return prev;
      const metrics: ReviewMetrics = {
        attempts: prev.metrics?.attempts ?? 0,
        hintsOpened: (prev.metrics?.hintsOpened ?? 0) + hintsOpened,
        lastVerdict: prev.metrics?.lastVerdict,
      };
      return { ...prev, metrics };
    });
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
    if (!file.manualLanguage) {
      const detected = detectLanguageFromContent(file.content);
      if (detected !== file.language && !isSiblingLanguage(detected, file.language)) {
        toast.error(t('analysis.languageMismatch', {
          detected: LANG_DISPLAY[detected] || detected,
          current: LANG_DISPLAY[file.language] || file.language,
        }));
        return;
      }
    }
    if (!activeProvider.apiKey) {
      const fallback = providers.find((p) => p.id !== activeProvider.id && p.apiKey);
      if (fallback) {
        setActiveProviderState(fallback);
        localStorage.setItem('kk_active_provider', fallback.id);
      } else {
        setAnalysisErrorType('noApiKey');
        showApiKeyNotification();
        return;
      }
    }
    if (activeProvider.apiKey && (!activeProvider.availableModels || activeProvider.availableModels.length === 0)) {
      let fixedProvider = activeProvider;
      try {
        const models = await fetchAvailableModels(activeProvider);
        if (models.length > 0) {
          fixedProvider = { ...activeProvider, availableModels: models };
          const updated = providers.map((p) => (p.id === fixedProvider.id ? fixedProvider : p));
          setProviders(updated);
          await saveProviders(updated);
          setActiveProviderState(fixedProvider);
          localStorage.setItem('kk_active_provider', fixedProvider.id);
        }
      } catch { }
      if (!fixedProvider.availableModels || fixedProvider.availableModels.length === 0) {
        const fallback = providers.find((p) => p.id !== activeProvider.id && p.apiKey && p.availableModels && p.availableModels.length > 0);
        if (fallback) {
          setActiveProviderState(fallback);
          localStorage.setItem('kk_active_provider', fallback.id);
        } else {
          toast.error(t('settings.validationRequired'));
          return;
        }
      }
    }
    if (!canAnalyze()) {
      toast.error(t('analysis.rateLimit', { remaining: getRateLimitRemaining() }));
      return;
    }

    setIsAnalyzing(true);
    setAnalysisResult(null);
    setAnalysisContextState(null);
    setVerifyResult(null);
    setVerifyError(null);
    setAnalysisError(null);

    try {
      const { text: rawResponse, tokenUsage } = await analyzeCode(file.content, file.language, activeProvider);
      const parsed = parseAnalysisResponse(rawResponse) as Record<string, unknown>;

      const result = buildAnalysisResult(parsed, tokenUsage);
      try {
        const { text: scanRaw } = await scanSecurityDuplication(file.content, file.language, activeProvider);
        // Best-effort secondary pass: a scan failure must not fail the main analysis.
        mergeSecurityFindings(result, parseAnalysisResponse(scanRaw));
      } catch { }
      setAnalysisResult(result);
      setAnalysisContextState({ originalCode: file.content, language: file.language });
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
      let isModelUnavailable = false;
      if (err instanceof ApiError) {
        msg = err.message;
        isModelUnavailable = err.isModelUnavailable;
      } else if (err instanceof Error) {
        msg = err.message;
      } else {
        msg = t('analysis.errorUnknown', { error: String(err) });
      }

      const shouldAutoSwitch = isModelUnavailable || (err instanceof ApiError && [401, 403, 503].includes(err.status));
      if (shouldAutoSwitch) {
        const fallback = providers.find((p) => p.id !== activeProvider.id && p.apiKey);
        if (fallback) {
          setActiveProviderState(fallback);
          localStorage.setItem('kk_active_provider', fallback.id);
          try {
            const { text: rawResponse, tokenUsage } = await analyzeCode(file.content, file.language, fallback);
            const parsed = parseAnalysisResponse(rawResponse) as Record<string, unknown>;
            const result = buildAnalysisResult(parsed, tokenUsage);
            try {
              const { text: scanRaw } = await scanSecurityDuplication(file.content, file.language, fallback);
              // Best-effort secondary pass: a scan failure must not fail the main analysis.
              mergeSecurityFindings(result, parseAnalysisResponse(scanRaw));
            } catch { }
            setAnalysisResult(result);
            setAnalysisContextState({ originalCode: file.content, language: file.language });
            setVerifyResult(null);
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
            } catch { }
            toast.success(t('analysis.autoSwitched', { provider: fallback.name }));
            setIsAnalyzing(false);
            return;
          } catch { }
        }
      }

      setAnalysisError(msg);
      setAnalysisErrorType(isModelUnavailable ? 'modelUnavailable' : null);
      toast.error(t('analysis.analysisFailed', { error: msg }));
    } finally {
      setIsAnalyzing(false);
    }
  }, [files, activeFileId, activeProvider, providers, setProviders, t]);

  const requestAnalysis = useCallback(() => {
    if (isAnalyzing) return;
    if (analysisResult) {
      setAnalysisConfirmOpen(true);
      return;
    }
    void runAnalysis();
  }, [analysisResult, isAnalyzing, runAnalysis]);

  const clearAnalysisError = useCallback(() => { setAnalysisError(null); setAnalysisErrorType(null); }, []);

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
        analysisErrorType,
        setAnalysisError,
        clearAnalysisError,
        runAnalysis,
        requestAnalysis,
        analysisConfirmOpen,
        setAnalysisConfirmOpen,
        runVerify,
        setVerifyResult,
        bumpReviewMetrics,
        isVerifying,
        verifyResult,
        verifyError,
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
        updateFileLanguage,
        setManualLanguage,
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
      <ConfirmModal
        open={analysisConfirmOpen}
        onClose={() => setAnalysisConfirmOpen(false)}
        onConfirm={() => {
          setAnalysisConfirmOpen(false);
          void runAnalysis();
        }}
        title={t('analysis.confirmNewTitle')}
        message={t('analysis.confirmNewDesc')}
        confirmLabel={t('analysis.confirmNewYes')}
        confirmAccent
      />
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
