import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Code2, Zap, ShieldCheck, Sparkles, AlertCircle, AlertTriangle, Info, CheckCircle, Cpu, Wrench, ChevronDown, HelpCircle, ExternalLink, Pen } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { FadeIn, FadeInStagger, FadeInStaggerItem } from '@/components/motion';
import { useApp } from '@/store/AppContext';
import { showApiKeyNotification } from '@/components/ApiKeyNotification';

export function BerandaPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { activeProvider } = useApp();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const faqItems = t('beranda.faq', { returnObjects: true }) as Array<{ q: string; a: string; link?: string }>;

  const FEATURES = [
    {
      id: 'analysis',
      icon: Code2,
      title: t('beranda.feature1Title'),
      description: t('beranda.feature1Desc'),
      color: 'text-destructive',
      bg: 'bg-destructive/10',
    },
    {
      id: 'fix',
      icon: Zap,
      title: t('beranda.feature2Title'),
      description: t('beranda.feature2Desc'),
      color: 'text-success',
      bg: 'bg-success/10',
    },
    {
      id: 'learn',
      icon: HelpCircle,
      title: t('beranda.feature3Title'),
      description: t('beranda.feature3Desc'),
      color: 'text-accent',
      bg: 'bg-accent/10',
    },
    {
      id: 'security',
      icon: ShieldCheck,
      title: t('beranda.feature4Title'),
      description: t('beranda.feature4Desc'),
      color: 'text-warning',
      bg: 'bg-warning/10',
    },
  ];

  const STEPS = [
    { icon: Pen, label: t('beranda.step1Label'), desc: t('beranda.step1Desc') },
    { icon: Cpu, label: t('beranda.step2Label'), desc: t('beranda.step2Desc') },
    { icon: Wrench, label: t('beranda.step3Label'), desc: t('beranda.step3Desc') },
  ];

  return (
    <div className="min-h-full pb-20">
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-b from-accent/5 via-transparent to-background" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-accent/5 rounded-full blur-3xl" />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 pt-12 sm:pt-20 pb-12 -mb-8">
          <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
            <FadeIn>
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-medium">
                  <Sparkles size={12} />
                  {t('beranda.badge')}
                </div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground leading-tight">
                  {t('beranda.heroTitle1')}
                  <br />
                  <span className="text-accent">{t('beranda.heroTitle2')}</span>
                </h1>
                <p className="text-sm sm:text-base text-muted-foreground max-w-lg leading-relaxed">
                  {t('beranda.heroDesc')}
                </p>
                <div className="flex items-center gap-3">
                  <motion.button
                    onClick={async () => {
                      if (!activeProvider.apiKey) {
                        showApiKeyNotification();
                      } else {
                        navigate('/editor');
                      }
                    }}
                    className="px-6 py-2.5 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    {t('beranda.startAnalyze')}
                  </motion.button>
                  <motion.button
                    onClick={() => document.getElementById('faq-section')?.scrollIntoView({ behavior: 'smooth' })}
                    className="px-6 py-2.5 text-sm font-medium rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    {t('beranda.viewFaq')}
                  </motion.button>
                </div>
              </div>
            </FadeIn>

            <FadeIn delay={0.15}>
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-border bg-muted">
                  <div className="w-2.5 h-2.5 rounded-full bg-destructive/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-warning/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-success/60" />
                  <span className="ml-2 text-[10px] text-muted-foreground font-mono">analisis.js</span>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="px-3 py-1.5 rounded-lg border border-success/20 bg-success/10">
                      <span className="text-lg font-bold text-success">85</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="flex items-center gap-1 text-destructive">
                        <AlertCircle size={11} /> 2 error
                      </span>
                      <span className="flex items-center gap-1 text-warning">
                        <AlertTriangle size={11} /> 1 warning
                      </span>
                      <span className="flex items-center gap-1 text-info">
                        <Info size={11} /> 3 saran
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1 text-xs font-mono">
                    <div className="flex items-center gap-2 px-2 py-1 rounded bg-destructive/5">
                      <span className="text-muted-foreground w-4 text-right">3</span>
                      <span className="text-destructive/80">var x = undefined;</span>
                      <AlertCircle size={10} className="text-destructive ml-auto" />
                    </div>
                    <div className="flex items-center gap-2 px-2 py-1 rounded bg-warning/5">
                      <span className="text-muted-foreground w-4 text-right">7</span>
                      <span className="text-warning/80">console.log(data)</span>
                      <AlertTriangle size={10} className="text-warning ml-auto" />
                    </div>
                    <div className="flex items-center gap-2 px-2 py-1">
                      <span className="text-muted-foreground w-4 text-right">12</span>
                      <span className="text-foreground/60">return result;</span>
                      <CheckCircle size={10} className="text-success ml-auto" />
                    </div>
                  </div>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
        <FadeIn>
          <div className="text-center mb-10">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">{t('beranda.howItWorks')}</h2>
            <p className="text-sm text-muted-foreground mt-2">{t('beranda.howItWorksDesc')}</p>
          </div>
        </FadeIn>
        <FadeIn delay={0.1}>
          <div className="relative">
            <div className="sm:hidden absolute left-5 top-0 bottom-0 w-px bg-border" />
            <div className="hidden sm:block absolute top-5 left-[16.67%] right-[16.67%] h-px bg-border" />
            <div className="grid gap-6 sm:gap-8 grid-cols-1 sm:grid-cols-3">
              {STEPS.map((step, i) => {
                const Icon = step.icon;
                return (
                  <div key={step.label} className="relative flex items-center gap-4 sm:flex-col sm:text-center sm:gap-3 sm:items-center">
                    <div className="relative z-10 flex items-center justify-center w-10 h-10 rounded-full bg-accent text-accent-foreground text-sm font-bold shrink-0">
                      {i + 1}
                    </div>
                    <div className="inline-flex p-2.5 rounded-lg bg-muted text-muted-foreground shrink-0">
                      <Icon size={18} />
                    </div>
                    <div className="sm:text-center">
                      <h3 className="text-sm font-semibold text-foreground">{step.label}</h3>
                      <p className="text-xs text-muted-foreground mt-1">{step.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </FadeIn>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
        <FadeIn>
          <div className="text-center mb-10">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">{t('beranda.features')}</h2>
            <p className="text-sm text-muted-foreground mt-2">{t('beranda.featuresDesc')}</p>
          </div>
        </FadeIn>
        <FadeInStagger staggerDelay={0.1}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 grid-auto-rows-fr">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <FadeInStaggerItem key={f.id}>
                  <motion.div
                    className="flex flex-col h-full p-5 rounded-xl border border-border bg-card hover:border-accent/30 hover:bg-accent/5 transition-[border-color,background-color] duration-300"
                  >
                    <div className={`flex flex-col items-center gap-1.5 p-2.5 rounded-lg ${f.bg}`}>
                      <Icon size={18} className={f.color} />
                      <h3 className="text-sm font-semibold text-foreground text-center">{f.title}</h3>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed flex-1 mt-3 text-center">{f.description}</p>
                  </motion.div>
                </FadeInStaggerItem>
              );
            })}
          </div>
        </FadeInStagger>
      </div>

      <div id="faq-section" className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
        <FadeIn>
          <div className="text-center mb-10">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">{t('beranda.faqTitle')}</h2>
            <p className="text-sm text-muted-foreground mt-2">{t('beranda.faqDesc')}</p>
          </div>
        </FadeIn>
        <FadeIn delay={0.1}>
          <div className="space-y-2">
            {faqItems.map((item, i) => {
              const isOpen = openFaq === i;
              return (
                <div
                  key={i}
                  className="rounded-xl border border-border bg-card overflow-hidden"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : i)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <HelpCircle size={14} className="text-accent shrink-0" />
                    <span className="text-sm font-medium text-foreground flex-1">{item.q}</span>
                    <motion.div
                      animate={{ rotate: isOpen ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                      className="text-muted-foreground shrink-0"
                    >
                      <ChevronDown size={14} />
                    </motion.div>
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                      >
                        <div className="px-4 pb-3 pt-1 border-t border-border">
                          <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                            {item.a}
                          </p>
                          {item.link && (
                            <a
                              href={item.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 mt-2 text-[11px] font-medium text-accent hover:underline"
                            >
                              <ExternalLink size={10} />
                              {item.link}
                            </a>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </FadeIn>
      </div>
    </div>
  );
}
