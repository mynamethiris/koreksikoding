import type { AIProvider, Language } from '@/types';
import type { Extension } from '@codemirror/state';
import { javascript } from '@codemirror/lang-javascript';
import { python, globalCompletion, localCompletionSource } from '@codemirror/lang-python';
import { java } from '@codemirror/lang-java';
import { cpp } from '@codemirror/lang-cpp';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { json } from '@codemirror/lang-json';
import { sql } from '@codemirror/lang-sql';
import { xml } from '@codemirror/lang-xml';
import { yaml } from '@codemirror/lang-yaml';
import { autocompletion } from '@codemirror/autocomplete';
import i18n from '@/lib/i18n';
import { encryptApiKey, decryptApiKey, isEncryptionVersionUpToDate, setEncryptionVersion } from '@/lib/crypto';
import { getAnalysisPrompt, getVerifyPrompt, getSecurityScanPrompt } from '@/lib/prompts';

export class ApiError extends Error {
  public status: number;
  public provider: string;
  public isModelUnavailable: boolean;
  public isRetryable: boolean;
  constructor(message: string, status: number, provider: string, isModelUnavailable = false, isRetryable = false) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.provider = provider;
    this.isModelUnavailable = isModelUnavailable;
    this.isRetryable = isRetryable;
  }
}

const MODEL_BUSY_PATTERN = /busy|overloaded|temporarily unavailable|capacity|saturated|quota exceeded|model_not_found/i;

async function parseErrorResponse(res: Response, provider: AIProvider): Promise<ApiError> {
  const text = await res.text().catch(() => '');
  let detail = '';
  try {
    const data = JSON.parse(text);
    detail =
      (data && (data.error?.message || data.message || data.error?.status || '')) || '';
  } catch {
    detail = text.slice(0, 300);
  }
  const isModelBusy = res.status === 503 || MODEL_BUSY_PATTERN.test(detail);
  const isRetryable = isModelBusy || res.status === 429 || res.status >= 500;
  let message: string;
  if (isModelBusy) {
    message = i18n.t('analysis.errorBusy');
  } else if (res.status === 401) {
    message = i18n.t('analysis.error401');
  } else if (res.status === 403) {
    message = i18n.t('analysis.error403', { model: provider.model });
  } else if (res.status === 404) {
    message = i18n.t('analysis.error404', { model: provider.model });
  } else if (res.status === 429) {
    message = i18n.t('analysis.error429');
  } else {
    message = i18n.t('analysis.apiError', { status: res.status, error: detail });
  }
  return new ApiError(message, res.status, provider.name, isModelBusy, isRetryable);
}

const RETRY_DELAYS_MS = [1500, 3500];

function delay(ms: number): Promise<void> {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

/**
 * Retries provider-side failures (busy model, 429, 5xx) automatically
 * with a short backoff before surfacing the error to the user.
 */
export async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let attempt = 0;
  for (;;) {
    try {
      return await fn();
    } catch (err) {
      if (err instanceof ApiError && err.isRetryable && attempt < RETRY_DELAYS_MS.length) {
        await delay(RETRY_DELAYS_MS[attempt]);
        attempt++;
        continue;
      }
      throw err;
    }
  }
}

const DEFAULT_PROVIDERS: AIProvider[] = [
  {
    id: 'gemini',
    name: 'Gemini',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent',
    model: 'gemini-3.5-flash',
    apiKey: '',
    isDefault: true,
    recommended: ['gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-2.5-flash'],
  },
  {
    id: 'groq',
    name: 'Groq',
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
    model: 'allam-2-7b',
    apiKey: '',
    isDefault: true,
    recommended: ['allam-2-7b', 'qwen/qwen3.8-27b', 'openai/gpt-oss-120b'],
  },
];

const STORAGE_KEY = 'kk_providers';

export async function getProviders(): Promise<AIProvider[]> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      let parsed: AIProvider[] = JSON.parse(stored);

      if (!isEncryptionVersionUpToDate()) {
        parsed = await Promise.all(parsed.map(async (p) => ({
          ...p,
          apiKey: p.apiKey && !p.apiKey.startsWith('enc:v1:')
            ? await encryptApiKey(p.apiKey)
            : p.apiKey,
        })));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
        setEncryptionVersion();
      }

      parsed = await Promise.all(parsed.map(async (p) => ({
        ...p,
        apiKey: await decryptApiKey(p.apiKey),
      })));

      return DEFAULT_PROVIDERS.map((dp) => {
        const custom = parsed.find((p) => p.id === dp.id);
        if (!custom) return dp;
        const model = custom.model || dp.model;
        const isModelValid = !dp.recommended || dp.recommended.length === 0 || dp.recommended.includes(model);
        return { ...dp, apiKey: custom.apiKey, model: isModelValid ? model : dp.model, availableModels: custom.availableModels || dp.availableModels };
      }).concat(parsed.filter((p) => !p.isDefault));
    }
  } catch { }
  return [...DEFAULT_PROVIDERS];
}

export async function saveProviders(providers: AIProvider[]): Promise<void> {
  const encrypted = await Promise.all(providers.map(async (p) => ({
    ...p,
    apiKey: await encryptApiKey(p.apiKey),
  })));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(encrypted));
  setEncryptionVersion();
}

export async function getActiveProvider(): Promise<AIProvider> {
  const providers = await getProviders();
  const activeId = localStorage.getItem('kk_active_provider') || 'gemini';
  return providers.find((p) => p.id === activeId) || providers[0];
}

function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || '';
}

export const LANGUAGES: Language[] = [
  'python', 'javascript', 'typescript', 'jsx', 'tsx', 'java', 'c', 'cpp',
  'cs', 'go', 'rust', 'php', 'ruby', 'kotlin', 'swift', 'dart',
  'html', 'css', 'sql', 'json', 'xml', 'yaml',
];

export const LANG_DISPLAY: Record<string, string> = {
  python: 'Python', javascript: 'JavaScript', typescript: 'TypeScript', jsx: 'JSX', tsx: 'TSX',
  java: 'Java', c: 'C', cpp: 'C++', cs: 'C#', go: 'Go', rust: 'Rust',
  php: 'PHP', ruby: 'Ruby', kotlin: 'Kotlin', swift: 'Swift', dart: 'Dart',
  html: 'HTML', css: 'CSS', sql: 'SQL', json: 'JSON', xml: 'XML', yaml: 'YAML',
};

export function detectLanguage(filename: string): Language {
  const ext = getFileExtension(filename);
  const map: Record<string, Language> = {
    py: 'python',
    js: 'javascript',
    ts: 'typescript',
    jsx: 'jsx',
    tsx: 'tsx',
    java: 'java',
    c: 'c',
    cpp: 'cpp',
    cs: 'cs',
    go: 'go',
    rs: 'rust',
    php: 'php',
    rb: 'ruby',
    kt: 'kotlin',
    swift: 'swift',
    dart: 'dart',
    html: 'html',
    css: 'css',
    sql: 'sql',
    json: 'json',
    xml: 'xml',
    yml: 'yaml',
    yaml: 'yaml',
  };
  return map[ext] || 'javascript';
}

export function detectLanguageFromContent(code: string): Language {
  const s = code.trim();
  if (s.length < 30) return 'javascript';

  try { JSON.parse(s); return 'json'; } catch {}

  if (s.startsWith('<?xml') || /^[a-zA-Z][\w-]*\s*=/.test(s)) return 'xml';
  if (s.startsWith('---') || /^[\w-]+:\s/m.test(s)) return 'yaml';
  if (/^<!DOCTYPE|^<html|^<head|^<body|^<div|^<section|^<main|^<title|^<meta|^<link|^<script|^<style|^<header|^<footer|^<nav|^<article|^<aside|^<figure|^<p>|^<span|^<ul|^<ol|^<li|^<h[1-6]|^<a\s|^<img|^<button|^<input|^<form|^<table/m.test(s)) return 'html';
  if (s.startsWith('<') && s.includes('</')) return 'xml';
  if (/^@(media|import|keyframes|font-face)|^\.[\w-]+\s*\{|^[\w-]+\s*\{/m.test(s)) return 'css';
  if (/^SELECT\s|^INSERT\s|^CREATE\s|^ALTER\s|^DROP\s|^UPDATE\s|^DELETE\s/m.test(s)) return 'sql';
  if (/^#include\s|^int\s+main|^void\s|^printf\(|^cout\s|^cin\s/m.test(s)) return 'c';
  if (/^package\s|^func\s|^import\s*\(/m.test(s)) return 'go';
  if (/^def\s|^self\.|^elif\s|^class\s+\w+|^print\(|^if\s+__name__/m.test(s)) return 'python';
  if (/^public\s+class|^private\s|^System\.out/m.test(s)) return 'java';
  if (/^<\?php|^\$\w+/m.test(s)) return 'php';
  if (/:\s*string|:\s*number|interface\s|^type\s+\w+|as\s+\w+/m.test(s)) return 'typescript';
  if (/function\s|^const\s|^let\s|^var\s|=>|console\.log|export\s+default|export\s+(const|function|class)/m.test(s)) return 'javascript';
  return 'javascript';
}

export function getLanguageExtension(lang: Language): Extension {
  const map: Record<Language, () => Extension> = {
    python: () => [
      python(),
      autocompletion({
        override: [globalCompletion, localCompletionSource],
      }),
    ],
    javascript: () => javascript(),
    typescript: () => javascript({ typescript: true }),
    jsx: () => javascript({ jsx: true }),
    tsx: () => javascript({ jsx: true, typescript: true }),
    java: () => java(),
    c: () => cpp(),
    cpp: () => cpp(),
    cs: () => javascript(),
    go: () => javascript(),
    rust: () => javascript(),
    php: () => javascript(),
    ruby: () => javascript(),
    kotlin: () => java(),
    swift: () => javascript(),
    dart: () => javascript(),
    html: () => html(),
    css: () => css(),
    sql: () => sql(),
    json: () => json(),
    xml: () => xml(),
    yaml: () => yaml(),
    plaintext: () => [],
  };
  return (map[lang] || (() => javascript()))() as Extension;
}

export async function testConnection(provider: AIProvider): Promise<{ success: boolean; message: string }> {
  try {
    if (provider.id === 'gemini') {
      const url = `${provider.endpoint}?key=${provider.apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Hello, respond with OK' }] }],
          generationConfig: { maxOutputTokens: 10 },
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        return { success: false, message: `Model ${provider.model} tidak aktif (${res.status}): ${data.error?.message || res.statusText}` };
      }
      return { success: true, message: `Koneksi berhasil! API Key valid, model ${provider.model} aktif.` };
    }

    const res = await fetch(provider.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${provider.apiKey}`,
      },
      body: JSON.stringify({
        model: provider.model,
        messages: [{ role: 'user', content: 'Hello, respond with OK' }],
        max_tokens: 10,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { success: false, message: `Model ${provider.model} tidak aktif (${res.status}): ${data.error?.message || res.statusText}` };
    }
    return { success: true, message: `Koneksi berhasil! API Key valid, model ${provider.model} aktif.` };
  } catch (err) {
    return { success: false, message: `Gagal menghubungi server: ${err instanceof Error ? err.message : 'Kesalahan tidak diketahui'}` };
  }
}

export async function fetchAvailableModels(provider: AIProvider): Promise<string[]> {
  try {
    if (provider.id === 'gemini') {
      const base = provider.endpoint.replace(/\/models\/[^/]+:generateContent$/, '');
      const res = await fetch(`${base}/models?key=${provider.apiKey}`);
      if (!res.ok) return [];
      const data = await res.json();
      const models: string[] = (data.models || [])
        .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
        .map((m: any) => m.name?.replace('models/', '') || '')
        .filter(Boolean);
      return models.length > 0 ? models : [];
    }

    const base = provider.endpoint.replace(/\/chat\/completions$/, '');
    const res = await fetch(`${base}/models`, {
      headers: { Authorization: `Bearer ${provider.apiKey}` },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.data || []).map((m: any) => m.id).filter(Boolean);
  } catch {
    return [];
  }
}

export function getFileExtensionForLanguage(lang: string): string {
  const map: Record<string, string> = {
    python: 'py', javascript: 'js', typescript: 'ts', jsx: 'jsx', tsx: 'tsx',
    java: 'java', c: 'c', cpp: 'cpp', cs: 'cs', go: 'go', rust: 'rs',
    php: 'php', ruby: 'rb', kotlin: 'kt', swift: 'swift', dart: 'dart',
    html: 'html', css: 'css', sql: 'sql', json: 'json', xml: 'xml', yaml: 'yml',
  };
  return map[lang] || 'txt';
}

export function getCommunityLinks(errorMessage: string, language: string): { title: string; url: string }[] {
  const q = encodeURIComponent(`${errorMessage} ${language}`);
  return [
    { title: 'Google Search', url: `https://www.google.com/search?q=${q}+error+fix` },
    { title: 'Stack Overflow', url: `https://stackoverflow.com/search?q=${q}` },
  ];
}

export { getAnalysisPrompt, getVerifyPrompt, getSecurityScanPrompt, getConvertPrompt, getTerminalErrorPrompt } from '@/lib/prompts';

function stripThinkingBlocks(text: string): string {
  if (!text) return '';
  return text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
}

async function sendAnalysisRequest(
  code: string,
  language: Language,
  provider: AIProvider,
  customPrompt?: string,
): Promise<{ text: string; tokenUsage?: { input: number; output: number; model?: string } }> {
  const prompt = getAnalysisPrompt(customPrompt).replace('{language}', language);

  if (provider.id === 'gemini') {
    const url = `${provider.endpoint}?key=${provider.apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${prompt}\n\nKode:\n\`\`\`${language}\n${code}\n\`\`\`` }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0 },
      }),
    });
    if (!res.ok) throw await parseErrorResponse(res, provider);
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const tokenUsage = data.usageMetadata ? {
      input: data.usageMetadata.promptTokenCount || 0,
      output: data.usageMetadata.candidatesTokenCount || 0,
      model: provider.model,
    } : undefined;
    return { text, tokenUsage };
  }

  const res = await fetch(provider.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${provider.apiKey}`,
    },
    body: JSON.stringify({
      model: provider.model,
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: `${i18n.language === 'en' ? 'Analyze this code:' : 'Analisis kode ini:'}\n\`\`\`${language}\n${code}\n\`\`\`` },
      ],
      temperature: 0,
      max_tokens: 4096,
    }),
  });
  if (!res.ok) throw await parseErrorResponse(res, provider);
  const data = await res.json();
  const msg = data.choices?.[0]?.message;
  const content = msg?.content || '';
  const reasoning = msg?.reasoning || '';
  const stripped = stripThinkingBlocks(content);
  let text = stripped || content || reasoning || '';
  const tokenUsage = data.usage ? {
    input: data.usage.prompt_tokens || 0,
    output: data.usage.completion_tokens || 0,
    model: provider.model,
  } : undefined;
  return { text, tokenUsage };
}

export function analyzeCode(
  code: string,
  language: Language,
  provider: AIProvider,
  customPrompt?: string,
): Promise<{ text: string; tokenUsage?: { input: number; output: number; model?: string } }> {
  return withRetry(() => sendAnalysisRequest(code, language, provider, customPrompt));
}

/**
 * Dedicated second-pass scan: fills only `vulnerabilities` and `duplications`.
 * Kept separate from the main analysis so both tabs stay reliable even when
 * the main pass omits them.
 */
async function sendSecurityScanRequest(
  code: string,
  language: Language,
  provider: AIProvider,
): Promise<{ text: string }> {
  const prompt = getSecurityScanPrompt(language);

  if (provider.id === 'gemini') {
    const url = `${provider.endpoint}?key=${provider.apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${prompt}\n\nKode:\n\`\`\`${language}\n${code}\n\`\`\`` }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0 },
      }),
    });
    if (!res.ok) throw await parseErrorResponse(res, provider);
    const data = await res.json();
    return { text: data.candidates?.[0]?.content?.parts?.[0]?.text || '' };
  }

  const res = await fetch(provider.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${provider.apiKey}`,
    },
    body: JSON.stringify({
      model: provider.model,
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: `${i18n.language === 'en' ? 'Scan this code:' : 'Pindai kode ini:'}\n\`\`\`${language}\n${code}\n\`\`\`` },
      ],
      temperature: 0,
      max_tokens: 2048,
    }),
  });
  if (!res.ok) throw await parseErrorResponse(res, provider);
  const data = await res.json();
  const msg = data.choices?.[0]?.message;
  const content = msg?.content || '';
  const stripped = stripThinkingBlocks(content);
  return { text: stripped || content || msg?.reasoning || '' };
}

export function scanSecurityDuplication(
  code: string,
  language: Language,
  provider: AIProvider,
): Promise<{ text: string }> {
  return withRetry(() => sendSecurityScanRequest(code, language, provider));
}

async function sendVerifyRequest(
  input: { originalCode: string; modifiedCode: string; issues: unknown },
  language: Language,
  provider: AIProvider,
  customPrompt?: string,
): Promise<{ text: string; tokenUsage?: { input: number; output: number; model?: string } }> {
  const prompt = getVerifyPrompt(customPrompt);
  const en = i18n.language === 'en';
  const userMessage = en
    ? `Original code (before the fix):\n\`\`\`${language}\n${input.originalCode}\n\`\`\`\n\nKnown issues:\n${JSON.stringify(input.issues, null, 2)}\n\nStudent's code to grade:\n\`\`\`${language}\n${input.modifiedCode}\n\`\`\``
    : `Kode asli (sebelum perbaikan):\n\`\`\`${language}\n${input.originalCode}\n\`\`\`\n\nDaftar isu yang diketahui:\n${JSON.stringify(input.issues, null, 2)}\n\nKode siswa yang harus dinilai:\n\`\`\`${language}\n${input.modifiedCode}\n\`\`\``;

  if (provider.id === 'gemini') {
    const url = `${provider.endpoint}?key=${provider.apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${prompt}\n\n${userMessage}` }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0 },
      }),
    });
    if (!res.ok) throw await parseErrorResponse(res, provider);
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const tokenUsage = data.usageMetadata ? {
      input: data.usageMetadata.promptTokenCount || 0,
      output: data.usageMetadata.candidatesTokenCount || 0,
      model: provider.model,
    } : undefined;
    return { text, tokenUsage };
  }

  const res = await fetch(provider.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${provider.apiKey}`,
    },
    body: JSON.stringify({
      model: provider.model,
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: userMessage },
      ],
      temperature: 0,
      max_tokens: 4096,
    }),
  });
  if (!res.ok) throw await parseErrorResponse(res, provider);
  const data = await res.json();
  const msg = data.choices?.[0]?.message;
  const content = msg?.content || '';
  const reasoning = msg?.reasoning || '';
  const stripped = stripThinkingBlocks(content);
  const text = stripped || content || reasoning || '';
  const tokenUsage = data.usage ? {
    input: data.usage.prompt_tokens || 0,
    output: data.usage.completion_tokens || 0,
    model: provider.model,
  } : undefined;
  return { text, tokenUsage };
}

function stripCodeFences(code: string): string {
  if (!code) return code;
  let s = code.trim();
  s = s.replace(/^```(?:\w*)\s*\n?/, '').replace(/\n?```\s*$/, '');
  return s.trim();
}

export function verifyFix(
  input: { originalCode: string; modifiedCode: string; issues: unknown },
  language: Language,
  provider: AIProvider,
  customPrompt?: string,
): Promise<{ text: string; tokenUsage?: { input: number; output: number; model?: string } }> {
  return withRetry(() => sendVerifyRequest(input, language, provider, customPrompt));
}

export function sanitizeFixedCode(raw: string): string {
  if (!raw) return '';
  let s = stripCodeFences(raw);
  if (!s) return '';
  const langPattern = /^(python|javascript|typescript|jsx|tsx|java|c|cpp|cs|go|rust|php|ruby|kotlin|swift|dart|html|css|sql|json|xml|yaml)\s*\n/i;
  s = s.replace(langPattern, '');
  return s.trim();
}

export function parseAnalysisResponse(raw: string): Record<string, unknown> {
  return extractJSON(raw);
}

export function extractJSON(raw: string): Record<string, unknown> {
  let cleaned = raw.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  cleaned = cleaned.replace(/```(?:json)?\s*\n?/g, '').replace(/\n?```\s*$/g, '').trim();
  let idx = cleaned.indexOf('{');
  while (idx !== -1) {
    let depth = 0;
    let inString = false;
    let escape = false;
    const slice = cleaned.slice(idx);
    for (let i = 0; i < slice.length; i++) {
      const ch = slice[i];
      if (escape) { escape = false; continue; }
      if (ch === '\\') { escape = true; continue; }
      if (ch === '"') { inString = !inString; continue; }
      if (inString) continue;
      if (ch === '{') depth++;
      if (ch === '}') {
        depth--;
        if (depth === 0) {
          const candidate = slice.slice(0, i + 1);
          try { return JSON.parse(candidate); } catch { break; }
        }
      }
    }
    idx = cleaned.indexOf('{', idx + 1);
  }
  throw new Error('Tidak ada JSON yang valid dalam respons');
}

const RATE_LIMIT_KEY = 'kk_rate_limit';
const ANALYSIS_LIMIT = 20;
const HOUR_MS = 3600000;

function loadRateLimit(): { count: number; windowStart: number } {
  try {
    const raw = localStorage.getItem(RATE_LIMIT_KEY);
    if (raw) return JSON.parse(raw);
  } catch { }
  return { count: 0, windowStart: Date.now() };
}

function saveRateLimit(count: number, windowStart: number): void {
  localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify({ count, windowStart }));
}

export function canAnalyze(): boolean {
  const { count, windowStart } = loadRateLimit();
  const now = Date.now();
  if (now - windowStart > HOUR_MS) return true;
  return count < ANALYSIS_LIMIT;
}

export function recordAnalysis(): void {
  const { count, windowStart } = loadRateLimit();
  const now = Date.now();
  const newStart = now - windowStart > HOUR_MS ? now : windowStart;
  const newCount = now - windowStart > HOUR_MS ? 1 : count + 1;
  saveRateLimit(newCount, newStart);
}

export function getRateLimitRemaining(): number {
  const { count, windowStart } = loadRateLimit();
  const now = Date.now();
  if (now - windowStart > HOUR_MS) return ANALYSIS_LIMIT;
  return Math.max(0, ANALYSIS_LIMIT - count);
}

export function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function exportToJSON(data: unknown): string {
  return JSON.stringify(data, null, 2);
}

export function exportToCSV(headers: string[], rows: string[][]): string {
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  return [headers.map(escape).join(','), ...rows.map((r) => r.map(escape).join(','))].join('\n');
}

export function exportToMarkdown(title: string, data: Record<string, unknown>): string {
  let md = `# ${title}\n\n`;
  for (const [key, value] of Object.entries(data)) {
    md += `## ${key}\n\n`;
    if (typeof value === 'string') {
      md += `${value}\n\n`;
    } else if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === 'object' && item !== null) {
          for (const [k, v] of Object.entries(item as Record<string, unknown>)) {
            md += `- **${k}**: ${v}\n`;
          }
          md += '\n';
        } else {
          md += `- ${item}\n`;
        }
      }
      md += '\n';
    } else if (typeof value === 'object' && value !== null) {
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        md += `- **${k}**: ${v}\n`;
      }
      md += '\n';
    }
  }
  return md;
}

export function downloadFile(content: string, filename: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 100);
}
