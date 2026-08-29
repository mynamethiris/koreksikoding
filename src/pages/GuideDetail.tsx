import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, ChevronRight, Check, Loader2, Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useState, useEffect, useRef } from 'react';
import { FadeIn } from '@/components/motion';
import { GuideVisual, ImageVisual } from '@/components/GuideVisuals';
import { Quiz } from '@/components/Quiz';
import { GUIDES } from '@/lib/guidesData';
import { getGuideContent, type GuideContentData } from '@/lib/guideContent';
import { saveProgress, getProgress, saveQuizScore } from '@/lib/progressStorage';

export function GuideDetail() {
  const { id } = useParams();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState(0);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const guide = GUIDES.find((g) => g.id === id);
  const [content, setContent] = useState<GuideContentData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getGuideContent(id, i18n.language)
      .then((data) => {
        setContent(data);
        setLoading(false);
      })
      .catch(() => {
        setContent(null);
        setLoading(false);
      });
  }, [id, i18n.language]);

  const currentIdx = guide ? GUIDES.findIndex((g) => g.id === id) : -1;
  const prevGuide = guide && currentIdx > 0 ? GUIDES[currentIdx - 1] : null;
  const nextGuide = guide && currentIdx < GUIDES.length - 1 ? GUIDES[currentIdx + 1] : null;
  
  const [sectionProgress, setSectionProgress] = useState<Record<number, boolean>>({});
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [quizStatus, setQuizStatus] = useState<'not_started' | 'passed' | 'failed'>('not_started');
  const guideIdRef = useRef(guide?.id);
  const contentSectionsRef = useRef(content?.sections);

  useEffect(() => {
    guideIdRef.current = guide?.id;
  }, [guide?.id]);

  useEffect(() => {
    contentSectionsRef.current = content?.sections;
  }, [content?.sections]);

  useEffect(() => {
    if (!content) return;

    observerRef.current?.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const bestEntry = entries
          .filter((entry) => entry.isIntersecting)
          .reduce<IntersectionObserverEntry | null>(
            (best, entry) =>
              best === null || (entry.intersectionRatio ?? 0) > (best.intersectionRatio ?? 0)
                ? entry
                : best,
            null,
          );

        if (bestEntry) {
          const target = bestEntry.target as HTMLElement;
          const idx = Number(target.id.replace('section-', ''));
          setActiveSection(idx);

          const currentGuideId = guideIdRef.current;
          const currentSections = contentSectionsRef.current;
          if (currentGuideId && currentSections) {
            saveProgress(currentGuideId, idx, currentSections.length);
          }
        }
      },
      { threshold: Array.from({ length: 101 }, (_, i) => i * 0.01), rootMargin: '-40% 0px -60%' },
    );

    content.sections.forEach((_, i) => {
      const el = document.getElementById(`section-${i}`);
      if (el) observerRef.current?.observe(el);
    });

    return () => observerRef.current?.disconnect();
  }, [guide?.id, content?.sections]);

  useEffect(() => {
    if (guide && content) {
      const progress = getProgress(guide.id);
      const progressMap: Record<number, boolean> = {};
      
      if (progress) {
        progress.completedSections.forEach(sectionIdx => {
          progressMap[sectionIdx] = true;
        });
        setQuizCompleted(progress.quizScore !== undefined);
        if (progress.quizScore !== undefined) {
          setQuizStatus(progress.quizPassed ? 'passed' : 'failed');
        } else {
          setQuizStatus('not_started');
        }
      } else {
        setQuizStatus('not_started');
      }
      
      setSectionProgress(progressMap);
    }
  }, [guide?.id, content]);

  if (!guide) {
    return (
      <div className="flex items-center justify-center h-[calc(100dvh-52px)] text-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3 max-w-md"
        >
          <div className="text-5xl font-mono font-bold text-muted-foreground">404</div>
          <p className="text-sm text-muted-foreground">{t('guides.notFound')}</p>
          <button
            onClick={() => navigate('/guides')}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            {t('guides.backToList')}
          </button>
        </motion.div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100dvh-52px)] text-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-3"
        >
          <Loader2 size={24} className="animate-spin text-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground">{t('guides.loading')}</p>
        </motion.div>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="flex items-center justify-center h-[calc(100dvh-52px)] text-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3 max-w-md"
        >
          <div className="text-5xl font-mono font-bold text-muted-foreground">⚠</div>
          <p className="text-sm text-muted-foreground">{t('guides.noContent')}</p>
          <button
            onClick={() => navigate('/guides')}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            {t('guides.backToList')}
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100dvh-52px)] pb-2 sm:pb-8">
      <FadeIn>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-4 sm:pt-6">
        <div className="grid gap-3 lg:grid-cols-[260px_1fr]">
            <aside className="lg:sticky lg:top-16 lg:self-start space-y-3 max-h-[calc(100vh-160px)] overflow-y-auto pr-4">
              <button
                onClick={() => navigate('/guides')}
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors bg-card rounded-lg shadow-sm border border-border px-3 py-1.5"
              >
                <ArrowLeft size={16} />
                <span className="text-xs hidden sm:inline">{t('guides.backToList')}</span>
              </button>
              <nav aria-label="Daftar Isi" className="rounded-xl border border-border bg-card p-4 space-y-2">
                <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                  {t('guides.tableOfContent')}
                </h3>
                <ul className="space-y-1">
                  {content.sections.map((s, i) => {
                    const isActive = activeSection === i;
                    return (
                      <li key={i}>
                        <a
                          href={`#section-${i}`}
                          onClick={(e) => {
                            e.preventDefault();
                            const el = document.getElementById(`section-${i}`);
                            if (el) {
                              el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                              window.history.replaceState(null, '', `#section-${i}`);
                            }
                            setActiveSection(i);
                          }}
                          className="block text-[10px] p-1.5 rounded transition-all duration-200 relative group">
                          <span
                            className={cn(
                              'absolute inset-y-1 left-0 w-0.5 rounded-full bg-accent transition-opacity duration-200 hidden lg:block',
                              isActive ? 'opacity-60' : 'opacity-0 group-hover:opacity-50',
                            )}
                          />
                          <span
                            className={cn(
                              'flex items-center gap-1.5 pl-2 transition-colors duration-200',
                              isActive ? 'text-accent font-medium' : 'text-muted-foreground group-hover:text-foreground',
                            )}
                          >
                            <span className="w-4 text-center font-mono">{i + 1}</span>
                            {s.title}
                          </span>
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </nav>

              <div className="rounded-xl border border-border bg-card p-4 space-y-2">
                <p className="text-xs text-muted-foreground leading-relaxed">{content.summary}</p>
              </div>
            </aside>

            <main className="space-y-6">
              <div className="space-y-2">
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">{content.title}</h1>
                <p className="text-sm text-muted-foreground max-w-2xl">{content.description}</p>
              </div>

              <div className="space-y-5">
               {content.sections.map((section, i) => (
                <motion.section
                  key={i}
                  id={`section-${i}`}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: i * 0.05 }}
                  className="rounded-xl border border-border bg-card p-4 sm:p-6 scroll-mt-20"
                >
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-muted font-mono">{i + 1}</span>
                        {section.title}
                      </h2>
                      <div className="flex items-center gap-2">
                        {sectionProgress[i] && (
                          <Check size={14} className="text-accent" />
                        )}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{section.content}</p>

                      {section.bullets.length > 0 && (
                        <ul className="space-y-1.5 list-disc list-inside text-sm text-muted-foreground">
                          {section.bullets.map((b, j) => (
                            <li key={j} className="leading-relaxed">{b}</li>
                          ))}
                        </ul>
                      )}

                      {section.image && (
                        <ImageVisual
                          src={section.image}
                          alt={section.title}
                          caption={section.imageCaption}
                        />
                      )}

                      {section.visual && !section.image && (
                        <div className="my-4">
                          <GuideVisual name={section.visual} />
                        </div>
                      )}
                    </div>
                  </motion.section>
                ))}
              </div>

{content.quiz && quizStatus !== 'passed' && (
            <Quiz 
              quizData={content.quiz} 
              onComplete={(score) => {
                if (guide && content.quiz) {
                  const totalQuestions = content.quiz.questions.length;
                  const passed = score === totalQuestions;
                  saveQuizScore(guide.id, score, passed);
                  setQuizCompleted(true);
                  setQuizStatus(passed ? 'passed' : 'failed');
                }
              }}
              completed={quizCompleted}
            />
          )}

              <nav className="flex items-center justify-between pt-6 border-t border-border">
                {prevGuide && (
                  <motion.button
                    onClick={() => navigate(`/guides/${prevGuide.id}`)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border hover:bg-muted transition-colors"
                    whileHover={{ x: -2 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <ArrowLeft size={12} />
                    <span className="truncate max-w-[160px]">{t(prevGuide.titleKey)}</span>
                  </motion.button>
                )}
                <div className="text-[10px] text-muted-foreground font-mono">
                  {currentIdx + 1} / {GUIDES.length}
                </div>
                {nextGuide && (
                  <motion.button
                    onClick={() => navigate(`/guides/${nextGuide.id}`)}
                    disabled={quizStatus !== 'passed'}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    whileHover={quizStatus === 'passed' ? { x: 2 } : {}}
                    whileTap={{ scale: 0.98 }}
                  >
                    <span className="truncate max-w-[160px] text-right">{t(nextGuide.titleKey)}</span>
                    {quizStatus !== 'passed' && <Lock size={12} className="text-muted-foreground/70" />}
                    <ChevronRight size={12} className={quizStatus !== 'passed' ? 'text-muted-foreground/50' : undefined} />
                  </motion.button>
                )}
            </nav>
            {content.quiz && quizStatus !== 'passed' && (
              <motion.p
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1"
              >
                <Lock size={10} />
                {t('guides.quizRequire')}
              </motion.p>
            )}
          </main>
        </div>
      </div>
    </FadeIn>
  </div>
  );
}

function cn(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
