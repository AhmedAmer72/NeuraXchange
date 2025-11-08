import { DynamicTool } from '@langchain/core/tools';
import {
  getQuote,
  createShift,
  getQuoteBySettleAmount,
} from './sideshift';

export const tools = [
  new DynamicTool({
    name: 'get_quote_by_deposit_amount',
    description:
      'Get a quote for a crypto swap based on the deposit amount. Input should be a JSON object with depositCoin, settleCoin, and depositAmount.',
    func: async (input: string) => {
      const { depositCoin, settleCoin, depositAmount } = JSON.parse(input);
      return JSON.stringify(await getQuote({ depositCoin, settleCoin, depositAmount }));
    },
  }),
  new DynamicTool({
    name: 'get_quote_by_settle_amount',
    description:
      'Get a quote for a crypto swap based on the settle amount. Input should be a JSON object with depositCoin, settleCoin, and settleAmount.',
    func: async (input: string) => {
      const { depositCoin, settleCoin, settleAmount } = JSON.parse(input);
      return JSON.stringify(await getQuoteBySettleAmount({ depositCoin, settleCoin, settleAmount }));
    },
  }),
  new DynamicTool({
    name: 'create_shift',
    description:
      'Create a new shift (swap). Input should be a JSON object with quoteId and settleAddress.',
    func: async (input: string) => {
      const { quoteId, settleAddress } = JSON.parse(input);
      return JSON.stringify(await createShift({ quoteId, settleAddress }));
    },
  }),
];
