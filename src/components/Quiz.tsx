import { useState } from 'react';
import { motion } from 'motion/react';
import { CheckCircle, XCircle, HelpCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  answer: number;
}

export interface QuizData {
  title: string;
  questions: QuizQuestion[];
}

interface QuizProps {
  quizData: QuizData;
  onComplete?: (score: number) => void;
  completed?: boolean;
}

export function Quiz({ quizData, onComplete, completed }: QuizProps) {
  const { t } = useTranslation();
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [showResults, setShowResults] = useState(completed ?? false);
  const [passed, setPassed] = useState(completed ?? false);

  const handleSelect = (qid: string, optIdx: number) => {
    if (passed) return;
    setSelectedAnswers((prev) => ({ ...prev, [qid]: optIdx }));
  };

  const handleCheck = () => {
    const allAnswered = quizData.questions.every((q) => q.id in selectedAnswers);
    if (!allAnswered) return;

    setShowResults(true);
    const score = quizData.questions.reduce(
      (acc, q) => acc + (selectedAnswers[q.id] === q.answer ? 1 : 0),
      0,
    );
    const allCorrect = score === quizData.questions.length;
    setPassed(allCorrect);

    if (allCorrect && onComplete) {
      onComplete(quizData.questions.length);
    }
  };

  const handleReset = () => {
    setSelectedAnswers({});
    setShowResults(false);
    setPassed(false);
  };

  const correctCount = quizData.questions.reduce(
    (acc, q) => acc + (selectedAnswers[q.id] === q.answer ? 1 : 0),
    0,
  );
  const allAnswered = quizData.questions.every((q) => q.id in selectedAnswers);

  const isCompletedAndPassed = completed && passed;
  const isCompletedAndFailed = completed && !passed;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-xl border border-border bg-card p-5 sm:p-6 space-y-4 mt-8"
    >
      <div className="flex items-center gap-2.5">
        <div className="p-1.5 rounded-lg bg-accent/10 shrink-0">
          <HelpCircle size={16} className="text-accent" />
        </div>
        <h3 className="text-sm font-semibold text-foreground">
          {quizData.title}
        </h3>
      </div>

      <div className="space-y-4">
        {quizData.questions.map((q, qi) => {
          const userAnswer = selectedAnswers[q.id];
          const reveal = showResults || completed;

          return (
            <div key={q.id} className="space-y-2.5">
              <p className="text-xs text-foreground leading-relaxed">
                {qi + 1}. {q.question}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {q.options.map((opt, oi) => {
                  const isUserChoice = userAnswer === oi;
                  const isCorrectChoice = oi === q.answer;
                  let optClass =
                    'border-border hover:border-accent/30 hover:bg-accent/5';
                  let labelClass = 'text-foreground';
                  let icon = null;
                  let suffix = '';

                  if (reveal) {
                    if (isCorrectChoice) {
                      optClass = 'border-success/40 bg-success/5';
                      labelClass = 'text-success';
                      icon = <CheckCircle size={12} className="text-success" />;
                      suffix = isUserChoice
                        ? ` (${t('guides.quizYouPicked')})`
                        : ` (${t('guides.quizCorrect')})`;
                    } else if (isUserChoice) {
                      optClass = 'border-destructive/40 bg-destructive/5';
                      labelClass = 'text-destructive';
                      icon = <XCircle size={12} className="text-destructive" />;
                      suffix = ` (${t('guides.quizIncorrect')})`;
                    }
                  }

                  return (
                    <label
                      key={oi}
                      className={cn(
                        'flex items-center justify-between w-full gap-2 px-3 py-2 rounded-lg border text-xs cursor-pointer transition-all',
                        optClass,
                      )}
                    >
                      <div className="flex items-center gap-1.5">
                        <input
                          type="radio"
                          name={q.id}
                          value={oi}
                          checked={isUserChoice}
                          onChange={() => handleSelect(q.id, oi)}
                          disabled={passed || isCompletedAndPassed}
                          className="shrink-0"
                        />
                        <span className={`flex items-center gap-1.5 ${labelClass}`}>
                          <span className="w-5 h-5 flex items-center justify-center rounded-md bg-muted text-[9px] font-mono font-bold text-muted-foreground">
                            {String.fromCharCode(65 + oi)}
                          </span>
                          {opt}
                          <span className="text-muted-foreground/70">{suffix}</span>
                        </span>
                      </div>
                      {icon}
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 pt-1">
        {showResults && !passed && (
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xs text-destructive"
          >
            {t('guides.quizNotAllCorrect')}
          </motion.p>
        )}
        {showResults && passed && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-1.5 text-xs text-success font-medium"
          >
            <CheckCircle size={13} className="text-success" />
            {t('guides.quizPassed')}
          </motion.div>
        )}
        {completed && !showResults && passed && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-1.5 text-xs text-success font-medium"
          >
            <CheckCircle size={13} className="text-success" />
            {t('guides.quizPassed')}
          </motion.div>
        )}
        {(showResults || completed) && (
          <p className="text-xs text-muted-foreground">
            {t('guides.quizScore')}:{' '}
            <span className="font-bold text-foreground">{correctCount}</span> /{' '}
            {quizData.questions.length}
          </p>
        )}

        <div className="flex items-center gap-2">
          {!showResults && !completed && (
            <motion.button
              onClick={handleCheck}
              disabled={!allAnswered}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              whileHover={allAnswered ? { scale: 1.02 } : {}}
              whileTap={allAnswered ? { scale: 0.98 } : {}}
            >
              <CheckCircle size={12} />
              {t('guides.quizCheck')}
            </motion.button>
          )}
          {(showResults && !passed) || (isCompletedAndFailed) ? (
            <motion.button
              onClick={handleReset}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <XCircle size={12} />
              {t('guides.quizReset')}
            </motion.button>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}

function cn(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}