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

const DEFAULT_PROVIDERS: AIProvider[] = [
  {
    id: 'gemini',
    name: 'Gemini',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
    model: 'gemini-2.5-flash',
    apiKey: '',
    isDefault: true,
  },
  {
    id: 'groq',
    name: 'Groq',
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
    model: 'qwen3-32b',
    apiKey: '',
    isDefault: true,
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
  return map[ext] || ext || 'javascript';
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
    if (!res.ok) throw new Error(`API error: ${res.status}`);
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
      response_format: { type: 'json_object' },
    }),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || '';
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
