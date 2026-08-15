import i18n from '@/lib/i18n';

export const ANALYSIS_PROMPT_ID = `Analisis kode {language}. Kembalikan JSON valid.

ATURAN VALIDASI:
- Jika input BUKAN kode yang valid (hanya komentar tanpa kode, teks acak, kalimat tidak jelas, omong kosong), kembalikan JSON dengan errors/warnings/suggestions kosong, score 0, fixedCode berisi "Input tidak valid: ini bukan kode {language} yang dikenali.", dan explanation berisi penjelasan bahwa input bukan kode.
- Jika input adalah kode yang valid (meski minimalis), analisis seperti biasa.
- Jika kode sudah bersih (tidak ada error/warning/saran), beri score 100, fixedCode sama dengan kode asli, dan kirimkan suggestion minimal "Kode sudah baik".

OUTPUT SCHEMA (JSON, tidak ada teks tambahan, tidak ada markdown fence):
{"errors":[{"line":0,"message":"","explanation":"","category":"(syntax|runtime|logic|security|performance|naming|readability|refactor)"}],"warnings":[...],"suggestions":[...],
"score":0-100,"fixedCode":"<kod dalam bahasa {language} yang sama>","changes":["<deskripsi perubahan>"],"explanation":[{"errorType":"","cause":"","fix":"","wrongCode":"","correctCode":"","tip":""}],"concepts":[{"title":"","summary":"","content":""}],"refactoringScore":{"readability":0,"maintainability":0,"complexity":0,"naming":0,"overall":0},"vulnerabilities":[{"line":0,"message":"","severity":"critical|high|medium|low","category":"","fix":"","cwe":""}],"duplications":[{"lineStart":0,"lineEnd":0,"message":"","severity":"critical|high|medium|low","category":"","fix":"","duplicatedWith":{"lineStart":0,"lineEnd":0}}]}

ATURAN ANALISIS:
- Periksa: syntax, runtime, logic, security, performance, naming, readability, refactor.
- Scan juga vulnerability (CWE jika bisa) dan code duplication.
- line number dihitung dari 1 (1-indexed).
- score = 100 - (errors*10 + warnings*5 + suggestions*2), minimum 0.
- PENTING: fixedCode HARUS dalam bahasa yang SAMA ({language}) dengan kode sumber. JANGAN konversi ke bahasa lain.
- Semua teks dalam bahasa Indonesia. JSON only.`;

export const ANALYSIS_PROMPT_EN = `Analyze {language} code. Return valid JSON.

VALIDATION RULES:
- If the input is NOT valid code (only comments without code, random text, unclear sentences, gibberish), return JSON with empty errors/warnings/suggestions, score 0, fixedCode containing "Invalid input: this is not recognized {language} code.", and explanation explaining the input is not code.
- If the input IS valid code (even minimal), analyze normally.
- If the code is already clean (no errors/warnings/suggestions), give score 100, fixedCode identical to source, and at least one suggestion "Code is already good".

OUTPUT SCHEMA (JSON, no extra text, no markdown fence):
{"errors":[{"line":0,"message":"","explanation":"","category":"(syntax|runtime|logic|security|performance|naming|readability|refactor)"}],"warnings":[...],"suggestions":[...],
"score":0-100,"fixedCode":"<same language {language}>","changes":["<description>"],"explanation":[{"errorType":"","cause":"","fix":"","wrongCode":"","correctCode":"","tip":""}],"concepts":[{"title":"","summary":"","content":""}],"refactoringScore":{"readability":0,"maintainability":0,"complexity":0,"naming":0,"overall":0},"vulnerabilities":[{"line":0,"message":"","severity":"critical|high|medium|low","category":"","fix":"","cwe":""}],"duplications":[{"lineStart":0,"lineEnd":0,"message":"","severity":"critical|high|medium|low","category":"","fix":"","duplicatedWith":{"lineStart":0,"lineEnd":0}}]}

ANALYSIS RULES:
- Check: syntax, runtime, logic, security, performance, naming, readability, refactor.
- Also scan security vulnerabilities (CWE if available) and code duplication.
- Line numbers start at 1 (1-indexed).
- score = 100 - (errors*10 + warnings*5 + suggestions*2), minimum 0.
- IMPORTANT: fixedCode MUST be in the SAME language ({language}) as the source code. Do NOT convert to another language.
- All text in English. JSON only.`;

export function getAnalysisPrompt(customPrompt?: string): string {
  if (customPrompt?.trim()) return customPrompt.trim();
  return i18n.language === 'en' ? ANALYSIS_PROMPT_EN : ANALYSIS_PROMPT_ID;
}

export const TERMINAL_ERROR_PROMPT_ID = `Analisis input terminal ini. Kembalikan JSON valid (tidak ada teks tambahan, tidak ada markdown fence).

ATURAN VALIDASI:
- Jika input BUKAN error terminal yang valid (mis. teks acak, omong kosong, bukan pesan error), kembalikan JSON dengan errors kosong, fixedCode berisi "Input tidak valid: ini bukan error terminal yang dikenali.", dan explanation menjelaskan input bukan error.
- Jika input adalah error terminal yang valid (mis. ECONNREFUSED, ENOENT, SyntaxError, TypeError, command not found, dll), analisis seperti biasa.
- Pastikan terminal prompt "$ " tidak diperlakukan sebagai error. Hanya analisis bagian error saja.

FORMAT KELUARAN JSON:
{"errors":[{"line":0,"command":"","message":"","explanation":"","category":"(shell|runtime|syntax|dependency|config|network)"}],"suggestions":[{"line":0,"message":"","explanation":"","category":""}],"fixedCode":"// perintah yang benar atau kode yang diperbaiki","explanation":[{"errorType":"","cause":"","fix":"","wrongCode":"","correctCode":"","tip":""}],"concepts":[{"title":"","summary":"","content":""}]}
- Jika error berupa perintah shell, berikan saran perintah yang benar di fixedCode. Jika error berupa kode, berikan perbaikan kodenya. fixedCode hanya berisi perintah/kode, tidak ada penjelasan tambahan.
- Semua teks dalam bahasa Indonesia. JSON only.`;

export const TERMINAL_ERROR_PROMPT_EN = `Analyze terminal input. Return valid JSON (no extra text, no markdown fence).

VALIDATION RULES:
- If the input is NOT a valid terminal error (e.g., random text, gibberish, not an error message), return JSON with empty errors, fixedCode containing "Invalid input: this is not a recognized terminal error.", and explanation explaining the input is not an error.
- If the input IS a valid terminal error (ECONNREFUSED, ENOENT, SyntaxError, TypeError, command not found, etc.), analyze normally.
- A shell prompt like "$ " is NOT an error. Only analyze the error portion.

OUTPUT FORMAT JSON:
{"errors":[{"line":0,"command":"","message":"","explanation":"","category":"(shell|runtime|syntax|dependency|config|network)"}],"suggestions":[{"line":0,"message":"","explanation":"","category":""}],"fixedCode":"// correct command or fixed code","explanation":[{"errorType":"","cause":"","fix":"","wrongCode":"","correctCode":"","tip":""}],"concepts":[{"title":"","summary":"","content":""}]}
- If the error is a shell command, provide the correct command in fixedCode. If the error is code, provide the fixed code. fixedCode should ONLY contain the command/code, no explanations.
- All text in English. JSON only.`;

export function getTerminalErrorPrompt(): string {
  return i18n.language === 'en' ? TERMINAL_ERROR_PROMPT_EN : TERMINAL_ERROR_PROMPT_ID;
}

export const CONVERT_PROMPT_ID = `Konversi kode ini ke bahasa {language}. Return valid JSON.

ATURAN VALIDASI:
- Jika input BUKAN kode yang valid (hanya komentar, teks acak, kalimat tidak jelas, omong kosong), kembalikan JSON dengan convertedCode berisi "Input tidak valid: ini bukan kode yang dikenali.", explanation berisi penjelasan, differences dan warnings kosong.
- Jika input adalah kode yang valid, konversi seperti biasa.

Return valid JSON:
{"convertedCode":"...","explanation":"...","differences":["..."],"warnings":["..."]}
Gunakan syntax yang benar dan idiomatik di bahasa target. Jangan tambahkan komentar kecuali memang ada di kode sumber. JSON only.`;

export const CONVERT_PROMPT_EN = `Convert this code to {language}. Return valid JSON.

VALIDATION RULES:
- If the input is NOT valid code (only comments, random text, unclear sentences, gibberish), return JSON with convertedCode containing "Invalid input: this is not recognized code.", explanation explaining the input, and empty differences/warnings.
- If the input IS valid code, convert normally.

Return valid JSON:
{"convertedCode":"...","explanation":"...","differences":["..."],"warnings":["..."]}
Use correct and idiomatic syntax in the target language. Do not add comments unless they exist in the source code. JSON only.`;

export function getConvertPrompt(language: string): string {
  const prompt = i18n.language === 'en' ? CONVERT_PROMPT_EN : CONVERT_PROMPT_ID;
  return prompt.replace('{language}', language);
}