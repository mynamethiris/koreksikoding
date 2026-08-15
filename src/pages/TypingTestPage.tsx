import { useState, useCallback, useRef, useEffect } from 'react';
import { RotateCcw, Shuffle, Eraser } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { FadeIn } from '@/components/motion';

const CODE_SNIPPETS = [
  { lang: 'JavaScript', code: 'const fibonacci = (n) => n <= 1 ? n : fibonacci(n - 1) + fibonacci(n - 2);' },
  { lang: 'Python', code: 'def binary_search(arr, target):\n    lo, hi = 0, len(arr) - 1\n    while lo <= hi:\n        mid = (lo + hi) // 2\n        if arr[mid] == target: return mid\n        elif arr[mid] < target: lo = mid + 1\n        else: hi = mid - 1\n    return -1' },
  { lang: 'JavaScript', code: 'async function fetchData(url) {\n  try {\n    const res = await fetch(url);\n    if (!res.ok) throw new Error(`HTTP ${res.status}`);\n    return await res.json();\n  } catch (err) {\n    console.error("Fetch failed:", err.message);\n    return null;\n  }\n}' },
  { lang: 'Python', code: 'class Stack:\n    def __init__(self):\n        self._items = []\n    def push(self, item):\n        self._items.append(item)\n    def pop(self):\n        if not self._items:\n            raise IndexError("pop from empty stack")\n        return self._items.pop()' },
  { lang: 'JavaScript', code: 'const debounce = (fn, ms) => {\n  let timer;\n  return (...args) => {\n    clearTimeout(timer);\n    timer = setTimeout(() => fn(...args), ms);\n  };\n};' },
  { lang: 'Python', code: 'from functools import lru_cache\n\n@lru_cache(maxsize=128)\ndef factorial(n):\n    if n <= 1: return 1\n    return n * factorial(n - 1)' },
  { lang: 'JavaScript', code: 'const deepClone = (obj) => {\n  if (obj === null || typeof obj !== "object") return obj;\n  if (Array.isArray(obj)) return obj.map(deepClone);\n  return Object.fromEntries(\n    Object.entries(obj).map(([k, v]) => [k, deepClone(v)])\n  );\n};' },
  { lang: 'Python', code: 'def flatten(lst):\n    result = []\n    for item in lst:\n        if isinstance(item, list):\n            result.extend(flatten(item))\n        else:\n            result.append(item)\n    return result' },
];

const TIME_LIMIT = 300_000;

function getRandomSnippet(current?: (typeof CODE_SNIPPETS)[0]) {
  let idx: number;
  do {
    idx = Math.floor(Math.random() * CODE_SNIPPETS.length);
  } while (current && CODE_SNIPPETS[idx].lang === current.lang && CODE_SNIPPETS.length > 1);
  return CODE_SNIPPETS[idx];
}

function formatCountdown(ms: number) {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatElapsed(ms: number) {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function TypingTestPage() {
  const { t } = useTranslation();
  const [snippet, setSnippet] = useState(() => getRandomSnippet());
  const [typed, setTyped] = useState('');
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [startTime, setStartTime] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const [wpm, setWpm] = useState(0);
  const [accuracy, setAccuracy] = useState(100);
  const [timedOut, setTimedOut] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const target = snippet.code;
  const targetLines = target.split('\n');

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  useEffect(() => {
    if (started && !finished && startTime) {
      timerRef.current = setInterval(() => {
        const now = Date.now();
        const elapsedMs = now - startTime;
        const remaining = TIME_LIMIT - elapsedMs;
        setElapsed(elapsedMs);
        setTimeLeft(Math.max(0, remaining));
        if (remaining <= 0) {
          clearInterval(timerRef.current);
          setFinished(true);
          setTimedOut(true);
        }
      }, 100);
      return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }
  }, [started, finished, startTime]);

  const startIfNeeded = useCallback(() => {
    if (!started) {
      setStarted(true);
      setStartTime(Date.now());
    }
  }, [started]);

  const handleInput = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (finished) return;
    const value = e.target.value;
    startIfNeeded();
    setTyped(value);

    const correct = value.split('').filter((c, i) => c === target[i]).length;
    const total = value.length;
    setAccuracy(total > 0 ? Math.round((correct / total) * 100) : 100);

    if (total > 0 && startTime) {
      const minutes = (Date.now() - startTime) / 60000;
      const correctWords = correct / 5;
      setWpm(minutes > 0 ? Math.round(correctWords / minutes) : 0);
    }

    if (value === target) {
      setFinished(true);
      setTimedOut(false);
      if (timerRef.current) clearInterval(timerRef.current);
      setElapsed(Date.now() - startTime);
    }
  }, [target, startTime, startIfNeeded, finished]);

  const handleRestart = useCallback(() => {
    setTyped('');
    setStarted(false);
    setFinished(false);
    setElapsed(0);
    setTimeLeft(TIME_LIMIT);
    setWpm(0);
    setAccuracy(100);
    setTimedOut(false);
    if (timerRef.current) clearInterval(timerRef.current);
    inputRef.current?.focus();
  }, []);

  const handleNewCode = useCallback(() => {
    setSnippet(getRandomSnippet(snippet));
    handleRestart();
  }, [snippet, handleRestart]);

  const handleClear = useCallback(() => {
    setTyped('');
    setAccuracy(100);
    setWpm(0);
    if (started && !finished) {
      setStartTime(Date.now());
      setElapsed(0);
      setTimeLeft(TIME_LIMIT);
    }
    inputRef.current?.focus();
  }, [started, finished]);

  const renderChar = (char: string, i: number) => {
    const isTyped = i < typed.length;
    const isCorrect = isTyped && typed[i] === target[i];

    let displayChar: string;
    let isSpecial = false;

    if (char === '\n') {
      displayChar = '↵';
      isSpecial = true;
    } else if (char === ' ') {
      displayChar = '·';
      isSpecial = true;
    } else if (char === '\t') {
      displayChar = '→';
      isSpecial = true;
    } else {
      displayChar = char;
    }

    if (!isTyped) {
      return (
        <span key={i} className={isSpecial ? 'text-transparent' : 'text-muted-foreground/20'}>
          {displayChar}
        </span>
      );
    }

    if (isCorrect) {
      return (
        <span key={i} className="text-foreground">
          {displayChar}
        </span>
      );
    }

    return (
      <span key={i} className="text-destructive bg-destructive/10 rounded-sm">
        {displayChar}
      </span>
    );
  };

  const progress = target.length > 0 ? Math.min((typed.length / target.length) * 100, 100) : 0;
  const timerWarning = timeLeft <= 60_000 && started && !finished;

  const lineRanges: { start: number; length: number }[] = [];
  let acc = 0;
  for (const line of targetLines) {
    lineRanges.push({ start: acc, length: line.length });
    acc += line.length + 1;
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-52px)]">
      <FadeIn>
        <div className="px-3 sm:px-6 pt-3 sm:pt-4 pb-2 sm:pb-3 border-b border-border bg-card shrink-0">
          <div className="flex items-center justify-between max-w-5xl mx-auto">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-foreground tracking-tight">{t('tools.typingTestTitle')}</span>
              <span className="text-[10px] font-mono text-accent px-1.5 py-0.5 rounded bg-accent/10">
                {snippet.lang}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={handleRestart}
                className="flex items-center gap-1.5 p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                title="Ulangi">
                <RotateCcw size={14} />
                <span className="hidden sm:inline text-[11px] font-medium">Ulangi</span>
              </button>
              <button onClick={handleNewCode}
                className="flex items-center gap-1.5 p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                title="Ganti Kode">
                <Shuffle size={14} />
                <span className="hidden sm:inline text-[11px] font-medium">Ganti Kode</span>
              </button>
              <button onClick={handleClear}
                className="flex items-center gap-1.5 p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                title="Bersihkan">
                <Eraser size={14} />
                <span className="hidden sm:inline text-[11px] font-medium">Bersihkan</span>
              </button>
            </div>
          </div>
        </div>
      </FadeIn>

      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col">
        <div className="flex-1 flex flex-col justify-center max-w-5xl mx-auto w-full p-3 sm:p-6">
          <div className="flex items-center justify-center gap-6 sm:gap-10 mb-6 text-xs text-muted-foreground">
            <div className="text-center">
              <div className="text-[9px] uppercase tracking-widest mb-1 opacity-60">sisa waktu</div>
              <div className={`font-mono text-lg tabular-nums font-medium ${timerWarning ? 'text-destructive' : 'text-foreground'}`}>
                {formatCountdown(timeLeft)}
              </div>
            </div>
            <div className="w-px h-6 bg-border" />
            <div className="text-center">
              <div className="text-[9px] uppercase tracking-widest mb-1 opacity-60">wpm</div>
              <div className="font-mono text-lg text-foreground tabular-nums font-medium">{wpm}</div>
            </div>
            <div className="w-px h-6 bg-border" />
            <div className="text-center">
              <div className="text-[9px] uppercase tracking-widest mb-1 opacity-60">akurasi</div>
              <div className="font-mono text-lg text-foreground tabular-nums font-medium">{accuracy}%</div>
            </div>
          </div>

          <div className="w-full h-0.5 bg-muted rounded-full mb-5 overflow-hidden">
            <div
              className="h-full bg-accent rounded-full transition-all duration-150 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div
            className="rounded-xl border border-border bg-card overflow-hidden cursor-text"
            onClick={() => inputRef.current?.focus()}
          >
            <div className="flex items-center gap-1.5 px-4 py-2 border-b border-border bg-muted">
              <div className="w-2.5 h-2.5 rounded-full bg-destructive/60" />
              <div className="w-2.5 h-2.5 rounded-full bg-warning/60" />
              <div className="w-2.5 h-2.5 rounded-full bg-success/60" />
              <span className="ml-2 text-[10px] text-muted-foreground font-mono">{snippet.lang.toLowerCase()}-test</span>
            </div>
            <div className="flex max-h-[40vh] overflow-y-auto">
              <div className="shrink-0 py-4 pl-4 pr-3 text-right border-r border-border bg-muted/30 select-none">
                {targetLines.map((_, lineIdx) => (
                  <div key={lineIdx} className="text-[11px] font-mono text-muted-foreground/40 leading-[1.75]">
                    {lineIdx + 1}
                  </div>
                ))}
              </div>
              <div className="flex-1 py-4 px-4">
                <div className="font-mono text-[13px] leading-[1.75] whitespace-pre">
                  {targetLines.map((line, lineIdx) => {
                    const { start } = lineRanges[lineIdx];
                    return (
                      <div key={lineIdx}>
                        {line.split('').map((char, i) => renderChar(char, start + i))}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <textarea
            ref={inputRef}
            value={typed}
            onChange={handleInput}
            className="sr-only"
            autoFocus
            aria-label="Typing input"
          />

          {finished && (
            <div className={`mt-5 rounded-xl border p-6 text-center space-y-4 ${timedOut ? 'border-warning/30 bg-warning/5' : 'border-success/30 bg-success/5'}`}>
              <p className={`text-sm font-bold ${timedOut ? 'text-warning' : 'text-success'}`}>
                {timedOut ? 'Waktu Habis!' : 'Selesai!'}
              </p>
              <div className="flex items-center justify-center gap-8">
                <div className="text-center">
                  <div className="text-[9px] uppercase tracking-widest mb-1 opacity-60 text-muted-foreground">waktu</div>
                  <div className="font-mono text-2xl text-foreground font-medium">{formatElapsed(elapsed)}</div>
                </div>
                <div className={`w-px h-8 ${timedOut ? 'bg-warning/20' : 'bg-success/20'}`} />
                <div className="text-center">
                  <div className="text-[9px] uppercase tracking-widest mb-1 opacity-60 text-muted-foreground">wpm</div>
                  <div className="font-mono text-2xl text-foreground font-medium">{wpm}</div>
                </div>
                <div className={`w-px h-8 ${timedOut ? 'bg-warning/20' : 'bg-success/20'}`} />
                <div className="text-center">
                  <div className="text-[9px] uppercase tracking-widest mb-1 opacity-60 text-muted-foreground">akurasi</div>
                  <div className="font-mono text-2xl text-foreground font-medium">{accuracy}%</div>
                </div>
              </div>
              <div className="flex items-center justify-center gap-2 pt-1">
                <button
                  onClick={handleRestart}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded-lg border border-border hover:bg-muted text-muted-foreground transition-colors"
                >
                  <RotateCcw size={11} />
                  Coba Lagi
                </button>
                <button
                  onClick={handleNewCode}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded-lg bg-primary text-primary-foreground transition-colors"
                >
                  <Shuffle size={11} />
                  Kode Baru
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
