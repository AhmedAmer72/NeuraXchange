// Thin natural-language -> tool input parser
// Intentionally small and heuristic-based. Covers phrases like:
//  - "I need 0.3 SOL"
//  - "I want 100 USDC"
//  - "I'll pay 0.01 BTC"

export interface ParserDefaults {
  defaultDepositCoin?: string; // e.g. 'btc'
  defaultSettleCoin?: string; // e.g. 'usdc'
  depositNetwork?: string;
  settleNetwork?: string;
}

export interface ParsedToolCall {
  toolName: 'get_quote_by_settle_amount' | 'get_quote_by_deposit_amount';
  input: Record<string, any>; // Will be serializable to JSON
}

/**
 * Very small heuristic parser. If the user expresses "need|want|get|receive" it's
 * interpreted as a settle amount (what they want to receive). If they say
 * "pay|send|I'll pay" it's treated as a deposit amount (what they will send).
 *
 * Returns a tool name and an object matching the tool's expected input shape.
 */
export function parseUserRequest(text: string, defaults: ParserDefaults = {}): ParsedToolCall | null {
  if (!text || typeof text !== 'string') return null;

  const lower = text.toLowerCase();

  // Find the first numeric amount (integer or decimal)
  const amountMatch = text.match(/([0-9]+(?:\.[0-9]+)?)/);
  if (!amountMatch) return null;
  const amount = amountMatch[1];

  // Try to find a coin symbol directly after the amount, e.g. "0.3 SOL" or "100USDC"
  const postAmount = text.slice(amountMatch.index! + amount.length);
  const coinMatch = postAmount.match(/\s*([A-Za-z]{2,6})\b/);
  const coinRaw = coinMatch ? coinMatch[1] : null;

  const coin = coinRaw ? coinRaw.toLowerCase() : null;

  // Decide whether amount refers to settle (receive) or deposit (pay)
  const wantsWords = ['need', 'want', 'get', 'receive', 'to receive', 'i need', 'i want'];
  const payWords = ['pay', "i'll pay", 'i will pay', 'send', 'i have', 'i am sending'];

  const isWant = wantsWords.some((w) => lower.includes(w));
  const isPay = payWords.some((w) => lower.includes(w));

  // If both or neither detected, default to settle (user asked for an amount they need)
  const treatAsSettle = isWant || (!isWant && !isPay);

  if (treatAsSettle) {
    const settleCoin = coin || defaults.defaultSettleCoin || 'sol';
    const depositCoin = defaults.defaultDepositCoin || 'btc';
    const payload: any = {
      depositCoin,
      settleCoin,
      settleAmount: amount
    };
    if (defaults.depositNetwork) payload.depositNetwork = defaults.depositNetwork;
    if (defaults.settleNetwork) payload.settleNetwork = defaults.settleNetwork;

    return {
      toolName: 'get_quote_by_settle_amount',
      input: payload
    };
  }

  // Treat as deposit amount
  const depositCoin = coin || defaults.defaultDepositCoin || 'btc';
  const settleCoin = defaults.defaultSettleCoin || 'usdc';
  const payload: any = {
    depositCoin,
    settleCoin,
    depositAmount: amount
  };
  if (defaults.depositNetwork) payload.depositNetwork = defaults.depositNetwork;
  if (defaults.settleNetwork) payload.settleNetwork = defaults.settleNetwork;

  return {
    toolName: 'get_quote_by_deposit_amount',
    input: payload
  };
}

export default parseUserRequest;
