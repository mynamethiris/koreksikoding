import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Lightbulb, Code2, Flame, Loader2, CheckCircle, XCircle, ArrowRight, RotateCcw, ChevronDown, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useApp } from '@/store/AppContext';
import { analyzeCode, canAnalyze, getRateLimitRemaining, ApiError } from '@/lib/api';
import { db } from '@/lib/db';
import { AsyncError, AsyncLoading } from '@/components/AsyncStatus';
import { CodeEditor } from '@/components/CodeEditor';
import { FadeIn } from '@/components/motion';
import toast from 'react-hot-toast';
import type { Language } from '@/types';

type Difficulty = 'easy' | 'medium' | 'hard';

interface Challenge {
  id: string;
  difficulty: Difficulty;
  title: string;
  description: string;
  language: Language;
  starterCode: string;
  testCases: { input: string; expectedOutput: string }[];
  hints: string[];
  solution: string;
}

const DIFFICULTY_META: Record<Difficulty, { color: string; bg: string; Icon: React.ElementType }> = {
  easy: { color: 'text-success', bg: 'bg-success/10', Icon: Lightbulb },
  medium: { color: 'text-warning', bg: 'bg-warning/10', Icon: Code2 },
  hard: { color: 'text-destructive', bg: 'bg-destructive/10', Icon: Flame },
};

const CHALLENGE_LANGUAGES: Language[] = ['html', 'python', 'c'];

export const LANG_DISPLAY: Record<string, string> = { html: 'HTML', python: 'Python', c: 'C' };

const CHALLENGE_PROMPT_ID = `Buat tantangan coding mode "Perbaiki Kode". Return JSON valid.
Format:
{"difficulty":"easy|medium|hard","title":"...","description":"...","language":"html|python|c","starterCode":"<KODE YANG RUSAK>","testCases":[{"input":"...","expectedOutput":"..."}],"hints":["..."],"solution":"<KODE YANG BENAR>"}
ATURAN:
- Buat kode dengan bug/error nyata (bukan hanya komentar). starterCode HARUS berisi kode yang rusak, solution berisi kode yang benar.
- Sesuaikan difficulty dengan kompleksitas: easy = 1-2 konsep dasar, medium = 2-3 konsep/struktur, hard = algoritma atau edge cases kompleks.
- language: html, python, atau c.
- testCases: 1-2 kasus uji yang, bila dijalankan pada solution, menghasilkan expectedOutput.
- description: jelaskan singkat apa yang salah / apa yang perlu diperbaiki.
- hints: 1-3 petunjuk progresif, jangan langsung beri jawaban.
- solution HARUS konsisten dengan testCases (expectedOutput harus cocup).
- JSON only, tidak ada markdown fence, tidak ada teks tambahan.`;

const CHALLENGE_PROMPT_EN = `Create a "Fix Code" coding challenge. Return valid JSON.
Format:
{"difficulty":"easy|medium|hard","title":"...","description":"...","language":"html|python|c","starterCode":"<BROKEN CODE>","testCases":[{"input":"...","expectedOutput":"..."}],"hints":["..."],"solution":"<CORRECT CODE>"}
RULES:
- Create code with REAL bugs/errors (not just comments). starterCode MUST contain broken code, solution contains the correct code.
- Match difficulty to complexity: easy = 1-2 basic concepts, medium = 2-3 concepts/structures, hard = algorithms or complex edge cases.
- language: html, python, or c only.
- testCases: provide 1-2 test cases that, when run on solution, produce expectedOutput.
- description: briefly explain what is wrong / what needs fixing.
- hints: 1-3 progressive hints, do not give the answer away.
- solution MUST be consistent with testCases (expectedOutput must match).
- JSON only, no markdown fences, no extra text.`;

export function TantanganPage() {
  const { t, i18n } = useTranslation();
  const { files, addFile, clearAll, setActiveFileId, activeProvider } = useApp();
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty | null>(() => {
    try {
      return (localStorage.getItem('kk_challenge_difficulty') as Difficulty) || null;
    } catch {
      return null;
    }
  });
  const [selectedLang, setSelectedLang] = useState<Language>(() => {
    try {
      return (localStorage.getItem('kk_challenge_lang') as Language) || 'python';
    } catch {
      return 'python';
    }
  });
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [challenge, setChallenge] = useState<Challenge | null>(() => {
    try {
      const s = localStorage.getItem('kk_challenge_current');
      return s ? JSON.parse(s) : null;
    } catch {
      return null;
    }
  });
  const [challengeStarted, setChallengeStarted] = useState(false);
  const [showSurrenderCard, setShowSurrenderCard] = useState(false);
  const [showHints, setShowHints] = useState(false);
  const [showTestCases, setShowTestCases] = useState(false);
  const [checkResult, setCheckResult] = useState<'pass' | 'fail' | null>(null);
  const [completedChallenges, setCompletedChallenges] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('kk_completed_challenges');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  const [mobileTab, setMobileTab] = useState<'editor' | 'challenge'>('editor');
  const [isMobile, setIsMobile] = useState(false);

  const DIFFICULTY_LABELS: Record<Difficulty, string> = {
    easy: i18n.language === 'en' ? 'Easy' : 'Mudah',
    medium: i18n.language === 'en' ? 'Medium' : 'Sedang',
    hard: i18n.language === 'en' ? 'Hard' : 'Sulit',
  };

  const generateChallenge = useCallback(async (difficulty: Difficulty) => {
    if (!activeProvider.apiKey) {
      toast.error(t('analysis.noApiKey'));
      return;
    }

    if (!canAnalyze()) {
      toast.error(t('analysis.rateLimit', { remaining: getRateLimitRemaining() }));
      return;
    }

    setSelectedDifficulty(difficulty);
    setIsGenerating(true);
    setChallenge(null);
    setError(null);
    setShowHints(false);
    setShowSurrenderCard(false);
    setChallengeStarted(false);
    setCheckResult(null);

    try {
      const prompt = i18n.language === 'en' ? CHALLENGE_PROMPT_EN : CHALLENGE_PROMPT_ID;
      const { text } = await analyzeCode(
        `Difficulty: ${difficulty}, Language: ${selectedLang}`,
        'javascript',
        activeProvider,
        prompt,
      );

      let cleaned = text.trim();
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      }
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Invalid JSON response');

      const parsed = JSON.parse(jsonMatch[0]);
      const lang =
        parsed.language && CHALLENGE_LANGUAGES.includes(parsed.language)
          ? parsed.language
          : selectedLang;
      setChallenge({
        id: crypto.randomUUID(),
        difficulty,
        title: parsed.title || 'Challenge',
        description: parsed.description || '',
        language: lang,
        starterCode: parsed.starterCode || '',
        testCases: parsed.testCases || [],
        hints: parsed.hints || [],
        solution: parsed.solution || '',
      });
    } catch (err) {
      let msg: string;
      if (err instanceof ApiError) {
        msg = err.message;
      } else if (err instanceof Error) {
        msg = err.message;
      } else {
        msg = t('analysis.errorUnknown', { error: String(err) });
      }
      setError(msg);
      toast.error(t('analysis.analysisFailed', { error: msg }));
    } finally {
      setIsGenerating(false);
    }
  }, [activeProvider, i18n.language, selectedLang, t]);

  const checkAnswer = useCallback(async () => {
    if (!challenge) return;
    const activeFile = files.find((f) => f.id === files[files.length - 1]?.id);
    if (!activeFile || !activeFile.content.trim()) {
      toast.error(t('analysis.noCode'));
      return;
    }

    const userCode = activeFile.content.trim();
    const solution = challenge.solution.trim();

    if (!solution) {
      toast.error(i18n.language === 'en' ? 'No solution available for this challenge.' : 'Tidak ada solusi untuk tantangan ini.');
      return;
    }

    const normalize = (s: string) => s.replace(/\s+/g, ' ').trim();
    const isMatch = normalize(userCode) === normalize(solution);
    setCheckResult(isMatch ? 'pass' : 'fail');

    const existing = await db.getChallengeHistoryByChallengeId(challenge.id);
    const base = existing || {
      id: crypto.randomUUID(),
      challengeId: challenge.id,
      title: challenge.title,
      difficulty: challenge.difficulty,
      language: challenge.language,
      sourceCode: challenge.starterCode,
    };

    if (isMatch) {
      toast.success(t('challenge.completed'));
      const newCompleted = new Set(completedChallenges);
      newCompleted.add(challenge.id);
      setCompletedChallenges(newCompleted);
      localStorage.setItem('kk_completed_challenges', JSON.stringify([...newCompleted]));
      db.addChallengeHistory({ ...base, completed: true, timestamp: Date.now() });
    } else {
      toast.error(i18n.language === 'en' ? 'Not quite right. Try again!' : 'Belum tepat. Coba lagi!');
      db.addChallengeHistory({ ...base, completed: false, timestamp: Date.now(), editorContent: userCode });
      setTimeout(() => setCheckResult(null), 1500);
    }
  }, [challenge, files, completedChallenges, i18n.language, t]);

  const startChallenge = () => {
    if (!challenge) return;
    clearAll();
    const newFile = {
      id: crypto.randomUUID(),
      name: `challenge.${challenge.language === 'cpp' ? 'cpp' : challenge.language}`,
      language: challenge.language,
      content: challenge.starterCode,
    };
    addFile(newFile);
    setActiveFileId(newFile.id);
    setChallengeStarted(true);
    setShowSurrenderCard(false);
    setCheckResult(null);
    setShowHints(false);
    setShowTestCases(false);
    toast.success(i18n.language === 'en' ? 'Challenge started! Fix the code.' : 'Tantangan dimulai! Perbaiki kode.');
  };

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    try {
      if (challenge) localStorage.setItem('kk_challenge_current', JSON.stringify(challenge));
      else localStorage.removeItem('kk_challenge_current');
      if (selectedDifficulty) localStorage.setItem('kk_challenge_difficulty', selectedDifficulty);
      else localStorage.removeItem('kk_challenge_difficulty');
      localStorage.setItem('kk_challenge_lang', selectedLang);
    } catch {}
  }, [challenge, selectedDifficulty, selectedLang]);

  function ChallengeCard() {
    return (
      <div className="space-y-3 sm:space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`text-[10px] px-2 py-0.5 rounded-md font-medium ${DIFFICULTY_META[challenge!.difficulty].bg} ${DIFFICULTY_META[challenge!.difficulty].color}`}
          >
            {DIFFICULTY_LABELS[challenge!.difficulty]}
          </span>
          <span className="text-[10px] text-muted-foreground font-mono">{challenge!.language}</span>
          {challengeStarted && !completedChallenges.has(challenge!.id) && (
            <span className="text-[9px] text-accent font-medium ml-auto">
              {i18n.language === 'en' ? 'Challenge in progress' : 'Tantangan sedang berjalan'}
            </span>
          )}
        </div>

        <div>
          <h2 className="text-sm sm:text-base font-bold text-foreground">{challenge!.title}</h2>
          <p className="text-xs text-muted-foreground leading-relaxed mt-1">{challenge!.description}</p>
        </div>

        {challenge!.testCases.length > 0 && (
          <div className="rounded-xl border border-border overflow-hidden">
            <button
              onClick={() => setShowTestCases(!showTestCases)}
              className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-muted transition-colors"
            >
              <span className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <Code2 size={12} className="text-muted-foreground" />
                {t('challenge.testCases')} ({challenge!.testCases.length})
              </span>
              <motion.div animate={{ rotate: showTestCases ? 90 : 0 }} transition={{ duration: 0.15 }}>
                <ChevronRight size={12} className="text-muted-foreground" />
              </motion.div>
            </button>
            <AnimatePresence>
              {showTestCases && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="px-3 pb-2 pt-1 border-t border-border space-y-1">
                    {challenge!.testCases.map((tc, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-[10px] font-mono">
                        <span className="text-muted-foreground">{t('challenge.input')}:</span>
                        <span className="text-foreground bg-muted px-1.5 py-0.5 rounded">{tc.input}</span>
                        <ArrowRight size={8} className="text-muted-foreground" />
                        <span className="text-muted-foreground">{t('challenge.output')}:</span>
                        <span className="text-success bg-success/10 px-1.5 py-0.5 rounded">{tc.expectedOutput}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        <div className="flex items-center gap-2">
          <motion.button
            onClick={challengeStarted ? () => setShowSurrenderCard((s) => !s) : startChallenge}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {challengeStarted ? <ChevronRight size={12} /> : <Code2 size={13} />}
            <span>
              {challengeStarted
                ? (showSurrenderCard ? t('challenge.hideSurrender') : t('challenge.surrender'))
                : t('challenge.openInEditor')}
            </span>
          </motion.button>

          {challengeStarted && !completedChallenges.has(challenge!.id) && (
            <button
              onClick={() => {
                if (checkResult === 'pass') {
                  toast(i18n.language === 'en' ? 'Challenge completed! Click New Challenge to continue.' : 'Tantangan sudah diselesaikan! Klik Tantangan Baru untuk melanjutkan.', { icon: '🎉' });
                } else {
                  checkAnswer();
                }
              }}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition-all duration-150 active:scale-95 ${
                checkResult === 'pass'
                  ? 'border-success/30 bg-success/10 text-success'
                  : checkResult === 'fail'
                  ? 'border-destructive/30 bg-destructive/10 text-destructive'
                  : 'border-accent/30 text-accent hover:bg-accent/10'
              }`}
            >
              {checkResult === 'pass' ? (
                <><CheckCircle size={12} /> {i18n.language === 'en' ? 'Done' : 'Selesai'}</>
              ) : checkResult === 'fail' ? (
                <><XCircle size={12} /> {i18n.language === 'en' ? 'Wrong' : 'Salah'}</>
              ) : (
                <><CheckCircle size={12} /> {t('challenge.check')}</>
              )}
            </button>
          )}
        </div>

        {checkResult === 'fail' && !completedChallenges.has(challenge!.id) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="p-2.5 rounded-lg bg-destructive/5 border border-destructive/20 text-xs text-destructive"
          >
            {i18n.language === 'en'
              ? 'Your solution didn\'t match. Try again, or click Give Up to see the solution.'
              : 'Solusi Anda belum sesuai. Coba lagi, atau klik Menyerah untuk melihat solusi.'}
          </motion.div>
        )}

        <AnimatePresence>
          {showSurrenderCard && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 sm:p-4 space-y-2"
            >
              <div className="flex items-center gap-1.5">
                <Trophy size={13} className="text-destructive" />
                <h3 className="text-xs sm:text-sm font-semibold text-destructive">{t('challenge.surrenderCardTitle')}</h3>
              </div>
              <pre className="p-2.5 rounded-lg bg-muted text-[10px] font-mono text-foreground overflow-auto max-h-[200px] leading-relaxed">
                <code>{challenge!.solution}</code>
              </pre>
              {challenge!.hints.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[10px] font-medium text-muted-foreground">{t('challenge.hints')}:</p>
                  {challenge!.hints.map((hint, i) => (
                    <p key={i} className="text-[10px] text-muted-foreground">• {hint}</p>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {challenge!.hints.length > 0 && (
          <div className="rounded-xl border border-border overflow-hidden">
            <button
              onClick={() => setShowHints(!showHints)}
              className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-muted transition-colors"
            >
              <span className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <Lightbulb size={12} className="text-warning" />
                {t('challenge.hints')} ({challenge!.hints.length})
              </span>
              <motion.div animate={{ rotate: showHints ? 90 : 0 }} transition={{ duration: 0.15 }}>
                <ChevronRight size={12} className="text-muted-foreground" />
              </motion.div>
            </button>
            <AnimatePresence>
              {showHints && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="px-3 pb-2 pt-1 border-t border-border space-y-1">
                    {challenge!.hints.map((hint, i) => (
                      <p key={i} className="text-[11px] text-muted-foreground">• {hint}</p>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-52px-56px)] sm:h-[calc(100dvh-52px)]">
      <FadeIn>
        <div className="px-3 sm:px-6 pt-3 sm:pt-4 pb-2 sm:pb-3 border-b border-border bg-card shrink-0">
          <div className="flex items-center justify-between max-w-6xl mx-auto mb-2 sm:mb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-accent/10">
                <Trophy size={18} className="text-accent" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-foreground tracking-tight">{t('challenge.title')}</h1>
                <p className="text-[10px] text-muted-foreground hidden sm:block">{t('challenge.subtitle')}</p>
              </div>
            </div>
            {challenge && (
              <motion.button
                onClick={() => {
                  setChallenge(null);
                  setSelectedDifficulty(null);
                  setCheckResult(null);
                  setShowSurrenderCard(false);
                  setChallengeStarted(false);
                }}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1.5 rounded-lg hover:bg-muted"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <RotateCcw size={12} />
                <span className="text-xs">{t('challenge.newChallenge')}</span>
              </motion.button>
            )}
          </div>

          <div className="flex items-center gap-2 max-w-6xl mx-auto">
            <div className="relative shrink-0">
              <button
                onClick={() => setShowLangPicker(!showLangPicker)}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-border hover:bg-muted text-muted-foreground transition-colors"
              >
                <Code2 size={11} />
                <span>{LANG_DISPLAY[selectedLang] || selectedLang}</span>
                <ChevronDown size={10} />
              </button>
              <AnimatePresence>
                {showLangPicker && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowLangPicker(false)} />
                    <motion.div
                      className="absolute top-full left-0 mt-1 z-50 bg-card border border-border rounded-lg p-1.5 min-w-[120px] shadow-lg space-y-0.5"
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.15 }}
                    >
                      {CHALLENGE_LANGUAGES.map((lang) => (
                        <button
                          key={lang}
                          onClick={() => {
                            setSelectedLang(lang);
                            setShowLangPicker(false);
                          }}
                          className={`w-full text-left px-3 py-1.5 text-xs rounded-md transition-colors ${
                            selectedLang === lang ? 'bg-accent/10 text-accent' : 'text-muted-foreground hover:bg-muted'
                          }`}
                        >
                          {LANG_DISPLAY[lang] || lang}
                        </button>
                      ))}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
              {(Object.keys(DIFFICULTY_META) as Difficulty[]).map((diff) => {
                const meta = DIFFICULTY_META[diff];
                const { Icon } = meta;
                return (
                  <motion.button
                    key={diff}
                    onClick={() => generateChallenge(diff)}
                    disabled={isGenerating}
                    className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors shrink-0 ${
                      selectedDifficulty === diff && challenge
                        ? `border-accent/30 ${meta.bg} ${meta.color}`
                        : 'border-border hover:bg-muted text-muted-foreground'
                    } disabled:opacity-40 disabled:cursor-not-allowed`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {isGenerating && selectedDifficulty === diff ? (
                      <Loader2 size={11} className="animate-spin" />
                    ) : (
                      <Icon size={11} />
                    )}
                    <span className="text-xs">{DIFFICULTY_LABELS[diff]}</span>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </div>
      </FadeIn>

      {isMobile ? (
        <>
          <div className="flex border-b border-border bg-muted shrink-0">
            {(['editor', 'challenge'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setMobileTab(tab)}
                className={`flex-1 py-2.5 text-xs font-medium text-center transition-colors relative ${
                  mobileTab === tab ? 'text-accent' : 'text-muted-foreground'
                }`}
              >
                {tab === 'editor' ? t('editorPage.editorTab') : t('header.challenges', 'Tantangan')}
                {mobileTab === tab && (
                  <motion.div
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent"
                    layoutId="tantangan-mobile-tab"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
              </button>
            ))}
          </div>

          <div className="flex-1 min-h-0 overflow-hidden">
            <AnimatePresence mode="wait" custom={mobileTab === 'editor' ? -1 : 1}>
              <motion.div
                key={mobileTab}
                custom={mobileTab === 'editor' ? -1 : 1}
                className="h-full"
                initial={{ opacity: 0, x: mobileTab === 'editor' ? -40 : 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: mobileTab === 'editor' ? 40 : -40 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              >
                {mobileTab === 'editor' ? (
                  <CodeEditor challengeMode />
                ) : (
                  <div className="h-full overflow-y-auto">
                    {isGenerating && (
                      <div className="flex flex-col items-center justify-center h-full gap-4 p-6">
                        <Loader2 size={32} className="animate-spin text-accent" />
                        <p className="text-sm text-muted-foreground">{t('challenge.generating')}</p>
                      </div>
                    )}

                    {!challenge && !isGenerating && !error && (
                      <div className="flex flex-col items-center justify-center h-full gap-3 p-6 text-center">
                        <div className="mx-auto w-16 h-16 rounded-2xl bg-muted border border-border flex items-center justify-center text-muted-foreground opacity-80">
                          <Trophy size={28} />
                        </div>
                        <p className="text-sm text-muted-foreground">{t('challenge.selectDifficulty')}</p>
                        {completedChallenges.size > 0 && (
                          <div className="flex items-center gap-1.5 text-xs text-success">
                            <CheckCircle size={12} />
                            <span>{t('challenge.completedCount', { count: completedChallenges.size })}</span>
                          </div>
                        )}
                      </div>
                    )}

                    <AnimatePresence>
                      {challenge && !isGenerating && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 20 }}
                          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                          className="p-4"
                        >
                          <ChallengeCard />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </>
      ) : (
        <div className="flex-1 min-h-0 flex">
          <div className="w-1/2 min-w-0 border-r border-border">
            <CodeEditor challengeMode />
          </div>

          <div className="w-1/2 min-w-0 overflow-y-auto">
            {isGenerating && (
              <AsyncLoading label={t('challenge.generating')} onRefresh={() => generateChallenge(selectedDifficulty || 'easy')} />
            )}
            {error && <AsyncError error={error} onRetry={() => generateChallenge(selectedDifficulty || 'easy')} />}

            {!challenge && !isGenerating && !error && (
              <div className="flex flex-col items-center justify-center h-full gap-3 p-6 text-center">
                <div className="mx-auto w-16 h-16 rounded-2xl bg-muted border border-border flex items-center justify-center text-muted-foreground opacity-80">
                  <Trophy size={28} />
                </div>
                <p className="text-sm text-muted-foreground">{t('challenge.selectDifficulty')}</p>
                {completedChallenges.size > 0 && (
                  <div className="flex items-center gap-1.5 text-xs text-success">
                    <CheckCircle size={12} />
                    <span>{t('challenge.completedCount', { count: completedChallenges.size })}</span>
                  </div>
                )}
              </div>
            )}

            <AnimatePresence>
              {challenge && !isGenerating && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="p-4"
                >
                  <ChallengeCard />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}
