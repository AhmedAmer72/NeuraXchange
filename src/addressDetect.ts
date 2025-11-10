// Auto-detect token/network from address
// TODO: Use real heuristics or external APIs
export function detectNetwork(address: string): string | null {
  if (address.startsWith('0x') && address.length === 42) return 'ethereum';
  if (/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(address)) return 'tron';
  if (/^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,39}$/.test(address)) return 'bitcoin';
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)) return 'solana';
  if (/^[LM3][a-km-zA-HJ-NP-Z1-9]{26,33}$/.test(address)) return 'litecoin';
  // Add more patterns as needed
  return null;
}
