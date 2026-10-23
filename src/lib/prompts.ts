import i18n from '@/lib/i18n';

export const ANALYSIS_PROMPT_ID = `Analisis kode {language}. Kembalikan JSON valid.

ATURAN VALIDASI:
- Jika input BUKAN kode yang valid (hanya komentar tanpa kode, teks acak, kalimat tidak jelas, omong kosong), kembalikan JSON dengan errors berisi satu item {"id":"e1","line":0,"message":"Input tidak valid: ini bukan kode {language} yang dikenali.","explanation":"...","category":"syntax","hints":[...]} dan score 0, warnings/suggestions kosong.
- Jika input adalah kode yang valid (meski minimalis), analisis seperti biasa.
- Jika kode sudah bersih (tidak ada error/warning/saran), beri score 100 dan kirimkan suggestion minimal dengan message "Kode sudah baik".

OUTPUT SCHEMA (JSON, tidak ada teks tambahan, tidak ada markdown fence):
{"errors":[{"id":"e1","line":0,"message":"","explanation":"","category":"(syntax|runtime|logic|security|performance|naming|readability|refactor)","hints":[{"level":1,"text":"","wrongExample":"","rightExample":""},{"level":2,"text":"","wrongExample":"","rightExample":""},{"level":3,"text":"","wrongExample":"","rightExample":""}]}],"warnings":[{"id":"w1","line":0,"message":"","explanation":"","category":"...","hints":[...]}],"suggestions":[{"id":"s1","line":0,"message":"","explanation":"","category":"...","hints":[...]}],
"score":0-100,"concepts":[{"title":"","summary":"","content":""}],"refactoringScore":{"readability":0,"maintainability":0,"complexity":0,"naming":0,"overall":0},"vulnerabilities":[{"line":0,"message":"","severity":"critical|high|medium|low","category":"","fix":"","cwe":""}],"duplications":[{"lineStart":0,"lineEnd":0,"message":"","severity":"critical|high|medium|low","category":"","fix":"","duplicatedWith":{"lineStart":0,"lineEnd":0}}]}

ATURAN ANALISIS:
- Periksa: syntax, runtime, logic, security, performance, naming, readability, refactor.
- Scan juga vulnerability (CWE jika bisa) dan code duplication.
- line number dihitung dari 1 (1-indexed). id pada errors dimulai e1, e2, dst; warnings w1, w2, dst; suggestions s1, s2, dst.
- score = 100 - (errors*10 + warnings*5 + suggestions*2), minimum 0.

ATURAN KONSISTENSI (WAJIB):
- Pindai kode secara sistematis baris demi baris dari baris 1 sampai terakhir sebelum menilai; setiap isu nyata HARUS terdeteksi dan dilaporkan, sekecil apa pun.
- HARUS deterministik: untuk masukan yang sama, id, jumlah isu, dan nomor baris harus selalu sama. Nomor baris adalah nomor baris persis tempat isu berada di kode asli; DILARANG menggeser, membulatkan, atau menebak.
- DILARANG mengarang isu yang tidak terbukti dari kode, dan DILARANG melewatkan isu yang jelas.
- Isu yang sama menimpa beberapa baris dilaporkan terpisah per baris, masing-masing dengan nomor barisnya sendiri.
- "line: 0" hanya untuk isu tingkat berkas (mis. penamaan global), bukan untuk isu yang punya lokasi.
- Setiap isu HARUS menyebut bukti nyata dari kode di message/explanation: konstruksi spesifik yang terlihat di baris itu (nama fungsi, variabel, ekspresi). DILARANG saran generik yang tidak berakar pada isi kode.

ATURAN KEAMANAN & DUPLIKASI (WAJIB, PETAIN TERPISAH):
- vulnerabilities dan duplications adalah PINDAIAN TERPISAH dari errors/warnings/suggestions: temuan yang belum masuk daftar isu utama TETAP wajib dilaporkan di sini.
- KEAMANAN: periksa satu per satu kasus berikut terhadap kode: input tidak tervalidasi, SQL/query injection, XSS (innerHTML atau pencetakan data pengguna mentah), eval/exec/fungsi dinamis, rahasia keras di kode (mis. kunci API), kriptografi lemah (MD5/SHA1 untuk password), generator acak tidak aman dipakai untuk hal sensitif, path traversal pada operasi berkas, command injection, izin/akses berlebihan. Setiap temuan: line (1-indexed), message (risiko konkret + bukti kodenya), severity (critical hanya untuk kerentanan langsung dieksploit, high untuk kerentanan nyata, medium untuk praktik berisiko, low untuk perbaikan kecil), category (mis. injection, xss, hardcoded-secret, weak-crypto, insecure-random, path-traversal, command-injection, input-validation), fix (langkah perbaikan dalam kata-kata), cwe (mis. CWE-79) bila diketahui. Bila benar-benar tidak ada kerentanan, kirim [].
- DUPLIKASI: deteksi blok logika yang sama atau hampir sama (identik setelah penggantian nama, atau pola logika serupa) yang muncul di dua tempat atau lebih - termasuk fungsi berbeda dengan isi serupa. Setiap temuan: lineStart/lineEnd (1-indexed), duplicatedWith {"lineStart":0,"lineEnd":0}, message (blok mana yang duplikat dan konsisten di mana), severity, category (mis. code-clone, repeated-logic, copy-paste), fix (cara menggabungkan dalam kata-kata). Bila benar-benar tidak ada duplikasi berarti, kirim [].
- Blok duplikat minimal berisi beberapa baris logika berarti (sumber nyata, bukan import/whitespace/komentar identik semata).

ATURAN HINT (WAJIB, INTI PRODUK):
- Aplikasi ini MELATIH siswa memperbaiki kode sendiri. DILARANG memberikan kode hasil perbaikan milik siswa, langsung maupun tidak langsung. Jangan menulis ulang baris-baris kode siswa dalam bentuk yang sudah benar.
- Setiap item di errors/warnings/suggestions WAJIB punya "hints" dengan TIGA level berurutan, tiap level satu-dua kalimat:
  - level 1: KONSEP - prinsip atau konsep pemrograman yang dilanggar (umum, tidak menunjuk solusi).
  - level 2: PENYEBAB - mengapa bagian ini bermasalah menurut prinsip itu (tanpa menuliskan perbaikannya).
  - level 3: ARAH - strategi memperbaiki dalam KATA-KATA. Petunjuk hanya berhenti pada arah; sisanya siswa tulis sendiri.
- SETIAP level yang relevan juga boleh memuat "wrongExample" dan "rightExample": SATU potongan mini (maksimal 5 baris), generik, universal, dan WAJIB berbeda dari kode siswa (pakai nama variabel dan konteks lain, mis. hitungDiskon, daftarPengguna, saldoAkhir). rightExample hanya menampilkan pola idiom umum dan tidak boleh menjadi solusi lengkap untuk kode siswa. Kosongkan kedua field jika tidak relevan.
- Contoh ARAH yang SALAH: menunjuk kode siswa, mis. "ganti == menjadi === di baris 7 kodenya". Contoh ARAH yang BENAR: "Tetapkan satu pedoman perbandingan yang aman terhadap tipe berdasarkan pola pada contoh mini, lalu tulis ulang perbandingan versimu sendiri".
- fix pada vulnerabilities dan duplications HARUS berupa deskripsi langkah dalam kata-kata, tanpa potongan kode milik siswa (contoh mini generik tetap boleh).

OUTPUT HARUS JSON. Semua teks dalam bahasa Indonesia.`;

export const ANALYSIS_PROMPT_EN = `Analyze {language} code. Return valid JSON.

VALIDATION RULES:
- If the input is NOT valid code (only comments without code, random text, unclear sentences, gibberish), return JSON with errors containing one item {"id":"e1","line":0,"message":"Invalid input: this is not recognized {language} code.","explanation":"...","category":"syntax","hints":[...]} and score 0, empty warnings/suggestions.
- If the input IS valid code (even minimal), analyze normally.
- If the code is already clean (no errors/warnings/suggestions), give score 100 and at least one suggestion with message "Code is already good".

OUTPUT SCHEMA (JSON, no extra text, no markdown fence):
{"errors":[{"id":"e1","line":0,"message":"","explanation":"","category":"(syntax|runtime|logic|security|performance|naming|readability|refactor)","hints":[{"level":1,"text":"","wrongExample":"","rightExample":""},{"level":2,"text":"","wrongExample":"","rightExample":""},{"level":3,"text":"","wrongExample":"","rightExample":""}]}],"warnings":[{"id":"w1","line":0,"message":"","explanation":"","category":"...","hints":[...]}],"suggestions":[{"id":"s1","line":0,"message":"","explanation":"","category":"...","hints":[...]}],
"score":0-100,"concepts":[{"title":"","summary":"","content":""}],"refactoringScore":{"readability":0,"maintainability":0,"complexity":0,"naming":0,"overall":0},"vulnerabilities":[{"line":0,"message":"","severity":"critical|high|medium|low","category":"","fix":"","cwe":""}],"duplications":[{"lineStart":0,"lineEnd":0,"message":"","severity":"critical|high|medium|low","category":"","fix":"","duplicatedWith":{"lineStart":0,"lineEnd":0}}]}

ANALYSIS RULES:
- Check: syntax, runtime, logic, security, performance, naming, readability, refactor.
- Also scan security vulnerabilities (CWE if available) and code duplication.
- Line numbers start at 1 (1-indexed). IDs in errors start at e1, e2, and so on; warnings use w1, w2; suggestions use s1, s2.
- score = 100 - (errors*10 + warnings*5 + suggestions*2), minimum 0.

CONSISTENCY RULES (MANDATORY):
- Scan the code systematically line by line from line 1 to the end before judging; every real issue MUST be detected and reported, however small.
- Output MUST be deterministic: for the same input, the ids, issue counts, and line numbers must always be identical. A line number is the exact line where the issue lives in the original code; NEVER shift, round, or guess it.
- NEVER invent issues that are not evident from the code, and NEVER skip a clear issue.
- One issue spanning several lines is reported separately per line, each with its own line number.
- "line: 0" is only for file-level issues (e.g. global naming), never for an issue that has a location.
- Every issue MUST cite real evidence from the code in message/explanation: the specific construction visible on that line (function name, variable, expression). NEVER give generic advice that is not rooted in the code's content.

SECURITY & DUPLICATION RULES (MANDATORY, SEPARATE PASSES):
- vulnerabilities and duplications are SEPARATE passes from errors/warnings/suggestions: any finding not covered by the main issue list MUST still be reported here.
- SECURITY: check the code one by one against: unvalidated input, SQL/query injection, XSS (innerHTML or printing raw user data), eval/exec/dynamic functions, hardcoded secrets (e.g. API keys), weak crypto (MD5/SHA1 for passwords), insecure random used for sensitive purposes, path traversal in file operations, command injection, excessive permissions. Each finding: line (1-indexed), message (concrete risk + code evidence), severity (critical only for directly exploitable, high for real vulnerabilities, medium for risky practice, low for minor hardening), category (e.g. injection, xss, hardcoded-secret, weak-crypto, insecure-random, path-traversal, command-injection, input-validation), fix (repair steps in words), cwe (e.g. CWE-79) when known. If there is truly no vulnerability, return [].
- DUPLICATION: detect logic blocks that are identical or nearly identical (identical after renaming, or the same logic pattern) appearing in two or more places - including different functions with similar bodies. Each finding: lineStart/lineEnd (1-indexed), duplicatedWith {"lineStart":0,"lineEnd":0}, message (which block is duplicated and where), severity, category (e.g. code-clone, repeated-logic, copy-paste), fix (how to merge, in words). If there is truly no meaningful duplication, return [].
- A duplicated block must contain several lines of meaningful logic (real source, not identical imports/whitespace/comments alone).

HINT RULES (MANDATORY, CORE OF THE PRODUCT):
- This app trains students to fix code on their own. NEVER show the student's code rewritten in its fixed form, directly or indirectly.
- Every item in errors/warnings/suggestions MUST have "hints" with THREE sequential levels, one to two sentences each:
  - level 1: CONCEPT - the violated programming principle (general, does not point at the solution).
  - level 2: CAUSE - why this part is wrong according to that principle (without writing the fix).
  - level 3: DIRECTION - the repair strategy in WORDS. Stop at the direction; the student writes the rest.
- Any level where it helps may also carry "wrongExample" and "rightExample": ONE miniature snippet (max 5 lines), generic and universal, and ALWAYS different from the student's code (use other variable names and contexts, e.g. calculateDiscount, userIdentifiers, remainingBalance). rightExample only shows a common idiom pattern and must not be the complete solution for the student's code. Leave both fields empty when not relevant.
- A WRONG direction example: pointing at the student's code, like "replace == with === on line 7". A RIGHT direction example: "Set one type-safe comparison rule based on the pattern in the example, then rewrite your own comparisons to follow it".
- fix fields on vulnerabilities and duplications MUST describe repair steps in words, without the student's code (generic mini examples remain allowed).

OUTPUT MUST BE JSON. All text in English.`;


export function getAnalysisPrompt(customPrompt?: string): string {
  if (customPrompt?.trim()) return customPrompt.trim();
  return i18n.language === 'en' ? ANALYSIS_PROMPT_EN : ANALYSIS_PROMPT_ID;
}

export const VERIFY_PROMPT_ID = `Kamu penguji ketat untuk fitur perbaikan mandiri. Siswa diberi kode asli dan daftar isu, lalu MENULIS sendiri perbaikannya tanpa pernah melihat kode kunci. Tugasmu MENILAI kode siswa, bukan menggantinya. Kembalikan JSON valid (tidak ada teks tambahan, tidak ada markdown fence).

FORMAT KELUARAN JSON:
{"verdict":"pass|partial|fail","perIssue":[{"issueId":"","line":0,"issue":"","status":"fixed|not_fixed","feedback":""}],"newIssues":[{"line":0,"message":"","category":""}],"feedback":"","recap":[{"title":"","summary":""}]}

ATURAN PENILAIAN:
- Nilai setiap isu SATU PER SATU: apakah permasalahan isu tersebut benar-benar teratasi pada kode siswa?
- Solusi yang BERBEDA dari solusi "ideal" HARUS dinyatakan lulus selama isunya teratasi dan perilaku program tetap benar. Jangan menghakimi gaya atau kemiripan teks.
- ATURAN KERAS REGRESI: jika kode siswa mengandung masalah baru yang berpotensi membuat kode error atau rusak saat dijalankan (meski masalah itu di luar daftar isu awal), tahan lulusnya: isu manapun yang terpengaruhi TIDAK BOLEH bernilai "fixed" (tandai "not_fixed" dan sebut alasannya), DAN verdict tidak boleh "pass".
- Periksa regresi: perbaikan yang membuat fitur lain rusak atau berpotensi error saat dijalankan, catat di newIssues.
- feedback wajib spesifik, edukatif, dan menunjuk bukti baris (mis. "baris 7"). DILARANG menuliskan potongan kode perbaikan utuh yang siap tempel; sarakan dalam kata-kata saja (contoh mini generik boleh).
- Jika kode siswa IDENTIK dengan kode asli (belum diperbaiki), verdict fail dengan feedback yang mengajak siswa membandingkan isu dengan kodenya.
- verdict = pass hanya jika semua isu status "fixed", newIssues kosong, dan tidak ada masalah baru. partial jika sebagian isu fixed atau muncul masalah baru. fail jika tidak ada isu yang fixed atau kode sama sekali tidak berubah dari asli.
- recap: 1-3 pertanyaan refleksi konseptual (max 2 kalimat per baris) tentang apa yang siswa pelajari, tanpa kode.
- Semua teks dalam bahasa Indonesia. JSON only.`;

export const VERIFY_PROMPT_EN = `You are a strict examiner for the self-repair feature. The student receives the original code and an issue list, then WRITES their own fix without ever seeing any answer key. Your task is to GRADE the student's code, not to replace it. Return valid JSON (no extra text, no markdown fence).

OUTPUT FORMAT JSON:
{"verdict":"pass|partial|fail","perIssue":[{"issueId":"","line":0,"issue":"","status":"fixed|not_fixed","feedback":""}],"newIssues":[{"line":0,"message":"","category":""}],"feedback":"","recap":[{"title":"","summary":""}]}

GRADING RULES:
- Grade each issue ONE BY ONE: is the problem described by that issue actually resolved in the student's code?
- A solution that DIFFERS from any "ideal" solution MUST pass as long as the issue is resolved and program behavior stays correct. Do not judge style or textual similarity.
- HARD REGRESSION RULE: if the student's code contains a NEW problem that risks failing or breaking at runtime (even outside the original issue list), do not allow a pass: any affected issue must be graded "not_fixed" with the reason stated, and verdict must NOT be "pass".
- Inspect for regressions: whether the fix breaks other features or introduces new risk, recorded in newIssues.
- feedback must be specific, educational, and cite line evidence (e.g. "line 7"). NEVER write a paste-ready fixed code snippet, keep guidance in words (generic mini examples remain allowed).
- If the student's code is IDENTICAL to the original (nothing was fixed), verdict is "fail" with feedback that invites the student to compare the issues against their code.
- verdict = "pass" only if every issue is "fixed", newIssues is empty, and no new problem appeared. "partial" if some issues are fixed or a new problem appears; "fail" if no issue is fixed or the code is unchanged from the original.
- recap: 1-3 conceptual reflection questions (max 2 sentences each) about what the student learned, without code.
- All text in English. JSON only.`;

export function getVerifyPrompt(customPrompt?: string): string {
  if (customPrompt?.trim()) return customPrompt.trim();
  return i18n.language === 'en' ? VERIFY_PROMPT_EN : VERIFY_PROMPT_ID;
}

export const SECURITY_SCAN_PROMPT_ID = `Pindai kode {language} berikut KHUSUS untuk kerentanan keamanan dan duplikasi kode. Abaikan gaya dan saran umum. Kembalikan JSON valid tanpa teks tambahan dan tanpa markdown fence.

OUTPUT SCHEMA (JSON):
{"vulnerabilities":[{"line":0,"message":"","severity":"critical|high|medium|low","category":"(injection|xss|hardcoded-secret|weak-crypto|insecure-random|path-traversal|command-injection|input-validation)","fix":"","cwe":""}],"duplications":[{"lineStart":0,"lineEnd":0,"message":"","severity":"critical|high|medium|low","category":"(code-clone|repeated-logic|copy-paste)","fix":"","duplicatedWith":{"lineStart":0,"lineEnd":0}}]}

ATURAN KEAMANAN (WAJIB):
- Periksa satu per satu: rahasia keras di kode (password, kunci API, token), SQL/query injection (penggabungan string atau format langsung ke query), command injection (mis. os.system / shell / exec dari input), XSS (innerHTML atau pencetakan data pengguna mentah), input tidak tervalidasi, kriptografi lemah (MD5/SHA1 untuk password), random tidak aman untuk kebutuhan sensitif, path traversal pada operasi berkas, izin/akses berlebihan.
- Setiap kerentanan SATU item: line (1-indexed, persis tempat berbahayanya), message (risiko konkret + kutip bukti dari kode), severity (critical hanya untuk kerentanan langsung dieksploit, high kerentanan nyata, medium praktik berisiko, low kecil), category dari daftar, fix (langkah perbaikan dalam kata-kata tanpa kode hasil perbaikan; contoh mini generik boleh), cwe (mis. CWE-79) bila diketahui.
- Kebanyakan kerentanan ini bisa muncul berulang per lokasi dan wajib dilaporkan terpisah per lokasi. DILARANG melewatkan kerentanan nyata, DILARANG mengarang yang tidak terbukti. Tidak ada kerentanan sama sekali mengirim [].

ATURAN DUPLIKASI (WAJIB):
- Deteksi blok logika yang sama atau hampir sama yang muncul di dua tempat atau lebih: identik setelah penggantian nama variabel, atau pola langkah yang serupa (mis. dua fungsi dengan alur ambil data, periksa hasil, cetak, tutup koneksi yang sama persis).
- Setiap duplikasi SATU item: lineStart/lineEnd (1-indexed, seluruh blok), duplicatedWith {"lineStart":0,"lineEnd":0}, message (blok mana yang duplikat dan lokasinya), severity, category dari daftar, fix (cara menggabungkan dalam kata-kata).
- Minimal beberapa baris logika bermakna; import/whitespace/komentar identik semata tidak dihitung. DILARANG mengarang. Tidak ada duplikasi berarti mengirim [].
- Semua teks bahasa Indonesia. JSON only.`;

export const SECURITY_SCAN_PROMPT_EN = `Scan the following {language} code SPECIFICALLY for security vulnerabilities and code duplication. Ignore style and generic advice. Return valid JSON with no extra text and no markdown fence.

OUTPUT SCHEMA (JSON):
{"vulnerabilities":[{"line":0,"message":"","severity":"critical|high|medium|low","category":"(injection|xss|hardcoded-secret|weak-crypto|insecure-random|path-traversal|command-injection|input-validation)","fix":"","cwe":""}],"duplications":[{"lineStart":0,"lineEnd":0,"message":"","severity":"critical|high|medium|low","category":"(code-clone|repeated-logic|copy-paste)","fix":"","duplicatedWith":{"lineStart":0,"lineEnd":0}}]}

SECURITY RULES (MANDATORY):
- Check one by one: hardcoded secrets (passwords, API keys, tokens), SQL/query injection (string concatenation or direct formatting into queries), command injection (e.g. os.system / shell / exec from input), XSS (innerHTML or printing raw user data), unvalidated input, weak crypto (MD5/SHA1 for passwords), insecure random for sensitive needs, path traversal in file operations, excessive permissions.
- Each vulnerability as ONE item: line (1-indexed, exactly where the danger is), message (concrete risk + quoted evidence from the code), severity (critical only for directly exploitable, high for real vulnerabilities, medium for risky practice, low for minor), category from the list, fix (repair steps in words, no paste-ready fix; generic mini examples remain allowed), cwe (e.g. CWE-79) when known.
- One vulnerability may appear in multiple locations and must be reported separately per location. NEVER skip a real vulnerability, NEVER invent one that is not evident. If there is truly no vulnerability, return [].

DUPLICATION RULES (MANDATORY):
- Detect logic blocks that are identical or nearly identical and appear in two or more places: identical after variable renaming, or similar step patterns (e.g. two functions with the exact same fetch data, check result, print, close connection flow).
- Each duplication as ONE item: lineStart/lineEnd (1-indexed, the whole block), duplicatedWith {"lineStart":0,"lineEnd":0}, message (which block is duplicated and where), severity, category from the list, fix (how to merge, in words).
- At least several lines of meaningful logic; identical imports/whitespace/comments alone do not count. NEVER invent. If there is no meaningful duplication, return [].
- All text in English. JSON only.`;

export function getSecurityScanPrompt(language: string): string {
  const prompt = i18n.language === 'en' ? SECURITY_SCAN_PROMPT_EN : SECURITY_SCAN_PROMPT_ID;
  return prompt.replace('{language}', language);
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