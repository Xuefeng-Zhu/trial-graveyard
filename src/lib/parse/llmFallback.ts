import type { ParseResult } from './index'

// Reserved for a local model. Receipts are never sent to a service.
export async function suggestFields(): Promise<ParseResult> {
  return {}
}
