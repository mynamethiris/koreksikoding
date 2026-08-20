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
import { getAnalysisPrompt } from '@/lib/prompts';

export class ApiError extends Error {
  public status: number;
  public provider: string;
  public isModelUnavailable: boolean;
  constructor(message: string, status: number, provider: string, isModelUnavailable = false) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.provider = provider;
    this.isModelUnavailable = isModelUnavailable;
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
  let message: string;
  if (isModelBusy) {
    message = i18n.t('analysis.error503');
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
  return new ApiError(message, res.status, provider.name, isModelBusy);
}

const DEFAULT_PROVIDERS: AIProvider[] = [
  {
    id: 'gemini',
    name: 'Gemini',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
    model: 'gemini-2.0-flash',
    apiKey: '',
    isDefault: true,
    recommended: ['gemini-2.0-flash', 'gemini-2.0-flash-thinking-exp', 'gemini-1.5-flash', 'gemini-1.5-pro'],
  },
  {
    id: 'groq',
    name: 'Groq',
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
    model: 'groq/compound-mini',
    apiKey: '',
    isDefault: true,
    recommended: ['groq/compound-mini', 'qwen/qwen3.6-27b', 'openai/gpt-oss-120b'],
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
        return custom ? { ...dp, apiKey: custom.apiKey, model: custom.model || dp.model } : dp;
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
  if (/^def\s|^import\s|^self\.|^elif\s|^class\s+\w+|^print\(|^if\s+__name__/m.test(s)) return 'python';
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
        return { success: false, message: `HTTP ${res.status}: ${data.error?.message || res.statusText}` };
      }
      return { success: true, message: 'Koneksi berhasil! API Key valid.' };
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
      return { success: false, message: `HTTP ${res.status}: ${data.error?.message || res.statusText}` };
    }
    return { success: true, message: 'Koneksi berhasil! API Key valid.' };
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

export { getAnalysisPrompt, getConvertPrompt, getTerminalErrorPrompt } from '@/lib/prompts';

export async function analyzeCode(
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
        generationConfig: { responseMimeType: 'application/json' },
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
      temperature: 0.1,
    }),
  });
  if (!res.ok) throw await parseErrorResponse(res, provider);
  const data = await res.json();
  const msg = data.choices?.[0]?.message;
  const text = msg?.content || msg?.reasoning || '';
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

export function sanitizeFixedCode(raw: string): string {
  if (!raw) return '';
  let s = stripCodeFences(raw);
  if (!s) return '';
  const langPattern = /^(python|javascript|typescript|jsx|tsx|java|c|cpp|cs|go|rust|php|ruby|kotlin|swift|dart|html|css|sql|json|xml|yaml)\s*\n/i;
  s = s.replace(langPattern, '');
  return s.trim();
}

export function parseAnalysisResponse(raw: string): Record<string, unknown> {
  let cleaned = raw.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Tidak ada JSON yang valid dalam respons');
  const parsed = JSON.parse(jsonMatch[0]);
  if (parsed.fixedCode && typeof parsed.fixedCode === 'string') {
    parsed.fixedCode = sanitizeFixedCode(parsed.fixedCode);
  }
  return parsed;
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

export function sanitizeCode(code: string): string {
  return code
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<\s*(?:iframe|object|embed|svg|link|style|base)\b[^>]*>/gi, '')
    .replace(/on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/javascript\s*:/gi, '')
    .slice(0, 50000);
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
