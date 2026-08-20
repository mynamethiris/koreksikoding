import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Trash2, Download, Upload, Calendar, AlertTriangle, AlertCircle, Info, RotateCcw, Trophy, Clock, Play, Eye, Copy, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { db } from '@/lib/db';
import { formatTimestamp, exportToJSON, exportToCSV, downloadFile, getFileExtensionForLanguage, getLanguageExtension, LANG_DISPLAY } from '@/lib/api';
import { FadeIn } from '@/components/motion';
import { PageSkeleton } from '@/components/Skeleton';
import { EmptyState } from '@/components/EmptyState';
import { ConfirmModal, Modal } from '@/components/Modal';
import { useApp } from '@/store/AppContext';
import type { HistoryEntry, ChallengeHistoryEntry } from '@/types';
import CodeMirror from '@uiw/react-codemirror';
import { lightTheme, darkTheme } from '@/lib/editor-themes';
import toast from 'react-hot-toast';

function parseCSVRow(line: string): string[] {
  const cols: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let j = 0; j < line.length; j++) {
    const ch = line[j];
    if (inQuotes) {
      if (ch === '"' && line[j + 1] === '"') { current += '"'; j++; }
      else if (ch === '"') { inQuotes = false; }
      else { current += ch; }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ',') { cols.push(current); current = ''; }
      else { current += ch; }
    }
  }
  cols.push(current);
  return cols;
}

type TabType = 'analysis' | 'challenges';

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: 'text-success bg-success/10',
  medium: 'text-warning bg-warning/10',
  hard: 'text-destructive bg-destructive/10',
};

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: 'Mudah',
  medium: 'Sedang',
  hard: 'Sulit',
};

export function RiwayatPage() {
  const { t, i18n } = useTranslation();
  const { setFiles, setActiveFileId, setAnalysisResult, theme } = useApp();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('analysis');
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [challengeEntries, setChallengeEntries] = useState<ChallengeHistoryEntry[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [clearAllConfirm, setClearAllConfirm] = useState(false);
  const [restoreTarget, setRestoreTarget] = useState<HistoryEntry | null>(null);
  const [deleteChallengeTarget, setDeleteChallengeTarget] = useState<string | null>(null);
  const [clearAllChallengesConfirm, setClearAllChallengesConfirm] = useState(false);
  const [viewTarget, setViewTarget] = useState<HistoryEntry | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const challengeFileInputRef = useRef<HTMLInputElement>(null);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    try {
      const [all, allChallenges] = await Promise.all([
        db.getAllHistory(),
        db.getAllChallengeHistory(),
      ]);
      setEntries(all.reverse());
      setChallengeEntries(allChallenges.reverse());
    } catch (err) {
      console.error('Failed to load history:', err);
      toast.error(t('analysis.analysisFailed', { error: 'Failed to load history' }));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  const handleDelete = async (id: string) => {
    try {
      await db.deleteHistory(id);
      setEntries((prev) => prev.filter((e) => e.id !== id));
      toast.success(t('riwayat.historyDeleted'));
    } catch (err) {
      console.error('Failed to delete history entry:', err);
      toast.error(t('analysis.analysisFailed', { error: 'Failed to delete entry' }));
    }
  };

  const handleClearAll = async () => {
    try {
      await db.clearHistory();
      setEntries([]);
      toast.success(t('riwayat.allHistoryDeleted'));
    } catch (err) {
      console.error('Failed to clear history:', err);
      toast.error(t('analysis.analysisFailed', { error: 'Failed to clear history' }));
    }
  };

  const handleRestore = (entry: HistoryEntry) => {
    setFiles([{
      id: crypto.randomUUID(),
      name: `restored.${getFileExtensionForLanguage(entry.language)}`,
      language: entry.language,
      content: entry.code,
    }]);
    if (entry.result) {
      setAnalysisResult(entry.result);
    }
    navigate('/editor');
    toast.success(t('riwayat.codeRestored'));
  };

  const handleResumeChallenge = (entry: ChallengeHistoryEntry) => {
    if (entry.editorContent && !entry.completed) {
      const newFileId = crypto.randomUUID();
      setFiles([{
        id: newFileId,
        name: `challenge.${entry.language === 'cpp' ? 'cpp' : entry.language}`,
        language: entry.language as any,
        content: entry.editorContent,
      }]);
      setActiveFileId(newFileId);
    }
    if (entry.completed) {
      try {
        const stored = localStorage.getItem('kk_completed_challenges');
        if (stored) {
          const arr: string[] = JSON.parse(stored);
          const updated = arr.filter((id) => id !== entry.challengeId);
          localStorage.setItem('kk_completed_challenges', JSON.stringify(updated));
        }
      } catch { }
    }
    navigate('/challenges');
    toast.success(entry.completed
      ? (i18n.language === 'en' ? 'Challenge reset. Try again!' : 'Tantangan direset. Coba lagi!')
      : (i18n.language === 'en' ? 'Challenge resumed!' : 'Tantangan dilanjutkan!'));
  };

  const handleExportJSON = () => {
    const data = activeTab === 'analysis' ? entries : challengeEntries;
    const json = exportToJSON(data);
    const filename = activeTab === 'analysis' ? 'riwayat-analisis.json' : 'riwayat-tantangan.json';
    downloadFile(json, filename, 'application/json');
    toast.success(t('riwayat.exportJsonSuccess'));
  };

  const handleExportCSV = () => {
    if (activeTab === 'analysis') {
      const headers = ['Tanggal', t('analysis.stat.score'), t('analysis.stat.error'), t('analysis.stat.warning'), t('analysis.stat.suggestion')];
      const rows = entries.map((e) => [
        formatTimestamp(e.timestamp),
        String(e.score),
        String(e.errorCount),
        String(e.warningCount),
        String(e.suggestionCount),
      ]);
      const csv = exportToCSV(headers, rows);
      downloadFile(csv, 'riwayat-analisis.csv', 'text/csv');
    } else {
      const headers = ['Tanggal', 'Judul', 'Tingkat', 'Bahasa'];
      const rows = challengeEntries.map((e) => [
        formatTimestamp(e.timestamp),
        e.title,
        e.difficulty,
        e.language,
      ]);
      const csv = exportToCSV(headers, rows);
      downloadFile(csv, 'riwayat-tantangan.csv', 'text/csv');
    }
    toast.success(t('riwayat.exportCsvSuccess'));
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      let parsed: HistoryEntry[] = [];
      if (file.name.endsWith('.json')) {
        const data = JSON.parse(text);
        parsed = Array.isArray(data) ? data : [data];
      } else if (file.name.endsWith('.csv')) {
        const lines = text.split('\n').filter((l) => l.trim());
        if (lines.length < 2) throw new Error(t('riwayat.csvEmpty'));
        for (let i = 1; i < lines.length; i++) {
          const cols = parseCSVRow(lines[i]);
          if (cols.length < 5) continue;
          const [dateStr, score, errorCount, warningCount, suggestionCount] = cols;
          parsed.push({
            id: crypto.randomUUID(),
            code: '',
            language: 'javascript',
            timestamp: new Date(dateStr).getTime() || Date.now(),
            score: parseInt(score) || 0,
            errorCount: parseInt(errorCount) || 0,
            warningCount: parseInt(warningCount) || 0,
            suggestionCount: parseInt(suggestionCount) || 0,
            result: { errors: [], warnings: [], suggestions: [], score: parseInt(score) || 0, fixedCode: '', changes: [], explanation: [], concepts: [], exercise: null },
          });
        }
      } else {
        throw new Error(t('riwayat.importUnsupported'));
      }
      if (parsed.length === 0) throw new Error(t('riwayat.importEmpty'));
      const isValidAnalysis = parsed.every((e) => 'score' in e && 'code' in e);
      if (!isValidAnalysis) throw new Error(t('riwayat.importNotAnalysis'));
      const count = await db.importHistory(parsed);
      toast.success(t('riwayat.importSuccess', { count }));
      loadEntries();
    } catch (err) {
      toast.error(t('riwayat.importFailed', { error: err instanceof Error ? err.message : t('riwayat.importInvalidFormat') }));
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleImportChallenges = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      let parsed: ChallengeHistoryEntry[] = [];
      if (file.name.endsWith('.json')) {
        const data = JSON.parse(text);
        parsed = Array.isArray(data) ? data : [data];
      } else if (file.name.endsWith('.csv')) {
        const lines = text.split('\n').filter((l) => l.trim());
        if (lines.length < 2) throw new Error(t('riwayat.csvEmpty'));
        for (let i = 1; i < lines.length; i++) {
          const cols = parseCSVRow(lines[i]);
          if (cols.length < 4) continue;
          const [dateStr, title, difficulty, language] = cols;
          parsed.push({
            id: crypto.randomUUID(),
            challengeId: crypto.randomUUID(),
            title: title || 'Challenge',
            difficulty: difficulty || 'easy',
            language: language || 'javascript',
            completed: true,
            timestamp: new Date(dateStr).getTime() || Date.now(),
          });
        }
      } else {
        throw new Error(t('riwayat.importUnsupported'));
      }
      if (parsed.length === 0) throw new Error(t('riwayat.importEmpty'));
      const isValidChallenge = parsed.every((e) => 'title' in e && 'difficulty' in e);
      if (!isValidChallenge) throw new Error(t('riwayat.importNotChallenge'));
      const count = await db.importChallengeHistory(parsed);
      toast.success(t('riwayat.importSuccess', { count }));
      loadEntries();
    } catch (err) {
      toast.error(t('riwayat.importFailed', { error: err instanceof Error ? err.message : t('riwayat.importInvalidFormat') }));
    } finally {
      if (challengeFileInputRef.current) challengeFileInputRef.current.value = '';
    }
  };

  const handleDeleteChallenge = async (id: string) => {
    try {
      await db.deleteChallengeHistory(id);
      setChallengeEntries((prev) => prev.filter((e) => e.id !== id));
      toast.success(t('riwayat.historyDeleted'));
    } catch (err) {
      console.error('Failed to delete challenge entry:', err);
      toast.error(t('analysis.analysisFailed', { error: 'Failed to delete entry' }));
    }
  };

  const handleClearAllChallenges = async () => {
    try {
      await db.clearChallengeHistory();
      setChallengeEntries([]);
      toast.success(t('riwayat.allHistoryDeleted'));
    } catch (err) {
      console.error('Failed to clear challenge history:', err);
      toast.error(t('analysis.analysisFailed', { error: 'Failed to clear history' }));
    }
  };

  const filteredAnalysis = entries.filter((e) => e.code.toLowerCase().includes(search.toLowerCase()));
  const filteredChallenges = challengeEntries.filter((e) => e.title.toLowerCase().includes(search.toLowerCase()));
  const filtered = activeTab === 'analysis' ? filteredAnalysis : filteredChallenges;

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-success';
    if (score >= 60) return 'text-warning';
    return 'text-destructive';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-success/10 border-success/20';
    if (score >= 60) return 'bg-warning/10 border-warning/20';
    return 'bg-destructive/10 border-destructive/20';
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 pb-20 space-y-6">
      <FadeIn>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">{activeTab === 'analysis' ? t('riwayat.title') : t('riwayat.titleChallenges')}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {activeTab === 'analysis'
                ? t('riwayat.subtitle', { count: entries.length })
                : t('riwayat.challengesSubtitle', {
                    completed: challengeEntries.filter((e) => e.completed).length,
                    total: challengeEntries.length,
                  })}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {activeTab === 'analysis' && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,.csv"
                  onChange={handleImport}
                  className="hidden"
                />
                <motion.button onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-accent/30 text-accent hover:bg-accent/10 transition-colors"
                >
                  <Upload size={12} /> {t('riwayat.importBtn')}
                </motion.button>
              </>
            )}
            {activeTab === 'challenges' && (
              <>
                <input
                  ref={challengeFileInputRef}
                  type="file"
                  accept=".json,.csv"
                  onChange={handleImportChallenges}
                  className="hidden"
                />
                <motion.button onClick={() => challengeFileInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-accent/30 text-accent hover:bg-accent/10 transition-colors"
                >
                  <Upload size={12} /> {t('riwayat.importBtn')}
                </motion.button>
              </>
            )}
            <motion.button onClick={handleExportJSON}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border hover:bg-muted text-muted-foreground transition-colors"
            >
              <Download size={12} /> JSON
            </motion.button>
            <motion.button onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border hover:bg-muted text-muted-foreground transition-colors"
            >
              <Download size={12} /> CSV
            </motion.button>
            <motion.button
              onClick={() => activeTab === 'analysis' ? setClearAllConfirm(true) : setClearAllChallengesConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors"
            >
              <Trash2 size={12} /> {t('riwayat.deleteAllBtn')}
            </motion.button>
          </div>
        </div>
      </FadeIn>

      <FadeIn delay={0.05}>
        <div className="flex border-b border-border">
          {(['analysis', 'challenges'] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setSearch(''); }}
              className={`relative flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-colors ${
                activeTab === tab ? 'text-accent' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab === 'analysis' ? <AlertCircle size={13} /> : <Trophy size={13} />}
              <span>{tab === 'analysis' ? t('riwayat.tabAnalysis') : t('riwayat.tabChallenges')}</span>
              {activeTab === tab && (
                <motion.div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent rounded-full" layoutId="riwayat-tab" />
              )}
            </button>
          ))}
        </div>
      </FadeIn>

      <FadeIn delay={0.1}>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            id="search-riwayat"
            name="search-riwayat"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('riwayat.searchPlaceholder')}
            className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-border bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none transition-all"
          />
        </div>
      </FadeIn>

      {loading ? (
        <PageSkeleton />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Calendar size={28} />}
          title={search ? t('riwayat.emptySearchTitle') : (activeTab === 'analysis' ? t('riwayat.emptyTitle') : t('challenge.selectDifficulty'))}
          description={search ? t('riwayat.emptySearchDesc') : (activeTab === 'analysis' ? t('riwayat.emptyDesc') : t('challenge.subtitle'))}
        />
      ) : (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {activeTab === 'analysis' ? (
              filteredAnalysis.map((entry, i) => (
                <motion.div
                  key={entry.id}
                  layout
                  initial={{ opacity: 0, y: 12, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95, y: -8 }}
                  transition={{ duration: 0.25, delay: i * 0.03, ease: [0.16, 1, 0.3, 1] }}
                >
                  <div className="p-4 rounded-xl border border-border hover:border-accent/30 transition-[border-color] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group cursor-default">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`px-3 py-1.5 rounded-lg border ${getScoreBg(entry.score)}`}>
                          <span className={`text-lg font-bold tabular-nums ${getScoreColor(entry.score)}`}>{entry.score}</span>
                        </div>
                        <div>
                          <span className="text-xs text-muted-foreground">
                            {formatTimestamp(entry.timestamp)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <motion.button
                          onClick={() => setViewTarget(entry)}
                          className="p-1.5 hover:bg-accent/10 hover:text-accent rounded-lg transition-colors"
                          title={t('riwayat.viewCode', 'Lihat kode')}
                        >
                          <Eye size={12} />
                        </motion.button>
                        <motion.button
                          onClick={() => setRestoreTarget(entry)}
                          className="p-1.5 hover:bg-accent/10 hover:text-accent rounded-lg transition-colors"
                          title={t('riwayat.restoreHint')}
                        >
                          <RotateCcw size={12} />
                        </motion.button>
                        <motion.button
                          onClick={() => setDeleteTarget(entry.id)}
                          className="p-1.5 hover:bg-destructive/10 hover:text-destructive rounded-lg transition-colors"
                        >
                          <Trash2 size={12} />
                        </motion.button>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs">
                      <span className="flex items-center gap-1.5 text-destructive">
                        <div className="p-0.5 rounded bg-destructive/10">
                          <AlertCircle size={11} />
                        </div>
                        {entry.errorCount} {t('analysis.stat.error').toLowerCase()}
                      </span>
                      <span className="flex items-center gap-1.5 text-warning">
                        <div className="p-0.5 rounded bg-warning/10">
                          <AlertTriangle size={11} />
                        </div>
                        {entry.warningCount} {t('analysis.stat.warning').toLowerCase()}
                      </span>
                      <span className="flex items-center gap-1.5 text-info">
                        <div className="p-0.5 rounded bg-info/10">
                          <Info size={11} />
                        </div>
                        {entry.suggestionCount} {t('analysis.stat.suggestion').toLowerCase()}
                      </span>
                    </div>

                    <pre className="mt-3 p-3 rounded-lg bg-muted text-xs font-mono text-muted-foreground overflow-hidden max-h-16 truncate">
                      {entry.code.slice(0, 200)}
                    </pre>
                  </div>
                </motion.div>
              ))
            ) : (
              filteredChallenges.map((entry, i) => (
                <motion.div
                  key={entry.id}
                  layout
                  initial={{ opacity: 0, y: 12, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95, y: -8 }}
                  transition={{ duration: 0.25, delay: i * 0.03, ease: [0.16, 1, 0.3, 1] }}
                >
                  <div className="p-4 rounded-xl border border-border hover:border-accent/30 transition-[border-color] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group cursor-default">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`p-2 rounded-lg ${entry.completed ? 'bg-success/10' : 'bg-warning/10'}`}>
                          {entry.completed ? (
                            <Trophy size={16} className="text-success" />
                          ) : (
                            <Clock size={16} className="text-warning" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-medium text-foreground truncate">{entry.title}</h3>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium shrink-0 ${
                              entry.completed
                                ? 'bg-success/10 text-success'
                                : 'bg-warning/10 text-warning'
                            }`}>
                              {entry.completed
                                ? (i18n.language === 'en' ? 'Done' : 'Selesai')
                                : (i18n.language === 'en' ? 'In Progress' : 'Berlangsung')}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${DIFFICULTY_COLORS[entry.difficulty] || 'text-muted-foreground bg-muted'}`}>
                              {i18n.language === 'en' ? (entry.difficulty.charAt(0).toUpperCase() + entry.difficulty.slice(1)) : (DIFFICULTY_LABELS[entry.difficulty] || entry.difficulty)}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono">{LANG_DISPLAY[entry.language] || entry.language}</span>
                            <span className="text-[10px] text-muted-foreground">{formatTimestamp(entry.timestamp)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {!entry.completed && entry.editorContent && (
                          <motion.button
                            onClick={() => handleResumeChallenge(entry)}
                            className="flex items-center gap-1 px-2 py-1.5 text-[10px] font-medium rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors opacity-0 group-hover:opacity-100"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <Play size={10} fill="currentColor" />
                            {i18n.language === 'en' ? 'Resume' : 'Lanjutkan'}
                          </motion.button>
                        )}
                      <motion.button
                          onClick={() => setDeleteChallengeTarget(entry.id)}
                          className="p-1.5 hover:bg-destructive/10 hover:text-destructive rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={12} />
                        </motion.button>
                      </div>
                    </div>

                    {!entry.completed && entry.editorContent && (
                      <div className="mt-3 pt-3 border-t border-border">
                        <p className="text-[10px] text-muted-foreground mb-1.5">{i18n.language === 'en' ? 'Your progress:' : 'Progres Anda:'}</p>
                        <pre className="p-2 rounded-lg bg-muted text-[10px] font-mono text-muted-foreground overflow-hidden max-h-16 truncate">
                          {entry.editorContent.slice(0, 200)}
                        </pre>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      )}

      <ConfirmModal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => { if (deleteTarget) handleDelete(deleteTarget); }}
        title={t('riwayat.deleteEntry')}
        message={t('riwayat.deleteEntryMsg')}
        confirmLabel={t('riwayat.deleteEntryConfirm')}
        confirmDanger
      />

      <ConfirmModal
        open={clearAllConfirm}
        onClose={() => setClearAllConfirm(false)}
        onConfirm={handleClearAll}
        title={t('riwayat.deleteAllChallenges')}
        message={t('riwayat.deleteAllChallengesMsg')}
        confirmLabel={t('riwayat.deleteAllChallengesConfirm')}
        confirmDanger
      />

      <ConfirmModal
        open={restoreTarget !== null}
        onClose={() => setRestoreTarget(null)}
        onConfirm={() => { if (restoreTarget) handleRestore(restoreTarget); }}
        title={t('riwayat.restoreCode')}
        message={t('riwayat.restoreCodeMsg')}
        confirmLabel={t('riwayat.restoreCodeConfirm')}
        confirmAccent
      />

      <ConfirmModal
        open={deleteChallengeTarget !== null}
        onClose={() => setDeleteChallengeTarget(null)}
        onConfirm={() => { if (deleteChallengeTarget) handleDeleteChallenge(deleteChallengeTarget); }}
        title={t('riwayat.deleteChallengeEntry')}
        message={t('riwayat.deleteChallengeEntryMsg')}
        confirmLabel={t('riwayat.deleteEntryConfirm')}
        confirmDanger
      />

      <ConfirmModal
        open={clearAllChallengesConfirm}
        onClose={() => setClearAllChallengesConfirm(false)}
        onConfirm={handleClearAllChallenges}
        title={t('riwayat.deleteAllChallenges')}
        message={t('riwayat.deleteAllChallengesMsg')}
        confirmLabel={t('riwayat.deleteAllChallengesConfirm')}
        confirmDanger
      />

      <Modal
        open={viewTarget !== null}
        onClose={() => setViewTarget(null)}
        title={viewTarget ? `${formatTimestamp(viewTarget.timestamp)} • ${viewTarget.score}/100` : ''}
        className="max-w-3xl w-full max-h-[80vh]"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-mono">{LANG_DISPLAY[viewTarget?.language || ''] || viewTarget?.language || 'javascript'}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <AlertCircle size={10} className="text-destructive" /> {viewTarget?.errorCount} {t('analysis.stat.error')}</span>
              <span className="flex items-center gap-1">
                <AlertTriangle size={10} className="text-warning" /> {viewTarget?.warningCount} {t('analysis.stat.warning')}</span>
              <span className="flex items-center gap-1">
                <Info size={10} className="text-info" /> {viewTarget?.suggestionCount} {t('analysis.stat.suggestion')}</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={async () => {
                  if (viewTarget) {
                    try {
                      await navigator.clipboard.writeText(viewTarget.code);
                      setCopiedCode(true);
                      toast.success(t('analysis.copied'));
                      setTimeout(() => setCopiedCode(false), 2000);
                    } catch {
                      toast.error(t('analysis.errorUnknown', { error: 'Gagal menyalin' }));
                    }
                  }
                }}
                className="p-1 hover:bg-muted rounded transition-colors text-muted-foreground"
                title={t('analysis.copy')}
              >
                {copiedCode ? <Check size={12} className="text-success" /> : <Copy size={12} />}
              </button>
              <button
                onClick={() => {
                  if (viewTarget) {
                    const ext = getFileExtensionForLanguage(viewTarget.language);
                    downloadFile(viewTarget.code, `code-${viewTarget.id}.${ext}`, 'text/plain');
                    toast.success(t('analysis.fileDownloaded'));
                  }
                }}
                className="p-1 hover:bg-muted rounded transition-colors text-muted-foreground"
                title={t('analysis.download')}
              >
                <Download size={12} />
              </button>
            </div>
          </div>
          <div className="border border-border rounded-lg overflow-hidden">
            <CodeMirror
              value={viewTarget?.code || ''}
              readOnly
              extensions={[getLanguageExtension(viewTarget?.language || 'javascript')]}
              theme={theme === 'dark' ? darkTheme : lightTheme}
              basicSetup={{
                lineNumbers: true,
                highlightActiveLine: false,
                highlightActiveLineGutter: false,
                foldGutter: true,
                bracketMatching: true,
              }}
              style={{ height: '400px', fontSize: '13px' }}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <button
              onClick={() => setViewTarget(null)}
              className="px-3 py-1.5 text-xs rounded-lg border border-border hover:bg-muted transition-colors text-muted-foreground"
            >
              {t('modal.cancel')}
            </button>
            {viewTarget && (
              <button
                onClick={() => {
                  handleRestore(viewTarget);
                  setViewTarget(null);
                }}
                className="px-3 py-1.5 text-xs rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
              >
                {t('riwayat.restoreCode')}
              </button>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
