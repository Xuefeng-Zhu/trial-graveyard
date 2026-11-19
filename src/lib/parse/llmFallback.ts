import type { ParseResult } from './types';

/**
 * Stub for the optional LLM fallback (R5.7, R5.8). It makes no network call.
 * A real implementation would live here and would only ever be loaded through
 * the dynamic import in `parseReceiptWithFallback`, when the flag is on.
 */
export async function llmParse(_text: string): Promise<ParseResult> {
  return {};
}
