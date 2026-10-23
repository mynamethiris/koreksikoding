import type { AIProvider, AnalysisError, IssueVerdict, Language, VerifyResult } from '@/types';
import { verifyFix, extractJSON } from '@/lib/api';

export interface VerifierInput {
  language: Language;
  originalCode: string;
  modifiedCode: string;
  issues: AnalysisError[];
  provider: AIProvider;
  customPrompt?: string;
}

const STATUSES: IssueVerdict['status'][] = ['fixed', 'not_fixed', 'new'];

function normalizeVerdict(value: unknown): VerifyResult['verdict'] {
  return value === 'pass' || value === 'partial' ? value : 'fail';
}

function normalizePerIssue(value: unknown): IssueVerdict[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    const raw = (item ?? {}) as Record<string, unknown>;
    const status = typeof raw.status === 'string' && STATUSES.includes(raw.status as IssueVerdict['status'])
      ? (raw.status as IssueVerdict['status'])
      : 'not_fixed';
    return {
      issueId: typeof raw.issueId === 'string' ? raw.issueId : '',
      line: typeof raw.line === 'number' ? raw.line : 0,
      issue: typeof raw.issue === 'string' ? raw.issue : '',
      status,
      feedback: typeof raw.feedback === 'string' ? raw.feedback : '',
    };
  });
}

function normalizeNewIssues(value: unknown): VerifyResult['newIssues'] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    const raw = (item ?? {}) as Record<string, unknown>;
    return {
      line: typeof raw.line === 'number' ? raw.line : 0,
      message: typeof raw.message === 'string' ? raw.message : '',
      category: typeof raw.category === 'string' ? raw.category : undefined,
    };
  });
}

function normalizeRecap(value: unknown): VerifyResult['recap'] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    const raw = (item ?? {}) as Record<string, unknown>;
    return {
      title: typeof raw.title === 'string' ? raw.title : '',
      summary: typeof raw.summary === 'string' ? raw.summary : '',
    };
  });
}

export function buildIssuesPayload(issues: AnalysisError[]) {
  return issues.map((issue) => ({
    id: issue.id,
    line: issue.line,
    message: issue.message,
    category: issue.category,
    severity: issue.severity,
  }));
}

export const aiJudgeVerifier = {
  async verify(input: VerifierInput): Promise<VerifyResult> {
    const { text, tokenUsage } = await verifyFix(
      { originalCode: input.originalCode, modifiedCode: input.modifiedCode, issues: buildIssuesPayload(input.issues) },
      input.language,
      input.provider,
      input.customPrompt,
    );
    const parsed = extractJSON(text) as Record<string, unknown>;
    const normalized: VerifyResult = {
      verdict: normalizeVerdict(parsed.verdict),
      perIssue: normalizePerIssue(parsed.perIssue),
      newIssues: normalizeNewIssues(parsed.newIssues),
      feedback: typeof parsed.feedback === 'string' ? parsed.feedback : '',
      recap: normalizeRecap(parsed.recap),
      tokenUsage,
    };
    if (normalized.verdict === 'pass' && normalized.newIssues.length > 0) {
      normalized.verdict = 'partial';
    }
    return normalized;
  },
};
