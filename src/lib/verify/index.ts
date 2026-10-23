import { aiJudgeVerifier, type VerifierInput } from './aiJudge';
import type { VerifyResult } from '@/types';

export type { VerifierInput };

/**
 * Thiris TODO: register sandbox verifiers for javascript/typescript/python in phase 2.
 * An engine must shape its result the same as VerifyResult so the UI needs no changes.
 */
export type Verifier = (input: VerifierInput) => Promise<VerifyResult>;

const engines = new Map<string, Verifier>();

export function registerVerifier(language: string, verifier: Verifier): void {
  engines.set(language, verifier);
}

export function getVerifier(language: string): Verifier {
  const engine = engines.get(language);
  return engine || aiJudgeVerifier.verify;
}
