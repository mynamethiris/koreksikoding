import { useState, useCallback, useEffect } from 'react';
import { Settings, Eye, EyeOff, Check, Trash2, Users, GraduationCap, Crown, User, Zap, ChevronDown, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { useApp } from '@/store/AppContext';
import { saveProviders, testConnection, fetchAvailableModels } from '@/lib/api';
import { db } from '@/lib/db';
import { FadeIn } from '@/components/motion';
import { ConfirmModal } from '@/components/Modal';
import type { AIProvider, TeamMember } from '@/types';
import toast from 'react-hot-toast';
import { useSearchParams } from 'react-router-dom';

function buildEndpoint(providerName: string, model: string, currentEndpoint: string): string {
  if (providerName === 'Gemini') {
    return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  }
  return currentEndpoint;
}

function MemberCard({ member, index }: { member: TeamMember; index: number }) {
  const isLeader = member.role.toLowerCase().includes('ketua') || member.role.toLowerCase().includes('leader');
  const IconComp = isLeader ? Crown : User;
  return (
    <a
      href={member.github}
      target="_blank"
      rel="noopener noreferrer"
      className="block"
    >
      <motion.div
        className="p-4 rounded-xl border border-border bg-card text-center space-y-2 hover:border-accent/30 hover:bg-accent/5 transition-[border-color,background-color] duration-200 cursor-pointer"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto ${isLeader ? 'bg-accent/15' : 'bg-muted'}`}>
          <IconComp size={18} className={isLeader ? 'text-accent' : 'text-muted-foreground'} />
        </div>
        <h3 className="text-sm font-semibold text-foreground text-wrap-balance">{member.name}</h3>
        <span className="text-[10px] px-2 py-0.5 rounded-md bg-accent/10 text-accent font-medium">
          {member.role}
        </span>
      </motion.div>
    </a>
  );
}

export function SettingsPage() {
  const { t, i18n } = useTranslation();
  const { providers, activeProvider, setActiveProvider, setProviders, customPrompt, setCustomPrompt } = useApp();

  const TEAM = [
    { name: 'Favian Zufar Niardi', role: t('settings.teamLeader'), origin: 'Bekasi', github: 'https://github.com/mynamethiris' },
    { name: 'Andante Akmal Alvaro', role: t('settings.member'), origin: 'Tegal', github: 'https://github.com/andanteakmalalvaro-lab' },
    { name: 'Bastian Nathaniel Inhadi', role: t('settings.member'), origin: 'Bekasi', github: 'https://github.com/bazbizbuz' },
  ];

  const ADVISOR: TeamMember = {
    name: 'Retno Ariyanti Nurningtias, S.Pd., Gr',
    role: t('settings.advisorRole'),
    origin: '',
    github: 'https://github.com/retno412',
  };
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [clearDataConfirm, setClearDataConfirm] = useState(false);
  const [flashId, setFlashId] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [expandedModels, setExpandedModels] = useState<Record<string, boolean>>({});
  const [customForm, setCustomForm] = useState({
    name: '',
    endpoint: '',
    apiKey: '',
    model: '',
  });

  const triggerFlash = useCallback((id: string) => {
    setFlashId(id);
    setTimeout(() => setFlashId(null), 600);
  }, []);

  const [searchParams] = useSearchParams();
  const highlightProvider = searchParams.get('highlight') === 'provider';

  useEffect(() => {
    if (highlightProvider) {
      const firstDefaultProvider = providers.find((p) => p.isDefault);
      if (firstDefaultProvider) {
        triggerFlash(firstDefaultProvider.id);
        const element = document.getElementById(`provider-${firstDefaultProvider.id}`);
        element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [highlightProvider, providers, triggerFlash]);

  const toggleKey = (id: string) => setShowKeys((p) => ({ ...p, [id]: !p[id] }));

  const updateApiKey = (providerId: string, key: string) => {
    const updated = providers.map((p) =>
      p.id === providerId ? { ...p, apiKey: key } : p,
    );
    setProviders(updated);
    saveProviders(updated);
    if (key && providerId !== activeProvider.id) {
      const provider = updated.find((p) => p.id === providerId);
      if (provider) {
        setActiveProvider(provider);
        triggerFlash(providerId);
        toast.success(t('settings.providerSet', { name: provider.name }));
      }
    } else if (providerId === activeProvider.id) {
      setActiveProvider({ ...activeProvider, apiKey: key });
    }
  };

  const handleSelectProvider = (provider: AIProvider) => {
    setActiveProvider(provider);
    triggerFlash(provider.id);
    toast.success(t('settings.providerSet', { name: provider.name }));
  };

  const handleModelChange = (providerId: string, newModel: string) => {
    const updated = providers.map((p) =>
      p.id === providerId ? { ...p, model: newModel, endpoint: buildEndpoint(p.name, newModel, p.endpoint) } : p,
    );
    setProviders(updated);
    saveProviders(updated);
    if (activeProvider.id === providerId) {
      const provider = updated.find((p) => p.id === providerId);
      if (provider) setActiveProvider(provider);
    }
  };

  const handleTestConnection = async (provider: AIProvider) => {
    if (!provider.apiKey) {
      toast.error(t('settings.enterKeyFirst'));
      return;
    }
    setTestingId(provider.id);
    try {
      const result = await testConnection(provider);
      if (result.success) {
        toast.success(result.message);
        const models = await fetchAvailableModels(provider);
        if (models.length > 0) {
          const updated = providers.map((p) =>
            p.id === provider.id ? { ...p, availableModels: models } : p,
          );
          setProviders(updated);
          saveProviders(updated);
          toast.success(t('settings.modelsFetched', { count: models.length }));
        }
      } else {
        toast.error(result.message);
      }
    } finally {
      setTestingId(null);
    }
  };

  const addCustomProvider = () => {
    if (!customForm.name || !customForm.endpoint || !customForm.apiKey || !customForm.model) return;
    const newProvider: AIProvider = {
      id: `custom-${Date.now()}`,
      name: customForm.name,
      endpoint: customForm.endpoint,
      apiKey: customForm.apiKey,
      model: customForm.model,
    };
    const updated = [...providers, newProvider];
    setProviders(updated);
    saveProviders(updated);
    setCustomForm({ name: '', endpoint: '', apiKey: '', model: '' });
    toast.success(t('settings.providerAdded', { name: newProvider.name }));
  };

  const handleClearAllData = async () => {
    try { await db.deleteAll(); } catch { }
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        localStorage.removeItem(localStorage.key(i)!);
      }
    } catch { }
    try { sessionStorage.clear(); } catch { }
    toast.success(t('settings.dataCleared'));
    window.location.reload();
  };

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 pb-20 space-y-8">
      <FadeIn>
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Settings size={24} />
            {t('settings.title')}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{t('settings.subtitle')}</p>
        </div>
      </FadeIn>

      <FadeIn delay={0.1}>
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{t('settings.aiProvider')}</h2>
            <p className="text-sm text-muted-foreground mt-1">{t('settings.aiProviderDesc')}</p>
          </div>

          <div className="space-y-3">
            {providers.map((p) => (
              <motion.div key={p.id} id={`provider-${p.id}`}
                className={`relative p-4 rounded-xl border cursor-pointer transition-colors duration-200 ${
                  activeProvider.id === p.id
                    ? 'border-accent/30'
                    : 'border-border hover:border-accent/20'
                }`}
                onClick={() => handleSelectProvider(p)}
              >
                <motion.div
                  className="absolute inset-0 rounded-xl bg-accent/10 pointer-events-none"
                  initial={false}
                  animate={{ opacity: flashId === p.id ? [0, 1, 0] : 0 }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                />
                <div className="relative flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">{p.name}</span>
                    {p.isDefault && <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-accent/10 text-accent font-medium">{t('settings.default')}</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <AnimatePresence mode="wait">
                      {activeProvider.id === p.id && (
                        <motion.div
                          key="check"
                          initial={{ scale: 0, rotate: -45 }}
                          animate={{ scale: 1, rotate: 0 }}
                          exit={{ scale: 0, rotate: 45 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                        >
                          <Check size={16} className="text-success" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <div className="mb-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (p.availableModels && p.availableModels.length > 0) {
                          setExpandedModels((prev) => ({ ...prev, [p.id]: !prev[p.id] }));
                        }
                      }}
                      disabled={!p.availableModels || p.availableModels.length === 0}
                      className={`w-full flex items-center justify-between px-3 py-1.5 text-xs rounded-lg border border-border bg-background transition-colors ${
                        p.availableModels && p.availableModels.length > 0
                          ? 'hover:bg-muted cursor-pointer'
                          : 'opacity-60 cursor-default'
                      }`}
                    >
                      <span className="text-muted-foreground">Model: <span className="text-foreground font-medium">{p.model}</span></span>
                      {p.availableModels && p.availableModels.length > 0 && (
                        <motion.div animate={{ rotate: expandedModels[p.id] ? 180 : 0 }} transition={{ duration: 0.15 }}>
                          <ChevronDown size={12} className="text-muted-foreground" />
                        </motion.div>
                      )}
                    </button>
                    {(!p.availableModels || p.availableModels.length === 0) && (
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        {t('settings.setModelHint')}
                      </p>
                    )}
                    <AnimatePresence>
                      {expandedModels[p.id] && p.availableModels && p.availableModels.length > 0 && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.15 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-1 p-1 rounded-lg border border-border bg-background space-y-0.5">
                            {p.availableModels.map((modelId) => (
                              <button
                                key={modelId}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleModelChange(p.id, modelId);
                                  setExpandedModels((prev) => ({ ...prev, [p.id]: false }));
                                }}
                                className={`w-full text-left px-3 py-1.5 text-xs rounded-md transition-colors ${
                                  p.model === modelId
                                    ? 'bg-accent/10 text-accent font-medium'
                                    : 'text-muted-foreground hover:bg-muted'
                                }`}
                              >
                                {modelId}
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    {p.recommended && p.recommended.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap items-center gap-1">
                        <span className="text-[9px] text-muted-foreground">{t('settings.recommendedModels')}:</span>
                        {p.recommended.map((m) => (
                          <button
                            key={m}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleModelChange(p.id, m);
                            }}
                            className={`text-[9px] px-2 py-0.5 rounded-md border transition-colors text-center min-w-[4rem] ${
                              p.model === m
                                ? 'border-success/30 bg-success/10 text-success font-medium'
                                : 'border-border text-muted-foreground hover:bg-muted'
                            }`}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                <div className="relative flex items-center gap-2">
                  <input
                    id={`api-key-${p.id}`}
                    name={`api-key-${p.id}`}
                    type={showKeys[p.id] ? 'text' : 'password'}
                    autoComplete="new-password"
                    inputMode="text"
                    enterKeyHint="done"
                    value={p.apiKey}
                    onChange={(e) => updateApiKey(p.id, e.target.value)}
                    onPaste={(e) => {
                      const pasted = e.clipboardData.getData('text');
                      if (pasted && pasted.trim().length >= 20) {
                        e.preventDefault();
                        updateApiKey(p.id, pasted.trim());
                        toast.success(t('settings.pasted'));
                      }
                    }}
                    placeholder={t('settings.enterApiKey')}
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none transition-all"
                  />
                  <motion.button
                    onClick={(e) => { e.stopPropagation(); toggleKey(p.id); }}
                    className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    {showKeys[p.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                  </motion.button>
                  <motion.button
                    onClick={(e) => { e.stopPropagation(); handleTestConnection(p); }}
                    disabled={testingId === p.id || !p.apiKey}
                    className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground disabled:opacity-40"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    title={t('settings.testConnection')}
                  >
                    <div className="relative">
                      <Zap size={14} />
                      {testingId === p.id && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-3.5 h-3.5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                        </div>
                      )}
                    </div>
                  </motion.button>
                </div>
                {(p.id === 'gemini' || p.id === 'groq') && (
                  <a
                    href={p.id === 'gemini' ? 'https://aistudio.google.com/app/apikey' : 'https://console.groq.com/keys'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 mt-1 text-xs text-accent hover:underline font-medium"
                  >
                    <ExternalLink size={10} />
                    {t('settings.getApiKey')}
                  </a>
                )}
                {p.endpoint && (
                  <div className="relative mt-2">
                    <input
                      id={`endpoint-${p.id}`}
                      name={`endpoint-${p.id}`}
                      value={p.endpoint}
                      readOnly
                      className="w-full px-3 py-1.5 text-[10px] font-mono rounded-lg border border-border bg-muted text-muted-foreground focus:outline-none"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                )}
              </motion.div>
            ))}
          </div>

          <div className="border border-border rounded-xl p-4 space-y-3">
            <h4 className="text-sm font-medium text-foreground">{t('settings.addCustom')}</h4>
            <div className="grid grid-cols-2 gap-2">
              <input
                id="custom-provider-name"
                name="custom-provider-name"
                value={customForm.name}
                onChange={(e) => setCustomForm((p) => ({ ...p, name: e.target.value }))}
                placeholder={t('settings.providerName')}
                className="px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none"
              />
              <input
                id="custom-provider-model"
                name="custom-provider-model"
                value={customForm.model}
                onChange={(e) => setCustomForm((p) => ({ ...p, model: e.target.value }))}
                placeholder={t('settings.modelName')}
                className="px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none"
              />
            </div>
            <input
              id="custom-provider-endpoint"
              name="custom-provider-endpoint"
              value={customForm.endpoint}
              onChange={(e) => setCustomForm((p) => ({ ...p, endpoint: e.target.value }))}
              placeholder={t('settings.endpoint')}
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none"
            />
            <div className="flex items-center gap-2">
              <input
                id="custom-provider-apikey"
                name="custom-provider-apikey"
                type="password"
                autoComplete="new-password"
                inputMode="text"
                enterKeyHint="done"
                value={customForm.apiKey}
                onChange={(e) => setCustomForm((p) => ({ ...p, apiKey: e.target.value }))}
                placeholder={t('settings.apiKey')}
                className="flex-1 px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none"
              />
              <motion.button onClick={addCustomProvider}
                className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-medium transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {t('settings.add')}
              </motion.button>
            </div>
          </div>
        </div>
      </FadeIn>

      <FadeIn delay={0.15}>
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{t('settings.customPrompt')}</h2>
            <p className="text-sm text-muted-foreground mt-1">{t('settings.customPromptDesc')}</p>
          </div>
          <div className="p-4 rounded-xl border border-border space-y-3">
            <textarea
              id="custom-prompt"
              name="custom-prompt"
              value={customPrompt}
              onChange={(e) => { if (e.target.value.length <= 5000) setCustomPrompt(e.target.value); }}
              placeholder={t('settings.customPromptPlaceholder')}
              rows={6}
              maxLength={5000}
              className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-border bg-background text-foreground focus:outline-none resize-none"
            />
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground tabular-nums">{customPrompt.length}/5000</span>
              <div className="flex items-center gap-2">
                {customPrompt && (
                  <button
                    onClick={() => setCustomPrompt('')}
                    className="px-3 py-1.5 text-xs rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    {t('settings.resetDefault')}
                  </button>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {[
                { label: t('settings.presetDefault'), value: '' },
                { label: t('settings.presetFocusError'), value: i18n.language === 'en' ? 'Focus only on critical errors. Ignore warnings and suggestions unless absolutely important.' : 'Fokus hanya pada error kritis. Abaikan warning dan saran kecuali sangat penting.' },
                { label: t('settings.presetDetail'), value: i18n.language === 'en' ? 'Provide complete analysis: errors, warnings, fix suggestions, tips, and best practices for each issue.' : 'Berikan analisis lengkap: error, warning, saran perbaikan, tips, dan best practice untuk setiap masalah.' },
              ].map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => setCustomPrompt(preset.value)}
                  className="px-3 py-1.5 text-xs rounded-full border border-border hover:bg-muted transition-colors text-muted-foreground"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </FadeIn>

      <FadeIn delay={0.25}>
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Users size={18} />
              {t('settings.aboutUs')}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">{t('settings.aboutUsDesc')}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {TEAM.map((member, i) => {
              const isLeader = member.role.toLowerCase().includes('ketua') || member.role.toLowerCase().includes('leader');
              const orderClass = isLeader ? 'sm:order-2' : i === 0 ? 'sm:order-1' : 'sm:order-3';
              return (
                <div key={member.name} className={orderClass}>
                  <MemberCard member={member} index={i} />
                </div>
              );
            })}
          </div>

          <a href={ADVISOR.github} target="_blank" rel="noopener noreferrer" className="block">
            <motion.div
        className="p-3 sm:p-4 rounded-xl border border-border bg-card text-center space-y-2 hover:border-accent/30 hover:bg-accent/5 transition-[border-color,background-color] duration-200 cursor-pointer"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: TEAM.length * 0.1, ease: [0.16, 1, 0.3, 1] }}
            >
        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-accent/10 flex items-center justify-center mx-auto">
                <GraduationCap size={18} className="text-accent" />
              </div>
              <h3 className="text-sm font-semibold text-foreground text-wrap-balance">{ADVISOR.name}</h3>
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-accent/10 text-accent font-medium">
                <GraduationCap size={10} className="inline -mt-0.5 mr-1" />
                {ADVISOR.role}
              </span>
            </motion.div>
          </a>

        </div>
      </FadeIn>

      <FadeIn delay={0.3}>
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-destructive">{t('settings.dangerZone')}</h2>
            <p className="text-sm text-muted-foreground mt-1">{t('settings.dangerZoneDesc')}</p>
          </div>

          <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/5 space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-semibold text-foreground">{t('settings.deleteAll')}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{t('settings.deleteAllDesc')}</p>
              </div>
              <motion.button
                onClick={() => setClearDataConfirm(true)}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-destructive text-white hover:bg-destructive/90 font-medium transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Trash2 size={14} />
                {t('settings.deleteAllBtn')}
              </motion.button>
          </div>
        </div>
      </FadeIn>

      <ConfirmModal
        open={clearDataConfirm}
        onClose={() => setClearDataConfirm(false)}
        onConfirm={handleClearAllData}
        title={t('settings.confirmDeleteTitle')}
        message={t('settings.confirmDeleteMsg')}
        confirmLabel={t('settings.confirmDeleteBtn')}
        confirmDanger
      />
    </div>
  );
}
