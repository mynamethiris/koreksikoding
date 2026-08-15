function parseFrontmatter(raw: string): { data: Record<string, string>; body: string } {
  const fm: Record<string, string> = {};
  let body = raw;
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (m) {
    body = raw.slice(m[0].length);
    for (const line of m[1].split('\n')) {
      const kv = line.match(/^(\w+)\s*:\s*(.+)$/);
      if (kv) fm[kv[1]] = kv[2].replace(/^["']|["']$/g, '');
    }
  }
  return { data: fm, body };
}

export interface GuideSection {
  title: string;
  content: string;
  bullets: string[];
  visual?: string;
  image?: string;
  imageCaption?: string;
}

export interface GuideQuizQuestion {
  id: string;
  question: string;
  options: string[];
  answer: number;
}

export interface GuideQuiz {
  title: string;
  questions: GuideQuizQuestion[];
}

export interface GuideContentData {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  lang: string;
  summary: string;
  sections: GuideSection[];
  quiz: GuideQuiz | null;
}

const LOCALE_KEYWORDS: Record<string, { summary: string; keyPoints: string; quiz: string }> = {
  id: { summary: 'Ringkasan', keyPoints: 'Poin Utama', quiz: 'Kuis' },
  en: { summary: 'Summary', keyPoints: 'Key Points', quiz: 'Quiz' },
};

function parseMarkdownToSections(md: string, lang: string): { summary: string; sections: GuideSection[]; quiz: GuideQuiz | null } {
  const lines = md.split('\n');
  let summary = '';
  const sections: GuideSection[] = [];
  let quiz: GuideQuiz | null = null;

  const keywords = LOCALE_KEYWORDS[lang] || LOCALE_KEYWORDS.id;

  let currentSection: GuideSection | null = null;
  let currentBullets: string[] = [];
  let sectionContentLines: string[] = [];
  let inQuiz = false;
  let quizTitle = '';
  let quizQuestions: GuideQuizQuestion[] = [];
  let currentQuestion: GuideQuizQuestion | null = null;
  let currentOptions: string[] = [];
  let answerIndex = -1;

  const saveSection = () => {
    if (currentSection) {
      currentSection.bullets = currentBullets;
      currentSection.content = sectionContentLines.join('\n').trim();
      sections.push(currentSection);
      currentBullets = [];
      sectionContentLines = [];
    }
  };

  for (const line of lines) {
    if (line.startsWith('---')) continue;
    if (line.startsWith(`## ${keywords.summary}`)) continue;

    if (line.startsWith(`## ${keywords.quiz}`)) {
      saveSection();
      currentSection = null;
      inQuiz = true;
      continue;
    }

    if (line.startsWith('> ') && inQuiz && !quizTitle) {
      quizTitle = line.slice(2).trim();
      continue;
    }

    if (line.startsWith('## ') && !inQuiz) {
      saveSection();
      currentSection = {
        title: line.replace('## ', '').trim(),
        content: '',
        bullets: [],
      };
      continue;
    }

    if (line.startsWith('### ') && !inQuiz) continue;

    const visualMatch = line.match(/<!--\s*visual:\s*(\S+)\s*-->/);
    if (visualMatch && currentSection) {
      currentSection.visual = visualMatch[1];
      continue;
    }

    const imageMatch = line.match(/^!\[(.*?)\]\((.*?)\)$/);
    if (imageMatch && currentSection) {
      currentSection.image = imageMatch[2];
      currentSection.imageCaption = imageMatch[1];
      continue;
    }

    if (line.startsWith('*') && line.endsWith('*') && !line.startsWith('**') && currentSection) {
      continue;
    }

    if (line.startsWith('- ') && !inQuiz) {
      const bullet = line.slice(2).trim();
      if (currentSection) {
        currentBullets.push(bullet);
      }
      continue;
    }

    if (line.match(/^### \d+\./) && inQuiz) {
      if (currentQuestion) {
        currentQuestion.options = currentOptions;
        currentQuestion.answer = answerIndex;
        quizQuestions.push(currentQuestion);
        currentOptions = [];
        answerIndex = -1;
      }
      const qMatch = line.match(/^### \d+\.\s*(.+)$/);
      if (qMatch) {
        currentQuestion = {
          id: `q${quizQuestions.length + 1}`,
          question: qMatch[1].trim(),
          options: [],
          answer: 0,
        };
      }
      continue;
    }

    if (line.match(/^- \[[ x]\]/) && inQuiz) {
      const checked = line.includes('[x]');
      const optMatch = line.match(/^- \[[ x]\]\s*(.+)$/);
      if (optMatch) {
        currentOptions.push(optMatch[1].trim());
        if (checked) {
          answerIndex = currentOptions.length - 1;
        }
      }
      continue;
    }

    if (currentSection && line.trim() && !line.startsWith('#')) {
      sectionContentLines.push(line.trim());
      continue;
    }

    if (!summary && !currentSection && line.trim() && !line.startsWith('#') && !line.startsWith('---')) {
      summary = line.trim();
    }
  }

  saveSection();

  if (currentQuestion) {
    currentQuestion.options = currentOptions;
    currentQuestion.answer = answerIndex;
    quizQuestions.push(currentQuestion);
  }

  if (quizQuestions.length > 0) {
    quiz = {
      title: quizTitle || keywords.quiz,
      questions: quizQuestions,
    };
  }

  return { summary, sections, quiz };
}

const GUIDE_IDS = ['logic', 'debugging', 'ide', 'git', 'prompt', 'linux', 'build', 'security'];

export async function getGuideContent(id: string, lang: string): Promise<GuideContentData | null> {
  if (!GUIDE_IDS.includes(id)) return null;

  try {
    const res = await fetch(`/guides-content/${lang}/${id}.md`);
    if (!res.ok) return null;
    const raw = await res.text();
    const { data: frontmatter, body: mdBody } = parseFrontmatter(raw);
    const { summary, sections, quiz } = parseMarkdownToSections(mdBody, lang);

    return {
      id: frontmatter.id || id,
      title: frontmatter.title || '',
      description: frontmatter.description || '',
      icon: frontmatter.icon || 'BookOpen',
      color: frontmatter.color || 'accent',
      lang: frontmatter.lang || lang,
      summary,
      sections,
      quiz,
    };
  } catch (err) {
    console.error(`Failed to load guide: ${lang}/${id}`, err);
    return null;
  }
}

export function getAvailableGuideIds(): string[] {
  return GUIDE_IDS;
}
