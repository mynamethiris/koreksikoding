export type Language =
  | 'python'
  | 'javascript'
  | 'typescript'
  | 'jsx'
  | 'tsx'
  | 'java'
  | 'c'
  | 'cpp'
  | 'cs'
  | 'go'
  | 'rust'
  | 'php'
  | 'ruby'
  | 'kotlin'
  | 'swift'
  | 'dart'
  | 'html'
  | 'css'
  | 'sql'
  | 'json'
  | 'xml'
  | 'yaml'
  | (string & {});

export interface EditorFile {
  id: string;
  name: string;
  language: Language;
  content: string;
  path?: string;
}

export interface AnalysisError {
  line: number;
  message: string;
  explanation: string;
  severity: 'error' | 'warning' | 'suggestion';
  category?: string;
  communityLinks?: { title: string; url: string }[];
}

export interface TokenUsage {
  input: number;
  output: number;
  model?: string;
}

export interface RefactoringScore {
  readability: number;
  maintainability: number;
  complexity: number;
  naming: number;
  overall: number;
}

export interface Vulnerability {
  line: number;
  message: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  fix: string;
  cwe?: string;
}

export interface DuplicationBlock {
  lineStart: number;
  lineEnd: number;
}

export interface Duplication {
  lineStart: number;
  lineEnd: number;
  message: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  fix: string;
  duplicatedWith: DuplicationBlock;
}

export interface AnalysisResult {
  errors: AnalysisError[];
  warnings: AnalysisError[];
  suggestions: AnalysisError[];
  score: number;
  fixedCode: string;
  changes: string[];
  explanation: ExplanationItem[];
  concepts: LearningConcept[];
  exercise: Exercise | null;
  tokenUsage?: TokenUsage;
  refactoringScore?: RefactoringScore;
  vulnerabilities?: Vulnerability[];
  duplications?: Duplication[];
}

export interface ExplanationItem {
  errorType: string;
  cause: string;
  fix: string;
  wrongCode: string;
  correctCode: string;
  tip: string;
}

export interface LearningConcept {
  title: string;
  summary: string;
  content: string;
}

export interface Exercise {
  title: string;
  description: string;
  code: string;
}

export interface AIProvider {
  id: string;
  name: string;
  endpoint: string;
  model: string;
  apiKey: string;
  isDefault?: boolean;
  availableModels?: string[];
}

export interface HistoryEntry {
  id: string;
  code: string;
  language: Language;
  timestamp: number;
  score: number;
  errorCount: number;
  warningCount: number;
  suggestionCount: number;
  result: AnalysisResult;
}

export type Theme = 'light' | 'dark';

export interface TeamMember {
  name: string;
  role: string;
  origin: string;
  github: string;
}

export interface ChallengeHistoryEntry {
  id: string;
  challengeId: string;
  title: string;
  difficulty: string;
  language: string;
  completed: boolean;
  timestamp: number;
  editorContent?: string;
  sourceCode?: string;
}
