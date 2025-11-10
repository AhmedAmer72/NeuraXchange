// User swap history and analytics (in-memory for now)
// TODO: Use persistent DB for production
export type SwapRecord = { chatId: number, from: string, to: string, amount: string, date: string, txId?: string };
export const history: SwapRecord[] = [];
export function addSwap(record: SwapRecord) { history.push(record); }
export function getUserHistory(chatId: number) { return history.filter(r => r.chatId === chatId); }
