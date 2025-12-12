// TypeScript interfaces for SideShift API responses

export interface SideShiftCoin {
  coin: string;
  name: string;
  networks: string[] | NetworkInfo[];
  mainnet?: string;
  tokenDetails?: {
    [network: string]: {
      contractAddress: string;
      decimals: number;
    };
  };
}

export interface NetworkInfo {
  name: string;
  network: string;
}

export interface QuoteRequest {
  depositCoin: string;
  settleCoin: string;
  depositAmount?: string;
  settleAmount?: string;
  depositNetwork?: string;
  settleNetwork?: string;
  affiliateId?: string;
}

export interface QuoteResponse {
  id: string;
  createdAt: string;
  depositCoin: string;
  settleCoin: string;
  depositNetwork: string;
  settleNetwork: string;
  depositAmount: string;
  settleAmount: string;
  rate: string;
  expiresAt: string;
  affiliateId?: string;
}

export interface ShiftRequest {
  quoteId: string;
  settleAddress: string;
  refundAddress?: string;
  affiliateId?: string;
}

export interface ShiftResponse {
  id: string;
  createdAt: string;
  depositCoin: string;
  settleCoin: string;
  depositNetwork: string;
  settleNetwork: string;
  depositAddress: string;
  settleAddress: string;
  refundAddress?: string;
  depositAmount: string;
  settleAmount: string;
  rate: string;
  status: ShiftStatus;
  expiresAt: string;
  depositHash?: string;
  settleHash?: string;
  depositReceivedAt?: string;
  settleCompletedAt?: string;
}

export type ShiftStatus = 
  | 'pending'
  | 'waiting'
  | 'processing'
  | 'settling'
  | 'complete'
  | 'refunded'
  | 'expired'
  | 'rejected';

export interface PairInfo {
  depositCoin: string;
  settleCoin: string;
  depositNetwork?: string;
  settleNetwork?: string;
  rate: string;
  min: string;
  max: string;
}

export interface ShiftStatusResponse extends ShiftResponse {
  depositStatus?: string;
  settleStatus?: string;
  averageCompletionTime?: number; // in seconds
}

// Block Explorer URLs by network
export const BLOCK_EXPLORERS: { [network: string]: { tx: string; address: string } } = {
  bitcoin: { tx: 'https://blockstream.info/tx/', address: 'https://blockstream.info/address/' },
  ethereum: { tx: 'https://etherscan.io/tx/', address: 'https://etherscan.io/address/' },
  solana: { tx: 'https://solscan.io/tx/', address: 'https://solscan.io/account/' },
  polygon: { tx: 'https://polygonscan.com/tx/', address: 'https://polygonscan.com/address/' },
  bsc: { tx: 'https://bscscan.com/tx/', address: 'https://bscscan.com/address/' },
  avalanche: { tx: 'https://snowtrace.io/tx/', address: 'https://snowtrace.io/address/' },
  arbitrum: { tx: 'https://arbiscan.io/tx/', address: 'https://arbiscan.io/address/' },
  optimism: { tx: 'https://optimistic.etherscan.io/tx/', address: 'https://optimistic.etherscan.io/address/' },
  litecoin: { tx: 'https://blockchair.com/litecoin/transaction/', address: 'https://blockchair.com/litecoin/address/' },
  dogecoin: { tx: 'https://blockchair.com/dogecoin/transaction/', address: 'https://blockchair.com/dogecoin/address/' },
  tron: { tx: 'https://tronscan.org/#/transaction/', address: 'https://tronscan.org/#/address/' },
  xrp: { tx: 'https://xrpscan.com/tx/', address: 'https://xrpscan.com/account/' },
  monero: { tx: 'https://xmrchain.net/tx/', address: 'https://xmrchain.net/search?value=' },
  base: { tx: 'https://basescan.org/tx/', address: 'https://basescan.org/address/' },
};

export function getExplorerUrl(network: string, type: 'tx' | 'address', hash: string): string | null {
  const explorer = BLOCK_EXPLORERS[network.toLowerCase()];
  if (!explorer) return null;
  return explorer[type] + hash;
}
