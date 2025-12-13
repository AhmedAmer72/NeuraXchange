'use client';

import { getStatusColor, getStatusIcon, formatRelativeTime, getCoinIcon } from '@/lib/utils';

interface Swap {
  id: number;
  shiftId: string;
  fromCoin: string;
  toCoin: string;
  depositAmount: string;
  settleAmount: string | null;
  status: string;
  createdAt: Date | string;
}

interface SwapTableProps {
  swaps: Swap[];
  showViewAll?: boolean;
  onViewAll?: () => void;
}

export default function SwapTable({ swaps, showViewAll, onViewAll }: SwapTableProps) {
  if (swaps.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
        <p className="text-gray-500">No swaps yet</p>
        <p className="text-sm text-gray-400 mt-1">Start swapping via the Telegram bot!</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Recent Swaps</h3>
        {showViewAll && (
          <button 
            onClick={onViewAll}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            View All →
          </button>
        )}
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Pair
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Receive
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Time
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {swaps.map((swap) => (
              <tr key={swap.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{getCoinIcon(swap.fromCoin)}</span>
                    <span className="font-medium text-gray-900">
                      {swap.fromCoin.toUpperCase()}
                    </span>
                    <span className="text-gray-400">→</span>
                    <span className="text-lg">{getCoinIcon(swap.toCoin)}</span>
                    <span className="font-medium text-gray-900">
                      {swap.toCoin.toUpperCase()}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {parseFloat(swap.depositAmount).toFixed(6)} {swap.fromCoin.toUpperCase()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {swap.settleAmount 
                    ? `${parseFloat(swap.settleAmount).toFixed(6)} ${swap.toCoin.toUpperCase()}`
                    : '—'
                  }
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(swap.status)}`}>
                    {getStatusIcon(swap.status)} {swap.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatRelativeTime(swap.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
