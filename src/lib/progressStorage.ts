interface ProgressEntry {
  guideId: string;
  lastSection: number;
  completedSections: number[];
  quizScore?: number;
  quizPassed?: boolean;
  lastAccessed: number;
  totalSections: number;
}

const STORAGE_KEY = 'koreksikoding-guide-progress';

export const GUIDE_ORDER = [
  'logic',
  'debugging',
  'ide',
  'git',
  'prompt',
  'linux',
  'build',
  'security',
];

export function saveProgress(guideId: string, sectionIndex: number, totalSections: number): void {
  const progress = loadAllProgress();

  if (!progress[guideId]) {
    progress[guideId] = {
      guideId,
      lastSection: sectionIndex,
      completedSections: [],
      lastAccessed: Date.now(),
      totalSections
    };
  }

  progress[guideId].lastSection = sectionIndex;
  progress[guideId].lastAccessed = Date.now();
  progress[guideId].totalSections = totalSections;

  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

export function markSectionComplete(guideId: string, sectionIndex: number): void {
  const progress = loadAllProgress();

  if (!progress[guideId]) {
    progress[guideId] = {
      guideId,
      lastSection: sectionIndex,
      completedSections: [sectionIndex],
      lastAccessed: Date.now(),
      totalSections: 0
    };
  } else {
    if (!progress[guideId].completedSections.includes(sectionIndex)) {
      progress[guideId].completedSections.push(sectionIndex);
    }
    progress[guideId].lastAccessed = Date.now();
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

export function saveQuizScore(guideId: string, score: number, passed: boolean): void {
  const progress = loadAllProgress();

  if (!progress[guideId]) {
    progress[guideId] = {
      guideId,
      lastSection: 0,
      completedSections: [],
      quizScore: score,
      quizPassed: passed,
      lastAccessed: Date.now(),
      totalSections: 0
    };
  } else {
    progress[guideId].quizScore = score;
    progress[guideId].quizPassed = passed;
    progress[guideId].lastAccessed = Date.now();
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

export function getProgress(guideId: string): ProgressEntry | null {
  const progress = loadAllProgress();
  return progress[guideId] || null;
}

export function getAllProgress(): Record<string, ProgressEntry> {
  return loadAllProgress();
}

export function getProgressPercentage(guideId: string): number {
  const progress = getProgress(guideId);
  if (!progress || progress.totalSections === 0) return 0;

  const completed = progress.completedSections.length;
  const total = progress.totalSections;

  return Math.round((completed / total) * 100);
}

export function isSectionComplete(guideId: string, sectionIndex: number): boolean {
  const progress = getProgress(guideId);
  if (!progress) return false;
  return progress.completedSections.includes(sectionIndex);
}

export function getQuizStatus(guideId: string): 'not_started' | 'passed' | 'failed' {
  const progress = getProgress(guideId);
  if (!progress || progress.quizScore === undefined) return 'not_started';
  if (progress.quizPassed) return 'passed';
  return 'failed';
}

export function isGuideUnlocked(guideId: string): boolean {
  const idx = GUIDE_ORDER.indexOf(guideId);
  if (idx === -1) return false;
  if (idx === 0) return true;

  const prevGuideId = GUIDE_ORDER[idx - 1];
  return getQuizStatus(prevGuideId) === 'passed';
}

export function isGuideCompleted(guideId: string): boolean {
  return getQuizStatus(guideId) === 'passed';
}

export function clearProgress(): void {
  localStorage.removeItem(STORAGE_KEY);
}

function loadAllProgress(): Record<string, ProgressEntry> {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}