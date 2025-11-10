import axios from 'axios';
import { getQuote } from './sideshift';

const COINGECKO_API_URL = 'https://api.coingecko.com/api/v3';

interface CoinGeckoCoin {
  id: string;
  symbol: string;
  name: string;
}

let coinListCache: CoinGeckoCoin[] | null = null;
let coinListCacheTime: number = 0;

async function getCoinGeckoList(): Promise<CoinGeckoCoin[]> {
  const now = Date.now();
  // Cache for 1 hour
  if (coinListCache && now - coinListCacheTime < 3600 * 1000) {
    return coinListCache;
  }

  try {
    const response = await axios.get(`${COINGECKO_API_URL}/coins/list`);
    coinListCache = response.data;
    coinListCacheTime = now;
    return coinListCache!;
  } catch (error) {
    console.error('Error fetching CoinGecko coin list:', error);
    return [];
  }
}

async function getCoinId(symbol: string): Promise<string | null> {
  const list = await getCoinGeckoList();
  const coin = list.find(c => c.symbol.toLowerCase() === symbol.toLowerCase());
  return coin ? coin.id : null;
}

async function getMarketRate(fromId: string, toId: string): Promise<number> {
  try {
    const response = await axios.get(`${COINGECKO_API_URL}/simple/price`, {
      params: {
        ids: fromId,
        vs_currencies: toId,
      },
    });
    if (response.data && response.data[fromId] && response.data[fromId][toId]) {
      return response.data[fromId][toId];
    }
    console.error('Error fetching market rate from CoinGecko: Invalid response format', response.data);
    return 0;
  } catch (error) {
    console.error('Error fetching market rate from CoinGecko:', error);
    return 0;
  }
}

export async function getFeeBreakdown(from: string, to: string, amount: string): Promise<{ networkFee: number; serviceFee: number; totalFee: number; } | null> {
  try {
    const fromId = await getCoinId(from);
    const toId = await getCoinId(to);

    if (!fromId || !toId) {
      console.error(`Could not find CoinGecko IDs for ${from} or ${to}`);
      return null;
    }

    const [marketRate, quote] = await Promise.all([
      getMarketRate(fromId, toId),
      getQuote({ depositCoin: from.toLowerCase(), settleCoin: to.toLowerCase(), depositAmount: amount }),
    ]);

    if (marketRate === 0 || !quote) {
      return null;
    }

    const networkFee = 0; // Hardcoded for now, as SideShift API v2 does not provide this in the quote

    const marketSettleAmount = parseFloat(amount) * marketRate;
    const actualSettleAmount = parseFloat(quote.settleAmount);

    const totalFee = marketSettleAmount - actualSettleAmount;
    const serviceFee = totalFee - networkFee;

    // Ensure fees are not negative
    const finalNetworkFee = Math.max(0, networkFee);
    const finalServiceFee = Math.max(0, serviceFee);
    const finalTotalFee = Math.max(0, totalFee);

    return {
      networkFee: finalNetworkFee,
      serviceFee: finalServiceFee,
      totalFee: finalTotalFee,
    };
  } catch (error) {
    console.error('Error calculating fee breakdown:', error);
    return null;
  }
}