import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ChevronRight, BookOpen, Lock, CheckCircle, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { FadeIn, FadeInStagger, FadeInStaggerItem } from '@/components/motion';
import { GUIDES, type GuideItem } from '@/lib/guidesData';
import { getQuizStatus, isGuideUnlocked } from '@/lib/progressStorage';

export function GuidesPage() {
  const { t } = useTranslation();

  useEffect(() => {
    const main = document.querySelector('main');
    if (main) main.scrollTop = 0;
  }, []);

  return (
    <div className="min-h-full pb-24 sm:pb-6">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12">
        <FadeIn>
          <div className="text-center mb-8 sm:mb-12">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
              {t('guides.title')}
            </h1>
            <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
              {t('guides.subtitle')}
            </p>
          </div>
        </FadeIn>

        <FadeInStagger className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {GUIDES.map((guide, index) => (
            <FadeInStaggerItem key={guide.id}>
              <GuideCard guide={guide} index={index} />
            </FadeInStaggerItem>
          ))}
        </FadeInStagger>
      </div>
    </div>
  );
}

function GuideCard({ guide, index }: { guide: GuideItem; index: number }) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const quizStatus = getQuizStatus(guide.id);
  const unlocked = isGuideUnlocked(guide.id);

  return (
    <div className={`group rounded-xl border border-border bg-card overflow-hidden transition-[border-color,background-color] duration-300 flex flex-col h-full ${!unlocked ? 'opacity-50' : ''}`}>
      <div className="flex items-start gap-3 p-4 sm:p-5 relative">
        <div className={`inline-flex p-2.5 rounded-lg shrink-0 ${guide.bg}`}>
          <guide.icon size={18} className={guide.color} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-semibold text-foreground">{t(guide.titleKey)}</h3>
            {quizStatus === 'passed' && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-success/10 text-success text-[9px] font-medium">
                <CheckCircle size={8} />
                {t('guides.completed')}
              </span>
            )}
            {quizStatus === 'failed' && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-destructive/10 text-destructive text-[9px] font-medium">
                <AlertCircle size={8} />
                {t('guides.needsRetry')}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            {t(guide.descKey)}
          </p>
        </div>
        {!unlocked && index > 0 && (
          <div className="absolute top-3 right-3">
            <Lock size={14} className="text-muted-foreground/50" />
          </div>
        )}
      </div>

      <div className="mt-auto px-4 pb-4 pt-2 border-t border-border">
        <motion.button
          onClick={() => {
            if (unlocked) {
              navigate(`/guides/${guide.id}`);
            }
          }}
          disabled={!unlocked}
          className="flex items-center justify-center gap-1.5 text-xs font-medium rounded-lg bg-accent text-accent-foreground hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors w-full px-3 py-1.5"
          whileHover={unlocked ? { scale: 1.02 } : {}}
          whileTap={unlocked ? { scale: 0.98 } : {}}
        >
          <BookOpen size={12} />
          {t('guides.openGuide')}
          <ChevronRight size={12} />
        </motion.button>
      </div>
    </div>
  );
}