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
  | 'plaintext'
  | (string & {});

export interface EditorFile {
  id: string;
  name: string;
  language: Language;
  content: string;
  path?: string;
  manualLanguage?: boolean;
}

export interface AnalysisError {
  id?: string;
  line: number;
  message: string;
  explanation: string;
  severity?: 'error' | 'warning' | 'suggestion';
  category?: string;
  hints?: IssueHint[];
  communityLinks?: { title: string; url: string }[];
}

export interface IssueHint {
  level: 1 | 2 | 3;
  text: string;
  wrongExample?: string;
  rightExample?: string;
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
  concepts: LearningConcept[];
  exercise: Exercise | null;
  metrics?: ReviewMetrics;
  tokenUsage?: TokenUsage;
  refactoringScore?: RefactoringScore;
  vulnerabilities?: Vulnerability[];
  duplications?: Duplication[];
  // Legacy shape used by the terminal analyzer and imported old records only.
  fixedCode?: string;
  changes?: string[];
  explanation?: ExplanationItem[];
}

export interface ExplanationItem {
  errorType: string;
  cause: string;
  fix: string;
  wrongCode: string;
  correctCode: string;
  tip: string;
}

export interface ReviewMetrics {
  attempts: number;
  hintsOpened: number;
  lastVerdict?: VerifyResult['verdict'];
}

export type IssueVerdictStatus = 'fixed' | 'not_fixed' | 'new';

export interface IssueVerdict {
  issueId: string;
  line: number;
  issue: string;
  status: IssueVerdictStatus;
  feedback: string;
}

export interface VerifyResult {
  verdict: 'pass' | 'partial' | 'fail';
  perIssue: IssueVerdict[];
  newIssues: { line: number; message: string; category?: string }[];
  feedback: string;
  recap?: { title: string; summary: string }[];
  tokenUsage?: TokenUsage;
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
  recommended?: string[];
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
