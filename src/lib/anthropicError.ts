export function parseAnthropicError(err: unknown): { message: string; type: 'billing' | 'auth' | 'other' } {
  const raw = err instanceof Error ? err.message : String(err);

  // Anthropic SDK throws messages like: "400 {...json...}"
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      const msg: string = parsed?.error?.message ?? '';
      if (msg.includes('credit balance is too low') || msg.includes('billing')) {
        return { message: 'credit_low', type: 'billing' };
      }
      if (msg.includes('invalid x-api-key') || msg.includes('authentication') || msg.includes('API key')) {
        return { message: 'API 키가 유효하지 않습니다. 키를 다시 확인해주세요.', type: 'auth' };
      }
      if (msg) return { message: msg, type: 'other' };
    } catch { /* fall through */ }
  }

  if (raw.includes('credit') || raw.includes('billing')) return { message: 'credit_low', type: 'billing' };
  if (raw.includes('api_key') || raw.includes('authentication')) return { message: 'API 키가 유효하지 않습니다.', type: 'auth' };
  return { message: raw, type: 'other' };
}
